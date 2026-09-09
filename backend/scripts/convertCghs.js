import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the Excel file
const excelPath = path.join(__dirname, '../Cghs_Rate_List1500.00.xlsx')
const workbook = XLSX.readFile(excelPath)
const sheet = workbook.Sheets['Sheet1']

// Convert to JSON
const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 })

// Find the header row
let headerRow = -1
let dataStartRow = -1

for (let i = 0; i < rawData.length; i++) {
  const row = rawData[i]
  if (row && row.length > 0) {
    if (row[1] === 'Procedure Name' && row[6] === 'Cghs Code No.') {
      headerRow = i
      dataStartRow = i + 1
      break
    }
    if (row[0] && row[0].toString().includes('Procedure Name')) {
      headerRow = i
      dataStartRow = i + 1
      break
    }
  }
}

if (headerRow === -1) {
  console.error('Could not find header row in Excel file')
  process.exit(1)
}

// Extract data
const cghsData = []
const seenItems = new Set()

for (let i = dataStartRow; i < rawData.length; i++) {
  const row = rawData[i]
  if (!row || row.length < 7) continue
  
  const name = row[1] ? row[1].toString().trim() : ''
  const rate = parseFloat(row[7]) || 0
  const code = row[6] ? row[6].toString().trim() : ''
  const category = row[2] ? row[2].toString().trim() : ''
  const tier = row[3] ? row[3].toString().trim() : 'TIER I'
  const facility = row[4] ? row[4].toString().trim() : 'NABH'
  
  if (name && rate > 0) {
    const key = `${name}|${rate}`
    if (!seenItems.has(key)) {
      seenItems.add(key)
      
      // Create searchable name
      let searchName = name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      cghsData.push({
        id: code || `CGHS-${String(cghsData.length + 1).padStart(5, '0')}`,
        name: name,
        searchName: searchName,
        rate: rate,
        tier: tier,
        category: category || 'General',
        facility: facility
      })
    }
  }
}

// Ensure we have all items
console.log(`Successfully parsed ${cghsData.length} CGHS items`)

// Save to frontend data folder
const frontendDataPath = path.join(__dirname, '../../frontend/src/data/cghs_rates.json')
fs.writeFileSync(frontendDataPath, JSON.stringify(cghsData, null, 2))

console.log(`✅ CGHS data saved to: ${frontendDataPath}`)
console.log(`📊 Total items: ${cghsData.length}`)