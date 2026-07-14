import { IntercessionClient } from "@/components/intercession-client";
import { getUserPermissionSet, permissionSetHas, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asQuestions(value: unknown) {
  return Array.isArray(value)
      ? value.map((question) => {
        const item = asObject(question);
        const label = typeof item.label === "string" ? item.label : typeof item.text === "string" ? item.text : "Question";
        return {
          type: typeof item.type === "string" ? item.type : "paragraph",
          label,
          required: Boolean(item.required),
          options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string") : [],
        };
      })
    : [];
}

export default async function IntercessionPage() {
  const user = await requireUser();
  const permissions = await getUserPermissionSet(user);
  const intercessionPermissions = {
    canSubmitForms: permissionSetHas(permissions, "intercession", "submit-forms"),
    canCreateForms: permissionSetHas(permissions, "intercession", "create-forms"),
    canManageForms: permissionSetHas(permissions, "intercession", "manage-forms"),
    canEditForms: permissionSetHas(permissions, "intercession", "edit-forms"),
    canPublishForms: permissionSetHas(permissions, "intercession", "publish-forms") || permissionSetHas(permissions, "intercession", "edit-forms"),
    canDeleteForms: permissionSetHas(permissions, "intercession", "delete-forms"),
    canViewSubmissions: permissionSetHas(permissions, "intercession", "view-submissions") || permissionSetHas(permissions, "intercession", "view-results"),
    canViewReports: permissionSetHas(permissions, "intercession", "view-reports"),
    canExportReports: permissionSetHas(permissions, "intercession", "export-reports"),
    canReadBible: permissionSetHas(permissions, "intercession", "read-bible"),
    canManageActionPlans: permissionSetHas(permissions, "intercession", "manage-action-plans"),
  };
  const canLoadReports = intercessionPermissions.canViewReports || intercessionPermissions.canViewSubmissions || intercessionPermissions.canExportReports;

  const [forms, mySubmissions, users, allSubmissions, actionPlans] = await Promise.all([
    prisma.spiritualForm.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { name: true, email: true } },
        submissions: { select: { id: true } },
      },
    }),
    prisma.formSubmission.findMany({
      where: { userId: user.id },
      orderBy: { submittedAt: "desc" },
      include: {
        form: true,
      },
    }),
    canLoadReports
      ? prisma.user.findMany({
          where: { status: "active" },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    canLoadReports
      ? prisma.formSubmission.findMany({
          select: {
            id: true,
            formId: true,
            userId: true,
            score: true,
            submittedAt: true,
          },
        })
      : Promise.resolve([]),
    intercessionPermissions.canManageActionPlans
      ? prisma.actionPlan.findMany({
          where: { department: "intercession" },
          orderBy: [{ year: "desc" }, { createdAt: "desc" }],
          include: {
            creator: { select: { name: true } },
            tasks: { orderBy: [{ deadline: "asc" }, { createdAt: "asc" }] },
          },
        })
      : Promise.resolve([]),
  ]);

  const serializedForms = forms.map((form) => {
    const settings = asObject(form.settings);
    const questions = asQuestions(form.questions);

    return {
      id: form.id,
      title: form.title,
      description: form.description,
      questions,
      questionCount: questions.length,
      isPublished: Boolean(settings.is_published),
      limitOneResponse: settings.limit_one_response !== false,
      isActive: form.isActive,
      createdAt: formatDate(form.createdAt),
      createdBy: form.creator?.name ?? "Unknown",
      submissionsCount: form.submissions.length,
      hasSubmitted: mySubmissions.some((submission) => submission.formId === form.id),
    };
  });

  return (
    <IntercessionClient
      permissions={intercessionPermissions}
      forms={serializedForms}
      mySubmissions={mySubmissions.map((submission) => {
        const questions = asQuestions(submission.form.questions);
        return {
          id: submission.id,
          formId: submission.formId,
          formTitle: submission.form.title,
          formDescription: submission.form.description,
          questionCount: questions.length,
          submittedAt: formatDate(submission.submittedAt),
          score: submission.score,
        };
      })}
      reportRows={users.map((reportUser) => {
        const totalForms = serializedForms.filter((form) => form.isPublished && form.isActive).length;
        const submitted = allSubmissions.filter((submission) => submission.userId === reportUser.id);
        const submittedPublishedCount = new Set(
          submitted
            .filter((submission) => serializedForms.some((form) => form.id === submission.formId && form.isPublished && form.isActive))
            .map((submission) => submission.formId),
        ).size;
        const participation = totalForms ? Math.round((submittedPublishedCount / totalForms) * 1000) / 10 : 0;
        const scores = submitted.map((submission) => submission.score).filter((score): score is number => typeof score === "number");
        const averageScore = scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : null;
        const latestSubmittedAt = submitted
          .map((submission) => submission.submittedAt)
          .sort((a, b) => b.getTime() - a.getTime())[0];

        return {
          id: reportUser.id,
          name: reportUser.name,
          email: reportUser.email,
          submissions: submitted.map((submission) => ({
            formId: submission.formId,
            score: submission.score,
            submittedAt: submission.submittedAt.toISOString().slice(0, 10),
          })),
          submitted: submittedPublishedCount,
          totalForms,
          participation,
          averageScore,
          latestSubmittedAt: latestSubmittedAt ? latestSubmittedAt.toISOString().slice(0, 10) : null,
          status: totalForms === 0 || submittedPublishedCount === 0 ? "Not Started" : submittedPublishedCount === totalForms ? "Complete" : "Partial",
        };
      })}
      actionPlans={actionPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        startDate: formatDate(plan.startDate),
        startDateRaw: formatDateValue(plan.startDate),
        dueDate: formatDate(plan.dueDate),
        dueDateRaw: formatDateValue(plan.dueDate),
        status: plan.status,
        progress: plan.progress,
        year: plan.year,
        createdByName: plan.creator?.name ?? "System",
        createdAt: formatDate(plan.createdAt),
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          actionPlanId: task.actionPlanId,
          taskName: task.taskName,
          activity: task.activity,
          targetMilestone: task.targetMilestone,
          estimatedBudget: Number(task.estimatedBudget ?? 0),
          startDate: task.startDate ? formatDate(task.startDate) : "",
          startDateRaw: formatDateValue(task.startDate),
          deadline: task.deadline ? formatDate(task.deadline) : "",
          deadlineRaw: formatDateValue(task.deadline),
          progress: task.progress,
          status: task.status,
          priority: task.priority,
        })),
      }))}
    />
  );
}
