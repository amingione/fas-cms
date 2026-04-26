export const seoPageSlugsQuery = /* groq */ `
  *[_type == "seoPage" && !(_id in path('drafts.**')) && defined(slug.current)][]{
    "slug": slug.current,
    "updatedAt": coalesce(_updatedAt, _createdAt)
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
    "medusaCollectionHandle": coalesce(medusaCollectionHandle, vendureCollectionHandle, VendureCollectionHandle),
    "vendureCollectionHandle": coalesce(vendureCollectionHandle, VendureCollectionHandle, medusaCollectionHandle),
    featuredProductHandles
  }
`
