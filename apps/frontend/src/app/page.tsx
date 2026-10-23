'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import DateRangeFilter, {
  DateFilterValue,
  getDefaultDateFilter,
  filterMatchesDate,
} from '@/components/DateRangeFilter';
import {
  Users,
  CreditCard,
  Stethoscope,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Clock,
  Plus,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Trophy,
  Flame,
  Table as TableIcon,
  Layers,
  PieChart,
  Sparkles,
  Filter,
  ArrowUpDown,
  Percent,
  Coins,
} from 'lucide-react';

interface SoldServiceMetric {
  name: string;
  category: string;
  quantity: number;
  income: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, activeCenter, loading } = useAuth();

  // Date Filter State (Defaults to Daily)
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter());

  // Raw Data Cache
  const [rawPatients, setRawPatients] = useState<any[]>([]);
  const [rawInvoices, setRawInvoices] = useState<any[]>([]);
  const [rawPrescriptions, setRawPrescriptions] = useState<any[]>([]);
  const [rawAttendances, setRawAttendances] = useState<any[]>([]);

  // Filtered Computed Stats
  const [stats, setStats] = useState({
    patientsCount: 0,
    invoicesCount: 0,
    prescriptionsCount: 0,
    attendanceCount: 0,
    filteredRevenue: 0,
    totalBilled: 0,
    totalDue: 0,
  });

  const [soldServices, setSoldServices] = useState<SoldServiceMetric[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

  // Modernized Sold Services controls
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('ALL');
  const [serviceViewMode, setServiceViewMode] = useState<'bars' | 'table'>('bars');
  const [serviceSortBy, setServiceSortBy] = useState<'income' | 'quantity'>('income');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && activeCenter) {
      loadDashboardData();

      // Frequent auto-refresh every 20 seconds
      const interval = setInterval(() => {
        loadDashboardData(true);
      }, 20000);

      return () => clearInterval(interval);
    }
  }, [user, activeCenter, loading]);

  // Recalculate filtered stats whenever raw data or date filter changes
  useEffect(() => {
    computeFilteredMetrics();
  }, [rawPatients, rawInvoices, rawPrescriptions, rawAttendances, dateFilter]);

  const loadDashboardData = async (isBackground = false) => {
    if (!isBackground) setIsRefreshing(true);
    try {
      const [patients, invoices, prescriptions, attendances] = await Promise.all([
        apiRequest('/patients').catch(() => []),
        apiRequest('/billing/invoices').catch(() => []),
        apiRequest('/clinical/prescriptions').catch(() => []),
        apiRequest('/hr/attendance').catch(() => []),
      ]);

      setRawPatients(patients || []);
      setRawInvoices(invoices || []);
      setRawPrescriptions(prescriptions || []);
      setRawAttendances(attendances || []);

      const now = new Date();
      setLastRefreshedAt(now.toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      if (!isBackground) setIsRefreshing(false);
    }
  };

  const computeFilteredMetrics = () => {
    // 1. Filter Patients
    const filteredPts = rawPatients.filter((p) =>
      filterMatchesDate(p.created_at, dateFilter),
    );

    // 2. Filter Invoices
    const filteredInvs = rawInvoices.filter((inv) =>
      filterMatchesDate(inv.created_at, dateFilter),
    );

    // 3. Filter Prescriptions
    const filteredRxs = rawPrescriptions.filter((rx) =>
      filterMatchesDate(rx.created_at, dateFilter),
    );

    // 4. Filter Attendance
    const filteredAtts = rawAttendances.filter((att) =>
      filterMatchesDate(att.punch_in || att.created_at, dateFilter),
    );

    // Revenue in Tk (from filtered invoices)
    const totalCollected = filteredInvs.reduce(
      (acc: number, curr: any) => acc + Number(curr.paid_amount || 0),
      0,
    );
    const totalBilled = filteredInvs.reduce(
      (acc: number, curr: any) => acc + Number(curr.total_amount || 0),
      0,
    );
    const totalDue = filteredInvs.reduce(
      (acc: number, curr: any) => acc + Number(curr.balance_amount || 0),
      0,
    );

    setStats({
      patientsCount: filteredPts.length,
      invoicesCount: filteredInvs.length,
      prescriptionsCount: filteredRxs.length,
      attendanceCount: filteredAtts.length,
      filteredRevenue: totalCollected,
      totalBilled: totalBilled,
      totalDue: totalDue,
    });

    // 5. Aggregate Sold Services and Income
    const serviceMap: { [key: string]: SoldServiceMetric } = {};

    filteredInvs.forEach((inv) => {
      (inv.items || []).forEach((item: any) => {
        // Skip refunded items in active income
        if (item.is_refunded) return;

        const key = item.item_name || 'General Service';
        if (!serviceMap[key]) {
          serviceMap[key] = {
            name: key,
            category: item.category || 'SERVICE',
            quantity: 0,
            income: 0,
          };
        }
        serviceMap[key].quantity += item.quantity || 1;
        serviceMap[key].income += Number(item.total_price || 0);
      });
    });

    const sortedServices = Object.values(serviceMap).sort(
      (a, b) => b.income - a.income,
    );
    setSoldServices(sortedServices);

    // Recent registered patients (matching filter or top 5)
    setRecentPatients(
      filteredPts.length > 0 ? filteredPts.slice(0, 5) : rawPatients.slice(0, 5),
    );
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
  };

  // Computed category breakdown and filtered metrics
  const categoryBreakdown = React.useMemo(() => {
    const map: { [cat: string]: { category: string; quantity: number; income: number } } = {};
    soldServices.forEach((s) => {
      const cat = (s.category || 'GENERAL').toUpperCase();
      if (!map[cat]) {
        map[cat] = { category: cat, quantity: 0, income: 0 };
      }
      map[cat].quantity += s.quantity;
      map[cat].income += s.income;
    });
    return Object.values(map).sort((a, b) => b.income - a.income);
  }, [soldServices]);

  const filteredSoldServices = React.useMemo(() => {
    let list = [...soldServices];
    if (serviceCategoryFilter !== 'ALL') {
      list = list.filter((s) => (s.category || 'GENERAL').toUpperCase() === serviceCategoryFilter);
    }
    if (serviceSortBy === 'quantity') {
      list.sort((a, b) => b.quantity - a.quantity);
    } else {
      list.sort((a, b) => b.income - a.income);
    }
    return list;
  }, [soldServices, serviceCategoryFilter, serviceSortBy]);

  const totalFilteredIncome = filteredSoldServices.reduce((sum, s) => sum + s.income, 0);
  const totalFilteredUnits = filteredSoldServices.reduce((sum, s) => sum + s.quantity, 0);
  const avgFilteredTicket = totalFilteredUnits > 0 ? totalFilteredIncome / totalFilteredUnits : 0;
  const maxFilteredIncome = Math.max(...filteredSoldServices.map((s) => s.income), 1);
  const topService = filteredSoldServices[0];
  const maxServiceIncome = Math.max(...soldServices.map((s) => s.income), 1);
  const totalServiceUnitsSold = soldServices.reduce((sum, s) => sum + s.quantity, 0);

  if (loading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner & Controls */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Clinical Overview
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">
                Branch: {activeCenter?.name}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {user.firstName} {user.lastName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Connected to CareWave Multi-Tenant HIS as{' '}
              <span className="font-semibold text-foreground">{user.role}</span>.
              Operating Branch Code:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-blue-600 dark:text-blue-400">
                {activeCenter?.code || user.center?.code}
              </code>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground transition-all shadow-xs"
              title="Refresh dashboard metrics"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-blue-600 dark:text-blue-400 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              />
              <span>Refresh</span>
            </button>

            <Link
              href="/patients"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Patient</span>
            </Link>

            <Link
              href="/pos"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-all shadow-xs"
            >
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              <span>POS Billing</span>
            </Link>
          </div>
        </div>

        {/* Date Filter Bar & Auto-Refresh Indicator */}
        <div className="mt-5 pt-4 border-t border-blue-200/60 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground">Dashboard Filter:</span>
            <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Auto-refreshing every 20s</span>
            {lastRefreshedAt && <span>• Last update: {lastRefreshedAt}</span>}
          </div>
        </div>
      </div>

      {/* KPI Cards (Filtered) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Patients */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {dateFilter.mode === 'daily'
                ? 'Registered Today'
                : dateFilter.mode === 'monthly'
                ? 'Registered This Month'
                : 'Registered In Range'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {stats.patientsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Isolated to {activeCenter?.name}
            </p>
          </div>
        </div>

        {/* Card 2: Billing & Revenue */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Collected Income
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.filteredRevenue.toFixed(2)} tk
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
              <span>{stats.invoicesCount} {stats.invoicesCount === 1 ? 'Invoice' : 'Invoices'} generated</span>
              {stats.totalDue > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Due: ৳{stats.totalDue.toFixed(2)}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  All Cleared
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Prescriptions */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Prescriptions Issued
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {stats.prescriptionsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              With professional PDF printouts
            </p>
          </div>
        </div>

        {/* Card 4: Attendance */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Staff Attendance
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {stats.attendanceCount} Staff
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Punched during selected period
            </p>
          </div>
        </div>
      </div>

      {/* MODERNIZED SOLD SERVICES & REVENUE BREAKDOWN */}
      <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 space-y-5 transition-all overflow-hidden relative">
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/5 dark:bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-500/5 dark:bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/80 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Sold Services & Revenue Performance
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Live Analytics</span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time clinical service volume and revenue generated across POS invoices ({dateFilter.mode === 'daily' ? dateFilter.dailyDate : dateFilter.mode === 'monthly' ? `${dateFilter.month}/${dateFilter.year}` : `${dateFilter.startDate} to ${dateFilter.endDate}`})
              </p>
            </div>
          </div>

          {/* Controls: Sort and View Switcher */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Sort Toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setServiceSortBy('income')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  serviceSortBy === 'income'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Sort by Total Revenue"
              >
                <Coins className="h-3.5 w-3.5 text-emerald-500" />
                <span>By Revenue</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceSortBy('quantity')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  serviceSortBy === 'quantity'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Sort by Quantity Sold"
              >
                <Activity className="h-3.5 w-3.5 text-blue-500" />
                <span>By Volume</span>
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setServiceViewMode('bars')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  serviceViewMode === 'bars'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Visual Bars View"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Visual</span>
              </button>
              <button
                type="button"
                onClick={() => setServiceViewMode('table')}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                  serviceViewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Detailed Matrix Table View"
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Executive Metric Highlights (4 KPI Tiles) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
          <div className="rounded-xl border border-border/70 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold">
                {serviceCategoryFilter === 'ALL' ? 'Service Revenue' : `${serviceCategoryFilter} Revenue`}
              </span>
              <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-foreground">
              ৳{totalFilteredIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              {serviceCategoryFilter !== 'ALL' && stats.totalBilled > 0
                ? `${((totalFilteredIncome / stats.totalBilled) * 100).toFixed(0)}% of total billed services`
                : stats.totalDue > 0
                ? `৳${stats.filteredRevenue.toFixed(2)} collected • ৳${stats.totalDue.toFixed(2)} due`
                : `100% collected (৳${stats.filteredRevenue.toFixed(2)})`}
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold">Units Dispensed</span>
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-foreground">
              {totalFilteredUnits} <span className="text-xs font-semibold text-muted-foreground">Units</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Across {filteredSoldServices.length} distinct clinical items
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold">Average Ticket</span>
              <Percent className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-lg sm:text-xl font-black text-foreground">
              ৳{avgFilteredTicket.toFixed(2)}
            </div>
            <p className="text-[10px] text-muted-foreground font-medium">
              Average yield per billed service item
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-3.5 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[11px] font-semibold">Top Performing Service</span>
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-xs sm:text-sm font-bold text-foreground truncate" title={topService?.name}>
              {topService ? topService.name : '—'}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono font-medium">
              {topService ? `৳${topService.income.toFixed(2)} (${topService.quantity} sold)` : 'No sales recorded'}
            </p>
          </div>
        </div>

        {/* Category Breakdown Filter Pills */}
        {categoryBreakdown.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs relative z-10 border-b border-border/60 pb-3">
            <span className="text-[11px] font-bold text-muted-foreground uppercase mr-1 flex items-center gap-1 shrink-0">
              <Filter className="h-3 w-3" />
              <span>Category:</span>
            </span>

            <button
              type="button"
              onClick={() => setServiceCategoryFilter('ALL')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-all ${
                serviceCategoryFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              All Modalities ({soldServices.length})
            </button>

            {categoryBreakdown.map((cat) => {
              const isSelected = serviceCategoryFilter === cat.category;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() => setServiceCategoryFilter(cat.category)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'border border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{cat.category}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[9px] font-mono ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-muted text-foreground font-bold'
                    }`}
                  >
                    ৳{cat.income >= 1000 ? `${(cat.income / 1000).toFixed(1)}k` : cat.income.toFixed(0)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Area */}
        {filteredSoldServices.length === 0 ? (
          <div className="py-14 text-center text-xs text-muted-foreground space-y-2 border border-dashed border-border/80 rounded-xl relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 mx-auto text-muted-foreground">
              <BarChart3 className="h-6 w-6 opacity-40" />
            </div>
            <p className="font-bold text-foreground text-sm">No Services Sold In This Selection</p>
            <p className="text-[11px] max-w-sm mx-auto">
              No bills or invoice items match the active date range ({dateFilter.mode === 'daily' ? dateFilter.dailyDate : dateFilter.mode === 'monthly' ? `${dateFilter.month}/${dateFilter.year}` : `${dateFilter.startDate} to ${dateFilter.endDate}`}) and category filter.
            </p>
          </div>
        ) : serviceViewMode === 'bars' ? (
          /* ========================================================================= */
          /* VIEW 1: MODERNIZED VISUAL BARS VIEW                                      */
          /* ========================================================================= */
          <div className="space-y-3 relative z-10">
            {filteredSoldServices.slice(0, 10).map((srv, index) => {
              const widthPct = Math.min(100, Math.max(10, (srv.income / maxFilteredIncome) * 100));
              const revenueShare = totalFilteredIncome > 0 ? (srv.income / totalFilteredIncome) * 100 : 0;
              const avgUnitPrice = srv.quantity > 0 ? srv.income / srv.quantity : 0;

              // Distinct modern color palettes
              const gradients = [
                'from-blue-600 to-cyan-500 shadow-blue-500/20',
                'from-emerald-600 to-teal-400 shadow-emerald-500/20',
                'from-indigo-600 to-purple-500 shadow-indigo-500/20',
                'from-amber-500 to-orange-500 shadow-amber-500/20',
                'from-rose-500 to-pink-500 shadow-rose-500/20',
                'from-violet-600 to-fuchsia-500 shadow-violet-500/20',
                'from-sky-500 to-blue-600 shadow-sky-500/20',
                'from-teal-500 to-emerald-500 shadow-teal-500/20',
              ];
              const barGradient = gradients[index % gradients.length];

              // Category badge colors
              const catUpper = (srv.category || '').toUpperCase();
              const catBadgeStyle =
                catUpper.includes('LAB')
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                  : catUpper.includes('USG') || catUpper.includes('RADIO') || catUpper.includes('XRAY')
                  ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
                  : catUpper.includes('CONSULT')
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : catUpper.includes('EYE')
                  ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-muted text-muted-foreground border-border';

              return (
                <div
                  key={srv.name}
                  className="rounded-xl border border-border/70 bg-card/60 hover:bg-muted/40 p-3 sm:p-3.5 space-y-2.5 transition-all hover:border-border hover:shadow-xs group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {/* Left: Rank, Name, Category */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Rank Indicator */}
                      {index === 0 ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[11px] shadow-xs">
                          <Trophy className="h-3.5 w-3.5" />
                        </span>
                      ) : index === 1 ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-500/15 border border-slate-500/30 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                        </span>
                      ) : index === 2 ? (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-bold text-[11px]">
                          <Sparkles className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground font-mono font-bold text-[10px]">
                          #{index + 1}
                        </span>
                      )}

                      <div className="min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-xs sm:text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {srv.name}
                        </span>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase ${catBadgeStyle}`}>
                          {srv.category}
                        </span>
                        <span className="rounded-md bg-muted/80 text-muted-foreground px-1.5 py-0.5 text-[10px] font-mono">
                          {revenueShare.toFixed(1)}% Share
                        </span>
                      </div>
                    </div>

                    {/* Right: Quantity Sold & Total Income */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-8 sm:pl-0">
                      <div className="text-right">
                        <span className="text-[11px] text-muted-foreground">
                          <strong className="text-foreground font-bold">{srv.quantity}</strong> sold
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          @ ৳{avgUnitPrice.toFixed(0)} avg
                        </span>
                      </div>
                      <div className="font-mono text-sm sm:text-base font-black text-foreground min-w-[90px] text-right">
                        ৳{srv.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Modern Dual-Layer Progress Bar */}
                  <div className="h-2.5 w-full rounded-full bg-muted/70 overflow-hidden relative shadow-inner">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-700 ease-out`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {filteredSoldServices.length > 10 && (
              <p className="text-center text-[11px] text-muted-foreground pt-1">
                Showing top 10 of {filteredSoldServices.length} services. Switch to{' '}
                <button
                  type="button"
                  onClick={() => setServiceViewMode('table')}
                  className="text-blue-600 dark:text-blue-400 underline font-semibold"
                >
                  Table View
                </button>{' '}
                to analyze all services.
              </p>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: HIGH-DENSITY DETAILED FINANCIAL MATRIX TABLE                     */
          /* ========================================================================= */
          <div className="overflow-x-auto rounded-xl border border-border relative z-10">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-12 text-center">Rank</th>
                  <th className="py-2.5 px-3">Service Name</th>
                  <th className="py-2.5 px-3">Modality / Category</th>
                  <th className="py-2.5 px-3 text-right">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Avg Unit Price</th>
                  <th className="py-2.5 px-3 text-right">Total Generated</th>
                  <th className="py-2.5 px-3 text-right">Revenue Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSoldServices.map((srv, idx) => {
                  const revenueShare = totalFilteredIncome > 0 ? (srv.income / totalFilteredIncome) * 100 : 0;
                  const avgPrice = srv.quantity > 0 ? srv.income / srv.quantity : 0;

                  return (
                    <tr key={srv.name} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] font-bold text-muted-foreground">
                        #{idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {srv.name}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="rounded bg-muted px-2 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                          {srv.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        {srv.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground text-[11px]">
                        ৳{avgPrice.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        ৳{srv.income.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="inline-block rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          {revenueShare.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/60 font-bold text-xs text-foreground">
                  <td colSpan={3} className="py-3 px-3 uppercase text-[11px]">
                    Total ({filteredSoldServices.length} Services)
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-600 dark:text-blue-400">
                    {totalFilteredUnits}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                    ৳{avgFilteredTicket.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm">
                    ৳{totalFilteredIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Middle Grid: Recent Patients & Multi-Tenant Assurance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients Table */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Registered Patients ({activeCenter?.name})
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Branch-isolated health records
              </p>
            </div>
            <Link
              href="/patients"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-4">
            {recentPatients.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No patients found for the selected period.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentPatients.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs">
                        {p.first_name?.[0] || 'P'}
                        {p.last_name?.[0] || ''}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {p.first_name} {p.last_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          UHID: <span className="font-mono">{p.uhid}</span> |{' '}
                          {p.gender} | {p.phone}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/patients?selected=${p.id}`}
                      className="rounded border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      History
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Operations & Navigation */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>CareWave Workflows</span>
          </div>

          <div className="space-y-2.5 text-xs">
            <Link
              href="/eye-prescriptions"
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 transition-all"
            >
              <div>
                <p className="font-semibold text-foreground">Eye Prescription Queue</p>
                <p className="text-[10px] text-muted-foreground">Refraction & Vision Test Measurements</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-blue-600" />
            </Link>

            <Link
              href="/refunds"
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-300 transition-all"
            >
              <div>
                <p className="font-semibold text-foreground">Same-Day Refunds</p>
                <p className="text-[10px] text-muted-foreground">Unfulfilled service payment reversals</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
            </Link>

            <Link
              href="/medicines"
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 transition-all"
            >
              <div>
                <p className="font-semibold text-foreground">Medicine Inventory</p>
                <p className="text-[10px] text-muted-foreground">Stock management & catalog CRUD</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-emerald-600" />
            </Link>

            <Link
              href="/reports"
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-purple-50 dark:hover:bg-purple-950/30 hover:border-purple-300 transition-all"
            >
              <div>
                <p className="font-semibold text-foreground">Statistical Reports</p>
                <p className="text-[10px] text-muted-foreground">Monthly analytics & branch audit</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-purple-600" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
