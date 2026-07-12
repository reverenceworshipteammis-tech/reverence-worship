"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, FileText, Info, Lock, Send } from "lucide-react";
import { submitSpiritualForm } from "@/app/admin/intercession/actions";

type TakeQuestion = {
  type: string;
  label: string;
  description: string;
  required: boolean;
  options: string[];
  rows: string[];
  columns: string[];
  min: number;
  max: number;
};

type TakeSettings = {
  limit_one_response?: boolean;
  show_progress_bar?: boolean;
  shuffle_questions?: boolean;
  show_question_numbers?: boolean;
  is_quiz?: boolean;
  release_grade?: string;
};

export function IntercessionTakeForm({
  form,
  questions,
  settings,
  alreadySubmitted,
}: {
  form: { id: number; title: string; description: string | null };
  questions: TakeQuestion[];
  settings: TakeSettings;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [shuffleSeed] = useState(() => Math.random());
  const [isPending, startTransition] = useTransition();

  const limitOneResponse = settings.limit_one_response !== false;
  const releaseGrade = settings.release_grade ?? "never";
  const displayQuestions = useMemo(() => {
    const visible = questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => question.type !== "title_section" && question.type !== "section_break");
    if (!settings.shuffle_questions) return visible;
    return [...visible].sort((a, b) => {
      const aScore = Math.sin((a.index + 1) * 10000 * shuffleSeed);
      const bScore = Math.sin((b.index + 1) * 10000 * shuffleSeed);
      return aScore - bScore;
    });
  }, [questions, settings.shuffle_questions, shuffleSeed]);

  const progress = displayQuestions.length
    ? Math.round((Object.values(answered).filter(Boolean).length / displayQuestions.length) * 100)
    : 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitSpiritualForm(form.id, formData);
      setMessage(result.message);
      if (result.ok) {
        router.push("/admin/intercession");
        router.refresh();
      }
    });
  }

  if (alreadySubmitted && limitOneResponse) {
    return (
      <TakeShell title="Already Submitted" tone="yellow">
        <Info className="mx-auto mb-3 size-10 text-yellow-500" aria-hidden="true" />
        <p className="mb-4 text-gray-600">You have already submitted this form. Only one response is allowed per user.</p>
        <Link href="/admin/intercession" className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Back to Forms
        </Link>
      </TakeShell>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="bg-blue-600 px-5 py-6 sm:px-8">
          <div className="flex items-center justify-between text-white">
            <Link href="/admin/intercession" className="flex items-center gap-2 text-sm text-white/80 hover:text-white">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Forms
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4" aria-hidden="true" />
              <span>Form</span>
            </div>
          </div>
          <div className="mt-4">
            <h1 className="mb-2 text-3xl font-bold text-white">{form.title}</h1>
            {form.description && <p className="whitespace-pre-line text-blue-100">{form.description}</p>}
          </div>
        </div>

        {settings.is_quiz && releaseGrade !== "immediately" && (
          <div className="mx-5 mt-4 flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:mx-8">
            <Info className="size-5 text-yellow-500" aria-hidden="true" />
            <span className="text-sm text-yellow-700">
              {releaseGrade === "later" ? "Your score will be released after manual review." : "Your score will not be shown."}
            </span>
          </div>
        )}

        {settings.show_progress_bar && (
          <div className="px-5 pt-6 sm:px-8">
            <div className="mb-2 flex justify-between text-sm text-gray-600">
              <span>Your Progress</span>
              <span className="font-semibold text-indigo-600">{progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {message && <div className="mx-5 mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 sm:mx-8">{message}</div>}

        <form onSubmit={submit}>
          <div className="space-y-6 bg-slate-50 p-5 sm:p-8">
            {displayQuestions.length ? (
              displayQuestions.map(({ question, index }, visibleIndex) => (
                <QuestionField
                  key={`${question.label}-${index}`}
                  question={question}
                  index={index}
                  displayNumber={settings.show_question_numbers ? visibleIndex + 1 : null}
                  onAnswered={(value) => setAnswered((current) => ({ ...current, [`question_${index}`]: value }))}
                />
              ))
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">This form has no questions yet.</div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">{displayQuestions.length} question(s)</div>
              <button
                disabled={isPending || displayQuestions.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {isPending ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
                {isPending ? "Submitting..." : "Submit Form"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function TakeShell({ title, tone, children }: { title: string; tone: "yellow"; children: React.ReactNode }) {
  const colors = tone === "yellow" ? "border-yellow-200 bg-yellow-50 text-yellow-700" : "";
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className={`rounded-xl border p-6 text-center ${colors}`}>
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function QuestionField({
  question,
  index,
  displayNumber,
  onAnswered,
}: {
  question: TakeQuestion;
  index: number;
  displayNumber: number | null;
  onAnswered: (answered: boolean) => void;
}) {
  const name = `question_${index}`;
  const options = question.options.length ? question.options : ["Option 1"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {displayNumber !== null && <span className="mr-2 text-blue-600">{displayNumber}.</span>}
          {question.label}
          {question.required && <span className="ml-1 text-red-500">*</span>}
        </h3>
        {question.description && <p className="mt-1 whitespace-pre-line text-sm text-gray-500">{question.description}</p>}
      </div>

      {question.type === "short_answer" && (
        <input name={name} required={question.required} onChange={(event) => onAnswered(Boolean(event.target.value))} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      )}
      {question.type === "paragraph" && (
        <textarea name={name} required={question.required} rows={4} onChange={(event) => onAnswered(Boolean(event.target.value))} className="w-full resize-y rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      )}
      {question.type === "multiple_choice" && (
        <div className="space-y-3">
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-indigo-50">
              <input type="radio" name={name} value={option} required={question.required} onChange={() => onAnswered(true)} className="size-4 text-indigo-600" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "checkboxes" && (
        <div className="space-y-3">
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-indigo-50">
              <input type="checkbox" name={name} value={option} onChange={(event) => onAnswered(event.currentTarget.form ? new FormData(event.currentTarget.form).getAll(name).length > 0 : false)} className="size-4 rounded text-indigo-600" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "dropdown" && (
        <select name={name} required={question.required} onChange={(event) => onAnswered(Boolean(event.target.value))} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
          <option value="">Select an option</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
      {question.type === "linear_scale" && (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: Math.max(1, question.max - question.min + 1) }, (_, offset) => question.min + offset).map((value) => (
            <label key={value} className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-gray-200 px-4 py-3 hover:bg-indigo-50">
              <input type="radio" name={name} value={value} required={question.required} onChange={() => onAnswered(true)} className="size-4 text-indigo-600" />
              <span className="text-sm font-semibold">{value}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "rating" && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: question.max }, (_, offset) => offset + 1).map((value) => (
            <label key={value} className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-indigo-50">
              <input type="radio" name={name} value={value} required={question.required} onChange={() => onAnswered(true)} className="mr-2 text-indigo-600" />
              {value}
            </label>
          ))}
        </div>
      )}
      {question.type === "multiple_choice_grid" && (
        <GridAnswerTable question={question} name={name} required={question.required} onAnswered={onAnswered} multiple={false} />
      )}
      {question.type === "checkbox_grid" && (
        <GridAnswerTable question={question} name={name} required={question.required} onAnswered={onAnswered} multiple />
      )}
      {question.type === "date" && (
        <input type="date" name={name} required={question.required} onChange={(event) => onAnswered(Boolean(event.target.value))} className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      )}
      {question.type === "time" && (
        <input type="time" name={name} required={question.required} onChange={(event) => onAnswered(Boolean(event.target.value))} className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      )}
      {!["short_answer", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating", "multiple_choice_grid", "checkbox_grid", "date", "time"].includes(question.type) && (
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
          <Lock className="size-4" aria-hidden="true" />
          Unsupported question type.
        </div>
      )}
    </div>
  );
}

function GridAnswerTable({
  question,
  name,
  required,
  multiple,
  onAnswered,
}: {
  question: TakeQuestion;
  name: string;
  required: boolean;
  multiple: boolean;
  onAnswered: (answered: boolean) => void;
}) {
  const rows = question.rows.length ? question.rows : ["Row 1"];
  const columns = question.columns.length ? question.columns : ["Column 1"];

  function updateAnswered(form: HTMLFormElement | null) {
    if (!form) return onAnswered(false);
    const hasAnswer = rows.some((_, rowIndex) => formDataHasValue(new FormData(form), `${name}_${rowIndex}`));
    onAnswered(hasAnswer);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
            {columns.map((column) => (
              <th key={column} className="px-3 py-2 text-center font-medium text-gray-500">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, rowIndex) => (
            <tr key={`${name}-${rowIndex}`}>
              <td className="px-3 py-2 font-medium text-gray-700">{row}</td>
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 text-center">
                  <input
                    type={multiple ? "checkbox" : "radio"}
                    name={`${name}_${rowIndex}`}
                    value={column}
                    required={required && !multiple}
                    onChange={(event) => updateAnswered(event.currentTarget.form)}
                    className={multiple ? "rounded border-gray-300 text-indigo-600" : "text-indigo-600"}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formDataHasValue(formData: FormData, key: string) {
  return formData.getAll(key).some((value) => String(value).trim() !== "");
}
