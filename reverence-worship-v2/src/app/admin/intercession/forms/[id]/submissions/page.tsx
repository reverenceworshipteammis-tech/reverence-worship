import { notFound } from "next/navigation";
import { IntercessionSubmissionsClient } from "@/components/intercession-submissions-client";
import { requireUser } from "@/lib/auth";
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

export default async function IntercessionFormSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
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

  return (
    <IntercessionSubmissionsClient
      form={{
        id: form.id,
        title: form.title,
        description: form.description,
      }}
      submissions={form.submissions.map((submission) => ({
        id: submission.id,
        memberName: submission.user?.name ?? "Unknown",
        memberEmail: submission.user?.email ?? "",
        submittedAt: formatDateTime(submission.submittedAt),
        score: submission.score,
        answersCount: answerCount(submission.answers),
      }))}
    />
  );
}
