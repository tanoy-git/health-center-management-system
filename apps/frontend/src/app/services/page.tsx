'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  Layers,
  Tag,
  Sparkles,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Users,
  Building2,
  Percent,
  X,
  Filter,
  Check,
} from 'lucide-react';

export default function ServicesAndCampaignsPage() {
  const { activeCenter } = useAuth();
  const [activeTab, setActiveTab] = useState<'services' | 'categories' | 'campaigns'>('services');

  // Data states
  const [services, setServices] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');

  // Toast / Error
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceForm, setServiceForm] = useState({
    code: '',
    name: '',
    categoryId: '',
    price: '',
    taxRate: '0',
    status: 'ACTIVE',
  });

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    code: '',
    name: '',
    description: '',
    status: 'ACTIVE',
  });

  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    code: '',
    description: '',
    discountType: 'PERCENTAGE', // PERCENTAGE | FIXED_AMOUNT
    discountValue: '',
    minAge: '',
    maxAge: '',
    gender: 'ALL', // ALL | MALE | FEMALE | OTHER
    centerId: '',
    serviceId: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [activeCenter]);

  const showToast = (msg: string) => {
    toast.success(msg);
  };

  const loadAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [srvList, catList, campList, ctrList] = await Promise.all([
        apiRequest('/billing/services?status=ALL').catch(() => []),
        apiRequest('/billing/categories?status=ALL').catch(() => []),
        apiRequest('/billing/discount-campaigns?status=ALL').catch(() => []),
        apiRequest('/centers').catch(() => []),
      ]);
      setServices(srvList || []);
      setCategories(catList || []);
      setCampaigns(campList || []);
      setCenters(ctrList || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load services data');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SERVICE ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceForm({
      code: '',
      name: '',
      categoryId: categories.length > 0 ? categories[0].id : '',
      price: '',
      taxRate: '0',
      status: 'ACTIVE',
    });
    setServiceModalOpen(true);
  };

  const handleOpenEditService = (srv: any) => {
    setEditingService(srv);
    setServiceForm({
      code: srv.code,
      name: srv.name,
      categoryId: srv.category_id || (categories.find(c => c.code === srv.category)?.id || ''),
      price: String(srv.price),
      taxRate: String(srv.tax_rate || 0),
      status: srv.status || 'ACTIVE',
    });
    setServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim() || !serviceForm.price) {
      toast.warning('Service name and price are required');
      return;
    }
    const matchedCategory = categories.find(c => c.id === serviceForm.categoryId);
    const categoryCode = matchedCategory?.code || 'CONSULTATION';

    setSubmitting(true);
    try {
      if (editingService) {
        await apiRequest(`/billing/services/${editingService.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: serviceForm.name,
            category: categoryCode,
            categoryId: serviceForm.categoryId || undefined,
            price: parseFloat(serviceForm.price),
            taxRate: parseFloat(serviceForm.taxRate) || 0,
            status: serviceForm.status,
          }),
        });
        showToast('Service updated successfully');
      } else {
        await apiRequest('/billing/services', {
          method: 'POST',
          body: JSON.stringify({
            code: serviceForm.code.trim().toUpperCase(),
            name: serviceForm.name,
            category: categoryCode,
            categoryId: serviceForm.categoryId || undefined,
            price: parseFloat(serviceForm.price),
            taxRate: parseFloat(serviceForm.taxRate) || 0,
            status: serviceForm.status,
          }),
        });
        showToast('New service added successfully');
      }
      setServiceModalOpen(false);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleServiceStatus = async (srv: any) => {
    const nextStatus = srv.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiRequest(`/billing/services/${srv.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast(`Service "${srv.name}" set to ${nextStatus}`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update service status');
    }
  };

  const handleDeleteService = async (srv: any) => {
    if (!confirm(`Are you sure you want to delete service "${srv.name}"?`)) return;
    try {
      await apiRequest(`/billing/services/${srv.id}`, { method: 'DELETE' });
      showToast(`Service "${srv.name}" deleted`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete service');
    }
  };

  // -------------------------------------------------------------
  // CATEGORY ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      code: '',
      name: '',
      description: '',
      status: 'ACTIVE',
    });
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: any) => {
    setEditingCategory(cat);
    setCategoryForm({
      code: cat.code,
      name: cat.name,
      description: cat.description || '',
      status: cat.status || 'ACTIVE',
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.warning('Category name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCategory) {
        await apiRequest(`/billing/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim(),
            status: categoryForm.status,
          }),
        });
        showToast('Service category updated');
      } else {
        await apiRequest('/billing/categories', {
          method: 'POST',
          body: JSON.stringify({
            code: categoryForm.code.trim().toUpperCase(),
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim(),
            status: categoryForm.status,
          }),
        });
        showToast('New service category created');
      }
      setCategoryModalOpen(false);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCategoryStatus = async (cat: any) => {
    const nextStatus = cat.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiRequest(`/billing/categories/${cat.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast(`Category "${cat.name}" marked ${nextStatus}`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category status');
    }
  };

  // -------------------------------------------------------------
  // DISCOUNT CAMPAIGN ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddCampaign = () => {
    setEditingCampaign(null);
    setCampaignForm({
      name: '',
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      minAge: '',
      maxAge: '',
      gender: 'ALL',
      centerId: activeCenter?.id || '',
      serviceId: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      status: 'ACTIVE',
    });
    setCampaignModalOpen(true);
  };

  const handleOpenEditCampaign = (camp: any) => {
    setEditingCampaign(camp);
    setCampaignForm({
      name: camp.name,
      code: camp.code || '',
      description: camp.description || '',
      discountType: camp.discount_type || 'PERCENTAGE',
      discountValue: String(camp.discount_value),
      minAge: camp.min_age !== null && camp.min_age !== undefined ? String(camp.min_age) : '',
      maxAge: camp.max_age !== null && camp.max_age !== undefined ? String(camp.max_age) : '',
      gender: camp.gender || 'ALL',
      centerId: camp.center_id || '',
      serviceId: camp.service_id || '',
      categoryId: camp.category_id || '',
      startDate: camp.start_date ? new Date(camp.start_date).toISOString().split('T')[0] : '',
      endDate: camp.end_date ? new Date(camp.end_date).toISOString().split('T')[0] : '',
      status: camp.status || 'ACTIVE',
    });
    setCampaignModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name.trim() || !campaignForm.discountValue) {
      toast.warning('Campaign name and discount value are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        name: campaignForm.name.trim(),
        code: campaignForm.code?.trim().toUpperCase() || undefined,
        description: campaignForm.description?.trim() || undefined,
        discountType: campaignForm.discountType,
        discountValue: parseFloat(campaignForm.discountValue),
        minAge: campaignForm.minAge ? parseInt(campaignForm.minAge) : null,
        maxAge: campaignForm.maxAge ? parseInt(campaignForm.maxAge) : null,
        gender: campaignForm.gender,
        centerId: campaignForm.centerId || null,
        serviceId: campaignForm.serviceId || null,
        categoryId: campaignForm.categoryId || null,
        startDate: campaignForm.startDate || null,
        endDate: campaignForm.endDate || null,
        status: campaignForm.status,
      };

      if (editingCampaign) {
        await apiRequest(`/billing/discount-campaigns/${editingCampaign.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        showToast('Discount campaign updated successfully');
      } else {
        await apiRequest('/billing/discount-campaigns', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('New discount campaign launched');
      }
      setCampaignModalOpen(false);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save discount campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCampaignStatus = async (camp: any) => {
    const nextStatus = camp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await apiRequest(`/billing/discount-campaigns/${camp.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      showToast(`Campaign "${camp.name}" is now ${nextStatus}`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update campaign status');
    }
  };

  const handleDeleteCampaign = async (camp: any) => {
    if (!confirm(`Are you sure you want to delete campaign "${camp.name}"?`)) return;
    try {
      await apiRequest(`/billing/discount-campaigns/${camp.id}`, { method: 'DELETE' });
      showToast(`Campaign "${camp.name}" deleted`);
      loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete campaign');
    }
  };

  // -------------------------------------------------------------
  // FILTERED DATA
  // -------------------------------------------------------------
  const filteredServices = services.filter((srv) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      srv.name.toLowerCase().includes(q) ||
      srv.code.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategoryFilter === 'ALL' ||
      srv.category?.toUpperCase() === selectedCategoryFilter.toUpperCase() ||
      srv.category_id === selectedCategoryFilter;

    const matchesStatus =
      selectedStatusFilter === 'ALL' || srv.status === selectedStatusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredCategories = categories.filter((cat) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      cat.name.toLowerCase().includes(q) ||
      cat.code.toLowerCase().includes(q) ||
      (cat.description && cat.description.toLowerCase().includes(q));

    const matchesStatus =
      selectedStatusFilter === 'ALL' || cat.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredCampaigns = campaigns.filter((camp) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      camp.name.toLowerCase().includes(q) ||
      (camp.code && camp.code.toLowerCase().includes(q)) ||
      (camp.description && camp.description.toLowerCase().includes(q));

    const matchesStatus =
      selectedStatusFilter === 'ALL' || camp.status === selectedStatusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-top-2">
          <CheckCircle className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Services, Categories & Discount Campaigns
              </h1>
              <p className="text-xs text-muted-foreground">
                Configure billable hospital services, database-driven service categories, and targeted privilege campaigns.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button based on Active Tab */}
        <div>
          {activeTab === 'services' && (
            <button
              onClick={handleOpenAddService}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Service</span>
            </button>
          )}
          {activeTab === 'categories' && (
            <button
              onClick={handleOpenAddCategory}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Category</span>
            </button>
          )}
          {activeTab === 'campaigns' && (
            <button
              onClick={handleOpenAddCampaign}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>Launch Discount Campaign</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => {
            setActiveTab('services');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'services'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <Layers className="h-4 w-4" />
          <span>Billable Services ({services.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('categories');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'categories'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <Tag className="h-4 w-4" />
          <span>Service Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('campaigns');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'campaigns'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span>Discount Campaigns ({campaigns.length})</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'services'
                ? 'Search services by name or code...'
                : activeTab === 'categories'
                  ? 'Search categories by name or code...'
                  : 'Search discount campaigns...'
            }
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-primary outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'services' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">Category:</span>
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-muted-foreground">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-medium outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: BILLABLE SERVICES */}
      {activeTab === 'services' && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Service Name</th>
                  <th className="py-3 px-4">Category (Dynamic)</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Tax Rate</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                      No services match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((srv) => (
                    <tr key={srv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {srv.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {srv.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                          {srv.category_rel?.name || srv.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {Number(srv.price).toFixed(2)} tk
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-muted-foreground">
                        {Number(srv.tax_rate || 0)}%
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleServiceStatus(srv)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${srv.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:opacity-80'
                            : 'bg-muted text-muted-foreground hover:opacity-80'
                            }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${srv.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                          />
                          <span>{srv.status || 'ACTIVE'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditService(srv)}
                            className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-lg hover:bg-muted"
                            title="Edit Service"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(srv)}
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-muted"
                            title="Delete Service"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SERVICE CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Category Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-muted-foreground">
                      No categories found. Click &quot;Add New Category&quot; to define a service category.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                          {cat.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {cat.name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {cat.description || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleCategoryStatus(cat)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${cat.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:opacity-80'
                            : 'bg-muted text-muted-foreground hover:opacity-80'
                            }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${cat.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                          />
                          <span>{cat.status || 'ACTIVE'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1.5 text-muted-foreground hover:text-blue-600 transition-colors rounded-lg hover:bg-muted"
                          title="Edit Category"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DISCOUNT CAMPAIGNS */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          {/* Campaign Info Highlight Banner */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-foreground">
                Automated Privilege Discount Rules
              </p>
              <p className="text-muted-foreground">
                Campaigns defined here automatically match eligible patients at Billing POS based on age (e.g. over 60 years old), gender (e.g. Male privilege), specific center branches, target services/categories, and date ranges. When a campaign is set to <strong>INACTIVE</strong>, it is immediately excluded from POS calculations. Applied discounts are audited on the invoice item.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-muted-foreground rounded-xl border border-dashed border-border bg-card">
                No discount campaigns found. Click &quot;Launch Discount Campaign&quot; to create targeted privilege rules.
              </div>
            ) : (
              filteredCampaigns.map((camp) => {
                const isActive = camp.status === 'ACTIVE';
                return (
                  <div
                    key={camp.id}
                    className={`rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition-all ${isActive
                      ? 'border-amber-500/40 bg-card hover:border-amber-500'
                      : 'border-border bg-muted/20 opacity-70'
                      }`}
                  >
                    <div className="space-y-3">
                      {/* Campaign Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground">
                              {camp.name}
                            </h3>
                            {camp.code && (
                              <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                {camp.code}
                              </span>
                            )}
                          </div>
                          {camp.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                              {camp.description}
                            </p>
                          )}
                        </div>

                        {/* Status Toggle Badge */}
                        <button
                          onClick={() => handleToggleCampaignStatus(camp)}
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-all ${isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                            }`}
                          title="Click to toggle active/inactive"
                        >
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </div>

                      {/* Discount Amount Highlight */}
                      <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Discount Value:
                        </span>
                        <span className="font-mono text-base font-extrabold text-amber-600 dark:text-amber-400">
                          {camp.discount_type === 'PERCENTAGE'
                            ? `${Number(camp.discount_value)}% OFF`
                            : `${Number(camp.discount_value).toFixed(2)} tk OFF`}
                        </span>
                      </div>

                      {/* Eligibility Rules */}
                      <div className="space-y-1.5 text-[11px] pt-1">
                        {/* Age Eligibility */}
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-blue-500" />
                            <span>Age Criteria:</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            {camp.min_age !== null && camp.max_age !== null
                              ? `${camp.min_age} - ${camp.max_age} yrs`
                              : camp.min_age !== null
                                ? `Over ${camp.min_age} yrs`
                                : camp.max_age !== null
                                  ? `Under ${camp.max_age} yrs`
                                  : 'All Ages'}
                          </span>
                        </div>

                        {/* Gender Eligibility */}
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Gender:</span>
                          <span className="font-semibold text-foreground">
                            {camp.gender && camp.gender !== 'ALL'
                              ? camp.gender
                              : 'All Genders'}
                          </span>
                        </div>

                        {/* Service / Category Target */}
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span>Target Scope:</span>
                          <span className="font-semibold text-foreground truncate max-w-[150px]">
                            {camp.service
                              ? `Service: ${camp.service.name}`
                              : camp.category
                                ? `Category: ${camp.category.name}`
                                : 'All Hospital Services'}
                          </span>
                        </div>

                        {/* Center Branch */}
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-purple-500" />
                            <span>Health Center:</span>
                          </span>
                          <span className="font-semibold text-foreground">
                            {camp.center ? camp.center.name : 'All Centers'}
                          </span>
                        </div>

                        {/* Date Range Occasion */}
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-emerald-500" />
                            <span>Occasion Validity:</span>
                          </span>
                          <span className="font-mono text-[10px] text-foreground">
                            {camp.start_date || camp.end_date
                              ? `${camp.start_date ? new Date(camp.start_date).toISOString().split('T')[0] : 'Open'} ~ ${camp.end_date ? new Date(camp.end_date).toISOString().split('T')[0] : 'Open'}`
                              : 'Ongoing / Always'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-border">
                      <button
                        onClick={() => handleOpenEditCampaign(camp)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(camp)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT SERVICE                                 */}
      {/* ========================================================= */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {editingService ? 'Edit Billable Service' : 'Add Billable Service'}
              </h3>
              <button
                onClick={() => setServiceModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Service Code *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.code}
                  disabled={!!editingService}
                  onChange={(e) => setServiceForm({ ...serviceForm, code: e.target.value })}
                  placeholder="e.g. CONS-GEN, USG-WHOLE"
                  className="w-full mt-1 rounded-lg border border-input bg-background p-2 font-mono uppercase focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Service Name *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  placeholder="e.g. General Physician Consultation"
                  className="w-full mt-1 rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Service Category (Dynamic) *</label>
                <select
                  required
                  value={serviceForm.categoryId}
                  onChange={(e) => setServiceForm({ ...serviceForm, categoryId: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="" disabled>Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground">Price (tk) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full mt-1 rounded-lg border border-input bg-background p-2 font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-foreground">Tax Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceForm.taxRate}
                    onChange={(e) => setServiceForm({ ...serviceForm, taxRate: e.target.value })}
                    placeholder="0"
                    className="w-full mt-1 rounded-lg border border-input bg-background p-2 font-mono focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground">Service Status</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setServiceForm({ ...serviceForm, status: 'ACTIVE' })}
                    className={`rounded-lg py-2 font-bold transition-all ${serviceForm.status === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                  >
                    ACTIVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceForm({ ...serviceForm, status: 'INACTIVE' })}
                    className={`rounded-lg py-2 font-bold transition-all ${serviceForm.status === 'INACTIVE'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                  >
                    INACTIVE
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 font-bold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT CATEGORY                                */}
      {/* ========================================================= */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                {editingCategory ? 'Edit Service Category' : 'Add Service Category'}
              </h3>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-foreground">Category Code *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.code}
                  disabled={!!editingCategory}
                  onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                  placeholder="e.g. LAB_TEST, USG, DENTAL"
                  className="w-full mt-1 rounded-lg border border-input bg-background p-2 font-mono uppercase focus:ring-2 focus:ring-primary outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Laboratory Test, Ultrasonography"
                  className="w-full mt-1 rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Description</label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Optional notes or department details..."
                  className="w-full mt-1 rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-foreground">Status</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, status: 'ACTIVE' })}
                    className={`rounded-lg py-2 font-bold transition-all ${categoryForm.status === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                  >
                    ACTIVE
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryForm({ ...categoryForm, status: 'INACTIVE' })}
                    className={`rounded-lg py-2 font-bold transition-all ${categoryForm.status === 'INACTIVE'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                  >
                    INACTIVE
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 font-bold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT DISCOUNT CAMPAIGN                       */}
      {/* ========================================================= */}
      {campaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-base font-bold text-foreground">
                  {editingCampaign ? 'Edit Discount Campaign' : 'Launch Discount Campaign'}
                </h3>
              </div>
              <button
                onClick={() => setCampaignModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-foreground">Campaign Name *</label>
                  <input
                    type="text"
                    required
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                    placeholder="e.g. Senior Citizen Male Privilege (60+ Yrs)"
                    className="w-full mt-1 rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground">Promo Code (Optional)</label>
                  <input
                    type="text"
                    value={campaignForm.code}
                    onChange={(e) => setCampaignForm({ ...campaignForm, code: e.target.value })}
                    placeholder="e.g. SENIOR60, EID2026"
                    className="w-full mt-1 rounded-lg border border-input bg-background p-2 font-mono uppercase focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground">Discount Mode *</label>
                  <select
                    value={campaignForm.discountType}
                    onChange={(e) => setCampaignForm({ ...campaignForm, discountType: e.target.value })}
                    className="w-full mt-1 rounded-lg border border-input bg-background p-2 font-semibold focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (tk)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground">
                  Discount Value * ({campaignForm.discountType === 'PERCENTAGE' ? '%' : 'tk'})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={campaignForm.discountValue}
                  onChange={(e) => setCampaignForm({ ...campaignForm, discountValue: e.target.value })}
                  placeholder={campaignForm.discountType === 'PERCENTAGE' ? 'e.g. 15' : 'e.g. 100'}
                  className="w-full mt-1 rounded-lg border border-input bg-background p-2 font-mono font-bold text-amber-600 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              {/* Patient Eligibility Constraints */}
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span>Patient Eligibility Matching Criteria</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold">Min Age (Years)</label>
                    <input
                      type="number"
                      min="0"
                      value={campaignForm.minAge}
                      onChange={(e) => setCampaignForm({ ...campaignForm, minAge: e.target.value })}
                      placeholder="e.g. 60"
                      className="w-full mt-1 rounded-lg border border-input bg-background p-1.5 font-mono text-center outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold">Max Age (Years)</label>
                    <input
                      type="number"
                      min="0"
                      value={campaignForm.maxAge}
                      onChange={(e) => setCampaignForm({ ...campaignForm, maxAge: e.target.value })}
                      placeholder="e.g. 120"
                      className="w-full mt-1 rounded-lg border border-input bg-background p-1.5 font-mono text-center outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold">Gender Rule</label>
                    <select
                      value={campaignForm.gender}
                      onChange={(e) => setCampaignForm({ ...campaignForm, gender: e.target.value })}
                      className="w-full mt-1 rounded-lg border border-input bg-background p-1.5 font-semibold outline-none"
                    >
                      <option value="ALL">All Genders</option>
                      <option value="MALE">Male Only</option>
                      <option value="FEMALE">Female Only</option>
                      <option value="OTHER">Other Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Scope & Occasional Range */}
              <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-foreground">
                  <Building2 className="h-3.5 w-3.5 text-purple-500" />
                  <span>Scope & Occasion Date Range</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold">Center Branch Scoping</label>
                    <select
                      value={campaignForm.centerId}
                      onChange={(e) => setCampaignForm({ ...campaignForm, centerId: e.target.value })}
                      className="w-full mt-1 rounded-lg border border-input bg-background p-1.5 outline-none"
                    >
                      <option value="">All Health Centers (Global)</option>
                      {centers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold">Target Specific Service</label>
                    <select
                      value={campaignForm.serviceId}
                      onChange={(e) => setCampaignForm({ ...campaignForm, serviceId: e.target.value })}
                      className="w-full mt-1 rounded-lg border border-input bg-background p-1.5 outline-none"
                    >
                      <option value="">All Services in Scope</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold">Target Specific Category</label>
                    <select
                      value={campaignForm.categoryId}
                      onChange={(e) => setCampaignForm({ ...campaignForm, categoryId: e.target.value })}
                      className="w-full mt-1 rounded-lg border border-input bg-background p-1.5 outline-none"
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">Start Date</label>
                      <input
                        type="date"
                        value={campaignForm.startDate}
                        onChange={(e) => setCampaignForm({ ...campaignForm, startDate: e.target.value })}
                        className="w-full mt-1 rounded-lg border border-input bg-background p-1.5 text-[11px] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold">End Date</label>
                      <input
                        type="date"
                        value={campaignForm.endDate}
                        onChange={(e) => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                        className="w-full mt-1 rounded-lg border border-input bg-background p-1.5 text-[11px] outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="font-semibold text-foreground">Campaign Status</label>
                <p className="text-[10px] text-muted-foreground">
                  When INACTIVE, this discount is immediately excluded from POS checkout calculations.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setCampaignForm({ ...campaignForm, status: 'ACTIVE' })}
                    className={`rounded-lg py-2 font-bold transition-all ${campaignForm.status === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                  >
                    ACTIVE (Enabled)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignForm({ ...campaignForm, status: 'INACTIVE' })}
                    className={`rounded-lg py-2 font-bold transition-all ${campaignForm.status === 'INACTIVE'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'border border-border bg-background hover:bg-muted text-muted-foreground'
                      }`}
                  >
                    INACTIVE (Disabled)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCampaignModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 px-4 py-2 font-bold text-white shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingCampaign ? 'Update Campaign' : 'Launch Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
