'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Users,
  Search,
  Plus,
  FileText,
  Stethoscope,
  Activity,
  X,
  CheckCircle,
  AlertCircle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  UserCheck,
  Pencil,
} from 'lucide-react';

export default function PatientsPage() {
  const { activeCenter, hasPermission } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [marketingOfficers, setMarketingOfficers] = useState<any[]>([]);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    referredById: '',
  });

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    gender: 'MALE',
    bloodGroup: 'O+',
    phone: '',
    email: '',
    address: '',
    emergencyContact: '',
    referredById: '',
  });

  useEffect(() => {
    loadPatients();
    loadMarketingOfficers();
  }, [activeCenter, search]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const data = await apiRequest(`/patients?search=${encodeURIComponent(search)}`);
      setPatients(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMarketingOfficers = async () => {
    try {
      const data = await apiRequest('/patients/marketing-officers');
      setMarketingOfficers(data || []);
    } catch (e) {
      console.error('Error loading marketing officers:', e);
    }
  };

  const handleSelectPatient = async (id: string) => {
    try {
      const data = await apiRequest(`/patients/${id}`);
      setSelectedPatient(data);
    } catch (err: any) {
      alert(err.message || 'Error loading patient details');
    }
  };

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiRequest('/patients', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setToastMessage(`Patient successfully registered with ${res.uhid}`);
      setIsRegisterModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        dob: '',
        gender: 'MALE',
        bloodGroup: 'O+',
        phone: '',
        email: '',
        address: '',
        emergencyContact: '',
        referredById: '',
      });
      loadPatients();
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (p: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPatient(p);
    setEditFormData({
      firstName: p.first_name || '',
      lastName: p.last_name || '',
      dob: p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
      gender: p.gender || 'MALE',
      bloodGroup: p.blood_group || 'O+',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      emergencyContact: p.emergency_contact || '',
      referredById: p.referred_by_id || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    setSubmitting(true);
    try {
      const res = await apiRequest(`/patients/${editingPatient.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });

      setToastMessage(`Patient ${res.uhid} (${res.first_name} ${res.last_name}) updated successfully`);
      setIsEditModalOpen(false);
      setEditingPatient(null);
      loadPatients();
      if (selectedPatient?.id === editingPatient.id) {
        handleSelectPatient(editingPatient.id);
      }
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm animate-in fade-in">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Patient Master Index (PMI)
            </h1>
            <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
              {activeCenter?.name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Strict Multi-Tenant Scoping: Records are strictly isolated to {activeCenter?.name}.
          </p>
        </div>

        {hasPermission('patients:write') && (
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/25 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Register New Patient</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by UHID (e.g. UHID-2026-10-000001), Name, or Phone..."
          className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
        />
      </div>

      {/* Main Grid: Patient List & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patients Table */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
            <span className="text-xs font-semibold text-foreground">
              Registered Patients ({patients.length})
            </span>
            <span className="text-[11px] text-muted-foreground">
              Click any patient to inspect clinical history
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading patients...
            </div>
          ) : patients.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Users className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
              <p className="text-xs font-medium text-foreground">
                No patients found at this center.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Patients registered at other hospital centers are strictly isolated.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">UHID</th>
                    <th className="py-2.5 px-4">Patient Name</th>
                    <th className="py-2.5 px-4">Gender & Blood</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4 text-center">Records</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {patients.map((p) => {
                    const isSelected = selectedPatient?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => handleSelectPatient(p.id)}
                        className={`cursor-pointer transition-colors ${isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                          : 'hover:bg-muted/50'
                          }`}
                      >
                        <td className="py-3 px-4 font-mono font-semibold text-blue-600 dark:text-blue-400">
                          {p.uhid}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          <div>{p.first_name} {p.last_name}</div>
                          {p.referred_by && (
                            <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 mt-0.5">
                              <UserCheck className="h-2.5 w-2.5" />
                              <span>Ref: {p.referred_by.user?.first_name} {p.referred_by.user?.last_name}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.gender} | {p.blood_group || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.phone}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
                            <span>{p._count?.invoices || 0} bills</span>
                            <span>•</span>
                            <span>{p._count?.prescriptions || 0} Rx</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {hasPermission('patients:write') && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditModal(p, e)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
                              title="Edit patient details"
                            >
                              <Pencil className="h-3 w-3" />
                              <span>Edit</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Patient Details Drawer */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-5">
          {selectedPatient ? (
            <div className="space-y-4">
              <div className="border-b border-border pb-3 flex items-start justify-between">
                <div>
                  <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    {selectedPatient.uhid}
                  </span>
                  <h2 className="text-base font-bold text-foreground">
                    {selectedPatient.first_name} {selectedPatient.last_name}
                  </h2>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{selectedPatient.gender}</span>
                    <span>•</span>
                    <span>Blood: {selectedPatient.blood_group || 'Unknown'}</span>
                  </div>
                </div>
                {hasPermission('patients:write') && (
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditModal(selectedPatient, e)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm"
                    title="Edit patient details"
                  >
                    <Pencil className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Contact Information */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="text-foreground">{selectedPatient.phone}</span>
                </div>
                {selectedPatient.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="text-foreground">{selectedPatient.email}</span>
                  </div>
                )}
                {selectedPatient.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span className="text-foreground">{selectedPatient.address}</span>
                  </div>
                )}
                {selectedPatient.emergency_contact && (
                  <div className="p-2.5 rounded-lg bg-muted/40 text-[11px]">
                    <span className="font-semibold text-muted-foreground block text-[10px] uppercase">
                      Emergency Contact
                    </span>
                    <span className="text-foreground">
                      {selectedPatient.emergency_contact}
                    </span>
                  </div>
                )}
                {selectedPatient.referred_by && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Referred By (Marketing Officer)</span>
                      </span>
                      <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {selectedPatient.referred_by.employee_code}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground">
                      {selectedPatient.referred_by.user?.first_name} {selectedPatient.referred_by.user?.last_name}
                    </p>
                    {selectedPatient.referred_by.user?.phone && (
                      <p className="text-[11px] text-muted-foreground">
                        Phone: {selectedPatient.referred_by.user.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Clinical Prescriptions */}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-blue-500" />
                    <span>Recent Prescriptions</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedPatient.prescriptions?.length || 0}
                  </span>
                </div>
                {selectedPatient.prescriptions?.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    No prescription history yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedPatient.prescriptions.map((rx: any) => (
                      <div
                        key={rx.id}
                        className="rounded-lg border border-border p-2 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-blue-600 font-mono text-[11px]">
                            {rx.prescription_number}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(rx.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {rx.diagnosis && (
                          <p className="text-[11px] text-foreground font-medium">
                            {rx.diagnosis}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {rx.items?.length || 0} medicine(s) prescribed
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invoicing History */}
              <div className="border-t border-border pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Recent Invoices</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedPatient.invoices?.length || 0}
                  </span>
                </div>
                {selectedPatient.invoices?.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">
                    No invoice history yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedPatient.invoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="rounded-lg border border-border p-2 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold font-mono text-[11px] text-foreground">
                            {inv.invoice_number}
                          </span>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-foreground">
                            ${Number(inv.total_amount).toFixed(2)}
                          </span>
                          <span className="block text-[10px] text-emerald-600 font-semibold">
                            {inv.payment_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-2">
              <Users className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
              <p className="text-xs font-semibold text-foreground">
                No Patient Selected
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Select a patient from the list on the left to view comprehensive demographics and medical history.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Register New Patient Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Register New Patient
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Branch: <span className="font-semibold text-blue-600">{activeCenter?.name}</span> (UHID auto-generated)
                </p>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    placeholder="John"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) =>
                      setFormData({ ...formData, dob: e.target.value })
                    }
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Blood Group</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) =>
                      setFormData({ ...formData, bloodGroup: e.target.value })
                    }
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 555-0199"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="patient@example.com"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Residential Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Street address, City, Postal Code"
                  className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Emergency Contact</label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) =>
                    setFormData({ ...formData, emergencyContact: e.target.value })
                  }
                  placeholder="Contact person & phone number"
                  className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Referred By (Marketing Officer)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <select
                  value={formData.referredById}
                  onChange={(e) =>
                    setFormData({ ...formData, referredById: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">-- Direct Patient (No Referral) --</option>
                  {marketingOfficers.map((mo) => (
                    <option key={mo.id} value={mo.id}>
                      {mo.user?.first_name} {mo.user?.last_name} ({mo.employee_code || 'MO'} • {mo.user?.phone || 'No phone'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Select the marketing officer who brought this patient to the center, or leave empty if patient arrived without reference.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register & Generate UHID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Patient Modal */}
      {isEditModalOpen && editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-foreground">
                    Edit Patient Details
                  </h2>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {editingPatient.uhid}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Update demographic or referral details for this patient
                </p>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingPatient(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePatient} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.firstName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, firstName: e.target.value })
                    }
                    placeholder="John"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.lastName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, lastName: e.target.value })
                    }
                    placeholder="Doe"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Date of Birth</label>
                  <input
                    type="date"
                    value={editFormData.dob}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dob: e.target.value })
                    }
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Gender *</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, gender: e.target.value })
                    }
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Blood Group</label>
                  <select
                    value={editFormData.bloodGroup}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, bloodGroup: e.target.value })
                    }
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    placeholder="+1 555-0199"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Email Address</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    placeholder="patient@example.com"
                    className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Residential Address</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, address: e.target.value })
                  }
                  placeholder="Street address, City, Postal Code"
                  className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Emergency Contact</label>
                <input
                  type="text"
                  value={editFormData.emergencyContact}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, emergencyContact: e.target.value })
                  }
                  placeholder="Contact person & phone number"
                  className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>Referred By (Marketing Officer)</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                </label>
                <select
                  value={editFormData.referredById}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, referredById: e.target.value })
                  }
                  className="w-full rounded-lg border border-input bg-background p-2 focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="">-- Direct Patient (No Referral) --</option>
                  {marketingOfficers.map((mo) => (
                    <option key={mo.id} value={mo.id}>
                      {mo.user?.first_name} {mo.user?.last_name} ({mo.employee_code || 'MO'} • {mo.user?.phone || 'No phone'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingPatient(null);
                  }}
                  className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm shadow-blue-500/20 disabled:opacity-50"
                >
                  {submitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
