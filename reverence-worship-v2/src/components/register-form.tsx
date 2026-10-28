"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  Clock3,
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
import { ChoiceSelect, type ChoiceOption } from "@/components/choice-select";
import { EducationFields } from "@/components/education-fields";
import { PasswordField } from "@/components/password-field";

function Field({
  label,
  name,
  type = "text",
  placeholder,
  icon: Icon,
  optional = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[0.7rem] font-semibold text-gray-700" htmlFor={name}>
        {label} {!optional && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Icon className="auth-field-icon size-4" aria-hidden />
        <input id={name} name={name} type={type} required={!optional} className="auth-field" placeholder={placeholder} />
      </div>
    </div>
  );
}

function SelectField({
  label,
  name,
  icon: Icon,
  placeholder,
  options,
}: {
  label: string;
  name: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  placeholder: string;
  options: ChoiceOption[];
}) {
  return (
    <div>
      <label className="mb-1 block text-[0.7rem] font-semibold text-gray-700" htmlFor={name}>
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <Icon className="auth-field-icon size-4" aria-hidden />
        <ChoiceSelect id={name} name={name} required options={options} placeholder={placeholder} className="auth-field cursor-pointer" />
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, {});

  if (state.success) {
    return (
      <div className="flex min-h-[30rem] flex-col">
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

        <div className="flex flex-1 items-center justify-center py-8">
          <div
            role="status"
            aria-live="polite"
            className="w-full max-w-lg rounded-3xl border border-emerald-200 bg-white/90 px-6 py-9 text-center shadow-xl shadow-emerald-900/10 sm:px-10"
          >
            <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="size-9" aria-hidden="true" />
            </span>
            <h2 className="auth-display mt-5 text-2xl font-extrabold text-gray-900">
              Registration submitted successfully
            </h2>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
              <Clock3 className="size-4" aria-hidden="true" />
              Awaiting administrator approval
            </div>
            <p className="mt-5 text-sm text-gray-500">
              You will be able to sign in after an administrator activates your account.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Back to Home
              </Link>
              <Link
                href="/login"
                className="primary-action inline-flex h-11 items-center justify-center rounded-lg px-4 text-sm font-bold"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <Field label="Amazina Yombi / Full Name" name="name" placeholder="Full name" icon={User} />
          <Field label="Imeyili / Email Address" name="email" type="email" placeholder="name@example.com" icon={Mail} />
          <Field label="Nimero ya Telefoni / Phone Number" name="phone" type="tel" placeholder="+250 7XX XXX XXX" icon={Phone} />
          <Field label="Itariki y'Amavuko / Date of Birth" name="dateOfBirth" type="date" placeholder="" icon={Calendar} />

          <SelectField label="Igitsina / Gender" name="gender" icon={Users} placeholder="Select Gender" options={[
            { value: "male", label: "Gabo / Male" },
            { value: "female", label: "Gore / Female" },
          ]} />

          <SelectField label="Irangamimerere / Marital Status" name="maritalStatus" icon={Heart} placeholder="Select Status" options={[
            { value: "Single", label: "Ingaragu / Single" },
            { value: "Married", label: "Ndubatse / Married" },
            { value: "Divorced", label: "Naratandukanye / Divorced" },
            { value: "Widowed", label: "Umupfakazi / Widowed" },
          ]} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Intara / Province" name="province" placeholder="Province" icon={MapPin} />
          <Field label="Akarere / District" name="district" placeholder="District" icon={Map} />
          <Field label="Umurenge / Sector" name="sector" placeholder="Sector" icon={MapPin} />
          <Field label="Akagari / Cell" name="cell" placeholder="Cell" icon={MapPin} />
          <Field label="Umudugudu / Village" name="village" placeholder="Village" icon={Home} />
          <Field label="Icyo Ukora / Occupation" name="occupation" placeholder="e.g., Teacher or Accountant" icon={BriefcaseBusiness} optional />
          <EducationFields idPrefix="registration-education" inline />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PasswordField
            id="password"
            name="password"
            label="Ijambo ry'Ibanga / Password *"
            placeholder="Minimum 6 characters"
            autoComplete="new-password"
          />
          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Subiramo Ijambo ry'Ibanga / Confirm Password *"
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
