import { ImportError } from './ImportError.js'

export const jsonImporter = {
  id: 'json',
  label: 'JSON',
  extensions: ['.json'],
  async parse(file) {
    let value
    try { value = JSON.parse(await file.text()) } catch { throw new ImportError('JSON invalide') }
    const rows = Array.isArray(value) ? value : value.data || value.rows
    if (!Array.isArray(rows) || rows.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      throw new ImportError('Le JSON doit contenir un tableau d’objets ou une propriété data/rows')
    }
    return rows
  }
}
