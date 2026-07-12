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

export async function submitMyContributionPayment(formData: FormData) {
  const user = await requireUser();
  const year = Number(readString(formData, "year"));
  const term = Number(readString(formData, "term"));
  const amount = Number(readString(formData, "amount"));
  const paymentMethod = readString(formData, "paymentMethod") || "cash";
  const notes = readString(formData, "notes") || null;

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid year." };
  }

  if (!Number.isInteger(term) || term < 1) {
    return { ok: false, message: "Please select a valid term." };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Payment amount must be greater than zero." };
  }

  const contribution = await prisma.contribution.findUnique({
    where: {
      userId_year: {
        userId: user.id,
        year,
      },
    },
    select: { id: true },
  });

  if (!contribution) {
    return { ok: false, message: "Your annual contribution is not set for this year." };
  }

  await prisma.payment.create({
    data: {
      userId: user.id,
      year,
      term,
      amount,
      paymentMethod,
      paymentDate: dateOnly(new Date().toISOString().slice(0, 10)),
      notes,
      status: "completed",
      createdBy: user.id,
    },
  });

  revalidatePath("/admin/contributions");
  return { ok: true, message: "Payment submitted successfully." };
}
