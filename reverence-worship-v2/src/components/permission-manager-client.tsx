"use client";

import { FormEvent, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Edit,
  Layers,
  Lock,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { deleteRole, importRolePermissions, saveRole, saveRolePermissions } from "@/app/admin/permissions/actions";

type RoleItem = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  usersCount: number;
  modulesCount: number;
};

type PageItem = {
  id: number;
  name: string;
  label: string;
  icon: string | null;
  features: FeatureItem[];
};

type FeatureItem = {
  id: number;
  pageId: number;
  name: string;
  label: string;
  description: string | null;
};

type Assignment = {
  roleId: number;
  pageId: number;
  featureId: number;
};

type Result = {
  ok: boolean;
  message: string;
};

const featureOrder: Record<string, number> = {
  view: 1,
  create: 2,
  edit: 3,
  delete: 4,
  approve: 5,
  export: 6,
};

export function PermissionManagerClient({
  roles,
  pages,
  assignments,
}: {
  roles: RoleItem[];
  pages: PageItem[];
  assignments: Assignment[];
}) {
  const router = useRouter();
  const importRef = useRef<HTMLInputElement>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");
  const [roleModal, setRoleModal] = useState<RoleItem | "new" | null>(null);
  const [permissionRole, setPermissionRole] = useState<RoleItem | null>(null);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<Set<number>>(new Set());
  const [expandedPageIds, setExpandedPageIds] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  const assignmentsByRole = useMemo(() => {
    const map = new Map<number, Assignment[]>();
    assignments.forEach((assignment) => {
      map.set(assignment.roleId, [...(map.get(assignment.roleId) ?? []), assignment]);
    });
    return map;
  }, [assignments]);

  const filteredRoles = useMemo(() => {
    const needle = roleSearch.trim().toLowerCase();
    return roles.filter((role) => !needle || `${role.displayName} ${role.name} ${role.description ?? ""}`.toLowerCase().includes(needle));
  }, [roles, roleSearch]);

  const visiblePages = useMemo(() => {
    const needle = permissionSearch.trim().toLowerCase();
    return pages.filter((page) => {
      if (!page.features.length) return false;
      return !needle || `${page.label} ${page.name} ${page.features.map((feature) => `${feature.label} ${feature.name}`).join(" ")}`.toLowerCase().includes(needle);
    });
  }, [pages, permissionSearch]);

  const editingRole = roleModal && roleModal !== "new" ? roleModal : null;

  function openPermissionModal(role: RoleItem) {
    const roleAssignments = assignmentsByRole.get(role.id) ?? [];
    setPermissionRole(role);
    setSelectedFeatureIds(new Set(roleAssignments.map((assignment) => assignment.featureId)));
    setExpandedPageIds(new Set());
    setPermissionSearch("");
    setResult(null);
  }

  function submitRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (editingRole) formData.set("id", String(editingRole.id));

    startTransition(async () => {
      const response = await saveRole(formData);
      setResult(response);
      if (response.ok) {
        setRoleModal(null);
        router.refresh();
      }
    });
  }

  function removeRole(role: RoleItem) {
    if (!window.confirm(`Delete role "${role.displayName}"? This will remove all permissions for this role.`)) return;
    startTransition(async () => {
      const response = await deleteRole(role.id);
      setResult(response);
      if (response.ok) router.refresh();
    });
  }

  function togglePage(page: PageItem) {
    const featureIds = page.features.map((feature) => feature.id);
    const allSelected = featureIds.every((id) => selectedFeatureIds.has(id));
    setSelectedFeatureIds((current) => {
      const next = new Set(current);
      featureIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }

  function toggleFeature(featureId: number) {
    setSelectedFeatureIds((current) => {
      const next = new Set(current);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  }

  function savePermissions() {
    if (!permissionRole) return;
    const selected = pages.flatMap((page) =>
      page.features
        .filter((feature) => selectedFeatureIds.has(feature.id))
        .map((feature) => ({ pageId: page.id, featureId: feature.id })),
    );
    const formData = new FormData();
    formData.set("roleId", String(permissionRole.id));
    formData.set("assignments", JSON.stringify(selected));

    startTransition(async () => {
      const response = await saveRolePermissions(formData);
      setResult(response);
      if (response.ok) {
        setPermissionRole(null);
        router.refresh();
      }
    });
  }

  function exportRoles() {
    const payload = {
      format: "reverence-role-permissions",
      exportedAt: new Date().toISOString(),
      roles: roles
        .filter((role) => role.name !== "super-admin")
        .map((role) => ({
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          permissions: (assignmentsByRole.get(role.id) ?? []).map((assignment) => ({
            pageId: assignment.pageId,
            featureId: assignment.featureId,
          })),
        })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roles-and-permissions-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    const payload = await file.text();
    const formData = new FormData();
    formData.set("payload", payload);
    startTransition(async () => {
      const response = await importRolePermissions(formData);
      setResult(response);
      if (response.ok) router.refresh();
      if (importRef.current) importRef.current.value = "";
    });
  }

  return (
    <div className="permission-manager mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            <Lock className="size-3.5" />
            Access control
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Permission Manager</h1>
         
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={exportRoles} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
            <Download className="size-4" />
            Export
          </button>
          <button type="button" onClick={() => importRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50">
            <Upload className="size-4" />
            Import
          </button>
          <input ref={importRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => importFile(event.target.files?.[0])} />
          <button type="button" onClick={() => { setResult(null); setRoleModal("new"); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
            <Plus className="size-4" />
            New Role
          </button>
        </div>
      </div>

      {result && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${result.ok ? "border-green-100 bg-green-50 text-green-700" : "border-red-100 bg-red-50 text-red-700"}`}>
          {result.message}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-gray-900">Roles</h2>
              <p className="text-xs text-gray-500">Choose a role to edit permissions</p>
            </div>
            <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">{roles.length} total</span>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} type="search" placeholder="Search roles..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <div className="p-3">
          <div className="max-h-[65vh] overflow-y-auto rounded-lg border border-gray-200">
            {filteredRoles.length ? filteredRoles.map((role) => (
              <article key={role.id} className="border-b border-gray-200 px-4 py-3 transition last:border-0 hover:bg-gray-50">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex min-w-0 items-center gap-3 md:flex-1">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <Shield className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-gray-900">{role.displayName}</h3>
                      <p className="truncate text-xs text-gray-500">{role.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:w-52">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <Users className="size-3.5 text-gray-400" />
                      {role.usersCount} users
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <Layers className="size-3.5 text-gray-400" />
                      {role.modulesCount} {role.modulesCount === 1 ? "module" : "modules"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 md:justify-end">
                    <button type="button" onClick={() => openPermissionModal(role)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-800">
                      <SlidersHorizontal className="size-4" />
                      Manage Permissions
                    </button>
                    <button type="button" onClick={() => { setResult(null); setRoleModal(role); }} disabled={role.name === "super-admin"} className="flex size-8 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40" title="Edit role">
                      <Edit className="size-4" />
                    </button>
                    {role.name !== "super-admin" && (
                      <button type="button" onClick={() => removeRole(role)} disabled={pending} className="flex size-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-100" title="Delete role">
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )) : (
              <div className="py-10 text-center text-sm text-gray-400">
                <Search className="mx-auto mb-3 size-8" />
                No matching roles found
              </div>
            )}
          </div>
        </div>
      </section>

      {roleModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/60 p-3 sm:p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">{editingRole ? "Edit Role" : "Create New Role"}</h3>
              <button type="button" onClick={() => setRoleModal(null)} className="flex size-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={submitRole} className="space-y-4 p-5">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Name *</label>
                <input name="displayName" defaultValue={editingRole?.displayName ?? ""} required placeholder="Finance Manager" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              {!editingRole && (
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">System key</label>
                  <input name="name" placeholder="finance-manager" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Description</label>
                <textarea name="description" rows={3} defaultValue={editingRole?.description ?? ""} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setRoleModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={pending} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Save Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {permissionRole && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-900/60 p-3 sm:p-4">
          <div className="flex max-h-[84vh] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-gray-900 sm:text-lg">Assign Permissions to {permissionRole.displayName}</h3>
                <p className="mt-1 text-xs text-gray-500">Select the pages and actions this role can use.</p>
              </div>
              <button type="button" onClick={() => setPermissionRole(null)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                <input value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} type="search" placeholder="Search pages or actions..." className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <div className="overflow-y-auto p-3 sm:p-4">
              <div className="overflow-hidden rounded-lg border border-gray-200">
                {visiblePages.map((page) => {
                  const featureIds = page.features.map((feature) => feature.id);
                  const sortedFeatures = [...page.features].sort((a, b) => (featureOrder[a.name] ?? 50) - (featureOrder[b.name] ?? 50));
                  const allSelected = featureIds.length > 0 && featureIds.every((id) => selectedFeatureIds.has(id));
                  const expanded = expandedPageIds.has(page.id);

                  return (
                    <section key={page.id} className="border-b border-gray-200 bg-white last:border-0">
                      <button
                        type="button"
                        onClick={() => setExpandedPageIds((current) => {
                          const next = new Set(current);
                          if (next.has(page.id)) next.delete(page.id);
                          else next.add(page.id);
                          return next;
                        })}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                        aria-expanded={expanded}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Layers className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-semibold text-gray-900">{page.label}</h4>
                          <p className="text-xs text-gray-500">{page.features.length} permissions</p>
                        </div>
                        <span className={`text-xs text-gray-400 transition ${expanded ? "rotate-180" : ""}`}>⌄</span>
                      </button>
                      {expanded && (
                        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                          <label className="mb-2 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-blue-700">
                            <input type="checkbox" checked={allSelected} onChange={() => togglePage(page)} className="rounded border-gray-300" />
                            Select all
                          </label>
                          <div className="flex flex-wrap gap-x-5 gap-y-2">
                            {sortedFeatures.map((feature) => (
                              <label key={feature.id} className="inline-flex cursor-pointer items-center gap-2 text-sm">
                                <input type="checkbox" checked={selectedFeatureIds.has(feature.id)} onChange={() => toggleFeature(feature.id)} className="rounded border-gray-300" />
                                <span className={`flex size-6 items-center justify-center rounded-md ${featureTone(feature.name)}`}>
                                  {feature.name.slice(0, 1).toUpperCase()}
                                </span>
                                <span>{feature.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">{selectedFeatureIds.size} permission{selectedFeatureIds.size === 1 ? "" : "s"} selected</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => setPermissionRole(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={savePermissions} disabled={pending || permissionRole.name === "super-admin"} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Save Permissions</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function featureTone(name: string) {
  if (name === "view") return "bg-emerald-50 text-emerald-600";
  if (name === "create") return "bg-blue-50 text-blue-600";
  if (name === "edit") return "bg-amber-50 text-amber-600";
  if (name === "delete") return "bg-red-50 text-red-600";
  if (name === "approve") return "bg-indigo-50 text-indigo-600";
  return "bg-gray-50 text-gray-600";
}
