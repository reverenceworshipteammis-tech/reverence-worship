"use client";

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
  highestEducationLevel: string | null;
  educationFieldOfStudy: string | null;
  province: string | null;
  district: string | null;
  sector: string | null;
  cell: string | null;
  village: string | null;
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

