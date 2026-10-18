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
} from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
  }, [activeCenter]);

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
          diagnosis,
          clinicalNotes,
          vitals,
          followUpDate: followUpDate || null,
          items: rxItems,
        }),
      });

      setIsNewRxModalOpen(false);
      loadData();

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
            onClick={() => setIsNewRxModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Write New Prescription</span>
          </button>
        )}
      </div>

      {/* Prescriptions List */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground">
            Prescriptions Issued ({prescriptions.length})
          </span>
          <span className="text-[11px] text-muted-foreground">
            Printable PDF generator with hospital header and doctor seal
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            Loading prescriptions...
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
            <Stethoscope className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
            <p className="font-semibold text-foreground">
              No Prescriptions Issued Yet
            </p>
            <p className="text-[11px]">
              Doctors can prescribe medications and produce clinical PDFs.
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
                {prescriptions.map((rx) => (
                  <tr key={rx.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {rx.prescription_number}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
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
                    <td className="py-3 px-4 text-right">
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
