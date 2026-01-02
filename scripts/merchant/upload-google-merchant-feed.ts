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
  product_type?: string;
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  custom_label_3?: string;
  additional_image_link?: string;
  product_details?: ProductDetailEntry[];
  product_highlights?: string[];
};

type ServiceAccountKey = {
  client_email?: string;
  private_key?: string;
  [key: string]: unknown;
};

type ProductDetailEntry = {
  sectionName: string;
  attributeName: string;
  attributeValue: string;
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
const CONTENT_API_BATCH_SIZE =
  Number.isFinite(parsedBatchSize) && parsedBatchSize > 0 ? Math.floor(parsedBatchSize) : 250;
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

function clampLength(value: string, maxLength: number): string {
  if (!value) return value;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.replace(/^[\s•\-\u2013\u2014]+/, '').trim())
    .filter((sentence) => sentence.length > 0);
}

function formatListSummary(items: string[], maxItems = 3): string {
  if (!items.length) return '';
  const unique = Array.from(new Set(items.map((item) => sanitizeText(item)).filter(Boolean)));
  if (!unique.length) return '';
  const displayed = unique.slice(0, maxItems);
  const remainder = unique.length - displayed.length;
  const summary = displayed.join(', ');
  if (remainder > 0) {
    return `${summary}, and ${remainder} more`.trim();
  }
  return summary;
}

type ProductHighlightsInput = {
  shortDescription?: string;
  description?: string;
  attributes?: any[];
  specifications?: any[];
  includedInKit?: any[];
  isInstallOnly: boolean;
  allowsShipping: boolean;
};

type ProductDetailsInput = {
  specifications?: any[];
  attributes?: any[];
  includedInKit?: any[];
  categoryTitles: string[];
  productTypeSegments: string[];
  filterTags: string[];
  isInstallOnly: boolean;
};

const MAX_PRODUCT_HIGHLIGHTS = 6;
const MAX_PRODUCT_DETAILS = 10;
const VEHICLE_DISCLAIMER_KEYWORDS = [
  'install service',
  'installation service',
  'install-only',
  'install only',
  'performance package',
  'performance packages',
  'power package',
  'power packages',
  'truck package',
  'truck packages'
];

function buildProductHighlights(input: ProductHighlightsInput): string[] {
  const highlights: string[] = [];
  const seen = new Set<string>();

  function pushHighlight(raw: string) {
    const cleaned = clampLength(sanitizeText(raw), 150);
    if (!cleaned) return;
    const fingerprint = cleaned.toLowerCase();
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    highlights.push(cleaned);
  }

  const baseText = sanitizeText(input.shortDescription) || sanitizeText(input.description);
  splitIntoSentences(baseText)
    .map((sentence) => clampLength(sentence, 150))
    .some((sentence) => {
      pushHighlight(sentence);
      return highlights.length >= MAX_PRODUCT_HIGHLIGHTS;
    });

  if (highlights.length < MAX_PRODUCT_HIGHLIGHTS && Array.isArray(input.attributes)) {
    input.attributes.forEach((attr) => {
      if (highlights.length >= MAX_PRODUCT_HIGHLIGHTS) return;
      const name = sanitizeText(attr?.name || attr?.label);
      const value = sanitizeText(attr?.value);
      if (!name || !value) return;
      pushHighlight(`${name}: ${value}`);
    });
  }

  if (highlights.length < MAX_PRODUCT_HIGHLIGHTS && Array.isArray(input.specifications)) {
    input.specifications.forEach((spec) => {
      if (highlights.length >= MAX_PRODUCT_HIGHLIGHTS) return;
      const name = sanitizeText(spec?.label || spec?.key);
      const value = sanitizeText(spec?.value);
      if (!name || !value) return;
      pushHighlight(`${name}: ${value}`);
    });
  }

  if (highlights.length < MAX_PRODUCT_HIGHLIGHTS && Array.isArray(input.includedInKit)) {
    const items = input.includedInKit
      .map((entry) => {
        const quantity = entry?.quantity ? sanitizeText(entry.quantity) : '';
        const itemName = sanitizeText(entry?.item);
        if (!itemName) return '';
        return quantity ? `${quantity} × ${itemName}` : itemName;
      })
      .filter(Boolean);
    const summary = formatListSummary(items, 4);
    if (summary) {
      pushHighlight(`Includes: ${summary}`);
    }
  }

  if (highlights.length < MAX_PRODUCT_HIGHLIGHTS) {
    if (input.isInstallOnly) {
      pushHighlight('Professional installation and dyno calibration included.');
    } else if (!input.allowsShipping) {
      pushHighlight('Installation service required; shipping not available.');
    }
  }

  return highlights.slice(0, MAX_PRODUCT_HIGHLIGHTS);
}

function buildProductDetails(input: ProductDetailsInput): ProductDetailEntry[] {
  const details: ProductDetailEntry[] = [];
  const seen = new Set<string>();

  function pushDetail(section: string, name: string, value: string) {
    const sectionName = clampLength(sanitizeText(section), 70);
    const attributeName = clampLength(sanitizeText(name), 100);
    const attributeValue = clampLength(sanitizeText(value), 750);
    if (!sectionName || !attributeName || !attributeValue) return;
    const fingerprint = `${sectionName}|${attributeName}|${attributeValue}`.toLowerCase();
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    details.push({ sectionName, attributeName, attributeValue });
  }

  if (Array.isArray(input.specifications)) {
    input.specifications.forEach((spec) => {
      if (details.length >= MAX_PRODUCT_DETAILS) return;
      const name = sanitizeText(spec?.label || spec?.key);
      const value = sanitizeText(spec?.value);
      if (!name || !value) return;
      pushDetail('Specifications', name, value);
    });
  }

  if (details.length < MAX_PRODUCT_DETAILS && Array.isArray(input.attributes)) {
    input.attributes.forEach((attr) => {
      if (details.length >= MAX_PRODUCT_DETAILS) return;
      const name = sanitizeText(attr?.name || attr?.label);
      const value = sanitizeText(attr?.value);
      if (!name || !value) return;
      pushDetail('Performance Profile', name, value);
    });
  }

  if (details.length < MAX_PRODUCT_DETAILS && Array.isArray(input.includedInKit)) {
    const items = input.includedInKit
      .map((entry) => {
        const quantity = entry?.quantity ? sanitizeText(entry.quantity) : '';
        const itemName = sanitizeText(entry?.item);
        const notes = sanitizeText(entry?.notes);
        if (!itemName) return '';
        const parts = [quantity ? `${quantity}×` : '', itemName, notes ? `(${notes})` : '']
          .filter(Boolean)
          .join(' ');
        return parts;
      })
      .filter(Boolean);
    if (items.length) {
      pushDetail('Included Components', 'Package includes', clampLength(items.join('; '), 750));
    }
  }

  if (details.length < MAX_PRODUCT_DETAILS && input.categoryTitles.length) {
    pushDetail('Fitment & Category', 'Categories', input.categoryTitles.join(', '));
  }

  if (details.length < MAX_PRODUCT_DETAILS && input.productTypeSegments.length) {
    pushDetail('Product Type', 'Hierarchy', input.productTypeSegments.join(' > '));
  }

  if (details.length < MAX_PRODUCT_DETAILS && input.filterTags.length) {
    const formattedTags = input.filterTags
      .map((tag) => sanitizeText(tag))
      .filter(Boolean)
      .map((tag) => tag.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()));
    if (formattedTags.length) {
      pushDetail('Fitment & Category', 'Tags', formattedTags.join(', '));
    }
  }

  if (details.length < MAX_PRODUCT_DETAILS && input.isInstallOnly) {
    pushDetail(
      'Service Details',
      'Installation',
      'Professional installation service performed at F.A.S. Motorsports.'
    );
  }

  return details.slice(0, MAX_PRODUCT_DETAILS);
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

function normalizePriceValue(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;

    let sanitized = trimmed.replace(/[^0-9.,-]/g, '');
    if (!sanitized) return null;

    const hasDot = sanitized.includes('.');
    const hasComma = sanitized.includes(',');

    if (hasDot && hasComma) {
      sanitized = sanitized.replace(/,/g, '');
    } else if (!hasDot && hasComma) {
      sanitized = sanitized.replace(/,/g, '.');
    } else {
      sanitized = sanitized.replace(/,/g, '');
    }

    const parsed = Number.parseFloat(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (input && typeof input === 'object') {
    const candidates = [
      (input as any).amount,
      (input as any).value,
      (input as any).price,
      (input as any).base,
      (input as any).min,
      (input as any).max
    ];

    for (const candidate of candidates) {
      const normalized = normalizePriceValue(candidate);
      if (normalized !== null) return normalized;
    }

    if (Array.isArray((input as any).tiers)) {
      for (const tier of (input as any).tiers) {
        const normalized = normalizePriceValue(tier);
        if (normalized !== null) return normalized;
      }
    }
  }

  return null;
}

function formatPrice(price: unknown, currency: string): string | null {
  const normalized = normalizePriceValue(price);
  if (normalized === null) return null;
  const safeCurrency = (currency || DEFAULT_CURRENCY || 'USD').toUpperCase();
  return `${normalized.toFixed(2)} ${safeCurrency}`;
}

function parsePriceString(
  input: string | undefined,
  fallbackCurrency: string
): content_v2_1.Schema$Price | null {
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
  const numeric = trimmed.replace(/[^0-9.-]/g, '');
  if (!numeric) return null;
  return {
    value: numeric,
    currency: fallbackCurrency
  };
}

function parseShippingWeight(
  input: string | undefined
): content_v2_1.Schema$ProductShippingWeight | undefined {
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

function parseShippingAttribute(
  input: string | undefined,
  fallbackCurrency: string
): content_v2_1.Schema$ProductShipping[] {
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
      console.warn(
        'Failed to decode base64 service account key from GMC_SERVICE_ACCOUNT_KEY:',
        err
      );
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
      console.warn(
        `Service account key file at ${keyPath} is missing client_email or private_key.`
      );
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
  if (row.product_type) product.productTypes = [row.product_type];
  if (row.custom_label_0) product.customLabel0 = row.custom_label_0;
  if (row.custom_label_1) product.customLabel1 = row.custom_label_1;
  if (row.custom_label_2) product.customLabel2 = row.custom_label_2;
  if (row.custom_label_3) product.customLabel3 = row.custom_label_3;
  if (row.additional_image_link) {
    const additionalImages = row.additional_image_link
      .split(',')
      .map((value) => sanitizeText(value))
      .map((value) => value.trim())
      .filter(Boolean);
    if (additionalImages.length) {
      product.additionalImageLinks = additionalImages;
    }
  }

  if (row.product_highlights?.length) {
    const highlights = row.product_highlights
      .map((entry) => clampLength(sanitizeText(entry), 150))
      .filter(Boolean);
    if (highlights.length) {
      product.productHighlights = highlights.slice(0, MAX_PRODUCT_HIGHLIGHTS);
    }
  }

  if (row.product_details?.length) {
    const details = row.product_details
      .map((entry) => ({
        sectionName: clampLength(sanitizeText(entry.sectionName), 70),
        attributeName: clampLength(sanitizeText(entry.attributeName), 100),
        attributeValue: clampLength(sanitizeText(entry.attributeValue), 750)
      }))
      .filter((entry) => entry.sectionName && entry.attributeName && entry.attributeValue);
    if (details.length) {
      product.productDetails = details.slice(0, MAX_PRODUCT_DETAILS);
    }
  }

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
  const query = `*[_type=="product" && defined(slug.current) && !(_id in path("drafts.**")) && (status == "active" || !defined(status)) && coalesce(productType, "") != "service" && coalesce(draft,false) == false]{
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
  attributes[]{name, value, label},
  specifications[]{label, key, value},
  includedInKit[]{ item, quantity, notes },
  productType,
  "categoryTitles": select(
    defined(categories) => categories[]->title,
    defined(category) => category[]->title
  ),
  "additionalImages": images[]{asset->{url}},
  shippingClass,
  shippingWeight
}`;

  return sanity.fetch<any[]>(query);
}

function appendServiceMessaging(text: string, message: string): string {
  const normalized = text.toLowerCase();
  if (
    !normalized.includes('vehicle not included') &&
    !normalized.includes('vehicle is not included')
  ) {
    return `${text} ${message}`.trim();
  }
  return text;
}

function ensureTitleQualifier(title: string, qualifier: string): string {
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
      const shortDescriptionText = extractPlainText(product?.shortDescription);
      const longDescriptionText = extractPlainText(product?.description);
      const baseDescription = shortDescriptionText || longDescriptionText;
      const image = sanitizeText(product?.image);
      const slug = sanitizeText(product?.slug);
      const brand = sanitizeText(product?.brand) || 'F.A.S. Motorsports';
      const productTypeValue = sanitizeText(product?.productType);
      const categoryTitles: string[] = Array.isArray(product?.categoryTitles)
        ? product.categoryTitles.map((category: unknown) => sanitizeText(category)).filter(Boolean)
        : [];
      const productTypeSegments = Array.from(
        new Set([productTypeValue, ...categoryTitles].filter(Boolean))
      );
      const additionalImages: string[] = Array.isArray(product?.additionalImages)
        ? product.additionalImages
            .map((img: any) => {
              if (img && typeof img === 'object') {
                return sanitizeText(
                  (img.asset && 'url' in img.asset ? (img.asset as any).url : (img as any).url) ||
                    ''
                );
              }
              return sanitizeText(img);
            })
            .filter(Boolean)
            .filter((url: string) => url !== image)
        : [];
      const specificationItems = Array.isArray(product?.specifications)
        ? product.specifications
        : [];
      const attributeItems = Array.isArray(product?.attributes) ? product.attributes : [];
      const includedItems = Array.isArray(product?.includedInKit) ? product.includedInKit : [];

      if (!id || !title || !slug || !baseDescription || !image) {
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
        normalizedClass.includes('installonly') ||
        filterSlugs.includes('install-only') ||
        filterSlugs.includes('install_only');
      const isPerformanceParts =
        normalizedClass === 'performanceparts' ||
        filterSlugs.includes('performance-parts') ||
        filterSlugs.includes('performance_parts');
      const allowsShipping = !isInstallOnly && (isPerformanceParts || normalizedClass.length === 0);

      const normalizedCategoryTokens: string[] = categoryTitles
        .map((value) => sanitizeText(value).toLowerCase())
        .filter((value): value is string => Boolean(value));
      const normalizedProductTypeTokens: string[] = productTypeSegments
        .map((value) => sanitizeText(value).toLowerCase())
        .filter((value): value is string => Boolean(value));
      const normalizedFilterTokens: string[] = filterSlugs
        .map((slug) => sanitizeText(slug.replace(/[-_]/g, ' ')).toLowerCase())
        .filter((value): value is string => Boolean(value));

      const requiresVehicleDisclaimer =
        isInstallOnly ||
        [
          ...normalizedCategoryTokens,
          ...normalizedProductTypeTokens,
          ...normalizedFilterTokens
        ].some((token) => VEHICLE_DISCLAIMER_KEYWORDS.some((keyword) => token.includes(keyword)));

      let feedTitle = title;
      let feedDescription = baseDescription;

      if (requiresVehicleDisclaimer) {
        const disclaimerMessage = isInstallOnly
          ? 'Professional installation service only. Vehicle not included.'
          : 'Performance package only. Vehicle not included.';
        const titleQualifier = isInstallOnly
          ? 'Installation Service — Vehicle Not Included'
          : 'Performance Package — Vehicle Not Included';

        feedTitle = ensureTitleQualifier(title, titleQualifier);
        feedDescription = appendServiceMessaging(baseDescription, disclaimerMessage);
      }

      const productLink = ensureUrl(slug, baseUrl);
      const quickUrlBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const quickCheckoutUrl = slug
        ? new URL(`/checkout/quick/${slug}`, quickUrlBase).toString()
        : productLink;
      const formattedPrice = formatPrice(product?.price, currency);

      if (!formattedPrice) {
        console.warn(`Skipping product "${title}" (${id}) because it is missing a valid price.`);
        return null;
      }

      const row: MerchantRow = {
        id,
        title: feedTitle,
        description: feedDescription,
        link: productLink,
        image_link: image,
        availability: computeAvailability(product?.manualInventoryCount),
        price: formattedPrice,
        brand,
        condition: 'new',
        quantity: String(computeQuantity(product?.manualInventoryCount)),
        shipping_label: isInstallOnly ? 'install_only' : 'performance_parts',
        shipping_weight: `${computeWeight(product?.shippingWeight).toFixed(2)} lb`
      };

      if (productTypeSegments.length) {
        row.product_type = clampLength(productTypeSegments.join(' > '), 750);
      }

      if (categoryTitles[0]) {
        row.custom_label_1 = clampLength(categoryTitles[0], 100);
      } else if (productTypeValue) {
        row.custom_label_1 = clampLength(productTypeValue, 100);
      }

      if (ENABLE_ADS_REDIRECT && quickCheckoutUrl) {
        row.ads_redirect = quickCheckoutUrl;
      }

      const highlights = buildProductHighlights({
        shortDescription: shortDescriptionText,
        description: longDescriptionText,
        attributes: attributeItems,
        specifications: specificationItems,
        includedInKit: includedItems,
        isInstallOnly,
        allowsShipping
      });
      if (highlights.length) {
        row.product_highlights = highlights;
      }

      const details = buildProductDetails({
        specifications: specificationItems,
        attributes: attributeItems,
        includedInKit: includedItems,
        categoryTitles,
        productTypeSegments,
        filterTags: filterSlugs,
        isInstallOnly
      });
      if (details.length) {
        row.product_details = details;
      }

      if (
        !isInstallOnly &&
        allowsShipping &&
        typeof SHIPPING_PRICE === 'number' &&
        Number.isFinite(SHIPPING_PRICE)
      ) {
        const shippingPrice = SHIPPING_PRICE;
        row.shipping = `US:::${shippingPrice.toFixed(2)} ${currency}`;
      }

      if (product?.gtin) row.gtin = sanitizeText(product.gtin);
      if (product?.mpn) row.mpn = sanitizeText(product.mpn);
      const googleCategory = sanitizeText(product?.google_product_category);
      row.google_product_category = googleCategory || DEFAULT_GOOGLE_PRODUCT_CATEGORY;
      row.custom_label_0 = clampLength(
        isInstallOnly ? 'install_service' : 'performance_product',
        100
      );
      row.custom_label_2 = clampLength(allowsShipping ? 'ships_available' : 'install_only', 100);
      row.custom_label_3 = clampLength(
        ENABLE_ADS_REDIRECT ? 'ads_redirect_enabled' : 'ads_redirect_disabled',
        100
      );

      if (additionalImages.length) {
        const uniqueAdditionalImages = Array.from(new Set(additionalImages));
        if (uniqueAdditionalImages.length) {
          row.additional_image_link = uniqueAdditionalImages.slice(0, 10).join(',');
        }
      }

      return row;
    })
    .filter(Boolean) as MerchantRow[];
}

type MerchantRowValue = string | number | ProductDetailEntry[] | string[] | undefined;

function isProductDetailArray(value: unknown): value is ProductDetailEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === 'object' &&
        'sectionName' in entry &&
        'attributeName' in entry &&
        'attributeValue' in entry
    )
  );
}

function formatRowValue(value: MerchantRowValue): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) {
    if (!value.length) return '';
    if (isProductDetailArray(value)) {
      return value
        .map((entry) => {
          const section = sanitizeText(entry.sectionName);
          const name = sanitizeText(entry.attributeName);
          const attributeValue = sanitizeText(entry.attributeValue);
          const parts = [];
          if (section) parts.push(`section_name:${section}`);
          if (name) parts.push(`attribute_name:${name}`);
          if (attributeValue) parts.push(`attribute_value:${attributeValue}`);
          return parts.join('; ');
        })
        .filter(Boolean)
        .join(' | ');
    }
    return value
      .map((item) => sanitizeText(String(item)))
      .filter(Boolean)
      .join(' | ');
  }
  if (typeof value === 'number') {
    return sanitizeText(value.toString());
  }
  if (typeof value === 'string') {
    return sanitizeText(value);
  }
  return sanitizeText(String(value));
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
        const value = (row as Record<string, MerchantRowValue>)[column];
        return formatRowValue(value);
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
    console.warn(
      'Content API merchant ID missing; skipped API upload. Set GMC_CONTENT_API_MERCHANT_ID.'
    );
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
            console.error(
              `Content API error (offerId=${offerId}) [${error.reason}]: ${error.message}`
            );
          });
        });
        throw new Error(
          `Content API batch ${batchIndex + 1} reported ${failures.length} error entries.`
        );
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
    console.warn(
      'SFTP credentials missing; skipped upload. Set GMC_SFTP_HOST, GMC_SFTP_USERNAME, and GMC_SFTP_PASSWORD.'
    );
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

export async function runMerchantFeedUpload() {
  const products = await fetchProducts();
  if (!products || products.length === 0) {
    console.warn('No products returned from Sanity; nothing to upload.');
    return { rows: 0, uploadedViaApi: false, uploadedViaSftp: false, localPath: LOCAL_FEED_PATH };
  }

  const rows = buildRows(products, DEFAULT_BASE_URL, DEFAULT_CURRENCY);
  if (!rows.length) {
    console.warn('All products were filtered out (missing SKU/title/slug).');
    return { rows: 0, uploadedViaApi: false, uploadedViaSftp: false, localPath: LOCAL_FEED_PATH };
  }

  const tsv = toTsv(rows);
  await writeLocalFile(tsv);
  const uploadedViaApi = await uploadViaContentApi(rows);
  let uploadedViaSftp = false;

  if (!uploadedViaApi) {
    uploadedViaSftp = await uploadViaSftp(tsv);
  } else if (
    process.env.GMC_SFTP_HOST &&
    process.env.GMC_SFTP_USERNAME &&
    process.env.GMC_SFTP_PASSWORD
  ) {
    console.log('Skipping SFTP upload because Content API upload succeeded.');
  }

  if (!uploadedViaApi && !uploadedViaSftp) {
    console.warn('Feed was generated but not uploaded to any remote destination.');
  }

  console.log(`Feed generated with ${rows.length} products.`);

  return { rows: rows.length, uploadedViaApi, uploadedViaSftp, localPath: LOCAL_FEED_PATH };
}

if (process.argv[1]?.includes('upload-google-merchant-feed')) {
  runMerchantFeedUpload().catch((err) => {
    console.error('Failed to generate/upload Google Merchant feed:', err);
    process.exitCode = 1;
  });
}
