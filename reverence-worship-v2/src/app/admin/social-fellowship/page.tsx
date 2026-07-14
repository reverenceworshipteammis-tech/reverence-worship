import { SocialFellowshipClient } from "@/components/social-fellowship-client";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function SocialFellowshipPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requirePageAccess("social-fellowship");
  const params = await searchParams;
  const selectedYear = Number(params.year) || new Date().getFullYear();

  const [families, availableUsers, users, tasks, actionPlans] = await Promise.all([
    prisma.family.findMany({
      where: { year: selectedYear },
      orderBy: { createdAt: "desc" },
      include: {
        parent: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
          orderBy: { joinedAt: "desc" },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        status: "active",
        familyMembership: null,
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.user.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      include: {
        familyMembership: {
          include: {
            family: true,
          },
        },
      },
    }),
    prisma.familyTask.findMany({
      where: {
        family: {
          year: selectedYear,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        family: true,
        subtasks: {
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.actionPlan.findMany({
      where: {
        department: "social-fellowship",
        year: selectedYear,
      },
      orderBy: { createdAt: "desc" },
      include: {
        family: true,
        tasks: {
          orderBy: { createdAt: "asc" },
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
  ]);

  return (
    <SocialFellowshipClient
      selectedYear={selectedYear}
      families={families.map((family) => ({
        id: family.id,
        name: family.name,
        parentName: family.parent?.name ?? family.parentName,
        description: family.description,
        motto: family.motto,
        createdAt: formatDate(family.createdAt),
        membersCount: family.members.length,
        members: family.members.map((member) => ({
          id: member.id,
          role: member.role,
          status: member.status,
          joinedAt: formatDate(member.joinedAt),
          user: {
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            phone: member.user.phone,
          },
        })),
      }))}
      availableUsers={availableUsers}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        province: user.province,
        district: user.district,
        sector: user.sector,
        village: user.village,
        familyId: user.familyMembership?.familyId ?? null,
        familyName: user.familyMembership?.family.name ?? null,
        familyYear: user.familyMembership?.family.year ?? null,
        role: user.familyMembership?.role ?? null,
        isAssignedInYear: user.familyMembership?.family.year === selectedYear,
      }))}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        familyId: task.familyId,
        familyName: task.family.name,
        dueDate: task.dueDate ? formatDate(task.dueDate) : null,
        dueDateValue: formatDateValue(task.dueDate),
        status: task.status,
        progress: task.progress,
        createdAt: formatDate(task.createdAt),
        subtasks: task.subtasks.map((subtask) => ({
          id: subtask.id.toString(),
          title: subtask.title,
          isCompleted: subtask.isCompleted,
          completedAt: subtask.completedAt ? formatDate(subtask.completedAt) : null,
        })),
      }))}
      actionPlans={actionPlans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        description: plan.description,
        familyId: plan.familyId,
        familyName: plan.family?.name ?? null,
        startDate: formatDate(plan.startDate),
        startDateValue: formatDateValue(plan.startDate),
        dueDate: formatDate(plan.dueDate),
        dueDateValue: formatDateValue(plan.dueDate),
        status: plan.status,
        priority: plan.priority,
        progress: plan.progress,
        createdAt: formatDate(plan.createdAt),
        tasks: plan.tasks.map((task) => ({
          id: task.id,
          taskName: task.taskName,
          activity: task.activity,
          targetMilestone: task.targetMilestone,
          estimatedBudget: task.estimatedBudget.toString(),
          startDate: task.startDate ? formatDate(task.startDate) : null,
          startDateValue: formatDateValue(task.startDate),
          deadline: task.deadline ? formatDate(task.deadline) : null,
          deadlineValue: formatDateValue(task.deadline),
          priority: task.priority,
          progress: task.progress,
          status: task.status,
          assigneeId: task.assignedTo,
          assigneeName: task.assignee?.name ?? null,
        })),
      }))}
    />
  );
}
