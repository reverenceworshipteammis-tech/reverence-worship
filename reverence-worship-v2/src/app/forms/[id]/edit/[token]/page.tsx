import { createHash } from "crypto";
import { notFound } from "next/navigation";
import { IntercessionTakeForm } from "@/components/intercession-take-form";
import { getCurrentUser } from "@/lib/auth";
import { parseIntercessionFormSettings, parseIntercessionVisitorDetails } from "@/lib/intercession-form-domain";
import { intercessionAnswerForQuestion, intercessionSubmissionQuestions } from "@/lib/intercession-response-data";
import { prisma } from "@/lib/prisma";

export default async function EditFormResponsePage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params;
  const formId = Number(id);
  if (!Number.isInteger(formId) || formId <= 0 || token.length < 32 || token.length > 200) notFound();
  const submission = await prisma.formSubmission.findUnique({
    where: { editTokenHash: createHash("sha256").update(token).digest("hex") },
    include: { form: true },
  });
  if (!submission || submission.formId !== formId || submission.deletedAt || !submission.editUntil || submission.editUntil < new Date()) notFound();
  const settings = parseIntercessionFormSettings(submission.form.settings);
  if (!settings.allow_response_editing || !submission.form.isActive) notFound();
  const user = await getCurrentUser();
  if (submission.userId && user?.id !== submission.userId) notFound();
  const questions = intercessionSubmissionQuestions(submission.questionSnapshot, submission.form.questions);
  const initialValues: Record<string, string | string[]> = {};
  questions.forEach((question, index) => {
    const value = intercessionAnswerForQuestion(submission.answers, questions, question.id);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.entries(value).forEach(([row, rowValue]) => {
        const rowIndex = Number(row.replace(/^row_/, ""));
        initialValues[`question_${index}_${rowIndex}`] = rowValue;
      });
    } else if (value !== null) initialValues[`question_${index}`] = value;
  });
  parseIntercessionVisitorDetails(submission.respondentDetails).forEach((detail) => { initialValues[`visitor_${detail.fieldId}`] = detail.value; });

  return (
    <main className="min-h-screen bg-slate-50">
      <IntercessionTakeForm
        form={{ id: submission.form.id, title: submission.form.title, description: submission.form.description }}
        questions={questions}
        settings={settings}
        alreadySubmitted={false}
        requireRespondentName={!submission.userId}
        editToken={token}
        initialValues={initialValues}
        backHref={submission.userId ? "/admin/intercession?section=results" : "/"}
      />
    </main>
  );
}
