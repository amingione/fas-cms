export function normalizeBaseUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl
  try {
    const url = new URL(baseUrl)
    return url.origin
  } catch {
    return baseUrl.replace(/\/+$/, '')
  }
}

export function resolveSanityFunctionsBaseUrl(): string {
  const rawUrlCandidates = [
    import.meta.env.SANITY_FUNCTIONS_BASE_URL,
    import.meta.env.PUBLIC_SANITY_FUNCTIONS_BASE_URL,
    process.env.SANITY_FUNCTIONS_BASE_URL,
    process.env.PUBLIC_SANITY_FUNCTIONS_BASE_URL,
  ].filter(Boolean) as string[]

  for (const rawUrl of rawUrlCandidates) {
    const normalized = normalizeBaseUrl(rawUrl)
    if (normalized && normalized.startsWith('http')) {
      return normalized
    }
  }

  throw new Error('Missing or invalid SANITY_FUNCTIONS_BASE_URL')
}
