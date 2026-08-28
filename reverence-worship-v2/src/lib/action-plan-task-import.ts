import JSZip from "jszip";

export const ACTION_PLAN_TASK_TEMPLATE_HEADERS = [
  "Activity *",
  "Target / Milestone *",
  "Estimated Budget (RWF)",
  "Start Date (YYYY-MM-DD)",
  "Deadline (YYYY-MM-DD) *",
  "Priority (low/medium/high)",
  "Progress (0-100)",
] as const;

export const MAX_ACTION_PLAN_IMPORT_BYTES = 2 * 1024 * 1024;
export const MAX_ACTION_PLAN_IMPORT_ROWS = 500;

export type ImportedActionPlanTask = {
  activity: string;
  targetMilestone: string;
  estimatedBudget: number;
  startDate: Date | null;
  deadline: Date;
  priority: "low" | "medium" | "high";
  progress: number;
};

export type ActionPlanTaskImportResult =
  | { ok: true; rows: ImportedActionPlanTask[] }
  | { ok: false; message: string };

type Field = "activity" | "targetMilestone" | "estimatedBudget" | "startDate" | "deadline" | "priority" | "progress";

const HEADER_ALIASES: Record<string, Field> = {
  activity: "activity",
  task: "activity",
  taskname: "activity",
  target: "targetMilestone",
  milestone: "targetMilestone",
  targetmilestone: "targetMilestone",
  estimatedbudget: "estimatedBudget",
  estimatedbudgetrwf: "estimatedBudget",
  budget: "estimatedBudget",
  budgetrwf: "estimatedBudget",
  startdate: "startDate",
  startdateyyyymmdd: "startDate",
  deadline: "deadline",
  deadlineyyyymmdd: "deadline",
  duedate: "deadline",
  priority: "priority",
  prioritylowmediumhigh: "priority",
  progress: "progress",
  progress0100: "progress",
};

export async function parseActionPlanTaskImport(filename: string, bytes: Uint8Array): Promise<ActionPlanTaskImportResult> {
  if (!bytes.length) return { ok: false, message: "The selected file is empty." };
  if (bytes.length > MAX_ACTION_PLAN_IMPORT_BYTES) {
    return { ok: false, message: "The import file must be 2 MB or smaller." };
  }

  const extension = filename.toLowerCase().split(".").pop();
  try {
    const rows = extension === "csv"
      ? parseCsv(new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, ""))
      : extension === "xlsx"
        ? await parseFirstXlsxSheet(bytes)
        : null;
    if (!rows) return { ok: false, message: "Choose an Excel (.xlsx) or CSV (.csv) file." };
    return validateRows(rows);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "The spreadsheet could not be read.",
    };
  }
}

export function actionPlanTaskSignature(task: Pick<ImportedActionPlanTask, "activity" | "targetMilestone" | "deadline">) {
  return [task.activity, task.targetMilestone, dateKey(task.deadline)]
    .map((value) => String(value).trim().toLocaleLowerCase("en"))
    .join("|");
}

function validateRows(rows: string[][]): ActionPlanTaskImportResult {
  if (!rows.length) return { ok: false, message: "The spreadsheet does not contain a header row." };
  const headerIndex = rows.findIndex((row) => row.some((cell) => cell.trim()));
  if (headerIndex < 0) return { ok: false, message: "The spreadsheet is empty." };

  const mappedHeaders = rows[headerIndex].map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? null);
  const missing = (["activity", "targetMilestone", "deadline"] as Field[]).filter((field) => !mappedHeaders.includes(field));
  if (missing.length) {
    const labels: Record<Field, string> = {
      activity: "Activity",
      targetMilestone: "Target / Milestone",
      estimatedBudget: "Estimated Budget",
      startDate: "Start Date",
      deadline: "Deadline",
      priority: "Priority",
      progress: "Progress",
    };
    return { ok: false, message: `Missing required column${missing.length === 1 ? "" : "s"}: ${missing.map((field) => labels[field]).join(", ")}. Download a fresh template and try again.` };
  }

  const dataRows = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell.trim()));
  if (!dataRows.length) return { ok: false, message: "Add at least one task below the template header before importing." };
  if (dataRows.length > MAX_ACTION_PLAN_IMPORT_ROWS) {
    return { ok: false, message: `Import at most ${MAX_ACTION_PLAN_IMPORT_ROWS} tasks at a time.` };
  }

  const parsed: ImportedActionPlanTask[] = [];
  const errors: string[] = [];
  dataRows.forEach((row, dataIndex) => {
    const sheetRow = headerIndex + dataIndex + 2;
    const value = (field: Field) => {
      const index = mappedHeaders.indexOf(field);
      return index < 0 ? "" : (row[index] ?? "").trim();
    };
    const activity = value("activity");
    const targetMilestone = value("targetMilestone");
    const deadline = parseDate(value("deadline"));
    const startDate = value("startDate") ? parseDate(value("startDate")) : null;
    const estimatedBudget = parseAmount(value("estimatedBudget"));
    const priority = (value("priority") || "medium").toLowerCase();
    const progress = parseProgress(value("progress"));

    const rowErrors: string[] = [];
    if (!activity) rowErrors.push("Activity is required");
    if (activity.length > 500) rowErrors.push("Activity must be 500 characters or fewer");
    if (!targetMilestone) rowErrors.push("Target / Milestone is required");
    if (targetMilestone.length > 1000) rowErrors.push("Target / Milestone must be 1,000 characters or fewer");
    if (!deadline) rowErrors.push("Deadline must be a valid YYYY-MM-DD date");
    if (value("startDate") && !startDate) rowErrors.push("Start Date must be a valid YYYY-MM-DD date");
    if (estimatedBudget === null) rowErrors.push("Estimated Budget must be a non-negative number");
    if (!(["low", "medium", "high"] as string[]).includes(priority)) rowErrors.push("Priority must be low, medium, or high");
    if (progress === null) rowErrors.push("Progress must be a number from 0 to 100");
    if (startDate && deadline && startDate > deadline) rowErrors.push("Start Date cannot be after Deadline");

    if (rowErrors.length) {
      errors.push(`Row ${sheetRow}: ${rowErrors.join("; ")}`);
      return;
    }
    parsed.push({
      activity,
      targetMilestone,
      estimatedBudget: estimatedBudget!,
      startDate,
      deadline: deadline!,
      priority: priority as ImportedActionPlanTask["priority"],
      progress: progress!,
    });
  });

  if (errors.length) {
    const visible = errors.slice(0, 8).join(" | ");
    return { ok: false, message: `${visible}${errors.length > 8 ? ` | Plus ${errors.length - 8} more invalid rows.` : ""} No tasks were imported.` };
  }
  return { ok: true, rows: parsed };
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseAmount(value: string) {
  if (!value) return 0;
  const normalized = value.replace(/rwf/gi, "").replace(/[\s,]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount >= 0 && amount <= 999_999_999_999.99 ? amount : null;
}

function parseProgress(value: string) {
  if (!value) return 0;
  const progress = Number(value.replace(/%/g, "").trim());
  return Number.isFinite(progress) && progress >= 0 && progress <= 100 ? Math.round(progress) : null;
}

function parseDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(`${trimmed}T12:00:00.000Z`);
    return dateKey(date) === trimmed ? date : null;
  }
  const serial = Number(trimmed);
  if (!Number.isFinite(serial) || serial < 1 || serial > 73050) return null;
  const date = new Date(Math.floor(serial - 25569 + Number.EPSILON) * 86_400_000 + 43_200_000);
  const year = date.getUTCFullYear();
  return year >= 1900 && year <= 2100 ? date : null;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseCsv(value: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quoted) {
      if (character === '"' && value[index + 1] === '"') { cell += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"' && !cell) quoted = true;
    else if (character === ",") { row.push(cell); cell = ""; }
    else if (character === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += character;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

async function parseFirstXlsxSheet(bytes: Uint8Array) {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new Error("The Excel file is damaged or is not a valid .xlsx workbook.");
  }
  const sheetFile = zip.file("xl/worksheets/sheet1.xml");
  if (!sheetFile) throw new Error("The Excel workbook does not contain a Tasks sheet.");
  const sheetXml = await sheetFile.async("string");
  if (sheetXml.length > 10_000_000) throw new Error("The Excel worksheet is too large to import safely.");

  const sharedFile = zip.file("xl/sharedStrings.xml");
  const sharedXml = sharedFile ? await sharedFile.async("string") : "";
  if (sharedXml.length > 10_000_000) throw new Error("The Excel shared text is too large to import safely.");
  const sharedStrings = sharedXml
    ? [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => extractXmlText(match[1]))
    : [];

  const rows: string[][] = [];
  for (const rowMatch of sheetXml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g)) {
      const attributes = cellMatch[1] ?? cellMatch[3] ?? "";
      const body = cellMatch[2] ?? "";
      const reference = /\br="([A-Z]+)\d+"/i.exec(attributes)?.[1] ?? "A";
      const columnIndex = columnNumber(reference);
      const type = /\bt="([^"]+)"/i.exec(attributes)?.[1] ?? "";
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
      const value = type === "inlineStr"
        ? extractXmlText(body)
        : type === "s"
          ? sharedStrings[Number(raw)] ?? ""
          : decodeXml(raw);
      row[columnIndex] = value;
    }
    rows.push(row.map((cell) => cell ?? ""));
    if (rows.length > MAX_ACTION_PLAN_IMPORT_ROWS + 20) break;
  }
  return rows;
}

function extractXmlText(value: string) {
  return [...value.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1])).join("");
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

function columnNumber(value: string) {
  return value.toUpperCase().split("").reduce((sum, character) => sum * 26 + character.charCodeAt(0) - 64, 0) - 1;
}
