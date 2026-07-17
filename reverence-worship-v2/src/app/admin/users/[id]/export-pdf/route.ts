import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createSimplePdf, type PdfTextLine } from "@/lib/simple-pdf";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  await requirePermission("users", "export", "/admin/users");

  const { id } = await context.params;
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { roles: { include: { role: true } } },
  });

  if (!user) {
    return new Response("User not found", { status: 404 });
  }

  const rows = [
    ["Full Name", user.name],
    ["Email Address", user.email],
    ["Phone Number", user.phone || "-"],
    ["Status", user.status],
    ["Gender", user.gender || "-"],
    ["Joined Date", user.createdAt.toDateString()],
    ["Date of Birth", user.dateOfBirth ? user.dateOfBirth.toDateString() : "-"],
    ["Marital Status", user.maritalStatus || "-"],
    ["Membership Type", user.membershipType || "-"],
    ["Occupation", user.occupation || "-"],
    ["Province", user.province || "-"],
    ["District", user.district || "-"],
    ["Sector", user.sector || "-"],
    ["Cell", user.cell || "-"],
    ["Village", user.village || "-"],
    ["Roles", user.roles.map(({ role }) => role.displayName).join(", ") || "-"],
    ["Skills", user.skills || "-"],
  ];

  const lines: PdfTextLine[] = [
    { text: "User Details", x: 245, y: 800, size: 20, bold: true },
    { text: `Generated on: ${new Date().toLocaleString()}`, x: 205, y: 780, size: 9 },
  ];

  let y = 740;
  rows.forEach(([label, value]) => {
    lines.push({ text: label, x: 60, y, size: 10, bold: true });
    lines.push({ text: String(value).slice(0, 70), x: 220, y, size: 10 });
    y -= 26;
  });

  lines.push({ text: "Reverence Worship Team - System Generated Report", x: 170, y: 40, size: 8 });

  return new Response(createSimplePdf(lines), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="user_${user.name.replaceAll(" ", "_")}_details.pdf"`,
    },
  });
}
