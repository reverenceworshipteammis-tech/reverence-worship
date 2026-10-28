"use client";

import { ChoiceSelect } from "@/components/choice-select";
import { BILINGUAL_EDUCATION_LABELS, EDUCATION_LEVELS } from "@/lib/education-rules";

const options = EDUCATION_LEVELS.map(({ value }) => ({ value, label: BILINGUAL_EDUCATION_LABELS[value] }));

export function EducationLevelSelect(props: { name: string; value: string; onChange: (value: string) => void; id?: string; required?: boolean; disabled?: boolean; className: string }) {
  return <ChoiceSelect {...props} options={options} placeholder="Select education level" />;
}
