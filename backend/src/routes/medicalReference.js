import express from 'express'

const router = express.Router()

function stripHtml(str) {
  if (!str) return ''
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function extractTag(block, tagAttrValue) {
  const regex = new RegExp(`<content name="${tagAttrValue}">([\\s\\S]*?)</content>`, 'i')
  const match = block.match(regex)
  return match ? stripHtml(match[1]) : ''
}

router.get('/condition', async (req, res) => {
  try {
    const { term } = req.query
    if (!term || !term.trim()) {
      return res.status(400).json({ success: false, error: 'term is required' })
    }

    const url = `https://wsearch.nlm.nih.gov/ws/query?db=healthTopics&term=${encodeURIComponent(term.trim())}&retmax=1`
    const response = await fetch(url)
    if (!response.ok) {
      return res.json({ success: true, found: false })
    }
    const xml = await response.text()

    const docMatch = xml.match(/<document rank="0" url="([^"]*)"[^>]*>([\s\S]*?)<\/document>/i)
    if (!docMatch) {
      return res.json({ success: true, found: false })
    }

    const sourceUrl = docMatch[1]
    const block = docMatch[2]
    const title = extractTag(block, 'title')
    let summary = extractTag(block, 'FullSummary')
    if (!summary) summary = extractTag(block, 'snippet')

    if (!title) {
      return res.json({ success: true, found: false })
    }

    res.json({
      success: true,
      found: true,
      title,
      summary: summary || 'No plain-language summary available for this term from MedlinePlus.',
      sourceUrl,
      source: 'MedlinePlus (U.S. National Library of Medicine)'
    })
  } catch (error) {
    console.error('Medical reference condition lookup error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch condition reference data' })
  }
})

const WHO_INDICATORS = [
  { code: 'WHOSIS_000001', label: 'Life Expectancy at Birth', unit: 'years', pageUrl: 'https://www.who.int/data/gho/data/indicators/indicator-details/GHO/life-expectancy-at-birth-(years)' },
  { code: 'UHC_INDEX_REPORTED', label: 'Universal Health Coverage Index', unit: '/100', pageUrl: 'https://www.who.int/data/gho/data/indicators/indicator-details/GHO/uhc-index-of-service-coverage' },
  { code: 'GHED_OOPSCHE_SHA2011', label: 'Out-of-Pocket Health Spending', unit: '% of health spend', pageUrl: 'https://www.who.int/data/gho/data/indicators/indicator-details/GHO/out-of-pocket-expenditure-as-percentage-of-current-health-expenditure-(che)-(-)' },
  { code: 'SDGPM25', label: 'Air Pollution (PM2.5) Exposure', unit: 'µg/m³', pageUrl: 'https://www.who.int/data/gho/data/indicators/indicator-details/GHO/concentrations-of-fine-particulate-matter-(pm2-5)' }
]

router.get('/india-health-context', async (req, res) => {
  try {
    const results = await Promise.all(WHO_INDICATORS.map(async (indicator) => {
      try {
        const url = `https://ghoapi.azureedge.net/api/${indicator.code}?$filter=SpatialDim eq 'IND'&$orderby=TimeDim desc&$top=1`
        const response = await fetch(url)
        if (!response.ok) return null
        const body = await response.json()
        const entry = body.value?.[0]
        if (!entry) return null
        return {
          label: indicator.label,
          unit: indicator.unit,
          value: entry.Value,
          year: entry.TimeDim,
          pageUrl: indicator.pageUrl
        }
      } catch {
        return null
      }
    }))

    res.json({
      success: true,
      indicators: results.filter(Boolean),
      source: 'WHO Global Health Observatory'
    })
  } catch (error) {
    console.error('India health context lookup error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch WHO health context data' })
  }
})

let icdTokenCache = { token: null, expiresAt: 0 }

async function getICDToken() {
  if (icdTokenCache.token && Date.now() < icdTokenCache.expiresAt) {
    return icdTokenCache.token
  }
  const tokenRes = await fetch('https://icdaccessmanagement.who.int/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.ICD_CLIENT_ID,
      client_secret: process.env.ICD_CLIENT_SECRET,
      scope: 'icdapi_access',
      grant_type: 'client_credentials'
    })
  })
  if (!tokenRes.ok) {
    throw new Error('Failed to obtain WHO ICD-11 access token')
  }
  const tokenData = await tokenRes.json()
  icdTokenCache = {
    token: tokenData.access_token,
    expiresAt: Date.now() + (tokenData.expires_in - 60) * 1000
  }
  return icdTokenCache.token
}

router.get('/icd11', async (req, res) => {
  try {
    const { term } = req.query
    if (!term || !term.trim()) {
      return res.status(400).json({ success: false, error: 'term is required' })
    }
    if (!process.env.ICD_CLIENT_ID || !process.env.ICD_CLIENT_SECRET) {
      return res.json({ success: true, found: false })
    }

    const token = await getICDToken()
    const icdHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Accept-Language': 'en',
      'API-Version': 'v2'
    }

    const searchUrl = `https://id.who.int/icd/release/11/2024-01/mms/search?q=${encodeURIComponent(term.trim())}`
    const searchRes = await fetch(searchUrl, { headers: icdHeaders })
    if (!searchRes.ok) {
      return res.json({ success: true, found: false })
    }
    const searchData = await searchRes.json()
    const first = searchData.destinationEntities?.[0]
    if (!first) {
      return res.json({ success: true, found: false })
    }

    const entityUrl = first.id.replace('http://', 'https://')
    const entityRes = await fetch(entityUrl, { headers: icdHeaders })
    if (!entityRes.ok) {
      return res.json({ success: true, found: false })
    }
    const entity = await entityRes.json()

    res.json({
      success: true,
      found: true,
      title: entity.title?.['@value'] || stripHtml(first.title),
      code: entity.code || null,
      definition: entity.definition?.['@value'] || null,
      browserUrl: entity.browserUrl || null,
      source: 'WHO ICD-11 (International Classification of Diseases)'
    })
  } catch (error) {
    console.error('ICD-11 lookup error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch ICD-11 reference data' })
  }
})

export default router
