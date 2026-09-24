import jsPDF from 'jspdf';
import { getItemStatus, computeCategoryBreakdown, getInvoiceNumber } from './billingHelpers';
import {
  COLORS, amountInWords, drawCategoryBar, drawDocTitle, drawHeader, drawInfoGrid, drawLedger,
  drawMetaStrip, drawNoteBox, drawSectionTitle, drawSignatureBlock, drawTotalsBlock,
  ensureSpace, finalizeDocument, formatDateShort, formatDateTimeLong, formatRs, styledTable,
} from './pdfBranding';
import { drawAuthentication, drawGlance, drawInsights } from './pdfBillingExtras';
import { doctorFields, openPrintWindow, resolveAttendingDoctor, showPdfForPrint } from './pdfContext';

async function buildInvoiceDoc({ patient, billingData, totalBill, totalDeposits, balance }) {
  const doctor = await resolveAttendingDoctor(patient);
  const items = billingData?.items || [];
  const deposits = billingData?.deposits || [];
  const invoiceNumber = getInvoiceNumber(billingData, patient?.patientId || patient?.id);
  const breakdown = computeCategoryBreakdown(items);

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;

  const patientKey = patient?.patientId || patient?.id;
  drawHeader(doc, {
    docRef: invoiceNumber,
    qrText: `AAROGYASANDESH|INVOICE|${invoiceNumber}|${patientKey || 'NA'}|${totalBill}|${new Date().toISOString().slice(0, 10)}`,
  });

  let y = drawDocTitle(doc, 53, {
    title: 'MEDICAL INVOICE',
    tag: 'ORIGINAL FOR RECIPIENT',
    right1: `Invoice #: ${invoiceNumber}`,
    right2: `Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
  });

  const allItemsPaid = items.length > 0 && items.every((item) => getItemStatus(item) === 'paid');
  let paymentStatus = 'Payment due';
  if (totalBill === 0) paymentStatus = 'No charges';
  else if (allItemsPaid) paymentStatus = 'Paid in full';
  else if (totalDeposits >= totalBill) paymentStatus = 'Covered by deposits';
  else if (totalDeposits > 0) paymentStatus = 'Partially covered';

  const statusColor = balance < 0 ? COLORS.DANGER : COLORS.SUCCESS;
  y = drawMetaStrip(doc, y, [
    { label: 'Invoice No.', value: invoiceNumber, weight: 1.5 },
    { label: 'Issued On', value: formatDateTimeLong(), weight: 1.3 },
    { label: 'Items Billed', value: `${items.length} item${items.length === 1 ? '' : 's'}` },
    { label: 'Payment Status', value: paymentStatus, weight: 1.2, color: totalBill === 0 ? COLORS.INK : statusColor },
  ]) + 7;

  y = drawGlance(doc, y, { items, totalBill, totalDeposits }) + 8;

  const admit = patient?.admitDate ? new Date(patient.admitDate) : null;
  const dischargeAt = patient?.discharge?.actualTime ? new Date(patient.discharge.actualTime) : null;
  const stayDays = admit && !Number.isNaN(admit.getTime())
    ? Math.max(1, Math.ceil(((dischargeAt || new Date()) - admit) / 86400000))
    : null;

  y = drawSectionTitle(doc, y, 'Patient Details');
  y = drawInfoGrid(doc, y, [
    { label: 'Patient Name', value: patient?.name || 'N/A' },
    { label: 'Patient ID', value: patient?.patientId || 'N/A' },
    { label: 'Age / Gender', value: `${patient?.age || 'N/A'} / ${patient?.gender || 'N/A'}` },
    { label: 'Phone', value: patient?.phone || 'N/A' },
    { label: 'Ward / Bed', value: `${patient?.ward || 'N/A'} / ${patient?.bed || 'N/A'}` },
    { label: 'Room', value: patient?.room || 'N/A' },
    { label: 'ABHA ID', value: patient?.abhaId || 'N/A' },
    { label: 'Family Member', value: patient?.familyMemberName || 'N/A' },
    { label: 'Admit Date', value: patient?.admitDate ? formatDateShort(patient.admitDate) : 'N/A' },
    { label: 'Discharge Date', value: dischargeAt ? formatDateShort(dischargeAt) : 'N/A' },
    { label: 'Length of Stay', value: stayDays ? `${stayDays} day${stayDays === 1 ? '' : 's'}` : 'N/A' },
    { label: 'Status', value: dischargeAt ? 'Discharged' : 'Admitted' },
    ...doctorFields(doctor).slice(0, 2),
  ], 4) + 7;

  y = drawSectionTitle(doc, y, 'Bill Items');
  y = styledTable(doc, {
    startY: y,
    head: ['Description', 'Category', 'Status', 'Amount'],
    body: items.length
      ? items.map((item) => [
        item.description || '-',
        item.category || 'Other',
        getItemStatus(item) === 'paid' ? 'Paid' : 'Unpaid',
        formatRs(parseFloat(item.amount) || 0),
      ])
      : [['No bill items recorded', '-', '-', 'Rs. 0']],
    rightCols: [3],
    columnStyles: { 0: { cellWidth: 74 } },
  }) + 7;

  if (breakdown.length > 0) {
    y = drawSectionTitle(doc, y, 'Spend by Category');
    y = drawCategoryBar(doc, y, breakdown);
    y = styledTable(doc, {
      startY: y + 1,
      head: ['Category', 'Amount', '% of Bill'],
      body: breakdown.map((b) => [b.category, formatRs(b.amount), `${b.percent.toFixed(1)}%`]),
      headFill: COLORS.BRASS,
      rightCols: [1, 2],
      tableWidth: 110,
    }) + 7;
  }

  if (deposits.length > 0) {
    y = drawSectionTitle(doc, y, 'Deposits Received');
    y = styledTable(doc, {
      startY: y,
      head: ['Reason', 'Urgency', 'Date', 'Amount'],
      body: deposits.map((d) => [
        d.reason || '-',
        d.urgency || 'routine',
        d.depositedAt ? new Date(d.depositedAt).toLocaleDateString('en-IN') : '-',
        formatRs(parseFloat(d.amount) || 0),
      ]),
      headFill: [96, 104, 100],
      rightCols: [3],
    }) + 7;
  }

  if (items.length + deposits.length > 0) {
    y = drawSectionTitle(doc, y, 'Account Ledger');
    y = drawLedger(doc, y, { items, deposits }) + 7;
  }

  y = ensureSpace(doc, y, 44);
  const due = balance < 0;
  y = drawTotalsBlock(doc, y, {
    rows: [
      { label: 'Subtotal', value: formatRs(totalBill) },
      { label: 'Deposits Paid', value: `- ${formatRs(totalDeposits)}`, tone: COLORS.SUCCESS },
    ],
    balanceLabel: due ? 'Balance Due' : 'Refund Due',
    balanceValue: formatRs(Math.abs(balance)),
    due,
    words: amountInWords(Math.abs(balance)),
    statusText: paymentStatus,
  }) + 8;

  y = drawInsights(doc, y, { items, totalBill, stayDays }) + 5;

  y = drawNoteBox(doc, y, 'Terms & Notes', [
    'All amounts are in Indian Rupees (INR). Deposits received are adjusted against the total billed amount.',
    'Please retain this invoice for insurance claims, reimbursements and future reference.',
  ]) + 4;

  y = ensureSpace(doc, y, 86);
  y = drawAuthentication(doc, y, { kind: 'Medical Invoice', docRef: invoiceNumber, patientName: patient?.name, patientId: patient?.patientId }) + 6;

  let stamp = null;
  const stampDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  if (totalBill > 0) {
    if (balance >= 0) stamp = { text: 'PAID', sub: stampDate, color: COLORS.SUCCESS };
    else if (totalDeposits > 0) stamp = { text: 'PART PAID', sub: stampDate, color: COLORS.BRASS };
    else stamp = { text: 'PAYMENT DUE', sub: stampDate, color: COLORS.DANGER };
  }

  y = drawSignatureBlock(doc, y, [
    { title: 'Billing Executive', hint: 'Name & signature' },
    { title: 'Patient / Attendant', hint: 'Name & signature' },
    { title: 'Authorised Signatory', hint: 'For AarogyaSandesh' },
  ], { seal: true, stamp }) + 1;

  y = ensureSpace(doc, y, 0);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text('This is a system-generated invoice from AarogyaSandesh. For queries, contact the hospital billing desk.', pageWidth / 2, y, { align: 'center' });

  finalizeDocument(doc, { docRef: invoiceNumber, subject: `Medical Invoice  |  ${patient?.name || 'Patient'}` });

  return { doc, invoiceNumber };
}

export async function downloadInvoicePDF(params) {
  const { doc, invoiceNumber } = await buildInvoiceDoc(params);
  doc.save(`${invoiceNumber}.pdf`);
  return invoiceNumber;
}

export async function printInvoicePDF(params) {
  const printWindow = openPrintWindow();
  const { doc, invoiceNumber } = await buildInvoiceDoc(params);
  showPdfForPrint(doc, printWindow);
  return invoiceNumber;
}
