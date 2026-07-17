import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { createSimplePdf, pdfCell, type PdfTextLine } from "@/lib/simple-pdf";
import { getUserExportRows } from "@/lib/user-export-data";

export async function GET(request: NextRequest) {
  await requirePermission("users", "export", "/admin/users");

  const rows = await getUserExportRows({
    search: request.nextUrl.searchParams.get("search"),
    role: request.nextUrl.searchParams.get("role"),
    status: request.nextUrl.searchParams.get("status"),
  });

  const active = rows.filter((row) => row.status === "Active").length;
  const inactive = rows.filter((row) => row.status === "Inactive").length;
  const pending = rows.filter((row) => row.status === "Pending").length;

  const lines: PdfTextLine[] = [];

  lines.push({ text: "Users Report", x: 370, y: 560, size: 18, bold: true });
  lines.push({
    text: `Generated on: ${new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "medium" }).format(new Date())}`,
    x: 330,
    y: 542,
    size: 9,
  });

  lines.push({ text: `Total Users: ${rows.length}`, x: 40, y: 515, size: 10, bold: true });
  lines.push({ text: `Active: ${active}`, x: 160, y: 515, size: 10, bold: true });
  lines.push({ text: `Inactive: ${inactive}`, x: 260, y: 515, size: 10, bold: true });
  lines.push({ text: `Pending: ${pending}`, x: 370, y: 515, size: 10, bold: true });

  const columns = [
    { label: "#", x: 40, width: 3 },
    { label: "Name", x: 65, width: 18 },
    { label: "Email", x: 175, width: 28 },
    { label: "Phone", x: 330, width: 15 },
    { label: "Role", x: 425, width: 18 },
    { label: "Status", x: 535, width: 9 },
    { label: "Gender", x: 595, width: 8 },
    { label: "Occupation", x: 650, width: 18 },
  ];

  let y = 485;
  columns.forEach((column) => {
    lines.push({ text: column.label, x: column.x, y, size: 8, bold: true });
  });

  y -= 16;
  rows.slice(0, 28).forEach((row) => {
    const values = [
      row.index,
      row.fullName,
      row.email,
      row.phoneNumber,
      row.roles,
      row.status,
      row.gender,
      row.occupation,
    ];

    columns.forEach((column, index) => {
      lines.push({ text: pdfCell(values[index], column.width), x: column.x, y, size: 7 });
    });

    y -= 14;
  });

  if (rows.length > 28) {
    lines.push({ text: `Showing first 28 of ${rows.length} users. Use CSV export for the full dataset.`, x: 40, y: 70, size: 8, bold: true });
  }

  lines.push({ text: "Reverence Worship Team - User Management Report", x: 315, y: 35, size: 8 });

  const filename = `users_report_${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.pdf`;

  return new Response(createSimplePdf(lines, { landscape: true }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
