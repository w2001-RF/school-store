import { afterEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './useToast.js'

describe('useToast', () => {
  afterEach(() => {
    vi.useRealTimers()
    const { toasts, remove } = useToast()
    for (const toast of [...toasts]) remove(toast.id)
  })

  it('adds a typed toast and removes it after the duration', () => {
    vi.useFakeTimers()
    const { toasts, success } = useToast()

    success('Saved', 1000)

    expect(toasts).toHaveLength(1)
    expect(toasts[0]).toMatchObject({ message: 'Saved', type: 'success' })

    vi.advanceTimersByTime(1000)
    expect(toasts).toHaveLength(0)
  })

  it('shares toast state across composable consumers', () => {
    const first = useToast()
    const second = useToast()

    first.info('Shared')

    expect(second.toasts).toHaveLength(1)
    expect(second.toasts[0].message).toBe('Shared')
  })
})
