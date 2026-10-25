'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  FileText,
  Activity,
  Printer,
  Download,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  RefreshCw,
  Building2,
  Stethoscope,
  FlaskConical,
  Eye,
  CheckCircle2,
  Award,
  Percent,
} from 'lucide-react';
import DateRangeFilter, {
  DateFilterValue,
  getDefaultDateFilter,
  filterMatchesDate,
} from '@/components/DateRangeFilter';

export default function ReportsPage() {
  const { activeCenter } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() => {
    const base = getDefaultDateFilter();
    return {
      ...base,
      mode: 'monthly',
    };
  });

  const [loading, setLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState<'financial' | 'services' | 'clinical' | 'refunds' | 'commissions'>('financial');

  // Raw data fetched from APIs
  const [invoices, setInvoices] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [diagnosticReports, setDiagnosticReports] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [commissionEmployeeFilter, setCommissionEmployeeFilter] = useState('ALL');

  useEffect(() => {
    if (activeCenter) {
      loadAllReportData();
    }
  }, [activeCenter]);

  const loadAllReportData = async () => {
    setLoading(true);
    try {
      const [invData, rxData, diagData, refData, patData, commData, empData] = await Promise.all([
        apiRequest('/billing/invoices').catch(() => []),
        apiRequest('/clinical/prescriptions').catch(() => []),
        apiRequest('/diagnostics/reports').catch(() => []),
        apiRequest('/billing/refunds').catch(() => []),
        apiRequest('/patients').catch(() => []),
        apiRequest('/billing/commissions').catch(() => []),
        apiRequest('/hr/employees').catch(() => []),
      ]);

      setInvoices(Array.isArray(invData) ? invData : []);
      setPrescriptions(Array.isArray(rxData) ? rxData : []);
      setDiagnosticReports(Array.isArray(diagData) ? diagData : []);
      setRefunds(Array.isArray(refData) ? refData : []);
      setPatients(Array.isArray(patData) ? patData : []);
      setCommissions(Array.isArray(commData) ? commData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
    } catch (err) {
      console.error('Failed to load statistical reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered datasets based on DateRangeFilter
  const filteredInvoices = invoices.filter((inv) =>
    filterMatchesDate(inv.created_at, dateFilter),
  );

  const filteredPrescriptions = prescriptions.filter((rx) =>
    filterMatchesDate(rx.created_at, dateFilter),
  );

  const filteredReports = diagnosticReports.filter((dr) =>
    filterMatchesDate(dr.created_at, dateFilter),
  );

  const filteredRefunds = refunds.filter((rf) =>
    filterMatchesDate(rf.refunded_at || rf.updated_at, dateFilter),
  );

  const filteredPatients = patients.filter((p) =>
    filterMatchesDate(p.created_at, dateFilter),
  );

  const filteredCommissions = commissions.filter((c) => {
    if (!filterMatchesDate(c.created_at, dateFilter)) return false;
    if (commissionEmployeeFilter !== 'ALL' && c.employee_id !== commissionEmployeeFilter) {
      return false;
    }
    return true;
  });

  const totalCommissionEarned = filteredCommissions.reduce(
    (sum, c) => sum + Number(c.commission_amount || 0),
    0,
  );
  const totalReferredRevenue = filteredCommissions.reduce(
    (sum, c) => sum + Number(c.service_amount || 0),
    0,
  );
  const uniqueReferredPatients = new Set(filteredCommissions.map((c) => c.patient_id)).size;
  const uniqueReferringEmployees = new Set(filteredCommissions.map((c) => c.employee_id)).size;

  // Financial aggregates
  const totalGrossRevenue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.subtotal || inv.total_amount || 0), 0);
  const totalDiscount = filteredInvoices.reduce((sum, inv) => sum + Number(inv.discount_amount || 0), 0);
  const totalNetBilled = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0);
  const totalDue = filteredInvoices.reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);
  const totalRefundAmount = filteredRefunds.reduce((sum, rf) => sum + Number(rf.total_price || 0), 0);
  const netRealizedInflow = Math.max(0, totalPaid - totalRefundAmount);

  // Department Breakdown
  const categoryStats: Record<string, { count: number; revenue: number }> = {};
  filteredInvoices.forEach((inv) => {
    inv.items?.forEach((item: any) => {
      const cat = item.category || 'GENERAL';
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, revenue: 0 };
      }
      categoryStats[cat].count += item.quantity || 1;
      categoryStats[cat].revenue += Number(item.total_price || 0);
    });
  });

  // Top Services
  const serviceStats: Record<string, { name: string; count: number; revenue: number }> = {};
  filteredInvoices.forEach((inv) => {
    inv.items?.forEach((item: any) => {
      const name = item.item_name || 'Service';
      if (!serviceStats[name]) {
        serviceStats[name] = { name, count: 0, revenue: 0 };
      }
      serviceStats[name].count += item.quantity || 1;
      serviceStats[name].revenue += Number(item.total_price || 0);
    });
  });

  const sortedTopServices = Object.values(serviceStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['Aegis HIS - Center Statistical Summary'],
      ['Center', activeCenter?.name || 'All Centers'],
      ['Filter Mode', dateFilter.mode],
      ['Generated On', new Date().toLocaleString()],
      [],
      ['Metric', 'Value'],
      ['Gross Billed Revenue (tk)', totalGrossRevenue.toFixed(2)],
      ['Discounts Given (tk)', totalDiscount.toFixed(2)],
      ['Net Billed Revenue (tk)', totalNetBilled.toFixed(2)],
      ['Collected Cash (tk)', totalPaid.toFixed(2)],
      ['Outstanding Dues (tk)', totalDue.toFixed(2)],
      ['Total Refunded (tk)', totalRefundAmount.toFixed(2)],
      ['Net Inflow (tk)', netRealizedInflow.toFixed(2)],
      ['Total Invoices Count', filteredInvoices.length],
      ['New Patients Registered', filteredPatients.length],
      ['Prescriptions Issued', filteredPrescriptions.length],
      ['Diagnostic Reports Signed', filteredReports.length],
      ['Items Refunded', filteredRefunds.length],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `his-report-${dateFilter.mode}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Monthly Statistics & Executive Reports</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational KPIs, Revenue breakdown, doctor productivity, and diagnostic volume for{' '}
            <span className="font-semibold text-foreground">{activeCenter?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAllReportData}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-colors"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all shadow-blue-500/20"
            title="Print Report"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card border border-border p-3.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Report Timeline:</span>
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          Scope: {activeCenter?.name} · {dateFilter.mode.toUpperCase()}
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Net Billed Revenue</span>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </p>
          <p className="text-2xl font-bold font-mono text-foreground">
            tk {totalNetBilled.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Gross: tk {totalGrossRevenue.toLocaleString()} · Disc: tk {totalDiscount.toLocaleString()}
          </p>
        </div>

        {/* Realized Cash Inflow */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Collected Cash</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </p>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            tk {totalPaid.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">
            From {filteredInvoices.length} invoices
          </p>
        </div>

        {/* Outstanding Due */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Due Receivables</span>
            <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </p>
          <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
            tk {totalDue.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Uncollected patient balances
          </p>
        </div>

        {/* Total Refunds Issued */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
          <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
            <span>Refunded Services</span>
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
          </p>
          <p className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
            -tk {totalRefundAmount.toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {filteredRefunds.length} items reversed
          </p>
        </div>
      </div>

      {/* Report Section Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveReportTab('financial')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeReportTab === 'financial'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Financial Summary</span>
        </button>

        <button
          onClick={() => setActiveReportTab('services')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeReportTab === 'services'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Department & Services</span>
        </button>

        <button
          onClick={() => setActiveReportTab('clinical')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeReportTab === 'clinical'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Stethoscope className="h-3.5 w-3.5" />
          <span>Clinical & Diagnostics</span>
        </button>

        <button
          onClick={() => setActiveReportTab('refunds')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeReportTab === 'refunds'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Refund Audit Breakdown</span>
        </button>

        <button
          onClick={() => setActiveReportTab('commissions')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            activeReportTab === 'commissions'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Award className="h-3.5 w-3.5" />
          <span>Reference Commission</span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL SUMMARY */}
      {activeReportTab === 'financial' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span>Revenue Realization Breakdown</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Gross Services Billed</span>
                <span className="font-mono font-bold text-foreground">tk {totalGrossRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Total Discounts Granted</span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">-tk {totalDiscount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="font-semibold text-foreground">Net Invoiced Revenue</span>
                <span className="font-mono font-bold text-foreground text-sm">tk {totalNetBilled.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Payments Collected</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">tk {totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Refunds Deducted</span>
                <span className="font-mono font-bold text-red-600 dark:text-red-400">-tk {totalRefundAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 bg-blue-50/50 dark:bg-blue-950/20 px-3 rounded-lg text-xs font-bold">
                <span className="text-blue-700 dark:text-blue-300">Net Realized Cash Inflow</span>
                <span className="font-mono text-blue-700 dark:text-blue-300 text-sm">tk {netRealizedInflow.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span>Operational Metrics & Volume</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">Invoices Processed</p>
                <p className="text-xl font-bold font-mono text-foreground">{filteredInvoices.length}</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">New Registered Patients</p>
                <p className="text-xl font-bold font-mono text-foreground">{filteredPatients.length}</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">Prescriptions Issued</p>
                <p className="text-xl font-bold font-mono text-foreground">{filteredPrescriptions.length}</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground">Lab & USG Reports</p>
                <p className="text-xl font-bold font-mono text-foreground">{filteredReports.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENT & SERVICES */}
      {activeReportTab === 'services' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Share */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>Revenue by Clinical Department</span>
            </h3>

            <div className="space-y-3">
              {Object.keys(categoryStats).length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No service data in this period.</p>
              ) : (
                Object.entries(categoryStats).map(([cat, stat]) => {
                  const pct = totalGrossRevenue > 0 ? ((stat.revenue / totalGrossRevenue) * 100).toFixed(1) : '0';
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-foreground">{cat} ({stat.count} items)</span>
                        <span className="font-mono font-bold text-foreground">tk {stat.revenue.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top 8 Billed Services */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-blue-600" />
              <span>Top 8 Billed Services & Procedures</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Service Name</th>
                    <th className="py-2 px-3 text-center">Volume</th>
                    <th className="py-2 px-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedTopServices.map((srv, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{srv.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">{srv.count}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        tk {srv.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CLINICAL & DIAGNOSTICS */}
      {activeReportTab === 'clinical' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-blue-600" />
              <span>Outpatient Prescriptions Summary</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Total Prescriptions Issued</span>
                <span className="font-mono font-bold text-foreground">{filteredPrescriptions.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">General Medicine Prescriptions</span>
                <span className="font-mono font-bold text-foreground">
                  {filteredPrescriptions.filter((p) => p.prescription_type !== 'EYE').length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Ophthalmology / Eye Prescriptions</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {filteredPrescriptions.filter((p) => p.prescription_type === 'EYE').length}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-blue-600" />
              <span>Diagnostics & Lab Reports Summary</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Total Completed Reports</span>
                <span className="font-mono font-bold text-foreground">{filteredReports.length}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Clinical Pathology & Biochemistry</span>
                <span className="font-mono font-bold text-foreground">
                  {filteredReports.filter((r) => r.service?.category === 'LAB' || !r.service?.category?.includes('USG')).length}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border/60 text-xs">
                <span className="text-muted-foreground">Ultrasonography (USG) Imaging</span>
                <span className="font-mono font-bold text-foreground">
                  {filteredReports.filter((r) => r.service?.category?.includes('USG')).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: REFUND AUDIT BREAKDOWN */}
      {activeReportTab === 'refunds' && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>Refund Transactions & Compliance Audit</span>
            </h3>
            <span className="font-mono font-bold text-red-600 dark:text-red-400 text-xs">
              Total Deducted: tk {totalRefundAmount.toLocaleString()}
            </span>
          </div>

          {filteredRefunds.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No refund events recorded for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Service Refunded</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 font-mono">Amount</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRefunds.map((rf) => (
                    <tr key={rf.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{rf.item_name}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{rf.category}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-red-600 dark:text-red-400">
                        -tk {Number(rf.total_price).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground italic">"{rf.refund_reason}"</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {new Date(rf.refunded_at || rf.updated_at).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: REFERENCE COMMISSION */}
      {activeReportTab === 'commissions' && (
        <div className="space-y-6">
          {/* Commission Overview KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Total Commission Accrued</span>
                <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </p>
              <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                tk {totalCommissionEarned.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Payable / earned referral incentives
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Referred Billed Revenue</span>
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                tk {totalReferredRevenue.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Gross service volume from referrals
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Referred Patients</span>
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                {uniqueReferredPatients}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Distinct patients with reference
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-1">
              <p className="text-xs text-muted-foreground font-medium flex items-center justify-between">
                <span>Beneficiary Staff</span>
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </p>
              <p className="text-2xl font-bold font-mono text-foreground">
                {uniqueReferringEmployees}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Employees earning commission
              </p>
            </div>
          </div>

          {/* Filter Bar & Detailed Ledger */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-600" />
                  <span>Service-Wise Referral Commission Ledger</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Complete audit of employee referral earnings per billed service
                </p>
              </div>

              {/* Filter by Employee */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Staff Member:
                </span>
                <select
                  value={commissionEmployeeFilter}
                  onChange={(e) => setCommissionEmployeeFilter(e.target.value)}
                  className="rounded-lg border border-input bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="ALL">All Referring Staff ({employees.length})</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user?.first_name} {emp.user?.last_name} ({emp.employee_code || 'EMP'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredCommissions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-12 text-center space-y-2">
                <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="text-xs font-semibold text-foreground">No referral commissions recorded</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  When patients register with a referring employee and purchase services matching active commission rules, commissions will automatically be recorded here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Patient</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3">Referring Employee</th>
                      <th className="py-2.5 px-3">Service &amp; Category</th>
                      <th className="py-2.5 px-3 font-mono">Service Billed</th>
                      <th className="py-2.5 px-3">Rate / Rule</th>
                      <th className="py-2.5 px-3 font-mono text-right">Commission Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCommissions.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground">
                            {c.patient?.first_name} {c.patient?.last_name}
                          </p>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            UHID: {c.patient?.uhid}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400 font-semibold">
                          {c.invoice?.invoice_number || 'INV'}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-foreground">
                            {c.employee?.user?.first_name} {c.employee?.user?.last_name}
                          </p>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Code: {c.employee?.employee_code || 'EMP'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-medium text-foreground">{c.service_name}</p>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase font-mono text-muted-foreground">
                            {c.service_category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground font-semibold">
                          tk {Number(c.service_amount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                            {c.commission_type === 'PERCENTAGE'
                              ? `${Number(c.commission_rate)}%`
                              : `Fixed tk ${Number(c.commission_rate)}`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">
                          +tk {Number(c.commission_amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 font-semibold border-t border-border">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 text-right text-xs">
                        Total Commissions for Period:
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">
                        tk {totalReferredRevenue.toLocaleString()}
                      </td>
                      <td></td>
                      <td className="py-3 px-3 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 text-right">
                        tk {totalCommissionEarned.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
