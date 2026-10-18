'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
    name: 'Prescription Engine',
    href: '/prescriptions',
    icon: Stethoscope,
    permission: 'clinical:prescription:read',
  },
  {
    name: 'Diagnostics & Reports',
    href: '/diagnostics',
    icon: Activity,
    permission: 'diagnostics:reports:read',
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

  if (!user) return null;

  const accessibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
          Modules & Clinical Workflows
        </div>

        {accessibleItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Center Security Badge */}
      <div className="p-4 border-t border-border bg-muted/20">
        <div className="rounded-lg border border-border bg-card p-3 text-[11px]">
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>Center-Isolated EMR</span>
          </div>
          <p className="mt-1 text-muted-foreground text-[10px] leading-relaxed">
            Multi-tenant data scoping enforced. Cross-center leak prevention active.
          </p>
        </div>
      </div>
    </aside>
  );
}
