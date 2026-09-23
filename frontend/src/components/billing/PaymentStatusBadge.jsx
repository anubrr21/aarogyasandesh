import { CheckCircle2, Clock } from 'lucide-react';

const PaymentStatusBadge = ({ status, className = '' }) => {
  const isPaid = status === 'paid';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
        isPaid ? 'bg-forest-50 text-forest-700 border border-forest-200' : 'bg-brass-50 text-brass-700 border border-brass-200'
      } ${className}`}
    >
      {isPaid ? <CheckCircle2 size={11} /> : <Clock size={11} />}
      {isPaid ? 'Paid' : 'Unpaid'}
    </span>
  );
};

export default PaymentStatusBadge;
