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

// Define basic product type (you can extend this as needed)
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

// Fetch all products
export async function fetchProductsFromSanity(currentCategory?: string): Promise<Product[]> {
  try {
    console.log('[Sanity Fetch] Category filter:', currentCategory);

    const categoryFilter = currentCategory
      ? `&& count(categories[slug.current == "${currentCategory}"]) > 0`
      : '';

    const query = `*[_type == "product" ${categoryFilter}]{
      _id,
      title,
      slug,
      price,
      images[]{
        asset->{
          _id,
          url
        }
      },
      averageHorsepower,
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
