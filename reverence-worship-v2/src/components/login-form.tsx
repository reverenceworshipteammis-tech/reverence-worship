"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, LogIn, Mail } from "lucide-react";
import { loginAction } from "@/app/auth-actions";
import { AuthFormButton } from "@/components/auth-form-button";
import { PasswordField } from "@/components/password-field";

export function LoginForm({ registrationEnabled = true }: { registrationEnabled?: boolean }) {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="space-y-3.5">
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

      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="auth-display text-[1.55rem] font-extrabold text-gray-900">Sign In</h2>
        <Link
          href="/"
          className="auth-link inline-flex items-center gap-2 rounded-full border border-blue-800/20 bg-white/60 px-2.5 py-1.5 text-[0.72rem] font-semibold transition hover:bg-white"
        >
          <ArrowLeft className="size-3" aria-hidden="true" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div>
        <label className="mb-1 block text-[0.85rem] font-semibold text-gray-700" htmlFor="email">
          Email Address
        </label>
        <div className="relative">
          <Mail className="auth-field-icon size-4" aria-hidden="true" />
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="auth-field auth-field-login"
            placeholder="name@example.com"
          />
        </div>
      </div>

      <PasswordField
        id="password"
        name="password"
        label="Password"
        placeholder="Enter password"
        autoComplete="current-password"
        loginSize
      />

      {state.error ? (
        <p className="rounded-[0.65rem] border border-red-200 bg-red-50 px-4 py-2.5 text-[0.82rem] text-red-700">
          {state.error}
        </p>
      ) : null}

      <AuthFormButton>
        <LogIn className="size-4" aria-hidden="true" />
        Sign In
      </AuthFormButton>

      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-[0.72rem] font-medium text-gray-400">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-[0.82rem] font-semibold text-gray-700 transition hover:bg-gray-50"
      >
        <span className="font-bold text-red-500">G</span>
        Continue with Google
      </button>

      {registrationEnabled ? (
        <p className="mt-4 text-center text-[0.82rem] text-gray-500">
          Need an account?{" "}
          <Link href="/register" className="auth-link font-semibold">
            Create one
          </Link>
        </p>
      ) : null}
    </form>
  );
}
