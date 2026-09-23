const WIDTH = 600;
const HEIGHT = 160;
const PAD_L = 44;
const PAD_B = 22;
const PAD_T = 10;
const PAD_R = 10;

const SpendTrendChart = ({ items = [] }) => {
  const sorted = [...items]
    .filter((i) => i.addedAt)
    .sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt));

  if (sorted.length === 0) return null;

  let running = 0;
  const points = sorted.map((item) => {
    running += parseFloat(item.amount) || 0;
    return { date: new Date(item.addedAt), value: running, label: item.description };
  });

  const maxVal = points[points.length - 1].value || 1;
  const minDate = points[0].date.getTime();
  const maxDate = points[points.length - 1].date.getTime();
  const dateSpan = maxDate - minDate || 1;

  const innerW = WIDTH - PAD_L - PAD_R;
  const innerH = HEIGHT - PAD_T - PAD_B;

  const xFor = (d) => PAD_L + ((d.getTime() - minDate) / dateSpan) * innerW;
  const yFor = (v) => PAD_T + innerH - (v / maxVal) * innerH;

  const coords = points.map((p) => [xFor(p.date), yFor(p.value)]);
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${(PAD_T + innerH).toFixed(1)} L${coords[0][0].toFixed(1)},${(PAD_T + innerH).toFixed(1)} Z`;

  const yTicks = [0, 0.5, 1].map((f) => Math.round(maxVal * f));

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      {yTicks.map((t, i) => {
        const y = yFor(t);
        return (
          <g key={i}>
            <line x1={PAD_L} y1={y} x2={WIDTH - PAD_R} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD_L - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
              ₹{t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="#396447" opacity="0.08" />
      <path d={linePath} fill="none" stroke="#396447" strokeWidth="2" />

      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#396447">
          <title>{points[i].label}: ₹{points[i].value.toLocaleString('en-IN')}</title>
        </circle>
      ))}

      <text x={PAD_L} y={HEIGHT - 4} fontSize="9" fill="#9ca3af">
        {points[0].date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
      </text>
      <text x={WIDTH - PAD_R} y={HEIGHT - 4} textAnchor="end" fontSize="9" fill="#9ca3af">
        {points[points.length - 1].date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
      </text>
    </svg>
  );
};

export default SpendTrendChart;
