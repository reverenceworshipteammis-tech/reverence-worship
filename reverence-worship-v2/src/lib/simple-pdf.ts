function escapePdfText(value: string | number) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

function chunkText(value: string | number, maxLength: number) {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 1))}…` : text;
}

export type PdfTextLine = {
  text: string;
  x: number;
  y: number;
  size?: number;
  bold?: boolean;
};

export function createSimplePdf(lines: PdfTextLine[], options?: { landscape?: boolean }) {
  const width = options?.landscape ? 842 : 595;
  const height = options?.landscape ? 595 : 842;
  const objects: string[] = [];

  const content = [
    "BT",
    ...lines.map((line) => {
      const font = line.bold ? "F2" : "F1";
      const size = line.size ?? 9;
      // Use Tm (set text matrix) for absolute positioning instead of Td (relative)
      return `/${font} ${size} Tf 1 0 0 1 ${line.x} ${line.y} Tm (${escapePdfText(line.text)}) Tj`;
    }),
    "ET",
  ].join("\n");
    const contentWithNewline = `${content}\n`;

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    objects.push(`<< /Length ${Buffer.byteLength(contentWithNewline)} >>\nstream\n${contentWithNewline}endstream`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf);
}

export function pdfCell(value: string | number, maxLength: number) {
  return chunkText(value, maxLength).replace(/[^\x20-\x7E]/g, "");
}

export function createReportPdf(opts: {
  title: string;
  subtitle?: string;
  columns: { label: string; width: number }[];
  rows: Array<Array<string | number>>;
  landscape?: boolean;
}) {
  const width = opts.landscape ? 842 : 595;
  const height = opts.landscape ? 595 : 842;

  const leftMargin = 40;
  const rightMargin = 40;
  const topMargin = 100;
  const bottomMargin = 60;

  const usableWidth = width - leftMargin - rightMargin;
  const usableHeight = height - topMargin - bottomMargin;

  const rowHeight = 14;
  const headerHeight = 22;
  const rowsPerPage = Math.floor((usableHeight - headerHeight) / rowHeight);

  const totalPages = Math.max(1, Math.ceil(opts.rows.length / rowsPerPage));

  const pagesObjects: string[] = [];

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const pageLines: string[] = [];
    // Graphics: header background and logo placeholder
    pageLines.push(`0.95 0.95 0.95 rg ${leftMargin} ${height - 70} ${usableWidth} 50 re f`); // header bg
    // Logo placeholder (left)
    pageLines.push(`0.85 0.85 0.85 rg ${leftMargin + 6} ${height - 64} 48 38 re f`);

    // Title centered
    const titleSize = 16;
    const titleX = width / 2;
    const titleY = height - 46;
    pageLines.push(`BT /F2 ${titleSize} Tf 1 0 0 1 ${titleX} ${titleY} Tm (${escapePdfText(opts.title)}) Tj ET`);

    if (opts.subtitle) {
      const subSize = 9;
      pageLines.push(`BT /F1 ${subSize} Tf 1 0 0 1 ${titleX} ${titleY - 14} Tm (${escapePdfText(opts.subtitle)}) Tj ET`);
    }

    // Table header
    const colCount = opts.columns.length;
    let colX = leftMargin;
    const colWidths = opts.columns.map((c) => Math.floor((c.width / 100) * usableWidth));

    // draw header background
    pageLines.push(`0.9 0.9 0.9 rg ${leftMargin} ${height - topMargin + 6} ${usableWidth} ${headerHeight} re f`);

    // header texts
    const headerY = height - topMargin + 18;
    for (let ci = 0; ci < colCount; ci++) {
      const col = opts.columns[ci];
      pageLines.push(`BT /F2 9 Tf 1 0 0 1 ${colX + 2} ${headerY} Tm (${escapePdfText(col.label)}) Tj ET`);
      colX += colWidths[ci];
    }

    // rows for this page
    const start = pageIndex * rowsPerPage;
    const end = Math.min(opts.rows.length, start + rowsPerPage);
    let rowY = height - topMargin - 6 - headerHeight;

    for (let r = start; r < end; r++) {
      const row = opts.rows[r];
      const rowIdx = r - start;
      // alternate background
      if (rowIdx % 2 === 0) {
        pageLines.push(`1 1 1 rg ${leftMargin} ${rowY - 6} ${usableWidth} ${rowHeight} re f`);
      }

      // cell texts
      let cellX = leftMargin;
      for (let ci = 0; ci < colCount; ci++) {
        const text = pdfCell(row[ci] ?? "", Math.floor(colWidths[ci] / 6));
        pageLines.push(`BT /F1 8 Tf 1 0 0 1 ${cellX + 2} ${rowY} Tm (${escapePdfText(text)}) Tj ET`);
        cellX += colWidths[ci];
      }

      rowY -= rowHeight;
    }

    // footer with page number
    const footerY = 30;
    pageLines.push(`BT /F1 9 Tf 1 0 0 1 ${width / 2} ${footerY} Tm (${escapePdfText(`Page ${pageIndex + 1} of ${totalPages}`)}) Tj ET`);

    // join page content
    const pageContent = pageLines.join("\n");

    pagesObjects.push(pageContent);
  }

  // Build PDF objects: catalog, pages, each page obj, fonts, and contents
  const objects: string[] = [];
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");

  // pages object referencing all page objects
  const kids = pagesObjects.map((_, i) => `${3 + i} 0 R`).join(" ");
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pagesObjects.length} >>`);

  // page objects
  pagesObjects.forEach((content, idx) => {
    const pageNum = 3 + idx;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents ${pageNum + pagesObjects.length} 0 R >>`);
  });

  // fonts
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  // content streams for each page
  pagesObjects.forEach((content) => {
    const stream = `${content}\n`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`);
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf);
}
