import express from 'express'
import admin from '../config/firebase-admin.js'
import { VertexAI } from '@google-cloud/vertexai'

const router = express.Router()

const vertexAI = new VertexAI({
  project: process.env.FIREBASE_PROJECT_ID,
  location: 'us-central1'
})

const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp'
})

router.post('/ocr', async (req, res) => {
  try {
    const { image, patientId } = req.body

    if (!image) {
      return res.status(400).json({ error: 'Image data required' })
    }

    const imagePart = {
      inlineData: {
        data: image,
        mimeType: 'image/jpeg'
      }
    }

    const prompt = `Extract every billable line item from this hospital bill image.
Return ONLY valid JSON, no markdown, no explanation, in this exact format:
[{"name": "item name as written", "amount": numeric_value_only}]
If a line has no clear amount, skip it. If the image is unreadable, return [].

Important: 
- Extract the item name exactly as written
- Extract the charged amount in Indian Rupees
- Skip any items that don't have a clear amount
- Only include items with clear numerical amounts`

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }, imagePart] }]
    })

    const response = result.response
    let text = response.candidates[0].content.parts[0].text
    text = text.replace(/```json|```/g, '').trim()

    let items = []
    try {
      items = JSON.parse(text)
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      return res.status(200).json({ items: [] })
    }

    if (!Array.isArray(items)) {
      return res.status(200).json({ items: [] })
    }

    const filteredItems = items.filter(item => 
      item.name && 
      item.name.trim() && 
      typeof item.amount === 'number' && 
      item.amount > 0
    )

    if (patientId) {
      const docRef = admin.firestore().collection('patients').doc(patientId)
      await docRef.update({
        lastAnomalyCheck: new Date().toISOString(),
        anomalyHistory: admin.firestore.FieldValue.arrayUnion({
          timestamp: new Date().toISOString(),
          items: filteredItems,
          source: 'ocr'
        })
      })
    }

    res.json({ items: filteredItems })
  } catch (error) {
    console.error('OCR Error:', error)
    res.status(500).json({ error: 'Failed to process image' })
  }
})

export default router