const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export async function fetchBloodSupplyStats() {
  try {
    const res = await fetch(`${API_URL}/api/india-data/blood-supply`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    return data
  } catch (err) {
    console.error('Blood supply fetch failed:', err)
    return null
  }
}

export async function fetchHealthInfrastructure() {
  try {
    const res = await fetch(`${API_URL}/api/india-data/health-infrastructure`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    return data
  } catch (err) {
    console.error('Health infrastructure fetch failed:', err)
    return null
  }
}

export async function fetchAirQualityStations() {
  try {
    const res = await fetch(`${API_URL}/api/india-data/air-quality`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success) return null
    return data
  } catch (err) {
    console.error('Air quality fetch failed:', err)
    return null
  }
}
