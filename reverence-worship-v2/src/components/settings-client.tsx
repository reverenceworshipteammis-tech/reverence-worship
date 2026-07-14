"use client";

import { useRef, useState, useTransition } from "react";
import { BrushCleaning, Save, ShieldCheck, UserPlus } from "lucide-react";
import {
  clearSystemCache,
  updateAccessSettings,
  updateSecuritySettings,
} from "@/app/admin/settings/actions";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";

export type SettingsValues = {
  registrationEnabled: boolean;
  sessionLifetime: number;
  passwordMinLength: number;
};

type Result = {
  ok: boolean;
  message: string;
};

type TabId = "access" | "security" | "maintenance";

const tabs = [
  { id: "access" as const, label: "Access", icon: UserPlus },
  { id: "security" as const, label: "Security", icon: ShieldCheck },
  { id: "maintenance" as const, label: "Maintenance", icon: BrushCleaning },
];

export function SettingsClient({ values }: { values: SettingsValues }) {
  const [activeTab, setActiveTab] = useState<TabId>("access");
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const accessRef = useRef<HTMLFormElement>(null);
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
    <div className="mx-auto max-w-5xl space-y-6 px-2 py-4 sm:px-4 sm:py-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Only settings that currently change system behavior are shown here.</p>
      </div>

      {result ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${result.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {result.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200">
          <div className="p-3 md:hidden">
            <MobileTabScroller tabs={tabs} value={activeTab} onChange={(tab) => setActiveTab(tab as TabId)} />
          </div>
          <nav className="hidden overflow-x-auto md:flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3 text-sm font-medium transition ${
                    active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className={activeTab === "access" ? "block" : "hidden"}>
          <form ref={accessRef} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 inline-flex size-10 items-center justify-center rounded-full ${values.registrationEnabled ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    <UserPlus className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900">Public Registration</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Controls whether visitors can create their own account.
                    </p>
                    <div className="mt-4">
                      <CheckField
                        name="registration_enabled"
                        label="Enable public registration"
                        note="When off, the login page register link is removed, /register is blocked, and direct registration submissions fail."
                        defaultChecked={values.registrationEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <ImpactCard
                title="Current impact"
                items={[
                  "Login page register link",
                  "Landing page Join button",
                  "Register route access",
                  "Registration server action",
                ]}
              />
            </div>
            <SettingsFooter pending={pending} label="Save Access Settings" onClick={() => runAction(updateAccessSettings, accessRef.current)} />
          </form>
        </div>

        <div className={activeTab === "security" ? "block" : "hidden"}>
          <form ref={securityRef} className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Session Lifetime (minutes)" note="Maximum is 10 minutes. Active users are refreshed; idle users are logged out automatically.">
                <input name="session_lifetime" type="number" min={1} max={10} required defaultValue={Math.min(values.sessionLifetime, 10)} className={inputClass} />
              </Field>
              <Field label="Minimum Password Length" note="Affects new public registrations. Minimum allowed value is 6.">
                <input name="password_min_length" type="number" min={6} max={255} required defaultValue={values.passwordMinLength} className={inputClass} />
              </Field>
            </div>
            <SettingsFooter pending={pending} label="Save Security Settings" onClick={() => runAction(updateSecuritySettings, securityRef.current)} />
          </form>
        </div>

        <div className={activeTab === "maintenance" ? "block" : "hidden"}>
          <div className="p-4 sm:p-6">
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
              <h3 className="font-semibold text-yellow-900">Refresh cached pages</h3>
              <p className="mt-1 text-sm leading-6 text-yellow-800">
                Clears Next.js cached route data for the app layout so public and admin pages can pick up changed data.
              </p>
              <button
                type="button"
                onClick={() => runButtonAction(clearSystemCache)}
                disabled={pending}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-yellow-500 px-4 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:opacity-60"
              >
                <BrushCleaning className="size-4" aria-hidden="true" />
                {pending ? "Working..." : "Clear Cache"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
      {note ? <span className="mt-1 block text-xs text-gray-500">{note}</span> : null}
    </label>
  );
}

function CheckField({ name, label, note, defaultChecked }: { name: string; label: string; note?: string; defaultChecked: boolean }) {
  return (
    <div>
      <label className="flex items-center gap-3">
        <input type="checkbox" name={name} value="1" defaultChecked={defaultChecked} className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
      {note ? <p className="ml-7 mt-1 text-xs text-gray-500">{note}</p> : null}
    </div>
  );
}

function ImpactCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SettingsFooter({ pending, label, onClick }: { pending: boolean; label: string; onClick: () => void }) {
  return (
    <div className="mt-6 border-t border-gray-200 pt-5">
      <button type="button" disabled={pending} onClick={onClick} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-60">
        <Save className="size-4" aria-hidden="true" />
        {pending ? "Saving..." : label}
      </button>
    </div>
  );
}
