"use client";

import Link from "next/link";
import { ActionNotice } from "@/components/action-notice";
import { intercessionMobileSteps } from "@/lib/intercession-mobile-steps";
import { FormEvent, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Clock, FileText, Info, Lock, Paperclip, Presentation, Send } from "lucide-react";
import { submitSpiritualForm } from "@/app/admin/intercession/actions";
import { IntercessionRichText } from "@/components/intercession-rich-text";
import { IntercessionQuestionImages } from "@/components/intercession-question-images";
import { CommitmentMemberInformation } from "@/components/commitment-form-fields";
import type { CommitmentProfileValues, CommitmentSettings } from "@/lib/membership-commitment";
import type { MembershipTypeMapping } from "@/lib/membership-question";
import type { IntercessionQuestionImage } from "@/lib/intercession-question-images";
import type { IntercessionQuestionCondition } from "@/lib/intercession-form-rules";
import {
  parseIntercessionVisitorFields,
  formatIntercessionMarks,
  visibleIntercessionQuestions,
  type IntercessionFormAnswer,
  type IntercessionVisitorField,
} from "@/lib/intercession-form-domain";

type TakeQuestion = {
  membershipTypeMapping?: MembershipTypeMapping | null;
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
  commitment?: CommitmentSettings | null;
  limit_one_response?: boolean;
  allow_view_response?: boolean;
  require_login?: boolean;
  show_question_numbers?: boolean;
  show_progress_bar?: boolean;
  shuffle_questions?: boolean;
  is_quiz?: boolean;
  allow_partial_points?: boolean;
  release_grade?: string;
  thank_you_message?: string;
  allow_empty_submission?: boolean;
  submit_button_label?: string;
  submit_button_style?: "default" | "attendance";
  attendance_display_text?: string;
  submission_opens_at?: string;
  submission_deadline?: string;
  redirect_url?: string;
  visitor_fields?: IntercessionVisitorField[];
};

function attendanceLongDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kigali",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

function attendanceTime(value: string | undefined) {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/);
  if (!match) return "";
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

export function IntercessionTakeForm({
  form,
  questions,
  settings,
  alreadySubmitted,
  preview = false,
  embedded = false,
  onPreviewClose,
  backHref = "/admin/forms",
  requireRespondentName = false,
  editToken = "",
  initialValues,
  memberProfile,
}: {
  form: { id: number; title: string; description: string | null; version?: number };
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
  memberProfile?: CommitmentProfileValues;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [answersByQuestionId, setAnswersByQuestionId] = useState<Record<string, IntercessionFormAnswer>>({});
  const [submitted, setSubmitted] = useState<{
    message: string;
    redirectUrl: string;
    score: number | null;
    earnedPoints: number | null;
    totalPoints: number | null;
    responseDetails: Array<{ questionIndex: number; question: string; type: string; answer: string; correctResponse: string | null; correct: boolean | null; partialCreditDeducted: boolean; earnedPoints: number; points: number }>;
    editUrl: string;
  } | null>(null);
  const startedAt = useRef(new Date().toISOString());
  const [draftStatus, setDraftStatus] = useState<string | null>(null);
  const [attendanceDate, setAttendanceDate] = useState({ iso: "", label: "DD/MM/YYYY", longLabel: "Event date" });
  const formRef = useRef<HTMLFormElement>(null);
  const submittedResultRef = useRef<HTMLDivElement>(null);
  const submittedMarksRef = useRef<HTMLParagraphElement>(null);
  const draftRestored = useRef(false);
  const [shuffleSeed] = useState(() => Math.random());
  const [isPending, startTransition] = useTransition();
  const submittingRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const limitOneResponse = settings.limit_one_response !== false;
  const submitButtonLabel = settings.submit_button_label?.trim() || "Submit";
  const isAttendanceAction = settings.submit_button_style === "attendance";
  useEffect(() => {
    if (!isAttendanceAction) return;
    const timer = window.setTimeout(() => {
      const scheduledDate = settings.submission_opens_at?.match(/^(\d{4})-(\d{2})-(\d{2})T/);
      if (scheduledDate) {
        const [, year, month, day] = scheduledDate;
        const iso = `${year}-${month}-${day}`;
        setAttendanceDate({ iso, label: `${day}/${month}/${year}`, longLabel: attendanceLongDate(new Date(`${iso}T12:00:00+02:00`)) });
        return;
      }
      const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Kigali",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).formatToParts(new Date()).map((part) => [part.type, part.value]));
      setAttendanceDate({
        iso: `${parts.year}-${parts.month}-${parts.day}`,
        label: `${parts.day}/${parts.month}/${parts.year}`,
        longLabel: attendanceLongDate(new Date()),
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isAttendanceAction, settings.submission_opens_at]);
  const attendanceOpensAt = attendanceTime(settings.submission_opens_at);
  const attendanceClosesAt = attendanceTime(settings.submission_deadline);
  const attendanceWindow = attendanceOpensAt && attendanceClosesAt
    ? `${attendanceOpensAt} – ${attendanceClosesAt}`
    : attendanceOpensAt || attendanceClosesAt || "Time to be announced";
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
  const questionSteps = intercessionMobileSteps(displayQuestions.map(({ question }) => question));
  const stepCount = questionSteps.length ? questionSteps[questionSteps.length - 1] + 1 : 1;
  const activeStep = Math.min(currentStep, stepCount - 1);
  const mobileSteps = !isAttendanceAction && stepCount > 1;
  const progress = answerableQuestions.length
    ? Math.round((answeredVisibleQuestions / answerableQuestions.length) * 100)
    : 0;

  useEffect(() => {
    if (!submitted) return;
    const scrollToMarks = () => (submittedMarksRef.current ?? submittedResultRef.current)?.scrollIntoView({ behavior: "instant", block: "start" });
    scrollToMarks();
    // Revalidation after the server action can re-render the page and reset scroll, so re-apply briefly.
    const timers = [50, 150, 350, 700].map((delay) => window.setTimeout(scrollToMarks, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [submitted]);

  const draftKey = `intercession-response-draft:${form.id}:${settings.commitment ? `commitment-v${form.version ?? 0}` : editToken ? "edit" : "new"}`;
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
    } catch { setDraftStatus("Draft could not be restored on this device."); }
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
    try {
      localStorage.setItem(draftKey, JSON.stringify(values));
      setDraftStatus("");
    } catch { setDraftStatus("Draft could not be saved on this device. Keep this page open."); }
  }

  function validateFields(fields: Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const groups = new Map<string, HTMLInputElement[]>();
    fields.forEach((field) => {
      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        field.setCustomValidity("");
        groups.set(field.name, [...(groups.get(field.name) ?? []), field]);
      }
    });
    groups.forEach((group, name) => {
      const match = name.match(/^question_(\d+)/);
      const required = match ? questions[Number(match[1])]?.required : parseIntercessionVisitorFields(settings.visitor_fields).find((field) => `visitor_${field.id}` === name)?.required;
      if (required && !group.some((field) => field.checked)) group[0].setCustomValidity("Please select at least one option.");
    });
    const invalid = fields.filter((field) => field.willValidate && !field.validity.valid);
    fields.forEach((field) => { if (field.name) { field.setAttribute("aria-invalid", String(invalid.includes(field))); if (invalid.includes(field)) field.setAttribute("aria-describedby", `error-${field.name}`); } });
    setFieldErrors(Object.fromEntries(invalid.map((field) => [field.name, field.validationMessage || "Please complete this field."])));
    if (!invalid.length) return true;
    const first = invalid[0];
    const step = first.closest<HTMLElement>("[data-form-step]")?.dataset.formStep;
    if (step !== undefined) setCurrentStep(Number(step));
    else setCurrentStep(0);
    requestAnimationFrame(() => { first.scrollIntoView({ behavior: "smooth", block: "center" }); first.focus({ preventScroll: true }); });
    return false;
  }

  function moveStep(next: number) {
    if (next > activeStep && formRef.current) {
      const selector = `[data-form-step="${activeStep}"] input, [data-form-step="${activeStep}"] select, [data-form-step="${activeStep}"] textarea${activeStep === 0 ? ', [data-form-intro] input, [data-form-intro] select, [data-form-intro] textarea' : ''}`;
      const fields = Array.from(formRef.current.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector));
      if (!preview && !validateFields(fields)) return;
    }
    setCurrentStep(next);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`[data-form-step="${next}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || submittingRef.current) return;
    if (mobileSteps && window.matchMedia("(max-width: 639px)").matches && activeStep < stepCount - 1) { moveStep(activeStep + 1); return; }
    if (!validateFields(Array.from(event.currentTarget.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")))) {
      setMessage("Please fill all required fields.");
      setMessageIsError(true);
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set("startedAt", startedAt.current);
    if (editToken) formData.set("editToken", editToken);
    let respondentKey = crypto.randomUUID();
    try { respondentKey = localStorage.getItem(`intercession-respondent:${form.id}`) || respondentKey; localStorage.setItem(`intercession-respondent:${form.id}`, respondentKey); } catch { /* Submission remains available without local storage. */ }
    formData.set("respondentKey", respondentKey);
    submittingRef.current = true;
    startTransition(async () => {
      try {
      const result = await submitSpiritualForm(form.id, formData);
      setMessage(result.message);
      setMessageIsError(!result.ok);
      if (result.ok) {
        try { localStorage.removeItem(draftKey); } catch { /* Response has already been saved. */ }
        setSubmitted({ message: result.message, redirectUrl: result.redirectUrl ?? "", score: result.score ?? null, earnedPoints: result.earnedPoints ?? null, totalPoints: result.totalPoints ?? null, responseDetails: result.responseDetails ?? [], editUrl: result.editUrl ?? "" });
      }
      } catch {
        setMessage("Your response could not be submitted. Your answers are still here. Please try again.");
        setMessageIsError(true);
      } finally { submittingRef.current = false; }
    });
  }

  if (submitted) return (
    <div ref={submittedResultRef} className="scroll-mt-36">
      <TakeShell title={settings.commitment ? "Commitment accepted" : editToken ? "Response updated" : isAttendanceAction ? "Attendance recorded" : "Response recorded"} tone="green">
      {submitted.earnedPoints !== null && submitted.totalPoints !== null ? <p ref={submittedMarksRef} className="mb-4 scroll-mt-36 text-lg font-bold text-blue-700">Marks: {formatIntercessionMarks(submitted.earnedPoints)} / {formatIntercessionMarks(submitted.totalPoints)}</p> : null}
      {submitted.responseDetails.length ? (
        <div className="mt-6 space-y-3 text-left">
          {submitted.responseDetails.map((detail) => (
            <article key={detail.questionIndex} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h4 className="w-full min-w-0 break-words font-semibold text-slate-900 [overflow-wrap:anywhere]">
                  {settings.show_question_numbers !== false ? <span className="mr-2 text-blue-600">{detail.questionIndex + 1}.</span> : null}
                  <IntercessionRichText value={detail.question} />
                </h4>
                {detail.correct !== null ? (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${detail.correct ? "bg-green-100 text-green-700" : detail.earnedPoints > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                    {`${formatIntercessionMarks(detail.earnedPoints)} / ${formatIntercessionMarks(detail.points)}`}
                  </span>
                ) : null}
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Answer</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{detail.answer}</p>
              </div>
              {detail.correctResponse ? (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-3 sm:px-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700">Correct response</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-green-900">{detail.correctResponse}</p>
                </div>
              ) : null}
              {detail.partialCreditDeducted ? (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900">
                  Marking rule: If you choose one wrong answer, you lose the credit for one correct answer.
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {submitted.editUrl ? <Link href={submitted.editUrl} className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100">Edit response</Link> : null}
        <Link href={submitted.redirectUrl || backHref} className="inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Continue</Link>
      </div>
      </TakeShell>
    </div>
  );

  if (!preview && !editToken && alreadySubmitted && limitOneResponse) {
    return (
      <TakeShell title={settings.commitment ? "Commitment already accepted" : "Already Submitted"} tone="yellow">
        <Info className="mx-auto mb-3 size-10 text-yellow-500" aria-hidden="true" />
        <p className="mb-4 text-gray-600">{settings.commitment ? `You have already accepted your membership commitment for ${settings.commitment.year}.` : "You have already submitted this form. Only one response is allowed per user."}</p>
        {settings.commitment && settings.allow_view_response !== false ? <Link href="/admin/forms/commitments/mine" className="mb-4 block font-semibold text-blue-700">View my accepted commitments</Link> : null}
        <Link href={backHref} className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Back to Forms
        </Link>
      </TakeShell>
    );
  }

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
          <Link href="/admin/forms?section=manage" className="shrink-0 text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950">
            Back to Manage Forms
          </Link>
        </div>
      ) : null}
      <div className="@container/form overflow-hidden rounded-2xl border border-gray-200 bg-white text-slate-900 [color-scheme:light] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="border-b border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-50/40 px-5 py-6 sm:px-8">
          {!embedded ? <div className="flex items-center justify-between text-sky-700">
            <Link href={preview ? "/admin/forms?section=manage" : backHref} className="flex items-center gap-2 text-sm text-sky-700 hover:text-sky-900">
              <ArrowLeft className="size-4" aria-hidden="true" />
              {preview ? "Back to Manage Forms" : "Back to Forms"}
            </Link>
            {!isAttendanceAction || preview ? <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4" aria-hidden="true" />
              <span>{preview ? "Preview" : "Form"}</span>
            </div> : null}
          </div> : null}
          <div className={`min-w-0 ${embedded ? "" : "mt-4"}`}>
            <h1 className="mb-2 text-xl font-bold leading-snug text-slate-900 [overflow-wrap:anywhere] sm:text-2xl md:text-3xl"><IntercessionRichText value={form.title} /></h1>
            {form.description && <p className="text-slate-600 [overflow-wrap:anywhere]"><IntercessionRichText value={form.description} /></p>}
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

        {!preview && draftStatus ? <p className="px-5 py-2 text-xs text-slate-500" role="status">{draftStatus}</p> : null}
        <form ref={formRef} onSubmit={submit} noValidate aria-busy={isPending} onInput={(event) => { saveDraft(event.currentTarget); const field = event.target as HTMLInputElement; if (field.name) { field.setCustomValidity(""); field.removeAttribute("aria-invalid"); setFieldErrors((current) => { const next = { ...current }; delete next[field.name]; return next; }); } }}>
          <fieldset disabled={isPending} className="contents">
          {settings.commitment ? <input type="hidden" name="commitment_version" value={form.version ?? 0} /> : null}
          {settings.commitment ? <div data-form-intro className={`${mobileSteps && activeStep > 0 ? "hidden sm:block" : ""} bg-slate-50 px-5 pt-5 sm:px-8 sm:pt-8`}><CommitmentMemberInformation config={settings.commitment} values={memberProfile} preview={preview} membershipQuestionLinked={questions.some((question) => question.membershipTypeMapping != null)} anonymous={!settings.require_login && !memberProfile} /></div> : null}
          {requireRespondentName || displayQuestions.length > 0 || !settings.allow_empty_submission ? (
            <div className="space-y-4 bg-slate-50 px-2 py-4 @min-[640px]/form:space-y-6 @min-[640px]/form:p-8">
              {requireRespondentName && !settings.commitment ? <div data-form-intro className={mobileSteps && activeStep > 0 ? "hidden sm:block" : ""}><VisitorInformationFields fields={parseIntercessionVisitorFields(settings.visitor_fields)} formId={form.id} errors={fieldErrors} /></div> : null}
              {Object.entries(fieldErrors).filter(([name]) => !name.startsWith("question_") && !name.startsWith("visitor_")).map(([name, error]) => <p key={name} id={`error-${name}`} role="alert" className="text-sm text-red-700">{error}</p>)}
              {displayQuestions.length ? (
                displayQuestions.map(({ question, index }, position) => (
                  <div key={`${question.id}-${index}`} data-form-step={questionSteps[position]} className={`${mobileSteps && questionSteps[position] !== activeStep ? "hidden sm:block" : ""} scroll-mt-48`}>
                    {["title_section", "section_break"].includes(question.type) ? <FormDisplayBlock question={question} /> : <QuestionField
                      question={question}
                      index={index}
                      displayNumber={settings.show_question_numbers ? answerableQuestions.findIndex((item) => item.index === index) + 1 : null}
                      editing={Boolean(editToken)}
                      onAnswered={(value) => setAnswered((current) => ({ ...current, [`question_${index}`]: value }))}
                      onAnswerChange={(value) => setAnswersByQuestionId((current) => ({ ...current, [question.id]: value }))}
                    />}
                    {Object.entries(fieldErrors).filter(([name]) => name === `question_${index}` || name.startsWith(`question_${index}_`)).map(([name, error]) => <p key={name} id={`error-${name}`} role="alert" className="mt-2 px-3 text-sm text-red-700">{error}</p>)}
                  </div>
                ))
              ) : (
                !settings.commitment ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">This form has no questions yet.</div> : null
              )}
            </div>
          ) : null}

          {mobileSteps && <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:hidden">
            <button type="button" disabled={activeStep === 0 || isPending} onClick={() => moveStep(activeStep - 1)} className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 disabled:opacity-40">Previous</button>
            <span className="text-xs text-slate-500" aria-live="polite">Step {activeStep + 1} of {stepCount}</span>
            {activeStep < stepCount - 1 ? <button type="button" disabled={isPending} onClick={() => moveStep(activeStep + 1)} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white">Continue</button> : <span className="text-xs text-slate-500">Ready to submit</span>}
          </div>}
          <div className={`${mobileSteps && activeStep < stepCount - 1 ? "hidden sm:block " : ""}${isAttendanceAction ? "relative overflow-hidden border-t border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-5 py-8 sm:px-8 sm:py-10" : "border-t border-gray-200 bg-white px-5 py-5 sm:px-8"}`}>
            {isAttendanceAction ? <><div className="pointer-events-none absolute -left-20 -top-20 size-56 rounded-full bg-emerald-200/30 blur-3xl" /><div className="pointer-events-none absolute -bottom-24 -right-20 size-64 rounded-full bg-cyan-200/30 blur-3xl" /></> : null}
            <div className={isAttendanceAction || settings.commitment ? "flex flex-col items-center gap-4" : "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end"}>
              {isAttendanceAction ? (
                <>
                  <section className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-5 shadow-[0_20px_60px_rgba(5,150,105,0.14)] backdrop-blur sm:p-8">
                    <div className="flex justify-center">
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                        <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.14)]" />
                        Attendance Open
                      </span>
                    </div>
                    <div className="mt-6 grid items-center gap-7 sm:grid-cols-[minmax(0,1fr)_12rem] sm:gap-10">
                      <div className="text-center sm:text-left">
                        <time dateTime={attendanceDate.iso || undefined} className="mt-1 block text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                          {settings.attendance_display_text?.trim() || attendanceDate.longLabel}
                        </time>
                        <p className="mt-2 text-sm font-semibold text-emerald-700">{attendanceDate.label}</p>
                        <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                          <Clock className="size-4 text-emerald-600" aria-hidden="true" />
                          {attendanceWindow}
                        </div>
                      </div>
                      <button
                        type={preview ? "button" : "submit"}
                        disabled={!preview && (isPending || answerableQuestions.length === 0 && !settings.allow_empty_submission)}
                        aria-disabled={preview || undefined}
                        title={preview ? "Preview only" : undefined}
                        className="group inline-flex size-36 flex-col items-center justify-center gap-2 justify-self-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 px-4 py-4 text-center text-base font-bold text-white ring-8 ring-emerald-50 shadow-[0_18px_40px_rgba(5,150,105,0.35)] transition duration-200 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_24px_48px_rgba(5,150,105,0.42)] active:translate-y-0 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:scale-100 sm:size-48 sm:px-5 sm:py-5 sm:text-lg"
                      >
                        <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 transition group-hover:bg-white/20">
                          <CheckCircle2 className="size-7" aria-hidden="true" />
                        </span>
                        <span className="max-w-32 leading-tight">{isPending ? "Submitting..." : submitButtonLabel}</span>
                      </button>
                    </div>
                    <p className="mt-7 text-center text-sm text-slate-500">One click confirms your presence!</p>
                  </section>
                  {preview ? (
                    <button type="button" onClick={onPreviewClose} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                      Close Preview
                    </button>
                  ) : null}
                </>
              ) : preview ? (
                  <button
                    type="button"
                    onClick={onPreviewClose}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3 font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Cancel
                  </button>
              ) : (
                <button
                  disabled={isPending || answerableQuestions.length === 0 && !settings.allow_empty_submission && !settings.commitment}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? <CheckCircle2 className="size-5" /> : <Send className="size-4" />}
                  {isPending ? "Submitting..." : submitButtonLabel}
                </button>
              )}
            </div>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}

function VisitorInformationFields({ fields, formId, errors = {} }: { fields: IntercessionVisitorField[]; formId: number; errors?: Record<string, string> }) {
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
              {errors[name] && <p id={`error-${name}`} role="alert" className="mt-2 text-sm text-red-700">{errors[name]}</p>}
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
    <div className="mx-auto max-w-4xl px-1 py-4 sm:px-4 sm:py-8">
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
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 @min-[640px]/form:p-5">
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
      {["multiple_choice", "membership_type"].includes(question.type) && (
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
      {!["short_answer", "paragraph", "multiple_choice", "membership_type", "checkboxes", "dropdown", "linear_scale", "rating", "multiple_choice_grid", "checkbox_grid", "date", "time", "file_upload"].includes(question.type) && (
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
