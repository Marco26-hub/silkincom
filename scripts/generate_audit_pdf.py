#!/usr/bin/env python3
"""Generate luxury-styled audit PDF combining all 4 audit markdown reports."""
import re
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Frame, PageTemplate, BaseDocTemplate, FrameBreak
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ========== Brand palette ==========
GOLD = HexColor('#D4AF37')
GOLD_DARK = HexColor('#A87F1E')
SOFT_BLACK = HexColor('#1A1A1A')
WARM_WHITE = HexColor('#FAF8F4')
IVORY = HexColor('#F5F0E8')
PEARL = HexColor('#E8E2D4')
TEXT_GREY = HexColor('#4A4A4A')
TEXT_LIGHT = HexColor('#6B6B6B')

ROOT = Path('/Users/md/silkincom_claude')
OUT = ROOT / 'SILKINCOM-AUDIT-REPORT.pdf'

# ========== Page setup ==========
PAGE_W, PAGE_H = A4
MARGIN_X = 22 * mm
MARGIN_Y = 25 * mm

# ========== Styles ==========
styles = getSampleStyleSheet()

H1 = ParagraphStyle('H1', parent=styles['Heading1'],
    fontName='Times-Roman', fontSize=26, textColor=SOFT_BLACK,
    spaceBefore=18, spaceAfter=10, leading=32, alignment=TA_LEFT)
H2 = ParagraphStyle('H2', parent=styles['Heading2'],
    fontName='Times-Roman', fontSize=18, textColor=SOFT_BLACK,
    spaceBefore=14, spaceAfter=8, leading=22)
H3 = ParagraphStyle('H3', parent=styles['Heading3'],
    fontName='Times-Bold', fontSize=12, textColor=GOLD_DARK,
    spaceBefore=10, spaceAfter=4, leading=16)
H4 = ParagraphStyle('H4', parent=styles['Heading4'],
    fontName='Times-Italic', fontSize=11, textColor=SOFT_BLACK,
    spaceBefore=8, spaceAfter=3, leading=14)
BODY = ParagraphStyle('Body', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9.5, textColor=TEXT_GREY,
    leading=14, spaceAfter=6, alignment=TA_JUSTIFY)
BULLET = ParagraphStyle('Bullet', parent=BODY,
    leftIndent=14, firstLineIndent=-10, spaceAfter=3)
EYEBROW = ParagraphStyle('Eyebrow', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=8, textColor=GOLD_DARK,
    spaceAfter=6, alignment=TA_LEFT, leading=12)
EYEBROW_C = ParagraphStyle('EyebrowC', parent=EYEBROW, alignment=TA_CENTER)
COVER_TITLE = ParagraphStyle('CoverTitle', parent=styles['Title'],
    fontName='Times-Roman', fontSize=46, textColor=SOFT_BLACK,
    leading=54, alignment=TA_CENTER, spaceAfter=8)
COVER_SUB = ParagraphStyle('CoverSub', parent=styles['Normal'],
    fontName='Times-Italic', fontSize=18, textColor=GOLD_DARK,
    leading=24, alignment=TA_CENTER, spaceAfter=20)
COVER_META = ParagraphStyle('CoverMeta', parent=styles['Normal'],
    fontName='Helvetica', fontSize=10, textColor=TEXT_LIGHT,
    leading=16, alignment=TA_CENTER)
SCORE_BIG = ParagraphStyle('ScoreBig', parent=styles['Title'],
    fontName='Times-Roman', fontSize=96, textColor=GOLD,
    leading=110, alignment=TA_CENTER, spaceAfter=4)
SCORE_LBL = ParagraphStyle('ScoreLbl', parent=styles['Normal'],
    fontName='Helvetica', fontSize=10, textColor=TEXT_LIGHT,
    leading=14, alignment=TA_CENTER, spaceAfter=4)
SCORE_GRADE = ParagraphStyle('ScoreGrade', parent=styles['Normal'],
    fontName='Times-Italic', fontSize=20, textColor=SOFT_BLACK,
    leading=26, alignment=TA_CENTER)
QUOTE = ParagraphStyle('Quote', parent=styles['Normal'],
    fontName='Times-Italic', fontSize=11, textColor=TEXT_GREY,
    leading=18, leftIndent=20, rightIndent=20, alignment=TA_CENTER,
    spaceBefore=8, spaceAfter=8)


def hrule(color=GOLD, width=0.5, thickness=0.4):
    return HRFlowable(width=width * (PAGE_W - 2*MARGIN_X), thickness=thickness,
                      color=color, spaceBefore=4, spaceAfter=4,
                      hAlign='LEFT')


def hrule_center(width_mm=14, thickness=0.6):
    return HRFlowable(width=width_mm * mm, thickness=thickness,
                      color=GOLD, spaceBefore=8, spaceAfter=8,
                      hAlign='CENTER')


# ========== Markdown parsing ==========
def parse_inline(text):
    """Parse inline markdown: **bold**, *italic*, `code`, [link](url)."""
    # Escape XML special chars first (but preserve already-existing tags)
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;').replace('>', '&gt;')
    # Bold **text**
    text = re.sub(r'\*\*([^\*]+)\*\*', r'<b>\1</b>', text)
    # Italic *text* (avoid matching ** sequences)
    text = re.sub(r'(?<!\*)\*([^\*]+)\*(?!\*)', r'<i>\1</i>', text)
    # Code `text`
    text = re.sub(r'`([^`]+)`', r'<font name="Courier" size="9" color="#A87F1E">\1</font>', text)
    # Links [text](url) - just show the text, drop URL for clean PDF
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'<font color="#A87F1E"><u>\1</u></font>', text)
    return text


def parse_table_row(line):
    """Parse a markdown table row into cells."""
    cells = [c.strip() for c in line.strip('|').split('|')]
    return cells


def md_table_to_flowable(table_lines):
    """Convert collected table lines to a reportlab Table."""
    if len(table_lines) < 2:
        return None
    header = parse_table_row(table_lines[0])
    # Skip separator line (---)
    rows = []
    for line in table_lines[2:]:
        if line.strip().startswith('|'):
            rows.append(parse_table_row(line))

    # Build paragraphs for cells
    cell_style_h = ParagraphStyle('CellH', fontName='Helvetica-Bold', fontSize=8.5,
        textColor=white, leading=11, alignment=TA_LEFT)
    cell_style = ParagraphStyle('Cell', fontName='Helvetica', fontSize=8.5,
        textColor=TEXT_GREY, leading=11, alignment=TA_LEFT)

    data = []
    data.append([Paragraph(parse_inline(h), cell_style_h) for h in header])
    for row in rows:
        # Pad row to match header length
        while len(row) < len(header):
            row.append('')
        data.append([Paragraph(parse_inline(c), cell_style) for c in row[:len(header)]])

    avail = PAGE_W - 2*MARGIN_X
    n = len(header)
    col_widths = [avail / n] * n
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SOFT_BLACK),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('FONTSIZE', (0,0), (-1,-1), 8.5),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WARM_WHITE, white]),
        ('LINEBELOW', (0,0), (-1,0), 0.6, GOLD),
        ('LINEABOVE', (0,1), (-1,-1), 0.2, PEARL),
        ('BOX', (0,0), (-1,-1), 0.4, PEARL),
    ]))
    return t


def md_to_flowables(md_text, suppress_h1=False):
    """Convert markdown text to list of reportlab flowables."""
    out = []
    lines = md_text.split('\n')
    i = 0
    in_code = False
    code_buf = []
    table_buf = []
    list_buf = []

    def flush_list():
        nonlocal list_buf
        if list_buf:
            for item in list_buf:
                out.append(Paragraph(f'<font color="#D4AF37">•</font>&nbsp;&nbsp;{parse_inline(item)}', BULLET))
            list_buf = []

    def flush_table():
        nonlocal table_buf
        if table_buf:
            t = md_table_to_flowable(table_buf)
            if t:
                out.append(Spacer(1, 4))
                out.append(t)
                out.append(Spacer(1, 8))
            table_buf = []

    while i < len(lines):
        line = lines[i]

        # Code blocks
        if line.startswith('```'):
            if in_code:
                # Close
                code_text = '\n'.join(code_buf)
                code_style = ParagraphStyle('Code', fontName='Courier', fontSize=8.5,
                    textColor=SOFT_BLACK, leading=11, leftIndent=10, rightIndent=10,
                    backColor=IVORY, borderPadding=8, spaceBefore=4, spaceAfter=8)
                # Convert code to safe paragraph
                safe = code_text.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('\n','<br/>')
                out.append(Paragraph(safe, code_style))
                code_buf = []
                in_code = False
            else:
                flush_list(); flush_table()
                in_code = True
            i += 1; continue
        if in_code:
            code_buf.append(line); i += 1; continue

        # Tables
        if line.strip().startswith('|') and '|' in line.strip()[1:]:
            flush_list()
            table_buf.append(line)
            i += 1; continue
        else:
            flush_table()

        stripped = line.strip()

        # Headings
        if stripped.startswith('# '):
            flush_list(); flush_table()
            if not suppress_h1:
                out.append(Paragraph(parse_inline(stripped[2:]), H1))
                out.append(hrule(GOLD, 0.18, 0.8))
            i += 1; continue
        if stripped.startswith('## '):
            flush_list(); flush_table()
            out.append(Spacer(1, 6))
            out.append(Paragraph(parse_inline(stripped[3:]), H2))
            out.append(hrule(PEARL, 0.5, 0.4))
            i += 1; continue
        if stripped.startswith('### '):
            flush_list(); flush_table()
            out.append(Paragraph(parse_inline(stripped[4:]), H3))
            i += 1; continue
        if stripped.startswith('#### '):
            flush_list(); flush_table()
            out.append(Paragraph(parse_inline(stripped[5:]), H4))
            i += 1; continue

        # Horizontal rule
        if stripped in ('---', '***', '___'):
            flush_list(); flush_table()
            out.append(hrule(PEARL, 1.0, 0.3))
            i += 1; continue

        # Lists
        m = re.match(r'^[\-\*\+]\s+(.*)', stripped)
        if m:
            list_buf.append(m.group(1))
            i += 1; continue
        m = re.match(r'^(\d+)\.\s+(.*)', stripped)
        if m:
            list_buf.append(f'<b>{m.group(1)}.</b> {m.group(2)}')
            i += 1; continue

        flush_list()

        # Blockquote
        if stripped.startswith('> '):
            out.append(Paragraph(parse_inline(stripped[2:]), QUOTE))
            i += 1; continue

        # Empty line
        if stripped == '':
            out.append(Spacer(1, 4))
            i += 1; continue

        # Plain paragraph
        out.append(Paragraph(parse_inline(stripped), BODY))
        i += 1

    flush_list()
    flush_table()
    return out


# ========== Page decoration ==========
def first_page(canv, doc):
    canv.saveState()
    # Subtle gold accent at top and bottom
    canv.setStrokeColor(GOLD)
    canv.setLineWidth(0.6)
    canv.line(MARGIN_X, PAGE_H - 12*mm, MARGIN_X + 14*mm, PAGE_H - 12*mm)
    canv.line(PAGE_W - MARGIN_X - 14*mm, 12*mm, PAGE_W - MARGIN_X, 12*mm)
    canv.restoreState()


def later_page(canv, doc):
    canv.saveState()
    # Top eyebrow
    canv.setFont('Helvetica', 7)
    canv.setFillColor(TEXT_LIGHT)
    canv.drawString(MARGIN_X, PAGE_H - 12*mm, 'SILKINCOM — MARKETING & GEO AUDIT')
    canv.drawRightString(PAGE_W - MARGIN_X, PAGE_H - 12*mm, '2026.05.09')
    # Top hairline
    canv.setStrokeColor(PEARL)
    canv.setLineWidth(0.3)
    canv.line(MARGIN_X, PAGE_H - 14*mm, PAGE_W - MARGIN_X, PAGE_H - 14*mm)
    # Bottom page number (gold)
    canv.setFont('Helvetica', 8)
    canv.setFillColor(GOLD_DARK)
    canv.drawCentredString(PAGE_W/2, 12*mm, f'— {doc.page} —')
    canv.restoreState()


# ========== Cover page ==========
def build_cover():
    out = []
    out.append(Spacer(1, 50))
    out.append(Paragraph('MAISON SILKINCOM', EYEBROW_C))
    out.append(hrule_center(14, 0.8))
    out.append(Spacer(1, 10))
    out.append(Paragraph('Audit Strategico', COVER_TITLE))
    out.append(Paragraph('<i>Marketing · GEO · SEO · Competitive</i>', COVER_SUB))
    out.append(Spacer(1, 30))

    # Composite score block
    out.append(Paragraph('COMPOSITE SCORE', SCORE_LBL))
    out.append(Paragraph('63', SCORE_BIG))
    out.append(Paragraph('<font color="#6B6B6B">/ 100</font>', SCORE_LBL))
    out.append(Spacer(1, 6))
    out.append(Paragraph('<i>Grade C</i>', SCORE_GRADE))

    out.append(Spacer(1, 50))
    # Score breakdown table
    rows = [
        ['DOMINIO', 'SCORE', 'GRADE'],
        ['Marketing & Conversion', '65 / 100', 'C+'],
        ['GEO / AI Citability', '47 / 100', 'F+'],
        ['Technical SEO', '74 / 100', 'B'],
        ['Competitive Position', '66 / 100', 'C+'],
    ]
    cell = ParagraphStyle('cv', fontName='Helvetica', fontSize=10,
        textColor=TEXT_GREY, leading=14, alignment=TA_LEFT)
    cell_h = ParagraphStyle('cvh', fontName='Helvetica-Bold', fontSize=8,
        textColor=white, leading=12, alignment=TA_LEFT)
    cell_c = ParagraphStyle('cvc', fontName='Helvetica', fontSize=10,
        textColor=GOLD_DARK, leading=14, alignment=TA_CENTER)
    cell_hc = ParagraphStyle('cvhc', fontName='Helvetica-Bold', fontSize=8,
        textColor=white, leading=12, alignment=TA_CENTER)

    data = [
        [Paragraph(rows[0][0], cell_h), Paragraph(rows[0][1], cell_hc), Paragraph(rows[0][2], cell_hc)],
    ]
    for r in rows[1:]:
        data.append([Paragraph(r[0], cell), Paragraph(r[1], cell_c), Paragraph(r[2], cell_c)])

    avail = PAGE_W - 2*MARGIN_X - 30*mm
    t = Table(data, colWidths=[avail*0.55, avail*0.25, avail*0.20])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SOFT_BLACK),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [WARM_WHITE, white]),
        ('LINEABOVE', (0,1), (-1,-1), 0.2, PEARL),
        ('LINEBELOW', (0,0), (-1,0), 0.6, GOLD),
        ('BOX', (0,0), (-1,-1), 0.4, PEARL),
    ]))
    out.append(t)

    out.append(Spacer(1, 60))
    out.append(hrule_center(10, 0.5))
    out.append(Spacer(1, 8))
    out.append(Paragraph('silkincom.vercel.app', COVER_META))
    out.append(Paragraph('Audit eseguito · 9 Maggio 2026', COVER_META))
    out.append(Paragraph('<i>Confidential — Internal Use</i>', COVER_META))
    out.append(PageBreak())
    return out


# ========== TOC ==========
def build_toc():
    out = []
    out.append(Paragraph('INDICE', EYEBROW))
    out.append(hrule(GOLD, 0.18, 0.8))
    out.append(Spacer(1, 18))
    out.append(Paragraph('Contenuti', H1))
    out.append(Spacer(1, 18))

    items = [
        ('I.', 'Sommario Esecutivo', 'Panoramica strategica · score composito · top findings'),
        ('II.', 'Marketing & Conversion', 'Content · CTA · funnel · trust signals · pricing'),
        ('III.', 'GEO / AI Citability', 'Visibilità su ChatGPT · Claude · Perplexity · Google AI'),
        ('IV.', 'Technical SEO', 'Schema · sitemap · hreflang · CWV · accessibility'),
        ('V.', 'Competitive Landscape', 'Marinella · Faliero Sarti · Mantero · Ratti · Etro · Ferragamo'),
    ]

    cell_num = ParagraphStyle('tn', fontName='Times-Italic', fontSize=14,
        textColor=GOLD_DARK, leading=18, alignment=TA_LEFT)
    cell_t = ParagraphStyle('tt', fontName='Times-Roman', fontSize=14,
        textColor=SOFT_BLACK, leading=18)
    cell_d = ParagraphStyle('td', fontName='Helvetica', fontSize=8.5,
        textColor=TEXT_LIGHT, leading=12)

    data = []
    for num, title, desc in items:
        data.append([
            Paragraph(num, cell_num),
            [Paragraph(title, cell_t), Paragraph(desc, cell_d)],
        ])

    avail = PAGE_W - 2*MARGIN_X
    t = Table(data, colWidths=[20*mm, avail - 20*mm])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LINEBELOW', (0,0), (-1,-1), 0.2, PEARL),
    ]))
    out.append(t)
    out.append(PageBreak())
    return out


# ========== Section divider page ==========
def section_divider(roman, title, subtitle):
    out = []
    out.append(Spacer(1, 80))
    out.append(Paragraph(f'<font color="#A87F1E"><i>Sezione {roman}</i></font>',
        ParagraphStyle('sd', fontName='Times-Italic', fontSize=14,
            textColor=GOLD_DARK, alignment=TA_CENTER, leading=20)))
    out.append(hrule_center(14, 0.6))
    out.append(Spacer(1, 16))
    out.append(Paragraph(title, ParagraphStyle('sdt', fontName='Times-Roman',
        fontSize=36, textColor=SOFT_BLACK, alignment=TA_CENTER, leading=44)))
    out.append(Spacer(1, 14))
    out.append(Paragraph(f'<i>{subtitle}</i>', ParagraphStyle('sds',
        fontName='Times-Italic', fontSize=13, textColor=TEXT_LIGHT,
        alignment=TA_CENTER, leading=18)))
    out.append(PageBreak())
    return out


# ========== Build doc ==========
def main():
    story = []
    story += build_cover()
    story += build_toc()

    sections = [
        ('I.', 'Sommario Esecutivo', 'Panoramica strategica e priorità',
         'MARKETING-AUDIT-SUMMARY.md'),
        ('II.', 'Marketing & Conversion', 'Score 65/100 · Grade C+',
         'MARKETING-AUDIT.md'),
        ('III.', 'GEO / AI Citability', 'Score 47/100 · Grade F+',
         'GEO-CITABILITY-AUDIT.md'),
        ('IV.', 'Technical SEO', 'Score 74/100 · Grade B',
         'SEO-TECHNICAL-AUDIT.md'),
        ('V.', 'Competitive Landscape', 'Benchmark contro 7 brand di riferimento',
         'COMPETITORS-AUDIT.md'),
    ]

    for roman, title, subtitle, fname in sections:
        story += section_divider(roman, title, subtitle)
        path = ROOT / fname
        if path.exists():
            md = path.read_text(encoding='utf-8')
            story += md_to_flowables(md, suppress_h1=True)
        story.append(PageBreak())

    # Final page
    story.append(Spacer(1, 200))
    story.append(hrule_center(14, 0.6))
    story.append(Spacer(1, 12))
    story.append(Paragraph('FINE REPORT', ParagraphStyle('fin',
        fontName='Times-Italic', fontSize=14, textColor=GOLD_DARK,
        alignment=TA_CENTER, leading=20)))
    story.append(Spacer(1, 8))
    story.append(Paragraph('<i>Silkincom — Maison Italiana di Accessori in Seta</i>',
        ParagraphStyle('finsub', fontName='Times-Italic', fontSize=11,
            textColor=TEXT_LIGHT, alignment=TA_CENTER, leading=16)))
    story.append(Paragraph('<i>Cermenate · Como · Italia</i>',
        ParagraphStyle('finsub2', fontName='Times-Italic', fontSize=10,
            textColor=TEXT_LIGHT, alignment=TA_CENTER, leading=14)))

    # Build with custom page templates
    class AuditDoc(BaseDocTemplate):
        pass

    doc = AuditDoc(str(OUT), pagesize=A4,
        leftMargin=MARGIN_X, rightMargin=MARGIN_X,
        topMargin=MARGIN_Y, bottomMargin=MARGIN_Y,
        title='SILKinCOM Audit Report 2026',
        author='SILKinCOM Maison',
        subject='Marketing · GEO · SEO · Competitive Audit',
        creator='AI Audit Suite')

    frame = Frame(MARGIN_X, MARGIN_Y, PAGE_W - 2*MARGIN_X, PAGE_H - 2*MARGIN_Y,
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        showBoundary=0)
    doc.addPageTemplates([
        PageTemplate(id='Cover', frames=frame, onPage=first_page),
        PageTemplate(id='Body', frames=frame, onPage=later_page),
    ])

    # First page uses Cover template, subsequent use Body
    # Split: cover is first 1 page, then switch
    # Simplest: add a marker after cover; reportlab uses NextPageTemplate
    from reportlab.platypus.doctemplate import NextPageTemplate
    final_story = [NextPageTemplate('Body')]
    # Insert cover content under 'Cover' template by setting initial template
    # Reverse: put NextPageTemplate after first PageBreak (which is in cover)
    # Easier: skip cover-only template, just decorate first page differently using onPage
    # Use single template Body with page-aware decorator
    doc.pageTemplates = [PageTemplate(id='Body', frames=frame, onPage=lambda c,d: (first_page(c,d) if d.page==1 else later_page(c,d)))]

    doc.build(story)
    print(f'Generated {OUT} ({OUT.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
