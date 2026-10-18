'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Building2,
  Stethoscope,
  CreditCard,
  UserCheck,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Aegis Enterprise HIS
          </h1>
          <p className="text-xs text-muted-foreground">
            Multi-Tenant Clinical ERP & Hospital Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
          <div className="border-b border-border/60 pb-3">
            <h2 className="text-sm font-semibold text-foreground">
              Sign In to Clinical Workspace
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Automated Attendance punch recorded upon successful authentication
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="doctor@aegis.health"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 py-2.5 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="border-t border-border/60 pt-4 space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
              Quick Role Switcher (Preconfigured Demo)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleQuickLogin('admin@aegis.health', 'Admin@123456')
                }
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted p-2 text-left transition-colors"
              >
                <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate">Super Admin</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Metro / All Centers
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickLogin('dr.marcus@aegis.health', 'Staff@123456')
                }
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted p-2 text-left transition-colors"
              >
                <Stethoscope className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate">Dr. Marcus</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Center A (Metro)
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickLogin('cashier.metro@aegis.health', 'Staff@123456')
                }
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted p-2 text-left transition-colors"
              >
                <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate">Cashier Elena</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Center A (Billing)
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleQuickLogin('dr.sarah@aegis.health', 'Staff@123456')
                }
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted p-2 text-left transition-colors"
              >
                <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold truncate">Dr. Sarah</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    Center B (Westside)
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
