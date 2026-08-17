import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { createXlsxWorkbook, xlsxPercentage } from "../src/lib/xlsx-workbook";

test("creates a valid OOXML workbook with worksheets, styles, dates, and percentages", async () => {
  const workbook = await createXlsxWorkbook([
    { name: "Responses", rows: [["Submitted", "Rate"], [new Date("2026-08-17T10:00:00Z"), xlsxPercentage(75)]] },
    { name: "Summary", rows: [["Question", "Count"], ["Example", 3]] },
  ]);
  assert.equal(String.fromCharCode(workbook[0], workbook[1]), "PK");
  const zip = await JSZip.loadAsync(workbook);
  assert.ok(zip.file("xl/workbook.xml"));
  assert.ok(zip.file("xl/worksheets/sheet1.xml"));
  const sheet = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
  assert.match(sheet, /s="2"/);
  assert.match(sheet, /s="3"/);
});
