import jsPDF from 'jspdf';
import { computeCategoryBreakdown, getItemStatus } from './billingHelpers';
import {
  COLORS, amountInWords, drawCategoryBar, drawDocTitle, drawHeader, drawInfoGrid, drawLedger, drawMetaStrip,
  drawNoteBox, drawSectionTitle, drawSignatureBlock, drawTotalsBlock, ensureSpace, finalizeDocument,
  formatDateTimeLong, formatRs, makeDocRef, preloadLogo, styledTable,
} from './pdfBranding';
import { drawAuthentication, drawGlance, drawInsights } from './pdfBillingExtras';
import { doctorFields } from './pdfContext';

export function getPaymentStatus(billData) {
  const items = billData.billingItems || [];
  const allItemsPaid = items.length > 0 && items.every((item) => item.status === 'paid');
  if (billData.totalBill === 0) return 'No charges';
  if (allItemsPaid) return 'Paid in full';
  if (billData.totalDeposits >= billData.totalBill) return 'Covered by deposits';
  if (billData.totalDeposits > 0) return 'Partially covered';
  return 'Payment due';
}

export function getFinalBillRef(billData, fallbackId) {
  return makeDocRef('AS-FB', billData.patientId !== 'N/A' ? billData.patientId : fallbackId, billData.dischargeDate);
}

export async function buildFinalBillDoc(billData, fallbackId) {
  await preloadLogo();
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const docRef = getFinalBillRef(billData, fallbackId);

  drawHeader(doc, {
    docRef,
    gstin: billData.hospitalGST,
    qrText: `AAROGYASANDESH|FINAL-BILL|${docRef}|${billData.patientId}|${billData.totalBill}|${billData.balance}`,
  });

  let y = drawDocTitle(doc, 53, {
    title: 'FINAL BILL - DISCHARGE SUMMARY',
    tag: 'ORIGINAL FOR RECIPIENT',
    right1: `Bill #: ${docRef}`,
    right2: `Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
  });

  const paymentStatus = getPaymentStatus(billData);
  const due = billData.balance < 0;
  y = drawMetaStrip(doc, y, [
    { label: 'Bill No.', value: docRef, weight: 1.7 },
    { label: 'Issued On', value: formatDateTimeLong(), weight: 1.3 },
    { label: 'Items Billed', value: `${billData.billingItems.length} item${billData.billingItems.length === 1 ? '' : 's'}` },
    { label: 'Payment Status', value: paymentStatus, weight: 1.2, color: billData.totalBill === 0 ? COLORS.INK : (due ? COLORS.DANGER : COLORS.SUCCESS) },
  ]) + 7;

  y = drawGlance(doc, y, { items: billData.billingItems, totalBill: billData.totalBill, totalDeposits: billData.totalDeposits }) + 8;

  y = drawSectionTitle(doc, y, 'Patient Information');
  y = drawInfoGrid(doc, y, [
    { label: 'Patient Name', value: billData.patientName },
    { label: 'Patient ID', value: billData.patientId },
    { label: 'Age', value: `${billData.age} years` },
    { label: 'Gender', value: billData.gender },
    { label: 'Phone', value: billData.phone },
    { label: 'Family Member', value: billData.familyMember },
    { label: 'ABHA ID', value: billData.abhaId },
    { label: 'Room', value: billData.room },
    { label: 'Admitted', value: formatDateTimeLong(billData.admitDate) },
    { label: 'Discharged', value: formatDateTimeLong(billData.dischargeDate) },
    { label: 'Length of Stay', value: billData.duration },
    { label: 'Ward (Bed)', value: `${billData.ward} (${billData.bed})` },
    ...doctorFields(billData.attendingDoctor),
  ], 4) + 7;

  y = drawSectionTitle(doc, y, 'Diagnosis & Medicines');
  const mutedLine = (text) => {
    y = ensureSpace(doc, y, 8);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.6);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(text, 18, y);
    y += 7;
  };
  if (billData.diagnosis.length > 0) {
    y = styledTable(doc, {
      startY: y,
      head: ['#', 'Diagnosis', 'Notes'],
      body: billData.diagnosis.map((d, i) => [i + 1, d.diagnosis || '-', d.explainer || '-']),
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 60 } },
    }) + 5;
  } else {
    mutedLine('No diagnosis recorded');
  }
  if (billData.medicines.length > 0) {
    y = styledTable(doc, {
      startY: y,
      head: ['#', 'Medicine', 'Dosage', 'Frequency', 'Route'],
      body: billData.medicines.map((m, i) => [i + 1, m.name || '-', m.dosage || '-', m.frequency || '-', m.route || '-']),
      headFill: COLORS.BRASS,
      columnStyles: { 0: { cellWidth: 10 } },
    }) + 7;
  } else {
    mutedLine('No medicines prescribed');
    y += 2;
  }

  y = drawSectionTitle(doc, y, 'Bill Details');
  y = styledTable(doc, {
    startY: y,
    head: ['S.No.', 'Description', 'Category', 'Status', 'Amount (Rs.)'],
    body: billData.billingItems.length
      ? billData.billingItems.map((item, index) => [
        index + 1,
        item.description || 'N/A',
        item.category || 'Other',
        getItemStatus(item) === 'paid' ? 'Paid' : 'Unpaid',
        (parseFloat(item.amount) || 0).toLocaleString('en-IN'),
      ])
      : [['-', 'No bill items recorded', '-', '-', '0']],
    rightCols: [4],
    columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 66 } },
  }) + 7;

  const breakdown = computeCategoryBreakdown(billData.billingItems);
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

  if (billData.deposits.length > 0) {
    y = drawSectionTitle(doc, y, 'Deposits Received');
    y = styledTable(doc, {
      startY: y,
      head: ['Reason', 'Urgency', 'Date', 'Amount'],
      body: billData.deposits.map((d) => [
        d.reason || '-',
        d.urgency || 'routine',
        d.depositedAt ? new Date(d.depositedAt).toLocaleDateString('en-IN') : '-',
        formatRs(parseFloat(d.amount) || 0),
      ]),
      headFill: [96, 104, 100],
      rightCols: [3],
    }) + 7;
  }

  if (billData.billingItems.length + billData.deposits.length > 0) {
    y = drawSectionTitle(doc, y, 'Account Ledger');
    y = drawLedger(doc, y, { items: billData.billingItems, deposits: billData.deposits }) + 7;
  }

  y = ensureSpace(doc, y, 44);
  y = drawTotalsBlock(doc, y, {
    rows: [
      { label: 'Subtotal', value: formatRs(billData.totalBill) },
      { label: 'Deposits', value: `- ${formatRs(billData.totalDeposits)}`, tone: COLORS.SUCCESS },
    ],
    balanceLabel: due ? 'Balance (Due)' : 'Balance (Refundable)',
    balanceValue: formatRs(Math.abs(billData.balance)),
    due,
    words: amountInWords(Math.abs(billData.balance)),
    statusText: paymentStatus,
  }) + 8;

  if (billData.insurance?.provider) {
    y = drawSectionTitle(doc, y, 'Insurance Details');
    y = drawInfoGrid(doc, y, [
      { label: 'Insurance Provider', value: billData.insurance.provider },
      { label: 'Policy Number', value: billData.insurance.policyNumber || 'N/A' },
      { label: 'Claim Status', value: billData.insurance.claimStatus || 'N/A' },
      { label: 'Coverage Used', value: formatRs(billData.insurance.coverageUsed || 0) },
    ], 4) + 8;
  }

  const admittedAt = billData.admitDate ? new Date(billData.admitDate.toDate ? billData.admitDate.toDate() : billData.admitDate) : null;
  const dischargedAt = billData.dischargeDate ? new Date(billData.dischargeDate.toDate ? billData.dischargeDate.toDate() : billData.dischargeDate) : null;
  const stayDays = admittedAt && dischargedAt && !Number.isNaN(admittedAt.getTime()) && !Number.isNaN(dischargedAt.getTime())
    ? Math.max(1, Math.ceil((dischargedAt - admittedAt) / 86400000))
    : 1;
  y = drawInsights(doc, y, { items: billData.billingItems, totalBill: billData.totalBill, stayDays }) + 5;

  y = drawNoteBox(doc, y, 'Terms & Notes', [
    'All amounts are in Indian Rupees (INR). Deposits received are adjusted against the total billed amount.',
    'Please retain this bill for insurance claims, reimbursements and future reference.',
  ]) + 4;

  y = ensureSpace(doc, y, 86);
  y = drawAuthentication(doc, y, { kind: 'Final Bill', docRef, patientName: billData.patientName, patientId: billData.patientId }) + 6;

  const stampDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
  let stamp = null;
  if (billData.totalBill > 0) {
    if (billData.balance >= 0) stamp = { text: 'PAID', sub: stampDate, color: COLORS.SUCCESS };
    else if (billData.totalDeposits > 0) stamp = { text: 'PART PAID', sub: stampDate, color: COLORS.BRASS };
    else stamp = { text: 'PAYMENT DUE', sub: stampDate, color: COLORS.DANGER };
  }

  y = drawSignatureBlock(doc, y, [
    { title: 'Billing Executive', hint: 'Name & signature' },
    { title: 'Patient / Attendant', hint: 'Name & signature' },
    { title: 'Authorised Signatory', hint: 'For AarogyaSandesh' },
  ], { seal: true, stamp }) + 1;

  y = ensureSpace(doc, y, 16);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('This is a system-generated bill. Please verify all details with the hospital accounts department.', pageWidth / 2, y, { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, pageWidth / 2, y + 4, { align: 'center' });
  doc.text('Thank you for choosing AarogyaSandesh. Wishing you good health!', pageWidth / 2, y + 8, { align: 'center' });

  finalizeDocument(doc, { docRef, subject: `Final Bill  |  ${billData.patientName}` });
  return { doc, docRef };
}
