"use client";

import {
  COMMITMENT_PROFILE_FIELDS, commitmentAcceptanceLabel, commitmentProfileDisplay,
  type CommitmentSettings, type CommitmentProfileValues,
} from "@/lib/membership-commitment";

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-100 disabled:bg-slate-100";

export function CommitmentFormConfiguration({ value, onChange, membershipQuestionLinked = false }: { value: CommitmentSettings; onChange: (value: CommitmentSettings) => void; membershipQuestionLinked?: boolean }) {
  return <section className="space-y-5 rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
    <label className="block text-sm font-semibold text-slate-700">Commitment year
      <input type="number" min={2000} max={2200} value={value.year || ""} className={`${inputClass} mt-2 max-w-40`} onChange={(event) => {
        const year = Number(event.target.value);
        onChange({ ...value, year, acceptanceLabel: value.acceptanceLabel === commitmentAcceptanceLabel(value.year) ? commitmentAcceptanceLabel(year) : value.acceptanceLabel });
      }} />
    </label>
    <div><h3 className="mb-2 text-sm font-semibold text-slate-700">Member information</h3><p className="mb-3 text-xs text-slate-500">Select fields to prefill from member profiles. Email is read-only.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[390px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-2">Include field</th><th className="p-2">Required</th><th className="p-2">Member can edit</th></tr></thead><tbody className="divide-y divide-slate-100">{COMMITMENT_PROFILE_FIELDS.map((definition) => {
        const selected = value.profileFields.find((field) => field.key === definition.key);
        const readOnly = "readOnly" in definition && definition.readOnly || membershipQuestionLinked && definition.key === "membershipType";
        const patch = (change: Partial<NonNullable<typeof selected>>) => onChange({ ...value, profileFields: value.profileFields.map((field) => field.key === definition.key ? { ...field, ...change } : field) });
        return <tr key={definition.key}><td className="p-2"><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selected)} onChange={(event) => onChange({ ...value, profileFields: event.target.checked ? [...value.profileFields, { key: definition.key, editable: false, required: false, requiresApproval: false }] : value.profileFields.filter((field) => field.key !== definition.key) })} />{definition.label}</label></td>
          <td className="p-2"><input type="checkbox" aria-label={`${definition.label} required`} disabled={!selected} checked={selected?.required ?? false} onChange={(event) => patch({ required: event.target.checked })} /></td>
          <td className="p-2"><input type="checkbox" aria-label={`Allow editing ${definition.label}`} disabled={!selected || readOnly} checked={!readOnly && (selected?.editable ?? false)} onChange={(event) => patch({ editable: event.target.checked, requiresApproval: false })} /></td></tr>;
      })}</tbody></table></div>
    </div>
  </section>;
}

export function CommitmentMemberInformation({ config, values = {}, preview = false, membershipQuestionLinked = false, anonymous = false }: { config: CommitmentSettings; values?: CommitmentProfileValues; preview?: boolean; membershipQuestionLinked?: boolean; anonymous?: boolean }) {
  const profileFields = anonymous
    ? [...config.profileFields, ...(["name", "membershipType"] as const)
      .filter((key) => !config.profileFields.some((field) => field.key === key))
      .map((key) => ({ key, editable: true, required: true, requiresApproval: false }))]
    : config.profileFields;
  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-semibold text-slate-900">{anonymous ? "Your information" : "Review your information"}</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">{profileFields.map((field) => {
      const definition = COMMITMENT_PROFILE_FIELDS.find((item) => item.key === field.key)!;
      const membershipFromQuestion = !anonymous && membershipQuestionLinked && field.key === "membershipType";
      const editable = anonymous || field.editable && !membershipFromQuestion;
      const required = anonymous && (field.key === "name" || field.key === "membershipType") || field.required;
      const options = field.key === "membershipType" ? config.membershipTypes : "options" in definition ? definition.options : [];
      return <label key={field.key} className="block text-sm font-medium text-slate-700">{definition.label}{required ? " *" : ""}
        {"options" in definition ? <select name={`profile_${field.key}`} disabled={!editable} required={required} defaultValue={values[field.key] ?? ""} className={`${inputClass} mt-1`}><option value="">Not specified</option>{options.map((option) => <option key={option} value={option}>{commitmentProfileDisplay(field.key, option)}</option>)}</select>
          : <input type={definition.type} name={`profile_${field.key}`} readOnly={!editable} required={required} maxLength={definition.max} defaultValue={values[field.key] ?? ""} placeholder={preview ? "Prefilled from member profile" : undefined} className={`${inputClass} mt-1`} />}
        {!anonymous && !membershipFromQuestion && !editable ? <span className="mt-1 block text-xs font-normal text-slate-500">Read-only</span> : null}
      </label>;
    })}</div>
  </section>;
}
