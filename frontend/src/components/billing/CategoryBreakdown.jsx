import { computeCategoryBreakdown } from '../../utils/billingHelpers';

const CategoryBreakdown = ({ items = [], className = '' }) => {
  const breakdown = computeCategoryBreakdown(items);

  if (breakdown.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="space-y-2.5">
        {breakdown.map((row) => (
          <div key={row.category}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-600 font-medium">{row.category}</span>
              <span className="text-gray-500">
                ₹{row.amount.toLocaleString('en-IN')} <span className="text-gray-400">({row.percent.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${row.percent}%`, backgroundColor: row.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryBreakdown;
