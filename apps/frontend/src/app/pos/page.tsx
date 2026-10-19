'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import ThermalReceiptModal from '@/components/ThermalReceiptModal';
import A4InvoiceModal from '@/components/A4InvoiceModal';
import {
  CreditCard,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  Printer,
  FileText,
  User,
  Tag,
  Receipt,
  RotateCcw,
} from 'lucide-react';

interface CartItem {
  serviceId?: string;
  itemName: string;
  category: string;
  unitPrice: number;
  quantity: number;
}

export default function PosBillingPage() {
  const { activeCenter } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchService, setSearchService] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Modals for receipts
  const [thermalModalOpen, setThermalModalOpen] = useState(false);
  const [thermalData, setThermalData] = useState<any | null>(null);
  const [a4ModalOpen, setA4ModalOpen] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);

  useEffect(() => {
    loadServicesAndPatients();
  }, [activeCenter]);

  const loadServicesAndPatients = async () => {
    try {
      const srvList = await apiRequest('/billing/services');
      setServices(srvList || []);

      const ptList = await apiRequest('/patients');
      setPatients(ptList || []);
      if (ptList && ptList.length > 0) {
        setSelectedPatientId(ptList[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToCart = (service: any) => {
    const existingIndex = cart.findIndex((item) => item.serviceId === service.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          serviceId: service.id,
          itemName: service.name,
          category: service.category,
          unitPrice: Number(service.price),
          quantity: 1,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const discountAmount = (subtotal * (discountPercent || 0)) / 100;
  const totalAmount = Math.max(0, subtotal - discountAmount);

  const handleCheckout = async () => {
    if (!selectedPatientId) {
      alert('Please select a registered patient');
      return;
    }
    if (cart.length === 0) {
      alert('Cart is empty. Please add billable services.');
      return;
    }

    setSubmitting(true);
    try {
      const invoice = await apiRequest('/billing/invoices', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientId,
          items: cart,
          discountPercent,
          discountAmount,
          paymentMethod,
          paidAmount: totalAmount,
          notes,
        }),
      });

      setCreatedInvoice(invoice);

      // Fetch thermal receipt text
      const receiptRes = await apiRequest(
        `/billing/invoices/${invoice.id}/receipt`,
      );
      setThermalData(receiptRes);

      // Reset Cart
      setCart([]);
      setDiscountPercent(0);
      setNotes('');

      // Open A4 invoice modal by default
      setA4ModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Invoice checkout failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Categories list
  const categories = ['ALL', 'CONSULTATION', 'LAB_TEST', 'USG', 'RADIOLOGY', 'PROCEDURE'];

  const filteredServices = services.filter((s) => {
    const matchesCategory =
      selectedCategory === 'ALL' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchService.toLowerCase()) ||
      s.code.toLowerCase().includes(searchService.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Billing Point of Sale (POS)
            </h1>
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              Counter Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time cashier counter scoped to{' '}
            <span className="font-semibold text-foreground">
              {activeCenter?.name}
            </span>
          </p>
        </div>
      </div>

      {/* POS Grid: Catalog on Left, Checkout Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Services Catalog (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchService}
                onChange={(e) => setSearchService(e.target.value)}
                placeholder="Search services (e.g. Consultation, CBC, USG)..."
                className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredServices.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-xs text-muted-foreground">
                No billable services found in this category.
              </div>
            ) : (
              filteredServices.map((srv) => (
                <div
                  key={srv.id}
                  onClick={() => handleAddToCart(srv)}
                  className="group flex flex-col justify-between rounded-xl border border-border p-3.5 hover:border-blue-500/60 hover:bg-blue-500/5 cursor-pointer transition-all shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {srv.code}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">
                        {srv.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                      {srv.name}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/60">
                    <span className="text-sm font-bold font-mono text-foreground">
                      {Number(srv.price).toFixed(2)} tk
                    </span>
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 group-hover:bg-blue-700 text-white shadow-sm transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Cart & Checkout (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-foreground">
                Active POS Cart
              </h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                className="flex items-center gap-1 text-[11px] text-destructive hover:underline font-medium"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Patient Selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              <span>Select Center Patient *</span>
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.uhid} - {p.first_name} {p.last_name} ({p.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Cart Items List */}
          <div className="space-y-2 min-h-[220px] max-h-[300px] overflow-y-auto pr-1 divide-y divide-border/60">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
                <p className="font-semibold text-foreground">Cart is Empty</p>
                <p className="text-[11px]">
                  Click items from the catalog on the left to add to bill.
                </p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="pt-2 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-semibold text-foreground truncate">
                      {item.itemName}
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {item.unitPrice.toFixed(2)} tk each
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-border bg-background">
                      <button
                        onClick={() => updateQuantity(idx, -1)}
                        className="p-1 hover:bg-muted text-muted-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="px-2 text-xs font-semibold text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(idx, 1)}
                        className="p-1 hover:bg-muted text-muted-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="font-mono font-bold text-foreground w-16 text-right">
                      {(item.unitPrice * item.quantity).toFixed(2)} tk
                    </span>

                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Discount & Payment Controls */}
          {cart.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-border">
              {/* Discount Input */}
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-muted-foreground font-medium">
                  <Tag className="h-3.5 w-3.5 text-blue-500" />
                  <span>Discount Override:</span>
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) =>
                      setDiscountPercent(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0"
                    className="w-16 rounded border border-input bg-background p-1 text-right text-xs font-mono outline-none"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {['CASH', 'CARD', 'MOBILE', 'INSURANCE'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`rounded-lg py-1.5 text-[10px] font-bold transition-all ${paymentMethod === m
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                        }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="rounded-xl bg-muted/40 p-3.5 space-y-1 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span className="font-mono font-medium">{subtotal.toFixed(2)} tk</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({discountPercent}%):</span>
                    <span className="font-mono">-{discountAmount.toFixed(2)} tk</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/80 pt-1 text-base font-bold text-foreground">
                  <span>Total Due:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {totalAmount.toFixed(2)} tk
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                disabled={submitting}
                onClick={handleCheckout}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                <span>
                  {submitting
                    ? 'Processing Invoice...'
                    : `Complete Checkout (${totalAmount.toFixed(2)} tk)`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Receipts Preview Modals */}
      <ThermalReceiptModal
        isOpen={thermalModalOpen}
        onClose={() => setThermalModalOpen(false)}
        receiptData={thermalData}
      />

      <A4InvoiceModal
        isOpen={a4ModalOpen}
        onClose={() => setA4ModalOpen(false)}
        invoice={createdInvoice}
      />
    </div>
  );
}
