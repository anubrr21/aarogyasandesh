import jsPDF from 'jspdf';
import { computeVitalsTrend, TREND_LABELS } from './vitalsTrend';
import {
  COLORS, HOSPITAL, MARGIN, drawCallout, drawChecklist, drawDocTitle, drawHeader, drawInfoGrid, drawMetaStrip,
  drawNoteBox, drawSectionTitle, drawSignatureBlock, drawTiles, ensureSpace, finalizeDocument,
  formatDateLong, formatDateShort, formatDateTimeLong, formatRs, makeDocRef, styledTable,
} from './pdfBranding';
import { drawAuthentication } from './pdfBillingExtras';
import { doctorFields, openPrintWindow, resolveAttendingDoctor, showPdfForPrint } from './pdfContext';

function drawTimeline(doc, y, { admit, discharge, days }) {
  const w = doc.internal.pageSize.width;
  const width = w - MARGIN * 2;
  y = ensureSpace(doc, y, 26);

  doc.setFillColor(...COLORS.TINT);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, width, 22, 2, 2, 'FD');

  const leftX = MARGIN + 26;
  const rightX = w - MARGIN - 26;
  const lineY = y + 8;
  doc.setDrawColor(...COLORS.BRASS);
  doc.setLineWidth(0.8);
  doc.line(leftX, lineY, rightX, lineY);

  [[leftX, COLORS.FOREST], [rightX, COLORS.SUCCESS]].forEach(([x, color]) => {
    doc.setFillColor(255, 255, 255);
    doc.circle(x, lineY, 3.2, 'F');
    doc.setFillColor(...color);
    doc.circle(x, lineY, 2.2, 'F');
  });

  const pillText = days !== null && days !== undefined ? `${days} DAY${days === 1 ? '' : 'S'} OF CARE` : 'LENGTH OF STAY N/A';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  const pillWidth = doc.getTextWidth(pillText) + pillText.length * 0.4 + 10;
  doc.setFillColor(...COLORS.FOREST);
  doc.roundedRect((w - pillWidth) / 2, lineY - 3.6, pillWidth, 7.2, 3.6, 3.6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(pillText, w / 2, lineY + 1.3, { align: 'center', charSpace: 0.4 });

  [['ADMITTED', admit, leftX], ['DISCHARGED', discharge, rightX]].forEach(([label, value, x]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.3);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(label, x, y + 14.4, { align: 'center', charSpace: 0.5 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.6);
    doc.setTextColor(...COLORS.INK);
    doc.text(value, x, y + 18.6, { align: 'center' });
  });

  return y + 22;
}

async function buildDischargeDoc({ patient, dischargeSummary, vitals = [] }) {
  const doctor = await resolveAttendingDoctor(patient);
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;

  const patientKey = patient?.patientId || patient?.id || dischargeSummary?.patientName;
  const docRef = makeDocRef('AS-DS', patientKey, dischargeSummary?.dischargeDate);
  drawHeader(doc, {
    docRef,
    qrText: `AAROGYASANDESH|DISCHARGE-SUMMARY|${docRef}|${patient?.patientId || 'NA'}|${dischargeSummary?.dischargeDate || ''}`,
  });

  let y = drawDocTitle(doc, 53, {
    title: 'DISCHARGE SUMMARY',
    tag: 'PATIENT COPY  |  CONFIDENTIAL MEDICAL RECORD',
    right1: `Ref: ${docRef}`,
    right2: `Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
  });

  y = drawMetaStrip(doc, y, [
    { label: 'Document No.', value: docRef, weight: 1.7 },
    { label: 'Issued On', value: formatDateTimeLong(), weight: 1.4 },
    { label: 'Patient ID', value: patient?.patientId || 'N/A' },
    { label: 'Ward / Bed', value: `${patient?.ward || 'N/A'} / ${patient?.bed || 'N/A'}` },
  ]) + 5;

  y = drawTimeline(doc, y, {
    admit: dischargeSummary?.admitDate ? formatDateShort(dischargeSummary.admitDate) : 'N/A',
    discharge: dischargeSummary?.dischargeDate ? formatDateShort(dischargeSummary.dischargeDate) : 'N/A',
    days: dischargeSummary?.lengthOfStay ?? null,
  }) + 6;

  const stayValue = dischargeSummary?.lengthOfStay !== undefined && dischargeSummary?.lengthOfStay !== null
    ? `${dischargeSummary.lengthOfStay} day${dischargeSummary.lengthOfStay === 1 ? '' : 's'}`
    : 'N/A';
  y = drawSectionTitle(doc, y, 'Stay Snapshot');
  y = drawTiles(doc, y, [
    { label: 'Length of Stay', value: stayValue, tone: COLORS.FOREST_DARK },
    { label: 'Diagnoses', value: String((dischargeSummary?.diagnosisList || []).length || (dischargeSummary?.diagnosis ? 1 : 0)), tone: COLORS.FOREST },
    { label: 'Medicines', value: String((dischargeSummary?.medicines || []).length), tone: COLORS.BRASS },
    { label: 'Reports on File', value: String((patient?.reports || []).length), tone: COLORS.SUCCESS },
  ]) + 5;

  y = drawSectionTitle(doc, y, 'Patient Details');
  y = drawInfoGrid(doc, y, [
    { label: 'Patient Name', value: dischargeSummary?.patientName || patient?.name || 'N/A' },
    { label: 'Age', value: dischargeSummary?.age || patient?.age || 'N/A' },
    { label: 'Gender', value: patient?.gender || 'N/A' },
    { label: 'Phone', value: patient?.phone || 'N/A' },
    { label: 'ABHA ID', value: patient?.abhaId || 'N/A' },
    { label: 'Family Member', value: patient?.familyMemberName || 'N/A' },
    { label: 'Admit Date', value: dischargeSummary?.admitDate ? new Date(dischargeSummary.admitDate).toLocaleDateString('en-IN') : 'N/A' },
    { label: 'Discharge Date', value: dischargeSummary?.dischargeDate ? new Date(dischargeSummary.dischargeDate).toLocaleDateString('en-IN') : 'N/A' },
  ], 4) + 6;

  if (doctor) {
    y = drawSectionTitle(doc, y, 'Care Team');
    y = drawInfoGrid(doc, y, doctorFields(doctor), 4) + 5;
  }

  y = drawCallout(doc, y, {
    title: 'Diagnosis',
    text: dischargeSummary?.diagnosis || 'N/A',
    accent: COLORS.FOREST,
    textSize: 9.4,
  }) + 6;

  const diagnosisList = dischargeSummary?.diagnosisList || [];
  if (diagnosisList.length > 0) {
    y = drawSectionTitle(doc, y, 'Diagnoses');
    y = styledTable(doc, {
      startY: y,
      head: ['Diagnosis', 'Type', 'Notes'],
      body: diagnosisList.map((d) => [d.diagnosis || '-', d.type || 'primary', d.explainer || '-']),
      columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 26 } },
    }) + 6;
  }

  const medicines = dischargeSummary?.medicines || [];
  if (medicines.length > 0) {
    y = drawSectionTitle(doc, y, 'Discharge Medications');
    y = styledTable(doc, {
      startY: y,
      head: ['#', 'Medicine', 'Dosage', 'Frequency', 'Route'],
      body: medicines.map((m, i) => [i + 1, m.name || '-', m.dosage || '-', m.frequency || '-', m.route || '-']),
      columnStyles: { 0: { cellWidth: 10 } },
    }) + 6;
  }

  const trend = computeVitalsTrend(vitals.length ? vitals : dischargeSummary?.vitals || []);
  const withData = trend.filter((t) => t.hasData);
  if (withData.length > 0) {
    y = drawSectionTitle(doc, y, 'Vitals Trend (First to Last Recorded)');
    y = styledTable(doc, {
      startY: y,
      head: ['Vital', 'First Reading', 'Last Reading', 'Trend'],
      body: withData.map((t) => [
        t.displayName,
        `${t.first.value}${t.first.unit || ''}`,
        `${t.last.value}${t.last.unit || ''}`,
        TREND_LABELS[t.trend]?.label || t.trend,
      ]),
      headFill: COLORS.BRASS,
    }) + 6;
  }

  if (dischargeSummary?.totalBill !== undefined) {
    const bal = dischargeSummary.balance || 0;
    y = drawSectionTitle(doc, y, 'Billing Summary');
    y = drawTiles(doc, y, [
      { label: 'Total Bill', value: formatRs(dischargeSummary.totalBill || 0), tone: COLORS.FOREST_DARK },
      { label: 'Deposits Paid', value: formatRs(dischargeSummary.totalDeposits || 0), tone: COLORS.BRASS },
      { label: bal >= 0 ? 'Refund Due' : 'Balance Due', value: formatRs(Math.abs(bal)), tone: bal >= 0 ? COLORS.SUCCESS : COLORS.DANGER },
    ]) + 9;
  }

  if (dischargeSummary?.doctorNotes) {
    y = drawCallout(doc, y, { title: "Doctor's Notes", text: dischargeSummary.doctorNotes, accent: COLORS.BRASS }) + 4;
  }

  if (dischargeSummary?.instructions) {
    y = drawCallout(doc, y, { title: 'Discharge Instructions', text: dischargeSummary.instructions, accent: COLORS.FOREST }) + 4;
  }

  if (dischargeSummary?.followUpDate) {
    y = ensureSpace(doc, y, 20);
    doc.setFillColor(...COLORS.BRASS_LIGHT);
    doc.setDrawColor(...COLORS.BRASS);
    doc.setLineWidth(0.5);
    doc.roundedRect(MARGIN, y, pageWidth - MARGIN * 2, 14, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.setTextColor(...COLORS.BRASS);
    doc.text('FOLLOW-UP APPOINTMENT', MARGIN + 6, y + 5.6, { charSpace: 0.5 });
    doc.setFontSize(11.5);
    doc.setTextColor(...COLORS.FOREST_DARK);
    doc.text(formatDateLong(dischargeSummary.followUpDate), MARGIN + 6, y + 11.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(...COLORS.MUTED);
    doc.text('Please carry this summary and all reports', pageWidth - MARGIN - 6, y + 8.8, { align: 'right' });
    y += 20;
  }

  const checklist = patient?.discharge?.checklist;
  if (checklist && Object.keys(checklist).length > 0) {
    y = drawSectionTitle(doc, y, 'Discharge Checklist');
    y = drawChecklist(doc, y, checklist) + 5;
  }

  y = drawNoteBox(doc, y, 'Important Information for Patient & Family', [
    'Carry this discharge summary and all reports to every follow-up visit and keep it safe.',
    'Take medicines exactly as prescribed. Do not stop or change a dose without consulting your doctor.',
    `In an emergency, visit the nearest emergency department immediately. AarogyaSandesh support: ${HOSPITAL.phone}.`,
  ]) + 6;

  y = ensureSpace(doc, y, 86);
  y = drawAuthentication(doc, y, { kind: 'Discharge Summary', docRef, patientName: dischargeSummary?.patientName || patient?.name, patientId: patient?.patientId }) + 3;

  const dischargeStamp = (dischargeSummary?.dischargeDate ? new Date(dischargeSummary.dischargeDate) : new Date())
    .toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  y = drawSignatureBlock(doc, y, [
    { title: 'Treating Physician', hint: 'Name, reg. no. & signature' },
    { title: 'Discharging Staff', hint: 'Name & signature' },
    { title: 'Authorised Signatory', hint: 'For AarogyaSandesh' },
  ], { seal: true, stamp: { text: 'DISCHARGED', sub: dischargeStamp, color: COLORS.SUCCESS, width: 56, height: 18, angle: 8 } }) + 1;

  y = ensureSpace(doc, y, 0);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('This is a system-generated discharge summary from AarogyaSandesh. For medical concerns, please consult your treating physician.', pageWidth / 2, y, { align: 'center' });

  finalizeDocument(doc, { docRef, subject: `Discharge Summary  |  ${dischargeSummary?.patientName || patient?.name || 'Patient'}` });

  const fileSlug = (patient?.patientId || dischargeSummary?.patientName || 'patient').toString().replace(/[^a-zA-Z0-9]/g, '');
  return { doc, fileName: `Discharge-Summary-${fileSlug}` };
}

export async function downloadDischargeSummaryPDF(params) {
  const { doc, fileName } = await buildDischargeDoc(params);
  doc.save(`${fileName}.pdf`);
}

export async function printDischargeSummaryPDF(params) {
  const printWindow = openPrintWindow();
  const { doc } = await buildDischargeDoc(params);
  showPdfForPrint(doc, printWindow);
}
