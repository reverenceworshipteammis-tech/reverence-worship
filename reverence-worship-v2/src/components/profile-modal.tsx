"use client";

import Image from "next/image";
import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  Home,
  Mail,
  MapPin,
  Mars,
  NotebookText,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnProfileAction, type ProfileActionState } from "@/app/admin/profile/actions";
import { ActionNotice } from "@/components/action-notice";

export const OPEN_PROFILE_MODAL_EVENT = "reverence:open-profile";

export type ProfileModalData = {
  name: string;
  email: string;
  avatarUrl: string | null;
  status: string;
  roleLabels: string[];
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  membershipType: string | null;
  occupation: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  notes: string | null;
};

export function openProfileModal() {
  window.dispatchEvent(new Event(OPEN_PROFILE_MODAL_EVENT));
}

export function ProfileModalTrigger({
  children,
  className,
  onOpen,
}: {
  children: React.ReactNode;
  className?: string;
  onOpen?: () => void;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        onOpen?.();
        openProfileModal();
      }}
    >
      {children}
    </button>
  );
}

export function ProfileModal({
  profile,
  open,
  canEdit,
  onClose,
}: {
  profile: ProfileModalData;
  open: boolean;
  canEdit: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<ProfileActionState | null>(null);
  const [pending, startTransition] = useTransition();

  const closeModal = () => {
    setEditing(false);
    setNotice(null);
    onClose();
  };

  const submitProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await updateOwnProfileAction({}, formData);
        setNotice(result);
        if (result.ok) {
          setEditing(false);
          router.refresh();
        }
      } catch {
        setNotice({ ok: false, message: "Your profile could not be updated. Please try again." });
      }
    });
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editing) {
        setEditing(false);
        setNotice(null);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editing, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        aria-label="Close profile"
        onClick={closeModal}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="relative z-10 flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
      >
        <div className="relative border-b border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50/40 px-5 py-6 text-slate-900 sm:px-7 sm:py-7">
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {canEdit && !editing ? (
              <button
                type="button"
                aria-label="Edit profile"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
                onClick={() => {
                  setNotice(null);
                  setEditing(true);
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Edit profile</span>
              </button>
            ) : null}
            <button
              ref={closeButtonRef}
              type="button"
              className="flex size-9 items-center justify-center rounded-full border border-sky-200 bg-white/90 text-sky-700 shadow-sm transition hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
              aria-label="Close profile"
              onClick={closeModal}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-4 pr-10 sm:gap-5">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-sky-100 text-2xl font-bold text-sky-700 shadow-sm ring-1 ring-sky-200 sm:size-24">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.name} fill sizes="96px" className="object-cover" />
              ) : (
                initials(profile.name) || <User className="size-9" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">My Profile</p>
              <h2 id="profile-modal-title" className="mt-1 break-words text-xl font-bold sm:text-2xl">
                {profile.name}
              </h2>
              <p className="mt-1 break-all text-sm text-slate-600">{profile.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ProfileBadge icon={BadgeCheck} label={formatEnum(profile.status)} />
                {(profile.roleLabels.length ? profile.roleLabels : ["Member"]).map((role) => (
                  <ProfileBadge key={role} icon={ShieldCheck} label={role} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-5 sm:p-7">
          {notice ? (
            <ActionNotice
              message={notice.message ?? "Profile updated."}
              tone={notice.ok ? "success" : "error"}
              onClose={() => setNotice(null)}
              className="mb-5"
            />
          ) : null}

          {editing ? (
            <form onSubmit={submitProfile}>
              <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
                <ProfileSection title="Personal Information" icon={User} iconClassName="text-blue-600">
                  <ProfileField label="Full Name" name="name" defaultValue={profile.name} icon={User} required autoFocus />
                  <ProfileField label="Email Address" name="email" defaultValue={profile.email} icon={Mail} type="email" required />
                  <ProfileField label="Phone" name="phone" defaultValue={profile.phone} icon={Phone} type="tel" />
                  <ProfileSelect label="Gender" name="gender" defaultValue={profile.gender} icon={Mars} options={genderOptions} />
                  <ProfileField label="Date of Birth" name="dateOfBirth" defaultValue={toDateInput(profile.dateOfBirth)} icon={CalendarDays} type="date" />
                  <ProfileField label="Marital Status" name="maritalStatus" defaultValue={profile.maritalStatus} icon={Users} />
                  <ProfileSelect label="Membership Type" name="membershipType" defaultValue={profile.membershipType} icon={BadgeCheck} options={membershipOptions} />
                  <ProfileField label="Occupation" name="occupation" defaultValue={profile.occupation} icon={BriefcaseBusiness} last />
                </ProfileSection>

                <ProfileSection title="Address & Contact" icon={MapPin} iconClassName="text-emerald-600">
                  <ProfileField label="Province" name="province" defaultValue={profile.province} icon={MapPin} />
                  <ProfileField label="District" name="district" defaultValue={profile.district} icon={Home} />
                  <ProfileField label="Sector" name="sector" defaultValue={profile.sector} icon={MapPin} />
                  <ProfileField label="Cell" name="cell" defaultValue={profile.cell} icon={MapPin} />
                  <ProfileField label="Village" name="village" defaultValue={profile.village} icon={Home} />
                  <ProfileField label="Nick Name" name="emergencyName" defaultValue={profile.emergencyName} icon={Users} />
                  <ProfileField label="Emergency Phone" name="emergencyPhone" defaultValue={profile.emergencyPhone} icon={Phone} type="tel" />
                  <ProfileField label="Notes" name="notes" defaultValue={profile.notes} icon={NotebookText} multiline last />
                </ProfileSection>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setNotice(null);
                  }}
                  disabled={pending}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="size-4" aria-hidden="true" />
                  {pending ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          ) : (
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <ProfileSection title="Personal Information" icon={User} iconClassName="text-blue-600">
              <InfoRow label="Full Name" value={display(profile.name)} icon={User} />
              <InfoRow label="Email Address" value={display(profile.email)} icon={Mail} />
              <InfoRow label="Phone" value={display(profile.phone)} icon={Phone} />
              <InfoRow label="Gender" value={formatEnum(profile.gender)} icon={Mars} />
              <InfoRow label="Date of Birth" value={formatDate(profile.dateOfBirth)} icon={CalendarDays} />
              <InfoRow label="Marital Status" value={display(profile.maritalStatus)} icon={Users} />
              <InfoRow label="Membership Type" value={formatEnum(profile.membershipType)} icon={BadgeCheck} />
              <InfoRow label="Occupation" value={display(profile.occupation)} icon={BriefcaseBusiness} last />
            </ProfileSection>

            <ProfileSection title="Address & Contact" icon={MapPin} iconClassName="text-emerald-600">
              <InfoRow label="Province" value={display(profile.province)} icon={MapPin} />
              <InfoRow label="District" value={display(profile.district)} icon={Home} />
              <InfoRow label="Sector" value={display(profile.sector)} icon={MapPin} />
              <InfoRow label="Cell" value={display(profile.cell)} icon={MapPin} />
              <InfoRow label="Village" value={display(profile.village)} icon={Home} />
              <InfoRow label="Nick Name" value={display(profile.emergencyName)} icon={Users} />
              <InfoRow label="Emergency Phone" value={display(profile.emergencyPhone)} icon={Phone} />
              <InfoRow label="Notes" value={display(profile.notes)} icon={NotebookText} last />
            </ProfileSection>
          </div>
          )}
        </div>
      </section>
    </div>
  );
}

const genderOptions = [
  { value: "", label: "Not specified" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const membershipOptions = [
  { value: "", label: "Not specified" },
  { value: "permanent", label: "Permanent" },
  { value: "temporary", label: "Temporary" },
  { value: "visitor", label: "Visitor" },
];

function ProfileBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-sky-200">
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  );
}

function ProfileSection({
  title,
  icon: Icon,
  iconClassName,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconClassName: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
        <Icon className={`size-5 ${iconClassName}`} aria-hidden="true" />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
  last = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  last?: boolean;
}) {
  return (
    <div className={`flex gap-3 pb-3 ${last ? "" : "border-b border-gray-100"}`}>
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Icon className="size-4 text-gray-400" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-gray-500">{label}</div>
        <div className="break-words text-sm font-semibold text-gray-800">{value}</div>
      </div>
    </div>
  );
}

function ProfileField({
  label,
  name,
  defaultValue,
  icon: Icon,
  type = "text",
  required = false,
  autoFocus = false,
  multiline = false,
  last = false,
}: {
  label: string;
  name: string;
  defaultValue: string | null | undefined;
  icon: LucideIcon;
  type?: React.HTMLInputTypeAttribute;
  required?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
  last?: boolean;
}) {
  const controlClassName = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className={`flex gap-3 pb-3 ${last ? "" : "border-b border-gray-100"}`}>
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Icon className="size-4 text-gray-400" aria-hidden="true" />
      </div>
      <label className="min-w-0 flex-1 text-xs font-medium text-gray-600">
        {label}
        {multiline ? (
          <textarea name={name} defaultValue={defaultValue ?? ""} rows={3} maxLength={1000} className={controlClassName} />
        ) : (
          <input name={name} defaultValue={defaultValue ?? ""} type={type} required={required} autoFocus={autoFocus} className={controlClassName} />
        )}
      </label>
    </div>
  );
}

function ProfileSelect({
  label,
  name,
  defaultValue,
  icon: Icon,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string | null | undefined;
  icon: LucideIcon;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex gap-3 border-b border-gray-100 pb-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
        <Icon className="size-4 text-gray-400" aria-hidden="true" />
      </div>
      <label className="min-w-0 flex-1 text-xs font-medium text-gray-600">
        {label}
        <select
          name={name}
          defaultValue={defaultValue ?? ""}
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    </div>
  );
}

function display(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
}

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
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
