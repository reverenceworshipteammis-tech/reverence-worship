"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AssignmentInput = {
  pageId: number;
  featureId: number;
};

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseAssignments(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const pageId = Number(record.pageId ?? record.page_id);
        const featureId = Number(record.featureId ?? record.feature_id);
        return Number.isInteger(pageId) && Number.isInteger(featureId) ? { pageId, featureId } : null;
      })
      .filter((item): item is AssignmentInput => Boolean(item));
  } catch {
    return [];
  }
}

export async function saveRole(formData: FormData) {
  await requireAdminUser();
  const id = Number(readString(formData, "id"));
  const displayName = readString(formData, "displayName");
  const description = readString(formData, "description") || null;
  const name = slugify(readString(formData, "name") || displayName);

  if (!displayName || !name) {
    return { ok: false, message: "Role name is required." };
  }

  if (Number.isFinite(id) && id > 0) {
    const role = await prisma.role.findUnique({ where: { id }, select: { name: true, isSystem: true } });
    if (!role) return { ok: false, message: "Role not found." };
    if (role.name === "super-admin") return { ok: false, message: "Super Admin role cannot be edited." };

    await prisma.role.update({
      where: { id },
      data: { displayName, description },
    });
  } else {
    const existing = await prisma.role.findUnique({ where: { name }, select: { id: true } });
    if (existing) return { ok: false, message: "A role with this name already exists." };

    await prisma.role.create({
      data: { name, displayName, description, isSystem: false },
    });
  }

  revalidatePath("/admin/permissions");
  return { ok: true, message: id ? "Role updated successfully." : "Role created successfully." };
}

export async function deleteRole(id: number) {
  await requireAdminUser();

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Role not found." };
  }

  const role = await prisma.role.findUnique({ where: { id }, select: { name: true, isSystem: true } });
  if (!role) return { ok: false, message: "Role not found." };
  if (role.name === "super-admin") return { ok: false, message: "Super Admin role cannot be deleted." };

  await prisma.role.delete({ where: { id } });
  revalidatePath("/admin/permissions");
  return { ok: true, message: "Role deleted successfully." };
}

export async function saveRolePermissions(formData: FormData) {
  await requireAdminUser();
  const roleId = Number(readString(formData, "roleId"));
  const assignments = parseAssignments(readString(formData, "assignments"));

  if (!Number.isInteger(roleId) || roleId <= 0) {
    return { ok: false, message: "Role not found." };
  }

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true, name: true } });
  if (!role) return { ok: false, message: "Role not found." };
  if (role.name === "super-admin") return { ok: false, message: "Super Admin always has all permissions." };

  const featureIds = Array.from(new Set(assignments.map((item) => item.featureId)));
  const features = featureIds.length
    ? await prisma.feature.findMany({
        where: { id: { in: featureIds } },
        select: { id: true, pageId: true },
      })
    : [];
  const featureById = new Map(features.map((feature) => [feature.id, feature]));

  await prisma.$transaction([
    prisma.rolePageFeature.deleteMany({ where: { roleId } }),
    prisma.rolePageFeature.createMany({
      data: assignments
        .map((item) => {
          const feature = featureById.get(item.featureId);
          if (!feature || feature.pageId !== item.pageId) return null;
          return { roleId, pageId: item.pageId, featureId: item.featureId };
        })
        .filter((item): item is { roleId: number; pageId: number; featureId: number } => Boolean(item)),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/admin/permissions");
  revalidatePath("/admin");
  revalidatePath("/admin/intercession");
  return { ok: true, message: "Permissions saved successfully." };
}

export async function importRolePermissions(formData: FormData) {
  await requireAdminUser();
  const payload = readString(formData, "payload");

  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid file.");
    const data = parsed as { format?: string; roles?: Array<{ name?: string; displayName?: string; description?: string; permissions?: AssignmentInput[] }> };
    if (data.format !== "reverence-role-permissions" || !Array.isArray(data.roles)) {
      return { ok: false, message: "Invalid permissions export file." };
    }

    for (const item of data.roles) {
      const displayName = String(item.displayName || item.name || "").trim();
      const name = slugify(String(item.name || displayName));
      if (!name || name === "super-admin") continue;

      const role = await prisma.role.upsert({
        where: { name },
        create: { name, displayName: displayName || name, description: item.description || null, isSystem: false },
        update: { displayName: displayName || name, description: item.description || null },
      });

      const form = new FormData();
      form.set("roleId", String(role.id));
      form.set("assignments", JSON.stringify(item.permissions ?? []));
      await saveRolePermissions(form);
    }

    revalidatePath("/admin/permissions");
    return { ok: true, message: "Roles and permissions imported successfully." };
  } catch {
    return { ok: false, message: "Could not read the permissions file." };
  }
}
