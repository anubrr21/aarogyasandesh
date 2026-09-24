import { COLORS, drawSectionTitle, styledTable } from './pdfBranding';

const EMPTY = { morning: false, afternoon: false, night: false };

export function parseSchedule(frequency) {
  const text = String(frequency || '').toLowerCase().trim();
  if (!text) return { slots: { ...EMPTY }, note: 'As directed' };

  const dashed = text.match(/^(\d)\s*[-–]\s*(\d)\s*[-–]\s*(\d)/);
  if (dashed) {
    return { slots: { morning: dashed[1] !== '0', afternoon: dashed[2] !== '0', night: dashed[3] !== '0' }, note: '' };
  }

  if (/\b(sos|prn|as needed|when needed|if needed|as required)\b/.test(text)) {
    return { slots: { ...EMPTY }, note: 'Only when needed' };
  }

  const hourly = text.match(/every\s+(\d+)\s*(?:hours?|hrs?|h)\b/);
  if (hourly) {
    const gap = parseInt(hourly[1], 10);
    if (gap <= 6) return { slots: { morning: true, afternoon: true, night: true }, note: `Every ${gap} hours` };
    if (gap <= 8) return { slots: { morning: true, afternoon: true, night: true }, note: `Every ${gap} hours` };
    if (gap <= 12) return { slots: { morning: true, afternoon: false, night: true }, note: `Every ${gap} hours` };
    return { slots: { morning: true, afternoon: false, night: false }, note: `Every ${gap} hours` };
  }

  if (/\b(four times|4 times|qid|qds)\b/.test(text)) return { slots: { morning: true, afternoon: true, night: true }, note: 'Four times a day' };
  if (/\b(thrice|three times|3 times|tds|tid)\b/.test(text)) return { slots: { morning: true, afternoon: true, night: true }, note: '' };
  if (/\b(twice|two times|2 times|bd|bid|b\.d)\b/.test(text)) return { slots: { morning: true, afternoon: false, night: true }, note: '' };
  if (/\b(bedtime|at night|night|hs|nocte)\b/.test(text)) return { slots: { morning: false, afternoon: false, night: true }, note: '' };
  if (/\b(afternoon|noon|lunch)\b/.test(text)) return { slots: { morning: false, afternoon: true, night: false }, note: '' };
  if (/\b(morning|breakfast)\b/.test(text)) return { slots: { morning: true, afternoon: false, night: false }, note: '' };
  if (/\b(once|one time|1 time|od|daily|every day|qd)\b/.test(text)) return { slots: { morning: true, afternoon: false, night: false }, note: '' };

  return { slots: { ...EMPTY }, note: String(frequency).trim() };
}

export function buildTimetable(medicines = []) {
  return medicines.map((medicine) => {
    const { slots, note } = parseSchedule(medicine.frequency);
    return {
      name: medicine.name || '-',
      dose: [medicine.dosage, medicine.route].filter(Boolean).join(', ') || '-',
      frequency: medicine.frequency || '-',
      slots,
      note,
    };
  });
}

export function drawMedicineTimetable(doc, y, medicines) {
  const rows = buildTimetable(medicines);
  if (!rows.length) return y;

  y = drawSectionTitle(doc, y, 'Medicine Timetable');
  const body = rows.map((row) => [
    row.name,
    row.dose,
    { content: '', slot: row.slots.morning },
    { content: '', slot: row.slots.afternoon },
    { content: '', slot: row.slots.night },
    row.note || row.frequency,
  ]);

  return styledTable(doc, {
    startY: y,
    head: ['Medicine', 'Dose / Route', 'Morning', 'Afternoon', 'Night', 'Notes'],
    body,
    headFill: COLORS.FOREST_DARK,
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 34 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
    },
    onDrawCell: (data) => {
      if (data.section !== 'body' || data.column.index < 2 || data.column.index > 4) return;
      const cx = data.cell.x + data.cell.width / 2;
      const cy = data.cell.y + data.cell.height / 2;
      if (data.cell.raw?.slot) {
        doc.setFillColor(...COLORS.SUCCESS);
        doc.circle(cx, cy, 2.1, 'F');
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.line(cx - 1, cy + 0.1, cx - 0.3, cy + 0.9);
        doc.line(cx - 0.3, cy + 0.9, cx + 1.1, cy - 0.8);
      } else {
        doc.setDrawColor(...COLORS.HAIR);
        doc.setLineWidth(0.35);
        doc.circle(cx, cy, 1.6, 'S');
      }
    },
  });
}
