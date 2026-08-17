export type IntercessionResponseValue = string | string[] | Record<string, string | string[]> | null;

export type IntercessionAnalyticsQuestion = {
  questionId: string;
  questionIndex: number;
  label: string;
  type: string;
  options: string[];
  rows: string[];
  columns: string[];
  min: number;
  max: number;
};

export type IntercessionAnalyticsSubmission = {
  answers: Array<{
    questionId: string;
    questionIndex: number;
    value: IntercessionResponseValue;
  }>;
};

export type IntercessionResponseSeriesItem = {
  label: string;
  count: number;
  percentage: number;
};

export type IntercessionGridResponseSummary = {
  label: string;
  responseCount: number;
  series: IntercessionResponseSeriesItem[];
};

export type IntercessionQuestionResponseSummary = IntercessionAnalyticsQuestion & {
  kind: "pie" | "bar" | "grid" | "text";
  responseCount: number;
  totalSubmissions: number;
  series: IntercessionResponseSeriesItem[];
  gridRows: IntercessionGridResponseSummary[];
  textResponses: string[];
  average: number | null;
};

export function normalizeIntercessionResponseValue(value: unknown): IntercessionResponseValue {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      Array.isArray(item)
        ? item.map((entry) => String(entry).trim()).filter(Boolean)
        : item === null || item === undefined ? "" : String(item).trim(),
    ]));
  }
  return String(value).trim();
}

export function buildIntercessionResponseSummaries(
  questions: IntercessionAnalyticsQuestion[],
  submissions: IntercessionAnalyticsSubmission[],
): IntercessionQuestionResponseSummary[] {
  return questions.map((question) => summarizeQuestion(question, submissions));
}

function summarizeQuestion(
  question: IntercessionAnalyticsQuestion,
  submissions: IntercessionAnalyticsSubmission[],
): IntercessionQuestionResponseSummary {
  const values = submissions
    .map((submission) => submission.answers.find((answer) => answer.questionId === question.questionId)?.value ?? null)
    .filter(isAnswered);
  const responseCount = values.length;
  const base = {
    ...question,
    responseCount,
    totalSubmissions: submissions.length,
    series: [] as IntercessionResponseSeriesItem[],
    gridRows: [] as IntercessionGridResponseSummary[],
    textResponses: [] as string[],
    average: null as number | null,
  };

  if (["multiple_choice", "dropdown"].includes(question.type)) {
    return {
      ...base,
      kind: "pie",
      series: countedSeries(question.options, values.flatMap(answerSelections), responseCount),
    };
  }

  if (question.type === "checkboxes") {
    return {
      ...base,
      kind: "bar",
      series: countedSeries(question.options, values.flatMap(answerSelections), responseCount),
    };
  }

  if (["linear_scale", "rating"].includes(question.type)) {
    const min = question.type === "rating" ? 1 : question.min;
    const numericValues = values.flatMap(answerSelections).map(Number).filter(Number.isFinite);
    const labels = Array.from({ length: Math.max(1, question.max - min + 1) }, (_, index) => String(min + index));
    return {
      ...base,
      kind: "bar",
      series: countedSeries(labels, numericValues.map(String), responseCount),
      average: numericValues.length
        ? Math.round((numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length) * 10) / 10
        : null,
    };
  }

  if (["multiple_choice_grid", "checkbox_grid"].includes(question.type)) {
    const objects = values.filter((value): value is Record<string, string | string[]> => Boolean(value) && typeof value === "object" && !Array.isArray(value));
    return {
      ...base,
      kind: "grid",
      gridRows: question.rows.map((row, rowIndex) => {
        const rowValues = objects.map((value) => value[`row_${rowIndex}`]).filter(isAnswered);
        const rowResponseCount = rowValues.length;
        return {
          label: row || `Row ${rowIndex + 1}`,
          responseCount: rowResponseCount,
          series: countedSeries(question.columns, rowValues.flatMap(answerSelections), rowResponseCount),
        };
      }),
    };
  }

  return {
    ...base,
    kind: "text",
    textResponses: values.map(formatResponseValue),
  };
}

function countedSeries(seedLabels: string[], selections: string[], denominator: number): IntercessionResponseSeriesItem[] {
  const labels = [...new Set(seedLabels.map((label) => label.trim()).filter(Boolean))];
  for (const selection of selections) {
    if (selection && !labels.includes(selection)) labels.push(selection);
  }
  return labels.map((label) => {
    const count = selections.filter((selection) => selection === label).length;
    return {
      label,
      count,
      percentage: denominator ? Math.round((count / denominator) * 1000) / 10 : 0,
    };
  });
}

function answerSelections(value: IntercessionResponseValue | string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function isAnswered(value: IntercessionResponseValue | string | string[] | undefined): boolean {
  if (Array.isArray(value)) return value.some((item) => item.trim());
  if (typeof value === "string") return Boolean(value.trim());
  if (value && typeof value === "object") return Object.values(value).some(isAnswered);
  return false;
}

function formatResponseValue(value: IntercessionResponseValue) {
  if (Array.isArray(value)) return value.join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([, item]) => isAnswered(item))
      .map(([key, item]) => `${key.replace(/^row_/, "Row ")}: ${Array.isArray(item) ? item.join(", ") : item}`)
      .join("; ");
  }
  return value ?? "";
}
