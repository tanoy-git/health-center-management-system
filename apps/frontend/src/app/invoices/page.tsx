'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import DateRangeFilter, {
  DateFilterValue,
  getDefaultDateFilter,
  filterMatchesDate,
} from '@/components/DateRangeFilter';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';
import A4InvoiceModal from '@/components/A4InvoiceModal';
import {
  FileText,
  Search,
  Printer,
  Receipt,
  History,
  CheckCircle,
  Clock,
  AlertTriangle,
  Pencil,
  Lock,
  X,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function InvoicesPage() {
  const { activeCenter, user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter());
  const [invoiceIdSearch, setInvoiceIdSearch] = useState('');
  const [patientNameSearch, setPatientNameSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [a4ModalOpen, setA4ModalOpen] = useState(false);
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [thermalData, setThermalData] = useState<any | null>(null);
  const [auditLogsModalOpen, setAuditLogsModalOpen] = useState(false);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState<any[]>([]);

  // Edit Invoice Modal State (Only for invoices <= 3 days old)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    discountAmount: 0,
    discountPercent: 0,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    notes: '',
    modificationReason: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [activeCenter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/billing/invoices');
      setInvoices(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openA4Modal = async (invoiceId: string) => {
    try {
      const full = await apiRequest(`/billing/invoices/${invoiceId}`);
      setSelectedInvoice(full);
      setA4ModalOpen(true);
    } catch (e: any) {
      alert(e.message || 'Error opening invoice');
    }
  };

  const openThermalModal = async (invoiceId: string) => {
    try {
      const data = await apiRequest(`/billing/invoices/${invoiceId}/receipt`);
      setThermalData(data);
      setThermalModalOpen(true);
    } catch (e: any) {
      alert(e.message || 'Error loading thermal receipt');
    }
  };

  const openAuditLogs = async (invoiceId: string) => {
    try {
      const full = await apiRequest(`/billing/invoices/${invoiceId}`);
      setSelectedAuditLogs(full.audit_logs || []);
      setSelectedInvoice(full);
      setAuditLogsModalOpen(true);
    } catch (e: any) {
      alert(e.message || 'Error loading audit logs');
    }
  };

  // Open Edit Invoice Modal (Validates <= 3 days rule)
  const handleOpenEdit = (inv: any) => {
    const ageInMs = Date.now() - new Date(inv.created_at).getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

    if (ageInDays > 3) {
      alert('Invoice editing policy: Invoices can only be edited within 3 days of purchase.');
      return;
    }

    setEditingInvoice(inv);
    setEditForm({
      discountAmount: Number(inv.discount_amount || 0),
      discountPercent: Number(inv.discount_percent || 0),
      paymentMethod: inv.payment_method || 'CASH',
      paymentStatus: inv.payment_status || 'PAID',
      notes: inv.notes || '',
      modificationReason: '',
    });
    setEditError(null);
    setEditModalOpen(true);
  };

  const handleSaveInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    if (!editForm.modificationReason.trim()) {
      setEditError('A modification reason is strictly mandatory for the audit log.');
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      await apiRequest(`/billing/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });

      setEditModalOpen(false);
      setEditingInvoice(null);
      loadInvoices();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update invoice');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Filter Invoices
  const displayedInvoices = invoices.filter((inv) => {
    // 1. Date filter (Daily by default)
    if (!filterMatchesDate(inv.created_at, dateFilter)) return false;

    // 2. Invoice ID filter
    if (invoiceIdSearch.trim()) {
      const searchNum = invoiceIdSearch.trim().toLowerCase();
      if (!inv.invoice_number?.toLowerCase().includes(searchNum)) return false;
    }

    // 3. Patient Name filter
    if (patientNameSearch.trim()) {
      const pSearch = patientNameSearch.trim().toLowerCase();
      const pName = `${inv.patient?.first_name || ''} ${inv.patient?.last_name || ''}`.toLowerCase();
      const uhid = (inv.patient?.uhid || '').toLowerCase();
      if (!pName.includes(pSearch) && !uhid.includes(pSearch)) return false;
    }

    // 4. Status filter
    if (statusFilter !== 'ALL' && inv.payment_status !== statusFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Invoices & Receipt Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit-tracked billing records for{' '}
            <span className="font-semibold text-foreground">
              {activeCenter?.name}
            </span>{' '}
            • Invoices editable within 3 days of purchase
          </p>
        </div>

        <button
          onClick={loadInvoices}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-border bg-card hover:bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-all shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Filter by Invoice Number */}
          <div className="relative flex-1 min-w-[160px] max-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={invoiceIdSearch}
              onChange={(e) => setInvoiceIdSearch(e.target.value)}
              placeholder="Filter by Invoice #..."
              className="w-full rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>

          {/* Filter by Patient Name */}
          <div className="relative flex-1 min-w-[160px] max-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={patientNameSearch}
              onChange={(e) => setPatientNameSearch(e.target.value)}
              placeholder="Filter by Patient Name / UHID..."
              className="w-full rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
            />
          </div>

          {/* Filter by Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PAID">PAID</option>
              <option value="PARTIAL">PARTIAL</option>
              <option value="DUE">DUE</option>
            </select>
          </div>
        </div>

        {/* Date Filter (Daily by default) */}
        <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
      </div>

      {/* Invoices List */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              Invoices Issued ({displayedInvoices.length})
            </span>
            {displayedInvoices.length !== invoices.length && (
              <span className="text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium px-2 py-0.5">
                Filtered from {invoices.length} total
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Strict audit logs recorded on all modifications
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading invoices...
          </div>
        ) : displayedInvoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
            <p className="font-semibold text-foreground">No Invoices Found</p>
            <p className="text-[11px]">
              No invoices match the selected date or search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Patient Demographics</th>
                  <th className="py-2.5 px-4">Items / Services</th>
                  <th className="py-2.5 px-4">Total Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayedInvoices.map((inv) => {
                  const ageInMs = Date.now() - new Date(inv.created_at).getTime();
                  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
                  const isEditable = ageInDays <= 3;
                  const hasRefundedItems = (inv.items || []).some((item: any) => item.is_refunded);

                  return (
                    <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        <div>{inv.invoice_number}</div>
                        {hasRefundedItems && (
                          <span className="inline-block mt-0.5 rounded bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:text-rose-300">
                            PARTIALLY REFUNDED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-foreground">
                          {inv.patient?.first_name} {inv.patient?.last_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {inv.patient?.uhid}
                        </span>
                      </td>

                      {/* Items & Services Column (with Refund Badges) */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-1">
                          {(inv.items || []).map((item: any) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-1.5 text-[11px] leading-tight"
                            >
                              <span className="font-medium text-foreground">
                                • {item.item_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({item.quantity}x {Number(item.unit_price).toFixed(0)}tk)
                              </span>
                              {item.is_refunded && (
                                <span
                                  className="inline-flex items-center rounded bg-rose-100 dark:bg-rose-950/80 px-1 py-0.2 text-[9px] font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider"
                                  title={`Refunded: ${item.refund_reason || 'Same-day cancellation'}`}
                                >
                                  [REFUNDED]
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                        {Number(inv.total_amount).toFixed(2)} tk
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            inv.payment_status === 'PAID'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {inv.payment_status === 'PAID' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>{inv.payment_status}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Button (Only within 3 days) */}
                          {isEditable ? (
                            <button
                              onClick={() => handleOpenEdit(inv)}
                              className="flex items-center gap-1 rounded border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 px-2 py-1 text-[11px] font-semibold transition-colors shadow-xs"
                              title="Edit invoice within 3-day policy"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-2 py-1 text-[10px] font-medium text-muted-foreground cursor-not-allowed"
                              title="Invoice locked: exceeds 3 days after purchase"
                            >
                              <Lock className="h-2.5 w-2.5" />
                              <span>Locked (&gt;3d)</span>
                            </span>
                          )}

                          <button
                            onClick={() => openA4Modal(inv.id)}
                            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted transition-colors"
                            title="View A4 Printable Invoice"
                          >
                            <FileText className="h-3 w-3 text-blue-500" />
                            <span>A4</span>
                          </button>

                          <button
                            onClick={() => openThermalModal(inv.id)}
                            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] font-semibold hover:bg-muted transition-colors"
                            title="View 80mm Thermal Receipt"
                          >
                            <Receipt className="h-3 w-3 text-emerald-500" />
                            <span>80mm</span>
                          </button>

                          <button
                            onClick={() => openAuditLogs(inv.id)}
                            className="rounded border border-border p-1 text-muted-foreground hover:bg-muted transition-colors"
                            title="View Audit Trail"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Invoice Modal (3-Day Policy) */}
      {editModalOpen && editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Edit Invoice (Within 3-Day Window)
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Invoice: {editingInvoice.invoice_number} • Patient:{' '}
                  {editingInvoice.patient?.first_name} {editingInvoice.patient?.last_name}
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {editError && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInvoiceEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-foreground">Discount Amount (tk)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.discountAmount}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        discountAmount: Number(e.target.value),
                        discountPercent: 0,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground">Discount Percent (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editForm.discountPercent}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        discountPercent: Number(e.target.value),
                        discountAmount: 0,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground">Payment Method</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) =>
                      setEditForm({ ...editForm, paymentMethod: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                  >
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                    <option value="BKASH">BKASH</option>
                    <option value="NAGAD">NAGAD</option>
                    <option value="INSURANCE">INSURANCE</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-foreground">Payment Status</label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) =>
                      setEditForm({ ...editForm, paymentStatus: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="DUE">DUE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Notes</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Optional billing remarks..."
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">
                  Reason for Modification <span className="text-rose-500">* (Audit Log)</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={editForm.modificationReason}
                  onChange={(e) =>
                    setEditForm({ ...editForm, modificationReason: e.target.value })
                  }
                  placeholder="State the clinical or administrative reason for editing this invoice..."
                  className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-xs focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save & Log Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {auditLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Strict Audit Trail Log
                </h3>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Invoice: {selectedInvoice?.invoice_number}
                </p>
              </div>
              <button
                onClick={() => setAuditLogsModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {selectedAuditLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No modifications logged.
                </p>
              ) : (
                selectedAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-lg border border-border p-3 text-xs space-y-1 bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                      {log.details}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipts Modals */}
      <ThermalReceiptModal
        isOpen={thermalModalOpen}
        onClose={() => setThermalModalOpen(false)}
        receiptData={thermalData}
      />

      <A4InvoiceModal
        isOpen={a4ModalOpen}
        onClose={() => setA4ModalOpen(false)}
        invoice={selectedInvoice}
      />
    </div>
  );
}
