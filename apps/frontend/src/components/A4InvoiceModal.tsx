'use client';

import React from 'react';
import { X, Printer, ShieldCheck } from 'lucide-react';

interface A4InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any | null;
}

export default function A4InvoiceModal({
  isOpen,
  onClose,
  invoice,
}: A4InvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">
              Standard A4 Clinical Invoice Preview
            </h3>
            <span className="rounded bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 font-mono">
              {invoice.invoice_number}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print A4 Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="bg-white text-slate-900 p-8 rounded-xl border border-border shadow-sm space-y-6">
          {/* Clinic Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-white font-bold text-xs">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <h1 className="text-lg font-bold text-slate-900">
                  {invoice.center?.name || 'Aegis Healthcare Center'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 max-w-sm">
                {invoice.center?.address || 'Medical District Center'} | Tel: {invoice.center?.phone || 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Official Bill of Supply & Payment Receipt
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 font-mono">
                {invoice.invoice_number}
              </span>
              <p className="text-xs text-slate-500">
                Date: {new Date(invoice.created_at).toLocaleDateString()}
              </p>
              <p className="text-xs font-semibold text-emerald-600 uppercase">
                Status: {invoice.payment_status}
              </p>
            </div>
          </div>

          {/* Patient Details Box */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 text-xs border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Patient Demographics
              </span>
              <p className="font-bold text-sm text-slate-900">
                {invoice.patient?.first_name} {invoice.patient?.last_name}
              </p>
              <p className="text-slate-600 mt-0.5">
                UHID: <span className="font-mono font-bold text-blue-600">{invoice.patient?.uhid}</span>
              </p>
              <p className="text-slate-600">
                Phone: {invoice.patient?.phone || 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Billing Context
              </span>
              <p className="text-slate-600">
                Payment Mode: <span className="font-bold text-slate-900">{invoice.payment_method}</span>
              </p>
              <p className="text-slate-600">
                Branch Code: <span className="font-mono">{invoice.center?.code}</span>
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-300 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2">Item / Service Description</th>
                <th className="py-2 text-center">Category</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items?.map((item: any, idx: number) => (
                <tr key={item.id || idx}>
                  <td className="py-2.5 font-medium text-slate-900">
                    <div>{item.item_name}</div>
                    {(item.discount_campaign || item.discount_campaign_id || (Number(item.discount_amount) > 0)) && (
                      <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                        <span>Campaign: {item.discount_campaign?.name || 'Privilege Discount'}</span>
                        <span>(-{Number(item.discount_amount || 0).toFixed(2)} tk)</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 text-center text-slate-500 text-[11px]">
                    {item.category}
                  </td>
                  <td className="py-2.5 text-center text-slate-700">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 text-right text-slate-700 font-mono">
                    {Number(item.unit_price).toFixed(2)} tk
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900 font-mono">
                    {Number(item.total_price).toFixed(2)} tk
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="flex justify-end pt-3 border-t-2 border-slate-300">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono font-medium">{Number(invoice.subtotal).toFixed(2)} tk</span>
              </div>
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-mono font-medium">-{Number(invoice.discount_amount).toFixed(2)} tk</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span className="font-mono font-medium">{Number(invoice.tax_amount || 0).toFixed(2)} tk</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
                <span>Total Amount:</span>
                <span className="font-mono">{Number(invoice.total_amount).toFixed(2)} tk</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Paid Amount:</span>
                <span className="font-mono font-semibold">{Number(invoice.paid_amount).toFixed(2)} tk</span>
              </div>
              {Number(invoice.balance_amount) > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono">{Number(invoice.balance_amount).toFixed(2)} tk</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Notes */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-400">
            <span>CareWave EMR v2.0 - Certified Electronic Billing Record</span>
            <span>Computer Generated Invoice - No physical signature required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
