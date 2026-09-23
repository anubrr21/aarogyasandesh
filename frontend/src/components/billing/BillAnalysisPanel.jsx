import { useMemo, useState } from 'react';
import { TrendingUp, Lightbulb, Trophy, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { checkAnomaly } from '../../utils/billAnomaly';
import { buildBillingInsights, getTopExpenses, computeCategoryBreakdown, CATEGORY_COLORS } from '../../utils/billingHelpers';
import SpendTrendChart from './SpendTrendChart';

const BillAnalysisPanel = ({ items = [], totalBill = 0, lengthOfStay = 1, totalPaid = 0, totalUnpaid = 0 }) => {
  const [expanded, setExpanded] = useState(true);

  const insights = useMemo(
    () => buildBillingInsights({ items, totalBill, lengthOfStay, totalPaid, totalUnpaid }),
    [items, totalBill, lengthOfStay, totalPaid, totalUnpaid]
  );

  const topExpenses = useMemo(() => getTopExpenses(items, 5), [items]);
  const breakdown = useMemo(() => computeCategoryBreakdown(items), [items]);

  const benchmarkSummary = useMemo(() => {
    const summary = { flagged: 0, normal: 0, unmatched: 0 };
    items.forEach((item) => {
      const result = checkAnomaly(item.description, parseFloat(item.amount) || 0);
      if (result.status === 'flagged') summary.flagged += 1;
      else if (result.status === 'normal') summary.normal += 1;
      else summary.unmatched += 1;
    });
    return summary;
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="card-editorial rounded-lg p-5 mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-forest-700" />
          <h4 className="font-display font-semibold text-gray-900">Bill Analysis</h4>
          <span className="text-xs text-gray-400">Auto-generated from your billing data</span>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-5">
          {insights.length > 0 && (
            <div className="space-y-2">
              {insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-parchment-50 border border-forest-900/10 rounded-lg px-3 py-2">
                  <Lightbulb size={14} className="text-brass-500 mt-0.5 flex-shrink-0" />
                  <span>{insight.text}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Cumulative Spend Over Time</p>
              <SpendTrendChart items={items} />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Trophy size={12} className="text-brass-500" /> Top Expenses
              </p>
              <div className="space-y-1.5">
                {topExpenses.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white/60 border border-gray-200/50 rounded-lg px-2.5 py-1.5">
                    <span className="text-gray-700 truncate flex-1 mr-2">{i + 1}. {item.description}</span>
                    <span className="text-gray-900 font-medium whitespace-nowrap">₹{item.amount.toLocaleString('en-IN')}</span>
                    <span className="text-gray-400 ml-2 whitespace-nowrap">{item.percent.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-forest-700" /> CGHS Benchmark Check
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-red-50 border border-red-200 rounded-lg py-2">
                <p className="text-lg font-semibold text-red-600">{benchmarkSummary.flagged}</p>
                <p className="text-[10px] text-red-500 uppercase tracking-wide">Flagged</p>
              </div>
              <div className="text-center bg-forest-50 border border-forest-200 rounded-lg py-2">
                <p className="text-lg font-semibold text-forest-700">{benchmarkSummary.normal}</p>
                <p className="text-[10px] text-forest-600 uppercase tracking-wide">Within Range</p>
              </div>
              <div className="text-center bg-gray-50 border border-gray-200 rounded-lg py-2">
                <p className="text-lg font-semibold text-gray-500">{benchmarkSummary.unmatched}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Unmatched</p>
              </div>
            </div>
            {benchmarkSummary.flagged > 0 && (
              <p className="text-xs text-red-500 mt-2">
                {benchmarkSummary.flagged} item(s) charged above the CGHS benchmark rate — see the "Bill Check" tab for details.
              </p>
            )}
          </div>

          {breakdown.length > 1 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Category Mix</p>
              <div className="flex h-2.5 w-full rounded-full overflow-hidden">
                {breakdown.map((row) => (
                  <div
                    key={row.category}
                    style={{ width: `${row.percent}%`, backgroundColor: row.color }}
                    title={`${row.category}: ₹${row.amount.toLocaleString('en-IN')}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {breakdown.map((row) => (
                  <span key={row.category} className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.category}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillAnalysisPanel;
