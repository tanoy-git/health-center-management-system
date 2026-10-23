'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  Pill,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ArrowUpDown,
  X,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

interface Medicine {
  id: string;
  code: string;
  name: string;
  generic_name?: string;
  form: string;
  strength: string;
  price: number | string;
  stock_quantity: number;
  reorder_level: number;
  status: string;
  created_at: string;
}

const MEDICINE_FORMS = [
  'TABLET',
  'CAPSULE',
  'SYRUP',
  'INJECTION',
  'OINTMENT',
  'DROPS',
  'SUSPENSION',
  'INHALER',
];

export default function MedicinesPage() {
  const { activeCenter, hasPermission } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formFilter, setFormFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    genericName: '',
    form: 'TABLET',
    strength: '',
    price: 0,
    stockQuantity: 100,
    reorderLevel: 20,
    status: 'ACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeCenter) {
      loadMedicines();
    }
  }, [activeCenter, statusFilter]);

  const loadMedicines = async () => {
    setLoading(true);
    try {
      const query = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '?status=ALL';
      const data = await apiRequest(`/clinical/medicines${query}`);
      setMedicines(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      code: `MED-${Math.floor(1000 + Math.random() * 9000)}`,
      name: '',
      genericName: '',
      form: 'TABLET',
      strength: '500mg',
      price: 10,
      stockQuantity: 100,
      reorderLevel: 20,
      status: 'ACTIVE',
    });
    setErrorMsg(null);
    setCreateModalOpen(true);
  };

  const openEditModal = (med: Medicine) => {
    setSelectedMedicine(med);
    setFormData({
      code: med.code,
      name: med.name,
      genericName: med.generic_name || '',
      form: med.form,
      strength: med.strength,
      price: Number(med.price),
      stockQuantity: med.stock_quantity,
      reorderLevel: med.reorder_level,
      status: med.status,
    });
    setErrorMsg(null);
    setEditModalOpen(true);
  };

  const openDeleteModal = (med: Medicine) => {
    setSelectedMedicine(med);
    setDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await apiRequest('/clinical/medicines', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setCreateModalOpen(false);
      toast.success('Medicine registered successfully');
      loadMedicines();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register medicine');
      toast.error(err.message || 'Failed to register medicine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedicine) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await apiRequest(`/clinical/medicines/${selectedMedicine.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      setEditModalOpen(false);
      toast.success('Medicine updated successfully');
      loadMedicines();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update medicine');
      toast.error(err.message || 'Failed to update medicine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!selectedMedicine) return;
    setSubmitting(true);
    try {
      await apiRequest(`/clinical/medicines/${selectedMedicine.id}`, {
        method: 'DELETE',
      });
      setDeleteModalOpen(false);
      toast.success('Medicine deleted successfully');
      loadMedicines();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete medicine');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered List
  const filteredMedicines = medicines.filter((m) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(q) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(q)) ||
      m.code.toLowerCase().includes(q);

    const matchesForm = formFilter === 'ALL' || m.form === formFilter;
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchesSearch && matchesForm && matchesStatus;
  });

  const lowStockCount = medicines.filter((m) => m.stock_quantity <= m.reorder_level).length;
  const activeCount = medicines.filter((m) => m.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Pill className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Medicine & Formulary Management</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage pharmacy inventory, formulations, dosages, and stock levels for{' '}
            <span className="font-semibold text-foreground">{activeCenter?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadMedicines}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-colors"
            title="Refresh Medicine List"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {hasPermission('clinical:medicines:manage') && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all shadow-blue-500/20"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Medicine</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Registered</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{medicines.length}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Active Formulations</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Low Stock Warning</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{lowStockCount}</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by medicine name, generic name, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Form Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Form:</span>
            <select
              value={formFilter}
              onChange={(e) => setFormFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground font-medium outline-none"
            >
              <option value="ALL">All Forms</option>
              {MEDICINE_FORMS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground font-medium outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Formulary Catalog ({filteredMedicines.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            Stock quantities automatically sync with clinical prescription dispensing
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading medicine formulary catalog...
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
            <Pill className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
            <p className="font-semibold text-foreground">No Medicines Found</p>
            <p className="text-[11px]">
              {searchTerm || formFilter !== 'ALL'
                ? 'Try adjusting your search query or form filter.'
                : 'Get started by adding your first medicine formulary.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Brand / Medicine Name</th>
                  <th className="py-2.5 px-4">Generic Composition</th>
                  <th className="py-2.5 px-4">Form & Strength</th>
                  <th className="py-2.5 px-4">Unit Price</th>
                  <th className="py-2.5 px-4">Stock In-Hand</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMedicines.map((med) => {
                  const isLowStock = med.stock_quantity <= med.reorder_level;
                  return (
                    <tr key={med.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {med.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {med.name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground italic">
                        {med.generic_name || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground border border-border">
                          {med.form} · {med.strength}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        tk {Number(med.price).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold ${
                              isLowStock
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {med.stock_quantity}
                          </span>
                          {isLowStock && (
                            <span className="rounded bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:text-amber-300">
                              Low (Min {med.reorder_level})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            med.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {med.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasPermission('clinical:medicines:manage') && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(med)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors shadow-sm"
                                title="Edit Medicine"
                              >
                                <Edit2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => openDeleteModal(med)}
                                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 text-[11px] font-medium text-red-600 dark:text-red-400 transition-colors shadow-sm"
                                title="Deactivate or Delete Medicine"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
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

      {/* CREATE MEDICINE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <Pill className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Register New Medicine</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Add formulation to pharmacy inventory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
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

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Item Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Brand / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Napa Extra, Ciprocin"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Generic Name</label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol + Caffeine"
                  value={formData.genericName}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Form *</label>
                  <select
                    value={formData.form}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none font-medium"
                  >
                    {MEDICINE_FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Strength *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg, 10ml, 0.5%"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Price (tk) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Initial Stock *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Reorder Level *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEDICINE MODAL */}
      {editModalOpen && selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Edit Medicine Details</h3>
                  <p className="text-[11px] text-muted-foreground font-mono">{formData.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
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

            <form onSubmit={handleEditSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Brand / Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Generic Name</label>
                <input
                  type="text"
                  value={formData.genericName}
                  onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Form *</label>
                  <select
                    value={formData.form}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none font-medium"
                  >
                    {MEDICINE_FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Strength *</label>
                  <input
                    type="text"
                    required
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Price (tk) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Stock *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Reorder Level *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none font-medium"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE / DEACTIVATE CONFIRMATION MODAL */}
      {deleteModalOpen && selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Deactivate Medicine</h3>
                <p className="text-xs text-muted-foreground">
                  Are you sure you want to deactivate <span className="font-semibold text-foreground">{selectedMedicine.name}</span> ({selectedMedicine.code})?
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border">
              Deactivated medicines will no longer appear in the doctor's prescription search or billing catalog. Existing prescriptions will preserve their historical audit trail.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={submitting}
                className="rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
              >
                {submitting ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
