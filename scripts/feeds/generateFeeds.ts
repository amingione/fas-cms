import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sanityFetch } from '../../src/lib/sanityFetch';

interface FeedProduct {
  _id: string;
  title: string;
  slug?: { current?: string };
  price?: number;
  brand?: string;
  mpn?: string;
  gtin?: string;
  seo?: { description?: string };
  description?: string;
  images?: Array<{ asset?: { url?: string } }>;
  stockStatus?: string;
}

const FEED_DIR = path.join('tmp', 'feeds');

const resolveSiteUrl = () =>
  process.env.PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || 'https://www.fasmotorsports.com';

const toAbsoluteUrl = (slug?: string) => {
  if (!slug) return '';
  const base = resolveSiteUrl().replace(/\/$/, '');
  const pathName = slug.startsWith('/') ? slug : `/shop/${slug}`;
  return `${base}${pathName}`;
};

const firstImage = (product: FeedProduct) =>
  product.images?.find((img) => img?.asset?.url)?.asset?.url || '';

const normalizeDescription = (product: FeedProduct) => {
  const text = product.seo?.description || product.description || '';
  return text.replace(/\s+/g, ' ').trim();
};

async function writeTsv(filename: string, rows: string[][]) {
  const content = rows.map((row) => row.map((cell) => cell.replace(/\t/g, ' ')).join('\t')).join('\n');
  await fs.writeFile(path.join(FEED_DIR, filename), content, 'utf8');
}

async function writeCsv(filename: string, rows: string[][]) {
  const content = rows
    .map((row) =>
      row
        .map((cell) => {
          const escaped = cell.replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(',')
    )
    .join('\n');
  await fs.writeFile(path.join(FEED_DIR, filename), content, 'utf8');
}

async function writeJson(filename: string, data: unknown) {
  await fs.writeFile(path.join(FEED_DIR, filename), JSON.stringify(data, null, 2), 'utf8');
}

export async function generateFeeds() {
  await fs.mkdir(FEED_DIR, { recursive: true });

  const { products } = await sanityFetch<{ products: FeedProduct[] }>({
    query: `{
  "products": *[_type == "product" && defined(slug.current) && !(_id in path('drafts.**')) && (status == "active" || !defined(status)) && coalesce(productType, "") != "service"]{
    _id,
    title,
    slug,
    price,
    onSale,
    salePrice,
    compareAtPrice,
    discountPercent,
    discountPercentage,
    saleStartDate,
    saleEndDate,
    saleActive,
    saleLabel,
    brand,
    mpn,
    gtin,
    stockStatus,
    seo,
    description,
    images
  }
}`
  });

  const resolvedProducts = Array.isArray(products) ? products : [];

  const googleRows: string[][] = [
    ['id', 'title', 'description', 'link', 'image_link', 'availability', 'price', 'brand', 'gtin', 'mpn']
  ];
  const amazonRows: string[][] = [
    ['sku', 'product-id-type', 'product-id', 'price', 'minimum-seller-allowed-price', 'item-condition', 'quantity', 'product-description']
  ];

  const walmartItems: Array<Record<string, unknown>> = [];

  for (const product of resolvedProducts) {
    const slug = product.slug?.current ?? '';
    const link = toAbsoluteUrl(slug);
    const image = firstImage(product);
    const description = normalizeDescription(product);
    const availability = product.stockStatus ?? 'in stock';
    const price = typeof product.price === 'number' ? `${product.price.toFixed(2)} USD` : '';

    googleRows.push([
      product._id,
      product.title,
      description,
      link,
      image,
      availability,
      price,
      product.brand ?? 'F.A.S. Motorsports',
      product.gtin ?? '',
      product.mpn ?? ''
    ]);

    amazonRows.push([
      product._id,
      product.gtin ? 'GCID' : 'SKU',
      product.gtin ?? product._id,
      price,
      price,
      'New',
      availability.toLowerCase().includes('out') ? '0' : '5',
      description
    ]);

    walmartItems.push({
      sku: product._id,
      productName: product.title,
      shortDescription: description,
      price,
      productUrl: link,
      mainImage: image,
      brand: product.brand ?? 'F.A.S. Motorsports',
      mpn: product.mpn ?? '',
      gtin: product.gtin ?? ''
    });
  }

  await Promise.all([
    writeTsv('google-shopping.tsv', googleRows),
    writeCsv('amazon-feed.csv', amazonRows),
    writeJson('walmart-feed.json', { items: walmartItems })
  ]);

  console.info(`[feeds] Generated ${resolvedProducts.length} product records for Google, Amazon, and Walmart.`);
}

async function runFromCli() {
  await generateFeeds();
}

const entrypoint = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (entrypoint === fileURLToPath(import.meta.url)) {
  runFromCli().catch((error) => {
    console.error('[generateFeeds] Unhandled error', error);
    process.exitCode = 1;
  });
}
