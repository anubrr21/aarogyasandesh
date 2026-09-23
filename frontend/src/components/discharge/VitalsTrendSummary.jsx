import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { computeVitalsTrend, TREND_LABELS } from '../../utils/vitalsTrend';

const TREND_ICON = {
  improving: TrendingUp,
  worsening: TrendingDown,
  'stable-normal': Minus,
  'stable-abnormal': AlertTriangle,
  'single-normal': Minus,
  'single-abnormal': AlertTriangle,
};

const VitalsTrendSummary = ({ vitals = [], className = '' }) => {
  const trend = computeVitalsTrend(vitals).filter((t) => t.hasData);

  if (trend.length === 0) {
    return <p className={`text-sm text-gray-500 ${className}`}>No vitals recorded during this stay.</p>;
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${className}`}>
      {trend.map((t) => {
        const meta = TREND_LABELS[t.trend] || TREND_LABELS['stable-normal'];
        const Icon = TREND_ICON[t.trend] || Minus;
        return (
          <div key={t.key} className={`p-2.5 rounded-lg border ${meta.bg} ${meta.border}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">{t.displayName}</span>
              <span className={`flex items-center gap-1 text-[11px] font-medium ${meta.color}`}>
                <Icon size={11} />
                {meta.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span>First: {t.first.value}{t.first.unit || ''}</span>
              <span>→</span>
              <span className="font-medium text-gray-800">Last: {t.last.value}{t.last.unit || ''}</span>
              {t.readingCount > 1 && <span className="text-gray-400">({t.readingCount} readings)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VitalsTrendSummary;
