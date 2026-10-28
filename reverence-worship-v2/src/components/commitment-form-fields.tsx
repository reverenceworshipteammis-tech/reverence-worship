"use client";

import { useState } from "react";
import {
  CONFIGURABLE_COMMITMENT_PROFILE_FIELDS, COMMITMENT_PROFILE_FIELDS, commitmentAcceptanceLabel, commitmentProfileDisplay,
  type CommitmentSettings, type CommitmentProfileValues,
} from "@/lib/membership-commitment";
import { EducationLevelSelect } from "@/components/education-level-select";
import { ChoiceSelect } from "@/components/choice-select";

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 [&:read-only:not(select)]:bg-slate-100 disabled:bg-slate-100";
const educationDependentKeys = ["otherEducationLevel", "educationFieldOfStudy"] as const;
const BILINGUAL_PROFILE_LABELS: Partial<Record<string, string>> = {
  name: "Amazina Yombi / Full Name",
  email: "Imeyili / Email Address",
  phone: "Nimero ya Telefoni / Phone Number",
  dateOfBirth: "Itariki y'Amavuko / Date of Birth",
  gender: "Igitsina / Gender",
  maritalStatus: "Irangamimerere / Marital Status",
  province: "Intara / Province",
  district: "Akarere / District",
  sector: "Umurenge / Sector",
  cell: "Akagari / Cell",
  village: "Umudugudu / Village",
  occupation: "Icyo Ukora / Occupation",
};
const BILINGUAL_GENDERS: Record<string, string> = { male: "Gabo / Male", female: "Gore / Female" };
const BILINGUAL_MARITAL_STATUSES: Record<string, string> = {
  Single: "Ingaragu / Single",
  Married: "Ndubatse / Married",
  Divorced: "Naratandukanye / Divorced",
  Widowed: "Umupfakazi / Widowed",
};

export function CommitmentFormConfiguration({ value, onChange, membershipQuestionLinked = false }: { value: CommitmentSettings; onChange: (value: CommitmentSettings) => void; membershipQuestionLinked?: boolean }) {
  function updateProfileFieldSelection(key: (typeof CONFIGURABLE_COMMITMENT_PROFILE_FIELDS)[number]["key"], selected: boolean) {
    if (key !== "highestEducationLevel") {
      onChange({ ...value, profileFields: selected
        ? [...value.profileFields, { key, editable: false, required: false, requiresApproval: false }]
        : value.profileFields.filter((field) => field.key !== key) });
      return;
    }
    const educationFields = selected
      ? educationDependentKeys.map((fieldKey) => ({ key: fieldKey, editable: true, required: false, requiresApproval: false }))
      : [];
    onChange({
      ...value,
      profileFields: [
        ...value.profileFields.filter((field) => field.key !== "highestEducationLevel" && !educationDependentKeys.includes(field.key as (typeof educationDependentKeys)[number])),
        ...(selected ? [{ key, editable: true, required: false, requiresApproval: false }, ...educationFields] : []),
      ],
    });
  }

  return <section className="space-y-5 rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
    <label className="block text-sm font-semibold text-slate-700">Commitment year
      <input type="number" min={2000} max={2200} value={value.year || ""} className={`${inputClass} mt-2 max-w-40`} onChange={(event) => {
        const year = Number(event.target.value);
        onChange({ ...value, year, acceptanceLabel: value.acceptanceLabel === commitmentAcceptanceLabel(value.year) ? commitmentAcceptanceLabel(year) : value.acceptanceLabel });
      }} />
    </label>
    <div><h3 className="mb-2 text-sm font-semibold text-slate-700">Member information</h3><p className="mb-3 text-xs text-slate-500">Select fields to prefill from member profiles. Email is read-only.</p>
      <div className="overflow-x-auto"><table className="w-full min-w-[390px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="p-2">Include field</th><th className="p-2">Required</th><th className="p-2">Member can edit</th></tr></thead><tbody className="divide-y divide-slate-100">{CONFIGURABLE_COMMITMENT_PROFILE_FIELDS.map((definition) => {
        const selected = value.profileFields.find((field) => field.key === definition.key);
        const readOnly = "readOnly" in definition && definition.readOnly || membershipQuestionLinked && definition.key === "membershipType";
        const educationGroupEnabled = value.profileFields.some((field) => field.key === "highestEducationLevel");
        const educationRequiredByLevel = educationGroupEnabled
          && (definition.key === "otherEducationLevel" || educationDependentKeys.includes(definition.key as (typeof educationDependentKeys)[number]));
        const includedWithEducationLevel = educationGroupEnabled && educationDependentKeys.includes(definition.key as (typeof educationDependentKeys)[number]);
        const patch = (change: Partial<NonNullable<typeof selected>>) => onChange({ ...value, profileFields: value.profileFields.map((field) => field.key === definition.key ? { ...field, ...change } : field) });
        return <tr key={definition.key}><td className="p-2"><label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selected)} disabled={includedWithEducationLevel} title={includedWithEducationLevel ? "Included automatically with highest education level." : undefined} onChange={(event) => updateProfileFieldSelection(definition.key, event.target.checked)} />{definition.label}</label></td>
          <td className="p-2"><input type="checkbox" aria-label={`${definition.label} required`} title={educationRequiredByLevel ? "Required only when the selected education level calls for this information." : undefined} disabled={!selected || educationRequiredByLevel} checked={!educationRequiredByLevel && (selected?.required ?? false)} onChange={(event) => patch({ required: event.target.checked })} /></td>
          <td className="p-2"><input type="checkbox" aria-label={`Allow editing ${definition.label}`} disabled={!selected || readOnly} checked={!readOnly && (selected?.editable ?? false)} onChange={(event) => patch({ editable: event.target.checked, requiresApproval: false })} /></td></tr>;
      })}</tbody></table></div>
    </div>
  </section>;
}

export function CommitmentMemberInformation({ config, values = {}, preview = false, membershipQuestionLinked = false, anonymous = false }: { config: CommitmentSettings; values?: CommitmentProfileValues; preview?: boolean; membershipQuestionLinked?: boolean; anonymous?: boolean }) {
  const [educationLevel, setEducationLevel] = useState(values.highestEducationLevel ?? "");
  const profileFields = anonymous
    ? [...config.profileFields, ...(["name", "membershipType"] as const)
      .filter((key) => !config.profileFields.some((field) => field.key === key))
      .map((key) => ({ key, editable: true, required: true, requiresApproval: false }))]
    : config.profileFields;
  const hasEducationLevel = profileFields.some((field) => field.key === "highestEducationLevel");
  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-semibold text-slate-900">{anonymous ? "Your information" : "Review your information"}</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">{profileFields.map((field) => {
      const definition = COMMITMENT_PROFILE_FIELDS.find((item) => item.key === field.key)!;
      const membershipFromQuestion = !anonymous && membershipQuestionLinked && field.key === "membershipType";
      const editable = anonymous || field.editable && !membershipFromQuestion;
      const educationDetailsRequired = educationLevel !== "" && educationLevel !== "none" && educationLevel !== "primary";
      const dependentField = field.key === "educationFieldOfStudy";
      const visible = hasEducationLevel && field.key === "otherEducationLevel" ? educationLevel === "other"
        : hasEducationLevel && dependentField ? educationDetailsRequired
          : true;
      if (!visible) return null;
      const educationConditionalField = hasEducationLevel && (field.key === "otherEducationLevel" || dependentField);
      const educationRequired = field.key === "otherEducationLevel" ? educationLevel === "other" : dependentField && educationDetailsRequired;
      const required = (anonymous && (field.key === "name" || field.key === "membershipType"))
        || (educationConditionalField ? educationRequired : field.required);
      const options = field.key === "membershipType" ? config.membershipTypes : "options" in definition ? definition.options : [];
      return <label key={field.key} className="block text-sm font-medium text-slate-700">{field.key === "highestEducationLevel" ? "Amashuri wize/Highest Education Level Obtained" : BILINGUAL_PROFILE_LABELS[field.key] ?? definition.label}{required ? " *" : ""}
        {field.key === "highestEducationLevel" ? <EducationLevelSelect name={`profile_${field.key}`} disabled={!editable} required={required} value={educationLevel} onChange={setEducationLevel} className={`${inputClass} mt-1`} />
          : "options" in definition ? <ChoiceSelect name={`profile_${field.key}`} disabled={!editable} required={required} defaultValue={values[field.key] ?? ""} placeholder="Not specified" options={options.map((option) => ({ value: option, label: field.key === "maritalStatus" ? BILINGUAL_MARITAL_STATUSES[option] ?? option : field.key === "gender" && BILINGUAL_GENDERS[option] ? BILINGUAL_GENDERS[option] : commitmentProfileDisplay(field.key, option) }))} className={`${inputClass} mt-1`} />
            : field.key === "dateOfBirth" ? <input type="date" name={`profile_${field.key}`} readOnly={!editable} required={required} defaultValue={values[field.key] ?? ""} className={`${inputClass} mt-1 min-w-0`} />
            : <input type={definition.type} name={`profile_${field.key}`} readOnly={!editable} required={required} maxLength={definition.max} defaultValue={values[field.key] ?? ""} placeholder={field.key === "otherEducationLevel" ? "e.g., Certificate in Accounting" : field.key === "educationFieldOfStudy" ? "e.g., Accounting or Computer Science" : preview ? "Prefilled from member profile" : undefined} className={`${inputClass} mt-1`} />}
        {!anonymous && !membershipFromQuestion && !editable ? <span className="mt-1 block text-xs font-normal text-slate-500">Read-only</span> : null}
      </label>;
    })}</div>
  </section>;
}
