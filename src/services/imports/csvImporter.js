import { ImportError } from './ImportError.js'

function parseCsv(text) {
  const rows = []
  let row = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index++) {
    const character = text[index]
    const next = text[index + 1]
    if (character === '"' && quoted && next === '"') { value += '"'; index++; continue }
    if (character === '"') { quoted = !quoted; continue }
    if (character === ',' && !quoted) { row.push(value.trim()); value = ''; continue }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index++
      row.push(value.trim()); value = ''
      if (row.some(cell => cell)) rows.push(row)
      row = []
      continue
    }
    value += character
  }
  if (quoted) throw new ImportError('CSV invalide : guillemet non fermé')
  row.push(value.trim())
  if (row.some(cell => cell)) rows.push(row)
  return rows
}

export const csvImporter = {
  id: 'csv',
  label: 'CSV',
  extensions: ['.csv'],
  async parse(file) {
    if (file.size > 10 * 1024 * 1024) throw new ImportError('Fichier trop volumineux. La taille maximale est de 10 Mo.')
    const rows = parseCsv(await file.text())
    if (!rows.length) return []
    const headers = rows.shift().map(header => header.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
    return rows.map(row => Object.fromEntries(headers.map((header, index) => [header, row[index] || ''])))
  }
}
