export const seoPageSlugsQuery = /* groq */ `
  *[_type == "seoPage" && defined(slug.current)][]{
    "slug": slug.current
  }
`

export const seoPageBySlugQuery = /* groq */ `
  *[_type == "seoPage" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    seoTitle,
    seoDescription,
    intro,
    sections[]{
      heading,
      body
    },
    ctaHeading,
    ctaText,
    ctaButtonLabel,
    ctaButtonHref,
    medusaCollectionHandle,
    featuredProductHandles
  }
`
