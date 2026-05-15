import { z } from 'zod';

// ========== PRODUCT ==========

export const productSchema = z.object({
  name: z.string().min(2, 'Nome richiesto'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Solo lowercase, numeri e trattini'),
  sku: z.string().min(2, 'SKU richiesto'),
  description_short: z.string().optional(),
  description_long: z.string().optional(),
  technical_description: z.string().optional(),
  price: z.coerce.number().positive('Prezzo deve essere > 0'),
  compare_at_price: z.coerce.number().positive().optional().nullable(),
  composition: z.string().optional(),
  dimensions: z.string().optional(),
  care_instructions: z.string().optional(),
  origin: z.string().default('Como, Italy'),
  status: z.enum(['draft', 'published', 'archived']),
  is_featured: z.boolean().default(false),
  is_bestseller: z.boolean().default(false),
  is_limited_edition: z.boolean().default(false),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  collection_ids: z.array(z.string().uuid()).optional(),
  category_ids: z.array(z.string().uuid()).optional(),
  material_ids: z.array(z.string().uuid()).optional(),
  color_ids: z.array(z.string().uuid()).optional(),
  initial_stock: z.coerce.number().int().nonnegative().default(0),
});

// ========== ORDER ==========

export const createOrderSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerEmail: z.string().email(),
  shippingAddressId: z.string().uuid(),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().optional(),
      quantity: z.number().int().positive(),
    })
  ).min(1, 'Carrello vuoto'),
  shippingMethod: z.string(),
  couponCode: z.string().optional(),
});

// ========== CUSTOMER ADDRESS ==========

export const customerAddressSchema = z.object({
  type: z.enum(['shipping', 'billing', 'both']),
  full_name: z.string().min(2),
  phone: z.string().min(8),
  street_address: z.string().min(3),
  city: z.string().min(2),
  postal_code: z.string().min(4),
  country: z.string().length(2).default('IT'),
  is_default: z.boolean().default(false),
});

// ========== COUPON ==========

export const couponSchema = z.object({
  code: z.string().min(3).regex(/^[A-Z0-9-]+$/, 'Solo maiuscole, numeri, trattini'),
  discount_type: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  discount_value: z.coerce.number().nonnegative(),
  valid_from: z.string(),
  valid_until: z.string(),
  max_uses: z.coerce.number().int().positive().optional().nullable(),
  max_uses_per_customer: z.coerce.number().int().positive().optional().nullable(),
  minimum_order_amount: z.coerce.number().positive().optional().nullable(),
  is_active: z.boolean().default(true),
}).refine(
  (data) => new Date(data.valid_until) > new Date(data.valid_from),
  { message: 'Valid until deve essere dopo valid from', path: ['valid_until'] }
);

// ========== NEWSLETTER ==========

export const newsletterSubscribeSchema = z.object({
  email: z.string().email('Email non valida'),
  full_name: z.string().optional(),
  consent_gdpr: z.boolean().refine((v) => v === true, 'Consenso GDPR richiesto'),
  source: z.string().optional(),
});

// ========== CONTACT ==========

export const contactFormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  subject: z.string().min(3),
  message: z.string().min(10),
  consent_privacy: z.boolean().refine((v) => v === true, 'Consenso privacy richiesto'),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type NewsletterInput = z.infer<typeof newsletterSubscribeSchema>;
export type ContactInput = z.infer<typeof contactFormSchema>;
