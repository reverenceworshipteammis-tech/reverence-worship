"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, LogIn, Mail } from "lucide-react";
import { loginAction } from "@/app/auth-actions";
import { AuthFormButton } from "@/components/auth-form-button";
import { PasswordField } from "@/components/password-field";

export function LoginForm({ registrationEnabled = true, externalError }: { registrationEnabled?: boolean; externalError?: string }) {
  const [state, formAction] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="space-y-3.5">
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
      <div className="text-right">
        <Link href="/forgot-password" className="auth-link text-xs font-semibold">Forgot password?</Link>
      </div>

      {state.error || externalError ? (
        <p className="rounded-[0.65rem] border border-red-200 bg-red-50 px-4 py-2.5 text-[0.82rem] text-red-700">
          {state.error || externalError}
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

      <Link
        href="/api/auth/google"
        className="group inline-flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-[0.86rem] font-bold text-gray-700 shadow-sm shadow-gray-200/60 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/40 hover:text-gray-900 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
      >
        <span className="flex size-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100 transition group-hover:ring-blue-100" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-4">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z" />
          </svg>
        </span>
        Continue with Google
      </Link>

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
