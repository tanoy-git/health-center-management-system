'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
import { assetUrl } from '@/lib/api';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Stethoscope,
  Activity,
  Briefcase,
  ShieldCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  RotateCcw,
  Eye,
  Pill,
  BarChart3,
  Tags,
  Settings,
  Coins,
  FlaskConical,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const { isOpen, isCollapsed, toggleCollapse, closeMobile } = useSidebar();

  // Settings menu items requested by user
  const settingsItems: NavItem[] = [
    {
      name: 'Services, Categories & Discounts',
      href: '/services',
      icon: Tags,
      permission: 'billing:pos:access',
    },
    {
      name: 'Lab Test Attributes',
      href: '/lab-test-attributes',
      icon: FlaskConical,
      permission: 'diagnostics:reports:read',
    },
    {
      name: 'Medicine & Formulary Management',
      href: '/medicines',
      icon: Pill,
      permission: 'clinical:prescription:read',
    },
    {
      name: 'Referral Commission Settings',
      href: '/commissions',
      icon: Coins,
      permission: 'billing:invoices:read',
    },
    {
      name: 'Dynamic RBAC & Permissions Matrix',
      href: '/rbac',
      icon: ShieldCheck,
      permission: 'iam:roles:manage',
    },
    {
      name: 'Hospital Centers & Branch Registry',
      href: '/centers',
      icon: Building2,
      permission: 'center:manage',
    },
  ];

  // Core organized operational sections
  const operationalSections: NavSection[] = [
    {
      title: 'Core Operations',
      items: [
        {
          name: 'Dashboard',
          href: '/',
          icon: LayoutDashboard,
        },
        {
          name: 'Patient Master Index',
          href: '/patients',
          icon: Users,
          permission: 'patients:read',
        },
        {
          name: 'Billing & POS',
          href: '/pos',
          icon: CreditCard,
          permission: 'billing:pos:access',
        },
        {
          name: 'Invoices & Receipts',
          href: '/invoices',
          icon: FileText,
          permission: 'billing:invoices:read',
        },
        {
          name: 'Invoice Item Refunds',
          href: '/refunds',
          icon: RotateCcw,
          permission: 'billing:refund:manage',
        },
      ],
    },
    {
      title: 'Clinical & Diagnostics',
      items: [
        {
          name: 'Prescription Engine',
          href: '/prescriptions',
          icon: Stethoscope,
          permission: 'clinical:prescription:read',
        },
        {
          name: 'Eye Prescriptions',
          href: '/eye-prescriptions',
          icon: Eye,
          permission: 'clinical:eye:prescription',
        },
        {
          name: 'Diagnostics & Reports',
          href: '/diagnostics',
          icon: Activity,
          permission: 'diagnostics:reports:read',
        },
      ],
    },
    {
      title: 'Analytics & Staff',
      items: [
        {
          name: 'Executive Reports',
          href: '/reports',
          icon: BarChart3,
          permission: 'reports:view',
        },
        {
          name: 'HR & Payroll',
          href: '/hr',
          icon: Briefcase,
          permission: 'hr:employees:read',
        },
      ],
    },
  ];

  // Check if current page is within settings
  const isSettingsRoute = settingsItems.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
  );

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Auto-expand settings group if browsing a settings route
  useEffect(() => {
    if (isSettingsRoute) {
      setSettingsOpen(true);
    }
  }, [pathname, isSettingsRoute]);

  if (!user) return null;

  // Filter accessible items based on permissions
  const filterAccessible = (items: NavItem[]) =>
    items.filter((item) => !item.permission || hasPermission(item.permission));

  const accessibleSettingsItems = filterAccessible(settingsItems);

  return (
    <>
      {/* =================================================================== */}
      {/* 1. MOBILE BACKDROP & DRAWER (Screens < 1024px)                      */}
      {/* =================================================================== */}
      {isOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-card border-r border-border z-50 lg:hidden flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Mobile Drawer Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-border/80 shadow-sm p-1 shrink-0 overflow-hidden">
              <img
                src={assetUrl('/carewave-logo-cropped.png')}
                alt="CareWave"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-foreground">CareWave</span>
              <span className="ml-1.5 rounded bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 text-[9px] font-semibold text-blue-700 dark:text-blue-300">
                v1.0
              </span>
            </div>
          </div>
          <button
            onClick={closeMobile}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <div className="p-3 flex-1 overflow-y-auto space-y-4">
          {operationalSections.map((sec) => {
            const accessible = filterAccessible(sec.items);
            if (accessible.length === 0) return null;

            return (
              <div key={sec.title} className="space-y-1">
                <div className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                  {sec.title}
                </div>
                {accessible.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                          }`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Settings Section (Mobile) */}
          {accessibleSettingsItems.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1">
              <button
                type="button"
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${isSettingsRoute
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Settings & Master Setup</span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {settingsOpen && (
                <div className="pl-4 pr-1 py-1 space-y-1 border-l-2 border-blue-500/20 ml-4 animate-in fade-in duration-150">
                  {accessibleSettingsItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={closeMobile}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${isActive
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Drawer Footer */}
        <div className="p-3 border-t border-border bg-muted/20">
          <div className="rounded-lg border border-border bg-card p-2.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>Multi-Tenant EMR</span>
            </div>
            <p className="mt-0.5 text-muted-foreground text-[10px]">
              Center-isolated clinical data.
            </p>
          </div>
        </div>
      </aside>

      {/* =================================================================== */}
      {/* 2. DESKTOP SIDEBAR (Screens >= 1024px)                              */}
      {/* Supports Expand / Collapse into compact icon rail                  */}
      {/* =================================================================== */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-border bg-card transition-all duration-300 ease-in-out min-h-[calc(100vh-4rem)] ${isCollapsed ? 'w-16' : 'w-64 xl:w-72'
          }`}
      >
        {/* Desktop Nav Items */}
        <div className="p-2.5 flex-1 space-y-3 overflow-y-auto">
          {operationalSections.map((sec, secIdx) => {
            const accessible = filterAccessible(sec.items);
            if (accessible.length === 0) return null;

            return (
              <div key={sec.title} className="space-y-1">
                {!isCollapsed ? (
                  <div className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground truncate">
                    {sec.title}
                  </div>
                ) : secIdx > 0 ? (
                  <div className="my-1 border-t border-border/60 mx-2" />
                ) : null}

                {accessible.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${isCollapsed ? 'justify-center px-2 py-2.5' : ''
                        } ${isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                          }`}
                      />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* Settings Section (Desktop) */}
          {accessibleSettingsItems.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1">
              {!isCollapsed ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${isSettingsRoute
                      ? 'text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">Settings Menu</span>
                    </div>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 shrink-0 ${settingsOpen ? 'rotate-180' : ''
                        }`}
                    />
                  </button>

                  {settingsOpen && (
                    <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-blue-500/30 ml-4 animate-in fade-in duration-150">
                      {accessibleSettingsItems.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${isActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate text-[11px]">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                // In collapsed mode, render settings items as compact icons
                <div className="space-y-1">
                  <div className="my-1 border-t border-border/60 mx-2" />
                  <button
                    onClick={toggleCollapse}
                    title="Settings Menu (Click to expand)"
                    className={`w-full flex items-center justify-center rounded-lg p-2.5 text-xs font-medium transition-all ${isSettingsRoute
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  {accessibleSettingsItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.name}
                        className={`flex items-center justify-center rounded-lg p-2.5 text-xs font-medium transition-all ${isActive
                          ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Desktop Collapse / Expand Toggle Button */}
        <div className="p-2 border-t border-border bg-muted/20 flex flex-col gap-2">
          {!isCollapsed && (
            <div className="rounded-lg border bg-card p-2.5 text-[11px] hidden xl:block">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>CareWave EMR</span>
              </div>
              <p className="mt-1 text-muted-foreground text-[10px] leading-relaxed">
                ©2026 Asraful Islam Tanoy. All rights reserved.
              </p>
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className={`flex items-center gap-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground p-2 text-xs font-medium transition-colors cursor-pointer ${isCollapsed ? 'justify-center' : 'justify-between px-3'
              }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {!isCollapsed && <span className="text-[11px]">Collapse Menu</span>}
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-primary" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
