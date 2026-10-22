"use client";

import { useState } from "react";
import {
  EDUCATION_LEVELS,
  QUALIFICATION_STATUSES,
  type EducationQualification,
  type QualificationStatus,
} from "@/lib/education-rules";

const controlClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

type EducationValues = {
  highestEducationLevel: string;
  otherEducationLevel: string;
  educationFieldOfStudy: string;
  educationInstitution: string;
  educationCompletionYear: string;
  additionalQualifications: EducationQualification[];
};

export function EducationFields({
  initialValues,
  idPrefix = "education",
  inline = false,
  showAdditionalQualifications = true,
}: {
  initialValues?: Partial<EducationValues>;
  idPrefix?: string;
  inline?: boolean;
  showAdditionalQualifications?: boolean;
}) {
  const [level, setLevel] = useState(initialValues?.highestEducationLevel ?? "");
  const [qualifications, setQualifications] = useState<EducationQualification[]>(
    initialValues?.additionalQualifications ?? [],
  );
  const fieldsRequired = Boolean(level && level !== "none" && level !== "primary");
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const addQualificationButton = (
    <button
      type="button"
      onClick={addQualification}
      className="inline-flex min-h-8 items-center justify-center rounded-md border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
    >
      Add Qualification
    </button>
  );

  function updateQualification(index: number, key: keyof EducationQualification, value: string) {
    setQualifications((current) => current.map((qualification, itemIndex) =>
      itemIndex === index
        ? { ...qualification, [key]: key === "completionYear" ? Number(value) : value }
        : qualification,
    ));
  }

  function addQualification() {
    setQualifications((current) => [
      ...current,
      { name: "", fieldOfStudy: "", institution: "", status: "completed", completionYear: new Date().getFullYear() },
    ]);
  }

  return (
    <div className={inline ? "contents" : "mt-5 space-y-5"}>
      <div hidden={inline}>
        <h3 className="text-base font-bold text-gray-900">Educational Information</h3>
      </div>

      <div className={inline ? "contents" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
        <div>
          <label htmlFor={fieldId("highest-level")} className="mb-1 block text-xs font-semibold text-gray-700">
            Highest Education Level Obtained <span className="text-red-500">*</span>
          </label>
          <select
            id={fieldId("highest-level")}
            name="highestEducationLevel"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            required
            className={controlClass}
          >
            <option value="">Select education level</option>
            {EDUCATION_LEVELS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {level === "other" ? (
          <div>
            <label htmlFor={fieldId("other-level")} className="mb-1 block text-xs font-semibold text-gray-700">
              Specify Other Qualification <span className="text-red-500">*</span>
            </label>
            <input
              id={fieldId("other-level")}
              name="otherEducationLevel"
              defaultValue={initialValues?.otherEducationLevel ?? ""}
              placeholder="e.g., Certificate in Accounting"
              required
              maxLength={160}
              className={controlClass}
            />
          </div>
        ) : null}
        {fieldsRequired ? (
          <>
            <div>
              <label htmlFor={fieldId("field-of-study")} className="mb-1 block text-xs font-semibold text-gray-700">
                Field of Study / Specialization <span className="text-red-500">*</span>
              </label>
              <input
                id={fieldId("field-of-study")}
                name="educationFieldOfStudy"
                defaultValue={initialValues?.educationFieldOfStudy ?? ""}
                placeholder="e.g., Accounting or Computer Science"
                required
                maxLength={160}
                className={controlClass}
              />
            </div>
            <div>
              <label htmlFor={fieldId("institution")} className="mb-1 block text-xs font-semibold text-gray-700">
                Institution / School / University Name <span className="text-red-500">*</span>
              </label>
              <input
                id={fieldId("institution")}
                name="educationInstitution"
                defaultValue={initialValues?.educationInstitution ?? ""}
                placeholder="e.g., University of Rwanda"
                required
                maxLength={160}
                className={controlClass}
              />
            </div>
            <div>
              <label htmlFor={fieldId("completion-year")} className="mb-1 block text-xs font-semibold text-gray-700">
                Year of Completion <span className="text-red-500">*</span>
              </label>
              <input
                id={fieldId("completion-year")}
                name="educationCompletionYear"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                defaultValue={initialValues?.educationCompletionYear ?? ""}
                placeholder="e.g., 2020"
                required
                className={controlClass}
              />
            </div>
          </>
        ) : null}
      </div>

      {!inline && showAdditionalQualifications ? (
      <div className="space-y-3 border-t border-gray-200 pt-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-800">Additional Qualifications &amp; Ongoing Studies</h4>
            <p className="mt-1 text-xs text-gray-600">Optional. Add academic degrees, certificates, or studies.</p>
          </div>
          {addQualificationButton}
        </div>

        <input type="hidden" name="additionalQualifications" value={JSON.stringify(qualifications)} />
        {qualifications.map((qualification, index) => (
          <fieldset key={index} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <legend className="text-xs font-bold text-gray-700">Qualification {index + 1}</legend>
              <button
                type="button"
                onClick={() => setQualifications((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                aria-label={`Remove qualification ${index + 1}`}
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                aria-label={`Qualification ${index + 1} name`}
                placeholder="e.g., CCNA or CPA"
                value={qualification.name}
                onChange={(event) => updateQualification(index, "name", event.target.value)}
                maxLength={160}
                className={controlClass}
              />
              <input
                aria-label={`Qualification ${index + 1} field of study`}
                placeholder="e.g., Networking or Accounting"
                value={qualification.fieldOfStudy}
                onChange={(event) => updateQualification(index, "fieldOfStudy", event.target.value)}
                maxLength={160}
                className={controlClass}
              />
              <input
                aria-label={`Qualification ${index + 1} institution`}
                placeholder="e.g., Cisco Networking Academy"
                value={qualification.institution}
                onChange={(event) => updateQualification(index, "institution", event.target.value)}
                maxLength={160}
                className={controlClass}
              />
              <select
                aria-label={`Qualification ${index + 1} status`}
                value={qualification.status}
                onChange={(event) => updateQualification(index, "status", event.target.value as QualificationStatus)}
                className={controlClass}
              >
                {QUALIFICATION_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                aria-label={`Qualification ${index + 1} completion year`}
                placeholder="e.g., 2027"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={qualification.completionYear || ""}
                onChange={(event) => updateQualification(index, "completionYear", event.target.value)}
                className={`${controlClass} sm:col-span-2`}
              />
            </div>
          </fieldset>
        ))}
      </div>
      ) : null}
    </div>
  );
}
