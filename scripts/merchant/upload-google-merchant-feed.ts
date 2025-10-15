import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import SFTPClient from 'ssh2-sftp-client';
import { toPlainText } from '@portabletext/toolkit';
import { getSanityClient } from '../../netlify/functions/_sanity';

type MerchantRow = {
  id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  price: string;
  brand: string;
  condition: 'new' | 'used' | 'refurbished';
  quantity?: string;
  shipping?: string;
  shipping_label?: string;
  shipping_weight?: string;
  ads_redirect?: string;
  gtin?: string;
  mpn?: string;
  google_product_category?: string;
};

const sanity = getSanityClient({ useCdn: false });

const DEFAULT_BASE_URL =
  process.env.GMC_FEED_BASE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.SITE_URL ||
  'https://www.fasmotorsports.com';

const DEFAULT_CURRENCY = process.env.GMC_FEED_CURRENCY || 'USD';
const REMOTE_FILENAME = process.env.GMC_SFTP_FEED_FILENAME || 'fas-products-feed.txt';
const LOCAL_FEED_PATH =
  process.env.GMC_FEED_LOCAL_PATH || path.join(process.cwd(), 'tmp', REMOTE_FILENAME);
const DEFAULT_QUANTITY = Number(process.env.GMC_FEED_DEFAULT_QUANTITY ?? '0');
const RAW_SHIPPING_PRICE = process.env.GMC_FEED_SHIPPING_PRICE;
const SHIPPING_PRICE =
  RAW_SHIPPING_PRICE !== undefined && RAW_SHIPPING_PRICE !== ''
    ? Number(RAW_SHIPPING_PRICE)
    : undefined;
const DEFAULT_WEIGHT_LB = Number(process.env.GMC_FEED_DEFAULT_WEIGHT_LB ?? '1');

const REQUIRED_COLUMNS: (keyof MerchantRow)[] = [
  'id',
  'title',
  'description',
  'link',
  'image_link',
  'availability',
  'price',
  'brand',
  'condition'
];

function sanitizeText(value: unknown): string {
  if (!value) return '';
  const raw = String(value);
  // Drop HTML tags and collapse whitespace
  return raw
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\t+/g, ' ')
    .trim();
}

function extractPlainText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return sanitizeText(value);
  if (Array.isArray(value)) {
    try {
      return sanitizeText(toPlainText(value as any));
    } catch (err) {
      console.warn('Failed to extract plain text from array value:', err);
    }
  }
  if (typeof value === 'object') {
    try {
      return sanitizeText(toPlainText(value as any));
    } catch (err) {
      console.warn('Failed to extract plain text from object value:', err);
    }
  }
  return sanitizeText(value);
}

function ensureUrl(slug: string | null | undefined, base: string): string {
  const trimmedSlug = (slug || '').replace(/^\/+/, '');
  const href = trimmedSlug ? `/shop/${trimmedSlug}` : '/';
  return new URL(href, base.endsWith('/') ? base : `${base}/`).toString();
}

function computeAvailability(manualCount: unknown): MerchantRow['availability'] {
  if (typeof manualCount === 'number') {
    if (manualCount > 0) return 'in stock';
    if (manualCount === 0) return 'out of stock';
  }
  return 'in stock';
}

function computeQuantity(manualCount: unknown): number {
  if (typeof manualCount === 'number' && manualCount >= 0) {
    return Math.floor(manualCount);
  }
  return DEFAULT_QUANTITY;
}

function computeWeight(weight: unknown): number {
  const num = typeof weight === 'number' ? weight : Number(weight);
  if (Number.isFinite(num) && num > 0) return num;
  return DEFAULT_WEIGHT_LB > 0 ? DEFAULT_WEIGHT_LB : 1;
}

function formatPrice(price: unknown, currency: string): string {
  const num = typeof price === 'number' ? price : Number(price);
  const safe = Number.isFinite(num) ? num : 0;
  return `${safe.toFixed(2)} ${currency}`;
}

async function fetchProducts() {
const query = `*[_type=="product" && defined(slug.current) && !(_id in path("drafts.**")) && coalesce(draft,false) == false]{
  _id,
  "id": coalesce(sku, _id),
  title,
  shortDescription,
  description,
  price,
  brand,
  "slug": slug.current,
  manualInventoryCount,
  gtin,
  mpn,
  "google_product_category": googleProductCategory,
  "image": coalesce(images[0].asset->url, image.asset->url, socialImage.asset->url),
  "filterSlugs": filters[]->slug.current,
  shippingClass,
  shippingWeight
}`;

  return sanity.fetch<any[]>(query);
}

function buildRows(products: any[], baseUrl: string, currency: string): MerchantRow[] {
  return (products || [])
    .map((product) => {
      const id = sanitizeText(product?.id || product?._id);
      const title = sanitizeText(product?.title);
      const description = extractPlainText(product?.shortDescription || product?.description);
      const image = sanitizeText(product?.image);
      const slug = sanitizeText(product?.slug);
      const brand = sanitizeText(product?.brand) || 'F.A.S. Motorsports';

      if (!id || !title || !slug || !description || !image) {
        return null;
      }

      const filterSlugs: string[] = Array.isArray(product?.filterSlugs)
        ? product.filterSlugs
            .map((slug: unknown) => (typeof slug === 'string' ? slug.toLowerCase() : ''))
            .filter(Boolean)
        : [];
      const shippingClassRaw = sanitizeText(product?.shippingClass).toLowerCase();
      const normalizedClass = shippingClassRaw.replace(/[\s_-]+/g, '');
      const isInstallOnly =
        normalizedClass === 'installonly' ||
        filterSlugs.includes('install-only') ||
        filterSlugs.includes('install_only');
      const isPerformanceParts =
        normalizedClass === 'performanceparts' ||
        filterSlugs.includes('performance-parts') ||
        filterSlugs.includes('performance_parts');
      const allowsShipping = !isInstallOnly && (isPerformanceParts || normalizedClass.length === 0);

      const productLink = ensureUrl(slug, baseUrl);
      const quickUrlBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const quickCheckoutUrl = slug
        ? new URL(`/checkout/quick/${slug}`, quickUrlBase).toString()
        : productLink;

      const row: MerchantRow = {
        id,
        title,
        description,
        link: productLink,
        image_link: image,
        availability: computeAvailability(product?.manualInventoryCount),
        price: formatPrice(product?.price, currency),
        brand,
        condition: 'new',
        quantity: String(computeQuantity(product?.manualInventoryCount)),
        shipping_label: isInstallOnly ? 'install_only' : 'performance_parts',
        shipping_weight: `${computeWeight(product?.shippingWeight).toFixed(2)} lb`
      };

      if (quickCheckoutUrl) {
        row.ads_redirect = quickCheckoutUrl;
      }

      if (!isInstallOnly && allowsShipping && typeof SHIPPING_PRICE === 'number' && Number.isFinite(SHIPPING_PRICE)) {
        const shippingPrice = SHIPPING_PRICE;
        row.shipping = `US:::${shippingPrice.toFixed(2)} ${currency}`;
      }

      if (product?.gtin) row.gtin = sanitizeText(product.gtin);
      if (product?.mpn) row.mpn = sanitizeText(product.mpn);
      if (product?.google_product_category) {
        row.google_product_category = sanitizeText(product.google_product_category);
      }

      return row;
    })
    .filter(Boolean) as MerchantRow[];
}

function toTsv(rows: MerchantRow[]): string {
  const optionalColumns = new Set<string>();
  for (const row of rows) {
    Object.keys(row)
      .filter((key) => !REQUIRED_COLUMNS.includes(key as keyof MerchantRow))
      .forEach((key) => optionalColumns.add(key));
  }
  const header = [...REQUIRED_COLUMNS, ...Array.from(optionalColumns)];
  const lines = rows.map((row) =>
    header
      .map((column) => {
        const value = (row as Record<string, string | undefined>)[column] ?? '';
        return sanitizeText(value);
      })
      .join('\t')
  );
  return [header.join('\t'), ...lines].join('\n');
}

async function writeLocalFile(content: string) {
  await fs.mkdir(path.dirname(LOCAL_FEED_PATH), { recursive: true });
  await fs.writeFile(LOCAL_FEED_PATH, content, 'utf8');
  console.log(`Feed saved locally to ${LOCAL_FEED_PATH}`);
}

async function uploadViaSftp(content: string) {
  const host = process.env.GMC_SFTP_HOST;
  const username = process.env.GMC_SFTP_USERNAME;
  const password = process.env.GMC_SFTP_PASSWORD;
  const port = Number(process.env.GMC_SFTP_PORT || '22');

  if (!host || !username || !password) {
    console.warn('SFTP credentials missing; skipped upload. Set GMC_SFTP_HOST, GMC_SFTP_USERNAME, and GMC_SFTP_PASSWORD.');
    return;
  }

  const sftp = new SFTPClient();
  try {
    console.log(`Connecting to ${host}:${port} as ${username}...`);
    await sftp.connect({ host, port, username, password });
    await sftp.put(Buffer.from(content, 'utf8'), REMOTE_FILENAME);
    console.log(`Uploaded feed to ${host}/${REMOTE_FILENAME}`);
  } finally {
    await sftp.end().catch(() => undefined);
  }
}

async function main() {
  const products = await fetchProducts();
  if (!products || products.length === 0) {
    console.warn('No products returned from Sanity; nothing to upload.');
    return;
  }

  const rows = buildRows(products, DEFAULT_BASE_URL, DEFAULT_CURRENCY);
  if (!rows.length) {
    console.warn('All products were filtered out (missing SKU/title/slug).');
    return;
  }

  const tsv = toTsv(rows);
  await writeLocalFile(tsv);
  await uploadViaSftp(tsv);
  console.log(`Feed generated with ${rows.length} products.`);
}

main().catch((err) => {
  console.error('Failed to generate/upload Google Merchant feed:', err);
  process.exitCode = 1;
});
