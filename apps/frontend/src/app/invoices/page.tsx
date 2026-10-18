'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
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
} from 'lucide-react';

export default function InvoicesPage() {
  const { activeCenter } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [a4ModalOpen, setA4ModalOpen] = useState(false);
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [thermalData, setThermalData] = useState<any | null>(null);
  const [auditLogsModalOpen, setAuditLogsModalOpen] = useState(false);
  const [selectedAuditLogs, setSelectedAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    loadInvoices();
  }, [activeCenter, search]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(
        `/billing/invoices?search=${encodeURIComponent(search)}`,
      );
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
            </span>
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by Invoice Number or Patient..."
          className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none shadow-sm"
        />
      </div>

      {/* Invoices List */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Invoices Issued ({invoices.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            Strict audit logs recorded on all modifications
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
            <p className="font-semibold text-foreground">No Invoices Found</p>
            <p className="text-[11px]">Invoices generated at the POS will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Patient Demographics</th>
                  <th className="py-2.5 px-4">Items</th>
                  <th className="py-2.5 px-4">Total Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
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
                    <td className="py-3 px-4 text-muted-foreground">
                      {inv.items?.length || 0} service(s)
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      ${Number(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
