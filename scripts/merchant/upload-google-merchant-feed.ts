import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import SFTPClient from 'ssh2-sftp-client';
import { google, content_v2_1 } from 'googleapis';
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

type ServiceAccountKey = {
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

const sanity = getSanityClient({ useCdn: false });

const DEFAULT_BASE_URL =
  process.env.GMC_FEED_BASE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.SITE_URL ||
  'https://www.fasmotorsports.com';

const DEFAULT_CURRENCY = process.env.GMC_FEED_CURRENCY || 'USD';
const DEFAULT_LANGUAGE = process.env.GMC_FEED_LANGUAGE || 'en';
const TARGET_COUNTRY = process.env.GMC_FEED_TARGET_COUNTRY || 'US';
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
const CONTENT_API_SCOPE = 'https://www.googleapis.com/auth/content';
const parsedBatchSize = Number(process.env.GMC_CONTENT_API_BATCH_SIZE ?? '250');
const CONTENT_API_BATCH_SIZE = Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? Math.floor(parsedBatchSize) : 250;
const DEFAULT_GOOGLE_PRODUCT_CATEGORY =
  process.env.GMC_FEED_DEFAULT_GOOGLE_CATEGORY ||
  'Vehicles & Parts > Vehicle Parts & Accessories > Performance Parts';

function parseBooleanEnv(value: string | undefined, defaultValue = false): boolean {
  if (typeof value !== 'string') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

const ENABLE_ADS_REDIRECT = parseBooleanEnv(process.env.GMC_FEED_ENABLE_ADS_REDIRECT, false);

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

function parsePriceString(input: string | undefined, fallbackCurrency: string): content_v2_1.Schema$Price | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s+([A-Za-z]{3})$/);
  if (match) {
    return {
      value: match[1],
      currency: match[2].toUpperCase()
    };
  }
  const numeric = trimmed.replace(/[^0-9.\-]/g, '');
  if (!numeric) return null;
  return {
    value: numeric,
    currency: fallbackCurrency
  };
}

function parseShippingWeight(input: string | undefined): content_v2_1.Schema$ProductShippingWeight | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)$/);
  if (!match) return undefined;
  const unit = match[2].toLowerCase();
  const allowedUnits = new Set(['g', 'kg', 'oz', 'lb']);
  if (!allowedUnits.has(unit)) return undefined;
  const numericValue = Number(match[1]);
  if (!Number.isFinite(numericValue)) return undefined;
  return {
    value: numericValue,
    unit
  };
}

function parseQuantity(input: string | undefined): string | undefined {
  if (input === undefined) return undefined;
  const num = Number(input);
  if (!Number.isFinite(num) || num < 0) return undefined;
  return String(Math.floor(num));
}

function parseShippingAttribute(input: string | undefined, fallbackCurrency: string): content_v2_1.Schema$ProductShipping[] {
  if (!input) return [];
  const trimmed = input.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(':::');
  if (parts.length < 3) return [];
  const [countryRaw, serviceRaw = '', priceRaw = ''] = parts;
  const price = parsePriceString(priceRaw, fallbackCurrency);
  if (!price) return [];
  const country = countryRaw ? countryRaw.toUpperCase() : undefined;
  const service = serviceRaw?.trim() || undefined;
  return [
    {
      country,
      service,
      price
    }
  ];
}

function parseServiceAccountJson(raw: string | undefined): ServiceAccountKey | null {
  if (!raw) return null;
  let text = raw.trim();
  if (!text) return null;
  if (!text.startsWith('{')) {
    try {
      text = Buffer.from(text, 'base64').toString('utf8');
    } catch (err) {
      console.warn('Failed to decode base64 service account key from GMC_SERVICE_ACCOUNT_KEY:', err);
      return null;
    }
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.warn('Failed to parse service account JSON from GMC_SERVICE_ACCOUNT_KEY:', err);
    return null;
  }
}

async function loadServiceAccountKey(): Promise<ServiceAccountKey | null> {
  const envKey = parseServiceAccountJson(process.env.GMC_SERVICE_ACCOUNT_KEY);
  if (envKey?.client_email && envKey?.private_key) return envKey;

  const base64Key = parseServiceAccountJson(process.env.GMC_SERVICE_ACCOUNT_KEY_BASE64);
  if (base64Key?.client_email && base64Key?.private_key) return base64Key;

  const keyPath = process.env.GMC_SERVICE_ACCOUNT_KEY_FILE;
  if (keyPath) {
    try {
      const fileContents = await fs.readFile(keyPath, 'utf8');
      const parsed = parseServiceAccountJson(fileContents);
      if (parsed?.client_email && parsed?.private_key) return parsed;
      console.warn(`Service account key file at ${keyPath} is missing client_email or private_key.`);
    } catch (err) {
      console.error(`Unable to read service account key file at ${keyPath}:`, err);
    }
  }

  return null;
}

function buildContentApiProduct(row: MerchantRow): content_v2_1.Schema$Product {
  const currency = DEFAULT_CURRENCY;
  const price = parsePriceString(row.price, currency);
  const shipping = parseShippingAttribute(row.shipping, price?.currency ?? currency);
  const shippingWeight = parseShippingWeight(row.shipping_weight);
  const quantity = parseQuantity(row.quantity);

  const product: content_v2_1.Schema$Product = {
    offerId: row.id,
    channel: 'online',
    contentLanguage: DEFAULT_LANGUAGE,
    targetCountry: TARGET_COUNTRY,
    title: row.title,
    description: row.description,
    link: row.link,
    imageLink: row.image_link,
    availability: row.availability,
    condition: row.condition,
    brand: row.brand
  };

  if (price) product.price = price;
  if (row.ads_redirect) product.adsRedirect = row.ads_redirect;
  if (row.google_product_category) product.googleProductCategory = row.google_product_category;
  if (row.gtin) product.gtin = row.gtin;
  if (row.mpn) product.mpn = row.mpn;
  if (row.shipping_label) product.shippingLabel = row.shipping_label;
  if (shippingWeight) product.shippingWeight = shippingWeight;
  if (shipping.length) product.shipping = shipping;
  if (quantity) product.sellOnGoogleQuantity = quantity;
  if (!row.gtin && !row.mpn) product.identifierExists = false;

  return product;
}

function chunkArray<T>(input: T[], size: number): T[][] {
  const chunkSize = size > 0 ? size : input.length || 1;
  const chunks: T[][] = [];
  for (let index = 0; index < input.length; index += chunkSize) {
    chunks.push(input.slice(index, index + chunkSize));
  }
  return chunks;
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

function appendServiceMessaging(
  text: string,
  message: string
): string {
  const normalized = text.toLowerCase();
  if (!normalized.includes('vehicle not included') && !normalized.includes('vehicle is not included')) {
    return `${text} ${message}`.trim();
  }
  return text;
}

function ensureTitleQualifier(
  title: string,
  qualifier: string
): string {
  const normalized = title.toLowerCase();
  if (
    normalized.includes(qualifier.toLowerCase()) ||
    normalized.includes('vehicle not included') ||
    normalized.includes('vehicle is not included')
  ) {
    return title;
  }
  if (!normalized.includes(qualifier.toLowerCase())) {
    return `${title} — ${qualifier}`.trim();
  }
  return title;
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

      const disclaimerMessage = isInstallOnly
        ? 'Professional installation service only. Vehicle not included.'
        : 'Performance package only. Vehicle not included.';
      const titleQualifier = isInstallOnly
        ? 'Installation Service — Vehicle Not Included'
        : 'Performance Package — Vehicle Not Included';

      const feedTitle = ensureTitleQualifier(title, titleQualifier);
      const feedDescription = appendServiceMessaging(description, disclaimerMessage);

      const productLink = ensureUrl(slug, baseUrl);
      const quickUrlBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const quickCheckoutUrl = slug
        ? new URL(`/checkout/quick/${slug}`, quickUrlBase).toString()
        : productLink;

      const row: MerchantRow = {
        id,
        title: feedTitle,
        description: feedDescription,
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

      if (ENABLE_ADS_REDIRECT && quickCheckoutUrl) {
        row.ads_redirect = quickCheckoutUrl;
      }

      if (!isInstallOnly && allowsShipping && typeof SHIPPING_PRICE === 'number' && Number.isFinite(SHIPPING_PRICE)) {
        const shippingPrice = SHIPPING_PRICE;
        row.shipping = `US:::${shippingPrice.toFixed(2)} ${currency}`;
      }

      if (product?.gtin) row.gtin = sanitizeText(product.gtin);
      if (product?.mpn) row.mpn = sanitizeText(product.mpn);
      const googleCategory = sanitizeText(product?.google_product_category);
      row.google_product_category = googleCategory || DEFAULT_GOOGLE_PRODUCT_CATEGORY;

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

async function uploadViaContentApi(rows: MerchantRow[]): Promise<boolean> {
  const merchantIdRaw = process.env.GMC_CONTENT_API_MERCHANT_ID?.trim();
  if (!merchantIdRaw) {
    console.warn('Content API merchant ID missing; skipped API upload. Set GMC_CONTENT_API_MERCHANT_ID.');
    return false;
  }

  const credentials = await loadServiceAccountKey();
  if (!credentials?.client_email || !credentials?.private_key) {
    console.warn(
      'Google Content API credentials missing; skipped API upload. Provide GMC_SERVICE_ACCOUNT_KEY, GMC_SERVICE_ACCOUNT_KEY_BASE64, or GMC_SERVICE_ACCOUNT_KEY_FILE.'
    );
    return false;
  }

  try {
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [CONTENT_API_SCOPE]
    });

    const content = google.content({ version: 'v2.1', auth });
    const merchantId = merchantIdRaw;

    const batches = chunkArray(rows, CONTENT_API_BATCH_SIZE);
    let processed = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batchRows = batches[batchIndex];
      const requestBody: content_v2_1.Schema$ProductsCustomBatchRequest = {
        entries: batchRows.map((row, index) => ({
          batchId: batchIndex * CONTENT_API_BATCH_SIZE + index,
          merchantId,
          method: 'insert' as const,
          product: buildContentApiProduct(row)
        }))
      };

      const response = await content.products.custombatch({ requestBody });
      const entries = response.data?.entries ?? [];
      const failures =
        entries.filter((entry) => entry.errors?.errors && entry.errors.errors.length > 0) ?? [];

      if (failures.length) {
        failures.forEach((entry) => {
          const errors = entry.errors?.errors ?? [];
          errors.forEach((error) => {
            const offerId = entry.product?.offerId || entry.product?.id || 'unknown';
            console.error(`Content API error (offerId=${offerId}) [${error.reason}]: ${error.message}`);
          });
        });
        throw new Error(`Content API batch ${batchIndex + 1} reported ${failures.length} error entries.`);
      }

      processed += batchRows.length;
    }

    console.log(`Uploaded feed to Google Content API with ${processed} products.`);
    return true;
  } catch (err) {
    console.error('Failed to upload via Google Content API:', err);
    return false;
  }
}

async function uploadViaSftp(content: string): Promise<boolean> {
  const host = process.env.GMC_SFTP_HOST;
  const username = process.env.GMC_SFTP_USERNAME;
  const password = process.env.GMC_SFTP_PASSWORD;
  const port = Number(process.env.GMC_SFTP_PORT || '22');

  if (!host || !username || !password) {
    console.warn('SFTP credentials missing; skipped upload. Set GMC_SFTP_HOST, GMC_SFTP_USERNAME, and GMC_SFTP_PASSWORD.');
    return false;
  }

  const sftp = new SFTPClient();
  try {
    console.log(`Connecting to ${host}:${port} as ${username}...`);
    await sftp.connect({ host, port, username, password });
    await sftp.put(Buffer.from(content, 'utf8'), REMOTE_FILENAME);
    console.log(`Uploaded feed to ${host}/${REMOTE_FILENAME}`);
    return true;
  } catch (err) {
    console.error('Failed to upload feed via SFTP:', err);
    return false;
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
  const uploadedViaApi = await uploadViaContentApi(rows);
  let uploadedViaSftp = false;

  if (!uploadedViaApi) {
    uploadedViaSftp = await uploadViaSftp(tsv);
  } else if (process.env.GMC_SFTP_HOST && process.env.GMC_SFTP_USERNAME && process.env.GMC_SFTP_PASSWORD) {
    console.log('Skipping SFTP upload because Content API upload succeeded.');
  }

  if (!uploadedViaApi && !uploadedViaSftp) {
    console.warn('Feed was generated but not uploaded to any remote destination.');
    process.exitCode = 1;
  }

  console.log(`Feed generated with ${rows.length} products.`);
}

main().catch((err) => {
  console.error('Failed to generate/upload Google Merchant feed:', err);
  process.exitCode = 1;
});
