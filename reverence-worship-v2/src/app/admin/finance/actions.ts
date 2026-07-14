"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dateOnly(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function boundedProgress(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function parseNumberList(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map(Number).filter((item) => Number.isFinite(item))
      : [];
  } catch {
    return [];
  }
}

export async function saveFinanceTermSettings(formData: FormData) {
  await requireUser();

  const currentYear = Number(readString(formData, "current_year"));
  const numberOfTerms = Number(readString(formData, "number_of_terms"));
  const termPercentages = parseNumberList(readString(formData, "term_percentages"));
  const termNumbers = parseNumberList(readString(formData, "term_numbers"));

  if (!Number.isInteger(currentYear) || currentYear < 2000 || currentYear > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  if (!Number.isInteger(numberOfTerms) || numberOfTerms < 1 || numberOfTerms > 12) {
    return { ok: false, message: "Number of terms must be between 1 and 12." };
  }

  if (termPercentages.length !== numberOfTerms || termNumbers.length !== numberOfTerms) {
    return { ok: false, message: "Each term must have a percentage." };
  }

  const total = termPercentages.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 0.01) {
    return { ok: false, message: "Total percentage must equal 100%." };
  }

  const percentageMap = Object.fromEntries(
    termNumbers.map((termNumber, index) => [String(termNumber), Number(termPercentages[index].toFixed(2))]),
  );

  const existing = await prisma.financeTermSetting.findFirst({
    where: { currentYear },
    select: { id: true },
  });

  if (existing) {
    await prisma.financeTermSetting.update({
      where: { id: existing.id },
      data: {
        numberOfTerms,
        termPercentages: JSON.stringify(percentageMap),
        termNumbers: JSON.stringify(termNumbers),
      },
    });
  } else {
    await prisma.financeTermSetting.create({
      data: {
        currentYear,
        numberOfTerms,
        termPercentages: JSON.stringify(percentageMap),
        termNumbers: JSON.stringify(termNumbers),
      },
    });
  }

  revalidatePath("/admin/finance");
  return { ok: true, message: `Settings for ${currentYear} saved successfully.` };
}

export async function saveAnnualContribution(formData: FormData) {
  const user = await requireUser();
  const userId = Number(readString(formData, "user_id"));
  const year = Number(readString(formData, "year"));
  const annualAmount = Number(readString(formData, "annual_amount"));
  const notes = readString(formData, "notes") || null;

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "Please select a member." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  if (!Number.isFinite(annualAmount) || annualAmount < 0) {
    return { ok: false, message: "Annual amount must be valid." };
  }

  const existing = await prisma.contribution.findUnique({
    where: {
      userId_year: {
        userId,
        year,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.contribution.update({
      where: { id: existing.id },
      data: { annualAmount, notes },
    });
  } else {
    await prisma.contribution.create({
      data: {
        userId,
        annualAmount,
        year,
        notes,
        createdBy: user.id,
      },
    });
  }

  revalidatePath("/admin/finance");
  return { ok: true, message: "Annual contribution saved successfully." };
}

export async function recordContributionPayment(formData: FormData) {
  const user = await requireUser();
  const userId = Number(readString(formData, "user_id"));
  const year = Number(readString(formData, "year"));
  const term = Number(readString(formData, "term"));
  const amount = Number(readString(formData, "amount"));
  const paymentMethod = readString(formData, "payment_method") || "cash";
  const paymentDateValue = readString(formData, "payment_date");
  const notes = readString(formData, "notes") || null;

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "Please select a member." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  if (!Number.isInteger(term) || term < 1) {
    return { ok: false, message: "Please select a term." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Payment amount must be greater than zero." };
  }

  await prisma.payment.create({
    data: {
      userId,
      year,
      term,
      amount,
      paymentMethod,
      paymentDate: paymentDateValue ? new Date(`${paymentDateValue}T12:00:00.000Z`) : new Date(),
      notes,
      createdBy: user.id,
      status: "completed",
    },
  });

  revalidatePath("/admin/finance");
  return { ok: true, message: "Payment recorded successfully." };
}

export async function deleteMemberContributionForYear(userId: number, year: number) {
  await requireUser();

  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(year)) {
    return { ok: false, message: "Invalid member or year." };
  }

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { userId, year } }),
    prisma.contribution.deleteMany({ where: { userId, year } }),
  ]);

  revalidatePath("/admin/finance");
  return { ok: true, message: "Contribution records deleted successfully." };
}

export async function updateFinancePayment(formData: FormData) {
  await requireUser();
  const paymentId = Number(readString(formData, "payment_id"));
  const term = Number(readString(formData, "term"));
  const amount = Number(readString(formData, "amount"));
  const paymentMethod = readString(formData, "payment_method") || "cash";
  const paymentDateValue = readString(formData, "payment_date");
  const notes = readString(formData, "notes") || null;

  if (!Number.isInteger(paymentId) || paymentId <= 0) {
    return { ok: false, message: "Payment not found." };
  }

  if (!Number.isInteger(term) || term < 1) {
    return { ok: false, message: "Please select a valid term." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Payment amount must be greater than zero." };
  }

  if (!paymentDateValue) {
    return { ok: false, message: "Payment date is required." };
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      term,
      amount,
      paymentMethod,
      paymentDate: new Date(`${paymentDateValue}T12:00:00.000Z`),
      notes,
    },
  });

  revalidatePath("/admin/finance");
  return { ok: true, message: "Payment updated successfully." };
}

export async function deleteFinancePayment(id: number) {
  await requireUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Payment not found." };
  }

  await prisma.payment.delete({ where: { id } });
  revalidatePath("/admin/finance");
  return { ok: true, message: "Payment deleted successfully." };
}

export async function saveSponsor(formData: FormData) {
  const user = await requireUser();
  const id = Number(readString(formData, "id"));
  const name = readString(formData, "name");
  const email = readString(formData, "email") || null;
  const phone = readString(formData, "phone") || null;
  const commitmentAmount = Number(readString(formData, "commitment_amount") || 0);
  const fundType = readString(formData, "fund_type") || "one_time";
  const notes = readString(formData, "notes") || null;
  const year = Number(readString(formData, "year"));

  if (!name) return { ok: false, message: "Sponsor name is required." };
  if (email && !email.includes("@")) return { ok: false, message: "Please enter a valid email." };
  if (!Number.isFinite(commitmentAmount) || commitmentAmount < 0) {
    return { ok: false, message: "Commitment amount must be valid." };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  if (Number.isInteger(id) && id > 0) {
    await prisma.sponsor.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        commitmentAmount,
        fundType,
        notes,
        year,
      },
    });
  } else {
    await prisma.sponsor.create({
      data: {
        name,
        email,
        phone,
        commitmentAmount,
        fundType,
        notes,
        year,
        status: "active",
        createdBy: user.id,
      },
    });
  }

  revalidatePath("/admin/finance");
  return { ok: true, message: id ? "Sponsor updated successfully." : "Sponsor created successfully." };
}

export async function recordSponsorPayment(formData: FormData) {
  const user = await requireUser();
  const sponsorId = Number(readString(formData, "sponsor_id"));
  const amount = Number(readString(formData, "amount"));
  const year = Number(readString(formData, "year"));
  const paymentMethod = readString(formData, "payment_method") || "cash";
  const paymentDateValue = readString(formData, "payment_date");
  const notes = readString(formData, "notes") || null;

  if (!Number.isInteger(sponsorId) || sponsorId <= 0) {
    return { ok: false, message: "Please select a sponsor." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Payment amount must be greater than zero." };
  }
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  await prisma.sponsorPayment.create({
    data: {
      sponsorId,
      amount,
      year,
      month: paymentDateValue ? Number(paymentDateValue.slice(5, 7)) : new Date().getMonth() + 1,
      paymentMethod,
      paymentDate: paymentDateValue ? new Date(`${paymentDateValue}T12:00:00.000Z`) : new Date(),
      notes,
      createdBy: user.id,
    },
  });

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: sponsorId },
    select: { commitmentAmount: true },
  });
  const totalReceived = await prisma.sponsorPayment.aggregate({
    where: { sponsorId, year },
    _sum: { amount: true },
  });

  if (sponsor && Number(sponsor.commitmentAmount ?? 0) > 0 && Number(totalReceived._sum.amount ?? 0) >= Number(sponsor.commitmentAmount)) {
    await prisma.sponsor.update({
      where: { id: sponsorId },
      data: { status: "completed" },
    });
  }

  revalidatePath("/admin/finance");
  return { ok: true, message: "Sponsor payment recorded successfully." };
}

export async function deleteSponsor(id: number) {
  await requireUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Sponsor not found." };
  }

  await prisma.sponsor.delete({ where: { id } });
  revalidatePath("/admin/finance");
  return { ok: true, message: "Sponsor deleted successfully." };
}

export async function saveExpense(formData: FormData) {
  const user = await requireUser();
  const amount = Number(readString(formData, "amount"));
  const description = readString(formData, "description");
  const dateValue = readString(formData, "date");
  const year = Number(readString(formData, "year"));
  const approverId1 = Number(readString(formData, "approver_id_1"));

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Expense amount must be greater than zero." };
  }

  if (!description) {
    return { ok: false, message: "Expense reason is required." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  const firstApprover = Number.isInteger(approverId1) && approverId1 > 0 ? approverId1 : null;

  await prisma.expense.create({
    data: {
      amount,
      description,
      date: dateValue ? new Date(`${dateValue}T12:00:00.000Z`) : new Date(),
      year,
      category: null,
      status: firstApprover ? "pending" : "approved",
      approverId1: firstApprover,
      approverId2: null,
      approvedBy: firstApprover ? null : user.id,
      createdBy: user.id,
    },
  });

  revalidatePath("/admin/finance");
  return { ok: true, message: "Expense recorded successfully." };
}

export async function approveExpense(id: number) {
  const user = await requireUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Expense not found." };
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    select: { approverId1: true, status: true },
  });

  if (!expense) {
    return { ok: false, message: "Expense not found." };
  }

  if (expense.approverId1 !== user.id) {
    return { ok: false, message: "Only the selected approver can approve this expense." };
  }

  if (expense.status !== "pending") {
    return { ok: false, message: "This expense is no longer pending approval." };
  }

  const result = await prisma.expense.updateMany({
    where: { id, approverId1: user.id, status: "pending" },
    data: {
      status: "approved",
      approvedBy: user.id,
    },
  });

  if (result.count !== 1) {
    return { ok: false, message: "This expense could not be approved. Refresh and try again." };
  }

  revalidatePath("/admin/finance");
  return { ok: true, message: "Expense approved successfully." };
}

export async function deleteExpense(id: number) {
  await requireUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Expense not found." };
  }

  await prisma.expense.delete({ where: { id } });
  revalidatePath("/admin/finance");
  return { ok: true, message: "Expense deleted successfully." };
}

async function syncFinanceActionPlanProgress(actionPlanId: number) {
  const tasks = await prisma.actionPlanTask.findMany({
    where: { actionPlanId },
    select: { progress: true },
  });
  const progress = tasks.length ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length) : 0;
  const status = progress === 100 ? "completed" : progress > 0 ? "in_progress" : "pending";

  await prisma.actionPlan.update({
    where: { id: actionPlanId, department: "finance" },
    data: { progress, status },
  });
}

export async function saveFinanceActionPlan(formData: FormData) {
  const user = await requireUser();
  const id = Number(readString(formData, "id"));
  const title = readString(formData, "title");
  const description = readString(formData, "description") || null;
  const startDateValue = readString(formData, "startDate");
  const dueDateValue = readString(formData, "dueDate");
  const year = Number(readString(formData, "year") || new Date().getFullYear());

  if (!title || !startDateValue || !dueDateValue) {
    return { ok: false, message: "Action plan name, start date, and completion date are required." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  if (Number.isFinite(id) && id > 0) {
    await prisma.actionPlan.update({
      where: { id, department: "finance" },
      data: {
        title,
        description,
        startDate: dateOnly(startDateValue),
        dueDate: dateOnly(dueDateValue),
        year,
      },
    });
  } else {
    await prisma.actionPlan.create({
      data: {
        title,
        description,
        startDate: dateOnly(startDateValue),
        dueDate: dateOnly(dueDateValue),
        department: "finance",
        year,
        createdBy: user.id,
      },
    });
  }

  revalidatePath("/admin/finance");
  return { ok: true, message: id ? "Action plan updated successfully." : "Action plan created successfully." };
}

export async function deleteFinanceActionPlan(id: number) {
  await requireUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Action plan not found." };
  }

  await prisma.actionPlan.delete({ where: { id, department: "finance" } });
  revalidatePath("/admin/finance");
  return { ok: true, message: "Action plan deleted successfully." };
}

export async function saveFinanceActionPlanTask(formData: FormData) {
  await requireUser();
  const id = Number(readString(formData, "id"));
  const actionPlanId = Number(readString(formData, "actionPlanId"));
  const activity = readString(formData, "activity");
  const targetMilestone = readString(formData, "targetMilestone");
  const estimatedBudget = readString(formData, "estimatedBudget") || "0";
  const startDateValue = readString(formData, "startDate");
  const deadlineValue = readString(formData, "deadline");
  const priority = readString(formData, "priority") || "medium";
  const progress = boundedProgress(formData.get("progress"));

  if (!Number.isInteger(actionPlanId) || actionPlanId <= 0 || !activity || !targetMilestone || !deadlineValue) {
    return { ok: false, message: "Action plan, activity, milestone, and deadline are required." };
  }

  const plan = await prisma.actionPlan.findUnique({
    where: { id: actionPlanId, department: "finance" },
    select: { id: true },
  });

  if (!plan) {
    return { ok: false, message: "Action plan not found." };
  }

  const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "pending";
  const data = {
    actionPlanId,
    taskName: activity,
    activity,
    targetMilestone,
    estimatedBudget,
    startDate: startDateValue ? dateOnly(startDateValue) : null,
    deadline: dateOnly(deadlineValue),
    priority,
    progress,
    status,
    startedAt: progress > 0 ? new Date() : null,
    completedAt: progress >= 100 ? new Date() : null,
  };

  if (Number.isFinite(id) && id > 0) {
    await prisma.actionPlanTask.update({
      where: { id },
      data: {
        taskName: data.taskName,
        activity: data.activity,
        targetMilestone: data.targetMilestone,
        estimatedBudget: data.estimatedBudget,
        startDate: data.startDate,
        deadline: data.deadline,
        priority: data.priority,
        progress: data.progress,
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
      },
    });
  } else {
    await prisma.actionPlanTask.create({ data });
  }

  await syncFinanceActionPlanProgress(actionPlanId);
  revalidatePath("/admin/finance");
  return { ok: true, message: id ? "Task updated successfully." : "Task created successfully." };
}

export async function deleteFinanceActionPlanTask(id: number) {
  await requireUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Task not found." };
  }

  const task = await prisma.actionPlanTask.findUnique({
    where: { id },
    select: { actionPlanId: true, actionPlan: { select: { department: true } } },
  });

  if (!task || task.actionPlan.department !== "finance") {
    return { ok: false, message: "Task not found." };
  }

  await prisma.actionPlanTask.delete({ where: { id } });
  await syncFinanceActionPlanProgress(task.actionPlanId);
  revalidatePath("/admin/finance");
  return { ok: true, message: "Task deleted successfully." };
}
