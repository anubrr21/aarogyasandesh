import express from 'express'
import { withCache } from '../utils/dataGovCache.js'

const router = express.Router()

const CACHE_TTL_MS = 15 * 60 * 1000
const DATA_GOV_API_KEY = process.env.DATA_GOV_IN_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b'

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

router.get('/blood-supply', async (req, res) => {
  try {
    const { data, stale } = await withCache('blood-supply', CACHE_TTL_MS, async () => {
      const [collected, issued] = await Promise.all([
        fetchPaginated('20865906-571d-4b1a-a788-3086c30a4e23', 100),
        fetchPaginated('07d892c6-9385-419f-b52c-291762b63c1a', 100)
      ])
      return {
        collected,
        issued,
        source: 'e-RaktKosh, via Government of India Open Data Platform (data.gov.in)',
        sourceUrl: 'https://eraktkosh.mohfw.gov.in/'
      }
    })
    res.json({ success: true, ...data, stale })
  } catch (error) {
    console.error('Blood supply data error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch blood supply data' })
  }
})

router.get('/health-infrastructure', async (req, res) => {
  try {
    const { data, stale } = await withCache('health-infrastructure', CACHE_TTL_MS, async () => {
      const records = await fetchPaginated('2a46cf3c-a9ee-4ae4-ab63-e6a1e9c42e40', 100)
      return {
        records,
        source: 'Rural Health Statistics, National Health Mission (via data.gov.in)',
        sourceUrl: 'https://nhm.gov.in/'
      }
    })
    res.json({ success: true, ...data, stale })
  } catch (error) {
    console.error('Health infrastructure data error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch health infrastructure data' })
  }
})

router.get('/air-quality', async (req, res) => {
  try {
    const { data, stale } = await withCache('air-quality', CACHE_TTL_MS, async () => {
      const rawRecords = await fetchPaginated('3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69', 100)
      const seen = new Set()
      const stations = []
      for (const record of rawRecords) {
        if (!seen.has(record.city)) {
          seen.add(record.city)
          stations.push(record)
        }
      }
      return {
        stations,
        source: 'CPCB — Central Pollution Control Board, Real-Time AQI (via data.gov.in)',
        sourceUrl: 'https://www.data.gov.in/resource/real-time-air-quality-index-various-locations'
      }
    })
    res.json({ success: true, ...data, stale })
  } catch (error) {
    console.error('Air quality data error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch air quality data' })
  }
})

export default router
