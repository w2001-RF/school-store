import { describe, expect, it } from 'vitest'
import { isLowStock } from './products.js'


describe('isLowStock', () => {
  it('uses the app threshold when no product override exists', () => {
    expect(isLowStock({ stock: 9 })).toBe(true)
    expect(isLowStock({ stock: 10 })).toBe(false)
  })

  it('uses the product-specific threshold when provided', () => {
    expect(isLowStock({ stock: 4, low_stock_threshold: 5 })).toBe(true)
    expect(isLowStock({ stock: 5, low_stock_threshold: 5 })).toBe(false)
  })

  it('treats missing stock as zero', () => {
    expect(isLowStock({})).toBe(true)
  })
})
