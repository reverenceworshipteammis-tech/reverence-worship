"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ActionNotice } from "@/components/action-notice";
import { useAppDialog } from "@/components/app-dialog-provider";
import { ChangeEvent, DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileCheck2,
  GripVertical,
  Heading,
  ImagePlus,
  Layers,
  List,
  Monitor,
  Plus,
  Presentation,
  Redo2,
  Settings,
  Smartphone,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  createSpiritualFormFromBuilder,
  discardSpiritualFormQuestionImage,
  getSpiritualFormQuestionLibrary,
  removeSpiritualFormQuestionFromLibrary,
  saveSpiritualFormQuestionToLibrary,
  updateSpiritualFormFromBuilder,
  uploadSpiritualFormQuestionImages,
} from "@/app/admin/intercession/actions";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";
import { IntercessionRichTextEditor } from "@/components/intercession-rich-text-editor";
import { IntercessionTakeForm } from "@/components/intercession-take-form";
import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";
import {
  DEFAULT_INTERCESSION_VISITOR_FIELDS,
  parseIntercessionVisitorFields,
  type IntercessionVisitorField,
} from "@/lib/intercession-form-domain";
import {
  getIntercessionPublishingIssues,
  parseIntercessionQuestionCondition,
  type IntercessionQuestionCondition,
} from "@/lib/intercession-form-rules";
import {
  MAX_QUESTION_IMAGE_BYTES,
  MAX_QUESTION_IMAGES,
  parseQuestionImages,
  QUESTION_IMAGE_ACCEPT,
  type IntercessionQuestionImage,
} from "@/lib/intercession-question-images";

type QuestionType =
  | "short_answer"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "linear_scale"
  | "rating"
  | "multiple_choice_grid"
  | "checkbox_grid"
  | "date"
  | "time"
  | "file_upload"
  | "title_section"
  | "section_break";

type BuilderQuestion = {
  id: string;
  type: QuestionType;
  label: string;
  description: string;
  required: boolean;
  options: string[];
  points: number;
  correctAnswer: string;
  correctAnswers: string[];
  rows: string[];
  columns: string[];
  gridCorrectAnswers: Record<string, string | string[]>;
  min: number;
  max: number;
  images: IntercessionQuestionImage[];
  condition: IntercessionQuestionCondition | null;
};

type SettingsTab = "quiz" | "responses" | "presentation" | "defaults" | "advanced";

type BuilderSettings = {
  is_quiz: boolean;
  accepting_responses: boolean;
  release_grade: string;
  default_points: number;
  allow_view_response: boolean;
  limit_one_response: boolean;
  require_login: boolean;
  show_progress_bar: boolean;
  shuffle_questions: boolean;
  show_question_numbers: boolean;
  default_required: boolean;
  is_published: boolean;
  allow_partial_points: boolean;
  notify_on_submit: boolean;
  send_response_receipt: boolean;
  allow_response_editing: boolean;
  response_edit_hours: number;
  response_closed_message: string;
  notify_user_on_review: boolean;
  allow_export: boolean;
  include_timestamps: boolean;
  allow_empty_submission: boolean;
  submit_button_label: string;
  submit_button_style: "default" | "attendance";
  submission_deadline: string;
  submission_opens_at: string;
  max_responses: number;
  thank_you_message: string;
  redirect_url: string;
  visitor_fields: IntercessionVisitorField[];
};

export type IntercessionBuilderInitialData = {
  id?: number;
  title?: string;
  description?: string | null;
  questions?: Partial<BuilderQuestion & { text?: string; correctAnswers?: unknown; rows?: unknown; columns?: unknown; images?: unknown }>[];
  settings?: Partial<BuilderSettings>;
};

const questionTypes: Array<{ value: QuestionType; label: string }> = [
  { value: "short_answer", label: "Short answer" },
  { value: "paragraph", label: "Paragraph" },
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "dropdown", label: "Dropdown" },
  { value: "linear_scale", label: "Linear scale" },
  { value: "rating", label: "Rating" },
  { value: "multiple_choice_grid", label: "Multiple choice grid" },
  { value: "checkbox_grid", label: "Checkbox grid" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "file_upload", label: "File upload" },
];

function asGridCorrectAnswers(value: unknown): Record<string, string | string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    Array.isArray(item) ? item.filter((answer): answer is string => typeof answer === "string") : typeof item === "string" ? item : "",
  ]);
  return Object.fromEntries(entries);
}

function newQuestion(type: QuestionType = "short_answer", required = true): BuilderQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    label: type === "title_section" ? "Title and description" : type === "section_break" ? "New section" : "Untitled question",
    description: "",
    required,
    options: ["Option 1"],
    points: 1,
    correctAnswer: "",
    correctAnswers: [],
    rows: ["Row 1"],
    columns: ["Column 1"],
    gridCorrectAnswers: {},
    min: 1,
    max: type === "rating" ? 5 : 5,
    images: [],
    condition: null,
  };
}

function normalizeQuestion(question: Partial<BuilderQuestion & { text?: string; correctAnswers?: unknown; rows?: unknown; columns?: unknown; images?: unknown }>): BuilderQuestion {
  const type = question.type && ["short_answer", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating", "multiple_choice_grid", "checkbox_grid", "date", "time", "file_upload", "title_section", "section_break"].includes(question.type)
    ? question.type
    : "short_answer";
  const correctAnswers = Array.isArray(question.correctAnswers)
    ? question.correctAnswers.filter((answer): answer is string => typeof answer === "string")
    : [];

  return {
    id: question.id || crypto.randomUUID(),
    type,
    label: question.label || question.text || "Untitled question",
    description: question.description || "",
    required: question.required !== false,
    options: Array.isArray(question.options) && question.options.length ? question.options.filter((option): option is string => typeof option === "string") : ["Option 1"],
    points: Number(question.points ?? 1),
    correctAnswer: typeof question.correctAnswer === "string" ? question.correctAnswer : "",
    correctAnswers,
    rows: Array.isArray(question.rows) && question.rows.length ? question.rows.filter((row): row is string => typeof row === "string") : ["Row 1"],
    columns: Array.isArray(question.columns) && question.columns.length ? question.columns.filter((column): column is string => typeof column === "string") : ["Column 1"],
    gridCorrectAnswers: asGridCorrectAnswers(question.correctAnswers),
    min: Number(question.min ?? 1),
    max: Number(question.max ?? 5),
    images: parseQuestionImages(question.images),
    condition: parseIntercessionQuestionCondition(question.condition),
  };
}

type BuilderSnapshot = {
  title: string;
  description: string;
  questions: BuilderQuestion[];
  settings: BuilderSettings;
};

type DraftStatus = "saved" | "saving" | "unsaved" | "error";

const NEW_FORM_DRAFT_KEY = "intercession-form-builder-draft-v1";

const formTemplates: Array<{ id: string; name: string; description: string; title: string; questions: BuilderQuestion[]; settings?: Partial<BuilderSettings> }> = [
  {
    id: "attendance",
    name: "Attendance",
    description: "A one-click meeting or event attendance form.",
    title: "Meeting attendance",
    questions: [],
    settings: {
      allow_empty_submission: true,
      submit_button_label: "Mark Attendance",
      submit_button_style: "attendance",
      require_login: true,
      limit_one_response: true,
      allow_response_editing: false,
      thank_you_message: "Your attendance has been recorded.",
    },
  },
  {
    id: "registration",
    name: "Registration",
    description: "Contact details and attendance confirmation.",
    title: "Event registration",
    questions: [
      { ...newQuestion("short_answer"), label: "Full name", required: true },
      { ...newQuestion("short_answer"), label: "Phone number", required: true },
      { ...newQuestion("multiple_choice"), label: "Will you attend?", options: ["Yes", "No"], required: true },
    ],
  },
  {
    id: "feedback",
    name: "Event feedback",
    description: "Rating and open feedback of activity.",
    title: "Event feedback",
    questions: [
      { ...newQuestion("rating"), label: "How would you rate the event?", required: true },
      { ...newQuestion("paragraph"), label: "What did you appreciate most?" },
      { ...newQuestion("paragraph"), label: "What should we improve?" },
    ],
  },
  {
    id: "survey",
    name: "Simple survey",
    description: "A balanced starting point for collecting opinions.",
    title: "Community survey",
    questions: [
      { ...newQuestion("multiple_choice"), label: "Choose the option that fits you best", options: ["Option 1", "Option 2", "Option 3"], required: true },
      { ...newQuestion("paragraph"), label: "Please explain your answer" },
    ],
  },
  {
    id: "quiz",
    name: "Quiz",
    description: "A scored questions.",
    title: "Quiz",
    questions: [
      { ...newQuestion("multiple_choice"), label: "Enter your first question", options: ["Answer 1", "Answer 2", "Answer 3"], correctAnswer: "Answer 1", required: true },
      { ...newQuestion("short_answer"), label: "Enter a short-answer question", correctAnswer: "Correct answer", required: true },
    ],
  },
];

function cloneQuestion(question: BuilderQuestion): BuilderQuestion {
  return {
    ...question,
    id: crypto.randomUUID(),
    options: [...question.options],
    correctAnswers: [...question.correctAnswers],
    rows: [...question.rows],
    columns: [...question.columns],
    gridCorrectAnswers: structuredClone(question.gridCorrectAnswers),
    images: question.images.map((image) => ({ ...image })),
    condition: question.condition ? { ...question.condition } : null,
  };
}

const defaultSettings: BuilderSettings = {
  is_quiz: false,
  accepting_responses: true,
  release_grade: "never",
  default_points: 1,
  allow_view_response: true,
  limit_one_response: true,
  require_login: true,
  show_progress_bar: false,
  shuffle_questions: false,
  show_question_numbers: true,
  default_required: false,
  is_published: false,
  allow_partial_points: true,
  notify_on_submit: false,
  send_response_receipt: false,
  allow_response_editing: false,
  response_edit_hours: 24,
  response_closed_message: "This form is no longer accepting responses.",
  notify_user_on_review: false,
  allow_export: true,
  include_timestamps: true,
  allow_empty_submission: false,
  submit_button_label: "Submit",
  submit_button_style: "default",
  submission_deadline: "",
  submission_opens_at: "",
  max_responses: 0,
  thank_you_message: "Thank you. Your response has been recorded.",
  redirect_url: "",
  visitor_fields: DEFAULT_INTERCESSION_VISITOR_FIELDS.map((field) => ({ ...field, options: [...field.options] })),
};

function normalizeBuilderSettings(value: Partial<BuilderSettings> | undefined): BuilderSettings {
  return {
    ...defaultSettings,
    ...(value ?? {}),
    visitor_fields: parseIntercessionVisitorFields(value?.visitor_fields),
  };
}

export function IntercessionFormBuilder({ initialData }: { initialData?: IntercessionBuilderInitialData }) {
  const router = useRouter();
  const { confirm } = useAppDialog();
  const isEditing = Boolean(initialData?.id);
  const [activeArea, setActiveArea] = useState<"questions" | "settings">("questions");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("quiz");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    initialData?.questions ? initialData.questions.map(normalizeQuestion) : [newQuestion("short_answer", defaultSettings.default_required)],
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeImageUploads, setActiveImageUploads] = useState(0);
  const [collapsedQuestionIds, setCollapsedQuestionIds] = useState<Set<string>>(new Set());
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("saved");
  const [showChecklist, setShowChecklist] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [questionLibrary, setQuestionLibrary] = useState<BuilderQuestion[]>([]);
  const [pastSnapshots, setPastSnapshots] = useState<BuilderSnapshot[]>([]);
  const [futureSnapshots, setFutureSnapshots] = useState<BuilderSnapshot[]>([]);
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<BuilderSettings>(normalizeBuilderSettings(initialData?.settings));

  const savableQuestions = useMemo(
    () =>
      questions.map((question) => ({
        id: question.id,
        type: question.type,
        label: question.label,
        text: question.label,
        description: question.description,
        required: question.required,
        options: question.options.filter(Boolean),
        points: question.points,
        correctAnswer: question.correctAnswer || null,
        correctAnswers: ["multiple_choice_grid", "checkbox_grid"].includes(question.type)
          ? question.gridCorrectAnswers
          : question.correctAnswers.length ? question.correctAnswers : null,
        rows: question.rows.filter(Boolean),
        columns: question.columns.filter(Boolean),
        min: question.min,
        max: question.max,
        images: question.images,
        condition: question.condition,
      })),
    [questions],
  );

  const currentSnapshot = useMemo<BuilderSnapshot>(() => ({ title, description, questions, settings }), [description, questions, settings, title]);
  const serializedSnapshot = useMemo(() => JSON.stringify(currentSnapshot), [currentSnapshot]);
  const lastHistorySnapshotRef = useRef(currentSnapshot);
  const lastHistorySerializedRef = useRef(serializedSnapshot);
  const latestSnapshotRef = useRef(currentSnapshot);
  const removedImagePathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    latestSnapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  useEffect(() => {
    let active = true;
    getSpiritualFormQuestionLibrary().then((library) => {
      if (active) setQuestionLibrary(library.map(normalizeQuestion));
    }).catch(() => setMessage("The shared question library could not be loaded."));
    return () => { active = false; };
  }, []);

  const publishingIssues = useMemo(
    () => getIntercessionPublishingIssues(title, savableQuestions, settings),
    [savableQuestions, settings, title],
  );

  const buildFormData = useCallback((snapshot: BuilderSnapshot) => {
    const formData = new FormData();
    formData.set("title", snapshot.title);
    formData.set("description", snapshot.description);
    formData.set("questions", JSON.stringify(snapshot.questions.map((question) => ({
      ...question,
      text: question.label,
      options: question.options.filter(Boolean),
      rows: question.rows.filter(Boolean),
      columns: question.columns.filter(Boolean),
      correctAnswer: question.correctAnswer || null,
      correctAnswers: ["multiple_choice_grid", "checkbox_grid"].includes(question.type)
        ? question.gridCorrectAnswers
        : question.correctAnswers.length ? question.correctAnswers : null,
    }))));
    formData.set("settings", JSON.stringify(snapshot.settings));
    return formData;
  }, []);

  const applySnapshot = useCallback((snapshot: BuilderSnapshot) => {
    setTitle(snapshot.title);
    setDescription(snapshot.description);
    setQuestions(snapshot.questions.map((question) => ({ ...question, images: question.images.map((image) => ({ ...image })) })));
    setSettings({ ...snapshot.settings });
    lastHistorySnapshotRef.current = snapshot;
    lastHistorySerializedRef.current = JSON.stringify(snapshot);
    setDraftStatus("unsaved");
  }, []);

  useEffect(() => {
    if (initialData?.id) return;
    const timer = window.setTimeout(async () => {
      try {
        const storedDraft = localStorage.getItem(NEW_FORM_DRAFT_KEY);
        if (storedDraft) {
          const parsed = JSON.parse(storedDraft) as Partial<BuilderSnapshot>;
          const hasContent = typeof parsed.title === "string" || Array.isArray(parsed.questions);
          if (hasContent && await confirm({
            title: "Restore saved draft?",
            message: "A saved form draft was found on this device. Restore it and continue editing?",
            confirmLabel: "Restore draft",
          })) {
            const restored: BuilderSnapshot = {
              title: typeof parsed.title === "string" ? parsed.title : "",
              description: typeof parsed.description === "string" ? parsed.description : "",
              questions: Array.isArray(parsed.questions) ? parsed.questions.map(normalizeQuestion) : [newQuestion("short_answer", Boolean(parsed.settings?.default_required))],
              settings: normalizeBuilderSettings(parsed.settings),
            };
            applySnapshot(restored);
            setMessage("Your saved draft was restored.");
          }
        }
      } catch {
        setMessage("Saved drafts could not be read on this device.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [applySnapshot, confirm, initialData?.id]);

  useEffect(() => {
    if (serializedSnapshot === lastHistorySerializedRef.current) return;
    setDraftStatus("unsaved");
    const timer = window.setTimeout(() => {
      setPastSnapshots((current) => [...current.slice(-49), lastHistorySnapshotRef.current]);
      setFutureSnapshots([]);
      lastHistorySnapshotRef.current = latestSnapshotRef.current;
      lastHistorySerializedRef.current = JSON.stringify(latestSnapshotRef.current);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [serializedSnapshot]);

  useEffect(() => {
    if (activeImageUploads > 0 || draftStatus !== "unsaved") return;
    const timer = window.setTimeout(() => {
      const snapshot = latestSnapshotRef.current;
      try {
        localStorage.setItem(initialData?.id ? `${NEW_FORM_DRAFT_KEY}-${initialData.id}` : NEW_FORM_DRAFT_KEY, JSON.stringify(snapshot));
      } catch {
        setMessage("The recovery draft could not be saved on this device. Use Save form before leaving.");
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [activeImageUploads, draftStatus, initialData?.id, serializedSnapshot]);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      if (draftStatus !== "unsaved" && draftStatus !== "saving" && draftStatus !== "error" && activeImageUploads === 0) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [activeImageUploads, draftStatus]);

  function undo() {
    const previous = pastSnapshots.at(-1);
    if (!previous) return;
    setPastSnapshots((current) => current.slice(0, -1));
    setFutureSnapshots((current) => [latestSnapshotRef.current, ...current].slice(0, 50));
    applySnapshot(previous);
  }

  function redo() {
    const next = futureSnapshots[0];
    if (!next) return;
    setFutureSnapshots((current) => current.slice(1));
    setPastSnapshots((current) => [...current.slice(-49), latestSnapshotRef.current]);
    applySnapshot(next);
  }

  function updateQuestion(id: string, patch: Partial<BuilderQuestion> | ((question: BuilderQuestion) => Partial<BuilderQuestion>)) {
    setQuestions((current) => current.map((question) => (
      question.id === id
        ? { ...question, ...(typeof patch === "function" ? patch(question) : patch) }
        : question
    )));
  }

  function addQuestion(type: QuestionType = "short_answer", afterId = selectedQuestionId) {
    const question = newQuestion(type, ["title_section", "section_break"].includes(type) ? false : settings.default_required);
    setQuestions((current) => {
      if (!afterId) return [...current, question];
      const index = current.findIndex((item) => item.id === afterId);
      if (index === -1) return [...current, question];
      return [...current.slice(0, index + 1), question, ...current.slice(index + 1)];
    });
    setSelectedQuestionId(question.id);
  }

  function addQuestionCopy(question: BuilderQuestion, afterId = selectedQuestionId) {
    const copy = cloneQuestion(question);
    setQuestions((current) => {
      const index = afterId ? current.findIndex((item) => item.id === afterId) : -1;
      return index < 0 ? [...current, copy] : [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
    setSelectedQuestionId(copy.id);
  }

  async function saveQuestionToLibrary(question: BuilderQuestion) {
    const saved = cloneQuestion({ ...question, images: [] });
    const result = await saveSpiritualFormQuestionToLibrary(saved);
    setQuestionLibrary(result.questions.map(normalizeQuestion));
    setMessage(result.message);
  }

  async function removeLibraryQuestion(id: string) {
    const result = await removeSpiritualFormQuestionFromLibrary(id);
    setQuestionLibrary(result.questions.map(normalizeQuestion));
    setMessage(result.message);
  }

  async function applyTemplate(template: (typeof formTemplates)[number]) {
    const hasWork = intercessionRichTextToPlainText(title).trim() || questions.some((question) => intercessionRichTextToPlainText(question.label).trim() !== "Untitled question");
    if (hasWork && !await confirm({
      title: "Replace current form?",
      message: `Using the ${template.name} template will replace the current form content. You can undo this change afterward.`,
      confirmLabel: "Replace form",
    })) return;
    setTitle(template.title);
    setDescription(template.description);
    setQuestions(template.questions.map(cloneQuestion));
    setSettings((current) => ({
      ...current,
      is_quiz: template.id === "quiz",
      allow_empty_submission: false,
      submit_button_label: "Submit",
      submit_button_style: "default",
      ...template.settings,
    }));
    setSelectedQuestionId(null);
    setShowTemplates(false);
  }

  function duplicateQuestion(id: string) {
    setQuestions((current) => {
      const index = current.findIndex((question) => question.id === id);
      if (index === -1) return current;
      const copy = { ...current[index], id: crypto.randomUUID(), label: `${current[index].label} copy`, options: [...current[index].options], correctAnswers: [...current[index].correctAnswers], rows: [...current[index].rows], columns: [...current[index].columns], gridCorrectAnswers: { ...current[index].gridCorrectAnswers }, images: current[index].images.map((image) => ({ ...image })) };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  }

  function deleteQuestion(id: string) {
    if (questions.length === 1 && !settings.allow_empty_submission) return;
    setQuestions((current) => current.filter((question) => question.id !== id));
    setSelectedQuestionId((current) => (current === id ? null : current));
  }

  function moveQuestion(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;

    setQuestions((current) => {
      const draggedIndex = current.findIndex((question) => question.id === draggedId);
      const targetIndex = current.findIndex((question) => question.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return current;

      const next = [...current];
      const [dragged] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeImageUploads > 0) {
      setMessage("Wait for the question images to finish uploading before saving the form.");
      return;
    }
    if (settings.is_published && publishingIssues.length > 0) {
      setShowChecklist(true);
      setMessage(`Cannot publish: ${publishingIssues[0].message}`);
      return;
    }
    const formData = buildFormData(latestSnapshotRef.current);

    startTransition(async () => {
      const result = initialData?.id
        ? await updateSpiritualFormFromBuilder(initialData.id, formData)
        : await createSpiritualFormFromBuilder(formData);
      setMessage(result.message);
      if (result.ok) {
        const retainedImagePaths = new Set(latestSnapshotRef.current.questions.flatMap((question) => question.images.map((image) => image.path)));
        const discardedImagePaths = [...removedImagePathsRef.current].filter((imagePath) => !retainedImagePaths.has(imagePath));
        await Promise.allSettled(discardedImagePaths.map((imagePath) => discardSpiritualFormQuestionImage(imagePath)));
        discardedImagePaths.forEach((imagePath) => removedImagePathsRef.current.delete(imagePath));
        localStorage.removeItem(initialData?.id ? `${NEW_FORM_DRAFT_KEY}-${initialData.id}` : NEW_FORM_DRAFT_KEY);
        setDraftStatus("saved");
        router.push("/admin/intercession");
        router.refresh();
      }
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 px-3 py-5 sm:px-5">
      <form onSubmit={submit}>
        <div className="mx-auto mb-5 max-w-5xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <Link href="/admin/intercession" onClick={async (event) => {
                if (!["unsaved", "saving", "error"].includes(draftStatus)) return;
                event.preventDefault();
                const shouldLeave = await confirm({
                  title: "Leave form builder?",
                  message: "Some changes may not be saved yet. If you leave now, those changes could be lost.",
                  confirmLabel: "Leave builder",
                  tone: "danger",
                });
                if (shouldLeave) router.push("/admin/intercession");
              }} className="inline-flex items-center gap-2 rounded text-xs font-semibold text-gray-500 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Manage Forms
              </Link>
              <h1 className="mt-1 text-xl font-bold text-gray-900">{isEditing ? "Edit form" : "Create a new form"}</h1>

            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={undo} disabled={pastSnapshots.length === 0} className="inline-flex size-10 items-center justify-center rounded-lg border border-blue-200 text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35" title="Undo" aria-label="Undo last change">
                <Undo2 className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={redo} disabled={futureSnapshots.length === 0} className="inline-flex size-10 items-center justify-center rounded-lg border border-blue-200 text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-35" title="Redo" aria-label="Redo last change">
                <Redo2 className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setShowTemplates(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                <Layers className="size-4" aria-hidden="true" /> Templates
              </button>
              <button type="button" onClick={() => setShowLibrary(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                <BookOpen className="size-4" aria-hidden="true" /> Library
              </button>
              <button type="button" onClick={() => setShowChecklist(true)} className="relative inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                <FileCheck2 className="size-4" aria-hidden="true" /> Check
                {publishingIssues.length > 0 ? <span className="rounded-full bg-red-100 px-1.5 text-[10px] text-red-700">{publishingIssues.length}</span> : null}
              </button>
              <button type="button" onClick={() => setShowPreview(true)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                <Presentation className="size-4" aria-hidden="true" /> Preview
              </button>
              <button disabled={isPending || activeImageUploads > 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                <Check className="size-4" aria-hidden="true" />
                {activeImageUploads > 0 ? "Uploading images…" : isPending ? "Saving…" : isEditing ? "Save form" : "Create form"}
              </button>
            </div>
          </div>
          <div className="flex gap-6 border-t border-gray-100 px-4 text-sm font-semibold text-gray-500 sm:px-5">
            <button
              type="button"
              onClick={() => setActiveArea("questions")}
              className={`border-b-2 py-3 ${activeArea === "questions" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-blue-600"}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <List className="size-4" aria-hidden="true" />
                Questions
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveArea("settings")}
              className={`border-b-2 py-3 ${activeArea === "settings" ? "border-blue-600 text-blue-600" : "border-transparent hover:text-blue-600"}`}
            >
              <span className="inline-flex items-center gap-1.5">
                <Settings className="size-4" aria-hidden="true" />
                Settings
              </span>
            </button>
          </div>
        </div>

        {message && <ActionNotice message={message} tone="info" onClose={() => setMessage(null)} className="mx-auto mb-4 max-w-5xl" />}

        {activeArea === "questions" ? (
          <div>
            <div className="mx-auto mb-4 max-w-5xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="h-1 bg-blue-600" />
              <div className="p-5">
                <IntercessionRichTextEditor
                  value={title}
                  onChange={setTitle}
                  maxLength={150}
                  placeholder="Untitled form"
                  ariaLabel="Form title"
                  className="mb-2 block min-h-8 w-full border-none text-2xl font-semibold leading-tight text-gray-900 outline-none focus:ring-0"
                />
                <IntercessionRichTextEditor
                  value={description}
                  onChange={setDescription}
                  maxLength={500}
                  placeholder="Add a short description (optional)"
                  ariaLabel="Form description"
                  className="block min-h-7 w-full border-none text-lg leading-relaxed text-gray-900 outline-none focus:ring-0 sm:text-xl"
                />
                <p className="mt-2 text-xs text-gray-400">Press Ctrl+B for bold or Ctrl+I for italic.</p>
              </div>
            </div>

            <div className="relative mx-auto max-w-5xl">
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-blue-200 bg-white p-8 text-center shadow-sm">
                    <p className="text-sm text-slate-500">This form can be submitted without questions.</p>
                    <button type="button" onClick={() => addQuestion()} className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
                      <Plus className="size-4" aria-hidden="true" />
                      Add optional question
                    </button>
                  </div>
                ) : null}
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    selected={selectedQuestionId === question.id}
                    dragging={draggingQuestionId === question.id}
                    collapsed={collapsedQuestionIds.has(question.id)}
                    showPoints={settings.is_quiz}
                    actionsDisabled={isPending || activeImageUploads > 0}
                    onUploadingChange={(uploading) => setActiveImageUploads((count) => Math.max(0, count + (uploading ? 1 : -1)))}
                    onSelect={() => setSelectedQuestionId(question.id)}
                    onToggleCollapsed={() => setCollapsedQuestionIds((current) => {
                      const next = new Set(current);
                      if (next.has(question.id)) next.delete(question.id); else next.add(question.id);
                      return next;
                    })}
                    onChange={(patch) => updateQuestion(question.id, patch)}
                    onRemoveImage={(index) => {
                      const image = question.images[index];
                      if (!image) return;
                      updateQuestion(question.id, { images: question.images.filter((_, imageIndex) => imageIndex !== index) });
                      removedImagePathsRef.current.add(image.path);
                    }}
                    onAddQuestion={() => addQuestion("short_answer", question.id)}
                    onAddTitle={() => addQuestion("title_section", question.id)}
                    onAddSection={() => addQuestion("section_break", question.id)}
                    onDuplicate={() => duplicateQuestion(question.id)}
                    onSaveToLibrary={() => saveQuestionToLibrary(question)}
                    onDelete={() => deleteQuestion(question.id)}
                    precedingQuestions={questions.slice(0, questions.findIndex((item) => item.id === question.id))}
                    onDragStart={(event) => {
                      setDraggingQuestionId(question.id);
                      setSelectedQuestionId(question.id);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", question.id);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const draggedId = event.dataTransfer.getData("text/plain") || draggingQuestionId;
                      if (draggedId) moveQuestion(draggedId, question.id);
                      setDraggingQuestionId(null);
                    }}
                    onDragEnd={() => setDraggingQuestionId(null)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <SettingsPanel settings={settings} setSettings={setSettings} activeTab={settingsTab} setActiveTab={setSettingsTab} hasOrderedQuestions={questions.some((question) => question.condition || ["title_section", "section_break"].includes(question.type))} />
        )}
      </form>
      {showChecklist ? <PublishingChecklistModal issues={publishingIssues} onClose={() => setShowChecklist(false)} onGoToQuestion={(id) => {
        setShowChecklist(false);
        setActiveArea("questions");
        setSelectedQuestionId(id);
        setCollapsedQuestionIds((current) => { const next = new Set(current); next.delete(id); return next; });
        window.setTimeout(() => document.getElementById(`builder-question-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      }} /> : null}
      {showTemplates ? <TemplatesModal onClose={() => setShowTemplates(false)} onApply={applyTemplate} /> : null}
      {showLibrary ? <QuestionLibraryModal questions={questionLibrary} onClose={() => setShowLibrary(false)} onAdd={(question) => { addQuestionCopy(question); setShowLibrary(false); }} onRemove={removeLibraryQuestion} /> : null}
      {showPreview ? <BuilderPreviewModal title={title} description={description} questions={questions} settings={settings} device={previewDevice} setDevice={setPreviewDevice} onClose={() => setShowPreview(false)} /> : null}
    </div>
  );
}

function BuilderTool({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-10 items-center justify-center rounded-lg text-gray-600 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-600"
    >
      {children}
    </button>
  );
}

function QuestionCard({
  question,
  selected,
  dragging,
  collapsed,
  showPoints,
  actionsDisabled,
  onUploadingChange,
  onSelect,
  onToggleCollapsed,
  onChange,
  onRemoveImage,
  onAddQuestion,
  onAddTitle,
  onAddSection,
  onDuplicate,
  onSaveToLibrary,
  onDelete,
  precedingQuestions,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  question: BuilderQuestion;
  selected: boolean;
  dragging: boolean;
  collapsed: boolean;
  showPoints: boolean;
  actionsDisabled: boolean;
  onUploadingChange: (uploading: boolean) => void;
  onSelect: () => void;
  onToggleCollapsed: () => void;
  onChange: (patch: Partial<BuilderQuestion> | ((question: BuilderQuestion) => Partial<BuilderQuestion>)) => void;
  onRemoveImage: (index: number) => void;
  onAddQuestion: () => void;
  onAddTitle: () => void;
  onAddSection: () => void;
  onDuplicate: () => void;
  onSaveToLibrary: () => void;
  onDelete: () => void;
  precedingQuestions: BuilderQuestion[];
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const isDisplayOnly = question.type === "title_section" || question.type === "section_break";
  const conditionSourceQuestions = precedingQuestions.filter((candidate) => ["short_answer", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating", "multiple_choice_grid", "checkbox_grid", "date", "time"].includes(candidate.type));

  return (
    <div
      id={`builder-question-${question.id}`}
      onClick={onSelect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative overflow-visible rounded-xl border bg-white p-4 shadow-sm transition ${
        selected ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
      } ${dragging ? "opacity-50" : "opacity-100"}`}
    >
      <div className="mb-2 flex items-center justify-between gap-3 sm:pl-7">
        <p className={`truncate text-xs font-semibold text-slate-500 ${collapsed ? "block" : "hidden"}`}>{intercessionRichTextToPlainText(question.label) || "Untitled question"}</p>
        <button type="button" onClick={(event) => { event.stopPropagation(); onToggleCollapsed(); }} className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-blue-700 transition hover:bg-blue-50" aria-expanded={!collapsed} aria-controls={`question-content-${question.id}`} aria-label={collapsed ? "Expand question" : "Collapse question"}>
          {collapsed ? <ChevronDown className="size-4" aria-hidden="true" /> : <ChevronUp className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <div id={`question-content-${question.id}`} hidden={collapsed}>
      {selected && (
        <div className="absolute bottom-[-52px] right-2 z-20 flex gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm sm:bottom-auto sm:right-[-62px] sm:top-0 sm:flex-col">
          <BuilderTool label="Add question" onClick={onAddQuestion}>
            <Plus className="size-4" />
          </BuilderTool>
          <BuilderTool label="Add title" onClick={onAddTitle}>
            <Heading className="size-4" />
          </BuilderTool>
          <BuilderTool label="Add section" onClick={onAddSection}>
            <Layers className="size-4" />
          </BuilderTool>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[28px_minmax(0,1fr)_220px]">
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="Drag to reorder"
          className="hidden cursor-move pt-3 text-gray-300 transition hover:text-blue-500 sm:block"
        >
          <GripVertical className="size-5" aria-hidden="true" />
        </div>
        <div>
          <IntercessionRichTextEditor
            value={question.label}
            onChange={(value) => onChange({ label: value })}
            placeholder="Untitled question"
            ariaLabel="Question title"
            className="min-h-11 w-full overflow-hidden break-words whitespace-pre-wrap border-0 border-b border-gray-300 bg-gray-50 px-3 py-2 text-lg font-medium text-gray-900 outline-none focus:border-gray-500 focus:ring-0 sm:text-xl"
          />
          <IntercessionRichTextEditor
            value={question.description}
            onChange={(value) => onChange({ description: value })}
            placeholder="Description (optional)"
            ariaLabel="Question description"
            className="mt-2 min-h-9 w-full overflow-hidden break-words whitespace-pre-wrap border-0 border-b border-gray-100 px-3 py-2 text-sm text-gray-500 outline-none focus:border-gray-300 focus:ring-0"
          />
        </div>
        <select
          value={isDisplayOnly ? question.type : question.type}
          onChange={(event) => onChange({ type: event.target.value as QuestionType })}
          className="h-10 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        >
          {isDisplayOnly ? (
            <>
              <option value="title_section">Title and description</option>
              <option value="section_break">Section break</option>
            </>
          ) : (
            questionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))
          )}
        </select>
      </div>

      {!isDisplayOnly && (
        <div className="mt-4 space-y-3 pl-0 sm:pl-7">
          <QuestionImageEditor question={question} disabled={actionsDisabled} onChange={onChange} onRemoveImage={onRemoveImage} onUploadingChange={onUploadingChange} />
          {["multiple_choice", "checkboxes", "dropdown"].includes(question.type) && (
            <div className="space-y-2">
              {(question.options.length ? question.options : [""]).map((option, index) => (
                <div key={`${question.id}-option-${index}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={option}
                    onChange={(event) => {
                      const nextOptions = [...question.options];
                      const previousOption = nextOptions[index];
                      nextOptions[index] = event.target.value;
                      onChange({
                        options: nextOptions,
                        correctAnswer: question.correctAnswer === previousOption ? event.target.value : question.correctAnswer,
                        correctAnswers: question.correctAnswers.map((answer) => (answer === previousOption ? event.target.value : answer)),
                      });
                    }}
                    className="min-w-0 flex-1 border-0 border-b border-gray-300 px-2 py-1 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-0"
                    placeholder={`Option ${index + 1}`}
                  />
                  {showPoints ? <label className="flex items-center gap-1 text-xs text-gray-500">
                    {question.type === "checkboxes" ? (
                      <input
                        type="checkbox"
                        checked={question.correctAnswers.includes(option)}
                        onChange={(event) => {
                          const nextAnswers = event.target.checked
                            ? Array.from(new Set([...question.correctAnswers, option]))
                            : question.correctAnswers.filter((answer) => answer !== option);
                          onChange({ correctAnswers: nextAnswers });
                        }}
                        className="size-3.5 rounded border-gray-300 text-green-600"
                      />
                    ) : (
                      <input
                        type="radio"
                        name={`correct-${question.id}`}
                        checked={question.correctAnswer === option}
                        onChange={() => onChange({ correctAnswer: option })}
                        className="size-3.5 border-gray-300 text-green-600"
                      />
                    )}
                    Correct
                  </label> : null}
                  <button
                    type="button"
                    onClick={() => {
                      const removed = question.options[index];
                      const nextOptions = question.options.filter((_, optionIndex) => optionIndex !== index);
                      onChange({
                        options: nextOptions.length ? nextOptions : [""],
                        correctAnswer: question.correctAnswer === removed ? "" : question.correctAnswer,
                        correctAnswers: question.correctAnswers.filter((answer) => answer !== removed),
                      });
                    }}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => onChange({ options: [...question.options, `Option ${question.options.length + 1}`] })}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Add option
              </button>
            </div>
          )}
          {showPoints && ["short_answer", "paragraph"].includes(question.type) && (
            <CorrectAnswerBox
              label="Correct Answer"
              value={question.correctAnswer}
              multiline={question.type === "paragraph"}
              onChange={(value) => onChange({ correctAnswer: value })}
            />
          )}
          {showPoints && question.type === "date" && (
            <CorrectAnswerBox label="Correct Answer (Date)" type="date" value={question.correctAnswer} onChange={(value) => onChange({ correctAnswer: value })} />
          )}
          {showPoints && question.type === "time" && (
            <CorrectAnswerBox label="Correct Answer (Time)" type="time" value={question.correctAnswer} onChange={(value) => onChange({ correctAnswer: value })} />
          )}
          {question.type === "linear_scale" && (
            <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center">
              <span className="text-xs text-gray-500">Range:</span>
              <input type="number" value={question.min} onChange={(event) => onChange({ min: Number(event.target.value) || 1 })} className="w-16 rounded-md border border-gray-200 px-2 py-1 text-center text-sm" />
              <span className="text-gray-400">to</span>
              <input type="number" value={question.max} onChange={(event) => onChange({ max: Number(event.target.value) || 5 })} className="w-16 rounded-md border border-gray-200 px-2 py-1 text-center text-sm" />
              {showPoints ? <><span className="text-xs text-gray-500 sm:ml-4">Correct Value:</span><input
                type="number"
                value={question.correctAnswer}
                onChange={(event) => onChange({ correctAnswer: event.target.value })}
                className="w-20 rounded-md border border-gray-200 px-2 py-1 text-center text-sm"
                placeholder="None"
              /></> : null}
            </div>
          )}
          {question.type === "rating" && (
            <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center">
              <span className="text-xs text-gray-500">Stars:</span>
              <select value={question.max} onChange={(event) => onChange({ max: Number(event.target.value) || 5, correctAnswer: "" })} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <option key={value} value={value}>
                    {value} stars
                  </option>
                ))}
              </select>
              {showPoints ? <><span className="text-xs text-gray-500 sm:ml-4">Correct Value:</span><select value={question.correctAnswer} onChange={(event) => onChange({ correctAnswer: event.target.value })} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                <option value="">None</option>
                {Array.from({ length: question.max }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} star{value > 1 ? "s" : ""}
                  </option>
                ))}
              </select></> : null}
            </div>
          )}
          {["multiple_choice_grid", "checkbox_grid"].includes(question.type) && (
            <GridQuestionEditor question={question} showCorrectAnswers={showPoints} onChange={onChange} />
          )}
          <ConditionalQuestionEditor question={question} precedingQuestions={precedingQuestions} onChange={onChange} />
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          {!isDisplayOnly && (
            <>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={question.required} onChange={(event) => onChange({ required: event.target.checked })} className="size-4 rounded border-gray-300" />
                Required
              </label>
              {conditionSourceQuestions.length > 0 ? (
                <label className="flex items-center gap-2" title="Show this question based on an earlier answer">
                  <input
                    type="checkbox"
                    checked={Boolean(question.condition)}
                    onChange={(event) => onChange({
                      condition: event.target.checked
                        ? { questionId: conditionSourceQuestions.at(-1)!.id, operator: "answered", value: "" }
                        : null,
                    })}
                    className="size-4 rounded border-gray-300"
                  />
                  Conditional
                </label>
              ) : null}
              {showPoints && question.type !== "file_upload" ? (
                <label className="flex items-center gap-2">
                  Points
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={question.points}
                    onChange={(event) => onChange({ points: Number(event.target.value) || 0 })}
                    className="w-16 rounded-md border border-gray-200 px-2 py-1 text-center text-sm"
                  />
                </label>
              ) : null}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" disabled={actionsDisabled} onClick={onSaveToLibrary} className="inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Save question to library" title="Save to question library">
            <BookOpen className="size-4" aria-hidden="true" />
          </button>
          <button type="button" disabled={actionsDisabled} onClick={onDuplicate} className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Duplicate question">
            <Copy className="size-4" />
          </button>
          <button type="button" disabled={actionsDisabled} onClick={onDelete} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Delete question">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function QuestionImageEditor({
  question,
  disabled,
  onChange,
  onRemoveImage,
  onUploadingChange,
}: {
  question: BuilderQuestion;
  disabled: boolean;
  onChange: (patch: Partial<BuilderQuestion> | ((question: BuilderQuestion) => Partial<BuilderQuestion>)) => void;
  onRemoveImage: (index: number) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const remainingSlots = MAX_QUESTION_IMAGES - question.images.length;

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    input.value = "";
    setError(null);
    setUploadNote(null);

    if (files.length === 0) return;
    if (files.length > remainingSlots) {
      setError(`You can add ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} to this question.`);
      return;
    }
    const oversized = files.find((file) => file.size > MAX_QUESTION_IMAGE_BYTES);
    if (oversized) {
      setError(`${oversized.name} is larger than 3 MB.`);
      return;
    }

    setUploading(true);
    onUploadingChange(true);
    let result: Awaited<ReturnType<typeof uploadSpiritualFormQuestionImages>>;
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("images", file));
      result = await uploadSpiritualFormQuestionImages(formData);
      setUploadNote("Original image quality preserved.");
    } catch {
      setError("The images could not be uploaded. Please try again.");
      return;
    } finally {
      setUploading(false);
      onUploadingChange(false);
    }

    if (!result.ok) {
      setError(result.message);
      return;
    }
    onChange((currentQuestion) => ({ images: [...currentQuestion.images, ...result.images].slice(0, MAX_QUESTION_IMAGES) }));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= question.images.length) return;
    const images = [...question.images];
    [images[index], images[target]] = [images[target], images[index]];
    onChange({ images });
  }

  function dropImage(targetIndex: number) {
    if (draggedImageIndex === null || draggedImageIndex === targetIndex) return setDraggedImageIndex(null);
    const images = [...question.images];
    const [dragged] = images.splice(draggedImageIndex, 1);
    images.splice(targetIndex, 0, dragged);
    onChange({ images });
    setDraggedImageIndex(null);
  }

  return (
    <div>
      <div className="flex min-h-9 items-center justify-end gap-2">
        {uploading ? <span className="text-xs font-medium text-blue-600" role="status">Optimizing and uploading…</span> : null}
        {remainingSlots > 0 ? (
          <label
            title={question.images.length ? `Add more images (${question.images.length}/5)` : "Add images"}
            aria-label={question.images.length ? `Add more question images. ${question.images.length} of 5 added.` : "Add question images"}
            className={`relative inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 ${disabled || uploading ? "pointer-events-none opacity-50" : ""}`}
          >
            <ImagePlus className="size-4.5" aria-hidden="true" />
            {question.images.length > 0 ? <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">{question.images.length}</span> : null}
            <input
              type="file"
              multiple
              accept={QUESTION_IMAGE_ACCEPT}
              disabled={disabled || uploading}
              onChange={uploadImages}
              className="sr-only"
            />
          </label>
        ) : (
          <span title="Maximum of 5 images added" className="relative inline-flex size-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
            <ImagePlus className="size-4.5" aria-hidden="true" />
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">5</span>
          </span>
        )}
      </div>

      {uploading ? <div className="ml-auto mt-1 h-1 w-32 overflow-hidden rounded-full bg-blue-100" aria-label="Image upload in progress"><div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" /></div> : null}

      {error ? <p className="mt-1 text-right text-xs font-medium text-red-600" role="alert">{error}</p> : uploadNote ? <p className="mt-1 text-right text-xs font-medium text-emerald-600" role="status">{uploadNote}</p> : null}

      {question.images.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {question.images.map((image, index) => (
            <div key={image.id} draggable={!disabled} onDragStart={() => setDraggedImageIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropImage(index)} onDragEnd={() => setDraggedImageIndex(null)} className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${draggedImageIndex === index ? "border-blue-400 opacity-50" : "border-slate-200"}`} title="Drag to reorder image">
              <div className="relative aspect-[4/3] bg-slate-100">
                <Image src={image.path} alt={image.alt || `Question image ${index + 1}`} fill sizes="(min-width: 1024px) 260px, 45vw" quality={90} className="object-contain" />
                <span className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-[11px] font-semibold text-white">{index + 1}</span>
              </div>
              <div className="space-y-2 p-2.5">
                <input
                  value={image.alt}
                  maxLength={500}
                  onChange={(event) => onChange({
                    images: question.images.map((item, imageIndex) => imageIndex === index ? { ...item, alt: event.target.value } : item),
                  })}
                  placeholder="Image description (optional)"
                  aria-label={`Description for question image ${index + 1}`}
                  className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <input
                  value={image.caption}
                  maxLength={500}
                  onChange={(event) => onChange({
                    images: question.images.map((item, imageIndex) => imageIndex === index ? { ...item, caption: event.target.value } : item),
                  })}
                  placeholder="Visible caption (optional)"
                  aria-label={`Caption for question image ${index + 1}`}
                  className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <button type="button" disabled={disabled || index === 0} onClick={() => moveImage(index, -1)} className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30" aria-label={`Move image ${index + 1} left`}>
                      <ArrowLeft className="size-3.5" aria-hidden="true" />
                    </button>
                    <button type="button" disabled={disabled || index === question.images.length - 1} onClick={() => moveImage(index, 1)} className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30" aria-label={`Move image ${index + 1} right`}>
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <button type="button" disabled={disabled} onClick={() => onRemoveImage(index)} className="inline-flex size-8 items-center justify-center rounded-md border border-red-100 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Remove image ${index + 1}`}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ConditionalQuestionEditor({
  question,
  precedingQuestions,
  onChange,
}: {
  question: BuilderQuestion;
  precedingQuestions: BuilderQuestion[];
  onChange: (patch: Partial<BuilderQuestion>) => void;
}) {
  const eligibleQuestions = precedingQuestions.filter((candidate) => ["short_answer", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating", "multiple_choice_grid", "checkbox_grid", "date", "time"].includes(candidate.type));
  const condition = question.condition;
  if (eligibleQuestions.length === 0 || !condition) return null;
  const sourceQuestion = eligibleQuestions.find((candidate) => candidate.id === condition?.questionId);
  const sourceOptions = sourceQuestion && ["multiple_choice", "checkboxes", "dropdown"].includes(sourceQuestion.type) ? sourceQuestion.options.filter(Boolean) : [];
  const sourceIsGrid = sourceQuestion ? ["multiple_choice_grid", "checkbox_grid"].includes(sourceQuestion.type) : false;
  const gridRowIndex = sourceIsGrid ? Math.min(condition.rowIndex ?? 0, Math.max(0, (sourceQuestion?.rows.length ?? 1) - 1)) : undefined;
  const conditionOptions = sourceIsGrid ? sourceQuestion?.columns.filter(Boolean) ?? [] : sourceOptions;

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
        <div className={`grid gap-2 ${sourceIsGrid ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          <select value={condition.questionId} onChange={(event) => {
            const nextSource = eligibleQuestions.find((candidate) => candidate.id === event.target.value);
            const nextIsGrid = nextSource && ["multiple_choice_grid", "checkbox_grid"].includes(nextSource.type);
            onChange({ condition: { ...condition, questionId: event.target.value, operator: condition.operator, value: "", ...(nextIsGrid ? { rowIndex: 0 } : { rowIndex: undefined }) } });
          }} aria-label="Condition source question" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
            {eligibleQuestions.map((candidate) => <option key={candidate.id} value={candidate.id}>Q{precedingQuestions.findIndex((item) => item.id === candidate.id) + 1}: {intercessionRichTextToPlainText(candidate.label) || "Untitled"}</option>)}
          </select>
          {sourceIsGrid ? <select value={gridRowIndex} onChange={(event) => onChange({ condition: { ...condition, rowIndex: Number(event.target.value), value: "" } })} aria-label="Condition source row" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">{sourceQuestion?.rows.map((row, index) => <option key={`${row}-${index}`} value={index}>{row || `Row ${index + 1}`}</option>)}</select> : null}
          <select value={condition.operator} onChange={(event) => onChange({ condition: { ...condition, operator: event.target.value as IntercessionQuestionCondition["operator"] } })} aria-label="Condition operator" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
            <option value="answered">is answered</option>
            <option value="equals">equals</option>
            <option value="not_equals">does not equal</option>
          </select>
          {condition.operator !== "answered" ? conditionOptions.length > 0 ? (
            <select value={condition.value} onChange={(event) => onChange({ condition: { ...condition, value: event.target.value } })} aria-label="Condition value" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">Select an answer</option>
              {conditionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : (
            <input value={condition.value} onChange={(event) => onChange({ condition: { ...condition, value: event.target.value } })} placeholder="Answer value" aria-label="Condition answer value" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
          ) : <span className="self-center text-xs text-slate-500">Any non-empty answer</span>}
        </div>
    </div>
  );
}

function CorrectAnswerBox({
  label,
  value,
  type = "text",
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  type?: "text" | "date" | "time";
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center">
      <span className="text-xs text-gray-500">{label}:</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => {
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
            onChange(event.currentTarget.value);
          }}
          rows={2}
          className="min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder="Enter correct answer..."
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          placeholder={type === "text" ? "Enter correct answer..." : undefined}
        />
      )}
    </div>
  );
}

function GridQuestionEditor({
  question,
  showCorrectAnswers,
  onChange,
}: {
  question: BuilderQuestion;
  showCorrectAnswers: boolean;
  onChange: (patch: Partial<BuilderQuestion>) => void;
}) {
  function updateRow(index: number, value: string) {
    const rows = [...question.rows];
    rows[index] = value;
    onChange({ rows });
  }

  function updateColumn(index: number, value: string) {
    const previous = question.columns[index];
    const columns = [...question.columns];
    columns[index] = value;
    const gridCorrectAnswers = Object.fromEntries(
      Object.entries(question.gridCorrectAnswers).map(([rowIndex, answer]) => {
        if (typeof answer === "string") return [rowIndex, answer === previous ? value : answer];
        return [rowIndex, answer.map((item) => (item === previous ? value : item))];
      }),
    );
    onChange({ columns, gridCorrectAnswers });
  }

  function setSingleCorrect(rowIndex: number, value: string) {
    onChange({ gridCorrectAnswers: { ...question.gridCorrectAnswers, [rowIndex]: value } });
  }

  function setCheckboxCorrect(rowIndex: number, value: string, checked: boolean) {
    const current = question.gridCorrectAnswers[rowIndex];
    const currentValues = Array.isArray(current) ? current : [];
    const nextValues = checked ? Array.from(new Set([...currentValues, value])) : currentValues.filter((item) => item !== value);
    onChange({ gridCorrectAnswers: { ...question.gridCorrectAnswers, [rowIndex]: nextValues } });
  }

  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="grid gap-4 md:grid-cols-2">
        <GridList
          title="Rows"
          items={question.rows}
          addLabel="Add row"
          onChange={updateRow}
          onAdd={() => onChange({ rows: [...question.rows, `Row ${question.rows.length + 1}`] })}
          onRemove={(index) => onChange({ rows: question.rows.length > 1 ? question.rows.filter((_, rowIndex) => rowIndex !== index) : question.rows })}
        />
        <GridList
          title="Columns"
          items={question.columns}
          addLabel="Add column"
          onChange={updateColumn}
          onAdd={() => onChange({ columns: [...question.columns, `Column ${question.columns.length + 1}`] })}
          onRemove={(index) => onChange({ columns: question.columns.length > 1 ? question.columns.filter((_, columnIndex) => columnIndex !== index) : question.columns })}
        />
      </div>
      {showCorrectAnswers ? <div className="mt-4 border-t border-gray-200 pt-3">
        <p className="mb-2 text-xs font-semibold text-gray-600">
          {question.type === "checkbox_grid" ? "Correct Answers (select all that apply per row)" : "Correct Answers (per row)"}
        </p>
        <div className="space-y-3">
          {question.rows.map((row, rowIndex) => (
            <div key={`${question.id}-row-correct-${rowIndex}`} className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-2 text-sm font-medium text-gray-700">{row || `Row ${rowIndex + 1}`}</p>
              {question.type === "multiple_choice_grid" ? (
                <select
                  value={typeof question.gridCorrectAnswers[rowIndex] === "string" ? (question.gridCorrectAnswers[rowIndex] as string) : ""}
                  onChange={(event) => setSingleCorrect(rowIndex, event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="">None</option>
                  {question.columns.map((column) => (
                    <option key={column} value={column}>{column}</option>
                  ))}
                </select>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {question.columns.map((column) => {
                    const selected = Array.isArray(question.gridCorrectAnswers[rowIndex]) && question.gridCorrectAnswers[rowIndex].includes(column);
                    return (
                      <label key={column} className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={(event) => setCheckboxCorrect(rowIndex, column, event.target.checked)}
                          className="rounded border-gray-300 text-green-600"
                        />
                        {column}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div> : null}
    </div>
  );
}

function GridList({
  title,
  items,
  addLabel,
  onChange,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  addLabel: string;
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-gray-600">{title}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(event) => onChange(index, event.target.value)}
              className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm"
            />
            <button type="button" onClick={() => onRemove(index)} className="text-xs font-semibold text-red-500 hover:text-red-700">
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAdd} className="mt-2 text-xs font-semibold text-indigo-600 hover:underline">
        {addLabel}
      </button>
    </div>
  );
}

function ModalShell({ title, onClose, children, maxWidth = "max-w-3xl" }: { title: string; onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  const dialogRef = useRef<HTMLElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
    focusable()[0]?.focus();
    function handleKeys(event: KeyboardEvent) {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab") return;
      const items = focusable(); if (!items.length) return;
      const first = items[0]; const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", handleKeys);
    return () => { window.removeEventListener("keydown", handleKeys); window.setTimeout(() => returnFocusRef.current?.focus(), 0); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} className={`flex max-h-[94vh] w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl`}>
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" autoFocus onClick={onClose} className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Close ${title}`}><X className="size-5" aria-hidden="true" /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function PublishingChecklistModal({ issues, onClose, onGoToQuestion }: { issues: ReturnType<typeof getIntercessionPublishingIssues>; onClose: () => void; onGoToQuestion: (id: string) => void }) {
  return (
    <ModalShell title="Publishing checklist" onClose={onClose}>
      <div className="overflow-y-auto p-5">
        {issues.length === 0 ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800"><Check className="mx-auto mb-2 size-7" aria-hidden="true" /><p className="font-semibold">Ready to publish</p><p className="mt-1 text-sm">No publishing problems were found.</p></div>
        ) : (
          <><p className="mb-3 text-sm text-slate-600">Resolve these {issues.length} item{issues.length === 1 ? "" : "s"} before publishing.</p><ul className="space-y-2">{issues.map((issue) => <li key={issue.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"><span className="text-sm text-amber-900">{issue.message}</span>{issue.questionId ? <button type="button" onClick={() => onGoToQuestion(issue.questionId!)} className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Fix</button> : null}</li>)}</ul></>
        )}
      </div>
    </ModalShell>
  );
}

function TemplatesModal({ onClose, onApply }: { onClose: () => void; onApply: (template: (typeof formTemplates)[number]) => void }) {
  return <ModalShell title="Start from a template" onClose={onClose}><div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2">{formTemplates.map((template) => <button key={template.id} type="button" onClick={() => onApply(template)} className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"><span className="font-semibold text-slate-900">{template.name}</span><span className="mt-1 block text-sm text-slate-500">{template.description}</span><span className="mt-3 block text-xs font-semibold text-blue-700">Use template</span></button>)}</div></ModalShell>;
}

function QuestionLibraryModal({ questions, onClose, onAdd, onRemove }: { questions: BuilderQuestion[]; onClose: () => void; onAdd: (question: BuilderQuestion) => void; onRemove: (id: string) => void }) {
  return <ModalShell title="Question library" onClose={onClose}><div className="overflow-y-auto p-5">{questions.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Use the book button on a question to save it here for reuse.</div> : <ul className="space-y-2">{questions.map((question) => <li key={question.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><p className="truncate font-medium text-slate-800">{intercessionRichTextToPlainText(question.label) || "Untitled question"}</p><p className="text-xs text-slate-500">{questionTypes.find((type) => type.value === question.type)?.label ?? question.type}</p></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => onAdd(question)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Add</button><button type="button" onClick={() => onRemove(question.id)} className="inline-flex size-8 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50" aria-label="Remove from library"><Trash2 className="size-4" aria-hidden="true" /></button></div></li>)}</ul>}</div></ModalShell>;
}

function BuilderPreviewModal({ title, description, questions, settings, device, setDevice, onClose }: { title: string; description: string; questions: BuilderQuestion[]; settings: BuilderSettings; device: "desktop" | "mobile"; setDevice: (device: "desktop" | "mobile") => void; onClose: () => void }) {
  return (
    <ModalShell title="Form preview" onClose={onClose} maxWidth="max-w-6xl">
      <div className="flex shrink-0 items-center justify-center gap-1 border-b border-slate-200 bg-slate-50 p-2" role="group" aria-label="Preview device">
        <button type="button" onClick={() => setDevice("desktop")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${device === "desktop" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`} aria-pressed={device === "desktop"}><Monitor className="size-4" aria-hidden="true" /> Desktop</button>
        <button type="button" onClick={() => setDevice("mobile")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${device === "mobile" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`} aria-pressed={device === "mobile"}><Smartphone className="size-4" aria-hidden="true" /> Mobile</button>
      </div>
      <div className="overflow-y-auto bg-slate-100 p-3 sm:p-5"><div className={`mx-auto transition-all ${device === "mobile" ? "max-w-[390px]" : "max-w-5xl"}`}><IntercessionTakeForm form={{ id: 0, title: title || "Untitled form", description }} questions={questions} settings={settings} alreadySubmitted={false} requireRespondentName={!settings.require_login} preview embedded onPreviewClose={onClose} /></div></div>
    </ModalShell>
  );
}

function SettingsPanel({
  settings,
  setSettings,
  activeTab,
  setActiveTab,
  hasOrderedQuestions,
}: {
  settings: BuilderSettings;
  setSettings: React.Dispatch<React.SetStateAction<BuilderSettings>>;
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
  hasOrderedQuestions: boolean;
}) {
  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "quiz", label: "Quiz" },
    { id: "responses", label: "Responses" },
    { id: "presentation", label: "Presentation" },
    { id: "defaults", label: "Defaults" },
    { id: "advanced", label: "Advanced" },
  ];

  function update(key: string, value: boolean | string | number) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-5">
        <div className="py-3 md:hidden">
          <MobileTabScroller tabs={tabs} value={activeTab} onChange={(tab) => setActiveTab(tab as SettingsTab)} />
        </div>
        <nav className="hidden gap-6 overflow-x-auto md:flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium ${
                activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-indigo-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-4 p-5">
        {activeTab === "quiz" && (
          <>
            <SettingToggle title="Make this a quiz" description="Assign point values, set correct answers" checked={Boolean(settings.is_quiz)} onChange={(value) => update("is_quiz", value)} />
            <SettingSelect title="Release grade" value={String(settings.release_grade)} onChange={(value) => update("release_grade", value)} options={[
              ["immediately", "Immediately after submission"],
              ["later", "Later, after manual review"],
              ["never", "Never show score"],
            ]} />
            <SettingNumber title="Default points" value={Number(settings.default_points)} onChange={(value) => update("default_points", value)} />
          </>
        )}
        {activeTab === "responses" && (
          <>
            <SettingToggle title="Accept responses" description="Temporarily open or close this form without archiving it" checked={Boolean(settings.accepting_responses)} onChange={(value) => update("accepting_responses", value)} />
            <SettingToggle title="User can view their responses" description="Allow users to see their submitted answers" checked={Boolean(settings.allow_view_response)} onChange={(value) => update("allow_view_response", value)} />
            <SettingToggle title="Limit to 1 response" description="Prevent users from submitting more than once" checked={Boolean(settings.limit_one_response)} onChange={(value) => update("limit_one_response", value)} />
            <SettingToggle title="Require login to submit" description="Only authenticated users can submit responses" checked={Boolean(settings.require_login)} onChange={(value) => update("require_login", value)} />
            {!settings.require_login ? <VisitorFieldsEditor fields={settings.visitor_fields} onChange={(visitor_fields) => setSettings((current) => ({ ...current, visitor_fields }))} /> : null}
            <div className="grid gap-3 border-b border-gray-100 py-3 sm:grid-cols-2"><label className="text-sm font-medium text-gray-800">Opens at<input type="datetime-local" value={String(settings.submission_opens_at ?? "")} onChange={(event) => update("submission_opens_at", event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label><label className="text-sm font-medium text-gray-800">Closes at<input type="datetime-local" value={String(settings.submission_deadline ?? "")} onChange={(event) => update("submission_deadline", event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label></div>
            <div className="border-b border-gray-100 py-3">
              <h3 className="mb-2 text-sm font-medium text-gray-800">Maximum responses</h3>
              <input type="number" min={0} value={Number(settings.max_responses)} onChange={(event) => update("max_responses", Math.max(0, Number(event.target.value) || 0))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <p className="mt-1 text-xs text-gray-500">Use 0 for no response limit.</p>
            </div>
            <label className="block border-b border-gray-100 py-3 text-sm font-medium text-gray-800">Thank-you message<textarea value={settings.thank_you_message} onChange={(event) => update("thank_you_message", event.target.value)} rows={3} className="mt-2 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            <label className="block border-b border-gray-100 py-3 text-sm font-medium text-gray-800">Submit button label<input value={settings.submit_button_label} maxLength={80} onChange={(event) => update("submit_button_label", event.target.value)} placeholder="Submit" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /><span className="mt-1 block text-xs font-normal text-gray-500">For example, Submit, Register, or Mark Attendance.</span></label>
            <label className="block border-b border-gray-100 py-3 text-sm font-medium text-gray-800">Closed-form message<textarea value={settings.response_closed_message} onChange={(event) => update("response_closed_message", event.target.value)} rows={2} className="mt-2 w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            <label className="block border-b border-gray-100 py-3 text-sm font-medium text-gray-800">Continue to (optional)<input value={settings.redirect_url} onChange={(event) => update("redirect_url", event.target.value)} placeholder="/admin/intercession" className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /><span className="mt-1 block text-xs font-normal text-gray-500">Enter a safe path inside this system, beginning with /.</span></label>
          </>
        )}
        {activeTab === "presentation" && (
          <>
            <SettingToggle title="Show progress bar" description="Display progress during form filling" checked={Boolean(settings.show_progress_bar)} onChange={(value) => update("show_progress_bar", value)} />
            <SettingToggle title="Shuffle question order" description={hasOrderedQuestions ? "Unavailable while the form contains sections or conditional questions" : "Randomize question order for each user"} checked={Boolean(settings.shuffle_questions) && !hasOrderedQuestions} disabled={hasOrderedQuestions} onChange={(value) => update("shuffle_questions", value)} />
            <SettingToggle title="Show question numbers" description="Display numbering on questions" checked={Boolean(settings.show_question_numbers)} onChange={(value) => update("show_question_numbers", value)} />
          </>
        )}
        {activeTab === "defaults" && (
          <>
            <SettingToggle title="Make questions required by default" description="Users must answer all questions" checked={Boolean(settings.default_required)} onChange={(value) => update("default_required", value)} />
            <SettingToggle title="Publish form by default" description="Form will be visible immediately" checked={Boolean(settings.is_published)} onChange={(value) => update("is_published", value)} />
            <SettingToggle title="Allow partial points for checkboxes" description="Award proportional credit for correct selections; wrong selections do not subtract earned points" checked={Boolean(settings.allow_partial_points)} onChange={(value) => update("allow_partial_points", value)} />
          </>
        )}
        {activeTab === "advanced" && (
          <>
            <SettingToggle title="Notify admin on submission" description="Send notification when someone submits" checked={Boolean(settings.notify_on_submit)} onChange={(value) => update("notify_on_submit", value)} />
            <SettingToggle title="Notify user when reviewed" description="Notify when score is released" checked={Boolean(settings.notify_user_on_review)} onChange={(value) => update("notify_user_on_review", value)} />
            <SettingToggle title="Send response receipt" description="Send members or guests with an email address a submission receipt" checked={Boolean(settings.send_response_receipt)} onChange={(value) => update("send_response_receipt", value)} />
            <SettingToggle title="Allow response editing" description="Give respondents a secure, time-limited edit link after submission" checked={Boolean(settings.allow_response_editing)} onChange={(value) => update("allow_response_editing", value)} />
            {settings.allow_response_editing ? <SettingNumber title="Editing window (hours)" value={Number(settings.response_edit_hours)} onChange={(value) => update("response_edit_hours", Math.min(720, Math.max(1, value)))} /> : null}
            <SettingToggle title="Allow response export" description="Admin can download CSV or Excel workbooks" checked={Boolean(settings.allow_export)} onChange={(value) => update("allow_export", value)} />
            <SettingToggle title="Include timestamps in export" description="Show submission time in downloaded files" checked={Boolean(settings.include_timestamps)} onChange={(value) => update("include_timestamps", value)} />
            <SettingToggle title="Allow submission without questions" description="Let this form record the respondent and submission time without requiring an answer" checked={Boolean(settings.allow_empty_submission)} onChange={(value) => update("allow_empty_submission", value)} />
          </>
        )}
      </div>
    </div>
  );
}

function VisitorFieldsEditor({ fields, onChange }: { fields: IntercessionVisitorField[]; onChange: (fields: IntercessionVisitorField[]) => void }) {
  const normalized = fields.length ? fields : DEFAULT_INTERCESSION_VISITOR_FIELDS;

  function updateField(id: string, patch: Partial<IntercessionVisitorField>) {
    onChange(normalized.map((field) => field.id === id ? { ...field, ...patch } : field));
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (index === 0 || target < 1 || target >= normalized.length) return;
    const next = [...normalized];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addField() {
    if (normalized.length >= 12) return;
    onChange([...normalized, {
      id: `visitor_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`,
      label: "New guest field",
      type: "text",
      required: false,
      placeholder: "",
      helpText: "",
      options: [],
    }]);
  }

  return (
    <section className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Guest information</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">These fields appear only to people who are not signed in. Details are stored separately from form answers.</p>
        </div>
        <button type="button" onClick={addField} disabled={normalized.length >= 12} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          <Plus className="size-3.5" aria-hidden="true" /> Add field
        </button>
      </div>
      <div className="mt-4 space-y-3">
        {normalized.map((field, index) => {
          const isName = field.id === "full_name";
          return (
            <article key={field.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[minmax(200px,1.5fr)_160px_auto]">
                <label className="text-xs font-semibold text-slate-600">Field label<input value={field.label} maxLength={120} onChange={(event) => updateField(field.id, { label: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="text-xs font-semibold text-slate-600">Type<select value={field.type} disabled={isName} onChange={(event) => updateField(field.id, { type: event.target.value as IntercessionVisitorField["type"], options: [] })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-100"><option value="text">Short text</option><option value="phone">Telephone</option><option value="email">Email</option><option value="number">Number</option><option value="date">Date</option><option value="select">Dropdown</option><option value="checkboxes">Checkboxes</option></select></label>
                <div className="flex items-end justify-end gap-1">
                  <button type="button" onClick={() => moveField(index, -1)} disabled={isName || index === 1} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30" aria-label={`Move ${field.label} up`}><ChevronUp className="size-4" /></button>
                  <button type="button" onClick={() => moveField(index, 1)} disabled={isName || index === normalized.length - 1} className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30" aria-label={`Move ${field.label} down`}><ChevronDown className="size-4" /></button>
                  <button type="button" onClick={() => onChange(normalized.filter((item) => item.id !== field.id))} disabled={isName} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-red-600 disabled:opacity-30" aria-label={`Remove ${field.label}`}><Trash2 className="size-4" /></button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input value={field.placeholder} maxLength={200} onChange={(event) => updateField(field.id, { placeholder: event.target.value })} placeholder="Placeholder (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                <input value={field.helpText} maxLength={300} onChange={(event) => updateField(field.id, { helpText: event.target.value })} placeholder="Help text (optional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
              </div>
              {["select", "checkboxes"].includes(field.type) ? <textarea value={field.options.join("\n")} onChange={(event) => updateField(field.id, { options: event.target.value.split("\n").slice(0, 30) })} rows={3} placeholder="One option per line" className="mt-3 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" /> : null}
              <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-700"><input type="checkbox" checked={isName || field.required} disabled={isName} onChange={(event) => updateField(field.id, { required: event.target.checked })} className="size-4 rounded text-blue-600" /> Required{isName ? " (guest identity)" : ""}</label>
            </article>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-500">Up to 12 guest fields. Full name is always required.</p>
    </section>
  );
}

function SettingToggle({ title, description, checked, disabled = false, onChange }: { title: string; description: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <div>
        <h3 className="text-sm font-medium text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-5 rounded border-gray-300 text-indigo-600 disabled:opacity-50" />
    </div>
  );
}

function SettingSelect({ title, value, onChange, options }: { title: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <div className="border-b border-gray-100 py-3">
      <h3 className="mb-2 text-sm font-medium text-gray-800">{title}</h3>
      <div className="space-y-1.5">
        {options.map(([optionValue, label]) => (
          <label key={optionValue} className="flex items-center gap-2 text-xs">
            <input type="radio" name={title} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} className="text-indigo-600" />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}

function SettingNumber({ title, value, onChange }: { title: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="py-3">
      <h3 className="mb-2 text-sm font-medium text-gray-800">{title}</h3>
      <input type="number" min={1} max={100} value={value} onChange={(event) => onChange(Number(event.target.value) || 1)} className="w-20 rounded-md border border-gray-200 px-2 py-1 text-center text-sm" />
    </div>
  );
}
