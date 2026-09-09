import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
export const GENESIS_HASH = 'GENESIS'

function stableStringify(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj)
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`
  const keys = Object.keys(obj).sort()
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`
}

async function sha256Hex(message) {
  const data = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function computeChainLink(eventId, action, timestamp, previousHash, extra = {}) {
  const safePreviousHash = previousHash || GENESIS_HASH
  const message = stableStringify({ eventId, action, timestamp, previousHash: safePreviousHash, extra })
  const hash = await sha256Hex(message)
  return { action, timestamp, hash, previousHash: safePreviousHash, extra }
}

export async function verifyConsentChain(consentEvents, storedHead) {
  const allLinks = []
  for (const ev of (consentEvents || [])) {
    for (const link of (ev.chainLinks || [])) {
      allLinks.push({ ...link, eventId: ev.id })
    }
  }
  allLinks.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  let expectedPrev = GENESIS_HASH
  for (let i = 0; i < allLinks.length; i++) {
    const link = allLinks[i]
    if (link.previousHash !== expectedPrev) return { valid: false, brokenAt: i }
    const recomputed = await sha256Hex(
      stableStringify({ eventId: link.eventId, action: link.action, timestamp: link.timestamp, previousHash: link.previousHash, extra: link.extra || {} })
    )
    if (recomputed !== link.hash) return { valid: false, brokenAt: i }
    expectedPrev = link.hash
  }

  if (allLinks.length > 0 && storedHead && storedHead !== allLinks[allLinks.length - 1].hash) {
    return { valid: false, brokenAt: allLinks.length }
  }

  return { valid: true, brokenAt: null }
}
export async function appendToImmutableLog(db, patientId, link) {
  try {
    await addDoc(collection(db, 'patients', patientId, 'consentChainLog'), {
      ...link,
      loggedAt: serverTimestamp()
    })
  } catch (error) {
    console.error('Error appending to immutable consent log:', error)
  }
}