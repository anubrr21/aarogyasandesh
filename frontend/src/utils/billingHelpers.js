export const BILL_CATEGORIES = ['Diagnostic', 'Procedure', 'Medicine', 'Room', 'Consultation', 'Other'];

export const CATEGORY_COLORS = {
  Diagnostic: '#396447',
  Procedure: '#96692f',
  Medicine: '#4a7c5a',
  Room: '#2e5039',
  Consultation: '#cca24d',
  Other: '#6b9a79',
};

export function getItemStatus(item) {
  return item?.status === 'paid' ? 'paid' : 'unpaid';
}

export function computePaymentTotals(items = []) {
  let paid = 0;
  let unpaid = 0;
  items.forEach((item) => {
    const amount = parseFloat(item.amount) || 0;
    if (getItemStatus(item) === 'paid') paid += amount;
    else unpaid += amount;
  });
  return { paid, unpaid };
}

export function computeCategoryBreakdown(items = []) {
  const totals = {};
  items.forEach((item) => {
    const category = item.category || 'Other';
    const amount = parseFloat(item.amount) || 0;
    totals[category] = (totals[category] || 0) + amount;
  });
  const grandTotal = Object.values(totals).reduce((sum, v) => sum + v, 0);
  return Object.entries(totals)
    .map(([category, amount]) => ({
      category,
      amount,
      percent: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
      color: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getInvoiceNumber(billingData, patientId) {
  if (billingData?.invoiceNumber) return billingData.invoiceNumber;
  const slug = (patientId || 'UNKNOWN').toString().replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return `AS-INV-${slug}`;
}

export function getTopExpenses(items = [], limit = 5) {
  const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  return [...items]
    .map((item) => ({ ...item, amount: parseFloat(item.amount) || 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
    .map((item) => ({ ...item, percent: total > 0 ? (item.amount / total) * 100 : 0 }));
}

export function computeDailyAverage(totalBill, lengthOfStay) {
  const days = Math.max(1, lengthOfStay || 1);
  return totalBill / days;
}

export function buildBillingInsights({ items = [], totalBill = 0, lengthOfStay = 1, totalPaid = 0, totalUnpaid = 0 }) {
  const insights = [];
  const breakdown = computeCategoryBreakdown(items);

  if (breakdown.length > 0) {
    const top = breakdown[0];
    insights.push({
      type: 'category',
      text: `${top.category} is your largest expense category at ₹${top.amount.toLocaleString('en-IN')} (${top.percent.toFixed(0)}% of total bill).`,
    });
  }

  if (items.length > 0 && totalBill > 0) {
    const dailyAvg = computeDailyAverage(totalBill, lengthOfStay);
    insights.push({
      type: 'pace',
      text: `Average spend is ₹${Math.round(dailyAvg).toLocaleString('en-IN')} per day over ${lengthOfStay} day(s) of stay.`,
    });
  }

  if (totalBill > 0) {
    const paidPercent = (totalPaid / totalBill) * 100;
    insights.push({
      type: 'payment',
      text: paidPercent >= 100
        ? 'All billed items are marked as paid.'
        : `${paidPercent.toFixed(0)}% of the bill is paid so far; ₹${totalUnpaid.toLocaleString('en-IN')} remains unpaid.`,
    });
  }

  const top = getTopExpenses(items, 1)[0];
  if (top) {
    insights.push({
      type: 'highest',
      text: `Highest single charge: "${top.description}" at ₹${top.amount.toLocaleString('en-IN')} (${top.percent.toFixed(0)}% of total).`,
    });
  }

  return insights;
}
