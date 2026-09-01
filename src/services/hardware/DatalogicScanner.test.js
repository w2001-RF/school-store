import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { DatalogicScanner } from './DatalogicScanner.js'

function makeFakeDevice({ opened = false } = {}) {
  const listeners = {}
  return {
    opened,
    productName: 'Datalogic QuickScan',
    open: vi.fn(async function () { this.opened = true }),
    close: vi.fn(async function () { this.opened = false }),
    addEventListener: vi.fn((event, handler) => {
      listeners[event] = handler
    }),
    _emit(event, payload) {
      listeners[event]?.(payload)
    }
  }
}

function makeInputReportEvent(bytes) {
  const buffer = new Uint8Array(bytes)
  return {
    data: {
      byteLength: buffer.length,
      getUint8: (i) => buffer[i]
    }
  }
}

describe('DatalogicScanner.isAvailable', () => {
  afterEach(() => {
    delete global.navigator.hid
  })

  it('returns true when WebHID API is present', async () => {
    global.navigator.hid = { requestDevice: vi.fn() }
    await expect(DatalogicScanner.isAvailable()).resolves.toBe(true)
  })

  it('returns false when WebHID API is missing', async () => {
    delete global.navigator.hid
    await expect(DatalogicScanner.isAvailable()).resolves.toBe(false)
  })
})

describe('DatalogicScanner connect/disconnect', () => {
  let scanner

  beforeEach(() => {
    scanner = new DatalogicScanner()
  })

  afterEach(() => {
    delete global.navigator.hid
    vi.useRealTimers()
  })

  it('throws when WebHID API is not available', async () => {
    delete global.navigator.hid
    await expect(scanner.connect()).rejects.toThrow('WebHID API not available')
  })

  it('throws when no device is selected', async () => {
    global.navigator.hid = { requestDevice: vi.fn().mockResolvedValue([]) }
    await expect(scanner.connect()).rejects.toThrow('No barcode scanner selected')
  })

  it('connects successfully, opens device and starts listening', async () => {
    const device = makeFakeDevice()
    global.navigator.hid = { requestDevice: vi.fn().mockResolvedValue([device]) }

    const result = await scanner.connect()

    expect(device.open).toHaveBeenCalled()
    expect(scanner.isConnected).toBe(true)
    expect(scanner.isListening).toBe(true)
    expect(device.addEventListener).toHaveBeenCalledWith('inputreport', expect.any(Function))
    expect(result).toEqual({ success: true, device: 'Datalogic QuickScan' })
  })

  it('does not reopen an already opened device', async () => {
    const device = makeFakeDevice({ opened: true })
    global.navigator.hid = { requestDevice: vi.fn().mockResolvedValue([device]) }

    await scanner.connect()

    expect(device.open).not.toHaveBeenCalled()
  })

  it('wraps connection errors with a descriptive message', async () => {
    global.navigator.hid = {
      requestDevice: vi.fn().mockRejectedValue(new Error('permission denied'))
    }

    await expect(scanner.connect()).rejects.toThrow('Failed to connect scanner: permission denied')
    expect(scanner.isConnected).toBe(false)
  })

  it('disconnects and closes the device', async () => {
    const device = makeFakeDevice()
    global.navigator.hid = { requestDevice: vi.fn().mockResolvedValue([device]) }
    await scanner.connect()

    await scanner.disconnect()

    expect(device.close).toHaveBeenCalled()
    expect(scanner.isConnected).toBe(false)
    expect(scanner.isListening).toBe(false)
    expect(scanner.device).toBeNull()
    expect(scanner.scanCallbacks).toEqual([])
  })
})

describe('DatalogicScanner scan code mapping and buffering', () => {
  let scanner

  beforeEach(() => {
    vi.useFakeTimers()
    scanner = new DatalogicScanner()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps HID keyboard codes to characters', () => {
    expect(scanner.mapScanCode(0x04)).toBe('a')
    expect(scanner.mapScanCode(0x1e)).toBe('1')
    expect(scanner.mapScanCode(0x28)).toBe('\n')
    expect(scanner.mapScanCode(0x2c)).toBe(' ')
    expect(scanner.mapScanCode(0xff)).toBe('')
  })

  it('builds a barcode from an input report and submits on Enter', () => {
    const onScan = vi.fn()
    scanner.onScan(onScan)

    // "abc" then Enter (0x28)
    scanner.handleInputReport(makeInputReportEvent([0x04, 0x05, 0x06, 0x28]))

    expect(onScan).toHaveBeenCalledWith('abc')
    expect(scanner.buffer).toBe('')
  })

  it('skips null bytes and modifier keys', () => {
    const onScan = vi.fn()
    scanner.onScan(onScan)

    scanner.handleInputReport(makeInputReportEvent([0x00, 0x01, 0x04, 0x05, 0x28]))

    expect(onScan).toHaveBeenCalledWith('ab')
  })

  it('auto-submits buffered input after the timeout window', () => {
    const onScan = vi.fn()
    scanner.onScan(onScan)

    scanner.handleInputReport(makeInputReportEvent([0x1e, 0x1f, 0x20])) // "123"
    expect(onScan).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(onScan).toHaveBeenCalledWith('123')
  })

  it('allows unsubscribing a scan callback', () => {
    const onScan = vi.fn()
    const unsubscribe = scanner.onScan(onScan)

    unsubscribe()
    scanner.handleInputReport(makeInputReportEvent([0x04, 0x28]))

    expect(onScan).not.toHaveBeenCalled()
  })

  it('does not emit for an empty buffer', () => {
    const onScan = vi.fn()
    scanner.onScan(onScan)

    scanner.submitScan()

    expect(onScan).not.toHaveBeenCalled()
  })

  it('continues notifying other callbacks if one throws', () => {
    const failing = vi.fn(() => { throw new Error('boom') })
    const ok = vi.fn()
    scanner.onScan(failing)
    scanner.onScan(ok)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    scanner.handleInputReport(makeInputReportEvent([0x04, 0x28]))

    expect(failing).toHaveBeenCalled()
    expect(ok).toHaveBeenCalledWith('a')
    spy.mockRestore()
  })
})

describe('DatalogicScanner keyboard emulation fallback', () => {
  it('captures alphanumeric keys and submits on Enter', () => {
    const scanner = new DatalogicScanner()
    const onScan = vi.fn()
    scanner.onScan(onScan)

    const target = document.createElement('div')
    const dispose = scanner.setupKeyboardEmulation(target)

    target.dispatchEvent(new KeyboardEvent('keydown', { key: '1', bubbles: true }))
    target.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))

    expect(onScan).toHaveBeenCalledWith('12')

    dispose()
  })

  it('ignores keydown events originating from input/textarea elements', () => {
    const scanner = new DatalogicScanner()
    const onScan = vi.fn()
    scanner.onScan(onScan)

    const wrapper = document.createElement('div')
    const input = document.createElement('input')
    wrapper.appendChild(input)
    document.body.appendChild(wrapper)

    const dispose = scanner.setupKeyboardEmulation(wrapper)

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }))

    expect(scanner.buffer).toBe('')

    dispose()
    document.body.removeChild(wrapper)
  })
})
