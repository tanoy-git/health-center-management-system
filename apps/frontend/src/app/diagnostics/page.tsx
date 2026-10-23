'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
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

  // New Report Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [testType, setTestType] = useState('USG');
  const [testName, setTestName] = useState('Abdominal & Pelvic Ultrasound (USG)');
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleAttendQueueItem = (item: any) => {
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
    setIsModalOpen(true);
  };

  const handleCompleteQueueItem = async (itemId: string) => {
    try {
      await apiRequest(`/diagnostics/queue/${itemId}/complete`, {
        method: 'POST',
      });
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to complete queue item');
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

      const res = await fetch('/api/v1/storage/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.fileUrl) {
        setUploadedUrls([...uploadedUrls, data.fileUrl]);
      }
    } catch (err: any) {
      alert(err.message || 'Error uploading file to MinIO/Storage');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest('/diagnostics/reports', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientId,
          testType,
          testName,
          findings,
          impression,
          attachments: uploadedUrls,
          invoiceItemId: selectedInvoiceItemId || undefined,
        }),
      });

      setIsModalOpen(false);
      setSelectedInvoiceItemId(null);
      setActiveQueueItem(null);
      setFindings('');
      setImpression('');
      setUploadedUrls([]);
      loadReports();
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Failed to create report');
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
      loadReports();
    } catch (err: any) {
      alert(err.message || 'Sign-off failed');
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
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/80 text-xs">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>

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
                );
              })
            )}
          </div>
        );
      })()}

      {/* New Diagnostic Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground">
                Create Diagnostic / Lab / USG Report
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              {/* {activeQueueItem && (
                <div className="flex items-center justify-between rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 p-2.5 text-xs text-purple-900 dark:text-purple-200">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <span className="font-semibold">Linked Order:</span>{' '}
                      <span className="font-bold">
                        {activeQueueItem.item_name}
                      </span>{' '}
                      <span className="font-mono text-[11px] opacity-80">
                        ({activeQueueItem.invoice?.invoice_number})
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoiceItemId(null);
                      setActiveQueueItem(null);
                    }}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline font-semibold"
                  >
                    Unlink
                  </button>
                </div>
              )} */}

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

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Test Name *</label>
                <input
                  type="text"
                  required
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2 outline-none"
                />
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
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Diagnostic Report'}
                </button>
              </div>
            </form>
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
