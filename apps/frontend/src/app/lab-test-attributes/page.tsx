'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  FlaskConical,
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  ListPlus,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

interface ServiceTestAttribute {
  id: string;
  service_id: string;
  name: string;
  unit?: string | null;
  reference_range?: string | null;
  display_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DiagnosticService {
  id: string;
  code: string;
  name: string;
  price: number | string;
  status: string;
  category?: {
    id: string;
    code: string;
    name: string;
  } | null;
  attributes?: ServiceTestAttribute[];
}

export default function LabTestAttributesPage() {
  const { activeCenter } = useAuth();

  // Services list (Master)
  const [services, setServices] = useState<DiagnosticService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Attributes list (Detail)
  const [attributes, setAttributes] = useState<ServiceTestAttribute[]>([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  // Add / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ServiceTestAttribute | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    reference_range: '',
    display_order: 1,
    status: 'ACTIVE',
  });

  // Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [attributeToDelete, setAttributeToDelete] = useState<ServiceTestAttribute | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Preset Templates Modal
  const [presetModalOpen, setPresetModalOpen] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);

  useEffect(() => {
    loadServices();
  }, [activeCenter]);

  useEffect(() => {
    if (selectedServiceId) {
      loadAttributes(selectedServiceId);
    } else {
      setAttributes([]);
    }
  }, [selectedServiceId]);

  const loadServices = async () => {
    setLoadingServices(true);
    try {
      const data = await apiRequest('/diagnostics/services');
      const serviceList: DiagnosticService[] = data || [];
      setServices(serviceList);

      // Auto-select first service if none selected or if previous selection not found
      if (serviceList.length > 0) {
        setSelectedServiceId((prev) => {
          if (prev && serviceList.some((s) => s.id === prev)) {
            return prev;
          }
          return serviceList[0].id;
        });
      } else {
        setSelectedServiceId(null);
      }
    } catch (err: any) {
      console.error('Failed to load diagnostic services', err);
      toast.error(err.message || 'Failed to load diagnostic services');
    } finally {
      setLoadingServices(false);
    }
  };

  const loadAttributes = async (serviceId: string) => {
    setLoadingAttributes(true);
    try {
      const data = await apiRequest(`/diagnostics/services/${serviceId}/attributes`);
      setAttributes(data || []);
      // Also update the count in local services state
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, attributes: data || [] } : s))
      );
    } catch (err: any) {
      console.error('Failed to load attributes', err);
      toast.error(err.message || 'Failed to load test attributes');
    } finally {
      setLoadingAttributes(false);
    }
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Extract unique category names for filter
  const categories = Array.from(
    new Set(
      services
        .map((s) => s.category?.name || s.category?.code || 'General')
        .filter(Boolean)
    )
  );

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(serviceSearch.toLowerCase());
    const catName = s.category?.name || s.category?.code || 'General';
    const matchesCat =
      selectedCategoryFilter === 'ALL' || catName === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const handleOpenCreateModal = () => {
    if (!selectedServiceId) {
      toast.error('Please select a diagnostic service first');
      return;
    }
    setEditingAttribute(null);
    const nextOrder = attributes.length > 0 ? Math.max(...attributes.map((a) => a.display_order)) + 1 : 1;
    setFormData({
      name: '',
      unit: '',
      reference_range: '',
      display_order: nextOrder,
      status: 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (attr: ServiceTestAttribute) => {
    setEditingAttribute(attr);
    setFormData({
      name: attr.name,
      unit: attr.unit || '',
      reference_range: attr.reference_range || '',
      display_order: attr.display_order || 1,
      status: attr.status || 'ACTIVE',
    });
    setModalOpen(true);
  };

  const handleSaveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) return;

    if (!formData.name.trim()) {
      toast.error('Attribute / Parameter name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingAttribute) {
        await apiRequest(`/diagnostics/attributes/${editingAttribute.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: formData.name.trim(),
            unit: formData.unit.trim() || undefined,
            referenceRange: formData.reference_range.trim() || undefined,
            displayOrder: Number(formData.display_order) || 1,
            status: formData.status,
          }),
        });
        toast.success('Test attribute updated successfully');
      } else {
        await apiRequest(`/diagnostics/services/${selectedServiceId}/attributes`, {
          method: 'POST',
          body: JSON.stringify({
            name: formData.name.trim(),
            unit: formData.unit.trim() || undefined,
            referenceRange: formData.reference_range.trim() || undefined,
            displayOrder: Number(formData.display_order) || 1,
            status: formData.status,
          }),
        });
        toast.success('Test attribute created successfully');
      }

      setModalOpen(false);
      setEditingAttribute(null);
      await loadAttributes(selectedServiceId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save test attribute');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!attributeToDelete || !selectedServiceId) return;
    setDeleting(true);
    try {
      await apiRequest(`/diagnostics/attributes/${attributeToDelete.id}`, {
        method: 'DELETE',
      });
      toast.success('Test attribute deleted successfully');
      setDeleteModalOpen(false);
      setAttributeToDelete(null);
      await loadAttributes(selectedServiceId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete test attribute');
    } finally {
      setDeleting(false);
    }
  };

  // Standard preset templates
  const PRESET_TEMPLATES: Record<
    string,
    { title: string; category: string; description: string; attributes: Array<{ name: string; unit: string; reference_range: string }> }
  > = {
    cbc: {
      title: 'Complete Blood Count (CBC) with Diff',
      category: 'Hematology',
      description: 'Standard 10-parameter automated hemogram panel',
      attributes: [
        { name: 'Hemoglobin (Hb)', unit: 'g/dL', reference_range: '13.0 - 17.5 (M), 12.0 - 15.5 (F)' },
        { name: 'Total RBC Count', unit: '10^6/µL', reference_range: '4.5 - 5.9 (M), 4.1 - 5.1 (F)' },
        { name: 'Total WBC Count', unit: '10^3/µL', reference_range: '4.5 - 11.0' },
        { name: 'Platelet Count', unit: '10^3/µL', reference_range: '150 - 450' },
        { name: 'Hematocrit (PCV)', unit: '%', reference_range: '40 - 52 (M), 36 - 48 (F)' },
        { name: 'MCV', unit: 'fL', reference_range: '80 - 100' },
        { name: 'MCH', unit: 'pg', reference_range: '27 - 33' },
        { name: 'MCHC', unit: 'g/dL', reference_range: '32 - 36' },
        { name: 'Neutrophils', unit: '%', reference_range: '40 - 70' },
        { name: 'Lymphocytes', unit: '%', reference_range: '20 - 40' },
        { name: 'Monocytes', unit: '%', reference_range: '2 - 8' },
        { name: 'Eosinophils', unit: '%', reference_range: '1 - 6' },
        { name: 'ESR (Westergren)', unit: 'mm/hr', reference_range: '0 - 15 (M), 0 - 20 (F)' },
      ],
    },
    lipid: {
      title: 'Lipid Profile Panel',
      category: 'Biochemistry',
      description: 'Cardiovascular risk assessment lipid panel',
      attributes: [
        { name: 'Total Cholesterol', unit: 'mg/dL', reference_range: '< 200 Desirable' },
        { name: 'Triglycerides', unit: 'mg/dL', reference_range: '< 150 Normal' },
        { name: 'HDL Cholesterol', unit: 'mg/dL', reference_range: '> 40 (M), > 50 (F)' },
        { name: 'LDL Cholesterol', unit: 'mg/dL', reference_range: '< 100 Optimal' },
        { name: 'VLDL Cholesterol', unit: 'mg/dL', reference_range: '5 - 30' },
        { name: 'Chol / HDL Ratio', unit: 'Ratio', reference_range: '< 4.5' },
      ],
    },
    lft: {
      title: 'Liver Function Test (LFT)',
      category: 'Biochemistry',
      description: 'Hepatic enzymes, bilirubin and protein panel',
      attributes: [
        { name: 'Total Bilirubin', unit: 'mg/dL', reference_range: '0.2 - 1.2' },
        { name: 'Direct Bilirubin', unit: 'mg/dL', reference_range: '0.0 - 0.3' },
        { name: 'Indirect Bilirubin', unit: 'mg/dL', reference_range: '0.2 - 0.8' },
        { name: 'SGOT / AST', unit: 'U/L', reference_range: '10 - 40' },
        { name: 'SGPT / ALT', unit: 'U/L', reference_range: '7 - 56' },
        { name: 'Alkaline Phosphatase (ALP)', unit: 'U/L', reference_range: '44 - 147' },
        { name: 'Total Protein', unit: 'g/dL', reference_range: '6.0 - 8.3' },
        { name: 'Serum Albumin', unit: 'g/dL', reference_range: '3.5 - 5.0' },
      ],
    },
    kft: {
      title: 'Kidney Function / Renal Panel (KFT)',
      category: 'Biochemistry',
      description: 'Renal markers and electrolytes',
      attributes: [
        { name: 'Serum Creatinine', unit: 'mg/dL', reference_range: '0.7 - 1.3 (M), 0.5 - 1.1 (F)' },
        { name: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', reference_range: '7 - 20' },
        { name: 'Serum Uric Acid', unit: 'mg/dL', reference_range: '3.5 - 7.2 (M), 2.6 - 6.0 (F)' },
        { name: 'Serum Sodium (Na+)', unit: 'mEq/L', reference_range: '135 - 145' },
        { name: 'Serum Potassium (K+)', unit: 'mEq/L', reference_range: '3.5 - 5.1' },
      ],
    },
    usg: {
      title: 'Whole Abdomen Ultrasound Scan',
      category: 'Imaging / USG',
      description: 'Organ morphology and echogenicity parameters',
      attributes: [
        { name: 'Liver Size & Echo Pattern', unit: 'Qualitative', reference_range: 'Normal span, homogeneous echotexture' },
        { name: 'Gallbladder & Biliary Tree', unit: 'Qualitative', reference_range: 'Thin wall, lumen clear, no calculi' },
        { name: 'Spleen', unit: 'Qualitative', reference_range: 'Normal size (<12cm), homogeneous' },
        { name: 'Pancreas', unit: 'Qualitative', reference_range: 'Normal morphology, duct not dilated' },
        { name: 'Right Kidney', unit: 'Qualitative', reference_range: 'Normal size (9-12cm), CMD preserved, no hydronephrosis' },
        { name: 'Left Kidney', unit: 'Qualitative', reference_range: 'Normal size (9-12cm), CMD preserved, no hydronephrosis' },
        { name: 'Urinary Bladder & Prostate/Uterus', unit: 'Qualitative', reference_range: 'Well distended, smooth contours' },
        { name: 'Free Fluid / Ascites', unit: 'Qualitative', reference_range: 'No free fluid seen in peritoneal cavity' },
      ],
    },
  };

  const handleApplyPreset = async (presetKey: string) => {
    if (!selectedServiceId) return;
    const template = PRESET_TEMPLATES[presetKey];
    if (!template) return;

    setApplyingPreset(true);
    try {
      const payload = template.attributes.map((a, idx) => ({
        name: a.name,
        unit: a.unit,
        referenceRange: a.reference_range,
        displayOrder: idx + 1,
        status: 'ACTIVE',
      }));

      await apiRequest(`/diagnostics/services/${selectedServiceId}/attributes/batch`, {
        method: 'POST',
        body: JSON.stringify({ attributes: payload }),
      });

      toast.success(`Preset "${template.title}" applied with ${payload.length} parameters!`);
      setPresetModalOpen(false);
      await loadAttributes(selectedServiceId);
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply preset template');
    } finally {
      setApplyingPreset(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Lab Test Attributes & Master Setup
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure relational parameters, units, and normal reference ranges for diagnostic services in{' '}
                <span className="font-semibold text-foreground">
                  {activeCenter?.name || 'Selected Center'}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadServices}
            disabled={loadingServices}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh services"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingServices ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Master-Details Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================== */}
        {/* MASTER PANEL: Service Catalog (Columns 1-4)                    */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-foreground">Diagnostic Services</h2>
              </div>
              <span className="rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-bold">
                {filteredServices.length} Services
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services by name or code..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
              <button
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`rounded-lg px-2 py-1 font-semibold whitespace-nowrap transition-colors ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`rounded-lg px-2 py-1 font-semibold whitespace-nowrap transition-colors ${
                    selectedCategoryFilter === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Service List */}
          <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
            {loadingServices ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                Loading diagnostic services...
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <AlertCircle className="h-6 w-6 mx-auto opacity-40 text-muted-foreground" />
                <p className="font-semibold text-foreground">No Diagnostic Services Found</p>
                <p className="text-[11px]">Try adjusting your search query or filter</p>
              </div>
            ) : (
              filteredServices.map((service) => {
                const isSelected = service.id === selectedServiceId;
                const attrCount = service.attributes?.length ?? 0;

                return (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600 dark:border-blue-500'
                        : 'hover:bg-muted/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-muted-foreground">
                          {service.code}
                        </span>
                        {service.category && (
                          <span className="rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 text-[9px] font-medium">
                            {service.category.name}
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-xs font-semibold truncate ${
                          isSelected
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-foreground'
                        }`}
                      >
                        {service.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Price: ৳{Number(service.price || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          attrCount > 0
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <FlaskConical className="h-3 w-3" />
                        <span>{attrCount} {attrCount === 1 ? 'Attr' : 'Attrs'}</span>
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          Selected
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* DETAILS PANEL: Attributes Table for Selected Service (Cols 5-12) */}
        {/* ============================================================== */}
        <div className="lg:col-span-8 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
          {selectedService ? (
            <>
              {/* Selected Service Header Banner */}
              <div className="p-4 sm:p-5 border-b border-border bg-muted/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[10px] font-mono font-bold">
                        {selectedService.code}
                      </span>
                      {selectedService.category && (
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {selectedService.category.name}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-foreground mt-0.5">
                      {selectedService.name}
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {attributes.length} relational lab parameters mapped to this diagnostic service
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPresetModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 px-3 py-2 text-xs font-semibold transition-colors shadow-xs"
                      title="Load standard preset parameter templates"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Load Template</span>
                    </button>

                    <button
                      onClick={handleOpenCreateModal}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors shadow-sm shadow-blue-500/20"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Parameter</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Attributes Table */}
              <div className="overflow-x-auto">
                {loadingAttributes ? (
                  <div className="p-12 text-center text-xs text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-muted-foreground" />
                    Loading attributes for {selectedService.name}...
                  </div>
                ) : attributes.length === 0 ? (
                  <div className="p-12 text-center text-xs text-muted-foreground space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mx-auto text-muted-foreground">
                      <ListPlus className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground text-sm">
                        No Test Attributes Configured Yet
                      </p>
                      <p className="text-[11px] max-w-sm mx-auto">
                        Add test attributes (like Hemoglobin, WBC, Serum Creatinine) or choose a standard template to automatically populate parameters.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => setPresetModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-3.5 py-1.5 text-xs font-semibold"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Choose Standard Preset</span>
                      </button>
                      <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add First Attribute</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Parameter Name</th>
                        <th className="py-2.5 px-4">Unit</th>
                        <th className="py-2.5 px-4">Normal Reference Range / Example</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attributes.map((attr, idx) => (
                        <tr
                          key={attr.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <td className="py-3 px-4 text-center font-mono text-[11px] text-muted-foreground">
                            {attr.display_order || idx + 1}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{attr.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-muted-foreground">
                            {attr.unit ? (
                              <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                                {attr.unit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 italic">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {attr.reference_range ? (
                              <span className="font-medium text-foreground bg-slate-50 dark:bg-slate-900/60 border border-border/60 rounded px-2 py-1 text-[11px] inline-block">
                                {attr.reference_range}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60 italic">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                attr.status === 'ACTIVE'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {attr.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(attr)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Edit parameter"
                              >
                                <Pencil className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </button>
                              <button
                                onClick={() => {
                                  setAttributeToDelete(attr);
                                  setDeleteModalOpen(true);
                                }}
                                className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition-colors"
                                title="Delete parameter"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
              <FlaskConical className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
              <p className="font-semibold text-foreground text-sm">
                No Service Selected
              </p>
              <p className="text-[11px]">
                Please select a diagnostic service from the left list to view or configure its test attributes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: Add / Edit Test Attribute                              */}
      {/* ============================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-bold text-foreground">
                  {editingAttribute ? 'Edit Test Attribute' : 'Add Test Attribute'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAttribute} className="space-y-4 text-xs">
              <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 p-2.5">
                <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">
                  Target Service Master
                </span>
                <span className="font-semibold text-foreground text-xs">
                  {selectedService?.name} ({selectedService?.code})
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Attribute / Parameter Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hemoglobin (Hb), Serum Creatinine, Liver Span"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Measurement Unit (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. g/dL, mg/dL, %, 10^3/µL"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Leave blank for qualitative/imaging tests
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({ ...formData, display_order: parseInt(e.target.value) || 1 })
                    }
                    className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Sequence on report sheet
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Normal Reference Range / Example Value
                </label>
                <input
                  type="text"
                  placeholder="e.g. 13.0 - 17.5 g/dL or < 200 mg/dL or Normal echogenicity"
                  value={formData.reference_range}
                  onChange={(e) =>
                    setFormData({ ...formData, reference_range: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-muted-foreground">
                  Used as default benchmark in diagnostic test reports
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">ACTIVE (Available for reports)</option>
                  <option value="INACTIVE">INACTIVE (Hidden from reports)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : editingAttribute
                    ? 'Update Attribute'
                    : 'Create Attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: Preset Templates Selection                             */}
      {/* ============================================================== */}
      {presetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-foreground">
                  Load Standard Diagnostic Parameter Template
                </h3>
              </div>
              <button
                onClick={() => setPresetModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground">
              Select a clinical standard preset to instantly populate parameters into{' '}
              <strong className="text-foreground">{selectedService?.name}</strong>.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
                <div
                  key={key}
                  className="rounded-xl border border-border bg-muted/20 p-4 space-y-2.5 flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-[9px] font-bold">
                        {template.category}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {template.attributes.length} parameters
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground">
                      {template.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      {template.description}
                    </p>
                  </div>

                  <div className="border-t border-border/60 pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Includes: {template.attributes.slice(0, 3).map((a) => a.name.split(' ')[0]).join(', ')}...
                    </span>
                    <button
                      type="button"
                      disabled={applyingPreset}
                      onClick={() => handleApplyPreset(key)}
                      className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs disabled:opacity-50"
                    >
                      {applyingPreset ? 'Applying...' : 'Apply Preset'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setPresetModalOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: Delete Confirmation                                    */}
      {/* ============================================================== */}
      {deleteModalOpen && attributeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Delete Test Attribute
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Are you sure you want to remove this parameter?
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {attributeToDelete.name}
              </p>
              {attributeToDelete.unit && (
                <p className="text-[11px] text-muted-foreground">
                  Unit: <span className="font-mono">{attributeToDelete.unit}</span>
                </p>
              )}
              {attributeToDelete.reference_range && (
                <p className="text-[11px] text-muted-foreground">
                  Reference: {attributeToDelete.reference_range}
                </p>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Existing finalized reports that already recorded this attribute will preserve their snapshot data.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteModalOpen(false);
                  setAttributeToDelete(null);
                }}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
