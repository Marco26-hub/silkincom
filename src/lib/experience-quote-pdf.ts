import {
  PDFDocument,
  PDFHexString,
  PDFName,
  StandardFonts,
  rgb,
  type PDFDropdown,
  type PDFFont,
  type PDFTextField,
} from "pdf-lib";

type ExperiencePdfData = {
  title: string;
  status: string;
  summary: { label: string; value: string; note?: string };
  reference?: string;
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
  supplierServices?: { title: string; format?: string }[];
  documentDate?: Date;
  sections: { heading: string; paragraphs: string[] }[];
  warning?: string;
};

export type QuotePdfData = Omit<ExperiencePdfData, "summary"> & {
  total: string;
  totalLabel: string;
  validity: string;
};

export function renderQuotePdf({
  total,
  totalLabel,
  validity,
  ...data
}: QuotePdfData) {
  return renderExperiencePdf({
    ...data,
    summary: { label: totalLabel, value: total, note: validity },
  });
}

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

export async function renderExperiencePdf(data: ExperiencePdfData) {
  const pdf = await PDFDocument.create();
  if (data.documentDate) {
    pdf.setCreationDate(data.documentDate);
    pdf.setModificationDate(data.documentDate);
  }
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
  const isSupplierForm = Boolean(data.supplierServices?.length);
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
  function writeFacts(facts: NonNullable<ExperiencePdfData["facts"]>) {
    const size = isSupplierForm ? 11.5 : 10;
    const leading = size * 1.5;
    const labelWidth = isSupplierForm ? 140 : 124;
    for (const { label, value } of facts) {
      const labels = wrap(label, size, bold, labelWidth - 14);
      const values = wrap(value, size, regular, column - labelWidth);
      const rowHeight = Math.max(labels.length, values.length) * leading;
      ensure(rowHeight);
      labels.forEach((line, index) => {
        if (line)
          page.drawText(line, {
            x: margin,
            y: y - size - index * leading,
            size,
            font: bold,
            color: muted,
          });
      });
      values.forEach((line, index) => {
        if (line)
          page.drawText(line, {
            x: margin + labelWidth,
            y: y - size - index * leading,
            size,
            font: regular,
            color: dark,
          });
      });
      y -= rowHeight;
    }
  }
  function writeBreakdown(table: NonNullable<ExperiencePdfData["breakdown"]>) {
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
  function writeSupplierForm(
    services: NonNullable<ExperiencePdfData["supplierServices"]>,
  ) {
    const form = pdf.getForm();
    const autoFitFields: PDFTextField[] = [];
    const padding = 8;
    const availabilityPlaceholder = "Selezioni…";
    const columns = [
      {
        key: "tariffa_oraria",
        label: "Tariffa oraria",
        unit: "€/ora",
        width: 79,
        max: 11,
      },
      {
        key: "tariffa_forfait",
        label: "Tariffa a forfait",
        unit: "€ totali",
        width: 88,
        max: 11,
      },
      {
        key: "disponibilita",
        label: "Disponibilità",
        width: 106,
        options: [
          availabilityPlaceholder,
          "Disponibile",
          "Da confermare",
          "Non disponibile",
        ],
      },
      {
        key: "orario",
        label: "Giorno e orario",
        unit: "Facoltativi",
        width: 101,
        max: 48,
        multiline: true,
      },
    ];
    const serviceWidth =
      column - columns.reduce((sum, item) => sum + item.width, 0);

    function mountField(
      input: PDFTextField | PDFDropdown,
      label: string,
      x: number,
      top: number,
      width: number,
      fieldHeight: number,
    ) {
      input.acroField.dict.set(PDFName.of("TU"), PDFHexString.fromText(label));
      input.addToPage(page, {
        x,
        y: top - fieldHeight,
        width,
        height: fieldHeight,
        font: regular,
        textColor: dark,
        borderColor: gold,
        borderWidth: 0.7,
        backgroundColor: rgb(1, 0.99, 0.97),
      });
      input.setFontSize(11.5);
    }
    function field(
      name: string,
      label: string,
      x: number,
      top: number,
      width: number,
      fieldHeight: number,
      max: number,
      multiline = false,
    ) {
      const input = form.createTextField(name);
      input.setMaxLength(max);
      input.disableScrolling();
      if (multiline) {
        input.enableMultiline();
        autoFitFields.push(input);
      }
      mountField(input, label, x, top, width, fieldHeight);
    }
    function tableHeader() {
      const rowHeight = 36;
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: column,
        height: rowHeight,
        color: dark,
      });
      let x = margin;
      [
        { label: "Servizio richiesto", width: serviceWidth, unit: undefined },
        ...columns,
      ].forEach((item) => {
        page.drawText(item.label, {
          x: x + padding,
          y: y - (item.unit ? 15 : 22),
          size: 11,
          font: bold,
          color: rgb(1, 1, 1),
        });
        if (item.unit) {
          page.drawText(item.unit, {
            x: x + padding,
            y: y - 28,
            size: 9.5,
            font: regular,
            color: rgb(0.92, 0.9, 0.85),
          });
        }
        x += item.width;
      });
      y -= rowHeight;
    }

    ensure(150);
    y -= 12;
    const taxLabel = "Importi IVA inclusa";
    page.drawText(taxLabel, {
      x: width - margin - bold.widthOfTextAtSize(taxLabel, 11),
      y: y - 15,
      font: bold,
      size: 11,
      color: gold,
    });
    write("Servizi da quotare", 15, bold);
    write(
      "Per ogni servizio, scelga la disponibilità dal menu e indichi una o entrambe le tariffe.",
      11.5,
      regular,
      muted,
    );
    write(
      "Salvi il PDF compilato e lo restituisca a SILKinCOM.",
      11.5,
      regular,
      muted,
    );
    y -= 6;
    tableHeader();
    services.forEach(({ title, format }, index) => {
      const names = wrap(title, 11.5, bold, serviceWidth - padding * 2);
      const formats = format
        ? wrap(format, 10.5, regular, serviceWidth - padding * 2)
        : [];
      const rowHeight = Math.max(
        52,
        names.length * 15 + formats.length * 14 + 16,
      );
      if (y - rowHeight < 56) {
        ensure(rowHeight + 64);
        write("Servizi da quotare", 15, bold);
        y -= 5;
        tableHeader();
      }
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: column,
        height: rowHeight,
        color: index % 2 === 0 ? rgb(0.97, 0.95, 0.91) : rgb(1, 1, 1),
      });
      names.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: margin + padding,
          y: y - 19 - lineIndex * 15,
          size: 11.5,
          font: bold,
          color: dark,
        });
      });
      formats.forEach((line, lineIndex) => {
        page.drawText(line, {
          x: margin + padding,
          y: y - 19 - names.length * 15 - lineIndex * 14,
          size: 10.5,
          font: regular,
          color: muted,
        });
      });
      let x = margin + serviceWidth;
      for (const item of columns) {
        const fieldHeight = item.multiline ? 46 : 30;
        const name = `servizio_${index + 1}_${item.key}`;
        const label = `${item.label}${item.unit ? ` (${item.unit})` : ""} – ${title}`;
        const top = y - (rowHeight - fieldHeight) / 2;
        if (item.options) {
          const dropdown = form.createDropdown(name);
          dropdown.setOptions(item.options);
          dropdown.select(availabilityPlaceholder);
          mountField(dropdown, label, x + 4, top, item.width - 8, fieldHeight);
        } else {
          field(
            name,
            label,
            x + 4,
            top,
            item.width - 8,
            fieldHeight,
            item.max,
            item.multiline,
          );
        }
        x += item.width;
      }
      y -= rowHeight;
    });

    ensure(242);
    y -= 18;
    write("Dettagli dell’offerta", 15, bold);
    const gap = 12;
    const shortWidth = (column - gap) / 2;
    const shortFields = [
      { key: "aliquota_iva", label: "Aliquota IVA applicata (%)" },
      { key: "validita", label: "Offerta valida fino al" },
    ];
    shortFields.forEach((item, index) => {
      const x = margin + index * (shortWidth + gap);
      page.drawText(item.label, {
        x,
        y: y - 11,
        font: bold,
        size: 11,
        color: dark,
      });
      field(item.key, item.label, x, y - 16, shortWidth, 27, 48);
    });
    y -= 51;

    for (const item of [
      { key: "inclusioni_extra", label: "Servizi inclusi ed eventuali extra" },
      { key: "condizioni", label: "Condizioni di annullamento e altre note" },
    ]) {
      ensure(76);
      write(item.label, 11, bold);
      field(item.key, item.label, margin, y, column, 48, 200, true);
      y -= 58;
    }
    form.updateFieldAppearances(regular);
    form.acroForm.dict.set(
      PDFName.of("DR"),
      pdf.context.obj({ Font: { [regular.name]: regular.ref } }),
    );
    // Keep the printable appearances and let the PDF reader size multiline input.
    for (const input of autoFitFields) input.acroField.setFontSize(0);
  }
  header();
  write(data.status, 10, bold, gold);
  write(data.title, 28, display);
  y -= 15;
  const summaryHeight = isSupplierForm ? 64 : data.summary.note ? 98 : 81;
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
  write(data.summary.label, 11, bold, gold);
  write(data.summary.value, isSupplierForm ? 21 : 28, display);
  if (data.summary.note) write(data.summary.note, 11, regular, muted);
  y = summaryBottom - 12;
  if (data.reference) write(data.reference, 9, regular, muted);
  if (data.facts?.length) {
    y -= 8;
    writeFacts(data.facts);
  }
  if (data.warning) {
    y -= 10;
    write(data.warning, 11, bold, gold);
  }
  if (data.breakdown?.rows.length) writeBreakdown(data.breakdown);
  if (data.supplierServices?.length) writeSupplierForm(data.supplierServices);
  for (const section of data.sections) {
    if (!section.paragraphs.length) continue;
    ensure(65);
    y -= 18;
    write(section.heading, 13, bold);
    y -= 4;
    for (const paragraph of section.paragraphs) write(paragraph, 11, regular);
  }
  const pages = pdf.getPages();
  const footerReference = isSupplierForm ? `  |  ${data.summary.value}` : "";
  pages.forEach((item, index) =>
    item.drawText(
      `SILKinCOM Experience  |  ${index + 1} / ${pages.length}${footerReference}`,
      {
        x: margin,
        y: 30,
        font: regular,
        size: 9,
        color: muted,
      },
    ),
  );
  pdf.setTitle("SILKinCOM Experience");
  pdf.setAuthor("SILKinCOM");
  return pdf.save();
}
