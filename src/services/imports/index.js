import { csvImporter } from './csvImporter.js'
import { jsonImporter } from './jsonImporter.js'
import { xlsxImporter } from './xlsxImporter.js'
import { sqlImporter } from './sqlImporter.js'
import { accessImporter } from './accessImporter.js'
import { ImportError } from './ImportError.js'

export const importers = [csvImporter, jsonImporter, xlsxImporter, sqlImporter, accessImporter]

export function getImporter(file) {
  const extension = `.${file.name.split('.').pop().toLowerCase()}`
  const importer = importers.find(candidate => candidate.extensions.includes(extension))
  if (!importer) throw new ImportError(`Format non supporté : ${extension}`)
  return importer
}

export async function parseImportFile(file, fieldMap = {}) {
  const importer = getImporter(file)
  const sourceRows = await importer.parse(file)
  const rows = sourceRows.map(source => Object.fromEntries(
    Object.entries(fieldMap).map(([target, aliases]) => {
      const names = Array.isArray(aliases) ? aliases : [aliases]
      const key = names.find(name => Object.prototype.hasOwnProperty.call(source, name))
      return [target, key ? source[key] : '']
    })
  ))
  return { importer: importer.id, rows }
}
