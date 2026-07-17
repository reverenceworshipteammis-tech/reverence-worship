import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth";
import { getUserExportRows } from "@/lib/user-export-data";

const headers = [
  "Full Name",
  "Email",
  "Phone Number",
  "Roles",
  "Status",
  "Joined Date",
  "Date of Birth",
  "Gender",
  "Marital Status",
  "Residence",
  "Family",
  "Occupation",
  "Membership Type",
  "Profile Complete",
  "Approval Status",
];

function csvCell(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  await requirePermission("users", "export", "/admin/users");

  const rows = await getUserExportRows({
    search: request.nextUrl.searchParams.get("search"),
    role: request.nextUrl.searchParams.get("role"),
    status: request.nextUrl.searchParams.get("status"),
  });

  const csvRows = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.fullName,
        row.email,
        row.phoneNumber,
        row.roles,
        row.status,
        row.joinedDate,
        row.dateOfBirth,
        row.gender,
        row.maritalStatus,
        row.residence,
        row.family,
        row.occupation,
        row.membershipType,
        row.profileComplete,
        row.approvalStatus,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  const filename = `users_export_${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}.csv`;

  return new Response(`\uFEFF${csvRows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=UTF-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
