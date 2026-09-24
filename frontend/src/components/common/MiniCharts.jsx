import { buildDailySpend, buildCumulativeSeries, buildVitalSeries } from '../../utils/pdfCharts'
import { buildTimetable } from '../../utils/medicineTimetable'

const W = 340
const H = 176
const PLOT = { x: 46, y: 34, w: 280, h: 104 }

const rgb = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`

const compact = (value) => {
  const n = Math.abs(value)
  if (n >= 10000000) return `${(value / 10000000).toFixed(1).replace(/\.0$/, '')}Cr`
  if (n >= 100000) return `${(value / 100000).toFixed(1).replace(/\.0$/, '')}L`
  if (n >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return `${Math.round(value)}`
}

const niceMax = (value) => {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const scaled = value / magnitude
  return (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * magnitude
}

const ticksFor = (max) => (Math.round(max / 10 ** Math.floor(Math.log10(max))) === 5 ? 5 : 4)

const Card = ({ title, subtitle, children }) => (
  <div className="rounded-xl border border-gray-200/70 bg-white overflow-hidden" style={{ borderTop: '3px solid #396447' }}>
    <div className="flex items-center justify-between px-4 pt-3">
      <p className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: '#1e3828' }}>{title}</p>
      {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
    </div>
    {children}
  </div>
)

const Grid = ({ max }) => {
  const ticks = ticksFor(max)
  return Array.from({ length: ticks + 1 }, (_, i) => {
    const y = PLOT.y + PLOT.h - (PLOT.h * i) / ticks
    return (
      <g key={i}>
        <line x1={PLOT.x} x2={PLOT.x + PLOT.w} y1={y} y2={y} stroke="#e0dbd0" strokeWidth="0.6" />
        <text x={PLOT.x - 6} y={y + 3} fontSize="9" textAnchor="end" fill="#6e7470">{compact((max * i) / ticks)}</text>
      </g>
    )
  })
}

const DailySpendChart = ({ data }) => {
  const max = niceMax(Math.max(...data.map((d) => d.value)))
  const slot = PLOT.w / data.length
  const barWidth = Math.min(30, slot * 0.62)
  return (
    <Card title="Daily Spend" subtitle={`${data.length} days`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <Grid max={max} />
        {data.map((point, index) => {
          const barHeight = (PLOT.h * point.value) / max
          const x = PLOT.x + slot * index + (slot - barWidth) / 2
          const y = PLOT.y + PLOT.h - barHeight
          return (
            <g key={point.key}>
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 1)} rx="2.5" fill="#396447" />
              {data.length <= 9 && <text x={x + barWidth / 2} y={y - 4} fontSize="9" fontWeight="700" textAnchor="middle" fill="#1e3828">{compact(point.value)}</text>}
              {(data.length <= 7 || index % Math.ceil(data.length / 7) === 0) && (
                <text x={x + barWidth / 2} y={PLOT.y + PLOT.h + 14} fontSize="9" textAnchor="middle" fill="#6e7470">{point.label}</text>
              )}
            </g>
          )
        })}
      </svg>
    </Card>
  )
}

const ChargesVsDepositsChart = ({ series }) => {
  const max = niceMax(Math.max(...series.map((s) => Math.max(s.charged, s.deposited))))
  const times = series.map((s) => s.t)
  const spread = Math.max(...times) - Math.min(...times)
  const xFor = (index) => {
    if (series.length === 1) return PLOT.x + PLOT.w / 2
    if (spread > 0) return PLOT.x + ((times[index] - Math.min(...times)) / spread) * PLOT.w
    return PLOT.x + (PLOT.w * index) / (series.length - 1)
  }
  const yFor = (value) => PLOT.y + PLOT.h - (PLOT.h * value) / max
  const last = series[series.length - 1]
  const line = (key) => series.map((point, i) => `${i ? 'L' : 'M'}${xFor(i)},${yFor(point[key])}`).join(' ')
  return (
    <Card title="Charges vs Deposits">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <Grid max={max} />
        <path d={line('charged')} fill="none" stroke="#1e3828" strokeWidth="2" />
        <path d={line('deposited')} fill="none" stroke="#b8863a" strokeWidth="2" />
        {series.map((point, i) => (
          <g key={i}>
            <circle cx={xFor(i)} cy={yFor(point.charged)} r="3" fill="#1e3828" />
            <circle cx={xFor(i)} cy={yFor(point.deposited)} r="3" fill="#b8863a" />
          </g>
        ))}
        <circle cx={W - 118} cy={20} r="3" fill="#1e3828" />
        <text x={W - 112} y={23} fontSize="9" fill="#6e7470">Charged</text>
        <circle cx={W - 62} cy={20} r="3" fill="#b8863a" />
        <text x={W - 56} y={23} fontSize="9" fill="#6e7470">Deposited</text>
        <text x={PLOT.x} y={PLOT.y + PLOT.h + 16} fontSize="9.5" fontWeight="700" fill="#1e3828">Charged Rs. {last.charged.toLocaleString('en-IN')}</text>
        <text x={PLOT.x + PLOT.w} y={PLOT.y + PLOT.h + 16} fontSize="9.5" fontWeight="700" textAnchor="end" fill="#b8863a">Deposited Rs. {last.deposited.toLocaleString('en-IN')}</text>
      </svg>
    </Card>
  )
}

export const hasBillingCharts = (items = [], deposits = []) =>
  buildDailySpend(items).length >= 2 || buildCumulativeSeries(items, deposits).length >= 2

export const BillingCharts = ({ items = [], deposits = [] }) => {
  const daily = buildDailySpend(items).slice(-16)
  const cumulative = buildCumulativeSeries(items, deposits)
  const showBars = daily.length >= 2
  const showLine = cumulative.length >= 2
  if (!showBars && !showLine) return null
  return (
    <div className={`grid gap-4 ${showBars && showLine ? 'md:grid-cols-2' : ''}`}>
      {showBars && <DailySpendChart data={daily} />}
      {showLine && <ChargesVsDepositsChart series={cumulative} />}
    </div>
  )
}

const VitalCard = ({ item }) => {
  const last = item.points[item.points.length - 1]
  const abnormal = item.points.filter((p) => p.status?.isAbnormal).length
  const values = item.points.flatMap((p) => p.values).concat(item.band.flatMap((b) => [b.min, b.max]))
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const pad = Math.max((hi - lo) * 0.12, 0.5)
  const minY = lo - pad
  const maxY = hi + pad
  const yFor = (v) => PLOT.y + PLOT.h - ((v - minY) / (maxY - minY)) * PLOT.h
  const times = item.points.map((p) => p.t)
  const spread = Math.max(...times) - Math.min(...times)
  const xFor = (i) => {
    if (item.points.length === 1) return PLOT.x + PLOT.w / 2
    if (spread > 0) return PLOT.x + ((times[i] - Math.min(...times)) / spread) * PLOT.w
    return PLOT.x + (PLOT.w * i) / (item.points.length - 1)
  }
  const lastText = item.key === 'bp' ? String(last.raw) : `${Math.round(last.values[0] * 10) / 10}`
  return (
    <Card title={item.title} subtitle={`${item.points.length} reading${item.points.length === 1 ? '' : 's'}`}>
      <svg viewBox={`0 0 ${W} ${H - 6}`} className="w-full">
        {item.band.map((band, i) => (
          <rect key={i} x={PLOT.x} y={yFor(band.max)} width={PLOT.w} height={Math.max(yFor(band.min) - yFor(band.max), 1)} fill="#e2f0e6" />
        ))}
        <line x1={PLOT.x} x2={PLOT.x + PLOT.w} y1={PLOT.y + PLOT.h} y2={PLOT.y + PLOT.h} stroke="#e0dbd0" strokeWidth="0.6" />
        <text x={PLOT.x - 6} y={PLOT.y + 3} fontSize="9" textAnchor="end" fill="#6e7470">{Math.round(maxY * 10) / 10}</text>
        <text x={PLOT.x - 6} y={PLOT.y + PLOT.h} fontSize="9" textAnchor="end" fill="#6e7470">{Math.round(minY * 10) / 10}</text>
        {item.lines.map((line, li) => (
          <g key={li}>
            <path d={item.points.map((p, i) => `${i ? 'L' : 'M'}${xFor(i)},${yFor(p.values[li])}`).join(' ')} fill="none" stroke={rgb(line.color)} strokeWidth="2" />
            {item.points.map((p, i) => (
              <circle key={i} cx={xFor(i)} cy={yFor(p.values[li])} r={p.status?.isAbnormal ? 3.6 : 2.6} fill={p.status?.isAbnormal ? '#b23434' : rgb(line.color)} />
            ))}
          </g>
        ))}
        {item.lines.length > 1 && item.lines.map((line, li) => (
          <g key={li}>
            <circle cx={PLOT.x + 150 + li * 46} cy={20} r="3" fill={rgb(line.color)} />
            <text x={PLOT.x + 156 + li * 46} y={23} fontSize="9" fill="#6e7470">{line.name}</text>
          </g>
        ))}
        <text x={PLOT.x} y={PLOT.y + PLOT.h + 18} fontSize="10.5" fontWeight="700" fill={last.status?.isAbnormal ? '#b23434' : '#1e3828'}>Last: {lastText} {item.unit}</text>
        <text x={PLOT.x + PLOT.w} y={PLOT.y + PLOT.h + 18} fontSize="9" textAnchor="end" fill={abnormal ? '#b23434' : '#6e7470'}>{abnormal ? `${abnormal} outside normal` : 'All within normal'}</text>
      </svg>
    </Card>
  )
}

export const VitalsCharts = ({ vitals = [] }) => {
  const series = buildVitalSeries(vitals)
  if (!series.length) return null
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {series.map((item) => <VitalCard key={item.key} item={item} />)}
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Green band = normal range. Red points = readings outside the normal range.</p>
    </div>
  )
}

export const MedicineTimetableView = ({ medicines = [] }) => {
  const rows = buildTimetable(medicines)
  if (!rows.length) return null
  const Dot = ({ on }) => (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full"
      style={on ? { background: '#26804e', color: '#fff' } : { border: '1.5px solid #e0dbd0' }}
    >
      {on && <svg viewBox="0 0 12 12" width="11" height="11"><path d="M2.5 6.4 5 8.8 9.6 3.6" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
    </span>
  )
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200/70 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white text-xs" style={{ background: '#1e3828' }}>
            <th className="px-3 py-2 text-left font-semibold">Medicine</th>
            <th className="px-3 py-2 text-left font-semibold">Dose / Route</th>
            <th className="px-3 py-2 text-center font-semibold">Morning</th>
            <th className="px-3 py-2 text-center font-semibold">Afternoon</th>
            <th className="px-3 py-2 text-center font-semibold">Night</th>
            <th className="px-3 py-2 text-left font-semibold">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={index % 2 ? 'bg-[#faf8f3]' : 'bg-white'}>
              <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
              <td className="px-3 py-2 text-gray-600">{row.dose}</td>
              <td className="px-3 py-2 text-center"><Dot on={row.slots.morning} /></td>
              <td className="px-3 py-2 text-center"><Dot on={row.slots.afternoon} /></td>
              <td className="px-3 py-2 text-center"><Dot on={row.slots.night} /></td>
              <td className="px-3 py-2 text-gray-500">{row.note || row.frequency}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
