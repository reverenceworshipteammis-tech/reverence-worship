"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  FileUp,
  Mars,
  RotateCcw,
  Search,
  UserCheck,
  UserPlus,
  UserRoundX,
  Users,
  Venus,
  X,
} from "lucide-react";
import {
  createUserAction,
  importUsersCsvAction,
  runUserTableAction,
  updateUserAction,
  updateUserRoleAction,
  updateUserRolesAction,
  type UserActionState,
} from "@/app/admin/users/actions";

type Role = {
  id: number;
  name: string;
  displayName: string;
};

type UserRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  village: string | null;
  maritalStatus: string | null;
  membershipType: string | null;
  occupation: string | null;
  skills: string | null;
  status: "active" | "pending" | "inactive";
  createdAt: string;
  roles: Role[];
};

type Stats = {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  permanent: number;
  male: number;
  female: number;
};

const statCards = [
  { key: "total", label: "Total Users", icon: Users, iconClass: "bg-blue-100 text-blue-600", valueClass: "text-gray-800" },
  { key: "active", label: "Active", icon: UserCheck, iconClass: "bg-green-100 text-green-600", valueClass: "text-green-600" },
  { key: "inactive", label: "Inactive", icon: UserRoundX, iconClass: "bg-red-100 text-red-600", valueClass: "text-red-600" },
  { key: "pending", label: "Pending", icon: Clock3, iconClass: "bg-yellow-100 text-yellow-600", valueClass: "text-yellow-600" },
  { key: "permanent", label: "Permanent", icon: Users, iconClass: "bg-indigo-100 text-indigo-600", valueClass: "text-indigo-600" },
  { key: "male", label: "Male", icon: Mars, iconClass: "bg-blue-100 text-blue-600", valueClass: "text-blue-600" },
  { key: "female", label: "Female", icon: Venus, iconClass: "bg-pink-100 text-pink-600", valueClass: "text-pink-600" },
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusBadge(status: UserRow["status"]) {
  if (status === "active") {
    return "bg-green-100 text-green-700";
  }

  if (status === "pending") {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-red-100 text-red-700";
}

function displayRoles(user: UserRow) {
  return user.roles.filter((role) => role.name !== "super-admin");
}

function hasFullSystemAccess(user: UserRow) {
  return user.roles.some((role) => role.name === "super-admin");
}

export function UserManagementClient({
  users,
  roles,
  stats,
}: {
  users: UserRow[];
  roles: Role[];
  stats: Stats;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [viewUser, setViewUser] = useState<UserRow | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [rolesUser, setRolesUser] = useState<UserRow | null>(null);
  const [message, setMessage] = useState<UserActionState | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: UserRow; action: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [createState, createAction] = useActionState<UserActionState, FormData>(
    createUserAction,
    {},
  );
  const [editState, editAction] = useActionState<UserActionState, FormData>(
    updateUserAction,
    {},
  );
  const [rolesState, rolesAction] = useActionState<UserActionState, FormData>(
    updateUserRolesAction,
    {},
  );
  const [importState, importAction] = useActionState<UserActionState, FormData>(
    importUsersCsvAction,
    {},
  );

  const currentFilters = useMemo(
    () => ({
      search: searchParams.get("search") ?? "",
      role: searchParams.get("role") ?? "",
      status: searchParams.get("status") ?? "",
    }),
    [searchParams],
  );

  function pushFilters(filters: { search?: string; role?: string; status?: string }) {
    const params = new URLSearchParams();
    const search = filters.search?.trim() ?? "";
    const role = filters.role ?? "";
    const status = filters.status ?? "";

    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (status) params.set("status", status);

    startTransition(() => {
      router.push(`/admin/users${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  function applyFilters(formData: FormData) {
    pushFilters({
      search: String(formData.get("search") || ""),
      role: String(formData.get("role") || ""),
      status: String(formData.get("status") || ""),
    });
  }

  function resetFilters() {
    startTransition(() => {
      router.push("/admin/users");
    });
  }

  function exportPath(kind: "csv" | "pdf") {
    const params = new URLSearchParams();
    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.role) params.set("role", currentFilters.role);
    if (currentFilters.status) params.set("status", currentFilters.status);

    const base = kind === "csv" ? "/admin/users/export" : "/admin/users/export-pdf";
    return `${base}${params.toString() ? `?${params.toString()}` : ""}`;
  }

  function handleUserAction(user: UserRow, action: string) {
    if (!action) return;

    if (action === "view") {
      setViewUser(user);
      return;
    }

    if (action === "edit") {
      setEditUser(user);
      return;
    }

    if (action === "roles") {
      setRolesUser(user);
      return;
    }

    setConfirmAction({ user, action });
  }

  function executeConfirmedAction() {
    if (!confirmAction) return;
    const formData = new FormData();
    formData.set("userId", String(confirmAction.user.id));
    formData.set("action", confirmAction.action);

    startTransition(async () => {
      const result = await runUserTableAction(formData);
      setMessage(result);
      setConfirmAction(null);
      router.refresh();
    });
  }

  function handleRoleChange(userId: number, roleId: string) {
    if (!roleId) return;

    const formData = new FormData();
    formData.set("userId", String(userId));
    formData.set("roleId", roleId);

    startTransition(async () => {
      const result = await updateUserRoleAction(formData);
      setMessage(result);
      router.refresh();
    });
  }

  const visibleNotice = message?.message
    ? message
    : createState.message
      ? createState
      : editState.message
        ? editState
        : rolesState.message
          ? rolesState
          : importState.message
            ? importState
            : null;

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-4">
      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6 2xl:grid-cols-7">
        {statCards.filter((stat) => stat.key !== "pending" || stats.pending > 0).map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.key}
              className="flex items-center gap-1 rounded-lg bg-white p-2 shadow-sm transition hover:shadow-md sm:gap-2 sm:p-3"
            >
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-full sm:size-8 ${stat.iconClass}`}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[8px] uppercase text-gray-500 sm:text-[10px]">{stat.label}</p>
                <p className={`text-base font-bold sm:text-lg ${stat.valueClass}`}>
                  {stats[stat.key].toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4 rounded-xl bg-white p-3 shadow-sm sm:p-4">
        <form action={applyFilters} className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-end">
          <div className="min-w-[150px] flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Search name or email</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                name="search"
                placeholder="Search..."
                defaultValue={currentFilters.search}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.currentTarget.value = "";
                    pushFilters({
                      role: currentFilters.role,
                      status: currentFilters.status,
                    });
                  }
                }}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
              <select
                name="role"
                defaultValue={currentFilters.role}
                onChange={(event) =>
                  pushFilters({
                    search: currentFilters.search,
                    role: event.target.value,
                    status: currentFilters.status,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-32"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Status</label>
              <select
                name="status"
                defaultValue={currentFilters.status}
                onChange={(event) =>
                  pushFilters({
                    search: currentFilters.search,
                    role: currentFilters.role,
                    status: event.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-28"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-200"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-2 py-2 text-sm text-white transition hover:bg-green-700 sm:px-3"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Add User</span>
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-sm text-white transition hover:bg-blue-700 sm:px-3"
            >
              <FileUp className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Import Users</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = exportPath("csv");
              }}
              className="flex items-center gap-1 rounded-lg bg-gray-600 px-2 py-2 text-sm text-white transition hover:bg-gray-700 sm:px-3"
            >
              <Download className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.open(exportPath("pdf"), "_blank");
              }}
              className="flex items-center gap-1 rounded-lg bg-red-600 px-2 py-2 text-sm text-white transition hover:bg-red-700 sm:px-3"
            >
              <FileText className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </form>
      </div>

      {visibleNotice?.message && (
        <UserNotice
          ok={visibleNotice.ok !== false}
          message={visibleNotice.message}
          onClose={() => setMessage(null)}
        />
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  User / Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Registered
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {users.map((user) => {
                const visibleRoles = displayRoles(user);
                const fullSystemAccess = hasFullSystemAccess(user);

                return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-700">
                        <span className="text-xs font-bold text-white">{initials(user.name)}</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{user.phone || "-"}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={visibleRoles[0]?.id ?? ""}
                      onChange={(event) => handleRoleChange(user.id, event.target.value)}
                      disabled={isPending || fullSystemAccess}
                      className="rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-xs text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{fullSystemAccess ? "Full System Access" : "No Role"}</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs capitalize ${statusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{user.createdAt}</td>
                  <td className="px-4 py-3 text-sm">
                    <select
                      disabled={isPending}
                      onChange={(event) => {
                        handleUserAction(user, event.target.value);
                        event.target.value = "";
                      }}
                      className="w-28 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Action</option>
                      <option value="view">View Details</option>
                      <option value="edit">Edit User</option>
                  {user.status === "pending" && <option value="approve">Approve User</option>}
                  {user.status === "pending" && <option value="reject">Reject User</option>}
                      {user.status === "active" && <option value="deactivate">Deactivate User</option>}
                      {user.status === "inactive" && <option value="activate">Activate User</option>}
                      {!fullSystemAccess && <option value="roles">Manage Roles</option>}
                      <option value="delete">Delete User</option>
                    </select>
                  </td>
                </tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="block divide-y divide-gray-200 md:hidden">
          {users.map((user) => {
            const visibleRoles = displayRoles(user);
            const fullSystemAccess = hasFullSystemAccess(user);

            return (
            <div key={user.id} className="p-4 transition hover:bg-gray-50">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-700">
                    <span className="text-xs font-bold text-white">{initials(user.name)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <select
                  disabled={isPending}
                  onChange={(event) => {
                    handleUserAction(user, event.target.value);
                    event.target.value = "";
                  }}
                  className="ml-2 w-24 shrink-0 rounded-md border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Action</option>
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                  {user.status === "pending" && <option value="approve">Approve</option>}
                  {user.status === "pending" && <option value="reject">Reject</option>}
                  {user.status === "active" && <option value="deactivate">Deactivate</option>}
                  {user.status === "inactive" && <option value="activate">Activate</option>}
                  {!fullSystemAccess && <option value="roles">Roles</option>}
                  <option value="delete">Delete</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Phone:</span>{" "}
                  <span className="text-gray-700">{user.phone || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Role:</span>{" "}
                  <span className="text-gray-700">{fullSystemAccess ? "Full System Access" : visibleRoles[0]?.displayName || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>{" "}
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge(user.status)}`}>
                    {user.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Joined:</span>{" "}
                  <span className="text-gray-700">{user.createdAt}</span>
                </div>
              </div>
            </div>
            );
          })}
          {users.length === 0 && <p className="p-8 text-center text-gray-500">No users found</p>}
        </div>
      </div>

      {viewUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">User Details</h2>
              <button type="button" onClick={() => setViewUser(null)} className="text-gray-400 hover:text-gray-700">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-5 p-5">
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-blue-700 shadow-md">
                  <span className="text-2xl font-bold text-white">{initials(viewUser.name)}</span>
                </div>
                <div className="text-center sm:text-left">
                  <h3 className="text-xl font-bold text-gray-900">{viewUser.name}</h3>
                  <p className="text-sm text-gray-600">{viewUser.email}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <span className={`rounded-full px-2.5 py-1 text-xs capitalize ${statusBadge(viewUser.status)}`}>
                      {viewUser.status}
                    </span>
                    {hasFullSystemAccess(viewUser) ? (
                      <span className="rounded-full bg-gray-900 px-2.5 py-1 text-xs text-white">
                        Full System Access
                      </span>
                    ) : null}
                    {displayRoles(viewUser).map((role) => (
                      <span key={role.id} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs text-blue-700">
                        {role.displayName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {[
                ["Personal Information", [
                  ["Full Name", viewUser.name],
                  ["Email Address", viewUser.email],
                  ["Phone Number", viewUser.phone || "-"],
                  ["Gender", viewUser.gender || "-"],
                  ["Date of Birth", viewUser.dateOfBirth || "-"],
                  ["Marital Status", viewUser.maritalStatus || "-"],
                  ["Membership Type", viewUser.membershipType || "-"],
                  ["Occupation", viewUser.occupation || "-"],
                ]],
                ["Address Information", [
                  ["Province", viewUser.province || "-"],
                  ["District", viewUser.district || "-"],
                  ["Sector", viewUser.sector || "-"],
                  ["Village", viewUser.village || "-"],
                ]],
                ["Additional Information", [["Skills", viewUser.skills || "-"]]],
              ].map(([title, items]) => (
                <section key={title as string}>
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">{title as string}</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(items as string[][]).map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <label className="text-xs text-gray-500">{label}</label>
                        <p className="truncate text-sm font-medium text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <button type="button" onClick={() => setViewUser(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
                  Close
                </button>
                <button type="button" onClick={() => { setEditUser(viewUser); setViewUser(null); }} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  Edit
                </button>
                <button type="button" onClick={() => window.open(`/admin/users/${viewUser.id}/export-pdf`, "_blank")} className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <ActionNoticeModal
          user={confirmAction.user}
          action={confirmAction.action}
          pending={isPending}
          onCancel={() => setConfirmAction(null)}
          onConfirm={executeConfirmedAction}
        />
      )}

      {importOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Import Users</h2>
              <button type="button" onClick={() => setImportOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form action={importAction} className="space-y-4 p-5">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
                <p className="font-semibold">Expected columns</p>
                <p className="mt-1 leading-5">
                  Full Name, Email, Phone Number, Roles, Status, Date of Birth, Gender, Marital Status, Residence, Family, Occupation, Membership Type, Approval Status.
                </p>
                <p className="mt-2 text-xs text-blue-700">
                  New password accounts use default password <strong>Pass@123</strong>. Existing Google sign-in accounts keep Google-only login.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">CSV file</label>
                <input
                  name="file"
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">Upload CSV or tab-separated text only. If your file is Excel, open it and save as CSV first.</p>
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={() => setImportOpen(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={() => setTimeout(() => { setImportOpen(false); router.refresh(); }, 700)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <FileUp className="size-4" aria-hidden="true" />
                  Import Users
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Edit User</h2>
              <button type="button" onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-700">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form action={editAction} className="p-5">
              <input type="hidden" name="userId" value={editUser.id} />
              <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                <input name="name" defaultValue={editUser.name} required className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="email" defaultValue={editUser.email} required type="email" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="phone" defaultValue={editUser.phone || ""} placeholder="Phone Number" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="dateOfBirth" defaultValue={editUser.dateOfBirth} type="date" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="province" defaultValue={editUser.province || ""} placeholder="Province" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="district" defaultValue={editUser.district || ""} placeholder="District" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="sector" defaultValue={editUser.sector || ""} placeholder="Sector" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input name="village" defaultValue={editUser.village || ""} placeholder="Village" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select name="gender" defaultValue={editUser.gender || ""} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option>
                </select>
                <select name="status" defaultValue={editUser.status} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option>
                </select>
                <input name="maritalStatus" defaultValue={editUser.maritalStatus || ""} placeholder="Marital Status" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select name="membershipType" defaultValue={editUser.membershipType || ""} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Membership Type</option><option value="permanent">Permanent</option><option value="temporary">Temporary Member</option><option value="visitor">Partner</option>
                </select>
                <input name="occupation" defaultValue={editUser.occupation || ""} placeholder="Occupation" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <textarea name="skills" defaultValue={editUser.skills || ""} placeholder="Skills / Talents" rows={2} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2" />
                <div className="border-t pt-3 sm:col-span-2">
                  <h3 className="text-sm font-bold text-gray-700">Security</h3>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">New Password (Optional)</label>
                  <input name="password" type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="mt-1 text-xs text-gray-500">Leave blank to keep current password</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Confirm New Password</label>
                  <input name="passwordConfirmation" type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={() => setEditUser(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">Cancel</button>
                <button type="submit" onClick={() => setTimeout(() => { setEditUser(null); router.refresh(); }, 500)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rolesUser && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Manage Roles</h2>
              <button type="button" onClick={() => setRolesUser(null)} className="text-gray-400 hover:text-gray-700">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form action={rolesAction} className="p-5">
              <input type="hidden" name="userId" value={rolesUser.id} />
              <p className="mb-3 text-sm text-gray-600">{rolesUser.name}</p>
              <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                    <input type="checkbox" name="roles" value={role.id} defaultChecked={rolesUser.roles.some((userRole) => userRole.id === role.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700">{role.displayName}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={() => setRolesUser(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">Cancel</button>
                <button type="submit" onClick={() => setTimeout(() => { setRolesUser(null); router.refresh(); }, 500)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Update Roles</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="text-lg font-bold text-gray-900">Add User</h2>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form action={createAction} className="p-5">
              <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Full Name *</label>
                  <input name="name" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Email Address *</label>
                  <input name="email" required type="email" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Phone Number</label>
                  <input name="phone" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Date of Birth</label>
                  <input name="dateOfBirth" type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Province</label>
                  <select name="province" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Province</option>
                    <option value="Kigali">Kigali</option>
                    <option value="Northern">Northern</option>
                    <option value="Southern">Southern</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Western">Western</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">District</label>
                  <input name="district" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Sector</label>
                  <input name="sector" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Village</label>
                  <input name="village" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Gender</label>
                  <select name="gender" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Marital Status</label>
                  <select name="maritalStatus" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Membership Type</label>
                  <select name="membershipType" defaultValue="permanent" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="permanent">Permanent</option>
                    <option value="temporary">Temporary Member</option>
                    <option value="visitor">Partner</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Occupation</label>
                  <input name="occupation" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Skills / Talents</label>
                  <textarea name="skills" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Password *</label>
                  <input name="password" required type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Confirm Password *</label>
                  <input name="passwordConfirmation" required type="password" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-xs font-semibold text-gray-700">Assign Roles</label>
                  <div className="grid max-h-28 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-2 sm:grid-cols-2">
                    {roles.map((role) => (
                      <label key={role.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          name="roles"
                          value={role.id}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{role.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <input type="hidden" name="status" value="active" />
              </div>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200">
                  Cancel
                </button>
                <button type="submit" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UserNotice({ ok, message, onClose }: { ok: boolean; message: string; onClose: () => void }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${
        ok ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
      }`}
      role="status"
    >
      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${ok ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{ok ? "Success" : "Notice"}</p>
        <p className="mt-0.5 text-sm leading-5">{message}</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-lg p-1 text-current opacity-60 transition hover:bg-white/70 hover:opacity-100" aria-label="Close notice">
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function actionCopy(action: string, user: UserRow) {
  const actionLabel = action[0].toUpperCase() + action.slice(1);
  const destructive = action === "delete" || action === "reject" || action === "deactivate";

  return {
    destructive,
    title: `${actionLabel} User`,
    message:
      action === "delete"
        ? `This will permanently delete ${user.name}. This action cannot be undone.`
        : action === "reject"
          ? `This will reject ${user.name}'s registration and remove the user from the system.`
          : action === "deactivate"
            ? `This will deactivate ${user.name}'s account. They will no longer be active.`
            : action === "approve"
              ? `This will approve ${user.name}'s registration and activate the account.`
              : `This will ${action} ${user.name}'s account.`,
    confirmLabel:
      action === "delete"
        ? "Delete User"
        : action === "reject"
          ? "Reject User"
          : action === "deactivate"
            ? "Deactivate"
            : action === "approve"
              ? "Approve User"
              : actionLabel,
  };
}

function ActionNoticeModal({
  user,
  action,
  pending,
  onCancel,
  onConfirm,
}: {
  user: UserRow;
  action: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = actionCopy(action, user);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className={`flex items-center gap-3 px-5 py-4 ${copy.destructive ? "bg-red-50" : "bg-blue-50"}`}>
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${copy.destructive ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
            {copy.destructive ? <AlertTriangle className="size-5" aria-hidden="true" /> : <CheckCircle2 className="size-5" aria-hidden="true" />}
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">{copy.title}</h2>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-gray-600">{copy.message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t bg-gray-50 px-5 py-4">
          <button type="button" onClick={onCancel} disabled={pending} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${copy.destructive ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {pending ? "Please wait..." : copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
