import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { ThermalPrinter } from './ThermalPrinter.js'

function makeFakeUsbDevice({ vendorId = 0x04b8 } = {}) {
  const endpoint = { direction: 'out', endpointNumber: 1 }
  return {
    vendorId,
    productName: 'TM-T88',
    open: vi.fn(async function () { this.opened = true }),
    close: vi.fn(async function () { this.opened = false }),
    transferOut: vi.fn().mockResolvedValue({ status: 'ok' }),
    configuration: {
      interfaces: [
        { alternates: [{ endpoints: [endpoint] }] }
      ]
    }
  }
}

describe('ThermalPrinter.isAvailable', () => {
  afterEach(() => {
    delete global.navigator.usb
  })

  it('returns true when WebUSB API is present', async () => {
    global.navigator.usb = { requestDevice: vi.fn() }
    await expect(ThermalPrinter.isAvailable()).resolves.toBe(true)
  })

  it('returns false when WebUSB API is missing', async () => {
    delete global.navigator.usb
    await expect(ThermalPrinter.isAvailable()).resolves.toBe(false)
  })
})

describe('ThermalPrinter.listPrinters / isPrinterDevice', () => {
  afterEach(() => {
    delete global.navigator.usb
  })

  it('returns an empty list when WebUSB is unavailable', async () => {
    delete global.navigator.usb
    await expect(ThermalPrinter.listPrinters()).resolves.toEqual([])
  })

  it('filters connected devices to known printer vendors', async () => {
    const printer = makeFakeUsbDevice({ vendorId: 0x04b8 })
    const other = makeFakeUsbDevice({ vendorId: 0xdead })
    global.navigator.usb = { getDevices: vi.fn().mockResolvedValue([printer, other]) }

    const result = await ThermalPrinter.listPrinters()

    expect(result).toEqual([printer])
  })

  it('recognizes known printer vendor ids', () => {
    expect(ThermalPrinter.isPrinterDevice({ vendorId: 0x0519 })).toBe(true)
    expect(ThermalPrinter.isPrinterDevice({ vendorId: 0x1234 })).toBe(false)
  })
})

describe('ThermalPrinter connect/send/disconnect', () => {
  let printer

  beforeEach(() => {
    printer = new ThermalPrinter()
  })

  afterEach(() => {
    delete global.navigator.usb
  })

  it('throws when WebUSB API is not available', async () => {
    delete global.navigator.usb
    await expect(printer.connect()).rejects.toThrow('WebUSB API not available')
  })

  it('throws when no device is selected', async () => {
    global.navigator.usb = { requestDevice: vi.fn().mockResolvedValue(null) }
    await expect(printer.connect()).rejects.toThrow('No printer selected')
  })

  it('connects, opens device and detects the output endpoint', async () => {
    const device = makeFakeUsbDevice()
    global.navigator.usb = { requestDevice: vi.fn().mockResolvedValue(device) }

    const result = await printer.connect()

    expect(device.open).toHaveBeenCalled()
    expect(printer.isConnected).toBe(true)
    expect(printer.out).toBe(1)
    expect(result).toEqual({ success: true, device: 'TM-T88' })
  })

  it('throws a descriptive error when no output endpoint is found', async () => {
    const device = makeFakeUsbDevice()
    device.configuration.interfaces[0].alternates[0].endpoints = []
    global.navigator.usb = { requestDevice: vi.fn().mockResolvedValue(device) }

    await expect(printer.connect()).rejects.toThrow('Printer output endpoint not found')
    expect(printer.isConnected).toBe(false)
  })

  it('wraps connection errors with a descriptive message', async () => {
    global.navigator.usb = { requestDevice: vi.fn().mockRejectedValue(new Error('no access')) }

    await expect(printer.connect()).rejects.toThrow('Failed to connect printer: no access')
  })

  it('rejects send() when not connected', async () => {
    await expect(printer.send('hello')).rejects.toThrow('Printer not connected')
  })

  it('sends string payloads as encoded bytes via transferOut', async () => {
    const device = makeFakeUsbDevice()
    global.navigator.usb = { requestDevice: vi.fn().mockResolvedValue(device) }
    await printer.connect()

    await printer.send('hello')

    const [endpoint, payload] = device.transferOut.mock.calls[0]
    expect(endpoint).toBe(1)
    expect(ArrayBuffer.isView(payload)).toBe(true)
    expect(new TextDecoder().decode(payload)).toBe('hello')
  })

  it('disconnects and closes the device', async () => {
    const device = makeFakeUsbDevice()
    global.navigator.usb = { requestDevice: vi.fn().mockResolvedValue(device) }
    await printer.connect()
    device.opened = true

    await printer.disconnect()

    expect(device.close).toHaveBeenCalled()
    expect(printer.isConnected).toBe(false)
    expect(printer.device).toBeNull()
    expect(printer.out).toBeNull()
  })
})

describe('ThermalPrinter formatting helpers', () => {
  const printer = new ThermalPrinter()

  it('centers text within the given width', () => {
    const centered = printer.center('hi', 10)
    expect(centered).toBe('    hi')
  })

  it('right-aligns text within the given width', () => {
    const aligned = printer.right('hi', 10)
    expect(aligned).toBe('        hi')
  })

  it('formats currency values in EUR', () => {
    const formatted = printer.formatMoney(12.5)
    expect(formatted).toContain('12,50')
  })
})

describe('ThermalPrinter.printReceipt / printTestPage', () => {
  let printer
  let device

  beforeEach(async () => {
    printer = new ThermalPrinter()
    device = makeFakeUsbDevice()
    global.navigator.usb = { requestDevice: vi.fn().mockResolvedValue(device) }
    await printer.connect()
  })

  afterEach(() => {
    delete global.navigator.usb
  })

  it('builds and sends a formatted receipt including items and totals', async () => {
    const invoice = {
      invoice_number: 'INV-001',
      created_at: '2026-01-01T10:00:00Z',
      customer_name: 'John Doe',
      agent_name: 'Agent A',
      subtotal: 100,
      discount_percent: 10,
      discount_amount: 10,
      total_amount: 90,
      paid_amount: 50,
      items: [
        { product_name: 'Notebook', quantity: 2, total: 20 }
      ]
    }

    const result = await printer.printReceipt(invoice)

    expect(result.success).toBe(true)
    expect(result.receipt).toContain('INV-001')
    expect(result.receipt).toContain('John Doe')
    expect(result.receipt).toContain('Notebook')
    expect(device.transferOut).toHaveBeenCalledTimes(2) // receipt text + cut command
  })

  it('sends a test page followed by a cut command', async () => {
    const result = await printer.printTestPage()

    expect(result).toEqual({ success: true })
    expect(device.transferOut).toHaveBeenCalledTimes(2)
  })
})
