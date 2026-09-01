/**
 * Thermal Printer Service
 * Supports thermal receipt printers via WebUSB API
 * Common thermal printer VIDs: Epson (0x04b8), Star Micronics (0x0519), Zebra (0x0b1d)
 */

export class ThermalPrinter {
  constructor() {
    this.isConnected = false
    this.device = null
    this.out = null
    this.encoding = 'utf-8'
  }

  /**
   * Check if WebUSB API is available
   */
  static async isAvailable() {
    return !!(navigator.usb && typeof navigator.usb.requestDevice === 'function')
  }

  /**
   * List available printers
   */
  static async listPrinters() {
    try {
      if (!navigator.usb) return []
      const devices = await navigator.usb.getDevices()
      return devices.filter(d => this.isPrinterDevice(d))
    } catch {
      return []
    }
  }

  /**
   * Check if device is likely a printer
   */
  static isPrinterDevice(device) {
    const printerVendors = {
      0x04b8: 'Epson',
      0x0519: 'Star Micronics',
      0x0b1d: 'Zebra',
      0x1816: 'Generic POS',
      0x0ed1: 'Intermark Electronics'
    }
    return !!printerVendors[device.vendorId]
  }

  /**
   * Connect to thermal printer
   */
  async connect() {
    try {
      if (!navigator.usb) {
        throw new Error('WebUSB API not available. Use Chrome/Edge on desktop.')
      }

      const devices = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x0b1d }, // Zebra
          { vendorId: 0x1816 }, // Generic
          { vendorId: 0x0ed1 }  // Intermark
        ]
      })

      if (!devices) {
        throw new Error('No printer selected')
      }

      this.device = devices
      await this.device.open()

      // Auto-detect endpoint
      if (!this.out) {
        const interface0 = this.device.configuration.interfaces[0]
        const endpoint = interface0.alternates[0].endpoints.find(e => e.direction === 'out')

        if (!endpoint) {
          throw new Error('Printer output endpoint not found')
        }

        this.out = endpoint.endpointNumber
      }

      this.isConnected = true

      return {
        success: true,
        device: this.device.productName || 'Thermal Printer'
      }
    } catch (error) {
      this.isConnected = false
      throw new Error(`Failed to connect printer: ${error.message}`)
    }
  }

  /**
   * Send command to printer
   */
  async send(data) {
    if (!this.isConnected || !this.device) {
      throw new Error('Printer not connected')
    }

    try {
      const payload = typeof data === 'string' ? new TextEncoder().encode(data) : data

      await this.device.transferOut(this.out, payload)
      return { success: true }
    } catch (error) {
      throw new Error(`Printer send failed: ${error.message}`)
    }
  }

  /**
   * Print receipt from invoice data
   */
  async printReceipt(invoice, options = {}) {
    const {
      paperWidth = 80, // mm
      companyName = 'School Store',
      showLogo = true
    } = options

    const lines = []

    // Header
    if (showLogo) {
      lines.push(this.center('🏪 ' + companyName, paperWidth))
      lines.push(this.center('─'.repeat(Math.floor(paperWidth / 2)), paperWidth))
    }

    lines.push('')
    lines.push(`Facture: ${invoice.invoice_number}`)
    lines.push(`Date: ${new Date(invoice.created_at).toLocaleString()}`)
    lines.push('')

    // Client info
    if (invoice.customer_name) {
      lines.push(`Client: ${invoice.customer_name}`)
    }
    if (invoice.agent_name) {
      lines.push(`Caisse: ${invoice.agent_name}`)
    }

    lines.push('─'.repeat(Math.floor(paperWidth * 0.9)))
    lines.push('')

    // Items
    lines.push('Produit'.padEnd(30) + 'Qt.'.padEnd(8) + 'Total'.padEnd(15))
    lines.push('─'.repeat(Math.floor(paperWidth * 0.9)))

    if (invoice.items && Array.isArray(invoice.items)) {
      invoice.items.forEach(item => {
        const name = (item.product_name || '').substring(0, 30).padEnd(30)
        const qty = String(item.quantity).padEnd(8)
        const total = this.formatMoney(item.total || 0).padEnd(15)
        lines.push(name + qty + total)
      })
    }

    lines.push('')
    lines.push('─'.repeat(Math.floor(paperWidth * 0.9)))

    // Summary
    lines.push(this.right(`Sous-total: ${this.formatMoney(invoice.subtotal || 0)}`, paperWidth))

    if (invoice.discount_percent || invoice.discount_amount) {
      const discountLabel = invoice.discount_percent
        ? `Remise (${invoice.discount_percent}%): `
        : 'Remise: '
      const discountValue = this.formatMoney(invoice.discount_amount || 0)
      lines.push(this.right(discountLabel + discountValue, paperWidth))
    }

    lines.push(this.right(`TOTAL: ${this.formatMoney(invoice.total_amount || 0)}`, paperWidth))
    lines.push('')

    // Payment info
    if (invoice.paid_amount) {
      lines.push(this.right(`Payé: ${this.formatMoney(invoice.paid_amount)}`, paperWidth))

      const remaining = (invoice.total_amount || 0) - (invoice.paid_amount || 0)
      if (remaining > 0.01) {
        lines.push(this.right(`Reste: ${this.formatMoney(remaining)}`, paperWidth))
      }
    }

    lines.push('')
    lines.push(this.center('Merci de votre visite !', paperWidth))
    lines.push(this.center('─'.repeat(Math.floor(paperWidth / 2)), paperWidth))
    lines.push('')
    lines.push('')

    // Send to printer
    const receipt = lines.join('\n')
    await this.send(receipt)

    // Print and cut
    await this.send(new Uint8Array([0x1d, 0x56, 0x41, 0x03])) // ESC/POS cut command

    return { success: true, receipt }
  }

  /**
   * Format money value
   */
  formatMoney(value) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value)
  }

  /**
   * Center text
   */
  center(text, width) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2))
    return ' '.repeat(padding) + text
  }

  /**
   * Right-align text
   */
  right(text, width) {
    const padding = Math.max(0, width - text.length)
    return ' '.repeat(padding) + text
  }

  /**
   * Print test page
   */
  async printTestPage() {
    const testContent = [
      this.center('TEST RECEIPT', 80),
      this.center('─'.repeat(40), 80),
      '',
      'Time: ' + new Date().toLocaleString(),
      'Status: Connected ✓',
      '',
      this.center('Printer is ready', 80),
      this.center('─'.repeat(40), 80),
      '',
      ''
    ].join('\n')

    await this.send(testContent)
    await this.send(new Uint8Array([0x1d, 0x56, 0x41, 0x03])) // Cut

    return { success: true }
  }

  /**
   * Disconnect printer
   */
  async disconnect() {
    if (this.device?.opened) {
      try {
        await this.device.close()
      } catch (error) {
        console.error('Error closing printer:', error)
      }
    }

    this.device = null
    this.isConnected = false
    this.out = null
  }
}

export default ThermalPrinter
