export const formatOrderNumber = (value?: string | null): string | null => {
  if (!value) return null

  const trimmed = value.toString().trim().toUpperCase()
  if (!trimmed) return null
  if (/^FAS-\d{6}$/.test(trimmed)) return trimmed

  const digits = trimmed.replace(/\D/g, '')
  if (digits.length >= 6) return `FAS-${digits.slice(-6)}`

  return trimmed
}
