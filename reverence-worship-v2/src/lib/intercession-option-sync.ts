import type { Prisma } from "@/generated/prisma/client";
import { parseIntercessionFormQuestions, type IntercessionFormQuestion } from "@/lib/intercession-form-domain";

const OPTION_QUESTION_TYPES = new Set(["multiple_choice", "membership_type", "dropdown", "checkboxes"]);

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function membershipKind(label: string) {
  const text = label.toLowerCase();
  if (/temporary|non[\s-]*permanent/.test(text)) return "temporary";
  if (/partner|visitor/.test(text)) return "partner";
  if (/permanent/.test(text)) return "permanent";
  return null;
}

function answerLabels(answer: unknown) {
  return (Array.isArray(answer) ? answer : [answer]).filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean);
}

/**
 * Options carry no ids, so a renamed option is recognised in safe cases only:
 * the replacement is the single current option for the same membership type, or
 * the option count is unchanged and the label at the same position is brand new.
 * Labels found only in stored answers are matched by membership type as well.
 */
function renamedOptions(previous: IntercessionFormQuestion, current: IntercessionFormQuestion, storedLabels: string[]) {
  const renames = new Map<string, string>();
  const orphans = [...new Set([...previous.options, ...storedLabels])].filter((label) => !current.options.includes(label));
  for (const label of orphans) {
    const index = previous.options.indexOf(label);
    const type = (index >= 0 ? previous.membershipTypeMapping?.[index] : null) || membershipKind(label);
    if (type) {
      const matches = current.options.filter((option, currentIndex) => (current.membershipTypeMapping?.[currentIndex] || membershipKind(option)) === type);
      if (matches.length === 1) {
        renames.set(label, matches[0]);
        continue;
      }
    }
    const sameSlot = index >= 0 && current.options.length === previous.options.length ? current.options[index] : undefined;
    if (sameSlot && !previous.options.includes(sameSlot)) renames.set(label, sameSlot);
  }
  return renames;
}

function renameAnswer(answer: unknown, renames: Map<string, string>): unknown {
  if (typeof answer === "string") return renames.get(answer.trim()) ?? answer;
  if (Array.isArray(answer)) return [...new Set(answer.map((entry) => typeof entry === "string" ? renames.get(entry.trim()) ?? entry : entry))];
  return answer;
}

/**
 * Brings a stored submission in line with the current form when answer options
 * were renamed. Returns null when nothing needs to change.
 */
export function syncSubmissionOptions(snapshotValue: unknown, answersValue: unknown, currentQuestionsValue: unknown) {
  if (!Array.isArray(snapshotValue)) return null;
  const previousQuestions = parseIntercessionFormQuestions(snapshotValue);
  const currentQuestions = parseIntercessionFormQuestions(currentQuestionsValue);
  const currentById = new Map(currentQuestions.map((question) => [question.id, question]));
  const snapshot = structuredClone(snapshotValue) as unknown[];
  const answers = structuredClone(record(answersValue));
  const byQuestionId = record(answers.__byQuestionId);
  let changed = false;

  previousQuestions.forEach((previous, index) => {
    const sameSlot = currentQuestions[index];
    const current = currentById.get(previous.id) ?? (sameSlot?.label === previous.label ? sameSlot : undefined);
    if (!current || !OPTION_QUESTION_TYPES.has(previous.type) || !OPTION_QUESTION_TYPES.has(current.type)) return;
    const key = `question_${index}`;
    const storedLabels = [...answerLabels(answers[key]), ...answerLabels(byQuestionId[previous.id])];
    const renames = renamedOptions(previous, current, storedLabels);
    if (!renames.size) return;
    changed = true;

    const rawQuestion = record(snapshot[index]);
    const options: string[] = [];
    const mapping: unknown[] = [];
    const rawMapping = Array.isArray(rawQuestion.membershipTypeMapping) ? rawQuestion.membershipTypeMapping : null;
    previous.options.forEach((label, optionIndex) => {
      const next = renames.get(label) ?? label;
      if (options.includes(next)) return;
      options.push(next);
      if (rawMapping) mapping.push(rawMapping[optionIndex]);
    });
    snapshot[index] = { ...rawQuestion, options, ...(rawMapping ? { membershipTypeMapping: mapping } : {}) };

    if (answers[key] !== undefined) answers[key] = renameAnswer(answers[key], renames);
    if (byQuestionId[previous.id] !== undefined) byQuestionId[previous.id] = renameAnswer(byQuestionId[previous.id], renames);
  });

  if (!changed) return null;
  if (answers.__byQuestionId !== undefined) answers.__byQuestionId = byQuestionId;
  return { snapshot, answers };
}

type SubmissionStore = {
  formSubmission: {
    findMany(args: { where: { formId: number }; select: { id: true; answers: true; questionSnapshot: true } }): Promise<Array<{ id: number; answers: Prisma.JsonValue; questionSnapshot: Prisma.JsonValue | null }>>;
    update(args: { where: { id: number }; data: { answers: Prisma.InputJsonValue; questionSnapshot: Prisma.InputJsonValue } }): Promise<unknown>;
  };
};

/** Applies renamed answer options of a form to every submission already stored. */
export async function syncFormSubmissionOptions(store: SubmissionStore, formId: number, currentQuestions: unknown) {
  const submissions = await store.formSubmission.findMany({ where: { formId }, select: { id: true, answers: true, questionSnapshot: true } });
  for (const submission of submissions) {
    const synced = syncSubmissionOptions(submission.questionSnapshot, submission.answers, currentQuestions);
    if (synced) await store.formSubmission.update({ where: { id: submission.id }, data: { answers: synced.answers as Prisma.InputJsonValue, questionSnapshot: synced.snapshot as Prisma.InputJsonValue } });
  }
}
