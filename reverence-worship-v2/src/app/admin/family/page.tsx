import { FamilyClient } from "@/components/family-client";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasSuperAdminRole } from "@/lib/system-account-rules";
import { redirect } from "next/navigation";

function formatDueDate(date: Date | null) {
  if (!date) return "No due date";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normalizeTaskStatus(task: {
  status: string;
  progress: number;
  subtasks: Array<{ isCompleted: boolean }>;
}) {
  if (task.subtasks.length === 0) {
    if (task.status === "completed" || task.progress >= 100) return "completed";
    if (task.status === "in-progress" || task.progress > 0) return "in-progress";
    return "pending";
  }

  const completed = task.subtasks.filter((subtask) => subtask.isCompleted).length;
  const progress = Math.round((completed / task.subtasks.length) * 100);

  if (progress >= 100) return "completed";
  if (progress > 0) return "in-progress";
  return "pending";
}

export default async function FamilyPage() {
  const user = await requirePageAccess("family");
  if (hasSuperAdminRole(user.roles.map(({ role }) => role.name))) redirect("/admin/dashboard");

  const membership = await prisma.familyMember.findUnique({
    where: { userId: user.id },
    include: {
      family: {
        include: {
          members: {
            include: {
              user: true,
            },
            orderBy: [
              { role: "desc" },
              { user: { name: "asc" } },
            ],
          },
          tasks: {
            include: {
              subtasks: {
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!membership) {
    return <FamilyClient family={null} members={[]} tasks={[]} taskStats={{ completed: 0, pending: 0, inProgress: 0 }} />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const members = membership.family.members.map((member) => ({
    id: member.id,
    role: member.role,
    name: member.user.name,
    email: member.user.email,
    phone: member.user.phone,
  }));

  const tasks = membership.family.tasks.map((task) => {
    const status = normalizeTaskStatus(task);
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = Boolean(dueDate && dueDate < today && status !== "completed");

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status,
      dueDate: formatDueDate(dueDate),
      isOverdue,
      subtasks: task.subtasks.map((subtask) => ({
        id: subtask.id.toString(),
        title: subtask.title,
        isCompleted: subtask.isCompleted,
      })),
    };
  });

  const taskStats = tasks.reduce(
    (stats, task) => {
      if (task.status === "completed") stats.completed += 1;
      else if (task.status === "in-progress") stats.inProgress += 1;
      else stats.pending += 1;

      return stats;
    },
    { completed: 0, pending: 0, inProgress: 0 },
  );

  return (
    <FamilyClient
      family={{
        name: membership.family.name,
        parentName: membership.family.parentName,
      }}
      members={members}
      tasks={tasks}
      taskStats={taskStats}
    />
  );
}
