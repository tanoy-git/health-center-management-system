'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  RotateCcw,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  FileText,
  DollarSign,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  ShieldAlert,
  Info,
} from 'lucide-react';
import DateRangeFilter, {
  DateFilterValue,
  getDefaultDateFilter,
  filterMatchesDate,
} from '@/components/DateRangeFilter';

interface InvoiceItem {
  id: string;
  item_name: string;
  category: string;
  unit_price: number | string;
  quantity: number;
  total_price: number | string;
  is_queued: boolean;
  is_refunded: boolean;
  refund_reason?: string;
  refunded_at?: string;
  refunded_by?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number | string;
  paid_amount: number | string;
  balance_due: number | string;
  payment_status: string;
  patient: {
    id: string;
    uhid: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };
  items: InvoiceItem[];
}

export default function RefundsPage() {
  const { activeCenter, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'process' | 'history'>('process');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refundHistory, setRefundHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedItem, setSelectedItem] = useState<InvoiceItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeCenter) {
      loadData();
    }
  }, [activeCenter, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'process') {
        const data = await apiRequest('/billing/invoices');
        setInvoices(Array.isArray(data) ? data : []);
      } else {
        const historyData = await apiRequest('/billing/refunds');
        setRefundHistory(Array.isArray(historyData) ? historyData : []);
      }
    } catch (err) {
      console.error('Failed to load refund billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const isSameCalendarDay = (dateString: string) => {
    const d1 = new Date(dateString);
    const d2 = new Date();
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const openRefundModal = (inv: Invoice, item: InvoiceItem) => {
    setSelectedInvoice(inv);
    setSelectedItem(item);
    setRefundReason('');
    setErrorMsg(null);
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedItem) return;
    if (!refundReason.trim()) {
      setErrorMsg('Mandatory: Please provide a clinical or billing reason for refund.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await apiRequest(
        `/billing/invoices/${selectedInvoice.id}/items/${selectedItem.id}/refund`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: refundReason }),
        },
      );

      setRefundModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Refund request rejected by system rules.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesDate = filterMatchesDate(inv.created_at, dateFilter);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.patient.first_name.toLowerCase().includes(q) ||
      inv.patient.last_name.toLowerCase().includes(q) ||
      inv.patient.uhid.toLowerCase().includes(q);

    return matchesDate && matchesSearch;
  });

  // Filtered Refund History
  const filteredHistory = refundHistory.filter((item) => {
    const matchesDate = filterMatchesDate(item.refunded_at || item.created_at, dateFilter);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.item_name.toLowerCase().includes(q) ||
      (item.invoice?.invoice_number && item.invoice.invoice_number.toLowerCase().includes(q)) ||
      (item.invoice?.patient?.first_name && item.invoice.patient.first_name.toLowerCase().includes(q)) ||
      (item.invoice?.patient?.uhid && item.invoice.patient.uhid.toLowerCase().includes(q));

    return matchesDate && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Invoice Items Refund & Reversal System</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict regulatory compliance: Same-day payments only & zero tolerance for already generated reports/prescriptions
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Strict Policy Banner */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/20 p-4 shadow-sm flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-foreground">
          <p className="font-bold text-blue-700 dark:text-blue-300">CareWave Refund Rules & Regulatory Safeguards:</p>
          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
            <li>
              <span className="font-semibold text-foreground">Same-Day Rule:</span> Service items are refundable{' '}
              <span className="text-blue-600 dark:text-blue-400 font-semibold">strictly on the same calendar day</span>{' '}
              the bill was paid. Older invoices cannot be refunded.
            </li>
            <li>
              <span className="font-semibold text-foreground">Clinical Report Rule:</span> If a doctor prescription, diagnostic lab report, or USG report has already been created/completed, the service item is{' '}
              <span className="text-red-600 dark:text-red-400 font-semibold">permanently locked and non-refundable</span>.
            </li>
          </ul>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('process')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'process'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Process Item Refunds</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Refund Audit History ({refundHistory.length})</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Date Filter:</span>
          <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={activeTab === 'process' ? 'Search by invoice #, patient name, UHID...' : 'Search refund history...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* TAB 1: PROCESS REFUNDS */}
      {activeTab === 'process' && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading invoices for refund audit...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground bg-card border border-border rounded-xl space-y-2">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
              <p className="font-semibold text-foreground">No Invoices Found</p>
              <p className="text-[11px]">No invoices found matching the current date filter and search.</p>
            </div>
          ) : (
            filteredInvoices.map((inv) => {
              const isToday = isSameCalendarDay(inv.created_at);
              const isExpanded = expandedInvoiceId === inv.id;
              const hasRefundableItem = isToday && inv.items?.some((it) => it.is_queued && !it.is_refunded);

              return (
                <div
                  key={inv.id}
                  className="rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-all"
                >
                  {/* Invoice Header Row */}
                  <div
                    onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs shrink-0">
                        INV
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground text-sm">
                            {inv.invoice_number}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isToday
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {isToday ? 'Today (Same Day)' : 'Past Date'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Patient: <span className="font-semibold text-foreground">{inv.patient?.first_name} {inv.patient?.last_name}</span> (UHID: {inv.patient?.uhid})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-foreground">
                          tk {Number(inv.total_amount).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Paid: tk {Number(inv.paid_amount).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasRefundableItem && (
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                            Eligible Items
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Items Table */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/10 p-4">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Billed Items / Clinical Services ({inv.items?.length || 0})
                      </p>

                      <div className="overflow-x-auto rounded-lg border border-border bg-card">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                            <tr>
                              <th className="py-2 px-3">Service / Item</th>
                              <th className="py-2 px-3">Category</th>
                              <th className="py-2 px-3 font-mono">Price</th>
                              <th className="py-2 px-3">Clinical Report Status</th>
                              <th className="py-2 px-3">Refund Status</th>
                              <th className="py-2 px-3 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {inv.items?.map((item) => {
                              const isItemRefunded = item.is_refunded;
                              const isQueued = item.is_queued; // true = queued / report not yet created; false = fulfilled / report created
                              const isEligible = isToday && isQueued && !isItemRefunded;

                              return (
                                <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                                  <td className="py-2.5 px-3 font-semibold text-foreground">
                                    {item.item_name}
                                    {isItemRefunded && (
                                      <span className="ml-2 rounded bg-red-100 dark:bg-red-950/60 px-1.5 py-0.2 text-[9px] font-bold text-red-600 dark:text-red-400">
                                        [REFUNDED]
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                      {item.category}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                                    tk {Number(item.total_price).toLocaleString()}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {isQueued ? (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                        <Clock className="h-3 w-3" />
                                        <span>Queued (Report Not Generated)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span>Fulfilled / Report Created</span>
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {isItemRefunded ? (
                                      <span className="rounded bg-red-100 dark:bg-red-950/60 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:text-red-300">
                                        Refunded
                                      </span>
                                    ) : !isToday ? (
                                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        Past Date (Ineligible)
                                      </span>
                                    ) : !isQueued ? (
                                      <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                        Report Created (Ineligible)
                                      </span>
                                    ) : (
                                      <span className="rounded bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                        Eligible for Refund
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {isEligible && hasPermission('billing:refund:manage') ? (
                                      <button
                                        type="button"
                                        onClick={() => openRefundModal(inv, item)}
                                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-all"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Refund Item</span>
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-muted-foreground italic">
                                        {isItemRefunded ? 'Completed' : 'Non-refundable'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: REFUND AUDIT HISTORY */}
      {activeTab === 'history' && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Processed Refunds Audit Log ({filteredHistory.length})
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading refund history...
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <RotateCcw className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
              <p className="font-semibold text-foreground">No Refunds Found</p>
              <p className="text-[11px]">No items have been refunded for the selected filter period.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Patient</th>
                    <th className="py-2.5 px-4">Refunded Item</th>
                    <th className="py-2.5 px-4 font-mono">Amount</th>
                    <th className="py-2.5 px-4">Reason</th>
                    <th className="py-2.5 px-4">Refunded At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {item.invoice?.invoice_number || 'INV'}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-foreground">
                          {item.invoice?.patient?.first_name} {item.invoice?.patient?.last_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          UHID: {item.invoice?.patient?.uhid}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-foreground">{item.item_name}</span>
                        <span className="ml-2 rounded bg-muted px-1.5 py-0.2 text-[9px] font-mono text-muted-foreground">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-red-600 dark:text-red-400">
                        -tk {Number(item.total_price).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground italic max-w-xs truncate">
                        "{item.refund_reason || 'N/A'}"
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {new Date(item.refunded_at || item.updated_at).toLocaleString([], {
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

      {/* PROCESS REFUND MODAL */}
      {refundModalOpen && selectedInvoice && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-600 border border-red-500/20">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Confirm Item Refund</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Invoice: <span className="font-mono">{selectedInvoice.invoice_number}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient:</span>
                <span className="font-semibold text-foreground">
                  {selectedInvoice.patient?.first_name} {selectedInvoice.patient?.last_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service Item:</span>
                <span className="font-semibold text-foreground">{selectedItem.item_name}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-2 font-mono">
                <span className="font-bold text-foreground">Refund Amount:</span>
                <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                  tk {Number(selectedItem.total_price).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Reason for Refund *
                </label>
                <textarea
                  required
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="e.g. Patient requested test cancellation before sample collection, duplicate order..."
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <p className="text-[11px] text-muted-foreground">
                Note: Upon confirmation, this item will be removed from the clinical queue, the invoice total will be deducted, and an audit entry will be permanently logged.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
