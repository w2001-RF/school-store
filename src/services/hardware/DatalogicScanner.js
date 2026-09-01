/**
 * Datalogic Scanner Service
 * Supports Datalogic barcode scanners (USB/Serial HID devices)
 * Scanners typically emulate keyboard input and can be triggered via Web API
 */

export class DatalogicScanner {
  constructor() {
    this.isConnected = false
    this.isListening = false
    this.scanCallbacks = []
    this.buffer = ''
    this.timeout = null
    this.device = null
  }

  /**
   * Check if Datalogic scanner is available via WebHID API
   */
  static async isAvailable() {
    return !!(navigator.hid && typeof navigator.hid.requestDevice === 'function')
  }

  /**
   * Request access to Datalogic scanner device
   * Typical Datalogic VID: 0x05F9
   */
  async connect() {
    try {
      if (!navigator.hid) {
        throw new Error('WebHID API not available. Use Chrome/Edge on desktop.')
      }

      // Request device - user must select it manually
      const devices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 0x05f9 }, // Datalogic
          { vendorId: 0x0c2e }, // Honeywell
          { vendorId: 0x1816 }, // Common barcode scanner VID
          { vendorId: 0x0b1d }  // Motorola/Zebra
        ]
      })

      if (devices.length === 0) {
        throw new Error('No barcode scanner selected')
      }

      this.device = devices[0]

      if (!this.device.opened) {
        await this.device.open()
      }

      this.isConnected = true
      this.startListening()

      return {
        success: true,
        device: this.device.productName || 'Barcode Scanner'
      }
    } catch (error) {
      this.isConnected = false
      throw new Error(`Failed to connect scanner: ${error.message}`)
    }
  }

  /**
   * Start listening for scanner input
   */
  startListening() {
    if (this.isListening || !this.device) return

    this.isListening = true
    this.device.addEventListener('inputreport', (event) => {
      this.handleInputReport(event)
    })
  }

  /**
   * Handle HID input report (barcode scan)
   */
  handleInputReport(event) {
    const { data, reportId } = event

    // Process keyboard scan codes (typical barcode scanner output)
    for (let i = 0; i < data.byteLength; i++) {
      const byte = data.getUint8(i)

      // Skip modifier keys and null bytes
      if (byte === 0 || byte < 0x04) continue

      // Map HID keyboard codes to characters
      const char = this.mapScanCode(byte)
      if (char) {
        if (char === '\n' || char === '\r') {
          this.submitScan()
        } else {
          this.buffer += char
        }
      }
    }

    // Auto-submit after timeout if no new input
    this.resetTimeout()
  }

  /**
   * Map HID scan codes to characters
   * Datalogic scanners typically send standard HID keyboard codes
   */
  mapScanCode(code) {
    // HID keyboard codes (based on USB HID Usage Tables)
    const keymap = {
      0x04: 'a', 0x05: 'b', 0x06: 'c', 0x07: 'd', 0x08: 'e', 0x09: 'f',
      0x0a: 'g', 0x0b: 'h', 0x0c: 'i', 0x0d: 'j', 0x0e: 'k', 0x0f: 'l',
      0x10: 'm', 0x11: 'n', 0x12: 'o', 0x13: 'p', 0x14: 'q', 0x15: 'r',
      0x16: 's', 0x17: 't', 0x18: 'u', 0x19: 'v', 0x1a: 'w', 0x1b: 'x',
      0x1c: 'y', 0x1d: 'z',
      0x1e: '1', 0x1f: '2', 0x20: '3', 0x21: '4', 0x22: '5',
      0x23: '6', 0x24: '7', 0x25: '8', 0x26: '9', 0x27: '0',
      0x28: '\n', // Enter
      0x2c: ' ', // Space
      0x2d: '-', 0x2e: '=', 0x2f: '[', 0x30: ']',
      0x31: '\\', 0x33: ';', 0x34: "'", 0x35: '`',
      0x36: ',', 0x37: '.', 0x38: '/'
    }

    return keymap[code] || ''
  }

  /**
   * Reset timeout for auto-submit
   */
  resetTimeout() {
    if (this.timeout) clearTimeout(this.timeout)

    this.timeout = setTimeout(() => {
      if (this.buffer.trim()) {
        this.submitScan()
      }
    }, 100) // 100ms buffer window
  }

  /**
   * Submit scanned barcode to callbacks
   */
  submitScan() {
    if (this.buffer.trim()) {
      const barcode = this.buffer.trim()
      this.buffer = ''

      this.scanCallbacks.forEach(callback => {
        try {
          callback(barcode)
        } catch (error) {
          console.error('Scan callback error:', error)
        }
      })
    }

    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }
  }

  /**
   * Register callback for scan events
   */
  onScan(callback) {
    if (typeof callback === 'function') {
      this.scanCallbacks.push(callback)
    }

    return () => {
      this.scanCallbacks = this.scanCallbacks.filter(cb => cb !== callback)
    }
  }

  /**
   * Disconnect scanner
   */
  async disconnect() {
    if (this.timeout) clearTimeout(this.timeout)

    this.isListening = false

    if (this.device?.opened) {
      try {
        await this.device.close()
      } catch (error) {
        console.error('Error closing device:', error)
      }
    }

    this.device = null
    this.isConnected = false
    this.scanCallbacks = []
    this.buffer = ''
  }

  /**
   * Alternative: Keyboard emulation fallback (non-WebHID)
   * Datalogic scanners can be configured to send keyboard events
   * This method sets up keyboard listener for emulated input
   */
  setupKeyboardEmulation(element = null) {
    const target = element || document

    const handler = (event) => {
      // Ignore if user is typing in an input/textarea
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA'
      ) {
        return
      }

      // Only capture alphanumeric and symbols (not arrow keys, etc.)
      if (event.key.length === 1) {
        this.buffer += event.key
      }

      // Enter key or scanner terminator
      if (event.key === 'Enter' || event.code === 'Enter') {
        event.preventDefault()
        this.submitScan()
      }

      this.resetTimeout()
    }

    target.addEventListener('keydown', handler)

    return () => {
      target.removeEventListener('keydown', handler)
    }
  }
}

export default DatalogicScanner
