'use client';

import React from 'react';
import { X, Printer } from 'lucide-react';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    invoice: any;
    thermalReceiptText: string;
  } | null;
}

export default function ThermalReceiptModal({
  isOpen,
  onClose,
  receiptData,
}: ThermalReceiptModalProps) {
  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Thermal Receipt - ${receiptData.invoice.invoice_number}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 12px;
                padding: 10px;
                margin: 0;
                width: 76mm;
                white-space: pre-wrap;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>${receiptData.thermalReceiptText}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto my-auto rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-foreground">
              80mm Thermal Receipt Preview
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Realistic 80mm Receipt Paper Styling */}
        <div className="thermal-paper rounded-lg p-4 border border-amber-200/50 text-[11px] font-mono leading-relaxed max-h-[60vh] overflow-y-auto shadow-inner">
          <pre className="whitespace-pre-wrap font-mono">
            {receiptData.thermalReceiptText}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium hover:bg-muted"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-500/25 transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Print 80mm Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
