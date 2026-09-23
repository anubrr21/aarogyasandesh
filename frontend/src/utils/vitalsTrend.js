import { getVitalStatus, VITALS_NORMAL_RANGES } from './vitalsUtils';

const TREND_KEYS = ['bp', 'pulse', 'temperature', 'oxygenSaturation', 'respiratoryRate'];

function readingValue(vital, key) {
  if (key === 'temperature') return vital.temperature;
  return vital[key];
}

function readingUnit(vital, key) {
  if (key === 'temperature') return `°${vital.temperatureUnit || 'C'}`;
  return undefined;
}

export function computeVitalsTrend(vitals = []) {
  const sorted = [...vitals]
    .filter((v) => v.recordedAt)
    .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));

  if (sorted.length === 0) return [];

  return TREND_KEYS.map((key) => {
    const readings = sorted
      .map((v) => ({ value: readingValue(v, key), unit: readingUnit(v, key), recordedAt: v.recordedAt }))
      .filter((r) => r.value !== undefined && r.value !== null && r.value !== '');

    if (readings.length === 0) {
      return { key, displayName: VITALS_NORMAL_RANGES[key].displayName, hasData: false };
    }

    const first = readings[0];
    const last = readings[readings.length - 1];
    const firstStatus = getVitalStatus(key, first.value, first.unit);
    const lastStatus = getVitalStatus(key, last.value, last.unit);

    let trend = 'stable-normal';
    if (readings.length === 1) {
      trend = lastStatus.isAbnormal ? 'single-abnormal' : 'single-normal';
    } else if (firstStatus.isAbnormal && !lastStatus.isAbnormal) {
      trend = 'improving';
    } else if (!firstStatus.isAbnormal && lastStatus.isAbnormal) {
      trend = 'worsening';
    } else if (firstStatus.isAbnormal && lastStatus.isAbnormal) {
      trend = 'stable-abnormal';
    }

    return {
      key,
      displayName: VITALS_NORMAL_RANGES[key].displayName,
      hasData: true,
      readingCount: readings.length,
      first: { value: first.value, unit: first.unit, recordedAt: first.recordedAt },
      last: { value: last.value, unit: last.unit, recordedAt: last.recordedAt, status: lastStatus },
      trend,
    };
  });
}

export const TREND_LABELS = {
  improving: { label: 'Improving', color: 'text-forest-700', bg: 'bg-forest-50', border: 'border-forest-200' },
  worsening: { label: 'Worsening', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  'stable-normal': { label: 'Stable · Normal', color: 'text-forest-700', bg: 'bg-forest-50', border: 'border-forest-200' },
  'stable-abnormal': { label: 'Stable · Abnormal', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  'single-normal': { label: 'Normal', color: 'text-forest-700', bg: 'bg-forest-50', border: 'border-forest-200' },
  'single-abnormal': { label: 'Abnormal', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
};
