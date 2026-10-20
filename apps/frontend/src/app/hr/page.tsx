'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Briefcase,
  Clock,
  DollarSign,
  Plus,
  Users,
  CheckCircle,
  Calendar,
  AlertCircle,
  Check,
  Building2,
  X,
  KeyRound,
  Lock,
  Edit2,
} from 'lucide-react';

export default function HrPage() {
  const { activeCenter, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'attendance' | 'employees' | 'payroll'>('attendance');

  const [employees, setEmployees] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [monthYear, setMonthYear] = useState('2026-10');
  const [loading, setLoading] = useState(true);

  // Modals
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [onboardForm, setOnboardForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleId: '',
    employeeCode: '',
    designation: '',
    department: 'Clinical Medicine',
    baseSalary: 5000,
  });

  // Admin Reset Password Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<any>(null);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Edit Employee Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    roleId: '',
    employeeCode: '',
    designation: '',
    department: 'Clinical Medicine',
    baseSalary: 5000,
    status: 'ACTIVE',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeCenter, activeTab, monthYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'attendance') {
        const att = await apiRequest('/hr/attendance');
        setAttendances(att || []);
      } else if (activeTab === 'employees') {
        const emp = await apiRequest('/hr/employees');
        setEmployees(emp || []);
        const rList = await apiRequest('/rbac/roles').catch(() => []);
        setRoles(rList || []);
        if (rList && rList.length > 0 && !onboardForm.roleId) {
          setOnboardForm((prev) => ({ ...prev, roleId: rList[0].id }));
        }
      } else if (activeTab === 'payroll') {
        const pay = await apiRequest(`/hr/payroll?monthYear=${monthYear}`);
        setPayrolls(pay || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayroll = async () => {
    try {
      await apiRequest('/hr/payroll/generate', {
        method: 'POST',
        body: JSON.stringify({ monthYear }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate payroll');
    }
  };

  const handleMarkPaid = async (payrollId: string) => {
    try {
      await apiRequest(`/hr/payroll/${payrollId}/pay`, {
        method: 'PATCH',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update payroll status');
    }
  };

  const handleToggleEmployeeStatus = async (emp: any) => {
    const newStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const actionText = newStatus === 'ACTIVE' ? 'activate' : 'deactivate';
    if (
      !confirm(
        `Are you sure you want to ${actionText} employee ${emp.user?.first_name} ${emp.user?.last_name}? ${
          newStatus === 'INACTIVE'
            ? 'They will be immediately logged out and unable to log into the system.'
            : ''
        }`,
      )
    ) {
      return;
    }
    try {
      await apiRequest(`/hr/employees/${emp.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (err: any) {
      alert(err.message || `Failed to ${actionText} employee`);
    }
  };

  const handleOpenEdit = (emp: any) => {
    setEditingEmployee(emp);
    setEditForm({
      firstName: emp.user?.first_name || '',
      lastName: emp.user?.last_name || '',
      phone: emp.user?.phone || '',
      roleId: emp.user?.role?.id || (roles.length > 0 ? roles[0].id : ''),
      employeeCode: emp.employee_code || '',
      designation: emp.designation || '',
      department: emp.department || 'Clinical Medicine',
      baseSalary: Number(emp.base_salary) || 0,
      status: emp.status || 'ACTIVE',
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEditSubmitting(true);
    try {
      await apiRequest(`/hr/employees/${editingEmployee.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      });
      setEditModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update employee details');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAdminResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmployee?.user?.id) return;
    setResetError(null);
    setResetSuccess(false);

    if (adminNewPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetSubmitting(true);
    try {
      await apiRequest(`/auth/admin/reset-password/${targetEmployee.user.id}`, {
        method: 'POST',
        body: JSON.stringify({ newPassword: adminNewPassword }),
      });
      setResetSuccess(true);
      setTimeout(() => {
        setResetModalOpen(false);
        setTargetEmployee(null);
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        setResetSuccess(false);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/hr/employees', {
        method: 'POST',
        body: JSON.stringify(onboardForm),
      });
      setOnboardModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to onboard employee');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            HR, Attendance & Salary System
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated Login Attendance & Prorated Monthly Payroll for{' '}
            <span className="font-semibold text-foreground">
              {activeCenter?.name}
            </span>
          </p>
        </div>

        {activeTab === 'employees' && hasPermission('hr:employees:write') && (
          <button
            onClick={() => setOnboardModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Onboard Employee</span>
          </button>
        )}

        {activeTab === 'payroll' && hasPermission('hr:payroll:generate') && (
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-mono outline-none"
            />
            <button
              onClick={handleGeneratePayroll}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              <DollarSign className="h-4 w-4" />
              <span>Process Month's Slips</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'attendance'
              ? 'bg-blue-600 text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>Automated Daily Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab('employees')}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'employees'
              ? 'bg-blue-600 text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>Employee Registry</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            activeTab === 'payroll'
              ? 'bg-blue-600 text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Monthly Salary Slips</span>
        </button>
      </div>

      {/* Tab 1: Daily Attendance */}
      {activeTab === 'attendance' && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-foreground">
                Today's Attendance Timeline ({attendances.length})
              </span>
              <p className="text-[11px] text-muted-foreground">
                Automated attendance records created when employees log in to the system
              </p>
            </div>
            <span className="rounded bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
              Event Emitter Active
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Loading attendance records...
            </div>
          ) : attendances.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-1">
              <Clock className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
              <p className="font-semibold text-foreground">
                No Attendance Records Today Yet
              </p>
              <p className="text-[11px]">
                When an employee logs into this branch, an attendance record is automatically triggered!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Employee</th>
                    <th className="py-2.5 px-4">Designation</th>
                    <th className="py-2.5 px-4">Punch In Time</th>
                    <th className="py-2.5 px-4">Trigger Mechanism</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {attendances.map((att) => (
                    <tr key={att.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {att.employee?.user?.first_name}{' '}
                        {att.employee?.user?.last_name}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {att.employee?.designation}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {new Date(att.punch_in).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300">
                          {att.trigger_source}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                          <Check className="h-3 w-3" />
                          <span>{att.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Employee Registry */}
      {activeTab === 'employees' && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <span className="text-xs font-semibold text-foreground">
              Employees Bound to {activeCenter?.name} ({employees.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2.5 px-4">Code</th>
                  <th className="py-2.5 px-4">Name & Email</th>
                  <th className="py-2.5 px-4">Designation</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Base Salary</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {emp.employee_code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-foreground">
                        {emp.user?.first_name} {emp.user?.last_name}
                      </p>
                      <span className="text-[10px] text-muted-foreground">
                        {emp.user?.email}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {emp.designation}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {emp.department}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      ${Number(emp.base_salary).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          emp.status === 'ACTIVE'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasPermission('hr:employees:write') && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors shadow-sm"
                            title="Edit employee details"
                          >
                            <Edit2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span>Edit</span>
                          </button>
                        )}
                        {hasPermission('hr:employees:write') && emp.user?.role?.name !== 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleToggleEmployeeStatus(emp)}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors shadow-sm ${
                              emp.status === 'ACTIVE'
                                ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                                : 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                            }`}
                            title={emp.status === 'ACTIVE' ? 'Deactivate employee' : 'Activate employee'}
                          >
                            <span>{emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
                          </button>
                        )}
                        {emp.user?.id && (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetEmployee(emp);
                              setResetError(null);
                              setResetSuccess(false);
                              setAdminNewPassword('');
                              setAdminConfirmPassword('');
                              setResetModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors shadow-sm"
                            title="Reset employee password"
                          >
                            <KeyRound className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span>Reset Password</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Monthly Salary Slips */}
      {activeTab === 'payroll' && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-foreground">
                Salary Slips for Month {monthYear} ({payrolls.length})
              </span>
              <p className="text-[11px] text-muted-foreground">
                Calculated dynamically based on employee attendance records and base pay
              </p>
            </div>
          </div>

          {payrolls.length === 0 ? (
            <div className="py-16 text-center text-xs text-muted-foreground space-y-2">
              <DollarSign className="h-8 w-8 mx-auto text-muted-foreground opacity-30" />
              <p className="font-semibold text-foreground">
                No Payroll Slips Processed for {monthYear}
              </p>
              <p className="text-[11px]">
                Click "Process Month's Slips" above to calculate salaries for all active branch staff.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 text-[11px] font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4">Employee</th>
                    <th className="py-2.5 px-4">Designation</th>
                    <th className="py-2.5 px-4">Present Days</th>
                    <th className="py-2.5 px-4">Base Pay</th>
                    <th className="py-2.5 px-4">Net Calculated Salary</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payrolls.map((p) => {
                    const isPaid = p.status === 'PAID';
                    return (
                      <tr key={p.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-foreground">
                            {p.employee?.user?.first_name}{' '}
                            {p.employee?.user?.last_name}
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {p.employee?.employee_code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {p.employee?.designation}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold">
                          {p.total_present_days} days
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          ${Number(p.base_salary).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-foreground text-sm">
                          ${Number(p.net_salary).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isPaid
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isPaid ? (
                            <button
                              onClick={() => handleMarkPaid(p.id)}
                              className="rounded border border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                            >
                              Disburse & Mark Paid
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">
                              Paid {new Date(p.payment_date).toLocaleDateString()}
                            </span>
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
      )}

      {/* Onboard Employee Modal */}
      {onboardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground">
                Onboard Employee at {activeCenter?.name}
              </h2>
              <button
                onClick={() => setOnboardModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">First Name *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.firstName}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, firstName: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={onboardForm.lastName}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, lastName: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Email *</label>
                  <input
                    type="email"
                    required
                    value={onboardForm.email}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, email: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardForm.employeeCode}
                    onChange={(e) =>
                      setOnboardForm({
                        ...onboardForm,
                        employeeCode: e.target.value,
                      })
                    }
                    placeholder="EMP-0301"
                    className="w-full rounded border border-input bg-background p-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    System Role *
                  </label>
                  <select
                    value={onboardForm.roleId}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, roleId: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 font-medium outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardForm.department}
                    onChange={(e) =>
                      setOnboardForm({ ...onboardForm, department: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardForm.designation}
                    onChange={(e) =>
                      setOnboardForm({
                        ...onboardForm,
                        designation: e.target.value,
                      })
                    }
                    placeholder="e.g. Staff Nurse, Resident Doctor"
                    className="w-full rounded border border-input bg-background p-2 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Base Salary ($/month) *
                  </label>
                  <input
                    type="number"
                    required
                    value={onboardForm.baseSalary}
                    onChange={(e) =>
                      setOnboardForm({
                        ...onboardForm,
                        baseSalary: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded border border-input bg-background p-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setOnboardModalOpen(false)}
                  className="rounded border border-border px-4 py-2 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 hover:bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm"
                >
                  Onboard Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetModalOpen && targetEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Reset Employee Password
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {targetEmployee.user?.first_name} {targetEmployee.user?.last_name} ({targetEmployee.user?.email})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {resetSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-4 w-4 shrink-0" />
                <span>Password has been reset successfully!</span>
              </div>
            )}

            {resetError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form onSubmit={handleAdminResetSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  New Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  disabled={resetSubmitting}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting || resetSuccess}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {resetSubmitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    Edit Employee Information
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    {editingEmployee.employee_code} • {editingEmployee.user?.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, firstName: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, lastName: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.employeeCode}
                    onChange={(e) =>
                      setEditForm({ ...editForm, employeeCode: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 font-mono outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    placeholder="+1 555-0100"
                    className="w-full rounded border border-input bg-background p-2 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    System Role *
                  </label>
                  <select
                    value={editForm.roleId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, roleId: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 font-medium outline-none focus:ring-1 focus:ring-primary"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm({ ...editForm, department: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.designation}
                    onChange={(e) =>
                      setEditForm({ ...editForm, designation: e.target.value })
                    }
                    className="w-full rounded border border-input bg-background p-2 outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">
                    Base Salary ($/month) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editForm.baseSalary}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        baseSalary: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded border border-input bg-background p-2 font-mono outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Account Status *</label>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  className="w-full rounded border border-input bg-background p-2 font-medium outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ACTIVE">ACTIVE (Allowed to login)</option>
                  <option value="INACTIVE">INACTIVE (Blocked from login)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editSubmitting}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
