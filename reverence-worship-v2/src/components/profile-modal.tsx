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
  Phone,
  ShieldCheck,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

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
  onClose,
}: {
  profile: ProfileModalData;
  open: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-5" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
        aria-label="Close profile"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="relative z-10 flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[90vh] sm:max-w-4xl sm:rounded-2xl"
      >
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-6 text-white sm:px-7 sm:py-7">
          <button
            ref={closeButtonRef}
            type="button"
            className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close profile"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-4 pr-10 sm:gap-5">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/90 bg-white/20 text-2xl font-bold sm:size-24">
              {profile.avatarUrl ? (
                <Image src={profile.avatarUrl} alt={profile.name} fill sizes="96px" className="object-cover" />
              ) : (
                initials(profile.name) || <User className="size-9" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">My Profile</p>
              <h2 id="profile-modal-title" className="mt-1 break-words text-xl font-bold sm:text-2xl">
                {profile.name}
              </h2>
              <p className="mt-1 break-all text-sm text-blue-100">{profile.email}</p>
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
              <InfoRow label="Emergency Name" value={display(profile.emergencyName)} icon={Users} />
              <InfoRow label="Emergency Phone" value={display(profile.emergencyPhone)} icon={Phone} />
              <InfoRow label="Notes" value={display(profile.notes)} icon={NotebookText} last />
            </ProfileSection>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileBadge({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white ring-1 ring-white/25">
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

function display(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(value),
  );
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
