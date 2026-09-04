import { intercessionRichTextToPlainText } from "@/lib/intercession-rich-text";

export type IntercessionConditionOperator = "equals" | "not_equals" | "answered";

export type IntercessionQuestionCondition = {
  questionId: string;
  operator: IntercessionConditionOperator;
  value: string;
  rowIndex?: number;
};

export type IntercessionConditionAnswer = string | string[] | Record<string, string | string[]>;

export type IntercessionPublishingIssue = {
  id: string;
  message: string;
  questionId?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asStrings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

export function parseIntercessionQuestionCondition(value: unknown): IntercessionQuestionCondition | null {
  const condition = asRecord(value);
  const questionId = typeof condition.questionId === "string" ? condition.questionId.slice(0, 100) : "";
  const operator = condition.operator;
  const conditionValue = typeof condition.value === "string" ? condition.value.slice(0, 500) : "";
  const parsedRowIndex = Number(condition.rowIndex);
  if (!questionId || !["equals", "not_equals", "answered"].includes(String(operator))) return null;
  return {
    questionId,
    operator: operator as IntercessionConditionOperator,
    value: conditionValue,
    ...(Number.isInteger(parsedRowIndex) && parsedRowIndex >= 0 ? { rowIndex: parsedRowIndex } : {}),
  };
}

export function intercessionConditionMatches(
  condition: IntercessionQuestionCondition | null | undefined,
  answers: Record<string, IntercessionConditionAnswer>,
) {
  if (!condition) return true;
  const sourceAnswer = answers[condition.questionId];
  const answer = sourceAnswer && typeof sourceAnswer === "object" && !Array.isArray(sourceAnswer)
    ? sourceAnswer[`row_${condition.rowIndex ?? 0}`]
    : sourceAnswer;
  const values = Array.isArray(answer) ? answer : typeof answer === "string" ? [answer] : [];
  const hasAnswer = values.some((value) => value.trim().length > 0);
  if (condition.operator === "answered") return hasAnswer;
  const matches = values.includes(condition.value);
  return condition.operator === "equals" ? matches : !matches;
}

export function getIntercessionPublishingIssues(
  title: unknown,
  questionsValue: unknown,
  settingsValue?: unknown,
): IntercessionPublishingIssue[] {
  const questions = Array.isArray(questionsValue) ? questionsValue.map(asRecord) : [];
  const settings = asRecord(settingsValue);
  const issues: IntercessionPublishingIssue[] = [];

  if (!intercessionRichTextToPlainText(typeof title === "string" ? title : "").trim()) {
    issues.push({ id: "form-title", message: "Add a form title." });
  }

  const answerable = questions.filter((question) => !["title_section", "section_break"].includes(String(question.type)));
  if (answerable.length === 0 && !settings.allow_empty_submission) {
    issues.push({ id: "no-questions", message: "Add at least one answerable question." });
  }

  questions.forEach((question, index) => {
    const id = typeof question.id === "string" && question.id ? question.id : `question-${index + 1}`;
    const type = typeof question.type === "string" ? question.type : "short_answer";
    const label = intercessionRichTextToPlainText(typeof question.label === "string" ? question.label : "").trim();
    const prefix = `Question ${index + 1}`;

    if (!label || label.toLowerCase() === "untitled question") {
      issues.push({ id: `${id}-title`, questionId: id, message: `${prefix} needs a clear title.` });
    }

    if (["multiple_choice", "checkboxes", "dropdown"].includes(type) && asStrings(question.options).length < 2) {
      issues.push({ id: `${id}-options`, questionId: id, message: `${prefix} needs at least two answer options.` });
    }

    if (["multiple_choice_grid", "checkbox_grid"].includes(type)) {
      if (asStrings(question.rows).length === 0) issues.push({ id: `${id}-rows`, questionId: id, message: `${prefix} needs at least one grid row.` });
      if (asStrings(question.columns).length < 2) issues.push({ id: `${id}-columns`, questionId: id, message: `${prefix} needs at least two grid columns.` });
    }

    const images = Array.isArray(question.images) ? question.images.map(asRecord) : [];
    images.forEach((image, imageIndex) => {
      if (typeof image.alt !== "string" || !image.alt.trim()) {
        issues.push({
          id: `${id}-image-${imageIndex + 1}-description`,
          questionId: id,
          message: `${prefix}, image ${imageIndex + 1} needs an accessibility description.`,
        });
      }
    });

    const condition = parseIntercessionQuestionCondition(question.condition);
    if (question.condition && !condition) {
      issues.push({ id: `${id}-condition`, questionId: id, message: `${prefix} has an incomplete display condition.` });
    } else if (condition) {
      const sourceIndex = questions.findIndex((candidate) => candidate.id === condition.questionId);
      if (sourceIndex < 0 || sourceIndex >= index) {
        issues.push({ id: `${id}-condition-source`, questionId: id, message: `${prefix} must depend on an earlier question.` });
      }
      if (condition.operator !== "answered" && !condition.value.trim()) {
        issues.push({ id: `${id}-condition-value`, questionId: id, message: `${prefix} needs a value for its display condition.` });
      }
      const sourceQuestion = sourceIndex >= 0 ? questions[sourceIndex] : null;
      if (sourceQuestion && ["multiple_choice_grid", "checkbox_grid"].includes(String(sourceQuestion.type))) {
        const rows = asStrings(sourceQuestion.rows);
        if (!Number.isInteger(condition.rowIndex) || Number(condition.rowIndex) < 0 || Number(condition.rowIndex) >= rows.length) {
          issues.push({ id: `${id}-condition-row`, questionId: id, message: `${prefix} needs a valid source grid row.` });
        }
      }
    }

    if (settings.is_quiz && !["title_section", "section_break", "file_upload"].includes(type)) {
      const points = Number(question.points);
      if (!Number.isFinite(points) || points <= 0) {
        issues.push({ id: `${id}-points`, questionId: id, message: `${prefix} needs a point value greater than zero.` });
      }
      const hasSingleAnswer = typeof question.correctAnswer === "string" && Boolean(question.correctAnswer.trim());
      const correctAnswers = question.correctAnswers;
      const hasManyAnswers = Array.isArray(correctAnswers)
        ? asStrings(correctAnswers).length > 0
        : Object.values(asRecord(correctAnswers)).some((answer) => Array.isArray(answer) ? asStrings(answer).length > 0 : typeof answer === "string" && Boolean(answer.trim()));
      if (!hasSingleAnswer && !hasManyAnswers) {
        issues.push({ id: `${id}-correct-answer`, questionId: id, message: `${prefix} needs a correct answer for the quiz.` });
      }
      if (["multiple_choice", "dropdown"].includes(type) && hasSingleAnswer && !asStrings(question.options).includes(String(question.correctAnswer))) {
        issues.push({ id: `${id}-correct-option`, questionId: id, message: `${prefix} has a correct answer that is not one of its options.` });
      }
      if (type === "checkboxes") {
        const options = asStrings(question.options);
        const expected = asStrings(question.correctAnswers);
        if (expected.some((answer) => !options.includes(answer))) issues.push({ id: `${id}-correct-options`, questionId: id, message: `${prefix} has a correct answer that is not one of its options.` });
      }
      if (["multiple_choice_grid", "checkbox_grid"].includes(type)) {
        const rows = asStrings(question.rows);
        const columns = asStrings(question.columns);
        const gridAnswers = asRecord(question.correctAnswers);
        rows.forEach((_row, rowIndex) => {
          const rowAnswer = gridAnswers[String(rowIndex)] ?? gridAnswers[`row_${rowIndex}`] ?? gridAnswers[`question_${index}_${rowIndex}`];
          const expected = Array.isArray(rowAnswer) ? asStrings(rowAnswer) : typeof rowAnswer === "string" && rowAnswer.trim() ? [rowAnswer] : [];
          if (expected.length === 0) issues.push({ id: `${id}-correct-row-${rowIndex}`, questionId: id, message: `${prefix}, row ${rowIndex + 1} needs a correct answer.` });
          else if (expected.some((answer) => !columns.includes(answer))) issues.push({ id: `${id}-correct-row-option-${rowIndex}`, questionId: id, message: `${prefix}, row ${rowIndex + 1} has a correct answer outside its columns.` });
        });
      }
      if (["linear_scale", "rating"].includes(type) && hasSingleAnswer) {
        const answer = Number(question.correctAnswer);
        const min = type === "rating" ? 1 : Number(question.min ?? 1);
        const max = Number(question.max ?? 5);
        if (!Number.isFinite(answer) || answer < min || answer > max) issues.push({ id: `${id}-correct-range`, questionId: id, message: `${prefix} has a correct answer outside its allowed range.` });
      }
    }
  });

  return issues;
}
