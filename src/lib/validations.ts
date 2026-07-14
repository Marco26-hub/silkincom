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

// ========== B2B LEADS ==========

export const leadDiscoverySchema = z.object({
  urls: z.array(z.string().trim().min(1)).min(1, 'Inserisci almeno un URL'),
  industry: z.string().trim().optional().default('hospitality'),
  notes: z.string().trim().max(500).optional().default(''),
});

export const leadSearchSchema = z.object({
  query: z.string().trim().min(3, 'Inserisci una ricerca valida'),
  location: z.string().trim().max(120).optional().default('Italia'),
  industry: z.string().trim().optional().default('hospitality'),
  notes: z.string().trim().max(500).optional().default(''),
  segmentIds: z
    .array(z.string().trim().min(1).max(60))
    .max(6, 'Seleziona massimo 6 tipologie')
    .optional()
    .default([]),
  maxResults: z.coerce.number().int().min(1).max(10).optional().default(6),
});

export const leadCreateSchema = z.object({
  company_name: z.string().trim().min(2, 'Nome azienda richiesto'),
  website_url: z.string().trim().url('URL non valido'),
  industry: z.string().trim().optional().default('hospitality'),
  city: z.string().trim().optional().nullable(),
  country: z.string().trim().length(2).optional().default('IT'),
  contact_name: z.string().trim().optional().nullable(),
  contact_role: z.string().trim().optional().nullable(),
  contact_email: z.string().trim().email('Email non valida').optional().nullable(),
  contact_phone: z.string().trim().optional().nullable(),
  source_url: z.string().trim().url('URL fonte non valido').optional().nullable(),
  public_contact_page: z.string().trim().url('URL pagina contatti non valido').optional().nullable(),
  notes: z.string().trim().max(1000).optional().default(''),
});

export const leadPatchSchema = z.object({
  company_name: z.string().trim().min(2).optional(),
  website_url: z.string().trim().url().optional(),
  industry: z.string().trim().optional(),
  city: z.string().trim().nullable().optional(),
  country: z.string().trim().length(2).nullable().optional(),
  contact_name: z.string().trim().nullable().optional(),
  contact_role: z.string().trim().nullable().optional(),
  contact_email: z.string().trim().email().nullable().optional(),
  contact_phone: z.string().trim().nullable().optional(),
  source_url: z.string().trim().url().nullable().optional(),
  public_contact_page: z.string().trim().url().nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
  status: z.enum(['new', 'scanned', 'qualified', 'contacted', 'replied', 'do_not_contact']).optional(),
  score: z.coerce.number().int().min(0).max(100).optional(),
  do_not_contact: z.boolean().optional(),
});

export const leadOutreachPreviewSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1, 'Seleziona almeno un lead'),
  focus: z.enum([
    'hospitality',
    'bed_breakfast',
    'hotel_boutique',
    'resort_beach_club',
    'spa_wellness',
    'wedding_events',
    'corporate_gifting',
    'concept_store',
    'museum_bookshop',
    'yacht_golf_club',
    'personal_shopper',
    'interior_architect',
    'tour_operator_luxury',
    'retail',
    'gifting',
    'wholesale',
  ]).default('hospitality'),
  notes: z.string().trim().max(1000).optional().default(''),
  productImageOverrides: z
    .record(z.string().trim().min(1), z.string().trim().url())
    .optional()
    .default({}),
});

export const leadOutreachSchema = leadOutreachPreviewSchema.extend({
  previewConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Apri e conferma l’anteprima prima dell’invio' }),
  }),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type CouponInput = z.infer<typeof couponSchema>;
export type NewsletterInput = z.infer<typeof newsletterSubscribeSchema>;
export type ContactInput = z.infer<typeof contactFormSchema>;
export type LeadDiscoveryInput = z.infer<typeof leadDiscoverySchema>;
export type LeadSearchInput = z.infer<typeof leadSearchSchema>;
export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadPatchInput = z.infer<typeof leadPatchSchema>;
export type LeadOutreachPreviewInput = z.infer<typeof leadOutreachPreviewSchema>;
export type LeadOutreachInput = z.infer<typeof leadOutreachSchema>;
