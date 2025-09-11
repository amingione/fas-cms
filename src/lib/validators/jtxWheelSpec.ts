import { z } from 'zod';
import {
  JTX_SERIES,
  ALL_DIAMETERS,
  WIDTHS_BY_DIAMETER,
  BOLT_PATTERNS,
  OFFSETS,
  FINISHES,
  STYLES_BY_SERIES,
  DIAMETERS_BY_SERIES,
  OFFSETS_BY_SIZE
} from '../../content/jtx/options';

export const jtxWheelQuoteSchema = z
  .object({
    series: z.enum(JTX_SERIES),
    pageContext: z.string().optional(),

    // contact
    fullname: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),

    // vehicle (optional)
    vehicleYear: z.string().optional(),
    vehicleMake: z.string().optional(),
    vehicleModel: z.string().optional(),

    // selection
    // selected wheel style/model within a series
    style: z.string().min(1, 'Select a wheel style'),
    diameter: z.coerce
      .number()
      .refine((v) => (ALL_DIAMETERS as readonly number[]).includes(v), 'Invalid diameter'),
    width: z.coerce
      .number()
      .refine(
        (v) => Object.values(WIDTHS_BY_DIAMETER).some((arr) => arr.includes(v)),
        'Invalid width'
      ),
    boltPattern: z.string().min(1),
    offset: z.coerce.number().int(),
    finish: z.string().min(1),
    color: z.string().optional(),

    qty: z.coerce.number().int().min(1).max(4).default(4),
    notes: z.string().max(2000).optional()
  })
  .superRefine((data, ctx) => {
    // Validate style belongs to selected series
    const allowedStyles = STYLES_BY_SERIES[data.series] ?? [];
    if (data.style && !allowedStyles.includes(data.style)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['style'],
        message: 'Selected style is not available for the chosen series.'
      });
    }

    // Validate diameter is allowed for selected series
    const seriesDiameters =
      DIAMETERS_BY_SERIES[data.series] ?? (ALL_DIAMETERS as readonly number[]);
    if (data.diameter && !seriesDiameters.includes(data.diameter)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['diameter'],
        message: 'Selected diameter is not available for the chosen series.'
      });
    }

    // Validate width belongs to selected diameter
    const widths = WIDTHS_BY_DIAMETER[data.diameter] ?? [];
    if (data.width && !widths.includes(data.width)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['width'],
        message: 'Selected width is not available for the chosen diameter.'
      });
    }

    // Beadlock-specific offset numeric range enforcement
    if (data.series === 'Beadlock Series') {
      const key = `${data.diameter}x${data.width}`;
      const range = OFFSETS_BY_SIZE[key as keyof typeof OFFSETS_BY_SIZE];
      if (range) {
        if (typeof data.offset !== 'number' || Number.isNaN(data.offset)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['offset'],
            message: 'Offset must be a number for Beadlock sizes.'
          });
        } else if (data.offset < range.min || data.offset > range.max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['offset'],
            message: `Offset must be between ${range.min} and ${range.max} for ${key}.`
          });
        }
      }
    }

    // Validate bolt pattern, offset, finish against available lists (if defined)
    if (
      Array.isArray(BOLT_PATTERNS) &&
      BOLT_PATTERNS.length &&
      !BOLT_PATTERNS.includes(data.boltPattern)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['boltPattern'],
        message: 'Selected bolt pattern is not available.'
      });
    }

    if (Array.isArray(OFFSETS) && OFFSETS.length && !OFFSETS.includes(String(data.offset))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['offset'],
        message: 'Selected offset is not available.'
      });
    }

    if (Array.isArray(FINISHES) && FINISHES.length && !FINISHES.includes(data.finish)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['finish'],
        message: 'Selected finish is not available.'
      });
    }
  });

export type JtxWheelQuotePayload = z.infer<typeof jtxWheelQuoteSchema>;
