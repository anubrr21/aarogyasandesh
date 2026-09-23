import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { computeVitalsTrend, TREND_LABELS } from './vitalsTrend';

const HOSPITAL_ADDRESS = '123, Healthcare District, New Delhi - 110001';
const HOSPITAL_PHONE = '+91 8977039397';
const HOSPITAL_EMAIL = 'info@aarogyasandesh.com';
const FOREST = [57, 100, 71];
const BRASS = [184, 134, 58];

function buildDischargeDoc({ patient, dischargeSummary, vitals = [] }) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  let y = 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...FOREST);
  doc.text('Aarogya Sandesh', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(HOSPITAL_ADDRESS, pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text(`Phone: ${HOSPITAL_PHONE}  |  Email: ${HOSPITAL_EMAIL}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(...BRASS);
  doc.setLineWidth(0.4);
  doc.line(20, y, pageWidth - 20, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('DISCHARGE SUMMARY', 20, y);
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 20, y, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Patient Details', 20, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const details = [
    [`Name: ${dischargeSummary?.patientName || patient?.name || 'N/A'}`, `Age: ${dischargeSummary?.age || patient?.age || 'N/A'}`],
    [`Admit Date: ${dischargeSummary?.admitDate ? new Date(dischargeSummary.admitDate).toLocaleDateString('en-IN') : 'N/A'}`, `Discharge Date: ${dischargeSummary?.dischargeDate ? new Date(dischargeSummary.dischargeDate).toLocaleDateString('en-IN') : 'N/A'}`],
    [`Length of Stay: ${dischargeSummary?.lengthOfStay ?? 'N/A'} day(s)`, `Diagnosis: ${dischargeSummary?.diagnosis || 'N/A'}`],
  ];
  details.forEach(([left, right]) => {
    doc.text(left, 20, y);
    doc.text(right, 110, y);
    y += 5;
  });
  y += 3;

  const diagnosisList = dischargeSummary?.diagnosisList || [];
  if (diagnosisList.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Diagnoses', 20, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Diagnosis', 'Type', 'Notes']],
      body: diagnosisList.map((d) => [d.diagnosis || '-', d.type || 'primary', d.explainer || '-']),
      theme: 'grid',
      headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
      margin: { left: 20, right: 20 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  const medicines = dischargeSummary?.medicines || [];
  if (medicines.length > 0) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Discharge Medications', 20, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Medicine', 'Dosage', 'Frequency', 'Route']],
      body: medicines.map((m) => [m.name || '-', m.dosage || '-', m.frequency || '-', m.route || '-']),
      theme: 'grid',
      headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
      margin: { left: 20, right: 20 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  const trend = computeVitalsTrend(vitals.length ? vitals : dischargeSummary?.vitals || []);
  const withData = trend.filter((t) => t.hasData);
  if (withData.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Vitals Trend (First → Last Recorded)', 20, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Vital', 'First Reading', 'Last Reading', 'Trend']],
      body: withData.map((t) => [
        t.displayName,
        `${t.first.value}${t.first.unit || ''}`,
        `${t.last.value}${t.last.unit || ''}`,
        TREND_LABELS[t.trend]?.label || t.trend,
      ]),
      theme: 'grid',
      headStyles: { fillColor: BRASS, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
      margin: { left: 20, right: 20 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  if (dischargeSummary?.totalBill !== undefined) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Billing Summary', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Total Bill: Rs. ${(dischargeSummary.totalBill || 0).toLocaleString('en-IN')}`, 20, y);
    doc.text(`Deposits Paid: Rs. ${(dischargeSummary.totalDeposits || 0).toLocaleString('en-IN')}`, 110, y);
    y += 6;
    const bal = dischargeSummary.balance || 0;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(bal >= 0 ? FOREST : [190, 60, 60]));
    doc.text(bal >= 0 ? `Refund Due: Rs. ${bal.toLocaleString('en-IN')}` : `Balance Due: Rs. ${Math.abs(bal).toLocaleString('en-IN')}`, 20, y);
    y += 9;
  }

  if (dischargeSummary?.doctorNotes) {
    if (y > 245) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Doctor's Notes", 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const noteLines = doc.splitTextToSize(dischargeSummary.doctorNotes, pageWidth - 40);
    doc.text(noteLines, 20, y);
    y += noteLines.length * 4.5 + 5;
  }

  if (dischargeSummary?.instructions) {
    if (y > 245) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Discharge Instructions', 20, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const instrLines = doc.splitTextToSize(dischargeSummary.instructions, pageWidth - 40);
    doc.text(instrLines, 20, y);
    y += instrLines.length * 4.5 + 5;
  }

  if (dischargeSummary?.followUpDate) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...FOREST);
    doc.text(`Follow-up Appointment: ${new Date(dischargeSummary.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, 20, y);
    y += 9;
  }

  if (y > 260) { doc.addPage(); y = 20; }
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('This is a system-generated discharge summary from AarogyaSandesh. For medical concerns, please consult your treating physician.', pageWidth / 2, y, { align: 'center' });

  const fileSlug = (patient?.patientId || dischargeSummary?.patientName || 'patient').toString().replace(/[^a-zA-Z0-9]/g, '');
  return { doc, fileName: `Discharge-Summary-${fileSlug}` };
}

export function downloadDischargeSummaryPDF(params) {
  const { doc, fileName } = buildDischargeDoc(params);
  doc.save(`${fileName}.pdf`);
}

export function printDischargeSummaryPDF(params) {
  const { doc } = buildDischargeDoc(params);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}
