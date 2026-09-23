import { CheckCircle2, Clock, Wallet, Scale } from 'lucide-react';

const Tile = ({ icon: Icon, label, value, tone }) => (
  <div className="p-3 bg-white rounded-lg border border-forest-900/10">
    <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
      <Icon size={12} className={tone} />
      {label}
    </div>
    <p className={`text-base font-semibold ${tone}`}>₹{Math.abs(value).toLocaleString('en-IN')}</p>
  </div>
);

const BillingSummaryPanel = ({ totalPaid = 0, totalUnpaid = 0, totalDeposits = 0, balance = 0, className = '' }) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className}`}>
      <Tile icon={CheckCircle2} label="Paid" value={totalPaid} tone="text-forest-700" />
      <Tile icon={Clock} label="Unpaid" value={totalUnpaid} tone="text-brass-600" />
      <Tile icon={Wallet} label="Deposits" value={totalDeposits} tone="text-blue-600" />
      <Tile icon={Scale} label={balance >= 0 ? 'Refund Due' : 'Balance Due'} value={balance} tone={balance >= 0 ? 'text-forest-700' : 'text-red-600'} />
    </div>
  );
};

export default BillingSummaryPanel;
