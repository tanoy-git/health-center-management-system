'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Stethoscope,
  Plus,
  Trash2,
  FileDown,
  Search,
  User,
  Activity,
  Calendar,
  CheckCircle,
  X,
  FileText,
  Clock,
  ListOrdered,
  Users,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

import DateRangeFilter, {
  DateFilterValue,
  getDefaultDateFilter,
  filterMatchesDate,
} from '@/components/DateRangeFilter';

interface MedicineRow {
  medicineId?: string;
  medicineName: string;
  dosage: string;
  duration: string;
  instructions: string;
}

export default function PrescriptionsPage() {
  const { activeCenter, hasPermission } = useAuth();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for Issued Prescriptions
  const [rxDateFilter, setRxDateFilter] = useState<DateFilterValue>(getDefaultDateFilter());
  const [rxDoctorFilter, setRxDoctorFilter] = useState('ALL');
  const [rxPatientSearch, setRxPatientSearch] = useState('');

  // Patient Queue State
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [selectedQueueCategory, setSelectedQueueCategory] = useState<string>('ALL');
  const [selectedInvoiceItemId, setSelectedInvoiceItemId] = useState<string | null>(null);
  const [activeQueueItem, setActiveQueueItem] = useState<any | null>(null);

  // New Prescription Modal State
  const [isNewRxModalOpen, setIsNewRxModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [vitals, setVitals] = useState({
    bp: '120/80',
    pulse: '72',
    temp: '98.6F',
    weight: '70kg',
    spo2: '99',
  });
  const [followUpDate, setFollowUpDate] = useState('');
  const [rxItems, setRxItems] = useState<MedicineRow[]>([
    {
      medicineId: '',
      medicineName: '',
      dosage: '1-0-1',
      duration: '5 days',
      instructions: 'After meals with plenty of water',
    },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    loadQueue();
  }, [activeCenter]);

  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const q = await apiRequest('/clinical/queue?category=CONSULTATION');
      setQueueItems(q || []);
    } catch (e) {
      console.error('Error loading patient queue:', e);
    } finally {
      setQueueLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const rxList = await apiRequest('/clinical/prescriptions');
      setPrescriptions(rxList || []);

      const ptList = await apiRequest('/patients');
      setPatients(ptList || []);
      if (ptList && ptList.length > 0) {
        setSelectedPatientId(ptList[0].id);
      }

      const empList = await apiRequest('/hr/employees').catch(() => []);
      setEmployees(empList || []);

      const medList = await apiRequest('/clinical/medicines');
      setMedicines(medList || []);
      if (medList && medList.length > 0) {
        setRxItems([
          {
            medicineId: medList[0].id,
            medicineName: `${medList[0].name} (${medList[0].strength})`,
            dosage: '1-0-1',
            duration: '5 days',
            instructions: 'After meals',
          },
        ]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicineRow = () => {
    setRxItems([
      ...rxItems,
      {
        medicineId: medicines[0]?.id || '',
        medicineName: medicines[0]
          ? `${medicines[0].name} (${medicines[0].strength})`
          : '',
        dosage: '1-0-1',
        duration: '5 days',
        instructions: 'After meals',
      },
    ]);
  };

  const handleUpdateMedicineRow = (
    index: number,
    field: keyof MedicineRow,
    value: string,
  ) => {
    const updated = [...rxItems];
    updated[index][field] = value;
    if (field === 'medicineId') {
      const med = medicines.find((m) => m.id === value);
      if (med) {
        updated[index].medicineName = `${med.name} (${med.strength})`;
      }
    }
    setRxItems(updated);
  };

  const handleRemoveMedicineRow = (index: number) => {
    if (rxItems.length <= 1) return;
    const updated = [...rxItems];
    updated.splice(index, 1);
    setRxItems(updated);
  };

  const handleDownloadPdf = async (id: string, rxNumber: string) => {
    try {
      const blob = await apiRequest<Blob>(`/clinical/prescriptions/${id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${rxNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      alert(e.message || 'Error generating prescription PDF');
    }
  };

  const handleAttendQueue = (item: any) => {
    setActiveQueueItem(item);
    setSelectedInvoiceItemId(item.id);
    if (item.invoice?.patient?.id) {
      setSelectedPatientId(item.invoice.patient.id);
    }
    setDiagnosis(`Service Investigation: ${item.item_name} (${item.category})`);
    setClinicalNotes(
      `Billed under Invoice #${item.invoice?.invoice_number}. Awaiting clinical report/prescription.`
    );
    setIsNewRxModalOpen(true);
  };

  const handleCompleteQueueItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/clinical/queue/${itemId}/complete`, { method: 'POST' });
      loadQueue();
    } catch (err: any) {
      alert(err.message || 'Error updating queue item');
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      alert('Please select a patient');
      return;
    }
    setSubmitting(true);
    try {
      const newRx = await apiRequest('/clinical/prescriptions', {
        method: 'POST',
        body: JSON.stringify({
          patientId: selectedPatientId,
          invoiceItemId: selectedInvoiceItemId || undefined,
          diagnosis,
          clinicalNotes,
          vitals,
          followUpDate: followUpDate || null,
          items: rxItems,
        }),
      });

      setIsNewRxModalOpen(false);
      setSelectedInvoiceItemId(null);
      setActiveQueueItem(null);
      loadData();
      loadQueue();

      // Automatically trigger PDF download
      handleDownloadPdf(newRx.id, newRx.prescription_number);
    } catch (err: any) {
      alert(err.message || 'Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Clinical Prescription Engine
            </h1>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
              PDF Generation Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Issue verified digital prescriptions with automatic PDF formatting for{' '}
            <span className="font-semibold text-foreground">
              {activeCenter?.name}
            </span>
          </p>
        </div>

        {hasPermission('clinical:prescription:write') && (
          <button
            onClick={() => {
              setSelectedInvoiceItemId(null);
              setActiveQueueItem(null);
              setDiagnosis('');
              setClinicalNotes('');
              setIsNewRxModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Write New Prescription</span>
          </button>
        )}
      </div>

      {/* Patient Queue Section */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden space-y-4 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <ListOrdered className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-foreground">
                  Patient Consultation Queue
                </h2>
                <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  {queueItems.length} Waiting
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Billed patients waiting for doctor consultation & prescription
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
            <span>Refresh</span>
          </button>
        </div>

        {/* Queue Items List */}
        {(() => {
          const filteredItems = queueItems;

          if (queueLoading) {
            return (
              <div className="py-10 text-center text-xs text-muted-foreground">
                Loading queue...
              </div>
            );
          }

          if (filteredItems.length === 0) {
            return (
              <div className="py-10 text-center space-y-1 text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                <Clock className="h-6 w-6 mx-auto opacity-30 text-muted-foreground" />
                <p className="font-semibold text-foreground">Queue is Empty</p>
                <p className="text-[11px]">
                  No patients waiting in {selectedQueueCategory.replace('_', ' ')} queue.
                </p>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredItems.map((item, index) => {
                const pt = item.invoice?.patient;
                const isUsg = item.category?.toUpperCase() === 'USG';
                const isLab = item.category?.toUpperCase() === 'LAB_TEST';
                const isProc = item.category?.toUpperCase() === 'PROCEDURE';

                const badgeColor = isUsg
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                  : isLab
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                    : isProc
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-border bg-background p-3.5 space-y-3 hover:border-blue-500/50 hover:shadow-sm transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                            #{index + 1}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                            {pt?.uhid || 'NO-UHID'}
                          </span>
                        </div>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${badgeColor}`}
                        >
                          {item.category}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xs font-bold text-foreground truncate">
                          {pt ? `${pt.first_name} ${pt.last_name}` : 'Unknown Patient'}
                        </h3>
                        <p className="text-[10px] text-muted-foreground">
                          {pt?.phone || 'No phone'} {pt?.gender ? `• ${pt.gender}` : ''}
                        </p>
                      </div>

                      <div className="p-2 rounded-lg bg-muted/40 text-[11px] space-y-0.5">
                        <p className="font-semibold text-foreground truncate">
                          {item.item_name}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Inv: {item.invoice?.invoice_number}</span>
                          <span>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                              : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => handleAttendQueue(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 py-1.5 text-[11px] font-bold text-white shadow-sm transition-colors"
                      >
                        <Stethoscope className="h-3 w-3" />
                        <span>Prescribe / Attend</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleCompleteQueueItem(item.id, e)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-border hover:bg-muted py-1.5 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        title="Mark as done (out of queue)"
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
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
      {/* Prescriptions Issued List & Filters */}
      <div className="space-y-3">
        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search by Patient / UHID / Rx # */}
            <div className="relative flex-1 min-w-[160px] max-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={rxPatientSearch}
                onChange={(e) => setRxPatientSearch(e.target.value)}
                placeholder="Filter by Patient, UHID, or Rx #..."
                className="w-full rounded-lg border border-input bg-background pl-8 pr-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-xs"
              />
            </div>

            {/* Filter by Doctor */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-muted-foreground">Doctor:</span>
              <select
                value={rxDoctorFilter}
                onChange={(e) => setRxDoctorFilter(e.target.value)}
                className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-xs"
              >
                <option value="ALL">All Doctors</option>
                {employees
                  .filter((e) => e.user)
                  .map((e) => (
                    <option key={e.user.id} value={e.user.id}>
                      Dr. {e.user.first_name} {e.user.last_name} ({e.designation || 'Doctor'})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Date Filter (Daily by default) */}
          <DateRangeFilter value={rxDateFilter} onChange={setRxDateFilter} />
        </div>

        {/* Table Box */}
        {(() => {
          const displayedPrescriptions = prescriptions.filter((rx) => {
            // 1. Date filter (Daily by default)
            if (!filterMatchesDate(rx.created_at, rxDateFilter)) return false;

            // 2. Doctor filter
            if (rxDoctorFilter !== 'ALL' && rx.doctor_id !== rxDoctorFilter) return false;

            // 3. Patient Name / UHID filter
            if (rxPatientSearch.trim()) {
              const q = rxPatientSearch.trim().toLowerCase();
              const pName = `${rx.patient?.first_name || ''} ${rx.patient?.last_name || ''}`.toLowerCase();
              const uhid = (rx.patient?.uhid || '').toLowerCase();
              const rxNum = (rx.prescription_number || '').toLowerCase();
              if (!pName.includes(q) && !uhid.includes(q) && !rxNum.includes(q)) return false;
            }

            return true;
          });

          return (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Prescriptions Issued ({displayedPrescriptions.length})
                  </span>
                  {displayedPrescriptions.length !== prescriptions.length && (
                    <span className="text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium px-2 py-0.5">
                      Filtered from {prescriptions.length} total
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Printable PDF generator with hospital header and doctor seal
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Loading prescriptions...
                </div>
              ) : displayedPrescriptions.length === 0 ? (
                <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
                  <Stethoscope className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
                  <p className="font-semibold text-foreground">
                    No Prescriptions Found
                  </p>
                  <p className="text-[11px]">
                    No issued prescriptions match the selected date or search criteria.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2.5 px-4">Rx Number</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Patient Demographics</th>
                        <th className="py-2.5 px-4">Diagnosis / Notes</th>
                        <th className="py-2.5 px-4">Medicines</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {displayedPrescriptions.map((rx) => (
                        <tr key={rx.id} className="hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                            <div>{rx.prescription_number}</div>
                            {rx.prescription_type === 'EYE' && (
                              <span className="inline-block rounded bg-cyan-100 dark:bg-cyan-950/60 px-1.5 py-0.2 text-[9px] font-bold text-cyan-700 dark:text-cyan-300">
                                EYE RX
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                            {new Date(rx.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-semibold text-foreground">
                              {rx.patient?.first_name} {rx.patient?.last_name}
                            </p>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {rx.patient?.uhid}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                            {rx.diagnosis || rx.clinical_notes || 'Routine checkup'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold">
                              {rx.items?.length || 0} drugs
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() =>
                                handleDownloadPdf(rx.id, rx.prescription_number)
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border hover:bg-muted px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 shadow-sm transition-colors"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>Download PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Write Prescription Modal */}
      {isNewRxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Generate Clinical Prescription
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Center: {activeCenter?.name} | Doctor Consultation & Rx Engine
                </p>
              </div>
              <button
                onClick={() => setIsNewRxModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePrescription} className="space-y-4 text-xs">
              {/* Linked Queue Item Banner */}
              {activeQueueItem && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-blue-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 uppercase">
                      {activeQueueItem.category} Queue
                    </span>
                    <span className="font-semibold text-foreground">
                      {activeQueueItem.item_name}
                    </span>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      (Invoice: {activeQueueItem.invoice?.invoice_number})
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Will auto-complete queue on submit
                  </span>
                </div>
              )}

              {/* Patient Selector */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Select Center Patient *
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background p-2 font-medium focus:ring-2 focus:ring-primary outline-none"
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
                    Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Vitals Form */}
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Patient Vitals
                </span>
                <div className="grid grid-cols-5 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground">BP (mmHg)</label>
                    <input
                      type="text"
                      value={vitals.bp}
                      onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                      placeholder="120/80"
                      className="w-full rounded border border-input bg-background p-1.5 text-center font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Pulse (bpm)</label>
                    <input
                      type="text"
                      value={vitals.pulse}
                      onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                      placeholder="72"
                      className="w-full rounded border border-input bg-background p-1.5 text-center font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Temp</label>
                    <input
                      type="text"
                      value={vitals.temp}
                      onChange={(e) => setVitals({ ...vitals, temp: e.target.value })}
                      placeholder="98.6F"
                      className="w-full rounded border border-input bg-background p-1.5 text-center font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Weight</label>
                    <input
                      type="text"
                      value={vitals.weight}
                      onChange={(e) => setVitals({ ...vitals, weight: e.target.value })}
                      placeholder="70kg"
                      className="w-full rounded border border-input bg-background p-1.5 text-center font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">SpO2 (%)</label>
                    <input
                      type="text"
                      value={vitals.spo2}
                      onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                      placeholder="99"
                      className="w-full rounded border border-input bg-background p-1.5 text-center font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Diagnosis & Clinical Notes */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Diagnosis</label>
                  <input
                    type="text"
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Bronchitis, Essential Hypertension"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Clinical Notes / Observations
                  </label>
                  <input
                    type="text"
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Patient reports persistent dry cough for 3 days"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              {/* Medicines Prescribed Table */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">
                    Prescribed Medications (Rx)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {rxItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center rounded-lg border border-border p-2.5 bg-background"
                    >
                      <div className="col-span-4">
                        <label className="text-[9px] text-muted-foreground block">
                          Medicine Catalog
                        </label>
                        <select
                          value={item.medicineId}
                          onChange={(e) =>
                            handleUpdateMedicineRow(
                              idx,
                              'medicineId',
                              e.target.value,
                            )
                          }
                          className="w-full rounded border border-input bg-card p-1 text-xs outline-none"
                        >
                          {medicines.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.strength}) - {m.form}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] text-muted-foreground block">
                          Dosage
                        </label>
                        <input
                          type="text"
                          value={item.dosage}
                          onChange={(e) =>
                            handleUpdateMedicineRow(idx, 'dosage', e.target.value)
                          }
                          placeholder="1-0-1"
                          className="w-full rounded border border-input bg-card p-1 text-xs outline-none"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[9px] text-muted-foreground block">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={item.duration}
                          onChange={(e) =>
                            handleUpdateMedicineRow(
                              idx,
                              'duration',
                              e.target.value,
                            )
                          }
                          placeholder="7 days"
                          className="w-full rounded border border-input bg-card p-1 text-xs outline-none"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="text-[9px] text-muted-foreground block">
                          Instructions
                        </label>
                        <input
                          type="text"
                          value={item.instructions}
                          onChange={(e) =>
                            handleUpdateMedicineRow(
                              idx,
                              'instructions',
                              e.target.value,
                            )
                          }
                          placeholder="After food"
                          className="w-full rounded border border-input bg-card p-1 text-xs outline-none"
                        />
                      </div>

                      <div className="col-span-1 text-right pt-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(idx)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewRxModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Generating PDF...' : 'Issue Prescription & PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
