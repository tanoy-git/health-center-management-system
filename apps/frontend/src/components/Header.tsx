'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import {
  Building2,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  User as UserIcon,
  Check,
  KeyRound,
  Menu,
} from 'lucide-react';
import { useSidebar } from '@/lib/sidebar-context';
import ChangePasswordModal from './ChangePasswordModal';

export default function Header() {
  const { user, activeCenter, availableCenters, switchCenter, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const [centerDropdownOpen, setCenterDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  if (!user) return null;

  const isSuperAdmin = user.role === 'SUPER_ADMIN';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <div className="flex h-16 items-center justify-between px-3 sm:px-6">
        {/* Left: Hamburger Toggle, Branding & Center Indicator */}
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
          {/* Sidebar Toggle Button */}
          <button
            onClick={toggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shrink-0"
            title="Toggle Sidebar (Expand/Collapse)"
            aria-label="Toggle Sidebar Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-border/80 shadow-sm p-1 shrink-0 overflow-hidden">
              <img
                src="/carewave-logo-cropped.png"
                alt="CareWave"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-foreground whitespace-nowrap">
                  CareWave
                </span>
                <span className="rounded bg-blue-100 dark:bg-blue-900/50 px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground hidden lg:block">
                Patient Assistance Center & Eye Hospital
              </p>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-border hidden md:block" />

          {/* ACTIVE CENTER CONTEXT INDICATOR */}
          <div className="relative">
            <button
              onClick={() => isSuperAdmin && setCenterDropdownOpen(!centerDropdownOpen)}
              className={`flex items-center gap-1.5 sm:gap-2 rounded-lg border px-2 sm:px-3 py-1.5 text-xs font-medium transition-all ${isSuperAdmin
                ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 text-blue-700 dark:text-blue-300 cursor-pointer shadow-sm'
                : 'border-border bg-muted/40 text-foreground cursor-default'
                }`}
            >
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-left">
                <span className="hidden sm:block text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Branch Context
                </span>
                <span className="font-semibold truncate max-w-[100px] xs:max-w-[130px] sm:max-w-[170px] block text-[11px] sm:text-xs">
                  {activeCenter?.name || 'Loading Center...'}
                </span>
              </div>
              {isSuperAdmin && <ChevronDown className="h-3 w-3 ml-0.5 opacity-70 shrink-0" />}
            </button>

            {/* Super Admin Center Switcher Dropdown */}
            {isSuperAdmin && centerDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Switch Hospital Center Context
                </div>
                <div className="mt-1 space-y-1">
                  {availableCenters
                    .filter((ctr) => ctr.status !== 'INACTIVE')
                    .map((ctr) => {
                      const isSelected = activeCenter?.id === ctr.id;
                      return (
                        <button
                          key={ctr.id}
                          onClick={() => {
                            switchCenter(ctr);
                            setCenterDropdownOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${isSelected
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'hover:bg-muted text-foreground'
                            }`}
                        >
                          <div className="text-left">
                            <p>{ctr.name}</p>
                            <span
                              className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-muted-foreground'
                                }`}
                            >
                              Code: {ctr.code}
                            </span>
                          </div>
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  {availableCenters.filter((ctr) => ctr.status !== 'INACTIVE').length === 0 && (
                    <div className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                      No active centers available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Theme Toggle & User Info */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Toggle Light / Dark mode"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4 text-slate-700" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400" />
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-card hover:bg-muted/60 p-1.5 pr-3 text-xs transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-semibold text-xs">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="text-left hidden sm:block">
                <span className="font-semibold text-foreground block leading-tight">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  {user.role}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-xs font-semibold text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate font-mono">
                    @{user.userName || user.email?.split('@')[0] || 'user'}
                    {user.email && <span className="font-sans text-[10px] ml-1.5 opacity-70">({user.email})</span>}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Active Redis Session
                    </span>
                  </div>
                </div>

                <div className="mt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setPasswordModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <KeyRound className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal accessible by all users */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </header>
  );
}
