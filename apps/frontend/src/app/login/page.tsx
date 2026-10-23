'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Building2,
  Stethoscope,
  CreditCard,
  UserCheck,
  UserPlus,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, initialSetup } = useAuth();

  // Status check: is initial bootstrap required?
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Initial setup form state (only used when userCount === 0)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [setupUserName, setSetupUserName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [centerName, setCenterName] = useState('Central Hospital');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Check if system has any users in the database
  useEffect(() => {
    async function checkSetupStatus() {
      try {
        const res = await apiRequest<{ setupRequired: boolean; userCount: number }>('/auth/status');
        setSetupRequired(res.setupRequired);
        setUserCount(res.userCount);
      } catch (err) {
        // Fallback: default to standard login if check fails
        setSetupRequired(false);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkSetupStatus();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!setupUserName.trim()) {
      setError('Username is required.');
      return;
    }

    if (setupPassword !== setupConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (setupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      await initialSetup({
        firstName,
        lastName,
        userName: setupUserName.trim().toLowerCase(),
        email: setupEmail.trim() || undefined,
        password: setupPassword,
        phone,
        centerName,
      });
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Initial setup failed. Please try again.');
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
            <img
              src="/carewave-logo-cropped.png"
              alt="CareWave"
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            CareWave
          </h1>
          <p className="text-xs text-muted-foreground">
            Multi-Tenant Clinical ERP & Hospital Management System
          </p>
        </div>

        {/* Loading Skeleton during status check */}
        {checkingStatus ? (
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl flex flex-col items-center justify-center space-y-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Verifying database configuration...</p>
          </div>
        ) : setupRequired ? (
          /* ========================================================================= */
          /* CASE 1: ZERO USERS IN DATABASE -> FIRST TIME INITIAL SUPER ADMIN SETUP   */
          /* ========================================================================= */
          <div className="rounded-2xl border border-blue-500/30 bg-card p-6 shadow-2xl shadow-blue-500/10 space-y-5">
            <div className="border-b border-border/60 pb-3 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <Sparkles className="h-3 w-3" />
                <span>First-Time System Initialization</span>
              </div>
              <h2 className="text-sm font-semibold text-foreground pt-1">
                Create Primary Super Admin Account
              </h2>
              <p className="text-[11px] text-muted-foreground">
                No users found in the database. Set up your administrator credentials to initialize the system. Once created, all future accounts are managed internally.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSetupSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alexander"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Vance"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Username (userName) *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={setupUserName}
                    onChange={(e) => setSetupUserName(e.target.value)}
                    placeholder="e.g. superadmin or alexander"
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Super Admin Email (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="admin@yourhospital.com (optional)"
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Primary Healthcare Center Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={centerName}
                    onChange={(e) => setCenterName(e.target.value)}
                    placeholder="Metro Central Hospital"
                    className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-foreground">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 010-9999"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-foreground">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      value={setupConfirmPassword}
                      onChange={(e) => setSetupConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 py-2.5 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Provisioning Super Admin...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    <span>Create Super Admin & Initialize</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: USER TABLE HAS ENTITIES -> STANDARD SECURE SIGN IN                */
          /* No "Create User" or register button appears. All users created by Admin.  */
          /* ========================================================================= */
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

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin or dr.marcus"
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

            {/* Access Governance Notice */}
            <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3 text-muted-foreground/70" />
              <span>User accounts are provisioned exclusively by a Super Administrator.</span>
            </div>

            {/* Quick Demo Credentials (Shown if seeded demo accounts exist) */}
            {userCount && userCount >= 4 && (
              <div className="border-t border-border/60 pt-4 space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center">
                  Quick Role Switcher (Preconfigured Demo)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin('admin', 'Admin@123456')
                    }
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted p-2 text-left transition-colors"
                  >
                    <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate">Super Admin</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        @admin (All Centers)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin('dr.marcus', 'Staff@123456')
                    }
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted p-2 text-left transition-colors"
                  >
                    <Stethoscope className="h-4 w-4 text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate">Dr. Marcus</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        @dr.marcus (Metro)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin('cashier.metro', 'Staff@123456')
                    }
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted p-2 text-left transition-colors"
                  >
                    <CreditCard className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate">Cashier Elena</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        @cashier.metro (Billing)
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleQuickLogin('dr.sarah', 'Staff@123456')
                    }
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 hover:bg-muted p-2 text-left transition-colors"
                  >
                    <UserCheck className="h-4 w-4 text-amber-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold truncate">Dr. Sarah</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        @dr.sarah (Westside)
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
