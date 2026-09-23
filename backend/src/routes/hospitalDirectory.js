import express from 'express'
import { withCache } from '../utils/dataGovCache.js'

const router = express.Router()

const CACHE_TTL_MS = 15 * 60 * 1000
const DATA_GOV_API_KEY = process.env.DATA_GOV_IN_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b'
const RESOURCE_ID = '98fa254e-c5f8-4910-a19b-4828939b477d'
const PMJAY_RESOURCE_ID = 'e7255d28-1378-4984-ae22-0784e4e0f599'

function toTitleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

async function fetchWithRetry(url, attempts = 4) {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
    } catch {
      // network hiccup, fall through to retry
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (i + 1)))
    }
  }
  return null
}

async function fetchPaginated(resourceId, maxRecords) {
  const records = []
  let offset = 0
  const pageSize = 10
  let pagesFetched = 0
  while (records.length < maxRecords) {
    const url = `https://api.data.gov.in/resource/${resourceId}?api-key=${DATA_GOV_API_KEY}&format=json&limit=${pageSize}&offset=${offset}`
    const response = await fetchWithRetry(url)
    if (!response) {
      if (pagesFetched === 0) throw new Error(`data.gov.in request failed for resource ${resourceId} after retries`)
      break
    }
    pagesFetched++
    const data = await response.json()
    const batch = data.records || []
    records.push(...batch)
    offset += pageSize
    if (batch.length < pageSize) break
    if (data.total && offset >= data.total) break
  }
  return records
}

router.get('/pmjay-stats', async (req, res) => {
  try {
    const { data, stale } = await withCache('pmjay-stats', CACHE_TTL_MS, async () => {
      const records = await fetchPaginated(PMJAY_RESOURCE_ID, 60)
      return {
        states: records,
        source: 'Rajya Sabha (Ministry of Health & Family Welfare), via data.gov.in',
        sourceUrl: 'https://www.data.gov.in/resource/stateut-wise-number-hospitals-empanelled-under-ayushman-bharat-pradhan-mantri-jan-arogaya'
      }
    })
    res.json({ success: true, ...data, stale })
  } catch (error) {
    console.error('PM-JAY stats error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch PM-JAY empanelment statistics' })
  }
})

router.get('/search', async (req, res) => {
  try {
    const { state, district, maxResults } = req.query
    if (!state || !state.trim()) {
      return res.status(400).json({ success: false, error: 'state is required' })
    }

    const limit = Math.min(parseInt(maxResults, 10) || 50, 100)
    const cacheKey = `search:${toTitleCase(state)}:${district ? toTitleCase(district) : ''}:${limit}`

    const { data, stale } = await withCache(cacheKey, CACHE_TTL_MS, async () => {
      const records = []
      let offset = 0
      const pageSize = 10
      let pagesFetched = 0

      while (records.length < limit) {
        const params = new URLSearchParams({
          'api-key': DATA_GOV_API_KEY,
          format: 'json',
          limit: String(pageSize),
          offset: String(offset),
          'filters[state]': toTitleCase(state)
        })
        if (district && district.trim()) {
          params.set('filters[district]', toTitleCase(district))
        }
        const url = `https://api.data.gov.in/resource/${RESOURCE_ID}?${params.toString()}`
        const response = await fetchWithRetry(url)
        if (!response) {
          if (pagesFetched === 0) throw new Error('data.gov.in request failed after retries')
          break
        }
        pagesFetched++
        const page = await response.json()
        const batch = page.records || []
        records.push(...batch)
        offset += pageSize
        if (batch.length < pageSize) break
        if (page.total && offset >= page.total) break
      }

      const hospitals = records.slice(0, limit)
      return {
        hospitals,
        count: hospitals.length,
        source: 'National Hospital Directory, National Health Portal (via data.gov.in)',
        sourceUrl: 'https://www.data.gov.in/resource/national-hospital-directory-geo-code-and-additional-parameters-updated-till-last-month'
      }
    })

    res.json({ success: true, ...data, stale })
  } catch (error) {
    console.error('Hospital directory search error:', error)
    res.status(500).json({ success: false, error: 'Failed to search hospital directory' })
  }
})

export default router
