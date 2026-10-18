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
} from 'lucide-react';

export default function DiagnosticsPage() {
  const { activeCenter, hasPermission, user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [testTypeFilter, setTestTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadReports();
  }, [activeCenter, testTypeFilter]);

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
        }),
      });

      setIsModalOpen(false);
      setFindings('');
      setImpression('');
      setUploadedUrls([]);
      loadReports();
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

        {hasPermission('diagnostics:reports:write') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Lab / USG Report</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        {['', 'USG', 'LAB', 'XRAY', 'ECG'].map((type) => (
          <button
            key={type}
            onClick={() => setTestTypeFilter(type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              testTypeFilter === type
                ? 'bg-blue-600 text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {type === '' ? 'All Reports' : type}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-12 text-center text-xs text-muted-foreground">
            Loading diagnostic reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="col-span-2 py-16 text-center text-xs text-muted-foreground space-y-1">
            <Activity className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
            <p className="font-semibold text-foreground">
              No Diagnostic Reports Found
            </p>
            <p className="text-[11px]">Create an ultrasound or lab report to begin.</p>
          </div>
        ) : (
          reports.map((r) => {
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
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        isSigned
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Patient *
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background p-2 font-medium outline-none"
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.uhid} - {p.first_name} {p.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Modality / Test Type *
                  </label>
                  <select
                    value={testType}
                    onChange={(e) => {
                      setTestType(e.target.value);
                      if (e.target.value === 'USG')
                        setTestName('Abdominal & Pelvic Ultrasound (USG)');
                      if (e.target.value === 'LAB')
                        setTestName('Complete Blood Count (CBC) with Differential');
                      if (e.target.value === 'XRAY')
                        setTestName('Chest PA Digital Radiograph');
                    }}
                    className="w-full rounded-lg border border-input bg-background p-2 font-medium outline-none"
                  >
                    <option value="USG">USG (Ultrasound)</option>
                    <option value="LAB">Laboratory Pathology</option>
                    <option value="XRAY">Digital X-Ray Radiograph</option>
                    <option value="ECG">12-Lead Electrocardiogram</option>
                  </select>
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
