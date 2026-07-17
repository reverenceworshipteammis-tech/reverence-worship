"use client";

import { useActionState } from "react";
import { LockKeyhole } from "lucide-react";
import { requiredPasswordChangeAction } from "@/app/auth-actions";
import { AuthFormButton } from "@/components/auth-form-button";
import { PasswordField } from "@/components/password-field";

export function RequiredPasswordChangeForm() {
  const [state, formAction] = useActionState(requiredPasswordChangeAction, {});

  return (
    <form action={formAction} className="mx-auto w-full max-w-md space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Change Your Password</h1>
        <p className="mt-1 text-sm leading-6 text-gray-500">
          Your account was imported with a temporary password. Please set your own password before continuing.
        </p>
      </div>

      <PasswordField id="currentPassword" name="currentPassword" label="Current Password" placeholder="Enter temporary password" autoComplete="current-password" />
      <PasswordField id="password" name="password" label="New Password" placeholder="At least 6 characters" autoComplete="new-password" />
      <PasswordField id="passwordConfirmation" name="passwordConfirmation" label="Confirm New Password" placeholder="Repeat new password" autoComplete="new-password" />

      {state.error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p> : null}

      <AuthFormButton>
        <LockKeyhole className="size-4" aria-hidden="true" />
        Save Password
      </AuthFormButton>
    </form>
  );
}
