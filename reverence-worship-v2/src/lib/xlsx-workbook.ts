import JSZip from "jszip";

export type XlsxPercentage = { kind: "percentage"; value: number };
export type XlsxCell = string | number | boolean | Date | XlsxPercentage | null | undefined;
export type XlsxSheet = { name: string; rows: XlsxCell[][]; widths?: number[]; autoFilter?: boolean };

export function xlsxPercentage(value: number): XlsxPercentage {
  return { kind: "percentage", value };
}

export async function createXlsxWorkbook(sheets: XlsxSheet[]) {
  const safeSheets = sheets.slice(0, 20).map((sheet, index) => ({ ...sheet, name: safeSheetName(sheet.name, index) }));
  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes(safeSheets.length));
  zip.folder("_rels")?.file(".rels", rootRelationships());
  zip.folder("docProps")?.file("app.xml", appProperties(safeSheets.map((sheet) => sheet.name)));
  zip.folder("docProps")?.file("core.xml", coreProperties());
  const xl = zip.folder("xl");
  xl?.file("workbook.xml", workbookXml(safeSheets.map((sheet) => sheet.name)));
  xl?.folder("_rels")?.file("workbook.xml.rels", workbookRelationships(safeSheets.length));
  xl?.file("styles.xml", stylesXml());
  const worksheets = xl?.folder("worksheets");
  safeSheets.forEach((sheet, index) => worksheets?.file(`sheet${index + 1}.xml`, worksheetXml(sheet)));
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

function worksheetXml(sheet: XlsxSheet) {
  const rowXml = sheet.rows.map((row, rowIndex) => {
    const cells = row.map((cell, columnIndex) => cellXml(cell, columnName(columnIndex), rowIndex + 1, rowIndex === 0)).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  const maxColumns = Math.max(1, ...sheet.rows.map((row) => row.length));
  const maxRows = Math.max(1, sheet.rows.length);
  const widths = Array.from({ length: maxColumns }, (_, index) => Math.min(60, Math.max(10, sheet.widths?.[index] ?? inferredWidth(sheet.rows, index))));
  const cols = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  const filter = sheet.autoFilter !== false && sheet.rows.length ? `<autoFilter ref="A1:${columnName(maxColumns - 1)}${maxRows}"/>` : "";
  return xml(`
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
      <dimension ref="A1:${columnName(maxColumns - 1)}${maxRows}"/>
      <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
      <cols>${cols}</cols>
      <sheetData>${rowXml}</sheetData>${filter}
    </worksheet>`);
}

function cellXml(cell: XlsxCell, column: string, row: number, header: boolean) {
  const reference = `${column}${row}`;
  if (cell === null || cell === undefined) return `<c r="${reference}"${header ? ' s="1"' : ""}/>`;
  if (cell instanceof Date) return `<c r="${reference}" s="2"><v>${excelDate(cell)}</v></c>`;
  if (typeof cell === "object" && cell.kind === "percentage") return `<c r="${reference}" s="3"><v>${Number.isFinite(cell.value) ? cell.value / 100 : 0}</v></c>`;
  if (typeof cell === "number") return `<c r="${reference}"${header ? ' s="1"' : ""}><v>${Number.isFinite(cell) ? cell : 0}</v></c>`;
  if (typeof cell === "boolean") return `<c r="${reference}" t="b"${header ? ' s="1"' : ""}><v>${cell ? 1 : 0}</v></c>`;
  return `<c r="${reference}" t="inlineStr"${header ? ' s="1"' : ""}><is><t xml:space="preserve">${escapeXml(String(cell).slice(0, 32767))}</t></is></c>`;
}

function contentTypes(sheetCount: number) {
  return xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${Array.from({ length: sheetCount }, (_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`);
}

function rootRelationships() {
  return xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`);
}

function workbookXml(names: string[]) {
  return xml(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((name, index) => `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets></workbook>`);
}

function workbookRelationships(sheetCount: number) {
  return xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({ length: sheetCount }, (_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
}

function stylesXml() {
  return xml(`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2563EB"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`);
}

function appProperties(names: string[]) {
  return xml(`<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Reverence Worship</Application><TitlesOfParts><vt:vector size="${names.length}" baseType="lpstr">${names.map((name) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`).join("")}</vt:vector></TitlesOfParts></Properties>`);
}

function coreProperties() {
  const now = new Date().toISOString();
  return xml(`<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>Reverence Worship</dc:creator><cp:lastModifiedBy>Reverence Worship</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
}

function inferredWidth(rows: XlsxCell[][], columnIndex: number) {
  return Math.max(...rows.slice(0, 200).map((row) => String(row[columnIndex] instanceof Date ? "2026-08-17 12:00" : row[columnIndex] ?? "").length), 8) + 2;
}

function excelDate(value: Date) {
  return value.getTime() / 86_400_000 + 25569;
}

function columnName(index: number) {
  let value = index + 1;
  let result = "";
  while (value > 0) { const remainder = (value - 1) % 26; result = String.fromCharCode(65 + remainder) + result; value = Math.floor((value - 1) / 26); }
  return result;
}

function safeSheetName(value: string, index: number) {
  const cleaned = value.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31);
  return cleaned || `Sheet ${index + 1}`;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function xml(value: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${value.replace(/>\s+</g, "><").trim()}`;
}
