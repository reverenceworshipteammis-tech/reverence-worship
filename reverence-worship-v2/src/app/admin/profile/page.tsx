import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Home,
  Mail,
  MapPin,
  Mars,
  NotebookText,
  Phone,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import Image from "next/image";
import { requirePageAccess } from "@/lib/auth";

function display(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatDate(date: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatEnum(value: string | null | undefined) {
  if (!value) return "-";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function InfoRow({
  label,
  value,
  icon: Icon,
  last = false,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  last?: boolean;
}) {
  return (
    <div className={`flex gap-3 pb-3 ${last ? "" : "border-b border-gray-100"}`}>
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Icon className="size-4 text-gray-400" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="break-words text-sm font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await requirePageAccess("profile");
  const roleLabels = user.roles.map((userRole) => userRole.role.displayName);

  return (
    <div className="mx-auto max-w-4xl">
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-7 text-white sm:px-6 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white/20 text-3xl font-bold text-white">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.name} fill sizes="96px" className="object-cover" />
              ) : (
                initials(user.name) || <User className="size-10" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-2xl font-bold">{user.name}</h2>
              <p className="mt-1 break-all text-sm text-blue-100">{user.email}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {formatEnum(user.status)}
                </span>
                {roleLabels.length > 0 ? (
                  roleLabels.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25"
                    >
                      <ShieldCheck className="size-3.5" aria-hidden />
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white ring-1 ring-white/25">
                    <ShieldCheck className="size-3.5" aria-hidden />
                    Member
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <section>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <User className="size-5 text-blue-500" aria-hidden />
                Personal Information
              </h3>
              <div className="space-y-3">
                <InfoRow label="Full Name" value={display(user.name)} icon={User} />
                <InfoRow label="Email Address" value={display(user.email)} icon={Mail} />
                <InfoRow label="Phone" value={display(user.phone)} icon={Phone} />
                <InfoRow label="Gender" value={formatEnum(user.gender)} icon={Mars} />
                <InfoRow label="Date of Birth" value={formatDate(user.dateOfBirth)} icon={CalendarDays} />
                <InfoRow label="Marital Status" value={display(user.maritalStatus)} icon={Users} />
                <InfoRow label="Membership Type" value={formatEnum(user.membershipType)} icon={BadgeCheck} />
                <InfoRow label="Occupation" value={display(user.occupation)} icon={BriefcaseBusiness} last />
              </div>
            </section>

            <section>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <MapPin className="size-5 text-green-500" aria-hidden />
                Address & Contact
              </h3>
              <div className="space-y-3">
                <InfoRow label="Province" value={display(user.province)} icon={MapPin} />
                <InfoRow label="District" value={display(user.district)} icon={Home} />
                <InfoRow label="Sector" value={display(user.sector)} icon={MapPin} />
                <InfoRow label="Village" value={display(user.village)} icon={Home} />
                <InfoRow label="Emergency Name" value={display(user.emergencyName)} icon={Users} />
                <InfoRow label="Emergency Phone" value={display(user.emergencyPhone)} icon={Phone} />
                <InfoRow label="Notes" value={display(user.notes)} icon={NotebookText} last />
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
