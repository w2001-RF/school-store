export class ImportError extends Error {
  constructor(message, details = []) {
    super(message)
    this.name = 'ImportError'
    this.details = details
  }
}
