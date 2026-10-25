'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import { toast } from '@/components/Toast';
import {
  Eye,
  Plus,
  Search,
  Calendar,
  User,
  Printer,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Activity,
  Layers,
  Sparkles,
  RefreshCw,
  Glasses,
  Trash2,
  Pill,
  Pencil,
} from 'lucide-react';
import DateRangeFilter, {
  DateFilterValue,
  getDefaultDateFilter,
  filterMatchesDate,
} from '@/components/DateRangeFilter';

interface QueuedItem {
  id: string;
  item_name: string;
  category: string;
  created_at: string;
  invoice: {
    id: string;
    invoice_number: string;
    patient: {
      id: string;
      uhid: string;
      first_name: string;
      last_name: string;
      gender: string;
      dob?: string;
      phone?: string;
    };
  };
}

interface EyePrescription {
  id: string;
  prescription_number: string;
  created_at: string;
  doctor_id: string;
  diagnosis?: string;
  clinical_notes?: string;
  follow_up_date?: string;
  patient: {
    id: string;
    uhid: string;
    first_name: string;
    last_name: string;
    gender: string;
    dob?: string;
  };
  items: any[];
  eye_data?: any;
}

interface MedicineCatalogItem {
  id: string;
  code?: string;
  name: string;
  generic_name?: string;
  form: string;
  strength: string;
  price?: number | string;
  status: string;
}

interface EyeDropRow {
  medicineId: string;
  medicineName: string;
  dosage: string;
  duration: string;
  instructions: string;
  isCustom?: boolean;
}

export default function EyePrescriptionsPage() {
  const { activeCenter, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [queue, setQueue] = useState<QueuedItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<EyePrescription[]>([]);
  const [medicines, setMedicines] = useState<MedicineCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters for History Tab
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter());
  const [searchQuery, setSearchQuery] = useState('');

  // Eye Examination Modal
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [editingEyeRx, setEditingEyeRx] = useState<EyePrescription | null>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueuedItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Eye Exam Form State
  const [eyeExamForm, setEyeExamForm] = useState({
    // Right Eye (OD)
    od_dist_ucva: '6/6',
    od_dist_bcva: '6/6',
    od_near_ucva: 'N6',
    od_near_bcva: 'N6',
    od_sph: '0.00',
    od_cyl: '0.00',
    od_axis: '0',
    od_add: '+0.00',
    od_iop: '14 mmHg',

    // Left Eye (OS)
    os_dist_ucva: '6/6',
    os_dist_bcva: '6/6',
    os_near_ucva: 'N6',
    os_near_bcva: 'N6',
    os_sph: '0.00',
    os_cyl: '0.00',
    os_axis: '0',
    os_add: '+0.00',
    os_iop: '14 mmHg',

    // Clinical Findings
    slit_lamp: 'Cornea clear, AC quiet, Iris normal, crystalline lens transparent',
    fundus: 'Disc normal pink, margins sharp, C/D ratio 0.3, vessels normal, macula normal',
    diagnosis: 'Refractive Error (Presbyopia / Myopia)',
    lens_type: 'Single Vision (Anti-Reflective ARC)',
    clinical_notes: 'Wear glasses for constant use / reading. Lubricating drops if eye strain occurs.',
    follow_up_date: '',
  });

  // Prescribed Eye Drops / Lubricants
  const [drops, setDrops] = useState<EyeDropRow[]>([]);

  useEffect(() => {
    if (activeCenter) {
      loadData();
    }
  }, [activeCenter, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load medicines catalog
      const medList = await apiRequest('/clinical/medicines').catch(() => []);
      setMedicines(Array.isArray(medList) ? medList : []);

      if (activeTab === 'queue') {
        const qData = await apiRequest('/clinical/queue?category=EYE');
        setQueue(Array.isArray(qData) ? qData : []);
      } else {
        const rxData = await apiRequest('/clinical/prescriptions?prescriptionType=EYE');
        setPrescriptions(Array.isArray(rxData) ? rxData : []);
      }
    } catch (err) {
      console.error('Failed to load eye clinical data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExam = (item: QueuedItem) => {
    setSelectedQueueItem(item);
    setErrorMsg(null);
    setDrops([]);
    setEyeExamForm({
      od_dist_ucva: '6/18',
      od_dist_bcva: '6/6',
      od_near_ucva: 'N12',
      od_near_bcva: 'N6',
      od_sph: '-1.00',
      od_cyl: '-0.50',
      od_axis: '90',
      od_add: '+1.50',
      od_iop: '15 mmHg',

      os_dist_ucva: '6/18',
      os_dist_bcva: '6/6',
      os_near_ucva: 'N12',
      os_near_bcva: 'N6',
      os_sph: '-1.00',
      os_cyl: '-0.50',
      os_axis: '90',
      os_add: '+1.50',
      os_iop: '15 mmHg',

      slit_lamp: 'Cornea clear, Anterior chamber quiet, Lens clear',
      fundus: 'Optic disc healthy, Cup/disc ratio 0.3, Macula normal',
      diagnosis: 'Compound Myopic Astigmatism with Presbyopia',
      lens_type: 'Progressive Blue-Cut Antireflective (ARC)',
      clinical_notes: 'Advised continuous wear for distance and near reading. 20-20-20 screen rule.',
      follow_up_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 6 months
    });
    setEditingEyeRx(null);
    setExamModalOpen(true);
  };

  const handleOpenEditEyeRx = (rx: EyePrescription) => {
    setEditingEyeRx(rx);
    setErrorMsg(null);
    setSelectedQueueItem({
      id: '',
      item_name: `Eye Exam (${rx.prescription_number})`,
      category: 'EYE',
      created_at: rx.created_at,
      invoice: {
        id: '',
        invoice_number: rx.prescription_number,
        patient: rx.patient,
      },
    });

    let eyeData: any = {};
    if (rx.eye_data) {
      try {
        eyeData = typeof rx.eye_data === 'string' ? JSON.parse(rx.eye_data) : rx.eye_data;
      } catch (e) { }
    }

    setEyeExamForm({
      od_dist_ucva: eyeData.od?.distUcva || eyeData.od_dist_ucva || '6/6',
      od_dist_bcva: eyeData.od?.distBcva || eyeData.od_dist_bcva || '6/6',
      od_near_ucva: eyeData.od?.nearUcva || eyeData.od_near_ucva || 'N6',
      od_near_bcva: eyeData.od?.nearBcva || eyeData.od_near_bcva || 'N6',
      od_sph: eyeData.od?.sph || eyeData.od_sph || '0.00',
      od_cyl: eyeData.od?.cyl || eyeData.od_cyl || '0.00',
      od_axis: eyeData.od?.axis || eyeData.od_axis || '0',
      od_add: eyeData.od?.add || eyeData.od_add || '+0.00',
      od_iop: eyeData.od?.iop || eyeData.od_iop || '14 mmHg',

      os_dist_ucva: eyeData.os?.distUcva || eyeData.os_dist_ucva || '6/6',
      os_dist_bcva: eyeData.os?.distBcva || eyeData.os_dist_bcva || '6/6',
      os_near_ucva: eyeData.os?.nearUcva || eyeData.os_near_ucva || 'N6',
      os_near_bcva: eyeData.os?.nearBcva || eyeData.os_near_bcva || 'N6',
      os_sph: eyeData.os?.sph || eyeData.os_sph || '0.00',
      os_cyl: eyeData.os?.cyl || eyeData.os_cyl || '0.00',
      os_axis: eyeData.os?.axis || eyeData.os_axis || '0',
      os_add: eyeData.os?.add || eyeData.os_add || '+0.00',
      os_iop: eyeData.os?.iop || eyeData.os_iop || '14 mmHg',

      slit_lamp:
        eyeData.slitLamp ||
        eyeData.slit_lamp ||
        'Cornea clear, Anterior chamber quiet, Lens clear',
      fundus:
        eyeData.fundus ||
        'Optic disc healthy, Cup/disc ratio 0.3, Macula normal',
      diagnosis:
        rx.diagnosis ||
        eyeData.diagnosis ||
        'Compound Myopic Astigmatism with Presbyopia',
      lens_type:
        eyeData.lensRecommendation ||
        eyeData.lens_type ||
        'Progressive Blue-Cut Antireflective (ARC)',
      clinical_notes: rx.clinical_notes || eyeData.clinical_notes || '',
      follow_up_date: rx.follow_up_date
        ? new Date(rx.follow_up_date).toISOString().split('T')[0]
        : '',
    });

    if (rx.items && rx.items.length > 0) {
      setDrops(
        rx.items.map((it: any) => ({
          medicineId: it.medicine_id || 'custom',
          medicineName: it.medicine_name,
          dosage: it.dosage,
          duration: it.duration,
          instructions: it.instructions || '',
          isCustom: !it.medicine_id,
        }))
      );
    } else {
      setDrops([]);
    }

    setExamModalOpen(true);
  };

  const handleAddDropRow = () => {
    // Prefer ophthalmic / DROPS / OINTMENT form medicine if available in catalog
    const eyeMed =
      medicines.find((m) => m.form === 'DROPS' || m.form === 'OINTMENT') ||
      medicines[0];

    setDrops((prev) => [
      ...prev,
      {
        medicineId: eyeMed ? eyeMed.id : '',
        medicineName: eyeMed ? `${eyeMed.name} (${eyeMed.strength})` : '',
        dosage: '1 drop 3 times daily',
        duration: '14 days',
        instructions: 'Both eyes',
        isCustom: !eyeMed,
      },
    ]);
  };

  const handleUpdateDropRow = (
    index: number,
    field: keyof EyeDropRow,
    value: any,
  ) => {
    setDrops((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'medicineId') {
        if (value === 'custom') {
          updated[index].isCustom = true;
          updated[index].medicineName = '';
        } else {
          updated[index].isCustom = false;
          const med = medicines.find((m) => m.id === value);
          if (med) {
            updated[index].medicineName = `${med.name} (${med.strength})`;
          }
        }
      }
      return updated;
    });
  };

  const handleRemoveDropRow = (index: number) => {
    setDrops((prev) => prev.filter((_, i) => i !== index));
  };

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (rxId: string, rxNumber?: string) => {
    setDownloadingId(rxId);
    try {
      const blob = await apiRequest<Blob>(`/clinical/prescriptions/${rxId}/pdf`);
      const blobUrl = window.URL.createObjectURL(
        new Blob([blob], { type: 'application/pdf' }),
      );
      const printWindow = window.open(blobUrl, '_blank');
      if (!printWindow) {
        // Fallback if browser blocked popup
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `${rxNumber || 'Eye-Prescription'}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate eye prescription PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQueueItem) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        patientId: selectedQueueItem.invoice.patient.id,
        invoiceItemId: selectedQueueItem.id,
        prescriptionType: 'EYE',
        diagnosis: eyeExamForm.diagnosis,
        clinicalNotes: eyeExamForm.clinical_notes,
        followUpDate: eyeExamForm.follow_up_date || undefined,
        eyeData: {
          od: {
            distUcva: eyeExamForm.od_dist_ucva,
            distBcva: eyeExamForm.od_dist_bcva,
            nearUcva: eyeExamForm.od_near_ucva,
            nearBcva: eyeExamForm.od_near_bcva,
            sph: eyeExamForm.od_sph,
            cyl: eyeExamForm.od_cyl,
            axis: eyeExamForm.od_axis,
            add: eyeExamForm.od_add,
            iop: eyeExamForm.od_iop,
          },
          os: {
            distUcva: eyeExamForm.os_dist_ucva,
            distBcva: eyeExamForm.os_dist_bcva,
            nearUcva: eyeExamForm.os_near_ucva,
            nearBcva: eyeExamForm.os_near_bcva,
            sph: eyeExamForm.os_sph,
            cyl: eyeExamForm.os_cyl,
            axis: eyeExamForm.os_axis,
            add: eyeExamForm.os_add,
            iop: eyeExamForm.os_iop,
          },
          lensRecommendation: eyeExamForm.lens_type,
          slitLamp: eyeExamForm.slit_lamp,

          // Flat keys for compatibility
          od_dist_ucva: eyeExamForm.od_dist_ucva,
          od_dist_bcva: eyeExamForm.od_dist_bcva,
          od_near_ucva: eyeExamForm.od_near_ucva,
          od_near_bcva: eyeExamForm.od_near_bcva,
          od_sph: eyeExamForm.od_sph,
          od_cyl: eyeExamForm.od_cyl,
          od_axis: eyeExamForm.od_axis,
          od_add: eyeExamForm.od_add,
          od_iop: eyeExamForm.od_iop,

          os_dist_ucva: eyeExamForm.os_dist_ucva,
          os_dist_bcva: eyeExamForm.os_dist_bcva,
          os_near_ucva: eyeExamForm.os_near_ucva,
          os_near_bcva: eyeExamForm.os_near_bcva,
          os_sph: eyeExamForm.os_sph,
          os_cyl: eyeExamForm.os_cyl,
          os_axis: eyeExamForm.os_axis,
          os_add: eyeExamForm.os_add,
          os_iop: eyeExamForm.os_iop,

          slit_lamp: eyeExamForm.slit_lamp,
          fundus: eyeExamForm.fundus,
          lens_type: eyeExamForm.lens_type,
        },
        items: drops
          .filter((d) => (d.medicineName && d.medicineName.trim()) || (d.medicineId && d.medicineId !== 'custom'))
          .map((d) => {
            const med = medicines.find((m) => m.id === d.medicineId);
            return {
              medicineId: d.medicineId && d.medicineId !== 'custom' ? d.medicineId : undefined,
              medicineName: d.medicineName || (med ? `${med.name} (${med.strength})` : 'Eye Drop'),
              dosage: d.dosage || '1 drop 3 times daily',
              duration: d.duration || '14 days',
              instructions: d.instructions || 'Both eyes',
            };
          }),
      };

      if (editingEyeRx) {
        await apiRequest(`/clinical/prescriptions/${editingEyeRx.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

        setExamModalOpen(false);
        setEditingEyeRx(null);
        loadData();
        toast.success('Eye prescription updated successfully');
      } else {
        const res = await apiRequest('/clinical/prescriptions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setExamModalOpen(false);
        toast.success('Eye prescription issued successfully');
        // Automatically trigger authenticated PDF preview/download
        if (res && res.id) {
          handleDownloadPdf(res.id, res.prescription_number);
        }
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue eye prescription');
      toast.error(err.message || 'Failed to issue eye prescription');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Prescriptions History
  const filteredHistory = prescriptions.filter((rx) => {
    const matchesDate = filterMatchesDate(rx.created_at, dateFilter);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      rx.prescription_number.toLowerCase().includes(q) ||
      rx.patient.first_name.toLowerCase().includes(q) ||
      rx.patient.last_name.toLowerCase().includes(q) ||
      rx.patient.uhid.toLowerCase().includes(q);

    return matchesDate && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Eye Prescription & Ophthalmology Engine</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Refraction test, visual acuity, slit lamp, and ophthalmic prescription queue for{' '}
            <span className="font-semibold text-foreground">{activeCenter?.name}</span>
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted shadow-sm transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${activeTab === 'queue'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Eye Examination Queue ({queue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Issued Eye Prescriptions</span>
        </button>
      </div>

      {/* TAB 1: EYE QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                <Glasses className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  Active Eye Clinic Patient Queue ({queue.length})
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Triggered automatically whenever an Eye or Refraction category service is billed
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading eye patients queue...
              </div>
            ) : queue.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                <Eye className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                <p className="font-semibold text-foreground">No Patients Waiting in Eye Queue</p>
                <p className="text-[11px]">
                  When an eye service (e.g. Eye Refraction, Vision Test, Ophthalmology) is billed at the reception, it will instantly appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4">Invoice #</th>
                      <th className="py-2.5 px-4">Patient Name & UHID</th>
                      <th className="py-2.5 px-4">Gender</th>
                      <th className="py-2.5 px-4">Service Purchased</th>
                      <th className="py-2.5 px-4">Queued At</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {queue.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {item.invoice.invoice_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground">
                            {item.invoice.patient.first_name} {item.invoice.patient.last_name}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            UHID: {item.invoice.patient.uhid}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {item.invoice.patient.gender}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                            {item.item_name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenExam(item)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all"
                          >
                            <Glasses className="h-3.5 w-3.5" />
                            <span>Start Eye Exam</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card border border-border p-3 rounded-xl shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Date Filter:</span>
              <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
            </div>

            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by Rx number, patient name, UHID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Issued Eye Prescriptions ({filteredHistory.length})
              </span>
            </div>

            {loading ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                Loading eye prescriptions history...
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
                <p className="font-semibold text-foreground">No Eye Prescriptions Found</p>
                <p className="text-[11px]">No matching records found for the selected filter period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2.5 px-4">Rx Number</th>
                      <th className="py-2.5 px-4">Patient Name & UHID</th>
                      <th className="py-2.5 px-4">Diagnosis</th>
                      <th className="py-2.5 px-4">Issued Date</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHistory.map((rx) => (
                      <tr key={rx.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {rx.prescription_number}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground">
                            {rx.patient.first_name} {rx.patient.last_name}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            UHID: {rx.patient.uhid}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-foreground font-medium">
                          {rx.diagnosis || 'Refractive Examination'}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {new Date(rx.created_at).toLocaleDateString([], {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasPermission('clinical:prescription:write') && (
                              <button
                                onClick={() => handleOpenEditEyeRx(rx)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/80 px-2.5 py-1 text-xs font-semibold transition-colors shadow-sm"
                                title="Edit Eye Prescription"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              disabled={downloadingId === rx.id}
                              onClick={() => handleDownloadPdf(rx.id, rx.prescription_number)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1 text-xs font-semibold text-foreground transition-colors shadow-sm disabled:opacity-50"
                              title="Print Eye Prescription PDF"
                            >
                              {downloadingId === rx.id ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-600" />
                              ) : (
                                <Printer className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              )}
                              <span>{downloadingId === rx.id ? 'Loading...' : 'Print PDF'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPREHENSIVE EYE EXAMINATION MODAL */}
      {examModalOpen && selectedQueueItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <Glasses className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {editingEyeRx
                      ? `Edit Eye Examination Prescription (${editingEyeRx.prescription_number})`
                      : 'Comprehensive Eye Examination & Refraction'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Patient:{' '}
                    <span className="font-semibold text-foreground">
                      {selectedQueueItem.invoice.patient.first_name} {selectedQueueItem.invoice.patient.last_name}
                    </span>{' '}
                    (UHID: {selectedQueueItem.invoice.patient.uhid} | {selectedQueueItem.invoice.patient.gender})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setExamModalOpen(false);
                  setEditingEyeRx(null);
                }}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitExam} className="space-y-5">
              {/* Refraction & Visual Acuity Grid */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  <span>Optical Refraction & Visual Acuity Measurements</span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead className="bg-muted/60 text-[11px] font-semibold text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2 px-3 text-left">Eye</th>
                        <th className="py-2 px-3">Dist UCVA</th>
                        <th className="py-2 px-3">Dist BCVA</th>
                        <th className="py-2 px-3">SPH</th>
                        <th className="py-2 px-3">CYL</th>
                        <th className="py-2 px-3">AXIS</th>
                        <th className="py-2 px-3">Near ADD</th>
                        <th className="py-2 px-3">Near BCVA</th>
                        <th className="py-2 px-3">IOP (mmHg)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {/* OD RIGHT EYE */}
                      <tr>
                        <td className="py-2.5 px-3 text-left font-bold text-blue-600 dark:text-blue-400">
                          OD (Right)
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.od_dist_ucva}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, od_dist_ucva: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.od_dist_bcva}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, od_dist_bcva: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.od_sph}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, od_sph: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs font-bold text-foreground"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.od_cyl}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, od_cyl: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.od_axis}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, od_axis: e.target.value })}
                            className="w-14 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.od_add}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, od_add: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs font-semibold text-emerald-600"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.od_near_bcva}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, od_near_bcva: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.od_iop}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, od_iop: e.target.value })}
                            className="w-20 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                      </tr>

                      {/* OS LEFT EYE */}
                      <tr>
                        <td className="py-2.5 px-3 text-left font-bold text-emerald-600 dark:text-emerald-400">
                          OS (Left)
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.os_dist_ucva}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, os_dist_ucva: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.os_dist_bcva}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, os_dist_bcva: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.os_sph}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, os_sph: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs font-bold text-foreground"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.os_cyl}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, os_cyl: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.os_axis}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, os_axis: e.target.value })}
                            className="w-14 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.os_add}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, os_add: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs font-semibold text-emerald-600"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.os_near_bcva}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, os_near_bcva: e.target.value })}
                            className="w-16 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={eyeExamForm.os_iop}
                            onChange={(e) => setEyeExamForm({ ...eyeExamForm, os_iop: e.target.value })}
                            className="w-20 rounded border border-input bg-background p-1 text-center font-mono text-xs"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Slit Lamp & Fundus Findings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Slit Lamp Biomicroscopy
                  </label>
                  <textarea
                    rows={2}
                    value={eyeExamForm.slit_lamp}
                    onChange={(e) => setEyeExamForm({ ...eyeExamForm, slit_lamp: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground outline-none"
                    placeholder="Cornea, AC, Iris, Lens condition..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Fundus Ophthalmoscopy
                  </label>
                  <textarea
                    rows={2}
                    value={eyeExamForm.fundus}
                    onChange={(e) => setEyeExamForm({ ...eyeExamForm, fundus: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground outline-none"
                    placeholder="Optic disc, Cup/disc ratio, Macula, Retinal vessels..."
                  />
                </div>
              </div>

              {/* Diagnosis & Lens Recommendation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Diagnosis *</label>
                  <input
                    type="text"
                    required
                    value={eyeExamForm.diagnosis}
                    onChange={(e) => setEyeExamForm({ ...eyeExamForm, diagnosis: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                    placeholder="e.g. Myopia, Hyperopia, Astigmatism, Presbyopia"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Lens Recommendation</label>
                  <input
                    type="text"
                    value={eyeExamForm.lens_type}
                    onChange={(e) => setEyeExamForm({ ...eyeExamForm, lens_type: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                    placeholder="e.g. Progressive Blue Cut, Bifocal ARC, Single Vision"
                  />
                </div>
              </div>

              {/* Prescribed Eye Drops / Lubricants Section */}
              <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/15 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      <Pill className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground">
                        Prescribed Eye Drops / Lubricants ({drops.length})
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Select from hospital medicine catalog or specify custom ophthalmic drops
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDropRow}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Eye Drop / Medicine</span>
                  </button>
                </div>

                {drops.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/80 bg-background/50 py-5 text-center">
                    <p className="text-xs text-muted-foreground">
                      No eye drops or medications added.{' '}
                      <button
                        type="button"
                        onClick={handleAddDropRow}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Click here
                      </button>{' '}
                      to select medicine from the medicine table.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {drops.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-12 gap-2 items-start rounded-lg border border-border p-2.5 bg-background shadow-xs"
                      >
                        {/* Medicine Catalog Dropdown */}
                        <div className="col-span-12 sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground block">
                            Medicine Table
                          </label>
                          <select
                            value={item.isCustom ? 'custom' : item.medicineId}
                            onChange={(e) =>
                              handleUpdateDropRow(idx, 'medicineId', e.target.value)
                            }
                            className="w-full rounded border border-input bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="">-- Select from Medicine Catalog --</option>
                            {/* Eye Drops & Ophthalmic optgroup */}
                            {medicines.some((m) => m.form === 'DROPS' || m.form === 'OINTMENT') && (
                              <optgroup label="👁️ Eye Drops & Ophthalmic">
                                {medicines
                                  .filter((m) => m.form === 'DROPS' || m.form === 'OINTMENT')
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.strength}) - {m.form}
                                    </option>
                                  ))}
                              </optgroup>
                            )}
                            {/* Other General Medications */}
                            {medicines.some((m) => m.form !== 'DROPS' && m.form !== 'OINTMENT') && (
                              <optgroup label="💊 Other Hospital Medicines">
                                {medicines
                                  .filter((m) => m.form !== 'DROPS' && m.form !== 'OINTMENT')
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.strength}) - {m.form}
                                    </option>
                                  ))}
                              </optgroup>
                            )}
                            <option value="custom">✍️ Custom / Unlisted Medicine</option>
                          </select>

                          {item.isCustom && (
                            <input
                              type="text"
                              value={item.medicineName}
                              onChange={(e) =>
                                handleUpdateDropRow(idx, 'medicineName', e.target.value)
                              }
                              placeholder="Type eye drop name & strength..."
                              className="mt-1.5 w-full rounded border border-blue-400/60 bg-blue-50/30 dark:bg-blue-950/20 px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                          )}
                        </div>

                        {/* Dosage */}
                        <div className="col-span-6 sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground block">
                            Dosage
                          </label>
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={(e) =>
                              handleUpdateDropRow(idx, 'dosage', e.target.value)
                            }
                            placeholder="1 drop 3x daily"
                            className="w-full rounded border border-input bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Duration */}
                        <div className="col-span-6 sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground block">
                            Duration
                          </label>
                          <input
                            type="text"
                            value={item.duration}
                            onChange={(e) =>
                              handleUpdateDropRow(idx, 'duration', e.target.value)
                            }
                            placeholder="14 days"
                            className="w-full rounded border border-input bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Instructions */}
                        <div className="col-span-10 sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground block">
                            Instructions
                          </label>
                          <input
                            type="text"
                            value={item.instructions}
                            onChange={(e) =>
                              handleUpdateDropRow(idx, 'instructions', e.target.value)
                            }
                            placeholder="Both eyes / Right eye (OD)"
                            className="w-full rounded border border-input bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>

                        {/* Remove Action */}
                        <div className="col-span-2 sm:col-span-1 flex justify-center pt-5 sm:pt-6">
                          <button
                            type="button"
                            onClick={() => handleRemoveDropRow(idx)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove eye drop"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Advice and Follow-up */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Clinical Advice & Notes</label>
                  <input
                    type="text"
                    value={eyeExamForm.clinical_notes}
                    onChange={(e) => setEyeExamForm({ ...eyeExamForm, clinical_notes: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                    placeholder="Instructions for continuous wear, screen breaks..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Follow-Up Date</label>
                  <input
                    type="date"
                    value={eyeExamForm.follow_up_date}
                    onChange={(e) => setEyeExamForm({ ...eyeExamForm, follow_up_date: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setExamModalOpen(false);
                    setEditingEyeRx(null);
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-5 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  <Printer className="h-4 w-4" />
                  <span>
                    {submitting
                      ? editingEyeRx
                        ? 'Saving Changes...'
                        : 'Generating Prescription...'
                      : editingEyeRx
                        ? 'Save Changes'
                        : 'Complete Exam & Print PDF'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
