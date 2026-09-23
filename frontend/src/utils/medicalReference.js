const INN_TO_USAN = {
  paracetamol: 'acetaminophen',
  salbutamol: 'albuterol',
  adrenaline: 'epinephrine',
  frusemide: 'furosemide',
  furosemide: 'furosemide',
  lignocaine: 'lidocaine',
  glyceryl: 'nitroglycerin',
}

function cleanMedicineName(rawName) {
  return (rawName || '').split('(')[0].trim()
}

export async function fetchConditionInfo(diagnosisName) {
  const term = (diagnosisName || '').trim()
  if (!term) return null
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const res = await fetch(`${apiUrl}/api/medical-reference/condition?term=${encodeURIComponent(term)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success || !data.found) return null
    return { title: data.title, summary: data.summary, sourceUrl: data.sourceUrl, source: data.source }
  } catch (err) {
    console.error('Condition lookup failed:', err)
    return null
  }
}

async function queryOpenFDA(name) {
  const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(name)}"+OR+openfda.brand_name:"${encodeURIComponent(name)}"&limit=1`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()
  const result = data.results?.[0]
  if (!result) return null
  return {
    matchedBrand: result.openfda?.brand_name?.[0] || null,
    matchedGeneric: result.openfda?.generic_name?.[0] || null,
    purpose: result.purpose?.[0] || null,
    indications: result.indications_and_usage?.[0] || null,
    dosage: result.dosage_and_administration?.[0] || null,
    warnings: result.warnings?.[0] || result.warnings_and_cautions?.[0] || null,
    adverseReactions: result.adverse_reactions?.[0] || null,
    source: 'openFDA (U.S. Food & Drug Administration)',
    sourceUrl: result.set_id
      ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${result.set_id}`
      : 'https://open.fda.gov/apis/drug/label/'
  }
}

export async function fetchMedicineInfo(rawMedicineName) {
  const primary = cleanMedicineName(rawMedicineName)
  if (!primary) return null
  const candidates = [primary]
  const lower = primary.toLowerCase()
  if (INN_TO_USAN[lower]) candidates.push(INN_TO_USAN[lower])
  const firstWord = primary.split(' ')[0]
  if (firstWord && firstWord !== primary) candidates.push(firstWord)

  for (const candidate of candidates) {
    try {
      const result = await queryOpenFDA(candidate)
      if (result) return result
    } catch (err) {
      console.error('Medicine lookup failed:', err)
    }
  }
  return null
}

export async function fetchICD11Info(diagnosisName) {
  const term = (diagnosisName || '').trim()
  if (!term) return null
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const res = await fetch(`${apiUrl}/api/medical-reference/icd11?term=${encodeURIComponent(term)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success || !data.found) return null
    return {
      title: data.title,
      code: data.code,
      definition: data.definition,
      browserUrl: data.browserUrl,
      source: data.source
    }
  } catch (err) {
    console.error('ICD-11 lookup failed:', err)
    return null
  }
}

export async function fetchIndiaHealthContext() {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const res = await fetch(`${apiUrl}/api/medical-reference/india-health-context`)
    if (!res.ok) return null
    const data = await res.json()
    if (!data.success || !data.indicators?.length) return null
    return { indicators: data.indicators, source: data.source }
  } catch (err) {
    console.error('India health context lookup failed:', err)
    return null
  }
}
