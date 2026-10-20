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
  });

  const [soldServices, setSoldServices] = useState<SoldServiceMetric[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('');

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
    const totalRev = filteredInvs.reduce(
      (acc: number, curr: any) => acc + Number(curr.paid_amount || 0),
      0,
    );

    setStats({
      patientsCount: filteredPts.length,
      invoicesCount: filteredInvs.length,
      prescriptionsCount: filteredRxs.length,
      attendanceCount: filteredAtts.length,
      filteredRevenue: totalRev,
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

  if (loading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const maxServiceIncome = Math.max(...soldServices.map((s) => s.income), 1);
  const totalServiceUnitsSold = soldServices.reduce((sum, s) => sum + s.quantity, 0);

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
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.invoicesCount} Invoices generated
            </p>
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

      {/* SOLD SERVICES & INCOME BAR CHART */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Sold Services & Income Breakdown
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Live volume of sold clinical services and revenue generated (in BDT / tk)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="rounded-lg bg-muted/60 px-2.5 py-1 text-[11px] font-semibold text-foreground">
              Total Units: <span className="text-blue-600 dark:text-blue-400">{totalServiceUnitsSold}</span>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              Income: {stats.filteredRevenue.toFixed(2)} tk
            </div>
          </div>
        </div>

        {soldServices.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
            <BarChart3 className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
            <p className="font-semibold text-foreground">No Services Sold In This Period</p>
            <p className="text-[11px]">
              Services billed via POS for the selected date filter will show here.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5 pt-2">
            {soldServices.slice(0, 8).map((srv, index) => {
              const widthPct = Math.min(100, Math.max(8, (srv.income / maxServiceIncome) * 100));
              const colors = [
                'from-blue-600 to-cyan-500',
                'from-emerald-600 to-teal-500',
                'from-indigo-600 to-purple-500',
                'from-amber-600 to-orange-500',
                'from-rose-600 to-pink-500',
                'from-sky-600 to-blue-500',
                'from-violet-600 to-fuchsia-500',
                'from-teal-600 to-emerald-500',
              ];
              const barGradient = colors[index % colors.length];

              return (
                <div key={srv.name} className="space-y-1.5 group">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground w-4">
                        #{index + 1}
                      </span>
                      <span className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {srv.name}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">
                        {srv.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted-foreground">
                        <strong className="text-foreground">{srv.quantity}</strong> sold
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {srv.income.toFixed(2)} tk
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar Chart representation */}
                  <div className="h-3 w-full rounded-full bg-muted/60 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-500 shadow-xs`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
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
