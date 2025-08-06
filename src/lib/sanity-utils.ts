// src/lib/sanity-utils.ts
import { createClient } from '@sanity/client';

// Initialize Sanity client
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

// Define interfaces
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
  tune?: {
    title: string;
    slug: { current: string };
  };
  compatibleVehicles?: {
    make: string;
    model: string;
    slug: { current: string };
  }[];
  averageHorsepower?: number;
}

export interface Category {
  _id: string;
  title: string;
  slug: { current: string };
}

export interface Tune {
  _id: string;
  title: string;
  slug: { current: string };
}

export interface Vehicle {
  _id: string;
  title: string;
  slug: { current: string };
}

type QueryParams = Record<string, string | number | boolean>;

// Fetch all products
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
    const conditions: string[] = [];
    const params: QueryParams = {};

    if (categorySlug) {
      conditions.push(`references(*[_type == "category" && slug.current == $categorySlug]._id)`);
      params.categorySlug = categorySlug;
    }
    if (tuneSlug) {
      conditions.push(`tune->slug.current == $tuneSlug`);
      params.tuneSlug = tuneSlug;
    }
    if (vehicleSlug) {
      conditions.push(`$vehicleSlug in compatibleVehicles[]->slug.current`);
      params.vehicleSlug = vehicleSlug;
    }
    if (typeof minHp === 'number' && !isNaN(minHp)) {
      conditions.push(`averageHorsepower >= $minHp`);
      params.minHp = minHp;
    }

    const query = `*[_type == "product"${conditions.length ? ` && ${conditions.join(' && ')}` : ''}]{
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

    return await sanity.fetch<Product[]>(query, params);
  } catch (err) {
    console.error('Failed to fetch products:', err);
    return [];
  }
}

// Fetch all categories
export async function fetchCategories(): Promise<Category[]> {
  try {
    const query = `*[_type == "category" && defined(slug.current)] {
      _id,
      title,
      slug
    }`;
    return await sanity.fetch<Category[]>(query, {});
  } catch (err) {
    console.error('Failed to fetch categories:', err);
    return [];
  }
}

// Fetch all tunes
export async function fetchTunes(): Promise<Tune[]> {
  try {
    const query = `*[_type == "tune" && defined(slug.current)] {
      _id,
      title,
      slug
    }`;
    return await sanity.fetch<Tune[]>(query, {});
  } catch (err) {
    console.error('Failed to fetch tunes:', err);
    return [];
  }
}

// Fetch all vehicles
export async function fetchVehicles(): Promise<Vehicle[]> {
  try {
    const query = `*[_type == "vehicleModel" && defined(slug.current)] {
      _id,
      title,
      slug
    }`;
    return await sanity.fetch<Vehicle[]>(query, {});
  } catch (err) {
    console.error('Failed to fetch vehicles:', err);
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
    return await sanity.fetch<Product | null>(query, { slug });
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
    if (!categories || categories.length === 0) return [];
    const categorySlugs = categories.map((category) => category.slug.current);

    const query = `*[_type == "product" && slug.current != $currentSlug && count(categories[slug.current in $categorySlugs]) > 0][0...4]{
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
    return await sanity.fetch<Product[]>(query, { currentSlug, categorySlugs });
  } catch (err) {
    console.error('Failed to fetch similar products:', err);
    return [];
  }
}
