import { ParentDashboardClient } from "@/components/parent-dashboard-client";
import { requirePageAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

function displayValue(value: string | null | undefined) {
  return value && value.trim() ? value : "N/A";
}

function money(value: unknown) {
  return Number(value ?? 0);
}

export default async function ParentDashboardPage() {
  const user = await requirePageAccess("parent");
  const currentYear = new Date().getFullYear();

  const parentMembership = await prisma.familyMember.findFirst({
    where: { userId: user.id, role: { equals: "parent", mode: "insensitive" } },
    include: { family: true },
  });

  const parentFamily =
    parentMembership?.family ??
    (await prisma.family.findFirst({ where: { parentId: user.id } }));

  if (!parentFamily) {
    return (
      <ParentDashboardClient
        accessDenied
        parentName={user.name}
        familyName={null}
        childRows={[]}
        tasks={[]}
        contributions={[]}
      />
    );
  }

  const [members, tasks] = await Promise.all([
    prisma.familyMember.findMany({
      where: { familyId: parentFamily.id, userId: { not: user.id } },
      include: { user: true },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.familyTask.findMany({
      where: { familyId: parentFamily.id },
      include: { subtasks: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const childIds = members.map((member) => member.userId);
  const [contributions, payments] = childIds.length > 0
    ? await Promise.all([
        prisma.contribution.findMany({ where: { userId: { in: childIds }, year: currentYear } }),
        prisma.payment.findMany({ where: { userId: { in: childIds }, year: currentYear }, orderBy: { paymentDate: "desc" } }),
      ])
    : [[], []];

  const contributionByUser = new Map(contributions.map((item) => [item.userId, item]));
  const paymentsByUser = new Map<number, typeof payments>();

  for (const payment of payments) {
    if (!payment.userId) continue;
    paymentsByUser.set(payment.userId, [...(paymentsByUser.get(payment.userId) ?? []), payment]);
  }

  const childRows = members.map((member) => {
    const childPayments = paymentsByUser.get(member.userId) ?? [];
    const annualAmount = money(contributionByUser.get(member.userId)?.annualAmount);
    const totalPaid = childPayments.reduce((sum, payment) => sum + money(payment.amount), 0);
    const location = [member.user.province, member.user.district, member.user.sector, member.user.village].filter(Boolean).join(", ");

    return {
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      phone: member.user.phone,
      role: member.role,
      location: location || "N/A",
      createdAt: formatDate(member.user.createdAt),
      dateOfBirth: formatDate(member.user.dateOfBirth),
      gender: displayValue(member.user.gender),
      maritalStatus: displayValue(member.user.maritalStatus),
      province: displayValue(member.user.province),
      district: displayValue(member.user.district),
      sector: displayValue(member.user.sector),
      village: displayValue(member.user.village),
      occupation: displayValue(member.user.occupation),
      membershipType: displayValue(member.user.membershipType),
      ministryRole: displayValue(member.user.ministryRole),
      emergencyName: displayValue(member.user.emergencyName),
      emergencyPhone: displayValue(member.user.emergencyPhone),
      annualAmount,
      totalPaid,
      paymentCount: childPayments.length,
      progress: annualAmount > 0 ? Math.round((totalPaid / annualAmount) * 1000) / 10 : 0,
      recentPayments: childPayments.slice(0, 5).map((payment) => ({
        id: payment.id,
        amount: money(payment.amount),
        term: payment.term,
        method: payment.paymentMethod,
        date: formatDate(payment.paymentDate),
      })),
    };
  });

  return (
    <ParentDashboardClient
      parentName={user.name}
      familyName={parentFamily.name}
      childRows={childRows}
      tasks={tasks.map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "",
        status: task.status,
        progress: task.progress,
        subtasks: task.subtasks.map((subtask) => ({
          id: Number(subtask.id),
          title: subtask.title,
          isCompleted: subtask.isCompleted,
        })),
      }))}
      contributions={childRows.map((child) => ({
        childId: child.id,
        childName: child.name,
        email: child.email,
        annualAmount: child.annualAmount,
        totalPaid: child.totalPaid,
        progress: child.progress,
        terms: [1, 2, 3].map((term) => ({
          term,
          paid: (paymentsByUser.get(child.id) ?? []).filter((payment) => payment.term === term).reduce((sum, payment) => sum + money(payment.amount), 0),
          target: child.annualAmount > 0 ? child.annualAmount / 3 : 0,
        })),
      }))}
    />
  );
}
