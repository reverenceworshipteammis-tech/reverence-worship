"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission, requireUser } from "@/lib/auth";
import { calculateAvailableBalance, canApproveExpense, reconcileContributionPaymentAmounts, validateContributionPaymentDate, validateExpenseRequest } from "@/lib/finance-rules";
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/notifications";

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

async function logFinance(userId: number, action: string, metadata: Prisma.InputJsonValue) {
  await prisma.activityLog.create({ data: { userId, action, module: "finance", metadata } });
}

async function saveReceipt(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;
  const allowed = new Map([["application/pdf", ".pdf"], ["image/jpeg", ".jpg"], ["image/png", ".png"]]);
  const extension = allowed.get(file.type);
  if (!extension) throw new Error("Receipt must be a PDF, JPG, or PNG file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Receipt must be 5 MB or smaller.");
  const filename = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "storage", "finance-receipts");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return filename;
}

export async function saveFinanceTermSettings(formData: FormData) {
  const user = await requirePermission("finance", "manage-settings");

  const currentYear = Number(readString(formData, "current_year"));
  const numberOfTerms = Number(readString(formData, "number_of_terms"));
  const termPercentages = parseNumberList(readString(formData, "term_percentages"));
  const termNumbers = parseNumberList(readString(formData, "term_numbers"));
  const allowMemberCommitment = readString(formData, "allow_member_commitment") === "true";

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
        allowMemberCommitment,
      },
    });
  } else {
    await prisma.financeTermSetting.create({
      data: {
        currentYear,
        numberOfTerms,
        termPercentages: JSON.stringify(percentageMap),
        termNumbers: JSON.stringify(termNumbers),
        allowMemberCommitment,
      },
    });
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin/contributions");
  await logFinance(user.id, "finance.settings.saved", { year: currentYear, numberOfTerms, allowMemberCommitment });
  return { ok: true, message: `Settings for ${currentYear} saved successfully.` };
}

export async function saveAnnualContribution(formData: FormData) {
  const user = await requirePermission("finance", "manage-contributions");
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

  await notifyUsers({
    userIds: [userId], type: "contribution", title: existing ? "Annual contribution updated" : "Annual contribution created",
    message: `Your ${year} annual contribution is RWF ${annualAmount.toLocaleString()}.`, link: "/admin/contributions",
    sourceType: "contribution", sourceId: existing?.id, dedupeKey: `contribution:${userId}:${year}:${Date.now()}`,
  });

  revalidatePath("/admin/finance");
  await logFinance(user.id, existing ? "finance.contribution.updated" : "finance.contribution.created", { userId, year, annualAmount });
  return { ok: true, message: "Annual contribution saved successfully." };
}

export async function recordContributionPayment(formData: FormData) {
  const user = await requirePermission("finance", "manage-payments");
  const userId = Number(readString(formData, "user_id"));
  const year = Number(readString(formData, "year"));
  const term = Number(readString(formData, "term"));
  const amount = Number(readString(formData, "amount"));
  const paymentMethod = readString(formData, "payment_method") || "cash";
  const paymentDateValue = readString(formData, "payment_date");
  const notes = readString(formData, "notes") || null;
  const referenceNumber = readString(formData, "reference_number") || null;

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

  if (referenceNumber) {
    const duplicate = await prisma.payment.findFirst({ where: { referenceNumber, status: { not: "voided" } }, select: { id: true } });
    if (duplicate) return { ok: false, message: "This payment reference has already been recorded." };
  }

  const payment = await prisma.payment.create({
    data: {
      userId,
      year,
      term,
      amount,
      paymentMethod,
      paymentDate: paymentDateValue ? new Date(`${paymentDateValue}T12:00:00.000Z`) : new Date(),
      notes,
      referenceNumber,
      createdBy: user.id,
      status: "completed",
    },
  });

  await notifyUsers({
    userIds: [userId], type: "contribution", title: "Contribution payment recorded",
    message: `A payment of RWF ${amount.toLocaleString()} was recorded for term ${term}, ${year}.`, link: "/admin/contributions",
    sourceType: "payment", sourceId: payment.id, dedupeKey: `payment:${payment.id}:created`,
  });

  revalidatePath("/admin/finance");
  await logFinance(user.id, "finance.payment.created", { userId, year, term, amount, referenceNumber });
  return { ok: true, message: "Payment recorded successfully." };
}

export async function deleteMemberContributionForYear(userId: number, year: number) {
  const user = await requirePermission("finance", "delete-contributions");

  if (!Number.isInteger(userId) || userId <= 0 || !Number.isInteger(year)) {
    return { ok: false, message: "Invalid member or year." };
  }

  await prisma.$transaction([
    prisma.payment.updateMany({ where: { userId, year }, data: { status: "voided" } }),
    prisma.contribution.updateMany({ where: { userId, year }, data: { status: "inactive" } }),
  ]);

  revalidatePath("/admin/finance");
  await logFinance(user.id, "finance.contribution.deleted", { userId, year });
  return { ok: true, message: "Contribution and related payments were voided; audit history was preserved." };
}

export async function updateFinancePayment(formData: FormData) {
  const user = await requirePermission("finance", "manage-payments");
  const paymentId = Number(readString(formData, "payment_id"));
  const term = Number(readString(formData, "term"));
  const amount = Number(readString(formData, "amount"));
  const paymentMethod = readString(formData, "payment_method") || "cash";
  const paymentDateValue = readString(formData, "payment_date");
  const notes = readString(formData, "notes") || null;
  const referenceNumber = readString(formData, "reference_number") || null;

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

  if (referenceNumber) {
    const duplicate = await prisma.payment.findFirst({ where: { referenceNumber, id: { not: paymentId }, status: { not: "voided" } }, select: { id: true } });
    if (duplicate) return { ok: false, message: "This payment reference has already been recorded." };
  }

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      term,
      amount,
      paymentMethod,
      paymentDate: new Date(`${paymentDateValue}T12:00:00.000Z`),
      notes,
      referenceNumber,
    },
  });

  if (payment.userId) await notifyUsers({ userIds: [payment.userId], type: "contribution", title: "Contribution payment updated", message: `Payment #${payment.id} was updated to RWF ${amount.toLocaleString()}.`, link: "/admin/contributions", sourceType: "payment", sourceId: payment.id, dedupeKey: `payment:${payment.id}:updated:${Date.now()}` });

  revalidatePath("/admin/finance");
  await logFinance(user.id, "finance.payment.updated", { paymentId, term, amount });
  return { ok: true, message: "Payment updated successfully." };
}

export async function updateTermContributionTotal(formData: FormData) {
  const user = await requirePermission("finance", "manage-payments");
  const userId = Number(readString(formData, "user_id"));
  const year = Number(readString(formData, "year"));
  const term = Number(readString(formData, "term"));
  const amount = Number(readString(formData, "amount"));
  const paymentIds = [...new Set(parseNumberList(readString(formData, "payment_ids")))]
    .filter((id) => Number.isInteger(id) && id > 0);

  if (!Number.isInteger(userId) || userId <= 0) return { ok: false, message: "Member not found." };
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false, message: "Please select a valid year." };
  if (!Number.isInteger(term) || term < 1) return { ok: false, message: "Please select a valid term." };
  if (!Number.isFinite(amount) || amount < 0) return { ok: false, message: "Term amount must be zero or greater." };
  if (paymentIds.length === 0) return { ok: false, message: "No payment records were selected for this term." };

  const payments = await prisma.payment.findMany({
    where: { id: { in: paymentIds }, userId, year, term, status: { not: "voided" } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, amount: true },
  });
  if (payments.length !== paymentIds.length) return { ok: false, message: "One or more payment records are no longer available. Refresh and try again." };

  const previousTotal = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const reconciledAmounts = reconcileContributionPaymentAmounts(payments.map((payment) => Number(payment.amount)), amount);
  const updates = payments.flatMap((payment, index) => {
    const reconciledAmount = reconciledAmounts[index] ?? 0;
    if (reconciledAmount === 0) {
      return [prisma.payment.update({ where: { id: payment.id }, data: { status: "voided" } })];
    }
    if (reconciledAmount !== Number(payment.amount)) {
      return [prisma.payment.update({ where: { id: payment.id }, data: { amount: reconciledAmount } })];
    }
    return [];
  });
  if (updates.length > 0) await prisma.$transaction(updates);

  await notifyUsers({
    userIds: [userId],
    type: "contribution",
    title: `Term ${term} contribution updated`,
    message: `Your term ${term}, ${year} contribution total was updated to RWF ${amount.toLocaleString()}.`,
    link: "/admin/contributions",
    sourceType: "payment",
    sourceId: payments[payments.length - 1].id,
    dedupeKey: `term-payment:${userId}:${year}:${term}:updated:${Date.now()}`,
  });

  revalidatePath("/admin/finance");
  revalidatePath("/admin/contributions");
  await logFinance(user.id, "finance.term-contribution.updated", {
    userId,
    year,
    term,
    previousTotal,
    amount,
    paymentIds: payments.map((payment) => payment.id),
  });
  return { ok: true, message: `Term ${term} contribution updated successfully.` };
}

export async function deleteFinancePayment(id: number) {
  const user = await requirePermission("finance", "delete-payments");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Payment not found." };
  }

  const payment = await prisma.payment.update({ where: { id }, data: { status: "voided" } });
  if (payment.userId) await notifyUsers({ userIds: [payment.userId], type: "contribution", title: "Contribution payment voided", message: `Payment #${payment.id} for RWF ${Number(payment.amount).toLocaleString()} was voided.`, link: "/admin/contributions", sourceType: "payment", sourceId: payment.id, dedupeKey: `payment:${payment.id}:voided` });
  revalidatePath("/admin/finance");
  await logFinance(user.id, "finance.payment.voided", { paymentId: id });
  return { ok: true, message: "Payment voided successfully. Its audit history was preserved." };
}

export async function saveContributionEvent(formData: FormData) {
  const user = await requirePermission("finance", "manage-contributions");
  const id = Number(readString(formData, "id"));
  const title = readString(formData, "title");
  const description = readString(formData, "description") || null;
  const startDateValue = readString(formData, "start_date");
  const endDateValue = readString(formData, "end_date");
  const eventDateValue = readString(formData, "event_date");
  const goalAmount = Number(readString(formData, "goal_amount") || 0);
  const contributionMode = readString(formData, "contribution_mode") || "open";
  const suggestedAmountValue = readString(formData, "suggested_amount");
  const suggestedAmount = suggestedAmountValue ? Number(suggestedAmountValue) : null;
  const status = readString(formData, "status") || "active";

  if (title.length < 3) return { ok: false, message: "Contribution title must contain at least 3 characters." };
  if (!startDateValue) return { ok: false, message: "Contribution start date is required." };
  if (endDateValue && endDateValue < startDateValue) return { ok: false, message: "End date must be on or after the start date." };
  if (eventDateValue && eventDateValue < startDateValue) return { ok: false, message: "Event date must be on or after contributions open." };
  if (!Number.isFinite(goalAmount) || goalAmount < 0) return { ok: false, message: "Goal amount must be zero or greater." };
  if (!new Set(["open", "suggested", "fixed"]).has(contributionMode)) return { ok: false, message: "Select a valid contribution mode." };
  if (!new Set(["draft", "active", "closed"]).has(status)) return { ok: false, message: "Select a valid event status." };
  if (contributionMode !== "open" && (!suggestedAmount || !Number.isFinite(suggestedAmount) || suggestedAmount <= 0)) {
    return { ok: false, message: `${contributionMode === "fixed" ? "Fixed" : "Suggested"} amount must be greater than zero.` };
  }

  const startDate = dateOnly(startDateValue);
  const data = {
    title,
    description,
    startDate,
    endDate: endDateValue ? dateOnly(endDateValue) : null,
    eventDate: eventDateValue ? dateOnly(eventDateValue) : null,
    goalAmount,
    contributionMode,
    suggestedAmount: contributionMode === "open" ? null : suggestedAmount,
    status,
    year: startDate.getUTCFullYear(),
  };

  const event = Number.isInteger(id) && id > 0
    ? await prisma.contributionEvent.update({ where: { id }, data })
    : await prisma.contributionEvent.create({ data: { ...data, createdBy: user.id } });

  revalidatePath("/admin/finance");
  revalidatePath("/admin/contributions");
  await logFinance(user.id, Number.isInteger(id) && id > 0 ? "finance.contribution-event.updated" : "finance.contribution-event.created", { eventId: event.id, title, status, goalAmount, contributionMode });
  return { ok: true, message: Number.isInteger(id) && id > 0 ? "Contribution event updated successfully." : "Contribution event created successfully." };
}

export async function setContributionEventStatus(id: number, status: string) {
  const user = await requirePermission("finance", "manage-contributions");
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Contribution event not found." };
  if (!new Set(["draft", "active", "closed"]).has(status)) return { ok: false, message: "Select a valid event status." };

  const result = await prisma.contributionEvent.updateMany({ where: { id }, data: { status } });
  if (result.count !== 1) return { ok: false, message: "Contribution event not found." };

  revalidatePath("/admin/finance");
  revalidatePath("/admin/contributions");
  await logFinance(user.id, "finance.contribution-event.status-changed", { eventId: id, status });
  return { ok: true, message: `Contribution event marked ${status}.` };
}

export async function recordEventContributionPayment(formData: FormData) {
  const user = await requirePermission("finance", "manage-payments");
  const eventId = Number(readString(formData, "event_id"));
  const userId = Number(readString(formData, "user_id"));
  const amount = Number(readString(formData, "amount"));
  const paymentDateValue = readString(formData, "payment_date");
  const paymentMethod = readString(formData, "payment_method") || "cash";
  const referenceNumber = readString(formData, "reference_number") || null;
  const notes = readString(formData, "notes") || null;

  if (!Number.isInteger(eventId) || eventId <= 0) return { ok: false, message: "Select a contribution." };
  if (!Number.isInteger(userId) || userId <= 0) return { ok: false, message: "Select a member." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Payment amount must be greater than zero." };
  if (!paymentDateValue) return { ok: false, message: "Payment date is required." };
  const paymentDate = dateOnly(paymentDateValue);

  const [event, member] = await Promise.all([
    prisma.contributionEvent.findFirst({ where: { id: eventId, status: "active" }, select: { id: true, title: true, startDate: true, endDate: true } }),
    prisma.user.findFirst({ where: { id: userId, status: "active" }, select: { id: true } }),
  ]);
  if (!event) return { ok: false, message: "This contribution is not active." };
  if (!member) return { ok: false, message: "Select an active member." };
  const paymentDateError = validateContributionPaymentDate({ paymentDate, startDate: event.startDate, endDate: event.endDate });
  if (paymentDateError) return { ok: false, message: paymentDateError };

  if (referenceNumber) {
    const [annualDuplicate, eventDuplicate] = await Promise.all([
      prisma.payment.findFirst({ where: { referenceNumber, status: { not: "voided" } }, select: { id: true } }),
      prisma.eventContributionPayment.findFirst({ where: { referenceNumber, status: { not: "voided" } }, select: { id: true } }),
    ]);
    if (annualDuplicate || eventDuplicate) return { ok: false, message: "This payment reference has already been recorded." };
  }

  const payment = await prisma.eventContributionPayment.create({
    data: {
      eventId,
      userId,
      amount,
      paymentDate,
      paymentMethod,
      referenceNumber,
      notes,
      createdBy: user.id,
      status: "completed",
    },
  });

  await notifyUsers({
    userIds: [userId],
    type: "contribution",
    title: "Other contribution recorded",
    message: `A payment of RWF ${amount.toLocaleString()} was recorded for ${event.title}.`,
    link: "/admin/contributions",
    sourceType: "event_contribution_payment",
    sourceId: payment.id,
    dedupeKey: `event-payment:${payment.id}:created`,
  });

  revalidatePath("/admin/finance");
  revalidatePath("/admin/contributions");
  await logFinance(user.id, "finance.event-contribution-payment.created", { paymentId: payment.id, eventId, userId, amount, referenceNumber });
  return { ok: true, message: "Event contribution payment recorded successfully." };
}

export async function voidEventContributionPayment(id: number) {
  const user = await requirePermission("finance", "delete-payments");
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Event payment not found." };

  const payment = await prisma.eventContributionPayment.findFirst({ where: { id, status: { not: "voided" } }, select: { id: true, userId: true, amount: true, event: { select: { title: true } } } });
  if (!payment) return { ok: false, message: "Event payment was not found or is already voided." };
  await prisma.eventContributionPayment.update({ where: { id }, data: { status: "voided" } });

  if (payment.userId) await notifyUsers({
    userIds: [payment.userId],
    type: "contribution",
    title: "Event contribution voided",
    message: `Your RWF ${Number(payment.amount).toLocaleString()} payment for ${payment.event.title} was voided.`,
    link: "/admin/contributions",
    sourceType: "event_contribution_payment",
    sourceId: payment.id,
    dedupeKey: `event-payment:${payment.id}:voided`,
  });

  revalidatePath("/admin/finance");
  revalidatePath("/admin/contributions");
  await logFinance(user.id, "finance.event-contribution-payment.voided", { paymentId: id });
  return { ok: true, message: "Event contribution payment voided successfully." };
}

export async function saveSponsor(formData: FormData) {
  const user = await requirePermission("finance", "manage-sponsors");
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
  if (!["one_time", "monthly", "annual"].includes(fundType)) {
    return { ok: false, message: "Please select a valid fund type." };
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
  await logFinance(user.id, id ? "finance.sponsor.updated" : "finance.sponsor.created", { sponsorId: id || null, name, year, commitmentAmount });
  return { ok: true, message: id ? "Sponsor updated successfully." : "Sponsor created successfully." };
}

export async function recordSponsorPayment(formData: FormData) {
  const user = await requirePermission("finance", "manage-sponsors");
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

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: sponsorId },
    select: { status: true, commitmentAmount: true },
  });
  if (!sponsor) {
    return { ok: false, message: "Sponsor not found." };
  }
  if (sponsor.status === "inactive") {
    return { ok: false, message: "Payments cannot be recorded for an inactive sponsor." };
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
  await logFinance(user.id, "finance.sponsor-payment.created", { sponsorId, year, amount });
  return { ok: true, message: "Sponsor payment recorded successfully." };
}

export async function deactivateSponsor(id: number) {
  const user = await requirePermission("finance", "delete-sponsors");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Sponsor not found." };
  }

  const result = await prisma.sponsor.updateMany({
    where: { id, status: { not: "inactive" } },
    data: { status: "inactive" },
  });
  if (result.count === 0) {
    const sponsorExists = await prisma.sponsor.findUnique({ where: { id }, select: { id: true } });
    return {
      ok: false,
      message: sponsorExists ? "Sponsor is already inactive." : "Sponsor not found.",
    };
  }

  revalidatePath("/admin/finance");
  await logFinance(user.id, "finance.sponsor.deactivated", { sponsorId: id });
  return { ok: true, message: "Sponsor deactivated successfully. Payment history was preserved." };
}

export async function reactivateSponsor(id: number) {
  const user = await requirePermission("finance", "manage-sponsors");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Sponsor not found." };
  }

  const result = await prisma.sponsor.updateMany({
    where: { id, status: "inactive" },
    data: { status: "active" },
  });
  if (result.count === 0) {
    const sponsorExists = await prisma.sponsor.findUnique({ where: { id }, select: { id: true } });
    return {
      ok: false,
      message: sponsorExists ? "Sponsor is already active." : "Sponsor not found.",
    };
  }

  revalidatePath("/admin/finance");
  await logFinance(user.id, "finance.sponsor.reactivated", { sponsorId: id });
  return { ok: true, message: "Sponsor reactivated successfully. Payment history was preserved." };
}

export async function saveExpense(formData: FormData) {
  const user = await requirePermission("finance", "manage-expenses");
  const amount = Number(readString(formData, "amount"));
  const description = readString(formData, "description");
  const dateValue = readString(formData, "date");
  const year = Number(readString(formData, "year"));
  const approverId1 = Number(readString(formData, "approver_id_1"));
  const referenceNumber = readString(formData, "reference_number") || null;

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

  const preliminaryError = validateExpenseRequest({ amount, availableBalance: Number.MAX_SAFE_INTEGER, recorderId: user.id, approverId: firstApprover });
  if (preliminaryError) return { ok: false, message: preliminaryError };

  const approver = await prisma.user.findUnique({
    where: { id: firstApprover! },
    select: { status: true },
  });
  if (approver?.status !== "active") return { ok: false, message: "Select an active user as approver." };

  if (referenceNumber) {
    const duplicate = await prisma.expense.findFirst({ where: { referenceNumber, status: { not: "voided" } }, select: { id: true } });
    if (duplicate) return { ok: false, message: "This expense reference has already been recorded." };
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const [memberIncome, giftIncome, sponsorIncome, existingExpenses] = await Promise.all([
          tx.payment.aggregate({
            where: { year, status: { not: "voided" } },
            _sum: { amount: true },
          }),
          tx.gift.aggregate({
            _sum: { receivedAmount: true },
          }),
          tx.sponsorPayment.aggregate({
            _sum: { amount: true },
          }),
          tx.expense.findMany({ where: { status: { in: ["pending", "approved", "void_pending"] } }, select: { amount: true, status: true } }),
        ]);

        const availableBalance = calculateAvailableBalance({
          memberIncome: Number(memberIncome._sum.amount ?? 0),
          giftIncome: Number(giftIncome._sum.receivedAmount ?? 0),
          sponsorIncome: Number(sponsorIncome._sum.amount ?? 0),
          expenses: existingExpenses.map((expense) => ({ amount: Number(expense.amount), status: expense.status })),
        });
        const validationError = validateExpenseRequest({ amount, availableBalance, recorderId: user.id, approverId: firstApprover });
        if (validationError) return { ok: false as const, message: validationError };

        let receiptPath: string | null = null;
        try {
          receiptPath = await saveReceipt(formData.get("receipt"));
        } catch (error) {
          return { ok: false as const, message: error instanceof Error ? error.message : "Receipt could not be uploaded." };
        }

        const expense = await tx.expense.create({
          data: {
            amount,
            description,
            date: dateValue ? new Date(`${dateValue}T12:00:00.000Z`) : new Date(),
            year,
            category: null,
            status: "pending",
            approverId1: firstApprover,
            approverId2: null,
            approvedBy: null,
            createdBy: user.id,
            referenceNumber,
            receiptPath,
          },
        });

        await tx.activityLog.create({ data: { userId: user.id, action: "finance.expense.created", module: "finance", metadata: { expenseId: expense.id, amount, approverId: firstApprover, referenceNumber } } });

        return { ok: true as const, message: "Expense recorded successfully.", expenseId: expense.id };
      }, { isolationLevel: "Serializable" });

      if (!result.ok) return result;

      await notifyUsers({ userIds: [firstApprover!], type: "expense", title: "Expense awaiting approval", message: `An expense of RWF ${amount.toLocaleString()} requires your approval: ${description}`, link: "/admin/finance", sourceType: "expense", sourceId: result.expenseId, dedupeKey: `expense:${result.expenseId}:submitted` });

      revalidatePath("/admin/finance");
      return result;
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code === "P2034" && attempt < 3) continue;
      console.error("Unable to save expense", error);
      return { ok: false, message: "The expense could not be saved. Please refresh and try again." };
    }
  }

  return { ok: false, message: "The expense could not be saved. Please refresh and try again." };
}

export async function approveExpense(id: number) {
  const user = await requireUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Expense not found." };
  }

  const expense = await prisma.expense.findUnique({
    where: { id },
    select: { approverId1: true, status: true, createdBy: true, voidRequestedBy: true },
  });

  if (!expense) {
    return { ok: false, message: "Expense not found." };
  }

  if (!canApproveExpense(expense, user.id)) {
    if (expense.approverId1 !== user.id) return { ok: false, message: "Only the selected approver can approve this expense." };
    return { ok: false, message: "This expense is no longer pending approval." };
  }

  const approvingVoid = expense.status === "void_pending";
  const result = await prisma.expense.updateMany({
    where: { id, approverId1: user.id, status: expense.status },
    data: approvingVoid
      ? { status: "voided", voidedAt: new Date(), voidedBy: user.id }
      : { status: "approved", approvedBy: user.id },
  });

  if (result.count !== 1) {
    return { ok: false, message: "This expense could not be approved. Refresh and try again." };
  }

  revalidatePath("/admin/finance");
  await logFinance(user.id, approvingVoid ? "finance.expense-void.approved" : "finance.expense.approved", { expenseId: id });
  const recipientId = approvingVoid ? expense.voidRequestedBy : expense.createdBy;
  if (recipientId) await notifyUsers({ userIds: [recipientId], type: "expense", title: approvingVoid ? "Expense void approved" : "Expense approved", message: approvingVoid ? `Your request to void expense #${id} was approved.` : `Expense #${id} was approved.`, link: "/admin/finance", sourceType: "expense", sourceId: id, dedupeKey: `expense:${id}:${approvingVoid ? "void-approved" : "approved"}` });
  return { ok: true, message: approvingVoid ? "Expense void approved successfully." : "Expense approved successfully." };
}

export async function rejectExpense(id: number, reason: string) {
  const user = await requireUser();
  const cleanReason = reason.trim();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Expense not found." };
  if (cleanReason.length < 3) return { ok: false, message: "A rejection reason is required." };
  const expense = await prisma.expense.findFirst({ where: { id, approverId1: user.id, status: { in: ["pending", "void_pending"] } }, select: { status: true, createdBy: true, voidRequestedBy: true } });
  if (!expense) return { ok: false, message: "Only the selected approver can reject this pending request." };
  const rejectingVoid = expense.status === "void_pending";
  const result = await prisma.expense.updateMany({
    where: { id, approverId1: user.id, status: expense.status },
    data: rejectingVoid
      ? { status: "approved", rejectionReason: `Void request rejected: ${cleanReason}` }
      : { status: "rejected", rejectionReason: cleanReason, approvedBy: user.id },
  });
  if (result.count !== 1) return { ok: false, message: "This request changed. Refresh and try again." };
  await logFinance(user.id, rejectingVoid ? "finance.expense-void.rejected" : "finance.expense.rejected", { expenseId: id, reason: cleanReason });
  const recipientId = rejectingVoid ? expense.voidRequestedBy : expense.createdBy;
  if (recipientId) await notifyUsers({ userIds: [recipientId], type: "expense", title: rejectingVoid ? "Expense void rejected" : "Expense rejected", message: `${rejectingVoid ? "The void request for" : "Expense"} #${id} was rejected: ${cleanReason}`, link: "/admin/finance", sourceType: "expense", sourceId: id, dedupeKey: `expense:${id}:${rejectingVoid ? "void-rejected" : "rejected"}` });
  revalidatePath("/admin/finance");
  return { ok: true, message: rejectingVoid ? "Void request rejected. The expense remains approved." : "Expense rejected. The reserved funds are available again." };
}

export async function voidExpense(id: number, reason: string) {
  const user = await requirePermission("finance", "delete-expenses");
  const cleanReason = reason.trim();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, message: "Expense not found." };
  if (cleanReason.length < 3) return { ok: false, message: "A reason is required to void an expense." };
  const expense = await prisma.expense.findUnique({ where: { id }, select: { status: true, approverId1: true } });
  if (!expense || expense.status === "voided") return { ok: false, message: "Expense was not found or is already voided." };
  if (expense.status === "void_pending") return { ok: false, message: "This expense already has a pending void request." };
  const needsApproval = expense.status === "approved" && Boolean(expense.approverId1);
  const result = await prisma.expense.updateMany({
    where: { id, status: expense.status },
    data: needsApproval
      ? { status: "void_pending", voidReason: cleanReason, voidRequestedAt: new Date(), voidRequestedBy: user.id }
      : { status: "voided", voidReason: cleanReason, voidedAt: new Date(), voidedBy: user.id },
  });
  if (result.count !== 1) return { ok: false, message: "Expense was not found or is already voided." };
  await logFinance(user.id, needsApproval ? "finance.expense-void.requested" : "finance.expense.voided", { expenseId: id, reason: cleanReason, approverId: expense.approverId1 });
  if (needsApproval && expense.approverId1) await notifyUsers({ userIds: [expense.approverId1], type: "expense", title: "Expense void requested", message: `A request to void expense #${id} requires your approval. Reason: ${cleanReason}`, link: "/admin/finance", sourceType: "expense", sourceId: id, dedupeKey: `expense:${id}:void-requested:${Date.now()}` });
  revalidatePath("/admin/finance");
  return { ok: true, message: needsApproval ? "Void request sent to the original approver. The expense remains deducted until approval." : "Expense voided. Its audit history was preserved." };
}

export async function deleteExpense(id: number) {
  return voidExpense(id, "Voided by an authorized finance user");
}

export async function setTransactionReconciliation(sourceType: string, sourceId: number, reconciled: boolean, reference?: string) {
  const user = await requirePermission("finance", "reconcile");
  const supported = new Set(["payment", "event_contribution_payment", "sponsor_payment", "gift", "expense"]);
  if (!supported.has(sourceType) || !Number.isInteger(sourceId) || sourceId <= 0) return { ok: false, message: "Transaction not found." };
  if (reconciled) {
    await prisma.financeReconciliation.upsert({
      where: { sourceType_sourceId: { sourceType, sourceId } },
      create: { sourceType, sourceId, reconciledBy: user.id, reference: reference?.trim() || null },
      update: { reconciledBy: user.id, reconciledAt: new Date(), reference: reference?.trim() || null },
    });
  } else {
    await prisma.financeReconciliation.deleteMany({ where: { sourceType, sourceId } });
  }
  await logFinance(user.id, reconciled ? "finance.transaction.reconciled" : "finance.transaction.unreconciled", { sourceType, sourceId, reference });
  revalidatePath("/admin/finance");
  return { ok: true, message: reconciled ? "Transaction reconciled." : "Reconciliation removed." };
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
  const user = await requirePermission("finance", "manage-action-plans");
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
  await requirePermission("finance", "manage-action-plans");

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Action plan not found." };
  }

  await prisma.actionPlan.delete({ where: { id, department: "finance" } });
  revalidatePath("/admin/finance");
  return { ok: true, message: "Action plan deleted successfully." };
}

export async function saveFinanceActionPlanTask(formData: FormData) {
  await requirePermission("finance", "manage-action-plans");
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
  await requirePermission("finance", "manage-action-plans");

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
