"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { DragEvent, FormEvent, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  GripVertical,
  Heading,
  Layers,
  List,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { createSpiritualFormFromBuilder, updateSpiritualFormFromBuilder } from "@/app/admin/intercession/actions";
import { MobileTabScroller } from "@/components/mobile-tab-scroller";

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
};

type SettingsTab = "quiz" | "responses" | "presentation" | "defaults" | "advanced";

type BuilderSettings = {
  is_quiz: boolean;
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
  notify_user_on_review: boolean;
  allow_export: boolean;
  include_timestamps: boolean;
};

export type IntercessionBuilderInitialData = {
  id?: number;
  title?: string;
  description?: string | null;
  questions?: Partial<BuilderQuestion & { text?: string; correctAnswers?: unknown; rows?: unknown; columns?: unknown }>[];
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
];

function asGridCorrectAnswers(value: unknown): Record<string, string | string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
    key,
    Array.isArray(item) ? item.filter((answer): answer is string => typeof answer === "string") : typeof item === "string" ? item : "",
  ]);
  return Object.fromEntries(entries);
}

function newQuestion(type: QuestionType = "short_answer"): BuilderQuestion {
  return {
    id: crypto.randomUUID(),
    type,
    label: type === "title_section" ? "Title and description" : type === "section_break" ? "New section" : "Untitled question",
    description: "",
    required: true,
    options: ["Option 1"],
    points: 1,
    correctAnswer: "",
    correctAnswers: [],
    rows: ["Row 1"],
    columns: ["Column 1"],
    gridCorrectAnswers: {},
    min: 1,
    max: type === "rating" ? 5 : 5,
  };
}

function normalizeQuestion(question: Partial<BuilderQuestion & { text?: string; correctAnswers?: unknown; rows?: unknown; columns?: unknown }>): BuilderQuestion {
  const type = question.type && ["short_answer", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating", "multiple_choice_grid", "checkbox_grid", "date", "time", "title_section", "section_break"].includes(question.type)
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
  };
}

const defaultSettings: BuilderSettings = {
  is_quiz: true,
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
  notify_user_on_review: false,
  allow_export: true,
  include_timestamps: true,
};

export function IntercessionFormBuilder({ initialData }: { initialData?: IntercessionBuilderInitialData }) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);
  const [activeArea, setActiveArea] = useState<"questions" | "settings">("questions");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("quiz");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    initialData?.questions?.length ? initialData.questions.map(normalizeQuestion) : [newQuestion()],
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [settings, setSettings] = useState<BuilderSettings>({ ...defaultSettings, ...(initialData?.settings ?? {}) });

  const savableQuestions = useMemo(
    () =>
      questions.map((question) => ({
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
      })),
    [questions],
  );

  function updateQuestion(id: string, patch: Partial<BuilderQuestion>) {
    setQuestions((current) => current.map((question) => (question.id === id ? { ...question, ...patch } : question)));
  }

  function addQuestion(type: QuestionType = "short_answer", afterId = selectedQuestionId) {
    const question = newQuestion(type);
    setQuestions((current) => {
      if (!afterId) return [...current, question];
      const index = current.findIndex((item) => item.id === afterId);
      if (index === -1) return [...current, question];
      return [...current.slice(0, index + 1), question, ...current.slice(index + 1)];
    });
    setSelectedQuestionId(question.id);
  }

  function duplicateQuestion(id: string) {
    setQuestions((current) => {
      const index = current.findIndex((question) => question.id === id);
      if (index === -1) return current;
      const copy = { ...current[index], id: crypto.randomUUID(), label: `${current[index].label} copy`, options: [...current[index].options], correctAnswers: [...current[index].correctAnswers], rows: [...current[index].rows], columns: [...current[index].columns], gridCorrectAnswers: { ...current[index].gridCorrectAnswers } };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  }

  function deleteQuestion(id: string) {
    setQuestions((current) => (current.length === 1 ? current : current.filter((question) => question.id !== id)));
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
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("questions", JSON.stringify(savableQuestions));
    formData.set("settings", JSON.stringify(settings));

    startTransition(async () => {
      const result = initialData?.id
        ? await updateSpiritualFormFromBuilder(initialData.id, formData)
        : await createSpiritualFormFromBuilder(formData);
      setMessage(result.message);
      if (result.ok) {
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
              <Link href="/admin/intercession" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-blue-600">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Manage Forms
              </Link>
              <h1 className="mt-1 text-xl font-bold text-gray-900">{isEditing ? "Edit form" : "Create a new form"}</h1>
              <p className="mt-1 text-xs text-gray-500">Build questions, configure responses, then save your form.</p>
            </div>
            <button
              disabled={isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Check className="size-4" aria-hidden="true" />
              {isPending ? "Saving..." : isEditing ? "Update Form" : "Save Form"}
            </button>
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

        {message && <div className="mx-auto mb-4 max-w-5xl rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">{message}</div>}

        {activeArea === "questions" ? (
          <div>
            <div className="mx-auto mb-4 max-w-5xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="h-1 bg-blue-600" />
              <div className="p-5">
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={150}
                  placeholder="Untitled form"
                  className="mb-2 w-full border-none text-2xl font-semibold text-gray-900 outline-none focus:ring-0"
                />
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Add a short description (optional)"
                  className="w-full resize-none border-none text-lg text-gray-900 outline-none focus:ring-0 sm:text-xl"
                />
              </div>
            </div>

            <div className="relative mx-auto max-w-5xl">
              <div className="space-y-4">
                {questions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    selected={selectedQuestionId === question.id}
                    dragging={draggingQuestionId === question.id}
                    onSelect={() => setSelectedQuestionId(question.id)}
                    onChange={(patch) => updateQuestion(question.id, patch)}
                    onAddQuestion={() => addQuestion("short_answer", question.id)}
                    onAddTitle={() => addQuestion("title_section", question.id)}
                    onAddSection={() => addQuestion("section_break", question.id)}
                    onDuplicate={() => duplicateQuestion(question.id)}
                    onDelete={() => deleteQuestion(question.id)}
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
          <SettingsPanel settings={settings} setSettings={setSettings} activeTab={settingsTab} setActiveTab={setSettingsTab} />
        )}
      </form>
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
  onSelect,
  onChange,
  onAddQuestion,
  onAddTitle,
  onAddSection,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  question: BuilderQuestion;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<BuilderQuestion>) => void;
  onAddQuestion: () => void;
  onAddTitle: () => void;
  onAddSection: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const isDisplayOnly = question.type === "title_section" || question.type === "section_break";

  return (
    <div
      onClick={onSelect}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative overflow-visible rounded-xl border bg-white p-4 shadow-sm transition ${
        selected ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
      } ${dragging ? "opacity-50" : "opacity-100"}`}
    >
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
          <input
            value={question.label}
            onChange={(event) => onChange({ label: event.target.value })}
            className="w-full border-0 border-b border-gray-300 bg-gray-50 px-3 py-2 text-lg font-medium text-gray-900 outline-none focus:border-gray-500 focus:ring-0 sm:text-xl"
          />
          <input
            value={question.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Description (optional)"
            className="mt-2 w-full border-0 border-b border-gray-100 px-3 py-2 text-sm text-gray-500 outline-none focus:border-gray-300 focus:ring-0"
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
                  <label className="flex items-center gap-1 text-xs text-gray-500">
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
                  </label>
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
          {["short_answer", "paragraph"].includes(question.type) && (
            <CorrectAnswerBox
              label="Correct Answer"
              value={question.correctAnswer}
              multiline={question.type === "paragraph"}
              onChange={(value) => onChange({ correctAnswer: value })}
            />
          )}
          {question.type === "date" && (
            <CorrectAnswerBox label="Correct Answer (Date)" type="date" value={question.correctAnswer} onChange={(value) => onChange({ correctAnswer: value })} />
          )}
          {question.type === "time" && (
            <CorrectAnswerBox label="Correct Answer (Time)" type="time" value={question.correctAnswer} onChange={(value) => onChange({ correctAnswer: value })} />
          )}
          {question.type === "linear_scale" && (
            <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-3 sm:flex-row sm:items-center">
              <span className="text-xs text-gray-500">Range:</span>
              <input type="number" value={question.min} onChange={(event) => onChange({ min: Number(event.target.value) || 1 })} className="w-16 rounded-md border border-gray-200 px-2 py-1 text-center text-sm" />
              <span className="text-gray-400">to</span>
              <input type="number" value={question.max} onChange={(event) => onChange({ max: Number(event.target.value) || 5 })} className="w-16 rounded-md border border-gray-200 px-2 py-1 text-center text-sm" />
              <span className="text-xs text-gray-500 sm:ml-4">Correct Value:</span>
              <input
                type="number"
                value={question.correctAnswer}
                onChange={(event) => onChange({ correctAnswer: event.target.value })}
                className="w-20 rounded-md border border-gray-200 px-2 py-1 text-center text-sm"
                placeholder="None"
              />
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
              <span className="text-xs text-gray-500 sm:ml-4">Correct Value:</span>
              <select value={question.correctAnswer} onChange={(event) => onChange({ correctAnswer: event.target.value })} className="rounded-md border border-gray-200 px-2 py-1 text-sm">
                <option value="">None</option>
                {Array.from({ length: question.max }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} star{value > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {["multiple_choice_grid", "checkbox_grid"].includes(question.type) && (
            <GridQuestionEditor question={question} onChange={onChange} />
          )}
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
              <label className="flex items-center gap-2">
                Points
                <input
                  type="number"
                  min={0}
                  value={question.points}
                  onChange={(event) => onChange({ points: Number(event.target.value) || 0 })}
                  className="w-16 rounded-md border border-gray-200 px-2 py-1 text-center text-sm"
                />
              </label>
            </>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onDuplicate} className="inline-flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" aria-label="Duplicate question">
            <Copy className="size-4" />
          </button>
          <button type="button" onClick={onDelete} className="inline-flex size-9 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50" aria-label="Delete question">
            <Trash2 className="size-4" />
          </button>
        </div>
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
          onChange={(event) => onChange(event.target.value)}
          rows={2}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
  onChange,
}: {
  question: BuilderQuestion;
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
      <div className="mt-4 border-t border-gray-200 pt-3">
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
      </div>
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

function SettingsPanel({
  settings,
  setSettings,
  activeTab,
  setActiveTab,
}: {
  settings: Record<string, boolean | string | number>;
  setSettings: React.Dispatch<React.SetStateAction<{
    is_quiz: boolean;
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
    notify_user_on_review: boolean;
    allow_export: boolean;
    include_timestamps: boolean;
  }>>;
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
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
            <SettingToggle title="User can view their responses" description="Allow users to see their submitted answers" checked={Boolean(settings.allow_view_response)} onChange={(value) => update("allow_view_response", value)} />
            <SettingToggle title="Limit to 1 response" description="Prevent users from submitting more than once" checked={Boolean(settings.limit_one_response)} onChange={(value) => update("limit_one_response", value)} />
            <SettingToggle title="Require login to submit" description="Only authenticated users can submit responses" checked={Boolean(settings.require_login)} onChange={(value) => update("require_login", value)} />
          </>
        )}
        {activeTab === "presentation" && (
          <>
            <SettingToggle title="Show progress bar" description="Display progress during form filling" checked={Boolean(settings.show_progress_bar)} onChange={(value) => update("show_progress_bar", value)} />
            <SettingToggle title="Shuffle question order" description="Randomize question order for each user" checked={Boolean(settings.shuffle_questions)} onChange={(value) => update("shuffle_questions", value)} />
            <SettingToggle title="Show question numbers" description="Display numbering on questions" checked={Boolean(settings.show_question_numbers)} onChange={(value) => update("show_question_numbers", value)} />
          </>
        )}
        {activeTab === "defaults" && (
          <>
            <SettingToggle title="Make questions required by default" description="Users must answer all questions" checked={Boolean(settings.default_required)} onChange={(value) => update("default_required", value)} />
            <SettingToggle title="Publish form by default" description="Form will be visible immediately" checked={Boolean(settings.is_published)} onChange={(value) => update("is_published", value)} />
            <SettingToggle title="Allow partial points for checkboxes" description="Give points for correct selected answers" checked={Boolean(settings.allow_partial_points)} onChange={(value) => update("allow_partial_points", value)} />
          </>
        )}
        {activeTab === "advanced" && (
          <>
            <SettingToggle title="Notify admin on submission" description="Send notification when someone submits" checked={Boolean(settings.notify_on_submit)} onChange={(value) => update("notify_on_submit", value)} />
            <SettingToggle title="Notify user when reviewed" description="Notify when score is released" checked={Boolean(settings.notify_user_on_review)} onChange={(value) => update("notify_user_on_review", value)} />
            <SettingToggle title="Allow CSV export" description="Admin can export responses" checked={Boolean(settings.allow_export)} onChange={(value) => update("allow_export", value)} />
            <SettingToggle title="Include timestamps in export" description="Show submission time in CSV" checked={Boolean(settings.include_timestamps)} onChange={(value) => update("include_timestamps", value)} />
          </>
        )}
      </div>
    </div>
  );
}

function SettingToggle({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <div>
        <h3 className="text-sm font-medium text-gray-800">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 size-5 rounded border-gray-300 text-indigo-600" />
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
