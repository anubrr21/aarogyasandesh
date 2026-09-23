const cache = new Map()

export async function withCache(key, ttlMs, fetchFn) {
  const entry = cache.get(key)
  const now = Date.now()

  if (entry && now - entry.timestamp < ttlMs) {
    return { data: entry.data, stale: false }
  }

  try {
    const data = await fetchFn()
    cache.set(key, { data, timestamp: now })
    return { data, stale: false }
  } catch (error) {
    if (entry) {
      return { data: entry.data, stale: true }
    }
    throw error
  }
}
