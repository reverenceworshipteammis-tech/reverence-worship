"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import {
  ArrowLeft,
  Calendar,
  Heart,
  Home,
  Mail,
  Map,
  MapPin,
  Phone,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { registerAction } from "@/app/auth-actions";
import { AuthFormButton } from "@/components/auth-form-button";
import { PasswordField } from "@/components/password-field";

function Field({
  label,
  name,
  type = "text",
  placeholder,
  icon: Icon,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-700" htmlFor={name}>
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Icon className="auth-field-icon size-4" aria-hidden />
        <input id={name} name={name} type={type} required className="auth-field" placeholder={placeholder} />
      </div>
    </div>
  );
}

function SelectField({
  label,
  name,
  icon: Icon,
  children,
}: {
  label: string;
  name: string;
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
        <select id={name} name={name} required className="auth-field cursor-pointer">
          {children}
        </select>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, {});

  return (
    <form action={formAction}>
      <Link href="/" className="mb-7 hidden justify-center md:flex" aria-label="Reverence Worship Team home">
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
      </Link>

      <Link href="/" className="mobile-card-brand" aria-label="Back to home">
        <div className="brand-mark size-9 rounded-[0.7rem] border-blue-100 bg-blue-50">
          <Image
            src="/logo.png"
            alt="Reverence Worship"
            width={36}
            height={36}
            className="h-full w-full object-contain p-1"
          />
        </div>
        <div>
          <p className="font-extrabold tracking-wide text-white">REVERENCE</p>
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.08em] text-blue-200">
            Worship Team
          </p>
        </div>
      </Link>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="auth-display text-2xl font-extrabold text-gray-900">Create Account</h2>
          <p className="mt-1 text-sm text-gray-500">All fields are required.</p>
        </div>
        <Link
          href="/"
          className="auth-link inline-flex w-fit shrink-0 items-center gap-2 rounded-full border border-blue-800/20 bg-white/60 px-3 py-2 text-xs font-semibold transition hover:bg-white"
        >
          <ArrowLeft className="size-3" aria-hidden="true" />
          <span>Back to Home</span>
        </Link>
      </div>

      {state.error ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {state.error}
        </p>
      ) : null}

      <div className="form-scroll">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Full Name" name="name" placeholder="Full name" icon={User} />
          <Field label="Email Address" name="email" type="email" placeholder="name@example.com" icon={Mail} />
          <Field label="Phone Number" name="phone" type="tel" placeholder="+250 7XX XXX XXX" icon={Phone} />
          <Field label="Date of Birth" name="dateOfBirth" type="date" placeholder="" icon={Calendar} />

          <SelectField label="Gender" name="gender" icon={Users}>
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </SelectField>

          <SelectField label="Marital Status" name="maritalStatus" icon={Heart}>
            <option value="">Select Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </SelectField>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Province" name="province" placeholder="Province" icon={MapPin} />
          <Field label="District" name="district" placeholder="District" icon={Map} />
          <Field label="Sector" name="sector" placeholder="Sector" icon={MapPin} />
          <Field label="Village" name="village" placeholder="Village" icon={Home} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PasswordField
            id="password"
            name="password"
            label="Password *"
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
          />
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password *"
            placeholder="Confirm password"
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="mt-5">
        <AuthFormButton>
          <UserPlus className="size-4" aria-hidden="true" />
          Create Account
        </AuthFormButton>
      </div>

      <p className="mt-5 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="auth-link font-semibold">
          Sign in
        </Link>
      </p>
    </form>
  );
}
