import { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("intercession", "create-forms", "/admin/intercession");
  const params = await context.params;

  const formId = Number(params.id);
  if (!Number.isFinite(formId) || formId <= 0) {
    return new Response(JSON.stringify({ success: false, message: "Invalid form ID." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const original = await prisma.spiritualForm.findUnique({
    where: { id: formId },
  });

  if (!original) {
    return new Response(JSON.stringify({ success: false, message: "Form not found." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const copy = await prisma.spiritualForm.create({
    data: {
      title: `Copy of ${original.title}`,
      description: original.description,
      questions: (original.questions ?? []) as Prisma.InputJsonValue,
      settings: {
        ...((original.settings as Record<string, unknown> | null) ?? {}),
        is_published: false,
      } as Prisma.InputJsonValue,
      isActive: original.isActive,
      createdBy: user.id,
    },
  });

  return new Response(JSON.stringify({ success: true, form_id: copy.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
