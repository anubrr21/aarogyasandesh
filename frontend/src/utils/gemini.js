import { GEMINI_API_KEY } from '../firebase/firebase'

const FALLBACK_MODEL = 'gemini-3.1-flash-lite'

function geminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}

async function requestGemini(model, parts) {
  const response = await fetch(geminiUrl(model), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({ contents: [{ parts }] })
  })

  if (!response.ok) {
    const errText = await response.text()
    const isOverloaded = response.status === 503 || response.status === 429
    const error = new Error(`Gemini API error ${response.status}: ${errText}`)
    error.isOverloaded = isOverloaded
    throw error
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

export async function callGemini(prompt, imageBase64 = null, mimeType = 'image/jpeg') {
  if (!GEMINI_API_KEY) {
    console.error('❌ Missing VITE_GEMINI_API_KEY in .env')
    return null
  }

  const parts = []
  if (imageBase64) {
    parts.push({ inlineData: { mimeType, data: imageBase64 } })
  }
  parts.push({ text: prompt })

  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await requestGemini('gemini-3.6-flash', parts)
    } catch (error) {
      if (error.isOverloaded && attempt < maxAttempts) {
        console.warn(`⚠️ Gemini API busy, retrying (${attempt}/${maxAttempts})...`)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        continue
      }
      console.error('❌ Gemini call failed on primary model:', error.message)
      break
    }
  }

  try {
    console.warn(`⚠️ Falling back to ${FALLBACK_MODEL}...`)
    return await requestGemini(FALLBACK_MODEL, parts)
  } catch (error) {
    console.error('❌ Gemini call failed on fallback model:', error.message)
    return null
  }
}