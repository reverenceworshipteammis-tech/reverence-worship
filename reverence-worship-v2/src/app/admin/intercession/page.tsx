import { IntercessionClient } from "@/components/intercession-client";
import { getUserPermissionSet, permissionSetHas, requireUser } from "@/lib/auth";
import { memberCanViewScore, memberResultLabel, memberResultState } from "@/lib/intercession-result-rules";
import { prisma } from "@/lib/prisma";
import { excludeSuperAdminUserWhere } from "@/lib/system-account-rules";
import { parseQuestionImages } from "@/lib/intercession-question-images";
import { parseIntercessionQuestionCondition } from "@/lib/intercession-form-rules";
import { intercessionFormAvailability, parseIntercessionFormSettings } from "@/lib/intercession-form-domain";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "Africa/Kigali",
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
      ? value.map((question, index) => {
        const item = asObject(question);
        const label = typeof item.label === "string" ? item.label : typeof item.text === "string" ? item.text : "Question";
        return {
          id: typeof item.id === "string" && item.id ? item.id : `question-${index + 1}`,
          type: typeof item.type === "string" ? item.type : "paragraph",
          label,
          description: typeof item.description === "string" ? item.description : "",
          required: Boolean(item.required),
          options: Array.isArray(item.options) ? item.options.filter((option): option is string => typeof option === "string") : [],
          rows: Array.isArray(item.rows) ? item.rows.filter((row): row is string => typeof row === "string") : [],
          columns: Array.isArray(item.columns) ? item.columns.filter((column): column is string => typeof column === "string") : [],
          min: Number(item.min ?? 1),
          max: Number(item.max ?? 5),
          images: parseQuestionImages(item.images),
          condition: parseIntercessionQuestionCondition(item.condition),
        };
      })
    : [];
}

export default async function IntercessionPage({ searchParams }: { searchParams: Promise<{ tab?: string; section?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
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
  const showDepartmentNavigation = permissionSetHas(permissions, "intercession", "view");
  const canLoadReports = intercessionPermissions.canViewReports || intercessionPermissions.canViewSubmissions || intercessionPermissions.canExportReports;
  const canLoadForms = intercessionPermissions.canSubmitForms || intercessionPermissions.canManageForms || intercessionPermissions.canCreateForms || intercessionPermissions.canEditForms || canLoadReports;

  const [forms, mySubmissions, users, allSubmissions, actionPlans] = await Promise.all([
    canLoadForms ? prisma.spiritualForm.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { name: true, email: true } },
        _count: { select: { submissions: { where: { deletedAt: null } } } },
      },
    }) : Promise.resolve([]),
    canLoadForms ? prisma.formSubmission.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { submittedAt: "desc" },
      include: {
        form: true,
      },
    }) : Promise.resolve([]),
    canLoadReports
      ? prisma.user.findMany({
          where: { status: "active", ...excludeSuperAdminUserWhere() },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    canLoadReports
      ? prisma.formSubmission.findMany({
          where: { deletedAt: null },
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

  const mySubmittedFormIds = new Set(mySubmissions.map((submission) => submission.formId));
  const serializedForms = forms.map((form) => {
    const settings = asObject(form.settings);
    const parsedSettings = parseIntercessionFormSettings(form.settings);
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
      availabilityMessage: intercessionFormAvailability(parsedSettings, form.isActive, form._count.submissions),
      createdAt: formatDate(form.createdAt),
      createdBy: form.creator?.name ?? "Unknown",
      submissionsCount: form._count.submissions,
      hasSubmitted: mySubmittedFormIds.has(form.id),
      previewSettings: {
        limit_one_response: settings.limit_one_response !== false,
        show_progress_bar: Boolean(settings.show_progress_bar),
        shuffle_questions: Boolean(settings.shuffle_questions),
        show_question_numbers: settings.show_question_numbers !== false,
        is_quiz: Boolean(settings.is_quiz),
        release_grade: typeof settings.release_grade === "string" ? settings.release_grade : "never",
        require_login: settings.require_login !== false,
        allow_export: settings.allow_export !== false,
        include_timestamps: settings.include_timestamps !== false,
        visitor_fields: parsedSettings.visitor_fields,
      },
    };
  });
  const activePublishedFormIds = new Set(
    serializedForms.filter((form) => form.isPublished && form.isActive).map((form) => form.id),
  );
  const submissionsByUser = new Map<number, Array<{
    id: number;
    formId: number;
    userId: number | null;
    score: number | null;
    submittedAt: Date;
  }>>();
  for (const submission of allSubmissions) {
    if (submission.userId === null) continue;
    const existing = submissionsByUser.get(submission.userId);
    if (existing) existing.push(submission);
    else submissionsByUser.set(submission.userId, [submission]);
  }

  return (
    <IntercessionClient
      initialTab={intercessionPermissions.canReadBible && (params.tab === "bible" || !intercessionPermissions.canSubmitForms) ? "bible" : "forms"}
      initialSection={params.section === "results" ? "results" : "available"}
      showDepartmentNavigation={showDepartmentNavigation}
      permissions={intercessionPermissions}
      forms={serializedForms}
      mySubmissions={mySubmissions.map((submission) => {
        const questions = asQuestions(submission.form.questions);
        const settings = asObject(submission.form.settings);
        const resultInput = {
          isQuiz: Boolean(settings.is_quiz),
          releaseGrade: String(settings.release_grade ?? "never"),
          score: submission.score,
          isReleased: submission.isReleased,
        };
        const resultState = memberResultState(resultInput);
        return {
          id: submission.id,
          formId: submission.formId,
          formTitle: submission.form.title,
          formDescription: submission.form.description,
          questionCount: questions.length,
          submittedAt: formatDate(submission.submittedAt),
          score: memberCanViewScore(resultInput) ? submission.score : null,
          resultStatus: memberResultLabel(resultState),
        };
      })}
      reportRows={users.map((reportUser) => {
        const totalForms = activePublishedFormIds.size;
        const submitted = submissionsByUser.get(reportUser.id) ?? [];
        const submittedPublishedCount = new Set(
          submitted
            .filter((submission) => activePublishedFormIds.has(submission.formId))
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
