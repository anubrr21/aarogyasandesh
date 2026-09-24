import { COLORS, MARGIN, drawCallout, drawSectionTitle, ensureSpace, formatDateTimeLong } from './pdfBranding';
import { splitSections } from './familySummary';

const FONT_STACK = '"Noto Sans Devanagari", "Nirmala UI", "Mangal", "Kohinoor Devanagari", "Segoe UI", sans-serif';
const PX_PER_MM = 9;
const BODY_PX = 3.4 * PX_PER_MM;
const TITLE_PX = 2.9 * PX_PER_MM;

const cssColor = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  text.split('\n').forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      return;
    }
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    lines.push(line);
  });
  return lines;
}

async function renderTextCard({ title, body, widthMm }) {
  const width = Math.round(widthMm * PX_PER_MM);
  try {
    await document.fonts?.load(`${BODY_PX}px ${FONT_STACK}`, body.slice(0, 24));
  } catch {
    /* fall back to whichever font the system provides */
  }

  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `${BODY_PX}px ${FONT_STACK}`;
  const lines = wrapLines(probe, body, width);
  const lineHeight = BODY_PX * 1.6;
  const titleHeight = title ? TITLE_PX * 1.9 : 0;
  const topPad = Math.ceil(TITLE_PX * 0.45);
  const height = Math.ceil(topPad + titleHeight + lines.length * lineHeight + PX_PER_MM * 0.6);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';

  let cursor = topPad;
  if (title) {
    ctx.font = `bold ${TITLE_PX}px ${FONT_STACK}`;
    ctx.fillStyle = cssColor(COLORS.BRASS);
    ctx.fillText(title, 0, cursor);
    cursor += titleHeight;
  }
  ctx.font = `${BODY_PX}px ${FONT_STACK}`;
  ctx.fillStyle = cssColor(COLORS.INK);
  lines.forEach((line) => {
    ctx.fillText(line, 0, cursor);
    cursor += lineHeight;
  });

  return { dataUrl: canvas.toDataURL('image/png'), widthMm, heightMm: height / PX_PER_MM };
}

async function drawImageCards(doc, y, text) {
  const pageWidth = doc.internal.pageSize.width;
  const cardWidth = pageWidth - MARGIN * 2;
  for (const section of splitSections(text)) {
    const image = await renderTextCard({ title: section.title, body: section.body, widthMm: cardWidth - 14 });
    const height = image.heightMm + 9;
    y = ensureSpace(doc, y, height + 2);
    doc.setFillColor(...COLORS.TINT);
    doc.setDrawColor(...COLORS.HAIR);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, y, cardWidth, height, 2, 2, 'FD');
    doc.setFillColor(...COLORS.BRASS);
    doc.roundedRect(MARGIN, y, 2, height, 1, 1, 'F');
    doc.addImage(image.dataUrl, 'PNG', MARGIN + 7, y + 4.5, image.widthMm, image.heightMm, undefined, 'FAST');
    y += height + 4;
  }
  return y;
}

export async function drawFamilySummary(doc, y, familySummary) {
  y = drawSectionTitle(doc, y, 'In Simple Words');
  for (const section of splitSections(familySummary.english)) {
    y = drawCallout(doc, y, { title: section.title || 'Summary', text: section.body, accent: COLORS.FOREST, textSize: 8.8 }) + 4;
  }

  if (familySummary.hindi) {
    y = drawSectionTitle(doc, y + 2, 'In Simple Words - Hindi');
    y = await drawImageCards(doc, y, familySummary.hindi);
  }

  y = ensureSpace(doc, y, 6);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(...COLORS.MUTED);
  const approver = familySummary.approvedByRole ? `${familySummary.approvedByRole}` : 'hospital team';
  doc.text(`Drafted from hospital records, reviewed and approved by the ${approver} on ${formatDateTimeLong(familySummary.approvedAt)}. It does not replace medical advice.`, MARGIN, y);
  return y + 4;
}
