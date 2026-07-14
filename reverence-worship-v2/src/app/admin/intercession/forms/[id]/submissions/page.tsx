import { notFound } from "next/navigation";
import { IntercessionSubmissionsClient } from "@/components/intercession-submissions-client";
import { getUserPermissionSet, permissionSetHas, requireAnyPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function answerCount(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).length : 0;
}

function parseObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseQuestions(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function formTotalPoints(questions: Array<Record<string, unknown>>) {
  const total = questions.reduce((sum, question) => {
    const type = String(question.type ?? "");
    if (type === "title_section" || type === "section_break") return sum;
    const points = Number(question.points ?? 1);
    return sum + (Number.isFinite(points) && points > 0 ? points : 1);
  }, 0);

  return total > 0 ? total : 1;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function answerText(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => {
        const row = key.replace(/^question_\d+_/, "Row ");
        return `${row}: ${answerText(item)}`;
      })
      .join("; ");
  }
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function manualGradeFor(value: unknown, questionIndex: number) {
  if (!Array.isArray(value)) return null;
  const grade = value.find((item) => {
    if (!item || typeof item !== "object") return false;
    return Number((item as Record<string, unknown>).questionIndex) === questionIndex;
  });
  if (!grade || typeof grade !== "object") return null;
  return Boolean((grade as Record<string, unknown>).correct);
}

export default async function IntercessionFormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAnyPermission("intercession", ["view-submissions", "view-results"], "/admin/intercession");
  const permissions = await getUserPermissionSet(user);
  const { id } = await params;
  const formId = Number(id);

  if (!Number.isFinite(formId)) {
    notFound();
  }

  const form = await prisma.spiritualForm.findUnique({
    where: { id: formId },
    include: {
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!form) {
    notFound();
  }

  const settings = parseObject(form.settings);
  const questions = parseQuestions(form.questions);
  const totalPoints = formTotalPoints(questions);
  const releaseGrade = String(settings.release_grade ?? "immediately");
  const isQuiz = Boolean(settings.is_quiz);
  const reviewQuestions = questions
    .map((question, index) => ({
      index,
      label: String(question.label ?? question.title ?? `Question ${index + 1}`),
      type: String(question.type ?? "short_answer"),
      points: Number(question.points ?? 1),
    }))
    .filter((question) => question.type !== "title_section" && question.type !== "section_break");

  return (
    <IntercessionSubmissionsClient
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
        isQuiz,
        releaseGrade,
        canDeleteSubmissions: permissionSetHas(permissions, "intercession", "delete-forms"),
      }}
      submissions={form.submissions.map((submission) => ({
        id: submission.id,
        memberName: submission.user?.name ?? "Unknown",
        memberEmail: submission.user?.email ?? "",
        submittedAt: formatDateTime(submission.submittedAt),
        submittedDate: formatDate(submission.submittedAt),
        submittedTime: formatTime(submission.submittedAt),
        score: submission.score,
        earnedPoints: submission.score === null ? null : Math.round(((submission.score / 100) * totalPoints) * 100) / 100,
        totalPoints,
        isReleased: submission.isReleased,
        releasedAt: submission.releasedAt ? formatDateTime(submission.releasedAt) : null,
        answersCount: answerCount(submission.answers),
        answers: reviewQuestions.map((question) => {
          const answers = parseObject(submission.answers);
          return {
            questionIndex: question.index,
            question: question.label,
            type: question.type,
            points: Number.isFinite(question.points) && question.points > 0 ? question.points : 1,
            answer: answerText(answers[`question_${question.index}`]),
            correct: manualGradeFor(submission.manualGrades, question.index),
          };
        }),
      }))}
    />
  );
}
