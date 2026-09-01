import { describe, expect, it } from 'vitest'
import { computePaymentSummary } from './invoices.js'

describe('computePaymentSummary', () => {
  it('allows partial payment for a normal client', () => {
    const summary = computePaymentSummary({ totalAmount: 100, paidAmount: 70 })

    expect(summary.totalAmount).toBe(100)
    expect(summary.paidAmount).toBe(70)
    expect(summary.remaining).toBe(30)
    expect(summary.changeDue).toBe(0)
    expect(summary.status).toBe('pending')
  })

  it('allows overpayment and returns change', () => {
    const summary = computePaymentSummary({ totalAmount: 100, paidAmount: 135 })

    expect(summary.status).toBe('paid')
    expect(summary.remaining).toBe(0)
    expect(summary.changeDue).toBe(35)
  })

  it('requires full payment for passager clients', () => {
    const summary = computePaymentSummary({ totalAmount: 100, paidAmount: 80, isPassager: true })

    expect(summary.valid).toBe(false)
    expect(summary.error).toBe('Le paiement complet est requis pour un client passager.')
  })
})
