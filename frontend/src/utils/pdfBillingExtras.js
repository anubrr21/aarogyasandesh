import { buildBillingInsights, computePaymentTotals } from './billingHelpers';
import {
  COLORS, drawAuthPanel, drawNoteBox, drawSectionTitle, drawTiles, formatDateTimeLong, formatRs,
} from './pdfBranding';

export function drawGlance(doc, y, { items, totalBill, totalDeposits }) {
  const { paid, unpaid } = computePaymentTotals(items);
  y = drawSectionTitle(doc, y, 'Bill at a Glance');
  return drawTiles(doc, y, [
    { label: 'Total Billed', value: formatRs(totalBill), tone: COLORS.FOREST_DARK },
    { label: 'Items Paid', value: formatRs(paid), tone: COLORS.SUCCESS },
    { label: 'Items Unpaid', value: formatRs(unpaid), tone: unpaid > 0 ? COLORS.DANGER : COLORS.MUTED },
    { label: 'Deposits Received', value: formatRs(totalDeposits), tone: COLORS.BRASS },
  ]);
}

export function drawInsights(doc, y, { items, totalBill, stayDays }) {
  const { paid, unpaid } = computePaymentTotals(items);
  const lines = buildBillingInsights({
    items,
    totalBill,
    lengthOfStay: stayDays || 1,
    totalPaid: paid,
    totalUnpaid: unpaid,
  }).map((insight) => insight.text.replace(/₹/g, 'Rs. '));
  if (!lines.length) return y;
  return drawNoteBox(doc, y, 'Billing Insights', lines);
}

export function drawAuthentication(doc, y, { kind, docRef, patientName, patientId, verified = false }) {
  return drawAuthPanel(doc, y, {
    rows: [
      { label: 'Document Type', value: kind },
      { label: 'Document Ref', value: docRef },
      { label: 'Issued On', value: formatDateTimeLong() },
      { label: 'Patient', value: `${patientName || 'N/A'}${patientId && patientId !== 'N/A' ? ` (${patientId})` : ''}` },
    ],
    note: verified
      ? 'Electronically issued by the AarogyaSandesh platform. Scan the QR code on page 1 to verify this document online.'
      : 'Electronically issued by the AarogyaSandesh platform. The QR code on page 1 carries this document reference for record matching.',
  });
}
