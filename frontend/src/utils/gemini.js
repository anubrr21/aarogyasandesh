import { GEMINI_API_KEY } from '../firebase/firebase'

export async function callGemini(prompt, imageBase64 = null, mimeType = 'image/jpeg') {
  if (!GEMINI_API_KEY) {
    console.error('❌ Missing VITE_GEMINI_API_KEY in .env')
    return null
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'

  const parts = []
  if (imageBase64) {
    parts.push({ inlineData: { mimeType, data: imageBase64 } })
  }
  parts.push({ text: prompt })

  const maxAttempts = 3
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
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
        if (isOverloaded && attempt < maxAttempts) {
          console.warn(`⚠️ Gemini API busy (${response.status}), retrying (${attempt}/${maxAttempts})...`)
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
          continue
        }
        console.error(`❌ Gemini API error ${response.status}:`, errText)
        return null
      }

      const data = await response.json()
      return data.candidates[0].content.parts[0].text
    } catch (error) {
      if (attempt < maxAttempts) {
        console.warn(`⚠️ Gemini call failed, retrying (${attempt}/${maxAttempts})...`, error.message)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
        continue
      }
      console.error('❌ Gemini call failed:', error)
      return null
    }
  }
  return null
}