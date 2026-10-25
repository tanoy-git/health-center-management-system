'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Percent,
  Plus,
  Search,
  Filter,
  Trash2,
  Pencil,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Layers,
  Tag,
  Info,
  ShieldCheck,
  Check,
  X,
  Coins,
  ArrowRight,
} from 'lucide-react';

interface CommissionRule {
  id: string;
  center_id: string;
  employee_id: string | null;
  service_id: string | null;
  category_id: string | null;
  commission_type: 'PERCENTAGE' | 'FIXED';
  commission_value: string | number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  employee?: {
    id: string;
    employee_code: string;
    designation: string;
    user?: {
      first_name: string;
      last_name: string;
    };
  } | null;
  service?: {
    id: string;
    name: string;
    code: string;
    price: string | number;
  } | null;
  category?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export default function CommissionsPage() {
  const { activeCenter } = useAuth();

  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'SERVICE' | 'CATEGORY' | 'GLOBAL'>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL');

  // Modals & form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    employeeId: '',
    scopeType: 'ALL' as 'ALL' | 'CATEGORY' | 'SERVICE',
    serviceId: '',
    categoryId: '',
    commissionType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    commissionValue: '10',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });

  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, [activeCenter?.id]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [rulesData, empData, svcData, catData] = await Promise.all([
        apiRequest('/billing/commissions/rules').catch(() => []),
        apiRequest('/hr/employees').catch(() => []),
        apiRequest('/billing/services').catch(() => []),
        apiRequest('/billing/categories').catch(() => []),
      ]);

      setRules(Array.isArray(rulesData) ? rulesData : []);
      setEmployees(Array.isArray(empData) ? empData : []);
      setServices(Array.isArray(svcData) ? svcData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err: any) {
      console.error('Failed to load commission data:', err);
      setErrorMessage(err.message || 'Failed to load commission rules.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openCreateModal = () => {
    setEditingRule(null);
    setFormData({
      employeeId: '',
      scopeType: 'ALL',
      serviceId: '',
      categoryId: '',
      commissionType: 'PERCENTAGE',
      commissionValue: '10',
      status: 'ACTIVE',
    });
    setModalOpen(true);
  };

  const openEditModal = (rule: CommissionRule) => {
    setEditingRule(rule);
    let scope: 'ALL' | 'CATEGORY' | 'SERVICE' = 'ALL';
    if (rule.service_id) scope = 'SERVICE';
    else if (rule.category_id) scope = 'CATEGORY';

    setFormData({
      employeeId: rule.employee_id || '',
      scopeType: scope,
      serviceId: rule.service_id || '',
      categoryId: rule.category_id || '',
      commissionType: rule.commission_type || 'PERCENTAGE',
      commissionValue: String(rule.commission_value || '0'),
      status: rule.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.commissionValue || Number(formData.commissionValue) < 0) {
      setErrorMessage('Please enter a valid non-negative commission rate or amount.');
      return;
    }

    if (formData.scopeType === 'SERVICE' && !formData.serviceId) {
      setErrorMessage('Please select a specific hospital service.');
      return;
    }

    if (formData.scopeType === 'CATEGORY' && !formData.categoryId) {
      setErrorMessage('Please select a service category.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const payload = {
      employeeId: formData.employeeId || null,
      serviceId: formData.scopeType === 'SERVICE' ? formData.serviceId : null,
      categoryId: formData.scopeType === 'CATEGORY' ? formData.categoryId : null,
      commissionType: formData.commissionType,
      commissionValue: Number(formData.commissionValue),
      status: formData.status,
    };

    try {
      if (editingRule) {
        await apiRequest(`/billing/commissions/rules/${editingRule.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Commission rule updated successfully.');
      } else {
        await apiRequest('/billing/commissions/rules', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Commission rule created successfully.');
      }
      setModalOpen(false);
      loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRuleId) return;
    try {
      await apiRequest(`/billing/commissions/rules/${deletingRuleId}`, {
        method: 'DELETE',
      });
      showToast('Commission rule deleted successfully.');
      setDeleteModalOpen(false);
      setDeletingRuleId(null);
      loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete rule.');
    }
  };

  const handleToggleStatus = async (rule: CommissionRule) => {
    try {
      const nextStatus = rule.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await apiRequest(`/billing/commissions/rules/${rule.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast(`Rule marked as ${nextStatus}.`);
      loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update rule status.');
    }
  };

  // Filtered Rules
  const filteredRules = rules.filter((r) => {
    // Status Filter
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

    // Scope Filter
    if (scopeFilter === 'SERVICE' && !r.service_id) return false;
    if (scopeFilter === 'CATEGORY' && (!r.category_id || r.service_id)) return false;
    if (scopeFilter === 'GLOBAL' && (r.service_id || r.category_id)) return false;

    // Employee Filter
    if (employeeFilter !== 'ALL') {
      if (employeeFilter === 'GLOBAL' && r.employee_id !== null) return false;
      if (employeeFilter !== 'GLOBAL' && r.employee_id !== employeeFilter) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const empName = `${r.employee?.user?.first_name || ''} ${r.employee?.user?.last_name || ''}`.toLowerCase();
      const empCode = (r.employee?.employee_code || '').toLowerCase();
      const svcName = (r.service?.name || '').toLowerCase();
      const svcCode = (r.service?.code || '').toLowerCase();
      const catName = (r.category?.name || '').toLowerCase();

      const matches =
        empName.includes(query) ||
        empCode.includes(query) ||
        svcName.includes(query) ||
        svcCode.includes(query) ||
        catName.includes(query);

      if (!matches) return false;
    }

    return true;
  });

  const activeRulesCount = rules.filter((r) => r.status === 'ACTIVE').length;
  const serviceSpecificCount = rules.filter((r) => r.service_id).length;
  const categorySpecificCount = rules.filter((r) => r.category_id && !r.service_id).length;
  const globalCount = rules.filter((r) => !r.service_id && !r.category_id).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-white shadow-xl shadow-emerald-600/20 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4 text-rose-800 dark:text-rose-300 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="text-sm font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            <Coins className="h-4 w-4" />
            <span>Billing & Financial Settings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
            Referral Commission Rules & Rates
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Configure service-wise and category-wise reference commissions rewarded to hospital staff when referred patients register and receive services.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all shadow-blue-500/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Commission Rule</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Rules</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{rules.length}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            <span className="text-emerald-600 font-semibold">{activeRulesCount} active</span> rules configured
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Service-Specific</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Tag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{serviceSpecificCount}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Highest priority matches</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Category-Scoped</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{categorySpecificCount}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Applies across entire department/category</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Global Fallbacks</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{globalCount}</div>
          <p className="mt-1 text-[11px] text-muted-foreground">Default hospital catalog rules</p>
        </div>
      </div>

      {/* Priority Engine Info Alert */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 text-xs text-blue-900 dark:text-blue-300">
        <div className="flex items-start gap-2.5">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              Automatic Commission Evaluation Priority Hierarchy:
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <span className="rounded bg-card border border-border px-2 py-0.5 font-medium text-foreground">
                1. Staff Member + Specific Service
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="rounded bg-card border border-border px-2 py-0.5 font-medium text-foreground">
                2. Specific Service (Any Staff)
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="rounded bg-card border border-border px-2 py-0.5 font-medium text-foreground">
                3. Staff Member + Category
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="rounded bg-card border border-border px-2 py-0.5 font-medium text-foreground">
                4. Service Category (Any Staff)
              </span>
              <ArrowRight className="h-3 w-3" />
              <span className="rounded bg-card border border-border px-2 py-0.5 font-medium text-foreground">
                5. Global Staff/Catalog Default
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search staff, service, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Scope Filter */}
          <div>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as any)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Rule Scopes</option>
              <option value="SERVICE">Service Specific</option>
              <option value="CATEGORY">Category Scoped</option>
              <option value="GLOBAL">Global Catalog Rule</option>
            </select>
          </div>

          {/* Referring Employee Filter */}
          <div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Beneficiary Staff</option>
              <option value="GLOBAL">Global (Any Employee)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.user?.first_name} {emp.user?.last_name} ({emp.employee_code})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Beneficiary Staff</th>
                <th className="py-3 px-4">Applies To (Scope)</th>
                <th className="py-3 px-4">Commission Rate</th>
                <th className="py-3 px-4">Priority Hierarchy</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                    <p>Loading referral commission rules...</p>
                  </td>
                </tr>
              ) : filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Coins className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="font-medium text-foreground">No commission rules found</p>
                    <p className="text-[11px] mt-1">
                      Create a commission rule to begin tracking referral incentives automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRules.map((rule) => {
                  const isStaffSpecific = !!rule.employee_id;
                  const isServiceSpecific = !!rule.service_id;
                  const isCategorySpecific = !!rule.category_id && !rule.service_id;
                  const isGlobalScope = !rule.service_id && !rule.category_id;

                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      {/* Beneficiary Staff */}
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {rule.employee ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-[10px] shrink-0">
                              {rule.employee.user?.first_name?.[0] || 'E'}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">
                                {rule.employee.user?.first_name} {rule.employee.user?.last_name}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {rule.employee.employee_code} • {rule.employee.designation}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            <Users className="h-3 w-3 text-slate-500" />
                            <span>All Staff (Global)</span>
                          </div>
                        )}
                      </td>

                      {/* Applies To */}
                      <td className="py-3.5 px-4">
                        {isServiceSpecific ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-foreground">
                              <Tag className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span>{rule.service?.name}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Code: {rule.service?.code} • Service Fee: ৳{Number(rule.service?.price || 0).toFixed(2)}
                            </div>
                          </div>
                        ) : isCategorySpecific ? (
                          <div className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span className="font-semibold text-foreground">
                              Category: {rule.category?.name}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>All Hospital Services</span>
                          </div>
                        )}
                      </td>

                      {/* Commission Rate */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {rule.commission_type === 'PERCENTAGE' ? (
                            <>
                              <Percent className="h-3.5 w-3.5" />
                              <span>{Number(rule.commission_value).toFixed(2)}%</span>
                            </>
                          ) : (
                            <>
                              <span>৳ {Number(rule.commission_value).toFixed(2)} Flat</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        {isStaffSpecific && isServiceSpecific && (
                          <span className="rounded-md bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 text-[10px] font-bold">
                            P1: Staff + Service
                          </span>
                        )}
                        {!isStaffSpecific && isServiceSpecific && (
                          <span className="rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                            P2: Specific Service
                          </span>
                        )}
                        {isStaffSpecific && isCategorySpecific && (
                          <span className="rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                            P3: Staff + Category
                          </span>
                        )}
                        {!isStaffSpecific && isCategorySpecific && (
                          <span className="rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                            P4: Service Category
                          </span>
                        )}
                        {isGlobalScope && (
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 text-[10px] font-semibold">
                            P5: Global Fallback
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(rule)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                            rule.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'
                          }`}
                          title="Click to toggle status"
                        >
                          {rule.status === 'ACTIVE' ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(rule)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                            title="Edit Rule"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingRuleId(rule.id);
                              setDeleteModalOpen(true);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Delete Rule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {editingRule ? 'Edit Commission Rule' : 'New Referral Commission Rule'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure referral rate and target services or staff.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Beneficiary Staff */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Beneficiary Staff Member
                </label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All Employees (Global Hospital Default)</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user?.first_name} {emp.user?.last_name} ({emp.employee_code} - {emp.designation})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Leave as &apos;All Employees&apos; to create a center-wide standard rule.
                </p>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Commission Service Scope
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scopeType: 'ALL' })}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      formData.scopeType === 'ALL'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    All Services
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scopeType: 'CATEGORY' })}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      formData.scopeType === 'CATEGORY'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    By Category
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scopeType: 'SERVICE' })}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      formData.scopeType === 'SERVICE'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    Specific Service
                  </button>
                </div>
              </div>

              {/* Conditional Category Select */}
              {formData.scopeType === 'CATEGORY' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Select Service Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    required
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Conditional Service Select */}
              {formData.scopeType === 'SERVICE' && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Select Specific Hospital Service *
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                    required
                  >
                    <option value="">-- Choose Service --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) - ৳{Number(s.price).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rate Configuration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Commission Type
                  </label>
                  <select
                    value={formData.commissionType}
                    onChange={(e) => setFormData({ ...formData, commissionType: e.target.value as any })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (৳)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    {formData.commissionType === 'PERCENTAGE' ? 'Rate (%)' : 'Amount (৳)'} *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.commissionValue}
                      onChange={(e) => setFormData({ ...formData, commissionValue: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      required
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground">
                      {formData.commissionType === 'PERCENTAGE' ? '%' : '৳'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'ACTIVE'}
                      onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                      className="text-blue-600"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'INACTIVE'}
                      onChange={() => setFormData({ ...formData, status: 'INACTIVE' })}
                      className="text-rose-600"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Saving...' : editingRule ? 'Update Rule' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-bold text-sm text-foreground">Delete Commission Rule?</h3>
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this commission rule? This will deactivate the rule and stop applying it to new patient billing. Existing commission records will not be altered.
            </p>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletingRuleId(null);
                }}
                className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRule}
                className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm cursor-pointer"
              >
                Delete Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
