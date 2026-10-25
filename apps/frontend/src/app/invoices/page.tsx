'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/Toast';
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
  Tag,
  Plus,
  Trash2,
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
  const [categories, setCategories] = useState<any[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [editForm, setEditForm] = useState<{
    discountAmount: number;
    discountPercent: number;
    paymentMethod: string;
    paymentStatus: string;
    paidAmount: number;
    notes: string;
    modificationReason: string;
    items: Array<{
      id?: string;
      serviceId?: string;
      itemName: string;
      category: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
      is_queued: boolean;
    }>;
  }>({
    discountAmount: 0,
    discountPercent: 0,
    paymentMethod: 'CASH',
    paymentStatus: 'PAID',
    paidAmount: 0,
    notes: '',
    modificationReason: '',
    items: [],
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoices();
  }, [activeCenter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const [invData, catData, srvData] = await Promise.all([
        apiRequest('/billing/invoices'),
        apiRequest('/billing/categories').catch(() => []),
        apiRequest('/billing/services').catch(() => []),
      ]);
      setInvoices(invData || []);
      setCategories(catData || []);
      setServicesList(srvData || []);
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
      toast.error(e.message || 'Error opening invoice');
    }
  };

  const openThermalModal = async (invoiceId: string) => {
    try {
      const data = await apiRequest(`/billing/invoices/${invoiceId}/receipt`);
      setThermalData(data);
      setThermalModalOpen(true);
    } catch (e: any) {
      toast.error(e.message || 'Error loading thermal receipt');
    }
  };

  const openAuditLogs = async (invoiceId: string) => {
    try {
      const full = await apiRequest(`/billing/invoices/${invoiceId}`);
      setSelectedAuditLogs(full.audit_logs || []);
      setSelectedInvoice(full);
      setAuditLogsModalOpen(true);
    } catch (e: any) {
      toast.error(e.message || 'Error loading audit logs');
    }
  };

  // Open Edit Invoice Modal (Validates <= 3 days rule & loads items)
  const handleOpenEdit = async (inv: any) => {
    const ageInMs = Date.now() - new Date(inv.created_at).getTime();
    const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

    if (ageInDays > 3) {
      toast.warning('Invoice editing policy: Invoices can only be edited within 3 days of purchase.');
      return;
    }

    try {
      const full = await apiRequest(`/billing/invoices/${inv.id}`);
      setEditingInvoice(full);
      setEditForm({
        discountAmount: Number(full.discount_amount || 0),
        discountPercent: Number(full.discount_percent || 0),
        paymentMethod: full.payment_method || 'CASH',
        paymentStatus: full.payment_status || 'PAID',
        paidAmount: Number(full.paid_amount || 0),
        notes: full.notes || '',
        modificationReason: '',
        items: (full.items || []).map((it: any) => ({
          id: it.id,
          serviceId: it.service_id,
          itemName: it.item_name,
          category: it.category,
          unitPrice: Number(it.unit_price),
          quantity: it.quantity || 1,
          totalPrice: Number(it.total_price),
          is_queued: it.is_queued !== false, // true = pending in queue, false = final submission completed
        })),
      });
      setEditError(null);
      setEditModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load invoice items for editing');
    }
  };

  const handleUpdateItemCategory = (index: number, newCategory: string) => {
    setEditForm((prev) => {
      const updatedItems = [...prev.items];
      if (!updatedItems[index].is_queued) return prev;
      updatedItems[index] = { ...updatedItems[index], category: newCategory };
      return { ...prev, items: updatedItems };
    });
  };

  const handleUpdateItemService = (index: number, serviceId: string) => {
    setEditForm((prev) => {
      const updatedItems = [...prev.items];
      if (!updatedItems[index].is_queued) return prev;
      const matched = servicesList.find((s) => s.id === serviceId);
      if (matched) {
        const cat = matched.category || matched.category_rel?.code || updatedItems[index].category;
        const price = Number(matched.price);
        const qty = updatedItems[index].quantity || 1;
        updatedItems[index] = {
          ...updatedItems[index],
          serviceId: matched.id,
          itemName: matched.name,
          category: cat,
          unitPrice: price,
          totalPrice: price * qty,
        };
      }
      return { ...prev, items: updatedItems };
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditForm((prev) => {
      if (!prev.items[index].is_queued) {
        toast.warning('Cannot remove this service: Clinical final submission has already occurred.');
        return prev;
      }
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      };
    });
  };

  const handleAddNewItem = () => {
    const def = servicesList[0];
    setEditForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          serviceId: def?.id || '',
          itemName: def?.name || 'Doctor Consultation',
          category: def?.category || 'CONSULTATION',
          unitPrice: def ? Number(def.price) : 500,
          quantity: 1,
          totalPrice: def ? Number(def.price) : 500,
          is_queued: true,
        },
      ],
    }));
  };

  const editSubtotal = editForm.items.reduce(
    (sum, it) => sum + Number(it.unitPrice || 0) * (it.quantity || 1),
    0,
  );
  const editDiscount =
    editForm.discountPercent > 0
      ? (editSubtotal * editForm.discountPercent) / 100
      : editForm.discountAmount || 0;
  const editComputedTotal = Math.max(0, editSubtotal - editDiscount);
  const editEffectivePaid =
    editForm.paymentStatus === 'PAID'
      ? editComputedTotal
      : editForm.paymentStatus === 'DUE'
      ? 0
      : Math.min(editComputedTotal, Math.max(0, editForm.paidAmount || 0));
  const editComputedDue = Math.max(0, editComputedTotal - editEffectivePaid);

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
      const payload = {
        ...editForm,
        paidAmount: editEffectivePaid,
      };

      await apiRequest(`/billing/invoices/${editingInvoice.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setEditModalOpen(false);
      setEditingInvoice(null);
      toast.success(`Invoice #${editingInvoice.invoice_number} updated successfully`);
      loadInvoices();
    } catch (err: any) {
      setEditError(err.message || 'Failed to update invoice');
      toast.error(err.message || 'Failed to update invoice');
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
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${inv.payment_status === 'PAID'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-6 rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Edit Invoice & Service Categories (Within 3-Day Window)
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
              {/* Billed Service Items & Categories Management */}
              <div className="space-y-3 rounded-xl border border-border p-3.5 bg-muted/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Billed Services & Categories ({editForm.items.length})</span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Edit service categories for pending services. Prescriptions, eye exams, and tests after final submission cannot be edited.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Service Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {editForm.items.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
                      No services in this invoice. Click &quot;Add Service Item&quot; to add.
                    </div>
                  ) : (
                    editForm.items.map((it, idx) => {
                      const isFinalized = !it.is_queued; // Final clinical submission completed!
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border p-2.5 text-xs transition-all ${isFinalized
                              ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10'
                              : 'border-border bg-background'
                            }`}
                        >
                          <div className="flex items-center justify-between pb-1.5 border-b border-border/40 mb-2">
                            <div className="flex items-center gap-2">
                              {isFinalized ? (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                  <Lock className="h-3 w-3" />
                                  <span>Final Clinical Submission Completed (Cannot Edit)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                                  <Clock className="h-3 w-3" />
                                  <span>Pending Clinical Queue (Category &amp; Service Editable)</span>
                                </span>
                              )}
                            </div>
                            {!isFinalized && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-500 hover:text-red-700 p-0.5"
                                title="Cancel / Remove Item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-12 gap-2 items-center">
                            {/* Service / Item Name */}
                            <div className="col-span-12 sm:col-span-5">
                              <label className="text-[10px] font-medium text-muted-foreground block">
                                Service Name
                              </label>
                              {isFinalized ? (
                                <input
                                  type="text"
                                  disabled
                                  value={it.itemName}
                                  className="w-full rounded border border-input bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground font-medium cursor-not-allowed"
                                />
                              ) : (
                                <select
                                  value={it.serviceId || ''}
                                  onChange={(e) => handleUpdateItemService(idx, e.target.value)}
                                  className="w-full rounded border border-input bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                                >
                                  <option value="">-- Custom / Select Catalog Service --</option>
                                  {servicesList.map((srv) => (
                                    <option key={srv.id} value={srv.id}>
                                      {srv.name} (tk {Number(srv.price)})
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {/* Category of Service */}
                            <div className="col-span-6 sm:col-span-3">
                              <label className="text-[10px] font-medium text-muted-foreground block">
                                Category of Service
                              </label>
                              {isFinalized ? (
                                <input
                                  type="text"
                                  disabled
                                  value={it.category}
                                  className="w-full rounded border border-input bg-muted/60 px-2 py-1.5 text-xs text-muted-foreground font-semibold cursor-not-allowed"
                                />
                              ) : (
                                <select
                                  value={it.category}
                                  onChange={(e) => handleUpdateItemCategory(idx, e.target.value)}
                                  className="w-full rounded border border-blue-300 dark:border-blue-700 bg-card px-2 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                                >
                                  {categories.length > 0 ? (
                                    categories.map((c) => (
                                      <option key={c.id} value={c.code}>
                                        {c.name} ({c.code})
                                      </option>
                                    ))
                                  ) : (
                                    <>
                                      <option value="CONSULTATION">Prescription / Consultation</option>
                                      <option value="EYE">Eye Prescription</option>
                                      <option value="USG">Ultrasonography (USG)</option>
                                      <option value="LAB_TEST">Lab Test &amp; Pathology</option>
                                      <option value="RADIOLOGY">Radiology &amp; X-Ray</option>
                                      <option value="ECG">ECG &amp; Cardiology</option>
                                      <option value="PROCEDURE">Clinical Procedure</option>
                                    </>
                                  )}
                                </select>
                              )}
                            </div>

                            {/* Unit Price */}
                            <div className="col-span-3 sm:col-span-2">
                              <label className="text-[10px] font-medium text-muted-foreground block">
                                Price (tk)
                              </label>
                              <input
                                type="number"
                                disabled={isFinalized}
                                value={it.unitPrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setEditForm((prev) => {
                                    const updated = [...prev.items];
                                    updated[idx] = {
                                      ...updated[idx],
                                      unitPrice: val,
                                      totalPrice: val * (updated[idx].quantity || 1),
                                    };
                                    return { ...prev, items: updated };
                                  });
                                }}
                                className={`w-full rounded border px-2 py-1.5 text-xs font-mono outline-none ${isFinalized ? 'bg-muted/60 border-input text-muted-foreground cursor-not-allowed' : 'bg-card border-input text-foreground'
                                  }`}
                              />
                            </div>

                            {/* Quantity */}
                            <div className="col-span-3 sm:col-span-2">
                              <label className="text-[10px] font-medium text-muted-foreground block">
                                Qty
                              </label>
                              <input
                                type="number"
                                min="1"
                                disabled={isFinalized}
                                value={it.quantity}
                                onChange={(e) => {
                                  const qty = Math.max(1, parseInt(e.target.value) || 1);
                                  setEditForm((prev) => {
                                    const updated = [...prev.items];
                                    updated[idx] = {
                                      ...updated[idx],
                                      quantity: qty,
                                      totalPrice: updated[idx].unitPrice * qty,
                                    };
                                    return { ...prev, items: updated };
                                  });
                                }}
                                className={`w-full rounded border px-2 py-1.5 text-xs font-mono outline-none ${isFinalized ? 'bg-muted/60 border-input text-muted-foreground cursor-not-allowed' : 'bg-card border-input text-foreground'
                                  }`}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

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
                      setEditForm({
                        ...editForm,
                        paymentStatus: e.target.value,
                        paidAmount:
                          e.target.value === 'PAID'
                            ? editComputedTotal
                            : e.target.value === 'DUE'
                            ? 0
                            : editForm.paidAmount,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PARTIAL">PARTIAL</option>
                    <option value="DUE">DUE</option>
                  </select>
                </div>

                {editForm.paymentStatus === 'PARTIAL' && (
                  <div>
                    <label className="font-semibold text-foreground">Paid Amount (tk)</label>
                    <input
                      type="number"
                      min="0"
                      max={editComputedTotal}
                      step="0.01"
                      value={editForm.paidAmount}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          paidAmount: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Financial Calculation Summary Banner */}
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Subtotal: <strong className="text-foreground">৳{editSubtotal.toFixed(2)}</strong></span>
                  <span className="text-muted-foreground">Discount: <strong className="text-foreground">৳{editDiscount.toFixed(2)}</strong></span>
                  <span className="text-muted-foreground">Net Billed: <strong className="text-blue-600 dark:text-blue-400">৳{editComputedTotal.toFixed(2)}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Paid: <strong className="text-emerald-600 dark:text-emerald-400">৳{editEffectivePaid.toFixed(2)}</strong></span>
                  <span className="text-muted-foreground">Due: <strong className={editComputedDue > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}>৳{editComputedDue.toFixed(2)}</strong></span>
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
