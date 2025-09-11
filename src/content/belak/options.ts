// Realistic Belak option sets for your forms.
// You can adjust/extend these without touching the form or validator.

export const BELAK_SERIES = ["Series 2", "Series 3"] as const;

export const DIAMETERS = [13, 15, 17, 18] as const;

export const WIDTHS_BY_DIAMETER: Record<number, number[]> = {
  13: [7.5, 8, 9, 10, 11],
  15: [3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], // includes skinny 3.5
  17: [4.5, 6, 7.5, 8, 9, 9.5, 10, 11, 11.5],          // includes skinny 4.5
  18: [6, 8, 9, 9.5, 10, 11, 11.5],
};

export const SKINNY_SIZES = [
  { label: "15x3.5 (Skinny)", diameter: 15, width: 3.5 },
  { label: "17x4.5 (Skinny)", diameter: 17, width: 4.5 },
] as const;

// Additional named size variants by series as seen on Belak's form
export const SERIES_MONO_SIZE_OPTIONS: Record<string, { label: string; diameter: number; width: number }[]> = {
  'Series 2': [
    { label: '15x3.5 (Mono Series 2)', diameter: 15, width: 3.5 },
    { label: '15x3.5 (Mono Series 2 Twisted)', diameter: 15, width: 3.5 },
  ],
  'Series 3': [
    { label: '17x4.5 (Mono Series 3)', diameter: 17, width: 4.5 },
  ]
};

export function buildGeneralSizeLabels(diameter: number): { label: string; diameter: number; width: number }[] {
  const widths = WIDTHS_BY_DIAMETER[diameter] ?? [];
  return widths.map((w) => ({ label: `${diameter}x${w}`, diameter, width: w }));
}

export const BOLT_PATTERNS = [
  "4x100", "4x108", "4x114.3",
  "5x100", "5x112", "5x114.3", "5x120", "5x4.50", "5x4.75",
  "6x4.5"
] as const;

export const BACKSPACING_COMMON = [
  `2.25" (common skinny)`,
  "S550 Mustang",
  "R35 GT-R",
  "Custom / specify exact BS (in)"
] as const;

export const FINISHES = [
  "Two-Tone Black/Machined (standard)",
  "Raw/Bare (for custom coat)",
  "Custom Powder Coat - Stage 1 (one solid color)",
  "Custom Powder Coat - Stage 2 (two-stage/complex)"
] as const;

export const BEADLOCK = ["None", "Single Beadlock", "Double Beadlock"] as const;

export const HARDWARE = ["Standard ARP", "Upgraded ARP (color)", "Black hardware", "Polished hardware"] as const;

export const CENTER_CAP = ["Standard", "Black", "Polished", "Color-matched"] as const;

// Visual style variants as seen on Belak's site
export const STYLES = [
  'Mono Series 2 - Twisted',
  'Standard',
  'Series 2',
  'Series 2 - Directional',
  'Series 3'
] as const;

export const USE_NOTES = [
  "Track use only",
  "Verify brake clearance (big-brake kits may require templates/spacers)",
  "Metal valve stems required (included on many skinnies)"
];

// Optional filtering helpers (extend as you learn exact Belak matrices)
export const BOLT_PATTERNS_BY_DIAMETER: Record<number, string[]> = {
  15: [
    "4x100", "4x108", "4x114.3",
    "5x100", "5x112", "5x114.3", "5x120",
  ],
  17: [
    "5x100", "5x112", "5x114.3", "5x120",
  ],
};

export function getBoltPatterns(diameter: number): string[] {
  return BOLT_PATTERNS_BY_DIAMETER[diameter] ?? Array.from(BOLT_PATTERNS);
}

export function getBackspacings(diameter: number, isSkinnies: boolean): string[] {
  if (isSkinnies) return [BACKSPACING_COMMON[0], BACKSPACING_COMMON[3]] as unknown as string[];
  return Array.from(BACKSPACING_COMMON) as unknown as string[];
}
