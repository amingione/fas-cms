/**
 * AUDIT SCRIPT: Sanity addOns Discovery
 * 
 * Phase 0, Task 0.1
 * 
 * PURPOSE:
 * Analyze all Sanity products to understand current addOns usage.
 * This is a READ-ONLY audit with no modifications to any system.
 * 
 * SCOPE:
 * - Query all product documents in Sanity
 * - Count products with addOns/upgrades/extras
 * - List unique addOn labels and their frequencies
 * - Calculate total addon value per product
 * - Export CSV report for migration planning
 * 
 * OUTPUT:
 * - CSV: audit-sanity-addons-YYYY-MM-DD.csv
 * - Console summary with statistics
 * 
 * CONSTRAINTS:
 * - Read-only (no writes to Sanity or Medusa)
 * - No schema changes
 * - No sync logic
 */

import { writeFileSync } from 'fs';
import { sanity } from '../server/sanity-client.js';

type AddOnEntry = {
  label?: string;
  title?: string;
  name?: string;
  value?: string;
  priceDelta?: number;
  price?: number;
  delta?: number;
  description?: string;
  skuSuffix?: string;
  defaultSelected?: boolean;
};

type ProductWithAddOns = {
  _id: string;
  _type: string;
  title: string;
  slug?: { current?: string };
  productType?: string;
  status?: string;
  addOns?: AddOnEntry[];
  upgrades?: AddOnEntry[];
  extras?: AddOnEntry[];
};

type AuditResult = {
  product_id: string;
  product_slug: string;
  product_title: string;
  product_type: string;
  status: string;
  addon_count: number;
  addon_labels: string;
  addon_prices: string;
  total_addon_value: number;
  has_price_data: boolean;
};

/**
 * Normalize addOn entry to extract label and price
 */
function normalizeAddOn(addon: AddOnEntry): { label: string; price: number | null } {
  const label =
    addon.label ||
    addon.title ||
    addon.name ||
    addon.value ||
    '';

  const price =
    addon.priceDelta ??
    addon.price ??
    addon.delta ??
    null;

  return {
    label: label.toString().trim(),
    price: typeof price === 'number' ? price : null
  };
}

/**
 * Extract addOns array from product (checks multiple field names)
 */
function extractAddOnsArray(product: ProductWithAddOns): AddOnEntry[] {
  const sources = [
    product.addOns,
    product.upgrades,
    product.extras
  ];

  for (const source of sources) {
    if (Array.isArray(source) && source.length > 0) {
      return source;
    }
  }

  return [];
}

/**
 * Main audit function
 */
async function auditSanityAddOns() {
  console.log('\n' + '='.repeat(70));
  console.log('SANITY ADDONS AUDIT - PHASE 0, TASK 0.1');
  console.log('='.repeat(70) + '\n');

  console.log('⏳ Querying Sanity for all products...\n');

  // Query all products (including drafts for complete picture)
  const query = `
    *[_type == "product"] {
      _id,
      _type,
      title,
      slug,
      productType,
      status,
      addOns,
      upgrades,
      extras
    }
  `;

  const allProducts = await sanity.fetch<ProductWithAddOns[]>(query);

  console.log(`✓ Found ${allProducts.length} total products in Sanity\n`);

  // Filter to products with addOns
  const productsWithAddOns = allProducts.filter((product) => {
    const addons = extractAddOnsArray(product);
    return addons.length > 0;
  });

  console.log(`✓ ${productsWithAddOns.length} products have addOns/upgrades/extras\n`);

  if (productsWithAddOns.length === 0) {
    console.log('✅ No products with addOns found. Audit complete.\n');
    console.log('='.repeat(70) + '\n');
    return;
  }

  // Analyze addOns
  const results: AuditResult[] = [];
  const allAddOnLabels: Map<string, number> = new Map(); // label -> count
  let totalProducts = 0;
  let totalAddOns = 0;
  let productsWithPricing = 0;

  for (const product of productsWithAddOns) {
    const addons = extractAddOnsArray(product);
    const normalizedAddOns = addons.map(normalizeAddOn);

    const labels: string[] = [];
    const prices: number[] = [];
    let totalValue = 0;
    let hasPriceData = false;

    for (const { label, price } of normalizedAddOns) {
      if (label) {
        labels.push(label);
        
        // Track global addOn label frequency
        const count = allAddOnLabels.get(label) || 0;
        allAddOnLabels.set(label, count + 1);
      }

      if (price !== null) {
        prices.push(price);
        totalValue += price;
        hasPriceData = true;
      }
    }

    if (hasPriceData) {
      productsWithPricing++;
    }

    results.push({
      product_id: product._id,
      product_slug: product.slug?.current || 'NO_SLUG',
      product_title: product.title || 'Untitled',
      product_type: product.productType || 'unknown',
      status: product.status || 'unknown',
      addon_count: addons.length,
      addon_labels: labels.join(' | '),
      addon_prices: prices.map(p => `$${p.toFixed(2)}`).join(' | '),
      total_addon_value: totalValue,
      has_price_data: hasPriceData
    });

    totalProducts++;
    totalAddOns += addons.length;
  }

  // Sort results by addon count (descending)
  results.sort((a, b) => b.addon_count - a.addon_count);

  // Print summary statistics
  console.log('📊 SUMMARY STATISTICS:\n');
  console.log(`   Total products analyzed: ${allProducts.length}`);
  console.log(`   Products with addOns: ${totalProducts}`);
  console.log(`   Products with pricing data: ${productsWithPricing}`);
  console.log(`   Total addOns across all products: ${totalAddOns}`);
  console.log(`   Average addOns per product: ${(totalAddOns / totalProducts).toFixed(1)}`);
  console.log('');

  // Print top 10 most common addOn labels
  const sortedLabels = Array.from(allAddOnLabels.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  console.log('🏆 TOP 10 MOST COMMON ADDONS:\n');
  sortedLabels.forEach(([label, count], index) => {
    console.log(`   ${index + 1}. ${label} (${count} products)`);
  });
  console.log('');

  // Print products with most addOns
  const topComplexProducts = results.slice(0, 5);
  console.log('⚠️  MOST COMPLEX PRODUCTS (highest addOn count):\n');
  topComplexProducts.forEach((result, index) => {
    console.log(`   ${index + 1}. ${result.product_title} (${result.product_slug})`);
    console.log(`      • ${result.addon_count} addOns: ${result.addon_labels}`);
    if (result.has_price_data) {
      console.log(`      • Total value: $${result.total_addon_value.toFixed(2)}`);
    }
  });
  console.log('');

  // Export CSV
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `audit-sanity-addons-${timestamp}.csv`;

  const csvHeader = 'product_id,product_slug,product_title,product_type,status,addon_count,addon_labels,addon_prices,total_addon_value,has_price_data\n';
  const csvRows = results.map((row) => [
    row.product_id,
    row.product_slug,
    `"${row.product_title.replace(/"/g, '""')}"`,
    row.product_type,
    row.status,
    row.addon_count,
    `"${row.addon_labels.replace(/"/g, '""')}"`,
    `"${row.addon_prices.replace(/"/g, '""')}"`,
    row.total_addon_value.toFixed(2),
    row.has_price_data
  ].join(','));

  const csvContent = csvHeader + csvRows.join('\n');

  try {
    writeFileSync(filename, csvContent, 'utf8');
    console.log(`📄 CSV REPORT EXPORTED:\n`);
    console.log(`   File: ${filename}`);
    console.log(`   Location: ${process.cwd()}/${filename}`);
    console.log(`   Rows: ${results.length}\n`);
  } catch (error) {
    console.error(`❌ Failed to write CSV file: ${error}\n`);
  }

  // Export unique labels list for reference
  const labelsFilename = `addon-labels-${timestamp}.txt`;
  const labelsContent = Array.from(allAddOnLabels.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `${label} (${count})`)
    .join('\n');

  try {
    writeFileSync(labelsFilename, labelsContent, 'utf8');
    console.log(`📝 ADDON LABELS LIST:\n`);
    console.log(`   File: ${labelsFilename}`);
    console.log(`   Unique labels: ${allAddOnLabels.size}\n`);
  } catch (error) {
    console.error(`❌ Failed to write labels file: ${error}\n`);
  }

  console.log('✅ AUDIT COMPLETE\n');
  console.log('NEXT STEPS:');
  console.log('   1. Review CSV report to understand product complexity');
  console.log('   2. Identify Priority 1 products for migration (simple addOns, high traffic)');
  console.log('   3. Proceed to Task 0.2: Audit Medusa variants (when approved)');
  console.log('');
  console.log('='.repeat(70) + '\n');
}

// Execute
auditSanityAddOns().catch((error) => {
  console.error('\n❌ AUDIT FAILED:\n');
  console.error(error);
  process.exit(1);
});
