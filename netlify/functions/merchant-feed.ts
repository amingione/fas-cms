import type { Handler } from '@netlify/functions';
import { sanity } from './_sanity';

type PortableText = any;

const DEFAULT_BASE_URL =
  process.env.MERCHANT_FEED_BASE_URL ||
  process.env.PUBLIC_SITE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.SITE_URL ||
  'https://www.fasmotorsports.com';

const DEFAULT_CURRENCY =
  process.env.MERCHANT_FEED_CURRENCY || process.env.GMC_FEED_CURRENCY || 'USD';

const HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'availability date',
  'expiration date',
  'link',
  'mobile link',
  'image link',
  'price',
  'sale price',
  'sale price effective date',
  'identifier exists',
  'gtin',
  'mpn',
  'brand',
  'product highlight',
  'product detail',
  'additional image link',
  'condition',
  'adult',
  'color',
  'size',
  'size type',
  'size system',
  'gender',
  'material',
  'pattern',
  'age group',
  'multipack',
  'is bundle',
  'unit pricing measure',
  'unit pricing base measure',
  'energy efficiency class',
  'min energy efficiency class',
  'max energy efficiency class',
  'item group id',
  'sell on google quantity'
] as const;

type HeaderKey = (typeof HEADERS)[number];

type SanityImage = {
  asset?: { url?: string | null } | null;
  alt?: string | null;
};

type SanityAttribute = {
  name?: string | null;
  value?: string | null;
};

type SanitySpecification = {
  label?: string | null;
  name?: string | null;
  value?: string | null;
  detail?: string | null;
};

type SanityKitItem = {
  item?: string | null;
  quantity?: number | null;
  notes?: string | null;
};

type SanityCategory = {
  _id?: string;
  title?: string | null;
  slug?: { current?: string | null } | string | null;
};

type SanityFilter = SanityCategory;

type SanityProduct = {
  _id: string;
  title?: string | null;
  slug?: { current?: string | null } | null;
  sku?: string | null;
  price?: number | null;
  salePrice?: number | null;
  onSale?: boolean | null;
  promotionActive?: boolean | null;
  promotionStartDate?: string | null;
  promotionEndDate?: string | null;
  description?: PortableText;
  shortDescription?: PortableText;
  importantNotes?: PortableText;
  includedInKit?: SanityKitItem[] | null;
  specifications?: SanitySpecification[] | null;
  attributes?: SanityAttribute[] | null;
  images?: SanityImage[] | null;
  mediaAssets?: { url?: string | null; assetUrl?: string | null }[] | null;
  brand?: string | null;
  gtin?: string | null;
  mpn?: string | null;
  productType?: string | null;
  category?: SanityCategory[] | null;
  categories?: SanityCategory[] | null;
  filters?: SanityFilter[] | null;
  inventory?: number | null;
  manualInventoryCount?: number | null;
  promotionTagline?: string | null;
  shippingClass?: string | null;
  handlingTime?: number | null;
  canonicalUrl?: string | null;
};

const portableTextToPlain = (input: PortableText): string => {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (Array.isArray(input)) {
    return input
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object') {
          if (Array.isArray((block as any).children)) {
            return (block as any).children
              .map((child: any) => (typeof child?.text === 'string' ? child.text : ''))
              .join('');
          }
          if (typeof (block as any).text === 'string') return (block as any).text;
        }
        return '';
      })
      .join(' ');
  }
  if (typeof input === 'object') {
    const candidates = ['text', 'content', 'value', 'description'];
    for (const key of candidates) {
      const candidate = (input as any)?.[key];
      if (candidate) return portableTextToPlain(candidate);
    }
  }
  return '';
};

const sanitize = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = String(value)
    .replace(/\t+/g, ' ')
    .replace(/\r?\n+/g, ' ')
    .trim();
  return str;
};

const slugify = (value: unknown): string => {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const buildProductUrl = (product: SanityProduct): string => {
  if (product.canonicalUrl) {
    return product.canonicalUrl;
  }
  const slug = typeof product.slug?.current === 'string' ? product.slug.current : '';
  if (!slug) return DEFAULT_BASE_URL;
  try {
    return new URL(`/shop/${slug}`, DEFAULT_BASE_URL).toString();
  } catch {
    return `${DEFAULT_BASE_URL.replace(/\/+$/, '')}/shop/${slug}`;
  }
};

const mainImageUrl = (product: SanityProduct): string => {
  const firstImage = product.images?.find((img) => img?.asset?.url);
  if (firstImage?.asset?.url) return firstImage.asset.url;
  const firstMedia = product.mediaAssets?.find((asset) => asset?.url || asset?.assetUrl);
  return firstMedia?.url || firstMedia?.assetUrl || '';
};

const additionalImages = (product: SanityProduct): string[] => {
  const urls: string[] = [];
  (product.images || []).forEach((img, index) => {
    if (index === 0) return;
    const url = img?.asset?.url;
    if (url) urls.push(url);
  });
  (product.mediaAssets || []).forEach((asset) => {
    const url = asset?.url || asset?.assetUrl;
    if (url) urls.push(url);
  });
  return Array.from(new Set(urls));
};

const formatPrice = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `${value.toFixed(2)} ${DEFAULT_CURRENCY}`;
};

const isoDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

const buildSaleEffectiveDate = (start?: string | null, end?: string | null): string => {
  const startIso = isoDate(start) ?? isoDate(new Date().toISOString());
  const endIso = isoDate(end);
  if (!startIso && !endIso) return '';
  if (startIso && endIso) return `${startIso}/${endIso}`;
  return startIso || endIso || '';
};

const attributeValue = (product: SanityProduct, nameMatchers: string[]): string => {
  const entries = product.attributes || [];
  const match = entries.find((attr) => {
    const name = attr?.name || '';
    const slug = slugify(name);
    return nameMatchers.some(
      (matcher) =>
        slug === slugify(matcher) ||
        slug.includes(slugify(matcher)) ||
        name.toLowerCase().includes(matcher.toLowerCase())
    );
  });
  return sanitize(match?.value || '');
};

const gatherHighlights = (product: SanityProduct): string => {
  const highlights: string[] = [];
  if (product.promotionTagline) {
    highlights.push(product.promotionTagline);
  }
  (product.attributes || []).forEach((attr) => {
    const name = sanitize(attr?.name);
    const value = sanitize(attr?.value);
    if (name && value) highlights.push(`${name}: ${value}`);
  });
  (product.specifications || []).forEach((spec) => {
    const label = sanitize(spec?.label || spec?.name);
    const value = sanitize(spec?.value);
    if (label && value) highlights.push(`${label}: ${value}`);
  });
  const plainShort = portableTextToPlain(product.shortDescription);
  if (plainShort) highlights.push(plainShort);
  return Array.from(new Set(highlights)).filter(Boolean).slice(0, 6).join(' | ');
};

const gatherDetails = (product: SanityProduct): string => {
  const details: string[] = [];
  const plainDescription = portableTextToPlain(product.description);
  if (plainDescription) details.push(`Description: ${plainDescription}`);
  (product.specifications || []).forEach((spec) => {
    const label = sanitize(spec?.label || spec?.name);
    const value = sanitize(spec?.detail || spec?.value);
    if (label && value) details.push(`${label}: ${value}`);
  });
  const kitItems = (product.includedInKit || []).map((kit) => {
    const name = sanitize(kit?.item);
    if (!name) return '';
    const qty =
      typeof kit?.quantity === 'number' && Number.isFinite(kit.quantity) ? `x${kit.quantity}` : '';
    return `${name}${qty ? ` ${qty}` : ''}`;
  });
  if (kitItems.length) {
    details.push(`Kit Includes: ${kitItems.filter(Boolean).join(', ')}`);
  }
  const notes = portableTextToPlain(product.importantNotes);
  if (notes) details.push(`Notes: ${notes}`);
  return details.filter(Boolean).join(' | ');
};

const availabilityStatus = (product: SanityProduct): string => {
  const qty = inventoryQuantity(product);
  if (qty === null) return 'in stock';
  return qty > 0 ? 'in stock' : 'out of stock';
};

const inventoryQuantity = (product: SanityProduct): number | null => {
  const numbers: number[] = [];
  if (typeof product.inventory === 'number' && Number.isFinite(product.inventory)) {
    numbers.push(product.inventory);
  }
  if (
    typeof product.manualInventoryCount === 'number' &&
    Number.isFinite(product.manualInventoryCount)
  ) {
    numbers.push(product.manualInventoryCount);
  }
  if (!numbers.length) return null;
  return Math.max(...numbers);
};

const gatherCategories = (product: SanityProduct): SanityCategory[] => {
  const primary = Array.isArray(product.categories) ? product.categories : [];
  const legacy = Array.isArray(product.category) ? product.category : [];
  const map = new Map<string, SanityCategory>();
  [...primary, ...legacy].forEach((entry) => {
    if (!entry) return;
    const key = String(entry._id || entry.slug || entry.title || Math.random());
    if (!map.has(key)) map.set(key, entry);
  });
  return Array.from(map.values());
};

const itemGroupId = (product: SanityProduct): string => {
  const productType = slugify(product.productType);
  if (productType === 'variation' || productType === 'variable') {
    const categories = gatherCategories(product)
      .map((cat) => slugify((cat.slug as any)?.current || cat.slug || cat.title))
      .filter(Boolean)
      .join('-');
    if (categories) return categories;
  }
  const slug = typeof product.slug?.current === 'string' ? product.slug.current : '';
  if (slug) return slug;
  if (product.sku) return slugify(product.sku);
  return slugify(product._id);
};

const mapField = (product: SanityProduct, key: HeaderKey): string => {
  switch (key) {
    case 'id':
      return sanitize(product.sku || product._id);
    case 'title':
      return sanitize(product.title);
    case 'description':
      return sanitize(
        portableTextToPlain(product.description) || portableTextToPlain(product.shortDescription)
      );
    case 'availability':
      return availabilityStatus(product);
    case 'availability date':
    case 'expiration date':
      return '';
    case 'link':
    case 'mobile link':
      return buildProductUrl(product);
    case 'image link':
      return sanitize(mainImageUrl(product));
    case 'price':
      return formatPrice(product.price ?? null);
    case 'sale price':
      if (!product.onSale || typeof product.salePrice !== 'number') return '';
      return formatPrice(product.salePrice);
    case 'sale price effective date':
      if (!product.onSale) return '';
      return sanitize(buildSaleEffectiveDate(product.promotionStartDate, product.promotionEndDate));
    case 'identifier exists':
      return product.gtin || product.mpn || product.brand ? 'TRUE' : 'FALSE';
    case 'gtin':
      return sanitize(product.gtin);
    case 'mpn':
      return sanitize(product.mpn);
    case 'brand':
      return sanitize(product.brand);
    case 'product highlight':
      return sanitize(gatherHighlights(product));
    case 'product detail':
      return sanitize(gatherDetails(product));
    case 'additional image link':
      return sanitize(additionalImages(product).join(','));
    case 'condition':
      return 'new';
    case 'adult':
      return 'FALSE';
    case 'color':
      return attributeValue(product, ['color', 'colour', 'finish']);
    case 'size':
      return attributeValue(product, ['size', 'fit']);
    case 'size type':
    case 'size system':
    case 'gender':
    case 'material':
    case 'pattern':
      return attributeValue(product, [key]);
    case 'age group':
      return attributeValue(product, ['age group']) || 'adult';
    case 'multipack':
      return '1';
    case 'is bundle':
      return product.productType === 'grouped' || (product.includedInKit?.length ?? 0) > 0
        ? 'TRUE'
        : 'FALSE';
    case 'unit pricing measure':
    case 'unit pricing base measure':
    case 'energy efficiency class':
    case 'min energy efficiency class':
    case 'max energy efficiency class':
      return '';
    case 'item group id':
      return itemGroupId(product);
    case 'sell on google quantity': {
      const qty = inventoryQuantity(product);
      return qty === null ? '' : String(qty);
    }
    default:
      return '';
  }
};

const buildRow = (product: SanityProduct): string[] => {
  return HEADERS.map((key) => mapField(product, key));
};

const fetchProducts = async (): Promise<SanityProduct[]> => {
  const query = `*[_type == "product" && !(_id in path("drafts.**"))]{
    _id,
    title,
    slug,
    sku,
    price,
    salePrice,
    onSale,
    promotionActive,
    promotionStartDate,
    promotionEndDate,
    description,
    shortDescription,
    importantNotes,
    includedInKit[]{item, quantity, notes},
    specifications[]{label, name, value, detail},
    attributes[]{name, value},
    images[]{asset->{url}, alt},
    mediaAssets[]{
      ...,
      "assetUrl": coalesce(asset->url, url)
    },
    brand,
    gtin,
    mpn,
    productType,
    category[]->{_id, title, slug},
    categories[]->{_id, title, slug},
    filters[]->{_id, title, slug},
    inventory,
    manualInventoryCount,
    promotionTagline,
    shippingClass,
    handlingTime,
    canonicalUrl
  }`;
  return sanity.fetch<SanityProduct[]>(query);
};

const merchantFeedHandler: Handler = async () => {
  try {
    const products = await fetchProducts();
    const lines = [HEADERS.join('\t')];
    for (const product of products) {
      const row = buildRow(product).map(sanitize);
      lines.push(row.join('\t'));
    }
    const body = lines.join('\n');
    return {
      statusCode: 200,
      headers: {
        'content-type': 'text/tab-separated-values; charset=utf-8',
        'cache-control': 'public, max-age=300'
      },
      body
    };
  } catch (error: any) {
    console.error('[merchant-feed] failed to build feed', error);
    return {
      statusCode: 500,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      },
      body: JSON.stringify({
        error: 'Unable to generate feed',
        message: error?.message || String(error)
      })
    };
  }
};

export const handler = merchantFeedHandler;
