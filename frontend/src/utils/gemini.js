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
      console.error(`❌ Gemini API error ${response.status}:`, errText)
      return null
    }

    const data = await response.json()
    return data.candidates[0].content.parts[0].text
  } catch (error) {
    console.error('❌ Gemini call failed:', error)
    return null
  }
}