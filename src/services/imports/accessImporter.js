import { ImportError } from './ImportError.js'

export const accessImporter = {
  id: 'access',
  label: 'Access',
  extensions: ['.mdb', '.accdb'],
  async parse() {
    throw new ImportError('Les fichiers .mdb/.accdb binaires ne sont pas lisibles directement dans le navigateur. Exportez Access en CSV, Excel ou SQL, puis importez ce fichier.')
  }
}
