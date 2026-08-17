import { isIntercessionAnswerable, parseIntercessionFormQuestions, type IntercessionFormAnswer, type IntercessionFormQuestion } from "@/lib/intercession-form-domain";

export type IntercessionResponseQuestion = IntercessionFormQuestion & {
  questionIndex: number;
};

export function intercessionResponseQuestionCatalog(currentQuestions: unknown, snapshots: unknown[]): IntercessionResponseQuestion[] {
  const sources = [currentQuestions, ...snapshots];
  const seen = new Set<string>();
  const catalog: IntercessionResponseQuestion[] = [];

  for (const source of sources) {
    parseIntercessionFormQuestions(source).forEach((question, questionIndex) => {
      if (!isIntercessionAnswerable(question.type) || seen.has(question.id)) return;
      seen.add(question.id);
      catalog.push({ ...question, questionIndex });
    });
  }
  return catalog;
}

export function intercessionSubmissionQuestions(snapshot: unknown, fallback: unknown) {
  const parsed = parseIntercessionFormQuestions(snapshot);
  return parsed.length ? parsed : parseIntercessionFormQuestions(fallback);
}

export function intercessionAnswerForQuestion(
  answersValue: unknown,
  questions: IntercessionFormQuestion[],
  questionId: string,
): IntercessionFormAnswer | null {
  const answers = record(answersValue);
  const byQuestionId = record(answers.__byQuestionId);
  if (byQuestionId[questionId] !== undefined) return normalizeAnswer(byQuestionId[questionId]);
  const index = questions.findIndex((question) => question.id === questionId);
  if (index < 0) return null;
  return normalizeAnswer(answers[`question_${index}`]);
}

export function intercessionAnswerText(value: IntercessionFormAnswer | null): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key.replace(/^row_/, "Row ")}: ${Array.isArray(item) ? item.join(", ") : item}`)
      .join("; ");
  }
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function normalizeAnswer(value: unknown): IntercessionFormAnswer | null {
  if (Array.isArray(value)) return value.map(String);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, Array.isArray(item) ? item.map(String) : String(item ?? "")]));
  }
  if (value === null || value === undefined) return null;
  return String(value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
