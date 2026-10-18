'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';

export default function CentersPage() {
  const { hasPermission, switchCenter, activeCenter } = useAuth();
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<any | null>(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/centers');
      setCenters(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingCenter(null);
    setForm({
      code: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (center: any) => {
    setEditingCenter(center);
    setForm({
      code: center.code,
      name: center.name,
      address: center.address || '',
      phone: center.phone || '',
      email: center.email || '',
      status: center.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCenter) {
        await apiRequest(`/centers/${editingCenter.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
      } else {
        await apiRequest('/centers', {
          method: 'POST',
          body: JSON.stringify(form),
        });
      }
      setIsModalOpen(false);
      loadCenters();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to soft-delete center: ${name}?`))
      return;
    try {
      await apiRequest(`/centers/${id}`, { method: 'DELETE' });
      loadCenters();
    } catch (err: any) {
      alert(err.message || 'Failed to delete center');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Hospital Centers & Branch Registry
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure physical clinics and multi-tenant operational branches
          </p>
        </div>

        {hasPermission('center:manage') && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Register New Center</span>
          </button>
        )}
      </div>

      {/* Centers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-xs text-muted-foreground">
            Loading centers...
          </div>
        ) : (
          centers.map((c) => {
            const isActiveContext = activeCenter?.id === c.id;
            return (
              <div
                key={c.id}
                className={`rounded-2xl border bg-card p-6 shadow-sm space-y-4 transition-all ${
                  isActiveContext
                    ? 'border-blue-500 shadow-blue-500/10'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground">
                          {c.name}
                        </h3>
                        {isActiveContext && (
                          <span className="rounded bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white">
                            Current Context
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-blue-600 font-semibold">
                        Code: {c.code}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      c.status === 'ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {c.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground">{c.address}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground">{c.phone}</span>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-foreground">{c.email}</span>
                    </div>
                  )}
                </div>

                {/* Scoped Counts */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/30 p-2.5 text-center text-xs">
                  <div>
                    <span className="font-mono font-bold text-foreground block">
                      {c._count?.patients || 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Patients
                    </span>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-foreground block">
                      {c._count?.users || 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Staff Users
                    </span>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-foreground block">
                      {c._count?.invoices || 0}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Invoices
                    </span>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-border/80 text-xs">
                  <button
                    onClick={() => switchCenter(c)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {isActiveContext
                      ? '✓ Context Active'
                      : 'Switch View to This Center'}
                  </button>

                  {hasPermission('center:manage') && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                        title="Edit Center"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted"
                        title="Soft-delete Center"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground">
                {editingCenter ? 'Edit Center Details' : 'Register New Physical Center'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Center Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingCenter}
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="CTR-NORTH"
                    className="w-full rounded border border-input bg-background p-2 font-mono uppercase outline-none disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded border border-input bg-background p-2 outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Center Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Northside Medical & Specialist Clinic"
                  className="w-full rounded border border-input bg-background p-2 outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, District, City"
                  className="w-full rounded border border-input bg-background p-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded border border-input bg-background p-2 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="branch@aegis.health"
                    className="w-full rounded border border-input bg-background p-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded border border-border px-4 py-2 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 hover:bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm"
                >
                  {editingCenter ? 'Save Updates' : 'Register Center'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
