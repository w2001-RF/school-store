import { ImportError } from './ImportError.js'

function splitValues(valueText) {
  const values = []
  let value = ''
  let quoted = false
  for (let index = 0; index < valueText.length; index++) {
    const character = valueText[index]
    if (character === "'" && valueText[index + 1] === "'") { value += "'"; index++; continue }
    if (character === "'") { quoted = !quoted; continue }
    if (character === ',' && !quoted) { values.push(value.trim()); value = ''; continue }
    value += character
  }
  values.push(value.trim())
  return values.map(value => /^null$/i.test(value) ? '' : value.replace(/^['"]|['"]$/g, ''))
}

export const sqlImporter = {
  id: 'sql',
  label: 'Dump SQL',
  extensions: ['.sql', '.dump'],
  async parse(file) {
    const text = await file.text()
    const rows = []
    const insertPattern = /INSERT\s+INTO\s+[`"']?([\w]+)[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi
    let match
    while ((match = insertPattern.exec(text))) {
      const columns = match[2].split(',').map(column => column.replace(/[\s`"']/g, ''))
      const valuesPattern = /\(([^()]*)\)/g
      let valuesMatch
      while ((valuesMatch = valuesPattern.exec(match[3]))) {
        const values = splitValues(valuesMatch[1])
        rows.push({ __table: match[1], ...Object.fromEntries(columns.map((column, index) => [column, values[index] || ''])) })
      }
    }
    if (!rows.length) throw new ImportError('Aucune instruction INSERT exploitable dans ce dump SQL')
    return rows
  }
}
