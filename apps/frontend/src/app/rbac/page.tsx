'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiRequest } from '@/lib/api';
import {
  ShieldCheck,
  Plus,
  Check,
  Users,
  Lock,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';

export default function RbacPage() {
  const { hasPermission } = useAuth();
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // New Role Modal
  const [isNewRoleModalOpen, setIsNewRoleModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  useEffect(() => {
    loadRbacData();
  }, []);

  const loadRbacData = async () => {
    setLoading(true);
    try {
      const [rList, pList] = await Promise.all([
        apiRequest('/rbac/roles'),
        apiRequest('/rbac/permissions'),
      ]);
      setRoles(rList || []);
      setPermissions(pList || []);

      if (rList && rList.length > 0) {
        selectRole(rList[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectRole = (role: any) => {
    setSelectedRole(role);
    const assignedIds = (role.role_permissions || []).map(
      (rp: any) => rp.permission_id,
    );
    setSelectedPermissionIds(assignedIds);
  };

  const togglePermission = (permId: string) => {
    if (selectedPermissionIds.includes(permId)) {
      setSelectedPermissionIds(
        selectedPermissionIds.filter((id) => id !== permId),
      );
    } else {
      setSelectedPermissionIds([...selectedPermissionIds, permId]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      await apiRequest(`/rbac/roles/${selectedRole.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          permissionIds: selectedPermissionIds,
        }),
      });

      setToast(`Permissions updated dynamically for ${selectedRole.name}`);
      setTimeout(() => setToast(null), 4000);
      loadRbacData();
    } catch (err: any) {
      alert(err.message || 'Failed to update role permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiRequest('/rbac/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: newRoleName,
          description: newRoleDesc,
          permissionIds: [],
        }),
      });

      setIsNewRoleModalOpen(false);
      setNewRoleName('');
      setNewRoleDesc('');
      await loadRbacData();
      selectRole(created);
    } catch (err: any) {
      alert(err.message || 'Failed to create role');
    }
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce((acc: any, p: any) => {
    const mod = p.module || 'OTHER';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Dynamic RBAC & Permissions Matrix
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Database-driven dynamic roles and UI/API access control configurator
          </p>
        </div>

        {hasPermission('iam:roles:manage') && (
          <button
            onClick={() => setIsNewRoleModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Role</span>
          </button>
        )}
      </div>

      {/* Main Grid: Roles List (Left) & Permissions Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Roles List (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-semibold text-foreground">
              Configured System Roles ({roles.length})
            </span>
          </div>

          <div className="space-y-1.5">
            {roles.map((r) => {
              const isSelected = selectedRole?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => selectRole(r)}
                  className={`flex flex-col rounded-lg p-3 cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500/50 shadow-sm'
                      : 'border-border/60 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-foreground">
                      {r.name}
                    </span>
                    {r.is_system && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        SYSTEM
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {r.description || 'No description provided'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                    <span>{r.role_permissions?.length || 0} Permissions</span>
                    <span>•</span>
                    <span>{r._count?.users || 0} Users</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permissions Matrix (8 cols) */}
        <div className="lg:col-span-8 rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Permissions Matrix:{' '}
                  <span className="text-blue-600 font-mono">
                    {selectedRole?.name}
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Toggle capabilities dynamically. Changes take effect on subsequent API requests.
              </p>
            </div>

            {hasPermission('iam:roles:manage') && (
              <button
                type="button"
                disabled={saving || !selectedRole}
                onClick={handleSavePermissions}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{saving ? 'Saving Changes...' : 'Save Matrix'}</span>
              </button>
            )}
          </div>

          {/* Module-grouped permissions checkboxes */}
          <div className="space-y-5 max-h-[600px] overflow-y-auto pr-1">
            {Object.keys(permissionsByModule).map((moduleName) => {
              const perms = permissionsByModule[moduleName];
              return (
                <div key={moduleName} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Module: {moduleName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ({perms.length} actions)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p: any) => {
                      const isChecked = selectedPermissionIds.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className={`flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer text-xs transition-colors ${
                            isChecked
                              ? 'border-blue-500/60 bg-blue-50/40 dark:bg-blue-950/20'
                              : 'border-border hover:bg-muted/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id)}
                            className="mt-0.5 h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">
                              {p.name}
                            </p>
                            <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                              {p.code}
                            </p>
                            {p.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Role Creation Modal */}
      {isNewRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground">
                Create Dynamic Role
              </h2>
              <button
                onClick={() => setIsNewRoleModalOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Junior Nurse, Head Pharmacist"
                  className="w-full rounded border border-input bg-background p-2 outline-none font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">
                  Role Description
                </label>
                <textarea
                  rows={2}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Description of duties and access permissions"
                  className="w-full rounded border border-input bg-background p-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewRoleModalOpen(false)}
                  className="rounded border border-border px-4 py-2 hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 hover:bg-blue-700 px-5 py-2 font-semibold text-white shadow-sm"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
