import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export type QuotePdfData = {
  title: string;
  total: string;
  totalLabel: string;
  status: string;
  validity: string;
  reference: string;
  facts?: { label: string; value: string }[];
  breakdown?: {
    heading: string;
    columns: [string, string, string, string];
    rows: {
      service: string;
      quantity: string;
      unitPrice: string;
      subtotal: string;
    }[];
  };
  sections: { heading: string; paragraphs: string[] }[];
  warning?: string;
};

function printable(value: string, font: PDFFont) {
  return Array.from(value.normalize("NFC"), (character) => {
    if (character === "\n") return character;
    try {
      font.encodeText(character);
      return character;
    } catch {
      const plain = character.normalize("NFKD").replace(/\p{M}/gu, "");
      try {
        font.encodeText(plain);
        return plain || "?";
      } catch {
        return "?";
      }
    }
  }).join("");
}

export async function renderQuotePdf(data: QuotePdfData) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const display = await pdf.embedFont(StandardFonts.TimesRoman);
  const dark = rgb(0.11, 0.12, 0.1);
  const gold = rgb(0.49, 0.37, 0.11);
  const muted = rgb(0.35, 0.35, 0.32);
  const width = 595.28;
  const height = 841.89;
  const margin = 46;
  const column = width - margin * 2;
  let page = pdf.addPage([width, height]);
  let y = 0;
  function header() {
    page.drawText("SILKinCOM  /  EXPERIENCE", {
      x: margin,
      y: height - 50,
      font: bold,
      size: 12,
      color: gold,
    });
    page.drawLine({
      start: { x: margin, y: height - 63 },
      end: { x: width - margin, y: height - 63 },
      thickness: 0.7,
      color: gold,
    });
    y = height - 91;
  }
  function ensure(space: number) {
    if (y - space >= 56) return;
    page = pdf.addPage([width, height]);
    header();
  }
  function wrap(value: string, size: number, font: PDFFont, available: number) {
    const lines: string[] = [];
    for (const paragraph of printable(value, font).split("\n")) {
      let line = "";
      for (const word of paragraph.trim().split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= available) {
          line = candidate;
          continue;
        }
        if (line) lines.push(line);
        line = "";
        for (const letter of word) {
          if (font.widthOfTextAtSize(line + letter, size) > available) {
            lines.push(line);
            line = "";
          }
          line += letter;
        }
      }
      lines.push(line);
    }
    return lines;
  }
  function write(value: string, size: number, font: PDFFont, color = dark) {
    const leading = size * 1.5;
    for (const line of wrap(value, size, font, column)) {
      ensure(leading);
      if (line)
        page.drawText(line, { x: margin, y: y - size, size, font, color });
      y -= leading;
    }
  }
  function writeFacts(facts: NonNullable<QuotePdfData["facts"]>) {
    const labelWidth = 124;
    for (const { label, value } of facts) {
      const labels = wrap(label, 10, bold, labelWidth - 14);
      const values = wrap(value, 10, regular, column - labelWidth);
      const rowHeight = Math.max(labels.length, values.length) * 15;
      ensure(rowHeight);
      labels.forEach((line, index) => {
        if (line)
          page.drawText(line, {
            x: margin,
            y: y - 10 - index * 15,
            size: 10,
            font: bold,
            color: muted,
          });
      });
      values.forEach((line, index) => {
        if (line)
          page.drawText(line, {
            x: margin + labelWidth,
            y: y - 10 - index * 15,
            size: 10,
            font: regular,
            color: dark,
          });
      });
      y -= rowHeight;
    }
  }
  function writeBreakdown(table: NonNullable<QuotePdfData["breakdown"]>) {
    const widths = [column - 230, 58, 86, 86];
    const left = [
      margin,
      margin + widths[0],
      margin + widths[0] + widths[1],
      width - margin - widths[3],
    ];
    const padding = 8;
    const leading = 14;
    const fontSize = 10;
    const columnLabels = table.columns.map((label, index) =>
      wrap(label, fontSize, bold, widths[index] - padding * 2),
    );
    const headerHeight =
      Math.max(...columnLabels.map((lines) => lines.length)) * leading +
      padding * 2;
    function drawRow(
      cells: string[][],
      rowHeight: number,
      isHeader: boolean,
      alternative = false,
    ) {
      if (isHeader || alternative) {
        page.drawRectangle({
          x: margin,
          y: y - rowHeight,
          width: column,
          height: rowHeight,
          color: isHeader ? dark : rgb(0.98, 0.97, 0.95),
        });
      }
      const font = isHeader ? bold : regular;
      const color = isHeader ? rgb(1, 1, 1) : dark;
      cells.forEach((lines, col) =>
        lines.forEach((line, index) => {
          if (!line) return;
          const x =
            col === 0
              ? left[col] + padding
              : left[col] +
                widths[col] -
                padding -
                font.widthOfTextAtSize(line, fontSize);
          page.drawText(line, {
            x,
            y: y - padding - fontSize - leading * index,
            font,
            size: fontSize,
            color,
          });
        }),
      );
      y -= rowHeight;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        color: rgb(0.89, 0.86, 0.81),
        thickness: 0.5,
      });
    }
    const rows = table.rows.map(({ service, quantity, unitPrice, subtotal }) =>
      [service, quantity, unitPrice, subtotal].map((text, col) =>
        wrap(text, fontSize, regular, widths[col] - padding * 2),
      ),
    );
    const rowHeight = (cells: string[][]) =>
      Math.max(...cells.map((lines) => lines.length)) * leading + padding * 2;
    ensure(42 + headerHeight + rowHeight(rows[0]));
    y -= 16;
    write(table.heading, 13, bold);
    y -= 6;
    drawRow(columnLabels, headerHeight, true);
    rows.forEach((cells, index) => {
      const height = rowHeight(cells);
      if (y - height < 56) {
        ensure(height + headerHeight + 28);
        write(table.heading, 13, bold);
        y -= 6;
        drawRow(columnLabels, headerHeight, true);
      }
      drawRow(cells, height, false, index % 2 === 1);
    });
  }
  header();
  write(data.status, 10, bold, gold);
  write(data.title, 28, display);
  y -= 15;
  const summaryHeight = data.validity ? 98 : 81;
  ensure(summaryHeight + 14);
  const summaryBottom = y - summaryHeight;
  page.drawRectangle({
    x: margin - 12,
    y: summaryBottom,
    width: column + 24,
    height: summaryHeight,
    color: rgb(0.97, 0.95, 0.91),
  });
  y -= 12;
  write(data.totalLabel, 11, bold, gold);
  write(data.total, 28, display);
  if (data.validity) write(data.validity, 11, regular, muted);
  y = summaryBottom - 12;
  write(data.reference, 9, regular, muted);
  if (data.facts?.length) {
    y -= 8;
    writeFacts(data.facts);
  }
  if (data.warning) {
    y -= 10;
    write(data.warning, 11, bold, gold);
  }
  if (data.breakdown?.rows.length) writeBreakdown(data.breakdown);
  for (const section of data.sections) {
    if (!section.paragraphs.length) continue;
    ensure(65);
    y -= 18;
    write(section.heading, 13, bold);
    y -= 4;
    for (const paragraph of section.paragraphs) write(paragraph, 11, regular);
  }
  const pages = pdf.getPages();
  pages.forEach((item, index) =>
    item.drawText(`SILKinCOM Experience  |  ${index + 1} / ${pages.length}`, {
      x: margin,
      y: 30,
      font: regular,
      size: 9,
      color: muted,
    }),
  );
  pdf.setTitle("SILKinCOM Experience");
  pdf.setAuthor("SILKinCOM");
  return pdf.save();
}
