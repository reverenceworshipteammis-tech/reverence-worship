"use client";

import Link from "next/link";
import { ActionNotice } from "@/components/action-notice";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, FileText, Info, Lock, Paperclip, Presentation, Send } from "lucide-react";
import { submitSpiritualForm } from "@/app/admin/intercession/actions";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { IntercessionQuestionImages } from "@/components/intercession-question-images";
import type { IntercessionQuestionImage } from "@/lib/intercession-question-images";
import type { IntercessionQuestionCondition } from "@/lib/intercession-form-rules";
import {
  parseIntercessionVisitorFields,
  visibleIntercessionQuestions,
  type IntercessionFormAnswer,
  type IntercessionVisitorField,
} from "@/lib/intercession-form-domain";

type TakeQuestion = {
  id: string;
  type: string;
  label: string;
  description: string;
  required: boolean;
  options: string[];
  rows: string[];
  columns: string[];
  min: number;
  max: number;
  images: IntercessionQuestionImage[];
  condition: IntercessionQuestionCondition | null;
  points?: number;
  correctAnswer?: string;
  correctAnswers?: string[] | Record<string, string | string[]>;
};

type TakeSettings = {
  limit_one_response?: boolean;
  show_progress_bar?: boolean;
  shuffle_questions?: boolean;
  show_question_numbers?: boolean;
  is_quiz?: boolean;
  release_grade?: string;
  thank_you_message?: string;
  redirect_url?: string;
  visitor_fields?: IntercessionVisitorField[];
};

export function IntercessionTakeForm({
  form,
  questions,
  settings,
  alreadySubmitted,
  preview = false,
  embedded = false,
  onPreviewClose,
  backHref = "/admin/intercession",
  requireRespondentName = false,
  editToken = "",
  initialValues,
}: {
  form: { id: number; title: string; description: string | null };
  questions: TakeQuestion[];
  settings: TakeSettings;
  alreadySubmitted: boolean;
  preview?: boolean;
  embedded?: boolean;
  onPreviewClose?: () => void;
  backHref?: string;
  requireRespondentName?: boolean;
  editToken?: string;
  initialValues?: Record<string, string | string[]>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, IntercessionFormAnswer>>({});
  const [submitted, setSubmitted] = useState<{ message: string; redirectUrl: string; score: number | null; editUrl: string } | null>(null);
  const startedAt = useRef(new Date().toISOString());
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const draftRestored = useRef(false);
  const [shuffleSeed] = useState(() => Math.random());
  const [isPending, startTransition] = useTransition();

  const limitOneResponse = settings.limit_one_response !== false;
  const displayQuestions = useMemo(() => {
    const visible = visibleIntercessionQuestions(questions.map((question) => ({
      ...question, points: question.points ?? 1, correctAnswer: question.correctAnswer ?? "", correctAnswers: question.correctAnswers ?? [],
    })), answersByQuestionId);
    const hasOrderedContent = visible.some(({ question }) => question.condition || ["title_section", "section_break"].includes(question.type));
    if (!settings.shuffle_questions || hasOrderedContent) return visible;
    return [...visible].sort((a, b) => {
      const aScore = Math.sin((a.index + 1) * 10000 * shuffleSeed);
      const bScore = Math.sin((b.index + 1) * 10000 * shuffleSeed);
      return aScore - bScore;
    });
  }, [answersByQuestionId, questions, settings.shuffle_questions, shuffleSeed]);

  const answerableQuestions = displayQuestions.filter(({ question }) => !["title_section", "section_break"].includes(question.type));
  const answeredVisibleQuestions = answerableQuestions.filter(({ index }) => answered[`question_${index}`]).length;
  const progress = answerableQuestions.length
    ? Math.round((answeredVisibleQuestions / answerableQuestions.length) * 100)
    : 0;

  const draftKey = `intercession-response-draft:${form.id}:${editToken ? "edit" : "new"}`;
  useEffect(() => {
    if (preview || form.id <= 0 || draftRestored.current) return;
    draftRestored.current = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if ((!initialValues && !saved) || !formRef.current) return;
      const values = initialValues ?? JSON.parse(saved!) as Record<string, string | string[]>;
      const restoredAnswers: Record<string, IntercessionFormAnswer> = {};
      Object.entries(values).forEach(([name, savedValue]) => {
        const fields = formRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${CSS.escape(name)}"]`);
        fields?.forEach((field) => {
          if (field instanceof HTMLInputElement && field.type === "file") return;
          if (field instanceof HTMLInputElement && ["radio", "checkbox"].includes(field.type)) field.checked = Array.isArray(savedValue) ? savedValue.includes(field.value) : savedValue === field.value;
          else if (!Array.isArray(savedValue)) field.value = savedValue;
          if (field instanceof HTMLTextAreaElement) { field.style.height = "auto"; field.style.height = `${field.scrollHeight}px`; }
        });
        const match = name.match(/^question_(\d+)(?:_(\d+))?$/);
        if (!match) return;
        const question = questions[Number(match[1])];
        if (!question) return;
        if (match[2]) {
          const current = restoredAnswers[question.id];
          restoredAnswers[question.id] = { ...(current && typeof current === "object" && !Array.isArray(current) ? current : {}), [`row_${match[2]}`]: savedValue };
        } else restoredAnswers[question.id] = savedValue;
      });
      setAnswersByQuestionId(restoredAnswers);
      setAnswered(Object.entries(values).reduce<Record<string, boolean>>((result, [key, value]) => {
        const match = key.match(/^question_(\d+)/);
        if (match) result[`question_${match[1]}`] = Boolean(result[`question_${match[1]}`]) || (Array.isArray(value) ? value.length > 0 : Boolean(value));
        return result;
      }, {}));
      setDraftStatus(initialValues ? "Response loaded" : "Draft restored");
    } catch { localStorage.removeItem(draftKey); }
  }, [draftKey, form.id, initialValues, preview, questions]);

  function saveDraft(target: HTMLFormElement) {
    if (preview || form.id <= 0) return;
    const data = new FormData(target);
    const values: Record<string, string | string[]> = {};
    for (const [key, value] of data.entries()) {
      if (!key.startsWith("visitor_") && !key.startsWith("question_") || value instanceof File) continue;
      const all = data.getAll(key).filter((item): item is string => typeof item === "string");
      values[key] = all.length > 1 ? all : String(value);
    }
    localStorage.setItem(draftKey, JSON.stringify(values));
    setDraftStatus("Draft saved");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
    if (requireRespondentName) {
      const submissionData = new FormData(event.currentTarget);
      const missingCheckboxField = parseIntercessionVisitorFields(settings.visitor_fields)
        .find((field) => field.required && field.type === "checkboxes" && submissionData.getAll(`visitor_${field.id}`).length === 0);
      if (missingCheckboxField) {
        setMessage(`${missingCheckboxField.label} is required.`);
        setMessageIsError(true);
        event.currentTarget.querySelector<HTMLInputElement>(`[name="${CSS.escape(`visitor_${missingCheckboxField.id}`)}"]`)?.focus();
        return;
      }
    }
    if (!event.currentTarget.checkValidity()) {
      setMessage("Please fill all required fields.");
      setMessageIsError(true);
      event.currentTarget.querySelector<HTMLElement>(":invalid")?.focus();
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set("startedAt", startedAt.current);
    if (editToken) formData.set("editToken", editToken);
    let respondentKey = localStorage.getItem(`intercession-respondent:${form.id}`);
    if (!respondentKey) { respondentKey = crypto.randomUUID(); localStorage.setItem(`intercession-respondent:${form.id}`, respondentKey); }
    formData.set("respondentKey", respondentKey);
    startTransition(async () => {
      const result = await submitSpiritualForm(form.id, formData);
      setMessage(result.message);
      setMessageIsError(!result.ok);
      if (result.ok) {
        localStorage.removeItem(draftKey);
        setSubmitted({ message: result.message, redirectUrl: result.redirectUrl ?? "", score: result.score ?? null, editUrl: result.editUrl ?? "" });
      }
    });
  }

  if (!preview && !editToken && alreadySubmitted && limitOneResponse) {
    return (
      <TakeShell title="Already Submitted" tone="yellow">
        <Info className="mx-auto mb-3 size-10 text-yellow-500" aria-hidden="true" />
        <p className="mb-4 text-gray-600">You have already submitted this form. Only one response is allowed per user.</p>
        <Link href={backHref} className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Back to Forms
        </Link>
      </TakeShell>
    );
  }

  if (submitted) return <TakeShell title={editToken ? "Response updated" : "Response recorded"} tone="green"><CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-600" aria-hidden="true" /><p className="mb-2 text-slate-700">{submitted.message}</p>{submitted.score !== null ? <p className="mb-4 text-lg font-bold text-blue-700">Score: {submitted.score}%</p> : null}<div className="flex flex-wrap justify-center gap-2">{submitted.editUrl ? <Link href={submitted.editUrl} className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">Edit response</Link> : null}<Link href={submitted.redirectUrl || backHref} className="inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Continue</Link></div></TakeShell>;

  return (
    <div className={embedded ? "w-full" : "mx-auto max-w-5xl px-3 py-5 sm:px-4 sm:py-8"}>
      {preview && !embedded ? (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Presentation className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
            <div>
              <p className="text-sm font-bold">Form preview</p>
              <p className="text-xs text-amber-700">This is how the form will appear to members. Preview answers cannot be submitted.</p>
            </div>
          </div>
          <Link href="/admin/intercession?section=manage" className="shrink-0 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950">
            Back to Manage Forms
          </Link>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-slate-900 [color-scheme:light] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="border-b border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50/40 px-5 py-6 sm:px-8">
          {!embedded ? <div className="flex items-center justify-between text-sky-700">
            <Link href={preview ? "/admin/intercession?section=manage" : backHref} className="flex items-center gap-2 text-sm text-sky-700 hover:text-sky-900">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {preview ? "Back to Manage Forms" : "Back to Forms"}
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4" aria-hidden="true" />
              <span>{preview ? "Preview" : "Form"}</span>
            </div>
          </div> : null}
          <div className={embedded ? "" : "mt-4"}>
            <h1 className="mb-2 text-3xl font-bold text-slate-900"><IntercessionRichText value={form.title} /></h1>
            {form.description && <p className="text-slate-600"><IntercessionRichText value={form.description} /></p>}
          </div>
        </div>

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

        {message && <ActionNotice message={message} tone={messageIsError ? "error" : "info"} onClose={() => setMessage(null)} className="mx-5 mt-4 sm:mx-8" />}

        <form ref={formRef} onSubmit={submit} noValidate onInput={(event) => saveDraft(event.currentTarget)}>
          <div className="space-y-6 bg-slate-50 p-5 sm:p-8">
            {requireRespondentName ? <VisitorInformationFields fields={parseIntercessionVisitorFields(settings.visitor_fields)} formId={form.id} /> : null}
            {displayQuestions.length ? (
              displayQuestions.map(({ question, index }) => (
                <div key={`${question.id}-${index}`}>
                  {["title_section", "section_break"].includes(question.type) ? <FormDisplayBlock question={question} /> : <QuestionField
                    question={question}
                    index={index}
                    displayNumber={settings.show_question_numbers ? answerableQuestions.findIndex((item) => item.index === index) + 1 : null}
                    editing={Boolean(editToken)}
                    onAnswered={(value) => setAnswered((current) => ({ ...current, [`question_${index}`]: value }))}
                    onAnswerChange={(value) => setAnswersByQuestionId((current) => ({ ...current, [question.id]: value }))}
                  />}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">This form has no questions yet.</div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white px-5 py-5 sm:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {preview ? (
                <button
                  type="button"
                  onClick={onPreviewClose}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              ) : (
                <button
                  disabled={isPending || answerableQuestions.length === 0}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? <CheckCircle2 className="size-4" /> : <Send className="size-4" />}
                  {isPending ? "Submitting..." : "Submit"}
                </button>
              )}
            </div>
            {!preview && draftStatus ? <p className="mt-3 text-right text-xs text-slate-400" aria-live="polite">{draftStatus}</p> : null}
          </div>
        </form>
      </div>
    </div>
  );
}

function VisitorInformationFields({ fields, formId }: { fields: IntercessionVisitorField[]; formId: number }) {
  return (
    <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-4">
        <h2 className="text-lg font-bold text-slate-900">About you</h2>
       
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-2">
        {fields.map((field) => {
          const name = `visitor_${field.id}`;
          const fieldId = `${name}-${formId}`;
          const commonClass = "w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
          return (
            <div key={field.id} className={field.type === "checkboxes" ? "sm:col-span-2" : ""}>
              <label htmlFor={field.type === "checkboxes" ? undefined : fieldId} className="mb-2 block text-sm font-semibold text-slate-900">
                {field.label}{field.required ? <span className="ml-1 text-red-500">*</span> : null}
              </label>
              {field.helpText ? <p className="mb-2 text-xs text-slate-500">{field.helpText}</p> : null}
              {field.type === "select" ? (
                <select id={fieldId} name={name} required={field.required} defaultValue="" className={commonClass}>
                  <option value="" disabled>{field.placeholder || "Select an option"}</option>
                  {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : field.type === "checkboxes" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {field.options.map((option) => (
                    <label key={option} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-800 hover:bg-blue-50">
                      <input type="checkbox" name={name} value={option} className="size-4 rounded text-blue-600" />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  id={fieldId}
                  name={name}
                  type={field.type === "phone" ? "tel" : field.type}
                  required={field.required}
                  minLength={field.id === "full_name" ? 2 : undefined}
                  maxLength={field.type === "number" || field.type === "date" ? undefined : 500}
                  autoComplete={field.id === "full_name" ? "name" : field.type === "email" ? "email" : field.type === "phone" ? "tel" : undefined}
                  placeholder={field.placeholder}
                  className={commonClass}
                />
              )}
            </div>
          );
        })}
      </div>
   
    </section>
  );
}

function TakeShell({ title, tone, children }: { title: string; tone: "yellow" | "green"; children: React.ReactNode }) {
  const colors = tone === "yellow" ? "border-yellow-200 bg-yellow-50 text-yellow-700" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className={`rounded-xl border p-6 text-center ${colors}`}>
        <h2 className="mb-2 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function FormDisplayBlock({ question }: { question: TakeQuestion }) {
  if (question.type === "section_break") return <section className="border-t-2 border-blue-100 pt-5"><h2 className="text-xl font-bold text-slate-900"><IntercessionRichText value={question.label} /></h2>{question.description ? <p className="mt-1 text-sm text-slate-600"><IntercessionRichText value={question.description} /></p> : null}</section>;
  return <section className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-white p-5"><h2 className="text-xl font-bold text-slate-900"><IntercessionRichText value={question.label} /></h2>{question.description ? <p className="mt-1 text-sm text-slate-600"><IntercessionRichText value={question.description} /></p> : null}<IntercessionQuestionImages images={question.images} className="mt-4" /></section>;
}

function QuestionField({
  question,
  index,
  displayNumber,
  editing,
  onAnswered,
  onAnswerChange,
}: {
  question: TakeQuestion;
  index: number;
  displayNumber: number | null;
  editing: boolean;
  onAnswered: (answered: boolean) => void;
  onAnswerChange: (answer: IntercessionFormAnswer) => void;
}) {
  const name = `question_${index}`;
  const options = question.options.length ? question.options : ["Option 1"];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {displayNumber !== null && <span className="mr-2 text-blue-600">{displayNumber}.</span>}
          <IntercessionRichText value={question.label} />
          {question.required && <span className="ml-1 text-red-500">*</span>}
        </h3>
        {question.description && <p className="mt-1 text-sm text-gray-500"><IntercessionRichText value={question.description} /></p>}
      </div>

      <IntercessionQuestionImages images={question.images} className="mb-5" />

      {question.type === "short_answer" && (
        <textarea
          name={name}
          required={question.required}
          rows={1}
          onChange={(event) => {
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
            onAnswered(Boolean(event.currentTarget.value)); onAnswerChange(event.currentTarget.value);
          }}
          className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      )}
      {question.type === "paragraph" && (
        <textarea
          name={name}
          required={question.required}
          rows={4}
          onChange={(event) => {
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
            onAnswered(Boolean(event.currentTarget.value));
            onAnswerChange(event.currentTarget.value);
          }}
          className="w-full resize-none overflow-hidden rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      )}
      {question.type === "multiple_choice" && (
        <div className="space-y-3">
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 text-slate-800 hover:bg-indigo-50">
              <input type="radio" name={name} value={option} required={question.required} onChange={() => { onAnswered(true); onAnswerChange(option); }} className="size-4 text-indigo-600" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "checkboxes" && (
        <div className="space-y-3">
          {options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 text-slate-800 hover:bg-indigo-50">
              <input type="checkbox" name={name} value={option} onChange={(event) => { const values = event.currentTarget.form ? new FormData(event.currentTarget.form).getAll(name).map(String) : []; onAnswered(values.length > 0); onAnswerChange(values); }} className="size-4 rounded text-indigo-600" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "dropdown" && (
        <select name={name} required={question.required} onChange={(event) => { onAnswered(Boolean(event.target.value)); onAnswerChange(event.target.value); }} className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
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
              <input type="radio" name={name} value={value} required={question.required} onChange={() => { onAnswered(true); onAnswerChange(String(value)); }} className="size-4 text-indigo-600" />
              <span className="text-sm font-semibold">{value}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "rating" && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: question.max }, (_, offset) => offset + 1).map((value) => (
            <label key={value} className="cursor-pointer rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-indigo-50">
              <input type="radio" name={name} value={value} required={question.required} onChange={() => { onAnswered(true); onAnswerChange(String(value)); }} className="mr-2 text-indigo-600" />
              {value}
            </label>
          ))}
        </div>
      )}
      {question.type === "multiple_choice_grid" && (
        <GridAnswerTable question={question} name={name} required={question.required} onAnswered={onAnswered} onAnswerChange={onAnswerChange} multiple={false} />
      )}
      {question.type === "checkbox_grid" && (
        <GridAnswerTable question={question} name={name} required={question.required} onAnswered={onAnswered} onAnswerChange={onAnswerChange} multiple />
      )}
      {question.type === "date" && (
        <input type="date" name={name} required={question.required} onChange={(event) => { onAnswered(Boolean(event.target.value)); onAnswerChange(event.target.value); }} className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      )}
      {question.type === "time" && (
        <input type="time" name={name} required={question.required} onChange={(event) => { onAnswered(Boolean(event.target.value)); onAnswerChange(event.target.value); }} className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
      )}
      {question.type === "file_upload" && (
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 p-4 text-sm text-blue-800 transition hover:bg-blue-50">
          <Paperclip className="size-5" aria-hidden="true" />
          <span><strong>Choose a file</strong><span className="block text-xs text-slate-500">JPG, PNG, WebP, PDF, DOC, or DOCX · 10 MB maximum</span></span>
          <input type="file" name={name} required={question.required && !editing} accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx" onChange={(event) => { const file = event.target.files?.[0]; onAnswered(Boolean(file)); onAnswerChange(file?.name ?? ""); }} className="sr-only" />
        </label>
      )}
      {!["short_answer", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating", "multiple_choice_grid", "checkbox_grid", "date", "time", "file_upload"].includes(question.type) && (
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
  onAnswerChange,
}: {
  question: TakeQuestion;
  name: string;
  required: boolean;
  multiple: boolean;
  onAnswered: (answered: boolean) => void;
  onAnswerChange: (answer: IntercessionFormAnswer) => void;
}) {
  const rows = question.rows.length ? question.rows : ["Row 1"];
  const columns = question.columns.length ? question.columns : ["Column 1"];

  function updateAnswered(form: HTMLFormElement | null) {
    if (!form) return onAnswered(false);
    const data = new FormData(form);
    const rowAnswers = Object.fromEntries(rows.map((_, rowIndex) => [`row_${rowIndex}`, multiple ? data.getAll(`${name}_${rowIndex}`).map(String) : String(data.get(`${name}_${rowIndex}`) ?? "")]));
    const hasAnswer = Object.values(rowAnswers).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
    onAnswered(hasAnswer);
    onAnswerChange(rowAnswers);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
            {columns.map((column) => (
              <th scope="col" key={column} className="px-3 py-2 text-center font-medium text-gray-500">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row, rowIndex) => (
            <tr key={`${name}-${rowIndex}`}>
              <th scope="row" className="px-3 py-2 text-left font-medium text-gray-700">{row}</th>
              {columns.map((column) => (
                <td key={column} className="px-3 py-2 text-center">
                  <input
                    type={multiple ? "checkbox" : "radio"}
                    name={`${name}_${rowIndex}`}
                    value={column}
                    required={required && !multiple}
                    aria-label={`${row}: ${column}`}
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
