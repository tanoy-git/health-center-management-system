'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSidebar } from '@/lib/sidebar-context';
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
  X,
  RotateCcw,
  Eye,
  Pill,
  BarChart3,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

const navItems: NavItem[] = [
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
    name: 'Medicines & Catalog',
    href: '/medicines',
    icon: Pill,
    permission: 'clinical:prescription:read',
  },
  {
    name: 'Diagnostics & Reports',
    href: '/diagnostics',
    icon: Activity,
    permission: 'diagnostics:reports:read',
  },
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
  {
    name: 'Dynamic RBAC',
    href: '/rbac',
    icon: ShieldCheck,
    permission: 'iam:roles:manage',
  },
  {
    name: 'Center Registry',
    href: '/centers',
    icon: Building2,
    permission: 'center:manage',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();
  const { isOpen, isCollapsed, toggleCollapse, closeMobile } = useSidebar();

  if (!user) return null;

  const accessibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

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
                src="/carewave-logo-cropped.png"
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
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile Navigation Links */}
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
            Navigation Menu
          </div>
          {accessibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${isActive
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
        className={`hidden lg:flex flex-col shrink-0 border-r border-border bg-card transition-all duration-300 ease-in-out min-h-[calc(100vh-4rem)] ${isCollapsed ? 'w-16' : 'w-60 xl:w-64'
          }`}
      >
        {/* Desktop Nav Items */}
        <div className="p-2.5 flex-1 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-muted-foreground truncate">
              Modules & Workflows
            </div>
          )}

          {accessibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${isCollapsed ? 'justify-center px-2' : ''
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

        {/* Desktop Collapse / Expand Toggle Button */}
        <div className="p-2 border-t border-border bg-muted/20 flex flex-col gap-2">
          {!isCollapsed && (
            <div className="rounded-lg border border-border bg-card p-2.5 text-[11px] hidden xl:block">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Center-Isolated EMR</span>
              </div>
              <p className="mt-1 text-muted-foreground text-[10px] leading-relaxed">
                Multi-tenant scoping active.
              </p>
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className={`flex items-center gap-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground p-2 text-xs font-medium transition-colors ${isCollapsed ? 'justify-center' : 'justify-between px-3'
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
