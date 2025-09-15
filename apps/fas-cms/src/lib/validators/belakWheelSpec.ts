import { z } from 'zod';
import {
  BELAK_SERIES,
  BOLT_PATTERNS,
  FINISHES,
  BEADLOCK,
  HARDWARE,
  CENTER_CAP,
  STYLES
} from '../../content/belak/options';

export const wheelQuoteSchema = z
  .object({
    // page context
    series: z.enum(BELAK_SERIES),
    pageContext: z.string().optional(), // e.g., "wheels", "skinnies", "series2", "series3"
    fullname: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(7).optional(),
    vehicleYear: z.string().optional(),
    vehicleMake: z.string().optional(),
    vehicleModel: z.string().optional(),

    // wheel selection
    diameter: z.coerce
      .number()
      .int()
      .refine((v) => [13, 15, 17, 18].includes(v), 'Invalid diameter'),
    width: z.coerce.number().refine((v) => v > 0),
    boltPattern: z.enum(BOLT_PATTERNS),
    backspacing: z.string().min(2),
    finish: z.enum(FINISHES),
    beadlock: z.enum(BEADLOCK),
    centerCap: z.enum(CENTER_CAP),
    hardware: z.enum(HARDWARE),
    style: z.enum(STYLES).optional(),
    // style: z.enum(STYLES).optional(), // Removed due to missing export
    // per-axle quantities
    qtyFront: z.coerce.number().int().min(0).max(2).default(2),
    qtyRear: z.coerce.number().int().min(0).max(2).default(2),

    // tires / clearance
    tireSizeFront: z.string().optional(),
    tireSizeRear: z.string().optional(),
    brakeClearanceNotes: z.string().optional(),

    // extras / comments
    notes: z.string().max(2000).optional(),
    attachmentAssetIds: z.array(z.string()).optional(),
    agreeTrackUseOnly: z.boolean().refine((v) => v === true, 'Required')
  })
  .strict();

export type WheelQuotePayload = z.infer<typeof wheelQuoteSchema>;
