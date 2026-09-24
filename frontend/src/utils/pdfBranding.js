import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import LogoUrl from '../assets/Logo.png';

export const HOSPITAL = {
  name: 'AarogyaSandesh',
  tagline: 'Real-Time Hospital-to-Family Transparency Platform for India',
  address: '123, Healthcare District, New Delhi - 110001',
  phone: '+91 8977039397',
  email: 'info@aarogyasandesh.com',
};

export const COLORS = {
  FOREST: [57, 100, 71],
  FOREST_DARK: [30, 56, 40],
  BRASS: [184, 134, 58],
  BRASS_LIGHT: [236, 219, 186],
  INK: [30, 38, 34],
  MUTED: [110, 116, 112],
  HAIR: [224, 219, 208],
  TINT: [246, 243, 234],
  ZEBRA: [250, 248, 243],
  DANGER: [178, 52, 52],
  SUCCESS: [38, 128, 78],
};

export const MARGIN = 18;
const LOGO_ALIAS = 'aarogyasandesh-logo';
let logoDataUrl = null;
let logoPromise = null;

export function preloadLogo() {
  if (logoPromise) return logoPromise;
  logoPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 360;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      canvas.getContext('2d').drawImage(img, 0, 0, size, size);
      logoDataUrl = canvas.toDataURL('image/png');
      resolve(logoDataUrl);
    };
    img.onerror = () => resolve(null);
    img.src = LogoUrl;
  });
  return logoPromise;
}

preloadLogo();

export function getLogoDataUrl() {
  return logoDataUrl;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowThousand(n) {
  const parts = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ''));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(' ');
}

function indianWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ');
}

export function amountInWords(amount) {
  const value = Math.abs(Math.round((Number(amount) || 0) * 100) / 100);
  const rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  let words = `Rupees ${indianWords(rupees)}`;
  if (paise) words += ` and ${indianWords(paise)} Paise`;
  return `${words} Only`;
}

export function formatRs(amount) {
  return `Rs. ${(Number(amount) || 0).toLocaleString('en-IN')}`;
}

function toDate(value) {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateLong(value) {
  const date = toDate(value);
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatDateShort(value) {
  const date = toDate(value);
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTimeLong(value) {
  const date = value ? toDate(value) : new Date();
  if (!date) return 'N/A';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function makeDocRef(prefix, patientKey, dateValue) {
  const slug = (patientKey || 'UNKNOWN').toString().replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'UNKNOWN';
  const date = toDate(dateValue) || new Date();
  return `${prefix}-${slug}-${date.toISOString().slice(0, 10).replace(/-/g, '')}`;
}

export function hexToRgb(hex) {
  const clean = (hex || '#6b9a79').replace('#', '');
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
}

export function drawQR(doc, text, x, y, size) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const count = qr.modules.size;
  const data = qr.modules.data;
  const cell = size / count;
  doc.setFillColor(...COLORS.INK);
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (data[row * count + col]) {
        doc.rect(x + col * cell, y + row * cell, cell + 0.02, cell + 0.02, 'F');
      }
    }
  }
}

export function drawHeader(doc, { docRef, qrText, gstin, verified = false }) {
  const w = doc.internal.pageSize.width;

  doc.setFillColor(...COLORS.FOREST_DARK);
  doc.rect(0, 0, w, 46, 'F');
  doc.setFillColor(...COLORS.FOREST);
  doc.lines([[w * 0.36, 0], [0, 46], [-w * 0.5, 0]], w * 0.64, 0, [1, 1], 'F', true);
  doc.setFillColor(...COLORS.BRASS);
  doc.rect(0, 46, w, 1.4, 'F');

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN - 2, 6, 34, 34, 4, 4, 'F');
  doc.setDrawColor(...COLORS.BRASS);
  doc.setLineWidth(0.6);
  doc.roundedRect(MARGIN - 2, 6, 34, 34, 4, 4, 'S');
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', MARGIN + 0.5, 8.5, 29, 29, LOGO_ALIAS, 'FAST');
  }

  const textX = MARGIN + 38;
  doc.setFont('times', 'bold');
  doc.setFontSize(25);
  doc.setTextColor(255, 255, 255);
  doc.text('Aarogya Sandesh', textX, 19);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...COLORS.BRASS_LIGHT);
  doc.text('A HEALTH UPDATE, DELIVERED', textX, 25.4, { charSpace: 1.5 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  doc.setTextColor(226, 233, 228);
  doc.text(HOSPITAL.address, textX, 31.6);
  doc.text(`Phone: ${HOSPITAL.phone}   |   ${HOSPITAL.email}`, textX, 36);
  if (gstin) doc.text(gstin, textX, 40.4);

  const qrCardX = w - MARGIN - 32;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrCardX, 6, 32, 35, 3, 3, 'F');
  drawQR(doc, qrText, qrCardX + 4, 9, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.8);
  doc.setTextColor(...COLORS.MUTED);
  doc.text(verified ? 'SCAN TO VERIFY' : 'DOCUMENT REF', qrCardX + 16, 35.4, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.2);
  doc.setTextColor(...COLORS.FOREST);
  doc.text(docRef, qrCardX + 16, 38.4, { align: 'center', maxWidth: 30 });
}

export function drawDocTitle(doc, y, { title, tag, right1, right2 }) {
  const w = doc.internal.pageSize.width;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  const rightWidth = right1 ? doc.getTextWidth(right1) : 0;
  const available = w - MARGIN * 2 - rightWidth - 8;
  let titleSize = 18;
  doc.setFontSize(titleSize);
  const titleWidth = doc.getTextWidth(title) + title.length * 0.4;
  if (titleWidth > available) titleSize = Math.max(11, (titleSize * available) / titleWidth);
  doc.setFontSize(titleSize);
  doc.setTextColor(...COLORS.FOREST_DARK);
  doc.text(title, MARGIN, y + 8, { charSpace: 0.4 });
  doc.setFillColor(...COLORS.BRASS);
  doc.rect(MARGIN, y + 11, 16, 1, 'F');
  if (tag) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(tag, MARGIN, y + 16.2, { charSpace: 0.8 });
  }
  if (right1) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.FOREST);
    doc.text(right1, w - MARGIN, y + 6.6, { align: 'right' });
  }
  if (right2) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.4);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(right2, w - MARGIN, y + 11.6, { align: 'right' });
  }
  return y + 19;
}

export function ensureSpace(doc, y, needed) {
  if (y + needed > 277) {
    doc.addPage();
    return 28;
  }
  return y;
}

export function drawMetaStrip(doc, y, items) {
  const w = doc.internal.pageSize.width;
  const width = w - MARGIN * 2;
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);

  doc.setFillColor(...COLORS.TINT);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, width, 12, 1.8, 1.8, 'FD');

  let offset = 0;
  items.forEach((item, index) => {
    const colStart = MARGIN + offset;
    const x = colStart + 4;
    offset += (width * (item.weight || 1)) / totalWeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(item.label.toUpperCase(), x, y + 4.6, { charSpace: 0.3 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...(item.color || COLORS.INK));
    doc.text(String(item.value), x, y + 9);
    if (index > 0) {
      doc.setDrawColor(...COLORS.HAIR);
      doc.line(colStart, y + 2.5, colStart, y + 9.5);
    }
  });

  return y + 12;
}

export function drawSectionTitle(doc, y, text) {
  const w = doc.internal.pageSize.width;
  y = ensureSpace(doc, y, 20);
  doc.setFillColor(...COLORS.BRASS);
  doc.rect(MARGIN, y - 3.4, 1.6, 4.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.FOREST_DARK);
  doc.text(text.toUpperCase(), MARGIN + 4.2, y, { charSpace: 0.5 });
  const textEnd = MARGIN + 4.2 + doc.getTextWidth(text.toUpperCase()) + text.length * 0.18 + 3;
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.25);
  doc.line(textEnd, y - 1.1, w - MARGIN, y - 1.1);
  return y + 5;
}

export function drawInfoGrid(doc, y, fields, cols = 3) {
  const w = doc.internal.pageSize.width;
  const width = w - MARGIN * 2;
  const colWidth = width / cols;
  const padX = 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.6);

  const prepared = fields.map((field) => ({
    label: field.label,
    lines: doc.splitTextToSize(String(field.value ?? 'N/A'), colWidth - padX * 2),
  }));
  const rows = [];
  for (let i = 0; i < prepared.length; i += cols) rows.push(prepared.slice(i, i + cols));
  const rowHeights = rows.map((row) => 9.6 + Math.max(...row.map((f) => f.lines.length)) * 4);
  const total = rowHeights.reduce((sum, h) => sum + h, 0) + 1.5;

  y = ensureSpace(doc, y, total);
  doc.setFillColor(...COLORS.TINT);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, width, total, 2, 2, 'FD');

  let rowTop = y + 0.75;
  rows.forEach((row, rowIndex) => {
    row.forEach((field, colIndex) => {
      const x = MARGIN + colIndex * colWidth + padX;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.3);
      doc.setTextColor(...COLORS.MUTED);
      doc.text(field.label.toUpperCase(), x, rowTop + 4.6, { charSpace: 0.3 });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.6);
      doc.setTextColor(...COLORS.INK);
      doc.text(field.lines, x, rowTop + 9);
      if (colIndex > 0) {
        doc.setDrawColor(...COLORS.HAIR);
        doc.line(MARGIN + colIndex * colWidth, rowTop + 2, MARGIN + colIndex * colWidth, rowTop + rowHeights[rowIndex] - 2);
      }
    });
    rowTop += rowHeights[rowIndex];
    if (rowIndex < rows.length - 1) {
      doc.setDrawColor(...COLORS.HAIR);
      doc.line(MARGIN + 3, rowTop, w - MARGIN - 3, rowTop);
    }
  });

  return y + total;
}

export function drawCallout(doc, y, { title, text, accent = COLORS.BRASS, fill = COLORS.TINT, textSize = 8.6 }) {
  const w = doc.internal.pageSize.width;
  const width = w - MARGIN * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(textSize);
  const lines = doc.splitTextToSize(String(text), width - 14);
  const height = 11 + lines.length * (textSize * 0.5) + 2;

  y = ensureSpace(doc, y, height);
  doc.setFillColor(...fill);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, width, height, 2, 2, 'FD');
  doc.setFillColor(...accent);
  doc.roundedRect(MARGIN, y, 2, height, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...accent);
  doc.text(title.toUpperCase(), MARGIN + 7, y + 5.6, { charSpace: 0.5 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(textSize);
  doc.setTextColor(...COLORS.INK);
  doc.text(lines, MARGIN + 7, y + 10.8);
  return y + height;
}

export function drawTiles(doc, y, tiles) {
  const w = doc.internal.pageSize.width;
  const gap = 4;
  const tileWidth = (w - MARGIN * 2 - gap * (tiles.length - 1)) / tiles.length;
  y = ensureSpace(doc, y, 20);
  tiles.forEach((tile, index) => {
    const x = MARGIN + index * (tileWidth + gap);
    doc.setFillColor(...(tile.fill || COLORS.TINT));
    doc.setDrawColor(...COLORS.HAIR);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, tileWidth, 17, 2, 2, 'FD');
    doc.setFillColor(...(tile.tone || COLORS.FOREST));
    doc.roundedRect(x, y, tileWidth, 1.6, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(tile.label.toUpperCase(), x + 4, y + 6.6, { charSpace: 0.4 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(...(tile.tone || COLORS.FOREST));
    doc.text(String(tile.value), x + 4, y + 13.4);
  });
  return y + 19;
}

export function drawTotalsBlock(doc, y, { rows, balanceLabel, balanceValue, due, words, statusText }) {
  const w = doc.internal.pageSize.width;
  const cardWidth = 86;
  const cardX = w - MARGIN - cardWidth;
  const height = 12 + rows.length * 6.4 + 13;

  y = ensureSpace(doc, y, height + 4);
  doc.setFillColor(...COLORS.TINT);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, w - MARGIN * 2 - cardWidth - 5, height, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.MUTED);
  doc.text(due ? 'BALANCE DUE IN WORDS' : 'REFUND DUE IN WORDS', MARGIN + 5, y + 6.4, { charSpace: 0.4 });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.4);
  doc.setTextColor(...COLORS.FOREST_DARK);
  const wordLines = doc.splitTextToSize(words, w - MARGIN * 2 - cardWidth - 15);
  doc.text(wordLines, MARGIN + 5, y + 12);
  if (statusText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.MUTED);
    doc.text('PAYMENT STATUS', MARGIN + 5, y + height - 9.4, { charSpace: 0.4 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...(due ? COLORS.DANGER : COLORS.SUCCESS));
    doc.text(statusText, MARGIN + 5, y + height - 4.6);
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.HAIR);
  doc.roundedRect(cardX, y, cardWidth, height, 2, 2, 'FD');
  let rowY = y + 8;
  rows.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(row.label, cardX + 5, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(row.tone || COLORS.INK));
    doc.text(row.value, cardX + cardWidth - 5, rowY, { align: 'right' });
    rowY += 6.4;
  });
  const bandY = y + height - 13;
  doc.setFillColor(...(due ? COLORS.DANGER : COLORS.FOREST));
  doc.roundedRect(cardX, bandY, cardWidth, 13, 2, 2, 'F');
  doc.rect(cardX, bandY, cardWidth, 4, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(balanceLabel.toUpperCase(), cardX + 5, bandY + 8.2, { charSpace: 0.3 });
  doc.setFontSize(13);
  doc.text(balanceValue, cardX + cardWidth - 5, bandY + 8.6, { align: 'right' });

  return y + height;
}

function rotatePoint(cx, cy, dx, dy, angle) {
  const rad = (angle * Math.PI) / 180;
  return [cx + dx * Math.cos(rad) + dy * Math.sin(rad), cy - dx * Math.sin(rad) + dy * Math.cos(rad)];
}

function rotatedRect(doc, cx, cy, width, height, angle) {
  const corners = [[-width / 2, -height / 2], [width / 2, -height / 2], [width / 2, height / 2], [-width / 2, height / 2]]
    .map(([dx, dy]) => rotatePoint(cx, cy, dx, dy, angle));
  const [start, ...rest] = corners;
  const segments = [];
  let previous = start;
  rest.forEach((point) => {
    segments.push([point[0] - previous[0], point[1] - previous[1]]);
    previous = point;
  });
  doc.lines(segments, start[0], start[1], [1, 1], 'S', true);
}

export function drawStamp(doc, cx, cy, { text, sub, color = COLORS.SUCCESS, angle = 10, width = 50, height = 17 }) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.82 }));
  doc.setDrawColor(...color);
  doc.setTextColor(...color);
  doc.setLineWidth(1);
  rotatedRect(doc, cx, cy, width, height, angle);
  doc.setLineWidth(0.3);
  rotatedRect(doc, cx, cy, width - 2.6, height - 2.6, angle);

  doc.setFont('helvetica', 'bold');
  let mainSize = 15;
  doc.setFontSize(mainSize);
  const naturalWidth = doc.getTextWidth(text) + text.length * 0.9;
  if (naturalWidth > width - 9) mainSize = (mainSize * (width - 9)) / naturalWidth;
  doc.setFontSize(mainSize);
  const [mx, my] = rotatePoint(cx, cy, 0, sub ? 0.6 : 2, angle);
  doc.text(text, mx, my, { align: 'center', angle, charSpace: 0.9 });
  if (sub) {
    doc.setFontSize(6.4);
    const [sx, sy] = rotatePoint(cx, cy, 0, 5.6, angle);
    doc.text(sub, sx, sy, { align: 'center', angle, charSpace: 0.6 });
  }
  doc.restoreGraphicsState();
}

function arcText(doc, text, cx, cy, radius, centerAngle, fontSize, bottom = false) {
  doc.setFontSize(fontSize);
  const chars = [...text];
  const widths = chars.map((ch) => doc.getTextWidth(ch) + 0.15);
  const sum = widths.reduce((s, item) => s + item, 0);
  const totalAngle = (sum / radius) * (180 / Math.PI);
  let cursor = 0;
  chars.forEach((ch, i) => {
    const mid = (cursor + widths[i] / 2) / sum;
    cursor += widths[i];
    const angle = bottom ? centerAngle + totalAngle / 2 - mid * totalAngle : centerAngle - totalAngle / 2 + mid * totalAngle;
    const rad = (angle * Math.PI) / 180;
    const px = cx + radius * Math.sin(rad);
    const py = cy - radius * Math.cos(rad);
    const tangent = bottom ? [-Math.cos(rad), -Math.sin(rad)] : [Math.cos(rad), Math.sin(rad)];
    const rotation = bottom ? 180 - angle : -angle;
    doc.text(ch, px - (widths[i] / 2) * tangent[0], py - (widths[i] / 2) * tangent[1], { angle: rotation });
  });
}

export function drawSeal(doc, cx, cy, radius = 17) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.9 }));
  doc.setDrawColor(...COLORS.FOREST);
  doc.setTextColor(...COLORS.FOREST);
  doc.setLineWidth(0.7);
  doc.circle(cx, cy, radius, 'S');
  doc.setLineWidth(0.25);
  doc.circle(cx, cy, radius - 1.4, 'S');
  doc.circle(cx, cy, radius - 6.2, 'S');

  doc.setFont('helvetica', 'bold');
  arcText(doc, 'HEALTH UPDATES, DELIVERED', cx, cy, radius - 3.6, 0, 4.6, false);
  arcText(doc, 'NEW DELHI - INDIA', cx, cy, radius - 2.9, 180, 4.4, true);

  doc.setFillColor(...COLORS.BRASS);
  doc.rect(cx - 0.55, cy - 5.6, 1.1, 3.2, 'F');
  doc.rect(cx - 1.6, cy - 4.55, 3.2, 1.1, 'F');

  doc.setTextColor(...COLORS.FOREST);
  doc.setFontSize(5.6);
  doc.text('AAROGYA', cx, cy + 0.2, { align: 'center' });
  doc.text('SANDESH', cx, cy + 3, { align: 'center' });
  doc.restoreGraphicsState();
}

export function drawSignatureBlock(doc, y, labels, { seal = false, stamp = null } = {}) {
  const w = doc.internal.pageSize.width;
  y = ensureSpace(doc, y, 36);
  const width = w - MARGIN * 2;
  const colWidth = width / labels.length;
  const lineY = y + 24;

  if (stamp) {
    const midStart = MARGIN + Math.floor(labels.length / 2) * colWidth;
    drawStamp(doc, midStart + colWidth / 2 - 4, lineY - 15, stamp);
  }
  if (seal) {
    const lastStart = MARGIN + (labels.length - 1) * colWidth;
    drawSeal(doc, lastStart + 3 + (colWidth - 11) / 2, lineY - 11, 12);
  }

  labels.forEach((label, index) => {
    const x = MARGIN + index * colWidth;
    doc.setDrawColor(...COLORS.MUTED);
    doc.setLineWidth(0.25);
    doc.line(x + 3, lineY, x + colWidth - 8, lineY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.INK);
    doc.text(label.title, x + 3, lineY + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(label.hint, x + 3, lineY + 8);
  });

  return lineY + 12;
}

export function drawNoteBox(doc, y, title, lines) {
  const w = doc.internal.pageSize.width;
  const width = w - MARGIN * 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const wrapped = lines.map((line) => doc.splitTextToSize(line, width - 14));
  const lineCount = wrapped.reduce((sum, chunk) => sum + chunk.length, 0);
  const height = 9 + lineCount * 3.7 + wrapped.length * 1.2;

  y = ensureSpace(doc, y, height);
  doc.setFillColor(...COLORS.TINT);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, width, height, 1.8, 1.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.FOREST);
  doc.text(title, MARGIN + 5, y + 5.6);

  let cursor = y + 10.4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.INK);
  wrapped.forEach((chunk) => {
    doc.setFillColor(...COLORS.BRASS);
    doc.circle(MARGIN + 6, cursor - 1, 0.6, 'F');
    doc.text(chunk, MARGIN + 9, cursor);
    cursor += chunk.length * 3.7 + 1.2;
  });

  return y + height;
}

export function drawCategoryBar(doc, y, breakdown) {
  const w = doc.internal.pageSize.width;
  const width = w - MARGIN * 2;
  y = ensureSpace(doc, y, 18);
  let x = MARGIN;
  breakdown.forEach((item, index) => {
    const segment = (width * item.percent) / 100;
    doc.setFillColor(...hexToRgb(item.color));
    doc.roundedRect(x, y, Math.max(segment, 0.6), 4.2, index === 0 || index === breakdown.length - 1 ? 1.2 : 0, 1.2, 'F');
    x += segment;
  });
  let legendX = MARGIN;
  let legendY = y + 9.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  breakdown.forEach((item) => {
    const label = `${item.category}  ${item.percent.toFixed(0)}%`;
    const itemWidth = doc.getTextWidth(label) + 9;
    if (legendX + itemWidth > w - MARGIN) {
      legendX = MARGIN;
      legendY += 5;
    }
    doc.setFillColor(...hexToRgb(item.color));
    doc.circle(legendX + 1.2, legendY - 1, 1.2, 'F');
    doc.setTextColor(...COLORS.INK);
    doc.text(label, legendX + 4, legendY);
    legendX += itemWidth;
  });
  return legendY + 4;
}

export function styledTable(doc, { startY, head, body, foot, rightCols = [], headFill = COLORS.FOREST, tableWidth, columnStyles = {}, onDrawCell, fontSize = 8.4, cellPadding = { top: 2.7, bottom: 2.7, left: 3.2, right: 3.2 } }) {
  autoTable(doc, {
    startY,
    head: [head],
    body,
    ...(foot ? { foot: [foot], showFoot: 'lastPage' } : {}),
    footStyles: { fillColor: COLORS.BRASS_LIGHT, textColor: COLORS.FOREST_DARK, fontStyle: 'bold', fontSize: 8.4, lineWidth: 0 },
    theme: 'plain',
    tableWidth,
    rowPageBreak: 'avoid',
    styles: {
      fontSize,
      cellPadding,
      textColor: COLORS.INK,
      lineColor: COLORS.HAIR,
      lineWidth: { top: 0, right: 0, bottom: 0.15, left: 0 },
    },
    headStyles: { fillColor: headFill, textColor: 255, fontStyle: 'bold', fontSize: 7.8, lineWidth: 0 },
    alternateRowStyles: { fillColor: COLORS.ZEBRA },
    columnStyles: Object.fromEntries(
      [...new Set([...rightCols, ...Object.keys(columnStyles).map(Number)])].map((index) => [
        index,
        { ...(rightCols.includes(index) ? { halign: 'right' } : {}), ...(columnStyles[index] || {}) },
      ]),
    ),
    ...(onDrawCell ? { didDrawCell: onDrawCell } : {}),
    didParseCell: (data) => {
      if ((data.section === 'head' || data.section === 'foot') && rightCols.includes(data.column.index)) data.cell.styles.halign = 'right';
    },
    margin: { left: MARGIN, right: MARGIN, top: 24, bottom: 22 },
  });
  return doc.lastAutoTable.finalY;
}

export function drawBigStamp(doc, cx, cy, r = 24, tilt = -12) {
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.85 }));
  doc.setDrawColor(...COLORS.FOREST);
  doc.setTextColor(...COLORS.FOREST);
  doc.setLineWidth(1.2);
  doc.circle(cx, cy, r, 'S');
  doc.setLineWidth(0.3);
  doc.circle(cx, cy, r - 1.9, 'S');
  doc.setDrawColor(...COLORS.BRASS);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, r - 10, 'S');

  doc.setFont('helvetica', 'bold');
  arcText(doc, 'AAROGYA SANDESH', cx, cy, r - 6, tilt, 8, false);
  arcText(doc, 'A HEALTH UPDATE, DELIVERED', cx, cy, r - 3.4, 180 + tilt, 5.4, true);

  doc.setFillColor(...COLORS.BRASS);
  [90, 270].forEach((base) => {
    const rad = ((base + tilt) * Math.PI) / 180;
    doc.circle(cx + (r - 4.6) * Math.sin(rad), cy - (r - 4.6) * Math.cos(rad), 0.8, 'F');
  });

  if (logoDataUrl) {
    const size = (r - 11.2) * 2;
    doc.addImage(logoDataUrl, 'PNG', cx - size / 2, cy - size / 2, size, size, LOGO_ALIAS, 'FAST');
  }
  doc.restoreGraphicsState();
}

export function drawAuthPanel(doc, y, { rows, note }) {
  const w = doc.internal.pageSize.width;
  const width = w - MARGIN * 2;
  const height = 46;
  y = ensureSpace(doc, y, height + 4);

  doc.setFillColor(...COLORS.TINT);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, width, height, 2, 2, 'FD');
  doc.setFillColor(...COLORS.FOREST);
  doc.roundedRect(MARGIN, y, 2, height, 1, 1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(...COLORS.FOREST);
  doc.text('DOCUMENT AUTHENTICATION', MARGIN + 7, y + 7, { charSpace: 0.6 });

  rows.forEach((row, index) => {
    const x = MARGIN + 7 + (index % 2) * 56;
    const rowY = y + 14 + Math.floor(index / 2) * 9.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(row.label.toUpperCase(), x, rowY, { charSpace: 0.3 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.INK);
    doc.text(doc.splitTextToSize(String(row.value), 52), x, rowY + 4.2);
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.MUTED);
  doc.text(doc.splitTextToSize(note, 106), MARGIN + 7, y + 37);

  drawBigStamp(doc, w - MARGIN - 27, y + height / 2, 21);
  return y + height;
}

export function drawLedger(doc, y, { items, deposits }) {
  const entries = [
    ...items.map((item, index) => ({ order: index, date: item.addedAt, text: item.description || 'Charge', category: item.category || 'Other', debit: parseFloat(item.amount) || 0, credit: 0 })),
    ...deposits.map((deposit, index) => ({ order: 1000 + index, date: deposit.depositedAt, text: `Deposit - ${deposit.reason || 'Deposit'}`, category: 'Deposit', debit: 0, credit: parseFloat(deposit.amount) || 0 })),
  ].sort((a, b) => {
    const at = a.date ? new Date(a.date).getTime() : 0;
    const bt = b.date ? new Date(b.date).getTime() : 0;
    return at - bt || a.order - b.order;
  });

  let running = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const balanceLabel = (value) => (value > 0 ? `${formatRs(value)} Dr` : value < 0 ? `${formatRs(-value)} Cr` : 'Rs. 0');
  const body = entries.map((entry) => {
    running += entry.debit - entry.credit;
    totalDebit += entry.debit;
    totalCredit += entry.credit;
    return [
      entry.date ? formatDateTimeLong(entry.date) : '-',
      entry.text,
      entry.category,
      entry.debit ? formatRs(entry.debit) : '-',
      entry.credit ? formatRs(entry.credit) : '-',
      balanceLabel(running),
    ];
  });

  if (!body.length) return y;
  return styledTable(doc, {
    startY: y,
    head: ['Date & Time', 'Particulars', 'Type', 'Debit', 'Credit', 'Balance'],
    body,
    foot: ['', 'TOTAL', '', formatRs(totalDebit), formatRs(totalCredit), balanceLabel(running)],
    rightCols: [3, 4, 5],
    headFill: COLORS.FOREST_DARK,
    fontSize: 7.4,
    cellPadding: { top: 2.6, bottom: 2.6, left: 2, right: 2 },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 42 },
      2: { cellWidth: 22 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 28 },
    },
  });
}

const CHECKLIST_LABELS = {
  dischargeMedicines: 'Discharge medicines provided',
  finalBill: 'Final bill prepared',
  patientReady: 'Patient ready for discharge',
  doctorCertificate: 'Doctor certificate issued',
  bedReleased: 'Bed released',
};

export function drawChecklist(doc, y, checklist) {
  const w = doc.internal.pageSize.width;
  const width = w - MARGIN * 2;
  const keys = Object.keys(CHECKLIST_LABELS).filter((key) => key in checklist);
  if (!keys.length) return y;
  const rows = Math.ceil(keys.length / 3);
  const height = 6 + rows * 9;
  y = ensureSpace(doc, y, height + 2);

  doc.setFillColor(...COLORS.TINT);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, width, height, 2, 2, 'FD');

  keys.forEach((key, index) => {
    const x = MARGIN + 7 + (index % 3) * (width / 3);
    const cy = y + 7.5 + Math.floor(index / 3) * 9;
    const done = checklist[key] === true;
    if (done) {
      doc.setFillColor(...COLORS.SUCCESS);
      doc.circle(x + 2.2, cy, 2.4, 'F');
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(x + 1.1, cy + 0.1, x + 1.9, cy + 1);
      doc.line(x + 1.9, cy + 1, x + 3.4, cy - 0.9);
    } else {
      doc.setDrawColor(...COLORS.MUTED);
      doc.setLineWidth(0.4);
      doc.circle(x + 2.2, cy, 2.4, 'S');
    }
    doc.setFont('helvetica', done ? 'bold' : 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(...(done ? COLORS.INK : COLORS.MUTED));
    doc.text(CHECKLIST_LABELS[key], x + 6.6, cy + 1);
  });
  return y + height;
}

export function finalizeDocument(doc, { docRef, subject }) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page);

    if (logoDataUrl) {
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.05 }));
      doc.addImage(logoDataUrl, 'PNG', (pageWidth - 110) / 2, (pageHeight - 110) / 2 + 6, 110, 110, LOGO_ALIAS, 'FAST');
      doc.restoreGraphicsState();
    }

    if (page > 1) {
      doc.setFillColor(...COLORS.FOREST_DARK);
      doc.rect(0, 0, pageWidth, 4.2, 'F');
      doc.setFillColor(...COLORS.BRASS);
      doc.rect(0, 4.2, pageWidth, 0.8, 'F');
      if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', MARGIN, 7, 10, 10, LOGO_ALIAS, 'FAST');
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.FOREST_DARK);
      doc.text('Aarogya Sandesh', MARGIN + 13, 11.4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.MUTED);
      doc.text(subject, MARGIN + 13, 15.2);
      doc.text(docRef, pageWidth - MARGIN, 11.4, { align: 'right' });
    }

    doc.setFillColor(...COLORS.FOREST_DARK);
    doc.rect(0, 284, pageWidth, 13, 'F');
    doc.setFillColor(...COLORS.BRASS);
    doc.rect(0, 284, pageWidth, 0.7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(`${HOSPITAL.name}  |  ${HOSPITAL.tagline}`, MARGIN, 289.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(214, 224, 217);
    doc.text(`${HOSPITAL.address}   |   ${HOSPITAL.phone}   |   ${HOSPITAL.email}`, MARGIN, 293);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.BRASS_LIGHT);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, 289.2, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(214, 224, 217);
    doc.text(docRef, pageWidth - MARGIN, 293, { align: 'right' });
  }
}
