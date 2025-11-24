// ============================================
// VENDOR QUERIES (PUBLIC)
// ============================================

// Active vendors for public directory
export const activeVendorsQuery = /* groq */ `*[_type == "vendor" && status == "active"] | order(companyName asc) {
  _id,
  vendorNumber,
  companyName,
  displayName,
  slug,
  logo,
  description,
  website,
  businessType,
  featured,
  tags,
  socialMedia,
  "productCount": count(*[_type == "product" && vendor._ref == ^._id && status == "active"])
}`;

// Featured vendors
export const featuredVendorsQuery = /* groq */ `*[_type == "vendor" && featured == true && status == "active"] | order(companyName asc) [0...6] {
  _id,
  companyName,
  displayName,
  slug,
  logo,
  description,
  website,
  businessType,
  "productCount": count(*[_type == "product" && vendor._ref == ^._id && status == "active"])
}`;

// Single vendor by slug (public)
export const vendorBySlugQuery = /* groq */ `*[_type == "vendor" && slug.current == $slug && status == "active"][0] {
  _id,
  vendorNumber,
  companyName,
  displayName,
  slug,
  logo,
  description,
  website,
  businessType,
  featured,
  tags,
  socialMedia,
  "products": *[_type == "product" && vendor._ref == ^._id && status == "active"] | order(title asc) {
    _id,
    title,
    slug,
    price,
    sku
  }
}`;
