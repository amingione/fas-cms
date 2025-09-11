// src/content/jtx/options.ts
export const JTX_SERIES = [
  // Keep series labels exactly as they appear in your UI
  'Single Series',
  'Phantom Series',
  'Concave Series',
  'Rock Ring Series',
  'Retro Series',
  '2-Piece Series',
  'Dually Series',
  'UTV Series',
  'Monoforged Series',
  'Beadlock Series'
] as const;

export type JtxSeries = (typeof JTX_SERIES)[number];

// Map each series to its styles/models (ALL CAPS usually on JTX)
export const STYLES_BY_SERIES: Record<JtxSeries, readonly string[]> = {
  'Single Series': ['CENTERFIRE', 'CAPO'],
  'Phantom Series': ['JUDGE', 'INTREPID', 'PRODIGY'],
  'Concave Series': [
    'CENTERFIRE',
    'CAPO',
    'BALLISTIC',
    'RECON',
    'CHAMBER',
    'GRIP',
    'CARBINE',
    'DOUBLE STACK',
    'SAVAGE',
    'TRIGGER',
    'SILENCER',
    'ZONE',
    'TEFLON',
    'HAMMER'
  ],
  'Rock Ring Series': [
    'CENTERFIRE',
    'CAPO',
    'BALLISTIC',
    'RECON',
    'CHAMBER',
    'GRIP',
    'SAVAGE',
    'TRIGGER',
    'SILENCER',
    'ZONE'
  ],
  'Retro Series': ['RT-101', 'RT-102', 'RT-103', 'RT-104', 'RT-105', 'RT-106'],
  '2-Piece Series': ['STREET', 'RETRO', 'BABY BILLETS'],
  'Dually Series': ['COMBAT', 'CENTERFIRE', 'CAPO', 'SILENCER', 'FLIGHT', 'CANNON'],
  'UTV Series': ['CENTERFIRE', 'LOTUS', 'DAO', 'WICKED', 'TURBO', 'REAPER'],
  'Monoforged Series': ['ICON', 'M-202', 'M-203', 'PIKE'],
  'Beadlock Series': ['BD-202']
} as const;

// Optional: if diameters are constrained by series, wire that here.
// If all series share the same list, export a DIAMETERS array instead.
export const DIAMETERS_BY_SERIES: Partial<Record<JtxSeries, readonly number[]>> = {
  'Single Series': [22, 24, 26, 28, 30],
  'Phantom Series': [22, 24, 26, 28, 30],
  'Concave Series': [22, 24, 26, 28, 30],
  'Rock Ring Series': [22, 24, 26, 28, 30],
  'Retro Series': [20, 22, 24, 26, 28, 30],
  '2-Piece Series': [20, 22, 24, 26, 28, 30],
  'Dually Series': [22, 24, 26, 28, 30],
  'UTV Series': [24],
  'Monoforged Series': [20, 21, 22, 24, 26, 28],
  'Beadlock Series': [17, 18, 20]
};

export const ALL_DIAMETERS = [20, 21, 22, 24, 26, 28, 30] as const;

// Widths vary based on diameter. Keep everything as numbers.
export const WIDTHS_BY_DIAMETER: Record<number, readonly number[]> = {
  17: [9],
  18: [9],
  20: [8, 9, 9.5, 10, 10.5, 12, 14],
  21: [12, 12.5, 13],
  22: [8, 9, 9.5, 10, 10.5, 12, 14],
  24: [8, 9, 9.5, 10, 12, 14, 16],
  26: [8, 9, 10, 12, 14, 16],
  28: [8, 9, 10, 12, 14, 16],
  30: [8, 9, 10, 12, 14]
};

// Bolt patterns – keep strings like '5x114.3', '8x170', etc.
export const BOLT_PATTERNS = [
  '5x114.3',
  '5x127',
  '5x120',
  '6x135',
  '6x139.7',
  '8x170',
  '8x180'
] as const;

// NOTE: Using open numeric input for offset in the form until we finalize a discrete steps list.
// Offsets – JTX often offers broad ranges (e.g., -76 to +44). If you want discrete steps, list them.
// If you accept any integer in a range at order time, keep the enum broad and validate as a number elsewhere.
export const OFFSETS = [
  '-76',
  '-44',
  '-24',
  '-12',
  '0',
  '+12',
  '+24',
  '+44'
] as const;

// Optional: per-size offset ranges (derived from Beadlock section in JTX PDF)
// Use when series === 'Beadlock Series' to constrain numeric input
export const OFFSETS_BY_SIZE: Record<string, { min: number; max: number }> = {
  '17x9': { min: -38, max: 13 },
  '18x9': { min: -13, max: 13 },
  '20x9': { min: -13, max: 13 }
};

// Finishes – constrain to what you actually sell (e.g., Brushed, Polished, Powder: Gloss Black, etc.)
export const FINISHES = [
  'Polished',
  'Brushed',
  'Gloss Black',
  'Satin Black',
  'Two-Tone',
  'Custom Powder'
] as const;

// Helper: build size labels for a given diameter
export function buildSizeLabels(diameter: number) {
  const widths = WIDTHS_BY_DIAMETER[diameter] || [];
  return widths.map((w) => ({ label: `${diameter}x${w}` as string, diameter, width: w }));
}
