import { fetchFilteredProducts, getProductCount } from '@/lib/sanity-utils.ts';

const ON_SALE_FILTER_SLUGS = ['on-sale', 'sale', 'sale-items', 'sale-item'];

const slugify = (value?: string | null) => {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const normalizeSort = (
  value?: string | null
): 'featured' | 'newest' | 'name' | 'price-asc' | 'price-desc' => {
  const sort = (value || '').toLowerCase();
  switch (sort) {
    case 'price':
    case 'price-low':
    case 'price-asc':
      return 'price-asc';
    case 'price-high':
    case 'price-desc':
      return 'price-desc';
    case 'newest':
      return 'newest';
    case 'name':
      return 'name';
    case 'featured':
    default:
      return 'featured';
  }
};

const parseNumber = (value: string | null): number | null => {
  if (!value) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export async function GET({ url }: { url: URL }) {
  const params = url.searchParams;

  const categorySlug =
    slugify(params.get('category') || params.get('categorySlug')) || undefined;

  const rawFilterValues = [
    ...params.getAll('filter'),
    ...(params.get('filters')?.split(',') || [])
  ];
  const filterSlugs = Array.from(new Set(rawFilterValues.map(slugify).filter(Boolean)));

  const vehicleValues = [
    params.get('vehicle'),
    params.get('vehicleSlug'),
    ...(params.get('vehicles')?.split(',') || [])
  ];
  const vehicleSlugs = Array.from(new Set(vehicleValues.map(slugify).filter(Boolean)));

  const minPrice = parseNumber(params.get('minPrice') ?? params.get('priceMin'));
  const maxPrice = parseNumber(params.get('maxPrice') ?? params.get('priceMax'));

  const searchTerm = (params.get('search') || params.get('q') || '').trim() || undefined;

  const sortBy = normalizeSort(params.get('sort'));

  let page = parseNumber(params.get('page')) || 1;
  let pageSize = parseNumber(params.get('pageSize')) || parseNumber(params.get('limit')) || 12;

  const start = parseNumber(params.get('start'));
  const end = parseNumber(params.get('end'));
  if (start !== null && end !== null && end > start) {
    pageSize = end - start;
    page = Math.floor(start / Math.max(1, pageSize)) + 1;
  }

  page = Math.max(1, page);
  pageSize = Math.max(1, pageSize);

  const saleOnly = filterSlugs.some((slug) => ON_SALE_FILTER_SLUGS.includes(slug));
  const filterSlugsForQuery = filterSlugs.filter((slug) => !ON_SALE_FILTER_SLUGS.includes(slug));

  const filters = {
    categorySlug,
    filterSlugs: filterSlugsForQuery.length ? filterSlugsForQuery : undefined,
    vehicleSlugs: vehicleSlugs.length ? vehicleSlugs : undefined,
    minPrice: minPrice ?? undefined,
    maxPrice: maxPrice ?? undefined,
    searchTerm,
    sortBy,
    page,
    pageSize,
    saleOnly
  };

  const [products, total] = await Promise.all([
    fetchFilteredProducts(filters),
    getProductCount(filters)
  ]);

  const totalItems = total || products.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return new Response(
    JSON.stringify({
      products,
      pagination: {
        page,
        pageSize,
        total: totalItems,
        totalPages
      },
      total: totalItems,
      totalCount: totalItems
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
