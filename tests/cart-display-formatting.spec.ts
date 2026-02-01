import { describe, expect, it } from 'vitest';
import { formatOptionSummary } from '../src/lib/cart/format-option-summary';
import { extractAddOns } from '../src/lib/cart/extract-add-ons';

describe('cart display formatting', () => {
  it('omits upgrade/add-on values from the option summary when requested', () => {
    const optionSummary = formatOptionSummary({
      options: {
        year: '2020-2022',
        filter: 'Cotton Cleanable',
        upgrade1: 'Powder Coating',
        addOn2: 'Coolant Line Kit',
        internalId: '343r2534f24gvt2bhello'
      },
      selectedUpgrades: ['Powder Coating', 'Coolant Line Kit', 'Powder Coating, Coolant Line Kit'],
      upgrades: ['Powder Coating'],
      includeUpgrades: false,
      includeUpgradeKeys: false
    });

    expect(optionSummary).toBe('2020-2022 • Cotton Cleanable');
  });

  it('deduplicates add-on combo strings into individual add-ons when possible', () => {
    const addOns = extractAddOns({
      upgrades: ['Powder Coating, Coolant Line Kit'],
      options: {
        upgrade1: { label: 'Powder Coating', price: 400 },
        upgrade2: { label: 'Coolant Line Kit', price: 150 }
      }
    });

    expect(addOns).toEqual([
      { label: 'Powder Coating', price: 400 },
      { label: 'Coolant Line Kit', price: 150 }
    ]);
  });
});

