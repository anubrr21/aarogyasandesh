import { computeVitalsTrend } from './vitalsTrend';
import { VITALS_NORMAL_RANGES, getVitalStatus } from './vitalsUtils';
import { COLORS, MARGIN, drawSectionTitle, ensureSpace, formatRs } from './pdfBranding';

const GAP = 6;

function compact(value) {
  const n = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (n >= 10000000) return `${sign}${(n / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`;
  if (n >= 100000) return `${sign}${(n / 100000).toFixed(1).replace(/\.0$/, '')}L`;
  if (n >= 1000) return `${sign}${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${sign}${Math.round(n)}`;
}

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

function ticksFor(maxValue) {
  const mantissa = maxValue / 10 ** Math.floor(Math.log10(maxValue));
  return Math.round(mantissa) === 5 ? 5 : 4;
}

function dayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function dayKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function drawCard(doc, x, y, width, height, title, subtitle) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 2, 2, 'FD');
  doc.setFillColor(...COLORS.FOREST);
  doc.roundedRect(x, y, width, 1.4, 0.7, 0.7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.6);
  doc.setTextColor(...COLORS.FOREST_DARK);
  doc.text(title.toUpperCase(), x + 4, y + 6.2, { charSpace: 0.4 });
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...COLORS.MUTED);
    doc.text(subtitle, x + width - 4, y + 6.2, { align: 'right' });
  }
}

function drawGrid(doc, plot, maxValue, ticks = ticksFor(maxValue), labelFormat = compact) {
  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(...COLORS.MUTED);
  for (let i = 0; i <= ticks; i++) {
    const value = (maxValue * i) / ticks;
    const gy = plot.y + plot.h - (plot.h * i) / ticks;
    doc.line(plot.x, gy, plot.x + plot.w, gy);
    doc.text(labelFormat(value), plot.x - 1.6, gy + 0.9, { align: 'right' });
  }
}

export function buildDailySpend(items) {
  const totals = new Map();
  items.forEach((item) => {
    const key = item.addedAt ? dayKey(item.addedAt) : null;
    if (!key) return;
    totals.set(key, (totals.get(key) || 0) + (parseFloat(item.amount) || 0));
  });
  return [...totals.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) => ({ key, label: dayLabel(key), value }));
}

export function buildCumulativeSeries(items, deposits) {
  const events = [
    ...items.map((item, index) => ({ t: item.addedAt ? new Date(item.addedAt).getTime() : 0, order: index, charge: parseFloat(item.amount) || 0, deposit: 0 })),
    ...deposits.map((deposit, index) => ({ t: deposit.depositedAt ? new Date(deposit.depositedAt).getTime() : 0, order: 1000 + index, charge: 0, deposit: parseFloat(deposit.amount) || 0 })),
  ].sort((a, b) => a.t - b.t || a.order - b.order);
  let charged = 0;
  let deposited = 0;
  return events.map((event) => {
    charged += event.charge;
    deposited += event.deposit;
    return { t: event.t, charged, deposited };
  });
}

function drawBarChart(doc, x, y, width, height, data) {
  drawCard(doc, x, y, width, height, 'Daily Spend', `${data.length} day${data.length === 1 ? '' : 's'}`);
  const plot = { x: x + 13, y: y + 12, w: width - 19, h: height - 24 };
  const maxValue = niceMax(Math.max(...data.map((d) => d.value)));
  drawGrid(doc, plot, maxValue);

  const slot = plot.w / data.length;
  const barWidth = Math.min(11, slot * 0.62);
  data.forEach((point, index) => {
    const barHeight = (plot.h * point.value) / maxValue;
    const bx = plot.x + slot * index + (slot - barWidth) / 2;
    const by = plot.y + plot.h - barHeight;
    doc.setFillColor(...COLORS.FOREST);
    doc.roundedRect(bx, by, barWidth, Math.max(barHeight, 0.4), 0.8, 0.8, 'F');
    if (data.length <= 9) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(...COLORS.FOREST_DARK);
      doc.text(compact(point.value), bx + barWidth / 2, by - 1, { align: 'center' });
    }
    const showLabel = data.length <= 7 || index % Math.ceil(data.length / 7) === 0;
    if (showLabel) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(...COLORS.MUTED);
      doc.text(point.label, bx + barWidth / 2, plot.y + plot.h + 4.2, { align: 'center' });
    }
  });
}

function drawCumulativeChart(doc, x, y, width, height, series) {
  drawCard(doc, x, y, width, height, 'Charges vs Deposits');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setFillColor(...COLORS.FOREST_DARK);
  doc.circle(x + width - 33, y + 5.6, 0.9, 'F');
  doc.setTextColor(...COLORS.MUTED);
  doc.text('Charged', x + width - 31.4, y + 6.2);
  doc.setFillColor(...COLORS.BRASS);
  doc.circle(x + width - 16, y + 5.6, 0.9, 'F');
  doc.text('Deposited', x + width - 14.4, y + 6.2);

  const plot = { x: x + 13, y: y + 12, w: width - 19, h: height - 24 };
  const maxValue = niceMax(Math.max(...series.map((s) => Math.max(s.charged, s.deposited))));
  drawGrid(doc, plot, maxValue);

  const times = series.map((s) => s.t);
  const spread = Math.max(...times) - Math.min(...times);
  const xFor = (index) => {
    if (series.length === 1) return plot.x + plot.w / 2;
    if (spread > 0) return plot.x + ((times[index] - Math.min(...times)) / spread) * plot.w;
    return plot.x + (plot.w * index) / (series.length - 1);
  };
  const yFor = (value) => plot.y + plot.h - (plot.h * value) / maxValue;

  const drawLine = (key, color) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.7);
    for (let i = 1; i < series.length; i++) {
      doc.line(xFor(i - 1), yFor(series[i - 1][key]), xFor(i), yFor(series[i][key]));
    }
    doc.setFillColor(...color);
    series.forEach((point, i) => doc.circle(xFor(i), yFor(point[key]), 0.9, 'F'));
  };
  drawLine('charged', COLORS.FOREST_DARK);
  drawLine('deposited', COLORS.BRASS);

  const last = series[series.length - 1];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.FOREST_DARK);
  doc.text(`Charged ${formatRs(last.charged)}`, plot.x, plot.y + plot.h + 4.4);
  doc.setTextColor(...COLORS.BRASS);
  doc.text(`Deposited ${formatRs(last.deposited)}`, plot.x + plot.w, plot.y + plot.h + 4.4, { align: 'right' });
}

export function drawBillingCharts(doc, y, { items, deposits }) {
  const daily = buildDailySpend(items).slice(-16);
  const cumulative = buildCumulativeSeries(items, deposits);
  const charts = [];
  if (daily.length >= 2) charts.push('bars');
  if (cumulative.length >= 2) charts.push('cumulative');
  if (!charts.length) return y;

  const w = doc.internal.pageSize.width;
  const total = w - MARGIN * 2;
  const chartWidth = charts.length === 2 ? (total - GAP) / 2 : total;
  const height = 52;

  y = drawSectionTitle(doc, y, 'Billing Charts');
  y = ensureSpace(doc, y, height + 2);
  charts.forEach((kind, index) => {
    const x = MARGIN + index * (chartWidth + GAP);
    if (kind === 'bars') drawBarChart(doc, x, y, chartWidth, height, daily);
    else drawCumulativeChart(doc, x, y, chartWidth, height, cumulative);
  });
  return y + height;
}

function toCelsius(value, unit) {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return null;
  return unit === '°F' ? ((n - 32) * 5) / 9 : n;
}

export function buildVitalSeries(vitals) {
  const sorted = [...vitals]
    .filter((v) => v.recordedAt)
    .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
  const series = [];

  const bpPoints = sorted
    .map((v) => {
      const [sys, dia] = String(v.bp || '').split('/').map((part) => parseInt(part, 10));
      return Number.isNaN(sys) || Number.isNaN(dia) ? null : { t: new Date(v.recordedAt).getTime(), values: [sys, dia], raw: v.bp, status: getVitalStatus('bp', v.bp) };
    })
    .filter(Boolean);
  if (bpPoints.length) {
    series.push({
      key: 'bp',
      title: 'Blood Pressure',
      unit: 'mmHg',
      lines: [{ name: 'Sys', color: COLORS.FOREST_DARK }, { name: 'Dia', color: COLORS.BRASS }],
      band: [{ min: 90, max: 140 }, { min: 60, max: 90 }],
      points: bpPoints,
    });
  }

  const single = (key, title, unit, extract) => {
    const points = sorted
      .map((v) => {
        const value = extract(v);
        if (value === null || value === undefined || Number.isNaN(value)) return null;
        const status = getVitalStatus(key, v[key], key === 'temperature' ? `°${v.temperatureUnit || 'C'}` : undefined);
        return { t: new Date(v.recordedAt).getTime(), values: [value], raw: v[key], status };
      })
      .filter(Boolean);
    if (!points.length) return;
    const range = VITALS_NORMAL_RANGES[key];
    series.push({ key, title, unit, lines: [{ name: title, color: COLORS.FOREST }], band: [{ min: range.min, max: range.max }], points });
  };
  single('pulse', 'Pulse', 'bpm', (v) => (v.pulse === undefined || v.pulse === '' ? null : parseFloat(v.pulse)));
  single('temperature', 'Temperature', '°C', (v) => (v.temperature === undefined || v.temperature === '' ? null : toCelsius(v.temperature, `°${v.temperatureUnit || 'C'}`)));
  single('oxygenSaturation', 'SpO2', '%', (v) => (v.oxygenSaturation === undefined || v.oxygenSaturation === '' ? null : parseFloat(v.oxygenSaturation)));
  single('respiratoryRate', 'Respiratory Rate', '/min', (v) => (v.respiratoryRate === undefined || v.respiratoryRate === '' ? null : parseFloat(v.respiratoryRate)));
  return series;
}

function drawVitalCard(doc, x, y, width, height, item) {
  const last = item.points[item.points.length - 1];
  const abnormalCount = item.points.filter((p) => p.status?.isAbnormal).length;
  drawCard(doc, x, y, width, height, item.title, `${item.points.length} reading${item.points.length === 1 ? '' : 's'}`);

  if (item.lines.length > 1) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    const legendWidth = item.lines.reduce((sum, line) => sum + doc.getTextWidth(line.name) + 6, 0);
    let legendX = x + width - 24 - legendWidth;
    item.lines.forEach((line) => {
      doc.setFillColor(...line.color);
      doc.circle(legendX, y + 5.6, 0.9, 'F');
      doc.setTextColor(...COLORS.MUTED);
      doc.text(line.name, legendX + 1.8, y + 6.2);
      legendX += doc.getTextWidth(line.name) + 6;
    });
  }

  const plot = { x: x + 12, y: y + 11, w: width - 17, h: height - 24 };
  const allValues = item.points.flatMap((p) => p.values).concat(item.band.flatMap((b) => [b.min, b.max]));
  const lo = Math.min(...allValues);
  const hi = Math.max(...allValues);
  const pad = Math.max((hi - lo) * 0.12, 0.5);
  const minY = lo - pad;
  const maxY = hi + pad;
  const yFor = (value) => plot.y + plot.h - ((value - minY) / (maxY - minY)) * plot.h;

  item.band.forEach((band) => {
    doc.setFillColor(226, 240, 230);
    doc.rect(plot.x, yFor(band.max), plot.w, Math.max(yFor(band.min) - yFor(band.max), 0.4), 'F');
  });

  doc.setDrawColor(...COLORS.HAIR);
  doc.setLineWidth(0.15);
  doc.line(plot.x, plot.y + plot.h, plot.x + plot.w, plot.y + plot.h);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.6);
  doc.setTextColor(...COLORS.MUTED);
  doc.text(String(Math.round(maxY * 10) / 10), plot.x - 1.6, plot.y + 1, { align: 'right' });
  doc.text(String(Math.round(minY * 10) / 10), plot.x - 1.6, plot.y + plot.h, { align: 'right' });

  const times = item.points.map((p) => p.t);
  const spread = Math.max(...times) - Math.min(...times);
  const xFor = (index) => {
    if (item.points.length === 1) return plot.x + plot.w / 2;
    if (spread > 0) return plot.x + ((times[index] - Math.min(...times)) / spread) * plot.w;
    return plot.x + (plot.w * index) / (item.points.length - 1);
  };

  item.lines.forEach((line, lineIndex) => {
    doc.setDrawColor(...line.color);
    doc.setLineWidth(0.6);
    for (let i = 1; i < item.points.length; i++) {
      doc.line(xFor(i - 1), yFor(item.points[i - 1].values[lineIndex]), xFor(i), yFor(item.points[i].values[lineIndex]));
    }
    item.points.forEach((point, i) => {
      const abnormal = point.status?.isAbnormal;
      doc.setFillColor(...(abnormal ? COLORS.DANGER : line.color));
      doc.circle(xFor(i), yFor(point.values[lineIndex]), abnormal ? 1.1 : 0.8, 'F');
    });
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(...(last.status?.isAbnormal ? COLORS.DANGER : COLORS.FOREST_DARK));
  const lastText = item.key === 'bp' ? String(last.raw) : `${Math.round(last.values[0] * 10) / 10}`;
  doc.text(`Last: ${lastText} ${item.unit}`, plot.x, plot.y + plot.h + 4.6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(abnormalCount ? COLORS.DANGER[0] : COLORS.MUTED[0], abnormalCount ? COLORS.DANGER[1] : COLORS.MUTED[1], abnormalCount ? COLORS.DANGER[2] : COLORS.MUTED[2]);
  doc.text(abnormalCount ? `${abnormalCount} outside normal` : 'All within normal', plot.x + plot.w, plot.y + plot.h + 4.6, { align: 'right' });
}

export function drawVitalsCharts(doc, y, vitals) {
  if (!vitals || !vitals.length || !computeVitalsTrend(vitals).some((t) => t.hasData)) return y;
  const series = buildVitalSeries(vitals);
  if (!series.length) return y;

  const w = doc.internal.pageSize.width;
  const cardWidth = (w - MARGIN * 2 - GAP) / 2;
  const cardHeight = 42;

  y = drawSectionTitle(doc, y, 'Vitals Charts');
  for (let i = 0; i < series.length; i += 2) {
    y = ensureSpace(doc, y, cardHeight + 2);
    drawVitalCard(doc, MARGIN, y, cardWidth, cardHeight, series[i]);
    if (series[i + 1]) drawVitalCard(doc, MARGIN + cardWidth + GAP, y, cardWidth, cardHeight, series[i + 1]);
    y += cardHeight + 4;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.4);
  doc.setTextColor(...COLORS.MUTED);
  doc.text('Green band = normal range. Red points = readings outside the normal range.', MARGIN, y);
  return y + 3;
}
