'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  ChevronDown,
  X,
  Check,
  Sparkles,
} from 'lucide-react';

interface CartItem {
  serviceId?: string;
  itemName: string;
  category: string;
  categoryId?: string;
  unitPrice: number;
  quantity: number;
  discountCampaignId?: string;
  discountCampaignName?: string;
  discountAmount?: number;
}

export default function PosBillingPage() {
  const { activeCenter } = useAuth();
  const [services, setServices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
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

  // Close patient dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        patientDropdownRef.current &&
        !patientDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPatientDropdownOpen(false);
        setPatientSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    loadServicesAndPatients();
  }, [activeCenter]);

  const loadServicesAndPatients = async () => {
    try {
      const [srvList, ptList, catList, campList] = await Promise.all([
        apiRequest('/billing/services?status=ACTIVE').catch(() => []),
        apiRequest('/patients').catch(() => []),
        apiRequest('/billing/categories?status=ACTIVE').catch(() => []),
        apiRequest('/billing/discount-campaigns?status=ACTIVE').catch(() => []),
      ]);
      setServices(srvList || []);
      setPatients(ptList || []);
      setCategories(catList || []);
      setCampaigns(campList || []);
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
          categoryId: service.category_id,
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

  const handleClearAll = () => {
    setCart([]);
    setSelectedPatientId('');
    setPatientSearch('');
    setIsPatientDropdownOpen(false);
    setDiscountPercent(0);
    setNotes('');
  };

  // Patient Demographics Helper
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const patientAge = calculateAge(selectedPatient?.dob);
  const patientGender = selectedPatient?.gender;

  // Evaluate dynamic discount campaigns per item
  const evaluatedCart = cart.map((item) => {
    let bestCampaign: any = null;
    let maxDiscount = 0;
    const lineTotal = item.unitPrice * item.quantity;
    const now = new Date();

    for (const camp of campaigns) {
      if (camp.status !== 'ACTIVE') continue;
      // Date validity
      if (camp.start_date && now < new Date(camp.start_date)) continue;
      if (camp.end_date && now > new Date(camp.end_date)) continue;

      // Age validity
      if (patientAge !== null && patientAge !== undefined) {
        if (camp.min_age !== null && patientAge < camp.min_age) continue;
        if (camp.max_age !== null && patientAge > camp.max_age) continue;
      } else if (camp.min_age !== null || camp.max_age !== null) {
        continue;
      }

      // Gender validity
      if (camp.gender && camp.gender !== 'ALL') {
        if (!patientGender || patientGender.toUpperCase() !== camp.gender.toUpperCase()) {
          continue;
        }
      }

      // Service validity
      if (camp.service_id && item.serviceId && camp.service_id !== item.serviceId) {
        continue;
      }

      // Category validity
      if (camp.category_id) {
        if (item.categoryId && camp.category_id !== item.categoryId) {
          continue;
        }
        if (!item.categoryId && camp.category?.code) {
          if (item.category?.toUpperCase() !== camp.category.code.toUpperCase()) {
            continue;
          }
        }
      }

      // Calculate discount amount
      let discount = 0;
      if (camp.discount_type === 'PERCENTAGE') {
        discount = (lineTotal * Number(camp.discount_value)) / 100;
      } else {
        discount = Math.min(lineTotal, Number(camp.discount_value));
      }

      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestCampaign = camp;
      }
    }

    return {
      ...item,
      discountCampaignId: bestCampaign ? bestCampaign.id : undefined,
      discountCampaignName: bestCampaign ? bestCampaign.name : undefined,
      discountAmount: maxDiscount,
      finalLineTotal: Math.max(0, lineTotal - maxDiscount),
    };
  });

  const rawSubtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  const campaignDiscountTotal = evaluatedCart.reduce(
    (sum, item) => sum + (item.discountAmount || 0),
    0,
  );
  const extraDiscountAmount = ((rawSubtotal - campaignDiscountTotal) * (discountPercent || 0)) / 100;
  const totalDiscount = campaignDiscountTotal + extraDiscountAmount;
  const totalAmount = Math.max(0, rawSubtotal - totalDiscount);

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
          items: evaluatedCart.map((it) => ({
            serviceId: it.serviceId,
            itemName: it.itemName,
            category: it.category,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            discountCampaignId: it.discountCampaignId,
            discountAmount: it.discountAmount,
          })),
          discountPercent,
          discountAmount: extraDiscountAmount,
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

      // Reset Cart & Patient
      setCart([]);
      setSelectedPatientId('');
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

  const filteredServices = services.filter((s) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      s.category?.toUpperCase() === selectedCategory.toUpperCase() ||
      s.category_id === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchService.toLowerCase()) ||
      s.code.toLowerCase().includes(searchService.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredPatients = patients.filter((p) => {
    if (!patientSearch.trim()) return true;
    const q = patientSearch.toLowerCase();
    const uhid = (p.uhid || '').toLowerCase();
    const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    const phone = (p.phone || '').toLowerCase();
    return uhid.includes(q) || name.includes(q) || phone.includes(q);
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

      {/* POS Grid: Active POS Cart on Left, Services Catalog on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Active POS Cart & Checkout (5 Cols) */}
        <div className="lg:col-span-5 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-foreground">
                Active POS Cart
              </h3>
            </div>
            {(cart.length > 0 || selectedPatientId || patientSearch) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 text-[11px] text-destructive hover:underline font-medium transition-colors"
                title="Clear patient search and cart"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Patient Selector (Searchable Combobox) */}
          <div className="space-y-1 relative" ref={patientDropdownRef}>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span>Select Center Patient *</span>
              </label>
              {selectedPatient && (
                <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 font-semibold">
                  {selectedPatient.uhid}
                </span>
              )}
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={
                  isPatientDropdownOpen
                    ? patientSearch
                    : selectedPatient
                      ? `${selectedPatient.uhid} - ${selectedPatient.first_name} ${selectedPatient.last_name} (${selectedPatient.phone})`
                      : ''
                }
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  if (!isPatientDropdownOpen) setIsPatientDropdownOpen(true);
                }}
                onFocus={() => {
                  setIsPatientDropdownOpen(true);
                }}
                placeholder={
                  selectedPatient
                    ? `${selectedPatient.uhid} - ${selectedPatient.first_name} ${selectedPatient.last_name}`
                    : 'Search patient by UHID, name, or phone...'
                }
                className="w-full rounded-lg border border-input bg-background pl-8 pr-16 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none text-foreground placeholder:text-muted-foreground"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1">
                {(selectedPatientId || patientSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatientId('');
                      setPatientSearch('');
                      setIsPatientDropdownOpen(true);
                    }}
                    className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                    title="Clear selection"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                  className="p-0.5 text-muted-foreground hover:text-foreground rounded"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isPatientDropdownOpen ? 'rotate-180' : ''
                      }`}
                  />
                </button>
              </div>
            </div>

            {/* Dropdown Menu */}
            {isPatientDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-xl z-50 py-1 divide-y divide-border/40">
                {filteredPatients.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No patient found matching &ldquo;{patientSearch}&rdquo;
                  </div>
                ) : (
                  filteredPatients.map((p) => {
                    const isSelected = p.id === selectedPatientId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setPatientSearch('');
                          setIsPatientDropdownOpen(false);
                        }}
                        className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${isSelected
                          ? 'bg-blue-600/10 text-blue-600 dark:text-blue-400 font-semibold'
                          : 'hover:bg-muted text-foreground'
                          }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                              {p.uhid}
                            </span>
                            <span className="font-medium text-foreground truncate">
                              {p.first_name} {p.last_name}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            Phone: {p.phone || 'N/A'} {p.gender ? `• ${p.gender}` : ''}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Selected Patient Demographics & Discount Eligibility Alert */}
            {selectedPatient && (
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <span className="rounded bg-muted px-2 py-0.5 font-medium">
                  Gender: <strong className="text-foreground">{selectedPatient.gender || 'N/A'}</strong>
                </span>
                <span className="rounded bg-muted px-2 py-0.5 font-medium">
                  Age:{' '}
                  <strong className="text-foreground">
                    {patientAge !== null ? `${patientAge} yrs` : 'N/A'}
                  </strong>
                </span>
                {campaigns.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full">
                    <Sparkles className="h-3 w-3" />
                    <span>{campaigns.length} Campaign{campaigns.length > 1 ? 's' : ''} Active</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="space-y-2 min-h-[220px] max-h-[300px] overflow-y-auto pr-1 divide-y divide-border/60">
            {evaluatedCart.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
                <Receipt className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
                <p className="font-semibold text-foreground">Cart is Empty</p>
                <p className="text-[11px]">
                  Click items from the catalog on the right to add to bill.
                </p>
              </div>
            ) : (
              evaluatedCart.map((item, idx) => (
                <div key={idx} className="pt-2 flex items-center justify-between text-xs">
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-foreground truncate">
                        {item.itemName}
                      </p>
                      {item.discountCampaignName && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] font-bold border border-amber-500/20">
                          <Sparkles className="h-2.5 w-2.5" />
                          {item.discountCampaignName} (-{item.discountAmount?.toFixed(2)} tk)
                        </span>
                      )}
                    </div>
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

                    <div className="w-20 text-right">
                      {item.discountAmount && item.discountAmount > 0 ? (
                        <div>
                          <span className="line-through text-muted-foreground text-[10px] block">
                            {(item.unitPrice * item.quantity).toFixed(2)} tk
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {(item.unitPrice * item.quantity - item.discountAmount).toFixed(2)} tk
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-foreground">
                          {(item.unitPrice * item.quantity).toFixed(2)} tk
                        </span>
                      )}
                    </div>

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
                  <span>Manual Discount Override:</span>
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
                  <span>Gross Subtotal:</span>
                  <span className="font-mono font-medium">{rawSubtotal.toFixed(2)} tk</span>
                </div>
                {campaignDiscountTotal > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>Campaign Savings:</span>
                    </span>
                    <span className="font-mono">-{campaignDiscountTotal.toFixed(2)} tk</span>
                  </div>
                )}
                {extraDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Manual Discount ({discountPercent}%):</span>
                    <span className="font-mono">-{extraDiscountAmount.toFixed(2)} tk</span>
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

        {/* Right Side: Services Catalog (7 Cols) */}
        <div className="lg:col-span-7 rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
          {/* Search & Dynamic Category Filter */}
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
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-colors ${selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                All Categories
              </button>
              {categories.map((cat: any) => {
                const catCode = typeof cat === 'string' ? cat : cat.code;
                const catName = typeof cat === 'string' ? cat : cat.name;
                const catId = typeof cat === 'string' ? cat : cat.id;
                return (
                  <button
                    key={catId}
                    onClick={() => setSelectedCategory(catCode)}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold whitespace-nowrap transition-colors ${selectedCategory.toUpperCase() === catCode.toUpperCase()
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    {catName}
                  </button>
                );
              })}
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
