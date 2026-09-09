import { useState, useEffect, useCallback } from 'react'
import { checkAnomaly, searchCGHS } from '../utils/billAnomaly'

export function useBillAnomaly(billingItems = []) {
  const [analyzedItems, setAnalyzedItems] = useState([])
  const [flaggedItems, setFlaggedItems] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    flagged: 0,
    normal: 0,
    unmatched: 0
  })

  useEffect(() => {
    if (billingItems && billingItems.length > 0) {
      const results = billingItems.map(item => ({
        ...item,
        anomaly: checkAnomaly(item.description || item.name || '', item.amount || 0)
      }))
      
      setAnalyzedItems(results)
      
      const flagged = results.filter(r => r.anomaly.status === 'flagged')
      setFlaggedItems(flagged)
      
      setStats({
        total: results.length,
        flagged: flagged.length,
        normal: results.filter(r => r.anomaly.status === 'normal').length,
        unmatched: results.filter(r => r.anomaly.status === 'unmatched').length
      })
    } else {
      setAnalyzedItems([])
      setFlaggedItems([])
      setStats({ total: 0, flagged: 0, normal: 0, unmatched: 0 })
    }
  }, [billingItems])

  const search = useCallback((query, amount) => {
    if (!query || !amount) return null
    return checkAnomaly(query, parseFloat(amount))
  }, [])

  const getSuggestions = useCallback((query) => {
    return searchCGHS(query)
  }, [])

  return {
    analyzedItems,
    flaggedItems,
    stats,
    search,
    getSuggestions
  }
}

export default useBillAnomaly