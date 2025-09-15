'use client';

import * as React from 'react';
import clsx from 'clsx';

/**
 * VariantSelector — FAS theme (Sanity-friendly, no Shopify context)
 *
 * Props:
 *  - options: Array<{ id?: string; name: string; values: string[] }>
 *  - variants?: Array<{ id: string; availableForSale?: boolean; selectedOptions: { name: string; value: string }[] }>
 *  - selected?: Record<string, string>  // current selection, keys are lower-cased option names
 *  - onChange?: (next: Record<string, string>) => void
 *
 * Behavior:
 *  - If `variants` provided, disables combinations that are not availableForSale
 *  - If `onChange` not provided, writes selections to URL params as `opt_<name>=<value>` and resets `page=1`
 *  - Styled to match your chip UI (rounded, primary active state)
 */

export type VariantOption = { id?: string; name: string; values: string[] };
export type VariantShape = {
  id: string;
  availableForSale?: boolean;
  selectedOptions: { name: string; value: string }[];
};

export interface VariantSelectorProps {
  options: VariantOption[];
  variants?: VariantShape[];
  selected?: Record<string, string>;
  onChange?: (next: Record<string, string>) => void;
  className?: string;
}

function normKey(name: string) {
  return (name || '').toLowerCase();
}

function buildCombinations(variants?: VariantShape[]) {
  if (!variants?.length) return [] as Array<Record<string, string | boolean>>;
  return variants.map((v) => {
    const row: Record<string, string | boolean> = {
      id: v.id,
      availableForSale: !!v.availableForSale
    };
    v.selectedOptions.forEach((o) => {
      row[normKey(o.name)] = o.value;
    });
    return row;
  });
}

export default function VariantSelector({
  options,
  variants,
  selected = {},
  onChange,
  className
}: VariantSelectorProps) {
  const combinations = React.useMemo(() => buildCombinations(variants), [variants]);

  const hasNoOptionsOrJustOneOption =
    !options?.length || (options.length === 1 && options[0]?.values?.length === 1);
  if (hasNoOptionsOrJustOneOption) return null;

  function writeURL(next: Record<string, string>) {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(next)) {
      const key = `opt_${normKey(k)}`;
      if (v) url.searchParams.set(key, v);
      else url.searchParams.delete(key);
    }
    url.searchParams.set('page', '1');
    window.location.href = url.toString();
  }

  function handleSelect(key: string, value: string) {
    const k = normKey(key);
    const next = { ...selected, [k]: value };
    if (onChange) onChange(next);
    else writeURL(next);
  }

  function isChoiceAvailable(key: string, value: string) {
    if (!combinations.length) return true; // no data to restrict
    // Merge current state with this tentative choice
    const next = { ...selected, [normKey(key)]: value } as Record<string, string>;
    // keep only keys that exist in options
    const validPairs = Object.entries(next).filter(
      ([k, v]) => !!options.find((o) => normKey(o.name) === k && o.values.includes(v))
    );
    return combinations.some(
      (combo) => validPairs.every(([k, v]) => combo[k] === v) && (combo.availableForSale as boolean)
    );
  }

  const base =
    'px-3 py-1 rounded-full text-sm border transition focus:outline-none focus:ring-2 focus:ring-primary/40';
  const active = 'bg-primary text-accent border-transparent';
  const idle = 'border-white/30 text-white/90 hover:bg-white/80';
  const disabled = 'opacity-50 line-through cursor-not-allowed border-white/20 text-white/80';

  return (
    <div className={clsx('space-y-6', className)}>
      {options.map((option) => {
        const key = normKey(option.name);
        const current = selected[key];
        return (
          <div key={option.id || key}>
            <div className="mb-2 text-sm uppercase tracking-wide fas-label text-muted-foreground">
              {option.name}
            </div>
            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isActive = current === value;
                const available = isChoiceAvailable(key, value);
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={isActive}
                    aria-disabled={!available}
                    disabled={!available}
                    onClick={() => available && handleSelect(key, value)}
                    className={clsx(base, isActive ? active : idle, !available && disabled)}
                    title={`${option.name} ${value}${!available ? ' (Out of Stock)' : ''}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
