import Fuse from 'fuse.js'
import cghsData from '../data/cghs_rates.json'

const fuse = new Fuse(cghsData, {
  keys: ['searchName', 'name'],
  threshold: 0.32,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  useExtendedSearch: true,
  shouldSort: true
})

const ANOMALY_THRESHOLD = 1.25

export function checkAnomaly(itemName, chargedAmount) {
  if (!itemName || !chargedAmount || chargedAmount <= 0) {
    return {
      status: 'invalid',
      message: 'Invalid item or amount',
      benchmarkRate: null,
      chargedAmount: chargedAmount || 0,
      diffPercent: 0,
      matchConfidence: 0,
      matchedName: null,
      matchedId: null,
      tier: null,
      category: null
    }
  }

  const searchTerm = itemName.toLowerCase().trim()
  const results = fuse.search(searchTerm)

  if (!results || results.length === 0) {
    return {
      status: 'unmatched',
      message: 'No CGHS benchmark found for this item',
      benchmarkRate: null,
      chargedAmount: chargedAmount,
      diffPercent: 0,
      matchConfidence: 0,
      matchedName: null,
      matchedId: null,
      tier: null,
      category: null
    }
  }

  const best = results[0]
  const matchedItem = best.item
  const ratio = chargedAmount / matchedItem.rate
  const flagged = ratio > ANOMALY_THRESHOLD
  const diffPercent = Math.round((ratio - 1) * 100)
  const matchConfidence = Math.round((1 - (best.score || 0)) * 100)

  return {
    status: flagged ? 'flagged' : 'normal',
    message: flagged 
      ? `Charged ${diffPercent}% above CGHS benchmark` 
      : `Within CGHS benchmark range`,
    benchmarkRate: matchedItem.rate,
    chargedAmount: chargedAmount,
    diffPercent: diffPercent,
    matchConfidence: matchConfidence,
    matchedName: matchedItem.name,
    matchedId: matchedItem.id,
    tier: matchedItem.tier,
    category: matchedItem.category,
    facility: matchedItem.facility
  }
}

export function searchCGHS(query) {
  if (!query || query.length < 2) return []
  const results = fuse.search(query.toLowerCase().trim())
  return results.slice(0, 10).map(r => ({
    ...r.item,
    score: r.score,
    matchConfidence: Math.round((1 - (r.score || 0)) * 100)
  }))
}

export function getCGHSItemById(id) {
  return cghsData.find(item => item.id === id) || null
}

export function getTierExplanation(tier) {
  const explanations = {
    'TIER I': 'Tier I hospitals are NABH-accredited or equivalent, meeting the highest quality standards for patient care, safety, and infrastructure. These hospitals follow strict protocols and have advanced medical facilities. This includes major corporate hospitals, super-specialty centers, and teaching hospitals with NABH accreditation.',
    'TIER II': 'Tier II hospitals meet standard quality requirements with basic infrastructure, qualified staff, and adequate facilities for common procedures and treatments. These include district hospitals, medium-sized private hospitals, and nursing homes with good facilities.',
    'TIER III': 'Tier III hospitals provide primary care services in rural and underserved areas. These are essential for community healthcare access. Examples include Primary Health Centers (PHCs), Community Health Centers (CHCs), and small nursing homes.'
  }
  return explanations[tier] || 'Standard CGHS rate category.'
}

export function getNABHExplanation() {
  return 'NABH (National Accreditation Board for Hospitals & Healthcare Providers) is India\'s premier healthcare accreditation body. It sets quality standards for hospitals to ensure patient safety, quality care, and continuous improvement. NABH accreditation indicates that a hospital meets rigorous quality benchmarks.'
}

export default {
  checkAnomaly,
  searchCGHS,
  getCGHSItemById,
  getTierExplanation,
  getNABHExplanation
}