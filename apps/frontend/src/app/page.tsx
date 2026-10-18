'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  Users,
  CreditCard,
  Stethoscope,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Clock,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, activeCenter, loading } = useAuth();
  const [stats, setStats] = useState({
    patientsCount: 0,
    invoicesCount: 0,
    prescriptionsCount: 0,
    attendanceCount: 0,
    todayRevenue: 0,
  });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user && activeCenter) {
      loadDashboardData();
    }
  }, [user, activeCenter, loading]);

  const loadDashboardData = async () => {
    try {
      // Scoped automatically to activeCenter by header
      const patients = await apiRequest('/patients');
      const invoices = await apiRequest('/billing/invoices').catch(() => []);
      const prescriptions = await apiRequest('/clinical/prescriptions').catch(() => []);
      const attendances = await apiRequest('/hr/attendance').catch(() => []);

      const revenue = (invoices || []).reduce(
        (acc: number, curr: any) => acc + Number(curr.paid_amount || 0),
        0,
      );

      setStats({
        patientsCount: patients?.length || 0,
        invoicesCount: invoices?.length || 0,
        prescriptionsCount: prescriptions?.length || 0,
        attendanceCount: attendances?.length || 0,
        todayRevenue: revenue,
      });

      setRecentPatients((patients || []).slice(0, 5));
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-r from-blue-500/10 via-cyan-500/5 to-transparent p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Clinical Overview
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground font-medium">
                Branch: {activeCenter?.name}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {user.firstName} {user.lastName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Connected to Multi-Tenant HIS v2.0 as{' '}
              <span className="font-semibold text-foreground">{user.role}</span>.
              Queries are scoped to Center ID:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                {activeCenter?.code || user.center?.code}
              </code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/patients"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-500/20 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Patient</span>
            </Link>
            <Link
              href="/pos"
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card hover:bg-muted px-3.5 py-2 text-xs font-semibold text-foreground transition-all"
            >
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
              <span>POS Billing</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Patients */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Center Patients
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {stats.patientsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Isolated to {activeCenter?.name}
            </p>
          </div>
        </div>

        {/* Card 2: Billing & Revenue */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Billing Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              ${stats.todayRevenue.toFixed(2)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {stats.invoicesCount} Invoices generated
            </p>
          </div>
        </div>

        {/* Card 3: Prescriptions */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Prescriptions Issued
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Stethoscope className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {stats.prescriptionsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              With downloadable PDF Rx
            </p>
          </div>
        </div>

        {/* Card 4: Attendance */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Today's Attendance
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {stats.attendanceCount} Staff
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Auto-punched on Login Event
            </p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Recent Patients & Multi-Tenant Assurance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Patients Table */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Registered Patients ({activeCenter?.name})
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Center A employees cannot access Center B records
              </p>
            </div>
            <Link
              href="/patients"
              className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="p-4">
            {recentPatients.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No patients registered yet at this center.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentPatients.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs">
                        {p.first_name[0]}
                        {p.last_name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {p.first_name} {p.last_name}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          UHID: <span className="font-mono">{p.uhid}</span> |{' '}
                          {p.gender} | {p.phone}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/patients?selected=${p.id}`}
                      className="rounded border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      History
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Multi-Tenant Security & System Status */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Architecture & Security</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Multi-Tenant Center Isolation
              </span>
              <p className="text-[11px] text-foreground font-medium">
                Scoped by <code className="text-blue-600">center_id</code>
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Prisma middleware automatically scopes all operational reads and writes to authenticated branch.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Automated Attendance
              </span>
              <p className="text-[11px] text-foreground font-medium">
                Active on Login Event
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Backend Event Emitter fires punch-in automatically upon JWT generation.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Session Management
              </span>
              <p className="text-[11px] text-foreground font-medium">
                Redis Key-Value Cache
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Active sessions maintained in Redis with instantaneous forced-logout capability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
