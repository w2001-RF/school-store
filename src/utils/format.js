export function formatMoney(amount, currency = 'MAD') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(amount || 0)
}
export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}
export function remainingAmount(invoice) {
  if (!invoice) return 0
  return Number(invoice.remaining_amount ?? Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)))
}
