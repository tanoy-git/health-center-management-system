'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest, getApiBase } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  Activity,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Upload,
  FileText,
  ShieldCheck,
  X,
  FileImage,
  ListOrdered,
  RotateCcw,
  Sparkles,
  Check,
  User,
  Users,
  Pencil,
  Printer,
  FlaskConical,
  Trash2,
  Eye,
  AlertTriangle,
} from 'lucide-react';

import DateRangeFilter, {
  DateFilterValue,
  getDefaultDateFilter,
  filterMatchesDate,
} from '@/components/DateRangeFilter';

export default function DiagnosticsPage() {
  const { activeCenter, hasPermission, user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [testTypeFilter, setTestTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters for Report Section
  const [reportDateFilter, setReportDateFilter] = useState<DateFilterValue>(getDefaultDateFilter());
  const [reportDoctorFilter, setReportDoctorFilter] = useState('ALL');
  const [reportPatientSearch, setReportPatientSearch] = useState('');

  // Diagnostics Patient Queue State
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [selectedQueueTab, setSelectedQueueTab] = useState<
    'ALL' | 'USG' | 'LAB' | 'XRAY' | 'ECG'
  >('ALL');
  const [selectedInvoiceItemId, setSelectedInvoiceItemId] = useState<
    string | null
  >(null);
  const [activeQueueItem, setActiveQueueItem] = useState<any | null>(null);

  // New / Edit Report Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<any | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testType, setTestType] = useState('USG');
  const [testName, setTestName] = useState('Abdominal & Pelvic Ultrasound (USG)');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Diagnostic Services & Lab Attributes Master State
  const [diagnosticServices, setDiagnosticServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [reportAttributes, setReportAttributes] = useState<
    Array<{
      attributeId?: string;
      attributeName: string;
      attributeUnit?: string;
      referenceRange?: string;
      value: string;
      flag: string;
      displayOrder: number;
    }>
  >([]);
  const [loadingAttributes, setLoadingAttributes] = useState(false);

  // View / Print Report Modal State
  const [viewReportModalOpen, setViewReportModalOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<any | null>(null);

  // Sign-off Modal
  const [signOffModalOpen, setSignOffModalOpen] = useState(false);
  const [targetReport, setTargetReport] = useState<any | null>(null);
  const [signatureText, setSignatureText] = useState('');

  // Helper to determine modality from queue item
  const resolveQueueItemModality = (
    item: any
  ): 'USG' | 'LAB' | 'XRAY' | 'ECG' => {
    const cat = (item.category || '').toUpperCase();
    const name = (item.item_name || '').toUpperCase();

    if (
      cat === 'USG' ||
      name.includes('USG') ||
      name.includes('ULTRASOUND')
    ) {
      return 'USG';
    }
    if (
      cat === 'LAB_TEST' ||
      cat === 'LAB' ||
      name.includes('BLOOD') ||
      name.includes('TEST') ||
      name.includes('PANEL') ||
      name.includes('CBC') ||
      name.includes('LIPID') ||
      name.includes('HBA1C')
    ) {
      return 'LAB';
    }
    if (
      cat === 'RADIOLOGY' ||
      cat === 'XRAY' ||
      name.includes('X-RAY') ||
      name.includes('XRAY')
    ) {
      return 'XRAY';
    }
    if (
      cat === 'ECG' ||
      name.includes('ECG') ||
      name.includes('ELECTROCARDIOGRAM')
    ) {
      return 'ECG';
    }
    return 'USG';
  };

  useEffect(() => {
    loadReports();
    loadQueue();
  }, [activeCenter, testTypeFilter]);

  const fetchServiceAttributes = async (serviceId: string) => {
    if (!serviceId) {
      setReportAttributes([]);
      return;
    }
    setLoadingAttributes(true);
    try {
      const attrs = await apiRequest(`/diagnostics/services/${serviceId}/attributes`);
      if (Array.isArray(attrs) && attrs.length > 0) {
        setReportAttributes(
          attrs.map((a: any, idx: number) => ({
            attributeId: a.id,
            attributeName: a.name,
            attributeUnit: a.unit || '',
            referenceRange: a.reference_range || '',
            value: '',
            flag: 'NORMAL',
            displayOrder: a.display_order || idx + 1,
          }))
        );
      } else {
        setReportAttributes([]);
      }
    } catch (err) {
      console.error('Failed to fetch service attributes:', err);
    } finally {
      setLoadingAttributes(false);
    }
  };

  const handleSelectService = async (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (!serviceId) {
      setReportAttributes([]);
      return;
    }
    const svc = diagnosticServices.find((s) => s.id === serviceId);
    if (svc) {
      setTestName(svc.name);
      const cat = (svc.category?.code || svc.category?.name || '').toUpperCase();
      if (cat.includes('USG') || svc.name.toUpperCase().includes('USG')) {
        setTestType('USG');
      } else if (
        cat.includes('XRAY') ||
        cat.includes('RADIOLOGY') ||
        svc.name.toUpperCase().includes('X-RAY')
      ) {
        setTestType('XRAY');
      } else if (cat.includes('ECG') || svc.name.toUpperCase().includes('ECG')) {
        setTestType('ECG');
      } else {
        setTestType('LAB');
      }
    }
    await fetchServiceAttributes(serviceId);
  };

  const handleAttributeChange = (index: number, field: string, val: any) => {
    setReportAttributes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAddCustomAttribute = () => {
    setReportAttributes((prev) => [
      ...prev,
      {
        attributeName: '',
        attributeUnit: '',
        referenceRange: '',
        value: '',
        flag: 'NORMAL',
        displayOrder: prev.length + 1,
      },
    ]);
  };

  const handleRemoveAttribute = (index: number) => {
    setReportAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const data = await apiRequest('/diagnostics/queue');
      setQueueItems(data || []);
    } catch (e) {
      console.error('Error loading diagnostics queue:', e);
    } finally {
      setQueueLoading(false);
    }
  };

  const handleAttendQueueItem = async (item: any) => {
    setSelectedInvoiceItemId(item.id);
    setActiveQueueItem(item);
    if (item.invoice?.patient?.id) {
      setSelectedPatientId(item.invoice.patient.id);
    }
    const modality = resolveQueueItemModality(item);
    setTestType(modality);
    setTestName(item.item_name || `${modality} Examination`);
    setFindings(
      `Patient presented for ${item.item_name}. Clinical evaluation and findings recorded below:\n\n`
    );
    setImpression('');

    // Attempt to match service
    let matchedSvcId = item.service_id;
    if (!matchedSvcId && diagnosticServices.length > 0) {
      const found = diagnosticServices.find(
        (s) =>
          s.id === item.service_id ||
          s.name.toLowerCase() === (item.item_name || '').toLowerCase() ||
          (item.item_name || '').toLowerCase().includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes((item.item_name || '').toLowerCase())
      );
      if (found) matchedSvcId = found.id;
    }

    if (matchedSvcId) {
      setSelectedServiceId(matchedSvcId);
      await fetchServiceAttributes(matchedSvcId);
    } else {
      setSelectedServiceId('');
      setReportAttributes([]);
    }

    setIsModalOpen(true);
  };

  const handleCompleteQueueItem = async (itemId: string) => {
    try {
      await apiRequest(`/diagnostics/queue/${itemId}/complete`, {
        method: 'POST',
      });
      toast.success('Queue item marked as completed');
      loadQueue();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete queue item');
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const q = testTypeFilter ? `?testType=${testTypeFilter}` : '';
      const data = await apiRequest(`/diagnostics/reports${q}`);
      setReports(data || []);

      const pts = await apiRequest('/patients');
      setPatients(pts || []);
      if (pts && pts.length > 0) {
        setSelectedPatientId(pts[0].id);
      }

      const emps = await apiRequest('/hr/employees').catch(() => []);
      setEmployees(emps || []);

      const svcs = await apiRequest('/diagnostics/services').catch(() => []);
      setDiagnosticServices(svcs || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);

      const token = typeof window !== 'undefined' ? localStorage.getItem('aegis_token') : null;
      const activeCenterId = typeof window !== 'undefined' ? localStorage.getItem('aegis_active_center_id') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (activeCenterId) headers['x-center-id'] = activeCenterId;

      const res = await fetch(`${getApiBase()}/storage/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();
      if (data.fileUrl) {
        setUploadedUrls([...uploadedUrls, data.fileUrl]);
        toast.success('File uploaded successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error uploading file to MinIO/Storage');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenEditReport = async (r: any) => {
    setEditingReport(r);
    setSelectedInvoiceItemId(null);
    setActiveQueueItem({
      invoice: {
        patient: r.patient,
        invoice_number: r.report_number,
      },
      item_name: r.test_name,
    });
    setSelectedPatientId(r.patient_id || r.patient?.id || '');
    setTestType(r.test_type || 'USG');
    setTestName(r.test_name || '');
    setFindings(r.findings || '');
    setImpression(r.impression || '');
    setSelectedServiceId(r.service_id || '');

    // Map existing attribute results if available
    if (r.attribute_results && Array.isArray(r.attribute_results) && r.attribute_results.length > 0) {
      setReportAttributes(
        r.attribute_results.map((ar: any, idx: number) => ({
          attributeId: ar.attribute_id,
          attributeName: ar.attribute_name,
          attributeUnit: ar.attribute_unit || '',
          referenceRange: ar.reference_range || '',
          value: ar.value || '',
          flag: ar.flag || 'NORMAL',
          displayOrder: ar.display_order || idx + 1,
        }))
      );
    } else if (r.service_id) {
      await fetchServiceAttributes(r.service_id);
    } else {
      setReportAttributes([]);
    }

    let urls: string[] = [];
    if (r.attachments) {
      try {
        urls = typeof r.attachments === 'string' ? JSON.parse(r.attachments) : r.attachments;
      } catch (e) { }
    }
    setUploadedUrls(Array.isArray(urls) ? urls : []);
    setIsModalOpen(true);
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanAttributeResults = reportAttributes
        .filter((a) => a.attributeName && a.attributeName.trim())
        .map((a, idx) => ({
          attributeId: a.attributeId || undefined,
          attributeName: a.attributeName.trim(),
          attributeUnit: a.attributeUnit?.trim() || undefined,
          referenceRange: a.referenceRange?.trim() || undefined,
          value: a.value?.trim() || '',
          flag: a.flag || 'NORMAL',
          displayOrder: a.displayOrder || idx + 1,
        }));

      if (editingReport) {
        await apiRequest(`/diagnostics/reports/${editingReport.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            serviceId: selectedServiceId || undefined,
            testType,
            testName,
            findings,
            impression,
            attachments: uploadedUrls,
            attributeResults: cleanAttributeResults,
          }),
        });

        setIsModalOpen(false);
        setEditingReport(null);
        setSelectedInvoiceItemId(null);
        setActiveQueueItem(null);
        setSelectedServiceId('');
        setReportAttributes([]);
        setFindings('');
        setImpression('');
        setUploadedUrls([]);
        loadReports();
        loadQueue();
        toast.success('Diagnostic report updated successfully');
      } else {
        await apiRequest('/diagnostics/reports', {
          method: 'POST',
          body: JSON.stringify({
            patientId: selectedPatientId,
            serviceId: selectedServiceId || undefined,
            testType,
            testName,
            findings,
            impression,
            attachments: uploadedUrls,
            invoiceItemId: selectedInvoiceItemId || undefined,
            attributeResults: cleanAttributeResults,
          }),
        });

        setIsModalOpen(false);
        setSelectedInvoiceItemId(null);
        setActiveQueueItem(null);
        setSelectedServiceId('');
        setReportAttributes([]);
        setFindings('');
        setImpression('');
        setUploadedUrls([]);
        toast.success('Diagnostic report created successfully');
        loadReports();
        loadQueue();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOff = async () => {
    if (!targetReport) return;
    try {
      await apiRequest(`/diagnostics/reports/${targetReport.id}/signoff`, {
        method: 'PATCH',
        body: JSON.stringify({
          digitalSignature:
            signatureText ||
            `DIGITAL-SIG-${user?.firstName?.toUpperCase()}-${Date.now()}`,
          impression: targetReport.impression,
        }),
      });

      setSignOffModalOpen(false);
      toast.success('Report digitally signed and finalized');
      loadReports();
    } catch (err: any) {
      toast.error(err.message || 'Sign-off failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Diagnostics, Lab & USG Imaging
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pathologist digital sign-off and imaging records for{' '}
            <span className="font-semibold text-foreground">
              {activeCenter?.name}
            </span>
          </p>
        </div>

        {/* {hasPermission('diagnostics:reports:write') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Lab / USG Report</span>
          </button>
        )} */}
      </div>

      {/* Patient Diagnostics Queue Section */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600 dark:text-purple-400">
              <ListOrdered className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  Patient Diagnostics Queue
                </h2>
                <span className="rounded-full bg-purple-100 dark:bg-purple-900/40 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                  {queueItems.length} Waiting
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Invoiced diagnostic orders waiting for USG, Lab Pathology, X-Ray, and ECG
              </p>
            </div>
          </div>

          <button
            onClick={loadQueue}
            disabled={queueLoading}
            className="self-start sm:self-auto flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh queue"
          >
            <RotateCcw
              className={`h-3 w-3 ${queueLoading ? 'animate-spin' : ''}`}
            />
            <span>Refresh Queue</span>
          </button>
        </div>

        {/* Modality Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['ALL', 'USG', 'LAB', 'XRAY', 'ECG'] as const).map((tab) => {
            const count =
              tab === 'ALL'
                ? queueItems.length
                : queueItems.filter(
                  (q) => resolveQueueItemModality(q) === tab
                ).length;
            const isSelected = selectedQueueTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setSelectedQueueTab(tab)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${isSelected
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span>{tab === 'ALL' ? 'All Waiting' : tab}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Queue Items List */}
        {(() => {
          const filteredQueue = queueItems.filter((item) => {
            if (selectedQueueTab === 'ALL') return true;
            return resolveQueueItemModality(item) === selectedQueueTab;
          });

          if (queueLoading) {
            return (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading diagnostics queue...
              </div>
            );
          }

          if (filteredQueue.length === 0) {
            return (
              <div className="py-8 text-center space-y-1 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                <Clock className="h-6 w-6 mx-auto opacity-30 text-muted-foreground" />
                <p className="font-semibold text-foreground">Queue is Empty</p>
                <p className="text-[11px]">
                  No patients waiting in {selectedQueueTab === 'ALL' ? 'diagnostics' : selectedQueueTab} queue.
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredQueue.map((item, index) => {
                const pt = item.invoice?.patient;
                const modality = resolveQueueItemModality(item);

                const badgeColor =
                  modality === 'USG'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : modality === 'LAB'
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : modality === 'XRAY'
                        ? 'bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';

                return (
                  <div
                    key={item.id}
                    className="relative rounded-xl border border-border bg-card p-4 shadow-sm hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-mono text-[10px] font-bold text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            #{index + 1}
                          </span>
                          <span className="text-purple-600 dark:text-purple-400">
                            {pt?.uhid}
                          </span>
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}
                        >
                          {modality}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-foreground">
                          {pt?.first_name} {pt?.last_name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{pt?.gender || 'N/A'}</span>
                          {pt?.blood_group && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                {pt.blood_group}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span>{pt?.phone}</span>
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">
                            {item.item_name}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            Qty: {item.quantity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                          <span>Inv: {item.invoice?.invoice_number}</span>
                          <span>
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {hasPermission('diagnostics:reports:write') && (
                        <button
                          onClick={() => handleAttendQueueItem(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Perform Test</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleCompleteQueueItem(item.id)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-border hover:bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        title="Mark Done without report"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Done</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Report Section Filter Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search by Patient / Report # */}
            <div className="relative flex-1 min-w-[160px] max-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={reportPatientSearch}
                onChange={(e) => setReportPatientSearch(e.target.value)}
                placeholder="Filter by Patient or Report #..."
                className="w-full rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>

            {/* Filter by Doctor / Pathologist */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Doctor/Technician:</span>
              <select
                value={reportDoctorFilter}
                onChange={(e) => setReportDoctorFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
              >
                <option value="ALL">All Staff</option>
                {employees
                  .filter((e) => e.user)
                  .map((e) => (
                    <option key={e.user.id} value={e.user.id}>
                      Dr. {e.user.first_name} {e.user.last_name} ({e.designation || 'Staff'})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Date Filter (Daily by default) */}
          <DateRangeFilter value={reportDateFilter} onChange={setReportDateFilter} />
        </div>

        {/* Filter Tabs (Modality) */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          {['', 'USG', 'LAB', 'XRAY', 'ECG'].map((type) => (
            <button
              key={type}
              onClick={() => setTestTypeFilter(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${testTypeFilter === type
                ? 'bg-blue-600 text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
              {type === '' ? 'All Modalities' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      {(() => {
        const displayedReports = reports.filter((r) => {
          // 1. Date filter (Daily by default)
          if (!filterMatchesDate(r.created_at, reportDateFilter)) return false;

          // 2. Doctor filter
          if (
            reportDoctorFilter !== 'ALL' &&
            r.doctor_id !== reportDoctorFilter &&
            r.pathologist_id !== reportDoctorFilter
          ) {
            return false;
          }

          // 3. Search query
          if (reportPatientSearch.trim()) {
            const q = reportPatientSearch.trim().toLowerCase();
            const pName = `${r.patient?.first_name || ''} ${r.patient?.last_name || ''}`.toLowerCase();
            const uhid = (r.patient?.uhid || '').toLowerCase();
            const repNum = (r.report_number || '').toLowerCase();
            const tName = (r.test_name || '').toLowerCase();
            if (
              !pName.includes(q) &&
              !uhid.includes(q) &&
              !repNum.includes(q) &&
              !tName.includes(q)
            ) {
              return false;
            }
          }

          return true;
        });

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 py-12 text-center text-xs text-muted-foreground">
                Loading diagnostic reports...
              </div>
            ) : displayedReports.length === 0 ? (
              <div className="col-span-2 py-16 text-center text-xs text-muted-foreground space-y-1">
                <Activity className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
                <p className="font-semibold text-foreground">
                  No Diagnostic Reports Found
                </p>
                <p className="text-[11px]">No reports match the selected date or filter criteria.</p>
              </div>
            ) : (
              displayedReports.map((r) => {
                const isSigned = r.status === 'SIGNED_OFF';
                return (
                  <div
                    key={r.id}
                    className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                          {r.report_number}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${isSigned
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                        >
                          {isSigned ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          <span>{r.status}</span>
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {r.test_name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          Patient: <span className="font-semibold text-foreground">{r.patient?.first_name} {r.patient?.last_name}</span> ({r.patient?.uhid})
                        </p>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">
                          Clinical Findings & Impression
                        </span>
                        <p className="text-[11px] text-foreground leading-relaxed line-clamp-3">
                          {r.findings}
                        </p>
                        {r.impression && (
                          <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 mt-1">
                            Impression: {r.impression}
                          </p>
                        )}
                      </div>

                      {/* Recorded Lab Attributes Summary */}
                      {r.attribute_results && r.attribute_results.length > 0 && (
                        <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                              <FlaskConical className="h-3 w-3" />
                              <span>Lab Parameters ({r.attribute_results.length})</span>
                            </span>
                            <span className="text-[9px] font-mono text-muted-foreground">Relational</span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {r.attribute_results.slice(0, 4).map((ar: any) => (
                              <div
                                key={ar.id || ar.attribute_name}
                                className="flex items-center justify-between rounded bg-card px-2 py-1 text-[11px] border border-border/60"
                              >
                                <span className="truncate text-muted-foreground font-medium pr-1">
                                  {ar.attribute_name}:
                                </span>
                                <span
                                  className={`font-mono font-bold shrink-0 ${
                                    ar.flag === 'HIGH' || ar.flag === 'ABNORMAL' || ar.flag === 'POSITIVE'
                                      ? 'text-red-600 dark:text-red-400'
                                      : ar.flag === 'LOW'
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-foreground'
                                  }`}
                                >
                                  {ar.value || '—'} {ar.attribute_unit || ''}
                                </span>
                              </div>
                            ))}
                          </div>
                          {r.attribute_results.length > 4 && (
                            <p className="text-[10px] text-muted-foreground text-center font-medium">
                              +{r.attribute_results.length - 4} more parameters recorded
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/80 text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setViewingReport(r);
                            setViewReportModalOpen(true);
                          }}
                          className="flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors shadow-sm"
                          title="View & Print Laboratory Report"
                        >
                          <Printer className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                          <span>View / Print</span>
                        </button>

                        {hasPermission('diagnostics:reports:write') && (
                          <button
                            onClick={() => handleOpenEditReport(r)}
                            className="flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors shadow-sm"
                            title="Edit Diagnostic Report"
                          >
                            <Pencil className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span>Edit</span>
                          </button>
                        )}

                        {isSigned ? (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Pathologist Verified</span>
                          </div>
                        ) : hasPermission('diagnostics:reports:signoff') ? (
                          <button
                            onClick={() => {
                              setTargetReport(r);
                              setSignOffModalOpen(true);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>Digital Sign-Off</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-amber-600 font-medium">
                            Pending Pathologist Review
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}

      {/* New / Edit Diagnostic Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground">
                {editingReport
                  ? `Edit Diagnostic Report (${editingReport.report_number})`
                  : 'Create Diagnostic / Lab / USG Report'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingReport(null);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Patient *
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      (() => {
                        const pt =
                          activeQueueItem?.invoice?.patient ||
                          patients.find((p) => p.id === selectedPatientId);
                        return pt
                          ? `${pt.uhid ? `${pt.uhid} - ` : ''}${pt.first_name || ''} ${pt.last_name || ''}`.trim()
                          : 'No patient selected';
                      })()
                    }
                    className="w-full rounded-lg border border-input bg-muted/60 p-2 font-medium text-foreground outline-none cursor-not-allowed select-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Modality / Test Type *
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      {
                        USG: 'USG (Ultrasound)',
                        LAB: 'Laboratory Pathology',
                        XRAY: 'Digital X-Ray Radiograph',
                        ECG: '12-Lead Electrocardiogram',
                      }[testType] || testType
                    }
                    className="w-full rounded-lg border border-input bg-muted/60 p-2 font-medium text-foreground outline-none cursor-not-allowed select-none"
                  />
                </div>
              </div>

              {/* Relational Diagnostic Service Master (Read-only) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground flex items-center gap-1.5">
                    <FlaskConical className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Diagnostic Service Master * (Auto-Loads Lab Attributes)</span>
                  </label>
                  {selectedServiceId && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Attributes Mapped</span>
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  readOnly
                  value={
                    (() => {
                      const svc = diagnosticServices.find((s) => s.id === selectedServiceId);
                      if (svc) {
                        return `${svc.code ? `${svc.code} - ` : ''}${svc.name}${svc.category ? ` (${svc.category.name})` : ''}`;
                      }
                      return activeQueueItem?.item_name || testName || 'Diagnostic Service Master';
                    })()
                  }
                  className="w-full rounded-lg border border-input bg-muted/60 p-2 font-medium text-foreground outline-none cursor-not-allowed select-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Test Name *</label>
                <input
                  type="text"
                  readOnly
                  value={testName}
                  className="w-full rounded-lg border border-input bg-muted/60 p-2 font-medium text-foreground outline-none cursor-not-allowed select-none"
                />
              </div>

              {/* Relational Lab Test Attributes & Parameters Results Table */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h4 className="font-bold text-foreground text-xs">
                        Relational Test Attributes & Measured Values
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Service-wise attributes automatically fetched and mapped to this report
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                      {reportAttributes.length} Parameters
                    </span>
                    <button
                      type="button"
                      onClick={handleAddCustomAttribute}
                      className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-muted shadow-xs transition-colors"
                    >
                      <Plus className="h-3 w-3 text-blue-600" />
                      <span>Add Parameter</span>
                    </button>
                  </div>
                </div>

                {loadingAttributes ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    <RotateCcw className="h-4 w-4 animate-spin mx-auto mb-1 text-purple-600" />
                    Fetching service attributes and reference ranges...
                  </div>
                ) : reportAttributes.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground space-y-1">
                    <p className="font-medium">No attributes mapped to this service yet.</p>
                    <p className="text-[10px]">
                      Select a service master above or click &quot;Add Parameter&quot; to define test values.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border/80 text-[10px] font-semibold uppercase text-muted-foreground">
                          <th className="py-1.5 px-2">Parameter</th>
                          <th className="py-1.5 px-2 w-32">Measured Result *</th>
                          <th className="py-1.5 px-2 w-20">Unit</th>
                          <th className="py-1.5 px-2 w-40">Reference Range</th>
                          <th className="py-1.5 px-2 w-28">Flag</th>
                          <th className="py-1.5 px-2 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {reportAttributes.map((attr, idx) => (
                          <tr key={idx} className="hover:bg-muted/40 transition-colors">
                            <td className="py-1.5 px-2 font-medium text-foreground">
                              {attr.attributeId ? (
                                <span className="font-semibold">{attr.attributeName}</span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Parameter name"
                                  value={attr.attributeName}
                                  onChange={(e) =>
                                    handleAttributeChange(idx, 'attributeName', e.target.value)
                                  }
                                  className="w-full rounded border border-input bg-background px-2 py-1 text-xs"
                                />
                              )}
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                placeholder="e.g. 14.2 or Normal"
                                value={attr.value}
                                onChange={(e) =>
                                  handleAttributeChange(idx, 'value', e.target.value)
                                }
                                className="w-full rounded border border-input bg-background px-2 py-1 font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[11px] text-muted-foreground">
                              {attr.attributeId ? (
                                attr.attributeUnit || '—'
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Unit"
                                  value={attr.attributeUnit || ''}
                                  onChange={(e) =>
                                    handleAttributeChange(idx, 'attributeUnit', e.target.value)
                                  }
                                  className="w-full rounded border border-input bg-background px-1.5 py-1 text-xs"
                                />
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-[11px] text-muted-foreground">
                              {attr.attributeId ? (
                                <span className="truncate block max-w-[160px]" title={attr.referenceRange}>
                                  {attr.referenceRange || '—'}
                                </span>
                              ) : (
                                <input
                                  type="text"
                                  placeholder="Ref range"
                                  value={attr.referenceRange || ''}
                                  onChange={(e) =>
                                    handleAttributeChange(idx, 'referenceRange', e.target.value)
                                  }
                                  className="w-full rounded border border-input bg-background px-1.5 py-1 text-xs"
                                />
                              )}
                            </td>
                            <td className="py-1.5 px-2">
                              <select
                                value={attr.flag || 'NORMAL'}
                                onChange={(e) =>
                                  handleAttributeChange(idx, 'flag', e.target.value)
                                }
                                className={`w-full rounded border border-input bg-background px-1.5 py-1 text-[11px] font-bold ${
                                  attr.flag === 'HIGH' || attr.flag === 'ABNORMAL' || attr.flag === 'POSITIVE'
                                    ? 'text-red-600 dark:text-red-400'
                                    : attr.flag === 'LOW'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                <option value="NORMAL">NORMAL</option>
                                <option value="HIGH">HIGH</option>
                                <option value="LOW">LOW</option>
                                <option value="ABNORMAL">ABNORMAL</option>
                                <option value="POSITIVE">POSITIVE</option>
                                <option value="NEGATIVE">NEGATIVE</option>
                              </select>
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveAttribute(idx)}
                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                title="Remove parameter"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Diagnostic Findings (Rich-Text Report) *
                </label>
                <textarea
                  required
                  rows={4}
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Enter detailed clinical findings (e.g. Liver shows normal parenchymal echogenicity, gallbladder lumen is clear without calculi...)"
                  className="w-full rounded-lg border border-input bg-background p-2.5 outline-none leading-relaxed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Diagnostic Impression / Conclusion
                </label>
                <input
                  type="text"
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  placeholder="e.g. Normal abdominal ultrasound study"
                  className="w-full rounded-lg border border-input bg-background p-2 outline-none"
                />
              </div>

              {/* MinIO / S3 Image Attachments */}
              <div className="space-y-2 border-t border-border pt-3">
                <label className="font-semibold text-foreground flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-blue-500" />
                  <span>Attach DICOM / Imaging Scans (MinIO / S3 Storage)</span>
                </label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploading && (
                  <p className="text-[11px] text-blue-600">
                    Uploading image to medical records bucket...
                  </p>
                )}
                {uploadedUrls.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {uploadedUrls.map((url, i) => (
                      <span
                        key={i}
                        className="rounded bg-muted px-2 py-1 text-[10px] font-mono text-foreground"
                      >
                        Attachment {i + 1}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingReport(null);
                  }}
                  className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {submitting
                    ? editingReport
                      ? 'Saving Changes...'
                      : 'Saving...'
                    : editingReport
                      ? 'Save Changes'
                      : 'Save Diagnostic Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View & Print Report Modal */}
      {viewReportModalOpen && viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in">
          <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Actions Bar (hidden on print) */}
            <div className="flex items-center justify-between border-b border-border pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-foreground">
                  Diagnostic & Laboratory Pathology Report ({viewingReport.report_number})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 text-xs font-semibold shadow-xs transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewReportModalOpen(false);
                    setViewingReport(null);
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Printable Pathology Sheet */}
            <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
              {/* Center Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-blue-900 uppercase">
                    {activeCenter?.name || 'Central Health Diagnostic Center'}
                  </h1>
                  <p className="text-xs text-slate-600 font-medium">
                    {activeCenter?.address || 'Medical Avenue, Diagnostic Tower'}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Phone: {activeCenter?.phone || '+880 1700-000000'} | Automated Pathology & Imaging Records
                  </p>
                </div>
                <div className="text-right sm:border-l-2 sm:border-slate-200 sm:pl-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                    Department of Laboratory Medicine
                  </span>
                  <p className="font-mono text-sm font-bold text-slate-900 mt-1">
                    {viewingReport.report_number}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Date: {new Date(viewingReport.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Patient & Order Demographics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Patient Name</span>
                  <span className="font-bold text-slate-900">
                    {viewingReport.patient?.first_name} {viewingReport.patient?.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">UHID / Patient ID</span>
                  <span className="font-mono font-bold text-blue-700">
                    {viewingReport.patient?.uhid || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Age / Gender</span>
                  <span className="font-medium text-slate-800">
                    {viewingReport.patient?.age ? `${viewingReport.patient.age} Yrs` : '—'} / {viewingReport.patient?.gender || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Test Modality</span>
                  <span className="font-bold text-slate-800">
                    {viewingReport.test_type} Examination
                  </span>
                </div>
              </div>

              {/* Investigation Header */}
              <div className="bg-slate-900 text-white px-4 py-2 rounded flex items-center justify-between">
                <span className="font-bold text-sm tracking-wide uppercase">
                  Investigation: {viewingReport.test_name}
                </span>
                <span className="text-[11px] font-mono opacity-80">
                  Status: {viewingReport.status}
                </span>
              </div>

              {/* Relational Attributes & Parameters Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Laboratory Observed Parameters & Reference Intervals
                  </h4>
                  {viewingReport.attribute_results && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {viewingReport.attribute_results.length} parameters analyzed
                    </span>
                  )}
                </div>

                {viewingReport.attribute_results && viewingReport.attribute_results.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                          <th className="py-2 px-3">Test Investigation / Parameter</th>
                          <th className="py-2 px-3">Observed Result</th>
                          <th className="py-2 px-3">Unit</th>
                          <th className="py-2 px-3">Biological Reference Interval</th>
                          <th className="py-2 px-3 text-center">Assessment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {viewingReport.attribute_results.map((ar: any, idx: number) => {
                          const isAbnormal =
                            ar.flag === 'HIGH' || ar.flag === 'ABNORMAL' || ar.flag === 'POSITIVE';
                          const isLow = ar.flag === 'LOW';

                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {ar.attribute_name}
                              </td>
                              <td
                                className={`py-2 px-3 font-mono font-bold ${
                                  isAbnormal
                                    ? 'text-red-600'
                                    : isLow
                                    ? 'text-amber-600'
                                    : 'text-slate-900'
                                }`}
                              >
                                {ar.value || '—'}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">
                                {ar.attribute_unit || '—'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 text-[11px]">
                                {ar.reference_range || '—'}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    isAbnormal
                                      ? 'bg-red-100 text-red-800'
                                      : isLow
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {ar.flag || 'NORMAL'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded border border-slate-200">
                    No discrete quantitative parameters recorded. See findings below.
                  </p>
                )}
              </div>

              {/* Clinical Findings */}
              <div className="space-y-1.5 border-t border-slate-200 pt-4 text-xs">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                  Clinical Findings & Descriptive Notes
                </h4>
                <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed font-sans text-xs">
                  {viewingReport.findings}
                </div>
              </div>

              {/* Impression */}
              {viewingReport.impression && (
                <div className="space-y-1 text-xs">
                  <h4 className="font-bold text-blue-900 uppercase text-[11px] tracking-wider">
                    Diagnostic Impression & Recommendation
                  </h4>
                  <div className="bg-blue-50/80 p-3 rounded border border-blue-200 text-blue-950 font-semibold leading-relaxed">
                    {viewingReport.impression}
                  </div>
                </div>
              )}

              {/* Digital Authentication Block */}
              <div className="border-t-2 border-slate-200 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Electronically Signed & Authenticated</span>
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">
                    Signature Hash: {viewingReport.digital_signature || `AUTH-${viewingReport.id?.substring(0, 8)}`}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Verified on: {viewingReport.signed_at ? new Date(viewingReport.signed_at).toLocaleString() : new Date(viewingReport.updated_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
                  <p className="font-bold text-slate-900">
                    {viewingReport.pathologist
                      ? `Dr. ${viewingReport.pathologist.first_name} ${viewingReport.pathologist.last_name}`
                      : 'Consultant Pathologist & Radiologist'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    MBBS, FCPS / MD (Pathology & Imaging)
                  </p>
                  <p className="text-[9px] text-slate-400">
                    Verified Digital Laboratory Signature
                  </p>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="text-center pt-2 border-t border-slate-100 text-[9px] text-slate-400">
                This is a computer generated diagnostic report. Please correlate clinically. All diagnostic attributes are preserved in secure electronic records.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pathologist Digital Sign-Off Modal */}
      {signOffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-foreground">
                  Pathologist Digital Sign-Off
                </h3>
              </div>
              <button
                onClick={() => setSignOffModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="font-semibold text-foreground">
                  {targetReport?.test_name}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Report #{targetReport?.report_number}
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Digital Signature Key / Pin
                </label>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="Enter cryptographic signature / verification key"
                  className="w-full rounded-lg border border-input bg-background p-2 outline-none font-mono text-xs"
                />
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                By clicking Sign-Off, you officially authenticate these findings as the licensed pathologist. This record will be cryptographically marked as SIGNED_OFF.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSignOffModalOpen(false)}
                  className="rounded-lg border border-border px-3.5 py-2 font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSignOff}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 font-bold text-white shadow-sm"
                >
                  Sign & Authenticate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
