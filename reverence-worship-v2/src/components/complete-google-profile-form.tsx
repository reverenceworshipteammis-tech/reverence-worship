"use client";

import Image from "next/image";
import { useActionState } from "react";
import { Calendar, Heart, Home, Mail, Map, MapPin, Phone, User, Users } from "lucide-react";
import { completeGoogleProfileAction } from "@/app/auth-actions";
import { AuthFormButton } from "@/components/auth-form-button";

type CompleteGoogleProfileFormProps = {
  user: {
    name: string;
    email: string;
    phone: string | null;
    dateOfBirth: string;
    gender: string | null;
    maritalStatus: string | null;
    province: string | null;
    district: string | null;
    sector: string | null;
    village: string | null;
  };
};

const fieldClass = "auth-field";

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  icon: Icon,
  readOnly = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  type?: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-700" htmlFor={name}>
        {label} {!readOnly && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Icon className="auth-field-icon size-4" aria-hidden />
        <input
          id={name}
          name={name}
          type={type}
          required={!readOnly}
          readOnly={readOnly}
          defaultValue={defaultValue ?? ""}
          className={`${fieldClass} ${readOnly ? "bg-gray-50 text-gray-500" : ""}`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  icon: Icon,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-700" htmlFor={name}>
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Icon className="auth-field-icon size-4" aria-hidden />
        <select id={name} name={name} required defaultValue={defaultValue ?? ""} className="auth-field cursor-pointer">
          {children}
        </select>
      </div>
    </div>
  );
}

export function CompleteGoogleProfileForm({ user }: CompleteGoogleProfileFormProps) {
  const [state, formAction] = useActionState(completeGoogleProfileAction, {});

  return (
    <form action={formAction}>
      <div className="mb-6 flex justify-center">
        <span className="relative h-20 w-full max-w-[340px] overflow-hidden">
          <Image
            src="/reverence-logo-transparent.png"
            alt="Reverence Worship Team logo"
            fill
            sizes="340px"
            className="scale-[1.9] object-contain"
            priority
          />
        </span>
      </div>

      <div className="mb-5">
        <h2 className="auth-display text-2xl font-extrabold text-gray-900">Complete Your Profile</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add the required registration details before accessing the system.
        </p>
      </div>

      {state.error ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {state.error}
        </p>
      ) : null}

      <div className="form-scroll">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full Name" name="name" defaultValue={user.name} placeholder="Full name" icon={User} />
          <Field label="Email Address" name="email" defaultValue={user.email} type="email" placeholder="name@example.com" icon={Mail} readOnly />
          <Field label="Phone Number" name="phone" defaultValue={user.phone} type="tel" placeholder="+250 7XX XXX XXX" icon={Phone} />
          <Field label="Date of Birth" name="dateOfBirth" defaultValue={user.dateOfBirth} type="date" placeholder="" icon={Calendar} />

          <SelectField label="Gender" name="gender" defaultValue={user.gender} icon={Users}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </SelectField>

          <SelectField label="Marital Status" name="maritalStatus" defaultValue={user.maritalStatus} icon={Heart}>
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </SelectField>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Province" name="province" defaultValue={user.province} placeholder="Province" icon={MapPin} />
          <Field label="District" name="district" defaultValue={user.district} placeholder="District" icon={Map} />
          <Field label="Sector" name="sector" defaultValue={user.sector} placeholder="Sector" icon={MapPin} />
          <Field label="Village" name="village" defaultValue={user.village} placeholder="Village" icon={Home} />
        </div>
      </div>

      <div className="mt-5">
        <AuthFormButton>
          <User className="size-4" aria-hidden="true" />
          Continue
        </AuthFormButton>
      </div>
    </form>
  );
}
