import { z } from 'zod';

export const stripePaymentIntentSchema = z
  .object({
    id: z.string(),
    status: z.string(),
    charges: z
      .object({
        data: z.array(
          z
            .object({
              id: z.string(),
              receipt_url: z.string().optional(),
              payment_method_details: z
                .object({
                  card: z
                    .object({
                      brand: z.string().optional(),
                      last4: z.string().optional()
                    })
                    .optional()
                })
                .optional()
            })
            .passthrough()
        )
      })
      .optional()
  })
  .passthrough();

export const stripeLineItemSchema = z
  .object({
    id: z.string().optional(),
    description: z.string().optional(),
    quantity: z.number().optional().nullable(),
    amount_total: z.number().optional().nullable(),
    metadata: z.record(z.unknown()).optional()
  })
  .passthrough();

export const stripeLineItemsSchema = z
  .object({
    data: z.array(stripeLineItemSchema)
  })
  .passthrough();

export const stripeChargeSchema = z
  .object({
    id: z.string(),
    payment_intent: z
      .union([z.string(), z.object({ id: z.string() })])
      .optional()
  })
  .passthrough();

export const stripeInvoiceSchema = z
  .object({
    id: z.string(),
    number: z.string().optional().nullable(),
    hosted_invoice_url: z.string().optional().nullable(),
    total: z.number().optional().nullable()
  })
  .passthrough();
