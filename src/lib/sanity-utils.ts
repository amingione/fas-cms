import { createClient } from '@sanity/client';

const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
const apiVersion = '2023-01-01';
const token = import.meta.env.SANITY_API_TOKEN;

if (!projectId || !dataset) {
  throw new Error(
    'Missing PUBLIC_SANITY_PROJECT_ID or PUBLIC_SANITY_DATASET in environment variables.'
  );
}

export const sanity = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token
});

// Define basic product type
export interface Product {
  _id: string;
  title: string;
  slug: { current: string };
  price: number;
  description?: string;
  images: {
    asset: {
      _id: string;
      url: string;
    };
  }[];
  categories: {
    _id: string;
    title: string;
    slug: { current: string };
  }[];
}

// Fetch all products (optionally filtered by category slug)
export async function fetchProductsFromSanity({
  categorySlug,
  tuneSlug,
  vehicleSlug,
  minHp
}: {
  categorySlug?: string;
  tuneSlug?: string;
  vehicleSlug?: string;
  minHp?: number;
}): Promise<Product[]> {
  try {
    const filters = [
      categorySlug
        ? `references(*[_type == "category" && slug.current == "${categorySlug}"][0]._id)`
        : '',
      tuneSlug ? `tune->slug.current == "${tuneSlug}"` : '',
      vehicleSlug ? `"${vehicleSlug}" in compatibleVehicles[]->slug.current` : '',
      typeof minHp === 'number' ? `averageHorsepower >= ${minHp}` : ''
    ]
      .filter(Boolean)
      .join(' && ');

    const query = `*[_type == "product"${filters ? ` && ${filters}` : ''}]{
      _id,
      title,
      slug,
      price,
      averageHorsepower,
      images[]{
        asset->{
          _id,
          url
        }
      },
      tune->{
        title,
        slug
      },
      compatibleVehicles[]->{
        make,
        model,
        slug
      },
      categories[]->{
        _id,
        title,
        slug
      }
    }`;

    return await sanity.fetch(query);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    return [];
  }
}

// Fetch product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const query = `*[_type == "product" && slug.current == $slug][0]{
      _id,
      title,
      slug,
      price,
      description,
      images[]{
        asset->{
          _id,
          url
        }
      },
      categories[]->{
        _id,
        title,
        slug
      }
    }`;
    return await sanity.fetch(query, { slug });
  } catch (err) {
    console.error(`Failed to fetch product with slug "${slug}":`, err);
    return null;
  }
}

// Fetch similar products based on categories
export async function getSimilarProducts(
  categories: { slug: { current: string } }[],
  currentSlug: string
): Promise<Product[]> {
  try {
    const categorySlugs = categories.map((category) => category.slug.current);

    const query = `*[_type == "product" && slug.current != $currentSlug && count(categories[slug.current in $categorySlugs]) > 0][0...3]{
      _id,
      title,
      slug,
      price,
      images[]{
        asset->{
          _id,
          url
        }
      }
    }`;

    return await sanity.fetch(query, { currentSlug, categorySlugs });
  } catch (err) {
    console.error('Failed to fetch similar products:', err);
    return [];
  }
}
