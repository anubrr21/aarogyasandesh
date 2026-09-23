const SIZES = {
  xs: { en: 'text-sm', hi: 'text-sm' },
  sm: { en: 'text-lg', hi: 'text-base' },
  md: { en: 'text-2xl', hi: 'text-xl' },
  lg: { en: 'text-3xl lg:text-4xl', hi: 'text-2xl lg:text-3xl' },
  xl: { en: 'text-5xl lg:text-6xl', hi: 'text-3xl lg:text-4xl' },
}

const Wordmark = ({ size = 'md', stacked = true, className = '', enClassName = '', hiClassName = '' }) => {
  const scale = SIZES[size] || SIZES.md

  if (stacked) {
    return (
      <span className={`inline-flex flex-col items-start gap-0 leading-[0.92] ${className}`}>
        <span className={`font-display font-bold tracking-tight ${scale.en} ${enClassName}`}>Aarogya</span>
        <span className={`font-devanagari font-bold tracking-tight ${scale.hi} ${hiClassName}`}>संदेश</span>
      </span>
    )
  }

  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span className={`font-display font-bold tracking-tight ${scale.en} ${enClassName}`}>Aarogya</span>
      <span className={`font-devanagari font-bold tracking-tight ${scale.hi} ${hiClassName}`}>संदेश</span>
    </span>
  )
}

export default Wordmark
