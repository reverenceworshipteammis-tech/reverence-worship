import { MEMBERSHIP_TYPES, type MembershipType } from "@/lib/membership-types";

// Entries follow answer options by position, so translated/edited labels do not
// decide which account value is written. Empty entries are unfinished mappings.
export type MembershipTypeMapping = Array<MembershipType | "">;

export function parseMembershipTypeMapping(value: unknown): MembershipTypeMapping | null {
  if (value == null) return null;
  if (!Array.isArray(value)) return [];
  return value.map((entry) => MEMBERSHIP_TYPES.includes(entry as MembershipType) ? entry as MembershipType : "");
}

function questionsWithMappings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const question = entry as Record<string, unknown>;
    return question.type === "membership_type" || question.membershipTypeMapping != null ? [{ question, index }] : [];
  });
}

export function hasMembershipQuestion(questions: unknown) {
  return questionsWithMappings(questions).length > 0;
}

export function membershipQuestionConfigurationIssue(questions: unknown, hasCommitment: boolean) {
  const linked = questionsWithMappings(questions);
  if (!linked.length) return null;
  const { question } = linked[0];
  const questionId = typeof question.id === "string" ? question.id : undefined;
  const issue = (message: string) => ({ questionId, message });
  if (!hasCommitment) return issue("Membership type mapping is available on annual commitment forms.");
  if (linked.length > 1) return issue("Only one question can update membership type in a form.");
  if (question.type !== "membership_type" && question.type !== "multiple_choice") return issue("The membership type question must use a single-choice answer.");
  if (question.condition) return issue("The membership type question must be shown to every member.");
  const options = Array.isArray(question.options) ? question.options : [];
  if (options.length < 2 || options.some((option) => typeof option !== "string" || !option.trim())) return issue("Add at least two non-empty answer options to the membership type question.");
  const labels = (options as string[]).map((option) => option.trim());
  if (new Set(labels).size !== labels.length) return issue("Use unique answer options for the membership type question.");
  const mapping = parseMembershipTypeMapping(question.membershipTypeMapping);
  if (!mapping || mapping.length !== options.length || mapping.some((entry) => !entry)) return issue("Map every membership answer to Permanent, Temporary, or Partner.");
  return null;
}

export function resolveMembershipQuestion(questions: unknown, answers: Record<string, unknown>) {
  const issue = membershipQuestionConfigurationIssue(questions, true);
  if (issue) throw new Error(issue.message);
  const linked = questionsWithMappings(questions)[0];
  if (!linked) return null;
  const answer = answers[`question_${linked.index}`];
  if (answer == null || (typeof answer === "string" && !answer.trim())) {
    if (linked.question.required === false) return null;
    throw new Error("Select a valid answer to the membership type question.");
  }
  const options = (linked.question.options as string[]).map((option) => option.trim());
  const optionIndex = typeof answer === "string" ? options.indexOf(answer) : -1;
  if (optionIndex < 0) throw new Error("Select a valid answer to the membership type question.");
  return {
    questionId: typeof linked.question.id === "string" ? linked.question.id : `question-${linked.index + 1}`,
    membershipType: parseMembershipTypeMapping(linked.question.membershipTypeMapping)![optionIndex] as MembershipType,
  };
}
