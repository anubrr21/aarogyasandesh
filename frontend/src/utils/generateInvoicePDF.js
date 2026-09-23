import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getItemStatus, computeCategoryBreakdown, getInvoiceNumber } from './billingHelpers';

const HOSPITAL_NAME = 'AarogyaSandesh Super Speciality Hospital';
const HOSPITAL_ADDRESS = '123, Healthcare District, New Delhi - 110001';
const HOSPITAL_PHONE = '+91 8977039397';
const HOSPITAL_EMAIL = 'info@aarogyasandesh.com';
const FOREST = [57, 100, 71];
const BRASS = [184, 134, 58];

function buildInvoiceDoc({ patient, billingData, totalBill, totalDeposits, balance }) {
  const items = billingData?.items || [];
  const deposits = billingData?.deposits || [];
  const invoiceNumber = getInvoiceNumber(billingData, patient?.patientId || patient?.id);
  const breakdown = computeCategoryBreakdown(items);

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
  doc.text('MEDICAL INVOICE', 20, y);
  doc.setFontSize(10);
  doc.setTextColor(...FOREST);
  doc.text(`Invoice #: ${invoiceNumber}`, pageWidth - 20, y, { align: 'right' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - 20, y, { align: 'right' });
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
    [`Name: ${patient?.name || 'N/A'}`, `Patient ID: ${patient?.patientId || 'N/A'}`],
    [`Age / Gender: ${patient?.age || 'N/A'} / ${patient?.gender || 'N/A'}`, `Ward / Bed: ${patient?.ward || 'N/A'} / ${patient?.bed || 'N/A'}`],
    [`Admit Date: ${patient?.admitDate ? new Date(patient.admitDate).toLocaleDateString('en-IN') : 'N/A'}`, `Family Member: ${patient?.familyMemberName || 'N/A'}`],
  ];
  details.forEach(([left, right]) => {
    doc.text(left, 20, y);
    doc.text(right, 110, y);
    y += 5;
  });
  y += 3;

  const tableRows = items.map((item) => [
    item.description || '-',
    item.category || 'Other',
    getItemStatus(item) === 'paid' ? 'Paid' : 'Unpaid',
    `Rs. ${(parseFloat(item.amount) || 0).toLocaleString('en-IN')}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Category', 'Status', 'Amount']],
    body: tableRows.length ? tableRows : [['No bill items recorded', '-', '-', 'Rs. 0']],
    theme: 'grid',
    headStyles: { fillColor: FOREST, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: 20, right: 20 },
  });

  y = doc.lastAutoTable.finalY + 6;

  if (breakdown.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Spend by Category', 20, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Category', 'Amount', '% of Bill']],
      body: breakdown.map((b) => [b.category, `Rs. ${b.amount.toLocaleString('en-IN')}`, `${b.percent.toFixed(1)}%`]),
      theme: 'striped',
      headStyles: { fillColor: BRASS, textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
      margin: { left: 20, right: 20 },
      tableWidth: 100,
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (deposits.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text('Deposits Received', 20, y);
    y += 5;
    autoTable(doc, {
      startY: y,
      head: [['Reason', 'Urgency', 'Date', 'Amount']],
      body: deposits.map((d) => [
        d.reason || '-',
        d.urgency || 'routine',
        d.depositedAt ? new Date(d.depositedAt).toLocaleDateString('en-IN') : '-',
        `Rs. ${(parseFloat(d.amount) || 0).toLocaleString('en-IN')}`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [120, 120, 120], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [60, 60, 60] },
      columnStyles: { 3: { halign: 'right' } },
      margin: { left: 20, right: 20 },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('Subtotal', 130, y);
  doc.text(`Rs. ${totalBill.toLocaleString('en-IN')}`, pageWidth - 20, y, { align: 'right' });
  y += 6;
  doc.text('Deposits Paid', 130, y);
  doc.text(`- Rs. ${totalDeposits.toLocaleString('en-IN')}`, pageWidth - 20, y, { align: 'right' });
  y += 7;

  doc.setDrawColor(...FOREST);
  doc.line(125, y - 4, pageWidth - 20, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...(balance >= 0 ? FOREST : [190, 60, 60]));
  doc.text(balance >= 0 ? 'Refund Due' : 'Balance Due', 130, y);
  doc.text(`Rs. ${Math.abs(balance).toLocaleString('en-IN')}`, pageWidth - 20, y, { align: 'right' });
  y += 12;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('This is a system-generated invoice from AarogyaSandesh. For queries, contact the hospital billing desk.', pageWidth / 2, y, { align: 'center' });

  return { doc, invoiceNumber };
}

export function downloadInvoicePDF(params) {
  const { doc, invoiceNumber } = buildInvoiceDoc(params);
  doc.save(`${invoiceNumber}.pdf`);
  return invoiceNumber;
}

export function printInvoicePDF(params) {
  const { doc, invoiceNumber } = buildInvoiceDoc(params);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
  return invoiceNumber;
}
