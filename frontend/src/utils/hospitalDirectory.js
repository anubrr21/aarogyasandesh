const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function cleanField(value) {
  if (value === null || value === undefined) return null
  const str = String(value).trim()
  if (!str || str === '0' || str.toLowerCase() === 'na' || str.toLowerCase() === 'n/a') return null
  return str
}

export async function fetchPMJAYStats() {
  try {
    const res = await fetch(`${API_URL}/api/hospital-directory/pmjay-stats`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    return data
  } catch (err) {
    console.error('PM-JAY stats fetch failed:', err)
    return null
  }
}

export async function searchHospitalDirectory({ state, district, maxResults }) {
  const term = (state || '').trim()
  if (!term) return null
  try {
    const params = new URLSearchParams({ state: term })
    if (district && district.trim()) params.set('district', district.trim())
    if (maxResults) params.set('maxResults', String(maxResults))
    const res = await fetch(`${API_URL}/api/hospital-directory/search?${params.toString()}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    return data
  } catch (err) {
    console.error('Hospital directory search failed:', err)
    return null
  }
}
