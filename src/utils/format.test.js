import { describe, expect, it } from 'vitest'
import { remainingAmount } from './format.js'

describe('remainingAmount', () => {
  it('uses the persisted remaining amount when available', () => {
    expect(remainingAmount({ total_amount: 100, paid_amount: 30, remaining_amount: 55 })).toBe(55)
  })

  it('calculates the balance when remaining_amount is absent', () => {
    expect(remainingAmount({ total_amount: 100, paid_amount: 30 })).toBe(70)
  })

  it('never returns a negative balance', () => {
    expect(remainingAmount({ total_amount: 100, paid_amount: 120 })).toBe(0)
  })

  it('returns zero for a missing invoice', () => {
    expect(remainingAmount(null)).toBe(0)
  })
})
