/**
 * Hardware Integration Composable
 * Manages Datalogic scanner and thermal printer connectivity
 */

import { ref, computed } from 'vue'
import DatalogicScanner from '../services/hardware/DatalogicScanner.js'
import ThermalPrinter from '../services/hardware/ThermalPrinter.js'

const scanner = ref(null)
const printer = ref(null)
const scannerConnected = ref(false)
const printerConnected = ref(false)
const scannerSupported = ref(false)
const printerSupported = ref(false)
const scannerError = ref('')
const printerError = ref('')
const hardwareSettings = ref({
  useScannerHID: false, // Use hardware scanner instead of camera
  usePrinter: false, // Use thermal printer
  autoScan: true, // Auto-focus scanner
  autoPrint: false // Auto-print receipts after payment
})

export function useHardware() {
  /**
   * Initialize hardware support detection
   */
  async function initializeHardware() {
    try {
      scannerSupported.value = await DatalogicScanner.isAvailable()
    } catch (error) {
      console.warn('Scanner not available:', error.message)
      scannerSupported.value = false
    }

    try {
      printerSupported.value = await ThermalPrinter.isAvailable()
    } catch (error) {
      console.warn('Printer not available:', error.message)
      printerSupported.value = false
    }

    // Load settings from localStorage
    const saved = localStorage.getItem('hardware-settings')
    if (saved) {
      try {
        Object.assign(hardwareSettings.value, JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load hardware settings:', error)
      }
    }
  }

  /**
   * Connect Datalogic scanner
   */
  async function connectScanner() {
    try {
      scannerError.value = ''

      if (scanner.value?.isConnected) {
        return { success: true, message: 'Scanner already connected' }
      }

      scanner.value = new DatalogicScanner()
      const result = await scanner.value.connect()

      scannerConnected.value = true
      hardwareSettings.value.useScannerHID = true
      saveSettings()

      return result
    } catch (error) {
      scannerError.value = error.message
      scanner.value = null
      scannerConnected.value = false
      throw error
    }
  }

  /**
   * Disconnect Datalogic scanner
   */
  async function disconnectScanner() {
    try {
      if (scanner.value) {
        await scanner.value.disconnect()
      }
      scanner.value = null
      scannerConnected.value = false
      hardwareSettings.value.useScannerHID = false
      saveSettings()
    } catch (error) {
      console.error('Error disconnecting scanner:', error)
    }
  }

  /**
   * Register scan callback
   */
  function onScan(callback) {
    if (scanner.value?.isConnected) {
      return scanner.value.onScan(callback)
    }
    return () => {}
  }

  /**
   * Connect thermal printer
   */
  async function connectPrinter() {
    try {
      printerError.value = ''

      if (printer.value?.isConnected) {
        return { success: true, message: 'Printer already connected' }
      }

      printer.value = new ThermalPrinter()
      const result = await printer.value.connect()

      printerConnected.value = true
      hardwareSettings.value.usePrinter = true
      saveSettings()

      return result
    } catch (error) {
      printerError.value = error.message
      printer.value = null
      printerConnected.value = false
      throw error
    }
  }

  /**
   * Disconnect thermal printer
   */
  async function disconnectPrinter() {
    try {
      if (printer.value) {
        await printer.value.disconnect()
      }
      printer.value = null
      printerConnected.value = false
      hardwareSettings.value.usePrinter = false
      saveSettings()
    } catch (error) {
      console.error('Error disconnecting printer:', error)
    }
  }

  /**
   * Print receipt
   */
  async function printReceipt(invoice, options) {
    if (!printer.value?.isConnected) {
      throw new Error('Printer not connected')
    }

    return await printer.value.printReceipt(invoice, options)
  }

  /**
   * Print test page
   */
  async function printTestPage() {
    if (!printer.value?.isConnected) {
      throw new Error('Printer not connected')
    }

    return await printer.value.printTestPage()
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    localStorage.setItem(
      'hardware-settings',
      JSON.stringify(hardwareSettings.value)
    )
  }

  /**
   * Update hardware settings
   */
  function updateSettings(newSettings) {
    Object.assign(hardwareSettings.value, newSettings)
    saveSettings()
  }

  return {
    // State
    scanner,
    printer,
    scannerConnected,
    printerConnected,
    scannerSupported,
    printerSupported,
    scannerError,
    printerError,
    hardwareSettings,

    // Methods
    initializeHardware,
    connectScanner,
    disconnectScanner,
    onScan,
    connectPrinter,
    disconnectPrinter,
    printReceipt,
    printTestPage,
    updateSettings
  }
}

export default useHardware
