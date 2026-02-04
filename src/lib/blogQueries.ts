export const publishedPostsQuery = /* groq */ `
*[_type == "post" && status == "published" && publishedAt <= now()] | order(publishedAt desc) {
  _id,
  _createdAt,
  _updatedAt,
  title,
  slug,
  excerpt,
  featuredImage,
  publishedAt,
  readTime,
  featured,
  "author": author->{ _id, name, email, "avatar": coalesce(photo.asset->url, avatar.asset->url, image.asset->url) },
  "categories": categories[]->{ _id, title, slug, color },
  tags
}
`;

export const postBySlugQuery = /* groq */ `
*[_type == "post" && slug.current == $slug][0] {
  _id,
  _createdAt,
  _updatedAt,
  title,
  slug,
  excerpt,
  featuredImage,
  content,
  publishedAt,
  readTime,
  status,
  "author": author->{ _id, name, email, "avatar": coalesce(photo.asset->url, avatar.asset->url, image.asset->url) },
  "categories": categories[]->{ _id, title, slug, color },
  tags,
  seo,
  "relatedProducts": relatedProducts[]->{ _id, title, slug },
  "relatedPosts": *[
    _type == "post" &&
    slug.current != $slug &&
    count(categories[@._ref in ^.categories[]._ref]) > 0 &&
    status == "published"
  ] | order(publishedAt desc) [0...3] {
    _id,
    title,
    slug,
    excerpt,
    featuredImage,
    publishedAt
  }
}
`;

export const featuredPostsQuery = /* groq */ `
*[_type == "post" && featured == true && status == "published" && publishedAt <= now()] | order(publishedAt desc) [0...3] {
  _id,
  title,
  slug,
  excerpt,
  featuredImage,
  publishedAt,
  "author": author->{ name, "avatar": coalesce(photo.asset->url, avatar.asset->url, image.asset->url) },
  "categories": categories[]->{ title, color }
}
`;

export const blogCategoriesQuery = /* groq */ `
*[_type == "blogCategory"] | order(title asc) {
  _id,
  title,
  slug,
  description,
  color,
  "postCount": count(*[_type == "post" && references(^._id) && status == "published"])
}
`;
