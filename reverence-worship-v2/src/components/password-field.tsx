"use client";

import { Lock, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { useState } from "react";

type PasswordFieldProps = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  loginSize?: boolean;
};

export function PasswordField({
  id,
  name,
  label,
  placeholder,
  autoComplete,
  loginSize = false,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-gray-700 sm:text-[0.85rem]" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <Lock className="auth-field-icon size-4" aria-hidden="true" />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={6}
          className={`auth-field pr-10 ${loginSize ? "auth-field-login" : ""}`}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <LockKeyhole className="size-4" aria-hidden="true" /> : <LockKeyholeOpen className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
