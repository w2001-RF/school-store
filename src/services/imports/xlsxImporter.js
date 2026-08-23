import * as XLSX from 'xlsx'
import { ImportError } from './ImportError.js'

export const xlsxImporter = {
  id: 'xlsx',
  label: 'Excel',
  extensions: ['.xlsx', '.xls'],
  async parse(file) {
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      return XLSX.utils.sheet_to_json(sheet, { defval: '' })
    } catch { throw new ImportError('Fichier Excel invalide ou vide') }
  }
}
