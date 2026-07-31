"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { canMemberCommitAnnualContribution, parseAnnualContributionAmount } from "@/lib/annual-contribution-rules";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function commitAnnualContribution(formData: FormData) {
  const user = await requirePermission("contributions", "create");
  const year = Number(readString(formData, "year"));
  const annualAmount = parseAnnualContributionAmount(readString(formData, "annual_amount"));

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { ok: false, message: "Please select a valid contribution year." };
  }

  if (annualAmount === null) {
    return { ok: false, message: "Enter an annual contribution greater than zero, with no more than two decimal places." };
  }

  const termSetting = await prisma.financeTermSetting.findFirst({
    where: { currentYear: year },
    select: { id: true, allowMemberCommitment: true },
  });

  if (!termSetting) {
    return { ok: false, message: `Contribution terms have not been configured for ${year}. Please contact the finance team.` };
  }

  if (!canMemberCommitAnnualContribution(termSetting)) {
    return { ok: false, message: `Member contribution commitments are currently closed for ${year}. Please contact the finance team.` };
  }

  const contribution = await prisma.contribution.upsert({
    where: { userId_year: { userId: user.id, year } },
    update: { annualAmount, status: "active" },
    create: {
      userId: user.id,
      annualAmount,
      year,
      status: "active",
      createdBy: user.id,
    },
    select: { id: true },
  });

  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "contribution.self_committed",
      module: "finance",
      metadata: { contributionId: contribution.id, year, annualAmount },
    },
  });

  revalidatePath("/admin/contributions");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/performance");
  revalidatePath("/admin/finance");

  return {
    ok: true,
    message: `Your ${year} annual contribution commitment has been saved.`,
  };
}
