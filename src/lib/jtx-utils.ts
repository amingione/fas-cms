// src/lib/jtx-utils.ts
import { STYLES_BY_SERIES, DIAMETERS_BY_SERIES, WIDTHS_BY_DIAMETER } from '@/content/jtx/options';
import type { JtxSeries } from '@/content/jtx/options';

export function getStylesForSeries(series: JtxSeries): readonly string[] {
  return STYLES_BY_SERIES[series] ?? [];
}

export function getDiametersForSeries(series: JtxSeries): readonly number[] {
  return (
    DIAMETERS_BY_SERIES[series] ??
    Array.from(new Set(Object.keys(WIDTHS_BY_DIAMETER).map(Number))).sort((a, b) => a - b)
  );
}

export function getWidthsForDiameter(diameter: number): readonly number[] {
  return WIDTHS_BY_DIAMETER[diameter] ?? [];
}
