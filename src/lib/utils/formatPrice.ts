export function formatPrice(amountInCents: number | null, currencyCode = 'USD') {
  if (amountInCents == null) return 'Call for pricing'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amountInCents / 100)
}
