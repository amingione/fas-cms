import { z } from 'zod';

export const stripeCheckoutSessionSchema = z
  .object({
    id: z.string(),
    payment_status: z.string(),
    payment_intent: z
      .union([z.string(), z.object({ id: z.string() })])
      .optional(),
    customer_details: z
      .object({
        email: z.string().email().nullable(),
        name: z.string().nullable(),
        phone: z.string().nullable(),
        address: z
          .object({
            line1: z.string().nullable(),
            line2: z.string().nullable(),
            city: z.string().nullable(),
            state: z.string().nullable(),
            postal_code: z.string().nullable(),
            country: z.string().nullable()
          })
          .nullable()
      })
      .nullable(),
    amount_total: z.number().nullable(),
    amount_subtotal: z.number().nullable(),
    currency: z.string().optional(),
    created: z.number().optional(),
    metadata: z.record(z.unknown()).optional(),
    total_details: z
      .object({
        amount_tax: z.number().optional().nullable(),
        amount_shipping: z.number().optional().nullable(),
        amount_discount: z.number().optional().nullable()
      })
      .optional()
  })
  .passthrough();

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

export const stripeWebhookEventSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    data: z.object({
      object: z.record(z.unknown())
    })
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
