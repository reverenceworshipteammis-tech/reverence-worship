import {
  intercessionConditionMatches,
  parseIntercessionQuestionCondition,
  type IntercessionConditionAnswer,
  type IntercessionQuestionCondition,
} from "@/lib/intercession-form-rules";
import { parseQuestionImages, type IntercessionQuestionImage } from "@/lib/intercession-question-images";

export const INTERCESSION_ANSWERABLE_TYPES = [
  "short_answer", "paragraph", "multiple_choice", "checkboxes", "dropdown", "linear_scale", "rating",
  "multiple_choice_grid", "checkbox_grid", "date", "time", "file_upload",
] as const;

export type IntercessionFormAnswer = IntercessionConditionAnswer;

export const INTERCESSION_VISITOR_FIELD_TYPES = ["text", "phone", "email", "number", "date", "select", "checkboxes"] as const;
export type IntercessionVisitorFieldType = typeof INTERCESSION_VISITOR_FIELD_TYPES[number];

export type IntercessionVisitorField = {
  id: string;
  label: string;
  type: IntercessionVisitorFieldType;
  required: boolean;
  placeholder: string;
  helpText: string;
  options: string[];
};

export type IntercessionVisitorDetail = {
  fieldId: string;
  label: string;
  type: IntercessionVisitorFieldType;
  value: string | string[];
};

export const DEFAULT_INTERCESSION_VISITOR_FIELDS: IntercessionVisitorField[] = [{
  id: "full_name",
  label: "Full name",
  type: "text",
  required: true,
  placeholder: "Enter your full name",
  helpText: "",
  options: [],
}];

export function normalizeIntercessionRespondentName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, 150);
}

export function parseIntercessionVisitorFields(value: unknown): IntercessionVisitorField[] {
  const source = Array.isArray(value) ? value : [];
  const parsed = source.flatMap((entry, index) => {
    const item = record(entry);
    const id = typeof item.id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id) ? item.id : `visitor_${index + 1}`;
    const type = typeof item.type === "string" && (INTERCESSION_VISITOR_FIELD_TYPES as readonly string[]).includes(item.type)
      ? item.type as IntercessionVisitorFieldType
      : "text";
    const label = typeof item.label === "string" ? item.label.trim().slice(0, 120) : "";
    if (!label) return [];
    return [{
      id,
      label,
      type,
      required: Boolean(item.required),
      placeholder: typeof item.placeholder === "string" ? item.placeholder.trim().slice(0, 200) : "",
      helpText: typeof item.helpText === "string" ? item.helpText.trim().slice(0, 300) : "",
      options: ["select", "checkboxes"].includes(type) ? strings(item.options).slice(0, 30).map((option) => option.slice(0, 150)) : [],
    }];
  });
  const unique = parsed.filter((field, index) => parsed.findIndex((item) => item.id === field.id) === index).slice(0, 12);
  const configuredName = unique.find((field) => field.id === "full_name");
  const nameField = configuredName
    ? { ...configuredName, type: "text" as const, required: true, options: [] }
    : { ...DEFAULT_INTERCESSION_VISITOR_FIELDS[0] };
  return [nameField, ...unique.filter((field) => field.id !== "full_name")].slice(0, 12);
}

export function parseIntercessionVisitorDetails(value: unknown): IntercessionVisitorDetail[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const item = record(entry);
    if (typeof item.fieldId !== "string" || typeof item.label !== "string") return [];
    const type = typeof item.type === "string" && (INTERCESSION_VISITOR_FIELD_TYPES as readonly string[]).includes(item.type)
      ? item.type as IntercessionVisitorFieldType
      : "text";
    const detailValue = Array.isArray(item.value)
      ? item.value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.slice(0, 500)).slice(0, 30)
      : typeof item.value === "string" ? item.value.slice(0, 2000) : "";
    return [{ fieldId: item.fieldId.slice(0, 80), label: item.label.slice(0, 120), type, value: detailValue }];
  }).slice(0, 12);
}

export function intercessionGuestFieldConfigurationIssue(value: unknown) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return "Guest fields have an invalid configuration.";
  for (const [index, entry] of value.entries()) {
    const item = record(entry);
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!label) return `Guest field ${index + 1} needs a label.`;
  }
  const fields = parseIntercessionVisitorFields(value);
  const duplicateLabel = fields.find((field, index) => fields.findIndex((item) => item.label.toLowerCase() === field.label.toLowerCase()) !== index);
  if (duplicateLabel) return `Guest field labels must be unique. “${duplicateLabel.label}” is used more than once.`;
  const emptyOptions = fields.find((field) => ["select", "checkboxes"].includes(field.type) && field.options.length === 0);
  if (emptyOptions) return `${emptyOptions.label} needs at least one option.`;
  return null;
}

export type IntercessionFormQuestion = {
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
  points: number;
  correctAnswer: string;
  correctAnswers: string[] | Record<string, string | string[]>;
  images: IntercessionQuestionImage[];
  condition: IntercessionQuestionCondition | null;
};

export type IntercessionFormSettings = {
  is_published: boolean;
  is_quiz: boolean;
  release_grade: string;
  allow_partial_points: boolean;
  allow_view_response: boolean;
  limit_one_response: boolean;
  require_login: boolean;
  show_progress_bar: boolean;
  shuffle_questions: boolean;
  show_question_numbers: boolean;
  default_required: boolean;
  notify_on_submit: boolean;
  notify_user_on_review: boolean;
  allow_export: boolean;
  include_timestamps: boolean;
  submission_opens_at: string;
  submission_deadline: string;
  max_responses: number;
  thank_you_message: string;
  redirect_url: string;
  visitor_fields: IntercessionVisitorField[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function positiveNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseIntercessionFormQuestions(value: unknown): IntercessionFormQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const item = record(entry);
    const correctAnswers = Array.isArray(item.correctAnswers)
      ? strings(item.correctAnswers)
      : Object.fromEntries(Object.entries(record(item.correctAnswers)).map(([key, answer]) => [key, Array.isArray(answer) ? strings(answer) : typeof answer === "string" ? answer : ""]));
    return {
      id: typeof item.id === "string" && item.id ? item.id : `question-${index + 1}`,
      type: typeof item.type === "string" ? item.type : "short_answer",
      label: typeof item.label === "string" ? item.label : typeof item.text === "string" ? item.text : "Question",
      description: typeof item.description === "string" ? item.description : "",
      required: item.required !== false,
      options: strings(item.options), rows: strings(item.rows), columns: strings(item.columns),
      min: Number.isFinite(Number(item.min)) ? Number(item.min) : 1,
      max: Number.isFinite(Number(item.max)) ? Number(item.max) : 5,
      points: positiveNumber(item.points, 1),
      correctAnswer: typeof item.correctAnswer === "string" ? item.correctAnswer : "",
      correctAnswers,
      images: parseQuestionImages(item.images),
      condition: parseIntercessionQuestionCondition(item.condition),
    };
  });
}

export function parseIntercessionFormSettings(value: unknown): IntercessionFormSettings {
  const item = record(value);
  const maxResponses = Number(item.max_responses ?? 0);
  return {
    is_published: Boolean(item.is_published), is_quiz: Boolean(item.is_quiz),
    release_grade: typeof item.release_grade === "string" ? item.release_grade : "never",
    allow_partial_points: item.allow_partial_points !== false,
    allow_view_response: item.allow_view_response !== false,
    limit_one_response: item.limit_one_response !== false,
    require_login: item.require_login !== false,
    show_progress_bar: Boolean(item.show_progress_bar), shuffle_questions: Boolean(item.shuffle_questions),
    show_question_numbers: item.show_question_numbers !== false, default_required: Boolean(item.default_required),
    notify_on_submit: Boolean(item.notify_on_submit), notify_user_on_review: Boolean(item.notify_user_on_review),
    allow_export: item.allow_export !== false, include_timestamps: item.include_timestamps !== false,
    submission_opens_at: typeof item.submission_opens_at === "string" ? item.submission_opens_at : "",
    submission_deadline: typeof item.submission_deadline === "string" ? item.submission_deadline : "",
    max_responses: Number.isInteger(maxResponses) && maxResponses > 0 ? maxResponses : 0,
    thank_you_message: typeof item.thank_you_message === "string" ? item.thank_you_message.slice(0, 1000) : "Thank you. Your response has been recorded.",
    redirect_url: safeFormRedirect(typeof item.redirect_url === "string" ? item.redirect_url : ""),
    visitor_fields: parseIntercessionVisitorFields(item.visitor_fields),
  };
}

export function safeFormRedirect(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//") ? trimmed.slice(0, 500) : "";
}

export function isIntercessionAnswerable(type: string) {
  return (INTERCESSION_ANSWERABLE_TYPES as readonly string[]).includes(type);
}

export function visibleIntercessionQuestions(questions: IntercessionFormQuestion[], answersByQuestionId: Record<string, IntercessionFormAnswer>) {
  const visibleAnswers: Record<string, IntercessionFormAnswer> = {};
  return questions.map((question, index) => ({ question, index })).filter(({ question }) => {
    const visible = intercessionConditionMatches(question.condition, visibleAnswers);
    if (visible && answersByQuestionId[question.id] !== undefined) visibleAnswers[question.id] = answersByQuestionId[question.id];
    return visible;
  });
}

export function intercessionLifecycleDate(value: string, endOfDay = false) {
  if (!value) return null;
  const normalized = value.length <= 10
    ? `${value}T${endOfDay ? "23:59:59.999" : "00:00:00"}+02:00`
    : /(?:Z|[+-]\d{2}:\d{2})$/.test(value)
      ? value
      : `${value}${value.length === 16 ? ":00" : ""}+02:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function intercessionFormAvailability(settings: IntercessionFormSettings, isActive: boolean, submissionCount: number, now = new Date()) {
  if (!isActive) return "This form is archived.";
  if (!settings.is_published) return "This form is not published.";
  if (settings.submission_opens_at) {
    const opens = intercessionLifecycleDate(settings.submission_opens_at);
    if (opens && now < opens) return `This form opens on ${opens.toLocaleString("en-RW", { timeZone: "Africa/Kigali" })}.`;
  }
  if (settings.submission_deadline) {
    const closes = intercessionLifecycleDate(settings.submission_deadline, true);
    if (closes && now > closes) return "The submission deadline has passed.";
  }
  if (settings.max_responses > 0 && submissionCount >= settings.max_responses) return "This form has reached its response limit.";
  return null;
}

function normalizedText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function answerValues(value: unknown) {
  const values = Array.isArray(value) ? value.map(normalizedText) : [normalizedText(value)];
  return [...new Set(values.filter(Boolean))].sort();
}

function selectionCredit(expected: string[], actual: string[], allowPartial: boolean) {
  if (!expected.length) return 0;
  const exact = expected.length === actual.length && expected.every((item, index) => item === actual[index]);
  if (exact) return 1;
  if (!allowPartial) return 0;
  const correctSelected = actual.filter((item) => expected.includes(item)).length;
  return Math.min(1, correctSelected / expected.length);
}

export function scoreIntercessionQuiz(questions: IntercessionFormQuestion[], answers: Record<string, IntercessionFormAnswer>, visibleIndexes: Set<number>, partial: boolean) {
  const grades: Array<{ questionIndex: number; correct: boolean; points: number; earnedPoints: number }> = [];
  let earned = 0;
  let total = 0;
  questions.forEach((question, index) => {
    if (!visibleIndexes.has(index) || !isIntercessionAnswerable(question.type) || question.type === "file_upload") return;
    total += question.points;
    const submitted = answers[`question_${index}`];
    let earnedPoints = 0;
    if (["multiple_choice_grid", "checkbox_grid"].includes(question.type)) {
      const submittedRows = record(submitted);
      const correctRows = record(question.correctAnswers);
      const expectedCells = question.rows.flatMap((_, rowIndex) =>
        answerValues(correctRows[`row_${rowIndex}`] ?? correctRows[String(rowIndex)] ?? correctRows[`question_${index}_${rowIndex}`])
          .map((value) => `${rowIndex}:${value}`),
      );
      const actualCells = question.rows.flatMap((_, rowIndex) =>
        answerValues(submittedRows[`row_${rowIndex}`] ?? submittedRows[`question_${index}_${rowIndex}`])
          .map((value) => `${rowIndex}:${value}`),
      );
      earnedPoints = question.points * selectionCredit(expectedCells, actualCells, partial);
    } else if (question.type === "checkboxes") {
      const expected = answerValues(question.correctAnswers);
      const actual = answerValues(submitted);
      earnedPoints = question.points * selectionCredit(expected, actual, partial);
    } else {
      earnedPoints = normalizedText(submitted) && normalizedText(submitted) === normalizedText(question.correctAnswer) ? question.points : 0;
    }
    earned += earnedPoints;
    grades.push({ questionIndex: index, correct: earnedPoints >= question.points, points: question.points, earnedPoints: Math.round(earnedPoints * 10_000) / 10_000 });
  });
  return { score: total > 0 ? Math.round((earned / total) * 1000) / 10 : null, grades, earnedPoints: Math.round(earned * 100) / 100, totalPoints: total };
}
