import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const scannerInstance = {
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  onScan: vi.fn()
}

const printerInstance = {
  isConnected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  printReceipt: vi.fn(),
  printTestPage: vi.fn()
}

vi.mock('../services/hardware/DatalogicScanner.js', () => {
  const DatalogicScanner = vi.fn(function () { return scannerInstance })
  DatalogicScanner.isAvailable = vi.fn().mockResolvedValue(true)
  return { default: DatalogicScanner }
})

vi.mock('../services/hardware/ThermalPrinter.js', () => {
  const ThermalPrinter = vi.fn(function () { return printerInstance })
  ThermalPrinter.isAvailable = vi.fn().mockResolvedValue(true)
  return { default: ThermalPrinter }
})

async function freshHardware() {
  vi.resetModules()
  const mod = await import('./useHardware.js')
  return mod.useHardware()
}

describe('useHardware', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    scannerInstance.isConnected = false
    printerInstance.isConnected = false
    scannerInstance.connect.mockResolvedValue({ success: true, device: 'Scanner' })
    printerInstance.connect.mockResolvedValue({ success: true, device: 'Printer' })
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('detects scanner and printer support on initialize', async () => {
    const hardware = await freshHardware()

    await hardware.initializeHardware()

    expect(hardware.scannerSupported.value).toBe(true)
    expect(hardware.printerSupported.value).toBe(true)
  })

  it('loads persisted settings from localStorage on initialize', async () => {
    localStorage.setItem('hardware-settings', JSON.stringify({ autoPrint: true }))
    const hardware = await freshHardware()

    await hardware.initializeHardware()

    expect(hardware.hardwareSettings.value.autoPrint).toBe(true)
  })

  it('connects the scanner and persists the setting', async () => {
    const hardware = await freshHardware()

    const result = await hardware.connectScanner()

    expect(result).toEqual({ success: true, device: 'Scanner' })
    expect(hardware.scannerConnected.value).toBe(true)
    expect(hardware.hardwareSettings.value.useScannerHID).toBe(true)
    expect(JSON.parse(localStorage.getItem('hardware-settings')).useScannerHID).toBe(true)
  })

  it('surfaces scanner connection errors', async () => {
    scannerInstance.connect.mockRejectedValue(new Error('denied'))
    const hardware = await freshHardware()

    await expect(hardware.connectScanner()).rejects.toThrow('denied')
    expect(hardware.scannerConnected.value).toBe(false)
    expect(hardware.scannerError.value).toBe('denied')
  })

  it('disconnects the scanner and resets settings', async () => {
    const hardware = await freshHardware()
    await hardware.connectScanner()
    scannerInstance.isConnected = true

    await hardware.disconnectScanner()

    expect(scannerInstance.disconnect).toHaveBeenCalled()
    expect(hardware.scannerConnected.value).toBe(false)
    expect(hardware.hardwareSettings.value.useScannerHID).toBe(false)
  })

  it('registers a scan callback only when the scanner is connected', async () => {
    const hardware = await freshHardware()
    const callback = vi.fn()

    // Not connected yet
    const unsubscribe = hardware.onScan(callback)
    expect(scannerInstance.onScan).not.toHaveBeenCalled()
    expect(typeof unsubscribe).toBe('function')

    await hardware.connectScanner()
    scannerInstance.isConnected = true
    hardware.onScan(callback)

    expect(scannerInstance.onScan).toHaveBeenCalledWith(callback)
  })

  it('connects the printer and persists the setting', async () => {
    const hardware = await freshHardware()

    const result = await hardware.connectPrinter()

    expect(result).toEqual({ success: true, device: 'Printer' })
    expect(hardware.printerConnected.value).toBe(true)
    expect(hardware.hardwareSettings.value.usePrinter).toBe(true)
  })

  it('surfaces printer connection errors', async () => {
    printerInstance.connect.mockRejectedValue(new Error('no usb'))
    const hardware = await freshHardware()

    await expect(hardware.connectPrinter()).rejects.toThrow('no usb')
    expect(hardware.printerConnected.value).toBe(false)
    expect(hardware.printerError.value).toBe('no usb')
  })

  it('disconnects the printer and resets settings', async () => {
    const hardware = await freshHardware()
    await hardware.connectPrinter()
    printerInstance.isConnected = true

    await hardware.disconnectPrinter()

    expect(printerInstance.disconnect).toHaveBeenCalled()
    expect(hardware.printerConnected.value).toBe(false)
    expect(hardware.hardwareSettings.value.usePrinter).toBe(false)
  })

  it('throws when printing a receipt without a connected printer', async () => {
    const hardware = await freshHardware()

    await expect(hardware.printReceipt({})).rejects.toThrow('Printer not connected')
  })

  it('delegates printReceipt to the printer instance when connected', async () => {
    const hardware = await freshHardware()
    await hardware.connectPrinter()
    printerInstance.isConnected = true
    printerInstance.printReceipt.mockResolvedValue({ success: true })

    const invoice = { invoice_number: 'INV-1' }
    const result = await hardware.printReceipt(invoice, { paperWidth: 58 })

    expect(printerInstance.printReceipt).toHaveBeenCalledWith(invoice, { paperWidth: 58 })
    expect(result).toEqual({ success: true })
  })

  it('throws when printing a test page without a connected printer', async () => {
    const hardware = await freshHardware()

    await expect(hardware.printTestPage()).rejects.toThrow('Printer not connected')
  })

  it('updates and persists hardware settings', async () => {
    const hardware = await freshHardware()

    hardware.updateSettings({ autoPrint: true, autoScan: false })

    expect(hardware.hardwareSettings.value.autoPrint).toBe(true)
    expect(hardware.hardwareSettings.value.autoScan).toBe(false)
    expect(JSON.parse(localStorage.getItem('hardware-settings')).autoPrint).toBe(true)
  })
})
