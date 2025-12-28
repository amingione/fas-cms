import { z } from 'zod';

export const sanityOrderCartItemSchema = z
  .object({
    id: z.string(),
    sku: z.string().optional(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().int().positive(),
    categories: z.array(z.string()).optional(),
    image: z.string().optional(),
    productUrl: z.string().optional(),
    productSlug: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .passthrough();

export const sanityOrderSchema = z
  .object({
    _id: z.string(),
    _type: z.literal('order'),
    orderNumber: z.string().optional(),
    stripeSessionId: z.string(),
    paymentIntentId: z.string().optional(),
    status: z.enum(['pending', 'paid', 'unpaid', 'failed', 'refunded', 'cancelled']),
    cart: z.array(sanityOrderCartItemSchema),
    totalAmount: z.number(),
    customerEmail: z.string().email(),
    customerName: z.string().optional(),
    customerRef: z
      .object({
        _type: z.literal('reference'),
        _ref: z.string()
      })
      .optional(),
    createdAt: z.string()
  })
  .passthrough();

export const sanityCustomerSchema = z
  .object({
    _id: z.string(),
    _type: z.literal('customer'),
    email: z.string().email(),
    name: z.string().optional(),
    phone: z.string().optional()
  })
  .passthrough();

export const sanityWheelQuoteSchema = z
  .object({
    _id: z.string(),
    _type: z.literal('wheelQuote'),
    series: z.string(),
    fullname: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    vehicleYear: z.string().optional(),
    vehicleMake: z.string().optional(),
    vehicleModel: z.string().optional()
  })
  .passthrough();

export const sanityQuoteRequestSchema = z
  .object({
    _id: z.string(),
    _type: z.literal('quoteRequest'),
    wheelQuotes: z
      .array(
        z.object({
          _type: z.literal('reference'),
          _ref: z.string()
        })
      )
      .optional(),
    customerName: z.string(),
    customerEmail: z.string().email(),
    customerPhone: z.string().optional()
  })
  .passthrough();

export const sanityQuoteSchema = z
  .object({
    _id: z.string(),
    _type: z.literal('quote'),
    stripeInvoiceId: z.string().optional(),
    status: z.string().optional()
  })
  .passthrough();

export const sanityProductSchema = z
  .object({
    _id: z.string(),
    _type: z.literal('product'),
    title: z.string().optional(),
    sku: z.string().optional()
  })
  .passthrough();
