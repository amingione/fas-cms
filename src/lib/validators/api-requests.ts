import { z } from 'zod';

export const saveOrderCartItemSchema = z
  .object({
    id: z.string(),
    sku: z.string().optional(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    categories: z.array(z.string()).optional(),
    image: z.string().optional(),
    productUrl: z.string().optional(),
    productSlug: z.string().optional(),
    metadata: z.record(z.unknown()).optional()
  })
  .passthrough();

export const saveOrderRequestSchema = z.object({
  sessionId: z.string().min(1),
  cart: z.array(saveOrderCartItemSchema)
});

export const vendorCreateOrderSchema = z.object({
  cart: z.array(saveOrderCartItemSchema)
});

export const wheelQuoteUpdateSchema = z.object({
  id: z.string().min(3),
  status: z.enum(['new', 'contacted', 'quoted', 'won', 'lost'])
});

export const reviewSubmitRequestSchema = z
  .object({
    productId: z.string().min(1),
    customerId: z.string().min(1),
    rating: z.number().optional(),
    title: z.string().optional(),
    content: z.string().optional(),
    images: z.array(z.string()).optional(),
    pros: z.array(z.string()).optional(),
    cons: z.array(z.string()).optional(),
    customerName: z.string().optional(),
    customerEmail: z.string().optional()
  })
  .passthrough();

export const reviewVoteRequestSchema = z.object({
  voteType: z.enum(['upvote', 'downvote'])
});

export const cartAddSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  sessionId: z.string().min(1)
});

export const saveQuoteSchema = z.object({
  vehicleModel: z.string().min(1),
  modifications: z.array(z.string()),
  horsepower: z.number(),
  price: z.number()
});

export const checkoutCartItemSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().optional(),
    name: z.string().min(1),
    price: z.number(),
    quantity: z.number(),
    image: z.string().optional(),
    productUrl: z.string().optional(),
    installOnly: z.boolean().optional(),
    shippingClass: z.string().optional(),
    options: z.record(z.string()).optional(),
    selections: z.union([z.array(z.record(z.unknown())), z.record(z.unknown())]).optional(),
    basePrice: z.number().optional(),
    extra: z.number().optional(),
    upgrades: z.unknown().optional(),
    addOns: z.unknown().optional(),
    signature: z.string().optional()
  })
  .passthrough();

export const checkoutShippingDestinationSchema = z
  .object({
    addressLine1: z.string().min(1),
    addressLine2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    postalCode: z.string().min(1),
    country: z.string().min(2)
  })
  .passthrough();

export const checkoutSelectedRateSchema = z
  .object({
    id: z.string().min(1),
    provider: z.string().min(1),
    carrier: z.string().min(1),
    service: z.string().min(1),
    amountCents: z.number().int().nonnegative(),
    currency: z.string().min(1),
    estDays: z.number().optional()
  })
  .passthrough();

export const checkoutRequestSchema = z
  .object({
    cart: z.array(checkoutCartItemSchema).min(1),
    marketingOptIn: z.boolean().optional(),
    shippingAddress: checkoutShippingDestinationSchema,
    selectedRate: checkoutSelectedRateSchema,
    metadata: z.record(z.unknown()).optional(),
    utmSource: z.string().optional(),
    utm_source: z.string().optional(),
    utmMedium: z.string().optional(),
    utm_medium: z.string().optional(),
    utmCampaign: z.string().optional(),
    utm_campaign: z.string().optional(),
    utmTerm: z.string().optional(),
    utm_term: z.string().optional(),
    utmContent: z.string().optional(),
    utm_content: z.string().optional()
  })
  .passthrough();

export const orderUpdateSchema = z
  .object({
    shippingAddress: z.record(z.unknown()).optional(),
    billingAddress: z.record(z.unknown()).optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    notes: z.string().optional()
  })
  .passthrough();

export const adminOrderPatchSchema = z.record(z.unknown());

export const vendorNotificationsUpdateSchema = z
  .object({
    ids: z.array(z.string()).optional()
  })
  .passthrough();

export const vendorReturnCreateSchema = z
  .object({
    orderId: z.string().optional(),
    reason: z.string().optional(),
    description: z.string().optional(),
    items: z.array(z.record(z.unknown())).optional()
  })
  .passthrough();

export const vendorPasswordResetRequestSchema = z.object({
  email: z.string().email()
});

export const vendorPasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1)
});

export const customerPasswordResetRequestSchema = z.object({
  email: z.string().email()
});

export const customerPasswordResetConfirmSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1)
});

export const vendorAuthSetupSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
  vendorId: z.string().optional()
});

export const vendorInvoicePaySchema = z.object({
  amount: z.union([z.number(), z.string()]),
  paymentMethodId: z.string().min(1)
});

export const vendorSettingsProfileSchema = z
  .object({
    name: z.string().optional(),
    companyName: z.string().optional(),
    contactEmail: z.string().optional()
  })
  .passthrough();

export const vendorSettingsAddressCreateSchema = z.record(z.unknown());

export const vendorSettingsAddressUpdateSchema = z.object({
  index: z.number(),
  address: z.record(z.unknown())
});

export const vendorSettingsAddressDeleteSchema = z.object({
  index: z.number()
});

export const vendorSettingsNotificationsSchema = z.record(z.unknown());

export const vendorSettingsPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1)
});

export const vendorMessageCreateSchema = z
  .object({
    subject: z.string().optional(),
    message: z.string().optional(),
    priority: z.string().optional(),
    category: z.string().optional(),
    author: z.string().optional()
  })
  .passthrough();

export const vendorMessageReplySchema = z
  .object({
    message: z.string().optional(),
    author: z.string().optional()
  })
  .passthrough();

export const vendorInviteSchema = z
  .object({
    vendorId: z.string().min(1),
    invitedBy: z.string().optional()
  })
  .passthrough();

export const authSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  name: z.string().optional()
});

export const authLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const vendorLoginSchema = authLoginSchema;

export const authForgotPasswordSchema = z.object({
  email: z.string().email()
});

export const authResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1)
});

export const customerGetSchema = z.object({
  email: z.string().email()
});

export const customerUpdateSchema = z
  .object({
    sub: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.union([z.string(), z.record(z.unknown())]).optional(),
    billingAddress: z.record(z.unknown()).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    emailOptIn: z.boolean().optional(),
    textOptIn: z.boolean().optional(),
    marketingOptIn: z.boolean().optional()
  })
  .passthrough();

export const promotionValidateSchema = z.object({
  code: z.string().min(1)
});

export const promotionCartItemSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().optional(),
    quantity: z.number().optional(),
    price: z.number().optional()
  })
  .passthrough();

export const promotionApplySchema = z
  .object({
    promotionCode: z.string().optional(),
    code: z.string().optional(),
    customerId: z.string().optional(),
    cart: z.array(promotionCartItemSchema)
  })
  .passthrough();

export const attributionTrackSchema = z
  .object({
    orderId: z.string().min(1),
    sessionId: z.string().optional(),
    utmParams: z
      .object({
        utm_source: z.string().optional(),
        utm_medium: z.string().optional(),
        utm_campaign: z.string().optional(),
        utm_term: z.string().optional(),
        utm_content: z.string().optional()
      })
      .optional()
  })
  .passthrough();

export const buildQuoteItemSchema = z
  .object({
    name: z.string().optional(),
    price: z.number().optional(),
    qty: z.number().optional()
  })
  .passthrough();

export const buildQuoteSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    vehicle: z.string().min(1),
    items: z.array(buildQuoteItemSchema).min(1),
    subtotal: z.number().optional(),
    notes: z.string().optional()
  })
  .passthrough();

export const contactRequestSchema = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    vehicle: z.string().optional(),
    topic: z.string().optional(),
    message: z.string().optional()
  })
  .passthrough();

export const formSubmissionSchema = z.record(z.unknown());

export const generateBlogSchema = z.record(z.unknown());

export const vendorApplicationSchema = z.record(z.unknown());

export const netlifySubmissionSchema = z
  .object({
    payload: z
      .object({
        form_name: z.string().optional(),
        formName: z.string().optional(),
        data: z.record(z.unknown()).optional()
      })
      .optional()
  })
  .passthrough();

export const trackingUpdateSchema = z
  .object({
    result: z.record(z.unknown()).optional()
  })
  .passthrough();
