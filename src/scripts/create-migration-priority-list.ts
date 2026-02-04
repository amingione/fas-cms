/**
 * CROSS-REFERENCE SCRIPT: Create Migration Priority List
 * 
 * Phase 0, Task 0.3
 * 
 * PURPOSE:
 * Cross-reference Sanity addOns audit with Medusa variants audit.
 * Create a prioritized migration list for Phase 1-4 execution.
 * 
 * INPUTS:
 * - audit-sanity-addons-2026-02-04.csv (from fas-cms-fresh)
 * - audit-medusa-variants-2026-02-04.csv (from fas-medusa)
 * 
 * OUTPUT:
 * - migration-priority-list-YYYY-MM-DD.csv (prioritized products)
 * - Console summary with tier breakdowns
 * 
 * PRIORITY CRITERIA:
 * - Tier 1 (High): 1-2 addOns, high frequency, simple structure
 * - Tier 2 (Medium): 3-4 addOns, moderate complexity
 * - Tier 3 (Low): 5+ addOns, high complexity, high value
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

type SanityProduct = {
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

type MedusaProduct = {
  product_id: string;
  product_title: string;
  product_handle: string;
  status: string;
  variant_count: number;
  has_options: boolean;
  option_names: string;
  sanity_id: string;
};

type MigrationTarget = {
  priority_tier: number;
  sanity_product_id: string;
  sanity_slug: string;
  sanity_title: string;
  medusa_product_id: string;
  medusa_handle: string;
  addon_count: number;
  addon_labels: string;
  addon_value: number;
  complexity_score: number;
  migration_notes: string;
};

/**
 * Parse CSV file into objects
 */
function parseCSV<T>(filePath: string): T[] {
  const content = readFileSync(filePath, 'utf8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj as T;
  });
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Calculate complexity score for prioritization
 */
function calculateComplexityScore(product: SanityProduct): number {
  let score = 0;
  
  // Factor 1: Number of addOns (weighted heavily)
  score += product.addon_count * 10;
  
  // Factor 2: Total value (higher value = higher risk = lower priority)
  score += Math.floor(product.total_addon_value / 1000);
  
  // Factor 3: Product type (service products are simpler)
  if (product.product_type === 'service') {
    score -= 5;
  }
  
  return score;
}

/**
 * Assign priority tier based on complexity
 */
function assignPriorityTier(product: SanityProduct): number {
  const complexity = calculateComplexityScore(product);
  
  // Tier 1 (High Priority): Simple products
  if (product.addon_count <= 2) return 1;
  
  // Tier 2 (Medium Priority): Moderate complexity
  if (product.addon_count <= 4) return 2;
  
  // Tier 3 (Low Priority): Complex products
  return 3;
}

/**
 * Generate migration notes based on product analysis
 */
function generateMigrationNotes(sanityProduct: SanityProduct): string {
  const notes: string[] = [];
  
  // Check for common patterns
  const labels = sanityProduct.addon_labels.toLowerCase();
  
  if (labels.includes('fast lane') || labels.includes('priority build')) {
    notes.push('Standard: Priority Build option');
  }
  
  if (labels.includes('ceramic coating') || labels.includes('powder coating')) {
    notes.push('Standard: Coating option');
  }
  
  if (labels.includes('shipping box')) {
    notes.push('Standard: Shipping Protection option');
  }
  
  if (labels.includes('core exchange') || labels.includes('core')) {
    notes.push('Special: Core Handling option (high value)');
  }
  
  if (labels.includes('porting')) {
    notes.push('Special: Porting option');
  }
  
  if (sanityProduct.product_type === 'service') {
    notes.push('Type: Service product');
  }
  
  if (sanityProduct.addon_count >= 5) {
    notes.push('⚠️ Complex: Manual review recommended');
  }
  
  return notes.join(' | ') || 'Review addOns structure';
}

/**
 * Main cross-reference function
 */
async function createMigrationPriorityList() {
  console.log('\n' + '='.repeat(70));
  console.log('MIGRATION PRIORITY LIST - PHASE 0, TASK 0.3');
  console.log('='.repeat(70) + '\n');

  // Determine file paths
  const sanityCSVPath = join(process.cwd(), 'audit-sanity-addons-2026-02-04.csv');
  const medusaCSVPath = join(process.cwd(), '../fas-medusa/audit-medusa-variants-2026-02-04.csv');
  
  console.log('📂 Loading audit data...\n');
  console.log(`   Sanity CSV: ${sanityCSVPath}`);
  console.log(`   Medusa CSV: ${medusaCSVPath}\n`);

  // Load data
  let sanityProducts: SanityProduct[];
  let medusaProducts: MedusaProduct[];
  
  try {
    sanityProducts = parseCSV<SanityProduct>(sanityCSVPath);
    medusaProducts = parseCSV<MedusaProduct>(medusaCSVPath);
  } catch (error) {
    console.error('❌ Failed to load CSV files:');
    console.error(error);
    console.error('\nMake sure both audit scripts have been run first:');
    console.error('  1. npm run audit:sanity-addons (in fas-cms-fresh)');
    console.error('  2. npm run audit:medusa-variants (in fas-medusa)\n');
    process.exit(1);
  }

  console.log(`✓ Loaded ${sanityProducts.length} Sanity products`);
  console.log(`✓ Loaded ${medusaProducts.length} Medusa products\n`);

  // Create Medusa lookup map (sanity_id -> medusa product)
  const medusaLookup = new Map<string, MedusaProduct>();
  medusaProducts.forEach(mp => {
    if (mp.sanity_id && mp.sanity_id !== 'NO_SANITY_ID') {
      medusaLookup.set(mp.sanity_id, mp);
    }
  });

  console.log(`✓ ${medusaLookup.size} Medusa products have sanity_id mapping\n`);

  // Cross-reference and create migration targets
  const migrationTargets: MigrationTarget[] = [];
  const unmappedProducts: SanityProduct[] = [];

  sanityProducts.forEach(sp => {
    const medusaProduct = medusaLookup.get(sp.product_id);
    
    if (medusaProduct) {
      // Product exists in both systems - add to migration list
      const addonValue = typeof sp.total_addon_value === 'number' 
        ? sp.total_addon_value 
        : parseFloat(String(sp.total_addon_value)) || 0;
      
      migrationTargets.push({
        priority_tier: assignPriorityTier(sp),
        sanity_product_id: sp.product_id,
        sanity_slug: sp.product_slug,
        sanity_title: sp.product_title,
        medusa_product_id: medusaProduct.product_id,
        medusa_handle: medusaProduct.product_handle,
        addon_count: parseInt(String(sp.addon_count), 10),
        addon_labels: sp.addon_labels,
        addon_value: addonValue,
        complexity_score: calculateComplexityScore(sp),
        migration_notes: generateMigrationNotes(sp)
      });
    } else {
      // Product in Sanity but not mapped to Medusa
      unmappedProducts.push(sp);
    }
  });

  // Sort by priority tier, then by complexity (simplest first)
  migrationTargets.sort((a, b) => {
    if (a.priority_tier !== b.priority_tier) {
      return a.priority_tier - b.priority_tier;
    }
    return a.complexity_score - b.complexity_score;
  });

  console.log('🔗 CROSS-REFERENCE RESULTS:\n');
  console.log(`   Products with addOns in Sanity: ${sanityProducts.length}`);
  console.log(`   Products mapped to Medusa: ${migrationTargets.length}`);
  console.log(`   Products NOT mapped to Medusa: ${unmappedProducts.length}\n`);

  if (unmappedProducts.length > 0) {
    console.log('⚠️  UNMAPPED PRODUCTS (have addOns but no Medusa mapping):\n');
    unmappedProducts.slice(0, 5).forEach(up => {
      console.log(`   • ${up.product_title} (${up.product_slug})`);
      console.log(`     ${up.addon_count} addOns: ${up.addon_labels}`);
    });
    if (unmappedProducts.length > 5) {
      console.log(`   ... and ${unmappedProducts.length - 5} more\n`);
    }
    console.log('   Action: These products need Medusa products created first\n');
  }

  // Tier analysis
  const tier1 = migrationTargets.filter(t => t.priority_tier === 1);
  const tier2 = migrationTargets.filter(t => t.priority_tier === 2);
  const tier3 = migrationTargets.filter(t => t.priority_tier === 3);

  console.log('📊 PRIORITY TIER BREAKDOWN:\n');
  console.log(`   TIER 1 (High Priority - Migrate First): ${tier1.length} products`);
  console.log(`      • 1-2 addOns, simple structure`);
  console.log(`      • Estimated time: 1-2 weeks\n`);
  
  console.log(`   TIER 2 (Medium Priority): ${tier2.length} products`);
  console.log(`      • 3-4 addOns, moderate complexity`);
  console.log(`      • Estimated time: 1-2 weeks\n`);
  
  console.log(`   TIER 3 (Low Priority - Migrate Last): ${tier3.length} products`);
  console.log(`      • 5+ addOns, high complexity`);
  console.log(`      • Estimated time: 1-2 weeks\n`);

  // Show top products from each tier
  if (tier1.length > 0) {
    console.log('🥇 TIER 1 EXAMPLES (Top 5):\n');
    tier1.slice(0, 5).forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.sanity_title}`);
      console.log(`      AddOns: ${t.addon_labels}`);
      console.log(`      Value: $${t.addon_value.toFixed(2)}`);
      console.log(`      Notes: ${t.migration_notes}`);
    });
    console.log('');
  }

  if (tier2.length > 0) {
    console.log('🥈 TIER 2 EXAMPLES (Top 3):\n');
    tier2.slice(0, 3).forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.sanity_title}`);
      console.log(`      AddOns: ${t.addon_labels}`);
      console.log(`      Value: $${t.addon_value.toFixed(2)}`);
    });
    console.log('');
  }

  if (tier3.length > 0) {
    console.log('🥉 TIER 3 EXAMPLES (Most Complex):\n');
    tier3.slice(0, 3).forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.sanity_title}`);
      console.log(`      AddOns (${t.addon_count}): ${t.addon_labels.substring(0, 80)}...`);
      console.log(`      Value: $${t.addon_value.toFixed(2)}`);
      console.log(`      ⚠️ Manual review recommended`);
    });
    console.log('');
  }

  // Export migration priority list
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `migration-priority-list-${timestamp}.csv`;

  const csvHeader = 'priority_tier,sanity_product_id,sanity_slug,sanity_title,medusa_product_id,medusa_handle,addon_count,addon_labels,addon_value,complexity_score,migration_notes\n';
  const csvRows = migrationTargets.map(t => [
    t.priority_tier,
    t.sanity_product_id,
    t.sanity_slug,
    `"${t.sanity_title.replace(/"/g, '""')}"`,
    t.medusa_product_id,
    t.medusa_handle,
    t.addon_count,
    `"${t.addon_labels.replace(/"/g, '""')}"`,
    t.addon_value.toFixed(2),
    t.complexity_score,
    `"${t.migration_notes.replace(/"/g, '""')}"`
  ].join(','));

  const csvContent = csvHeader + csvRows.join('\n');

  try {
    writeFileSync(filename, csvContent, 'utf8');
    console.log(`📄 MIGRATION PRIORITY LIST EXPORTED:\n`);
    console.log(`   File: ${filename}`);
    console.log(`   Location: ${process.cwd()}/${filename}`);
    console.log(`   Rows: ${migrationTargets.length}\n`);
  } catch (error) {
    console.error(`❌ Failed to write CSV file: ${error}\n`);
  }

  // Generate summary statistics
  const totalAddonValue = migrationTargets.reduce((sum, t) => sum + t.addon_value, 0);
  const avgAddonsPerProduct = migrationTargets.reduce((sum, t) => sum + t.addon_count, 0) / migrationTargets.length;

  console.log('💰 MIGRATION IMPACT:\n');
  console.log(`   Total products to migrate: ${migrationTargets.length}`);
  console.log(`   Total addOn value: $${totalAddonValue.toFixed(2)}`);
  console.log(`   Average addOns per product: ${avgAddonsPerProduct.toFixed(1)}`);
  console.log(`   Estimated new variants: ${migrationTargets.reduce((sum, t) => sum + Math.pow(2, t.addon_count), 0)}`);
  console.log('');

  console.log('✅ PHASE 0 COMPLETE\n');
  console.log('NEXT STEPS:');
  console.log('   1. Review migration priority list CSV');
  console.log('   2. Validate Tier 1 products (pilot group)');
  console.log('   3. Get stakeholder approval to proceed to Phase 1');
  console.log('   4. DO NOT start Phase 1 until approved');
  console.log('');
  console.log('='.repeat(70) + '\n');
}

// Execute
createMigrationPriorityList().catch((error) => {
  console.error('\n❌ CROSS-REFERENCE FAILED:\n');
  console.error(error);
  process.exit(1);
});
