"use client";

import { useRef, useState, useTransition } from "react";
import { BrushCleaning, Database, Globe, Mail, Save, ShieldCheck } from "lucide-react";
import {
  clearSystemCache,
  requestDatabaseBackup,
  updateEmailSettings,
  updateGeneralSettings,
  updateSecuritySettings,
} from "@/app/admin/settings/actions";

export type SettingsValues = {
  appName: string;
  appUrl: string;
  appDebug: boolean;
  registrationEnabled: boolean;
  mailMailer: string;
  mailHost: string;
  mailPort: number;
  mailUsername: string;
  mailPassword: string;
  mailEncryption: string;
  mailFromAddress: string;
  mailFromName: string;
  sessionLifetime: number;
  passwordMinLength: number;
  requirePasswordConfirm: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
};

type Result = {
  ok: boolean;
  message: string;
};

type TabId = "general" | "email" | "security";

const tabs = [
  { id: "general" as const, label: "General", icon: Globe },
  { id: "email" as const, label: "Email", icon: Mail },
  { id: "security" as const, label: "Security", icon: ShieldCheck },
];

export function SettingsClient({ values }: { values: SettingsValues }) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const generalRef = useRef<HTMLFormElement>(null);
  const emailRef = useRef<HTMLFormElement>(null);
  const securityRef = useRef<HTMLFormElement>(null);

  function runAction(action: (formData: FormData) => Promise<Result>, form: HTMLFormElement | null) {
    if (!form) return;
    setResult(null);
    startTransition(async () => {
      setResult(await action(new FormData(form)));
    });
  }

  function runButtonAction(action: () => Promise<Result>) {
    setResult(null);
    startTransition(async () => {
      setResult(await action());
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-2 py-4 sm:px-4 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
       
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => runButtonAction(clearSystemCache)}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-yellow-500 px-4 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:opacity-60"
        >
          <BrushCleaning className="size-4" aria-hidden="true" />
          Clear Cache
        </button>
        <button
          type="button"
          onClick={() => runButtonAction(requestDatabaseBackup)}
          disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          <Database className="size-4" aria-hidden="true" />
          Backup Database
        </button>
      </div>

      {result ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            result.ok
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {result.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition ${
                    active
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className={activeTab === "general" ? "block" : "hidden"}>
          <form ref={generalRef} className="p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Application Name">
                <input name="app_name" required defaultValue={values.appName} className={inputClass} />
              </Field>
              <Field label="Application URL">
                <input name="app_url" type="url" required defaultValue={values.appUrl} className={inputClass} />
              </Field>
              <CheckField
                name="app_debug"
                label="Enable Debug Mode"
                note="Only enable in development environment"
                defaultChecked={values.appDebug}
              />
              <CheckField
                name="registration_enabled"
                label="Enable User Registration"
                note="Allow new users to register"
                defaultChecked={values.registrationEnabled}
              />
            </div>
            <SettingsFooter
              pending={pending}
              label="Save General Settings"
              onClick={() => runAction(updateGeneralSettings, generalRef.current)}
            />
          </form>
        </div>

        <div className={activeTab === "email" ? "block" : "hidden"}>
          <form ref={emailRef} className="p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Mail Driver">
                <select name="mail_mailer" defaultValue={values.mailMailer} className={inputClass}>
                  <option value="smtp">SMTP</option>
                  <option value="sendmail">Sendmail</option>
                  <option value="log">Log (Local Only)</option>
                </select>
              </Field>
              <Field label="SMTP Host">
                <input name="mail_host" required defaultValue={values.mailHost} className={inputClass} />
              </Field>
              <Field label="SMTP Port">
                <input name="mail_port" type="number" required defaultValue={values.mailPort} className={inputClass} />
              </Field>
              <Field label="Encryption">
                <select name="mail_encryption" defaultValue={values.mailEncryption} className={inputClass}>
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="">None</option>
                </select>
              </Field>
              <Field label="Username">
                <input name="mail_username" defaultValue={values.mailUsername} className={inputClass} />
              </Field>
              <Field label="Password">
                <input name="mail_password" type="password" defaultValue={values.mailPassword} className={inputClass} />
              </Field>
              <Field label="From Address">
                <input
                  name="mail_from_address"
                  type="email"
                  required
                  defaultValue={values.mailFromAddress}
                  className={inputClass}
                />
              </Field>
              <Field label="From Name">
                <input name="mail_from_name" required defaultValue={values.mailFromName} className={inputClass} />
              </Field>
            </div>
            <SettingsFooter
              pending={pending}
              label="Save Email Settings"
              onClick={() => runAction(updateEmailSettings, emailRef.current)}
            />
          </form>
        </div>

        <div className={activeTab === "security" ? "block" : "hidden"}>
          <form ref={securityRef} className="p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Session Lifetime (minutes)" note="Default: 120 minutes (2 hours)">
                <input
                  name="session_lifetime"
                  type="number"
                  min={1}
                  max={1440}
                  required
                  defaultValue={values.sessionLifetime}
                  className={inputClass}
                />
              </Field>
              <Field label="Minimum Password Length" note="Minimum: 6 characters">
                <input
                  name="password_min_length"
                  type="number"
                  min={6}
                  max={255}
                  required
                  defaultValue={values.passwordMinLength}
                  className={inputClass}
                />
              </Field>
              <div className="md:col-span-2">
                <CheckField
                  name="require_password_confirm"
                  label="Require Password Confirmation for Sensitive Actions"
                  defaultChecked={values.requirePasswordConfirm}
                />
              </div>
              <Field label="Max Login Attempts" note="Number of failed attempts before lockout">
                <input
                  name="max_login_attempts"
                  type="number"
                  min={3}
                  max={10}
                  required
                  defaultValue={values.maxLoginAttempts}
                  className={inputClass}
                />
              </Field>
              <Field label="Lockout Duration (minutes)" note="How long to lock out after max attempts">
                <input
                  name="lockout_duration"
                  type="number"
                  min={5}
                  max={1440}
                  required
                  defaultValue={values.lockoutDuration}
                  className={inputClass}
                />
              </Field>
            </div>
            <SettingsFooter
              pending={pending}
              label="Save Security Settings"
              onClick={() => runAction(updateSecuritySettings, securityRef.current)}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {note ? <span className="mt-1 block text-xs text-gray-500">{note}</span> : null}
    </label>
  );
}

function CheckField({
  name,
  label,
  note,
  defaultChecked,
}: {
  name: string;
  label: string;
  note?: string;
  defaultChecked: boolean;
}) {
  return (
    <div>
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          name={name}
          value="1"
          defaultChecked={defaultChecked}
          className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
      {note ? <p className="ml-7 mt-1 text-xs text-gray-500">{note}</p> : null}
    </div>
  );
}

function SettingsFooter({
  pending,
  label,
  onClick,
}: {
  pending: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="mt-6 border-t border-gray-200 pt-5">
      <button
        type="button"
        disabled={pending}
        onClick={onClick}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        <Save className="size-4" aria-hidden="true" />
        {pending ? "Saving..." : label}
      </button>
    </div>
  );
}
