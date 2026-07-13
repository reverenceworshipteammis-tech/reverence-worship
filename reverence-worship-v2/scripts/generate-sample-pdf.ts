import { writeFileSync } from "fs";
import { join } from "path";
import { createReportPdf } from "../src/lib/simple-pdf";

function makeSampleRows(count: number) {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push([
      i,
      `User ${i}`,
      `user${i}@example.com`,
      `+2507000000${String(i).padStart(2, "0")}`,
      i % 3 === 0 ? "Admin" : "Member",
      i % 4 === 0 ? "Pending" : "Active",
      i % 2 === 0 ? "Male" : "Female",
      `Occupation ${i}`,
    ]);
  }
  return rows;
}

const columns = [
  { label: "#", width: 4 },
  { label: "Name", width: 18 },
  { label: "Email", width: 28 },
  { label: "Phone", width: 12 },
  { label: "Role", width: 12 },
  { label: "Status", width: 8 },
  { label: "Gender", width: 6 },
  { label: "Occupation", width: 12 },
];

const rows = makeSampleRows(75);

const buffer = createReportPdf({
  title: "Users Report (Sample)",
  subtitle: `Sample generated ${new Date().toLocaleString()}`,
  columns,
  rows,
  landscape: true,
});

const out = join(process.cwd(), "tmp", "users_report_sample.pdf");
try {
  writeFileSync(out, buffer);
  // eslint-disable-next-line no-console
  console.log("Wrote sample PDF to", out);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("Failed to write sample PDF:", err);
  process.exit(1);
}
