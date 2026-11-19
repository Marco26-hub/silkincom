import { z } from "zod";
import { tripPayloadSchema } from "@/lib/experience-trips";
import {
  EXPERIENCES,
  BOAT_PACKAGES,
  LOGISTICS,
} from "@/data/experience-content";
export const experienceLabels: Record<string, string> = Object.fromEntries([
  ...EXPERIENCES.map((x) => [`activity:${x.id}`, x.title]),
  ...BOAT_PACKAGES.map((x) => [`boat:${x.id}`, x.title]),
  ...LOGISTICS.map((x) => [`service:${x.id}`, x.title]),
]);
export const internalLakes = [
  "Como",
  "Maggiore",
  "Entrambi",
  "Milano",
  "Da definire",
] as const;
export const supplierStatuses = {
  prospect: "Da contattare",
  contacted: "Contattato",
  confirmed: "Accordo confermato",
  inactive: "Non attivo",
} as const;
export const requestStatuses = {
  new: "Nuova",
  in_progress: "In lavorazione",
  resolved: "Gestita",
} as const;
export const customExperienceService = "custom";
const timestamp = z.string().datetime({ offset: true });
const cents = z.number().int().min(0).max(100000000);
const base = {
  id: z.string().uuid(),
  created_at: timestamp,
  updated_at: timestamp,
};
export const supplierInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    lake: z.enum(internalLakes),
    contact_name: z.string().trim().max(160),
    email: z.union([z.literal(""), z.string().email().max(254)]),
    phone: z.string().trim().max(80),
    website: z.union([
      z.literal(""),
      z
        .string()
        .url()
        .max(500)
        .refine(
          (value) => value.startsWith("https://"),
          "Usi un indirizzo https://",
        ),
    ]),
    status: z.enum(["prospect", "contacted", "confirmed", "inactive"]),
    notes: z.string().max(4000),
  })
  .strict();
export const supplierSchema = supplierInput.extend(base);
export const serviceInput = z
  .object({
    experience_id: z
      .string()
      .refine(
        (id) =>
          id === customExperienceService || Object.hasOwn(experienceLabels, id),
      ),
    title: z.string().trim().min(1).max(160),
    supplier_id: z.string().uuid().nullable(),
    lake: z.enum(internalLakes),
    unit: z.enum(["persona", "gruppo", "barca", "ora", "giorno", "servizio"]),
    cost_cents: cents.nullable(),
    price_cents: cents.nullable(),
    notes: z.string().max(4000),
    active: z.boolean(),
  })
  .strict();
export const serviceSchema = serviceInput.extend(base);
export const quoteItemSchema = z
  .object({
    label: z.string().trim().min(1).max(200),
    quantity: z.number().int().min(1).max(1000),
    cost_cents: cents.nullable(),
    price_cents: cents,
    service_id: z.string().uuid().nullable(),
    supplier_id: z.string().uuid().nullable(),
  })
  .strict();
export const quoteInput = z
  .object({
    id: z.string().uuid().optional(),
    trip_id: z.string().uuid(),
    trip_version: timestamp,
    quote_version: timestamp.optional(),
    items: z.array(quoteItemSchema).min(1).max(30),
    inclusions: z.array(z.string().trim().min(1).max(500)).max(30),
    exclusions: z.array(z.string().trim().min(1).max(500)).max(30),
    conditions: z.string().trim().min(1).max(4000),
    valid_until: timestamp.nullable(),
    internal_notes: z.string().max(4000),
    publish: z.boolean(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const total = value.items.reduce(
      (sum, item) => sum + item.quantity * item.price_cents,
      0,
    );
    if (total <= 0 || total > 100000000)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Il totale deve essere compreso tra €0,01 e €1.000.000.",
      });
    if (value.id && !value.quote_version)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Versione del preventivo mancante.",
      });
    if (
      value.publish &&
      (!value.valid_until || Date.parse(value.valid_until) <= Date.now())
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indichi una scadenza futura prima di pubblicare.",
      });
  });
export const adminQuoteSchema = z.object({
  id: z.string().uuid(),
  trip_id: z.string().uuid(),
  total_cents: z.number().int().positive(),
  currency: z.literal("EUR"),
  inclusions: z.array(z.string()),
  exclusions: z.array(z.string()),
  conditions: z.string(),
  valid_until: timestamp.nullable(),
  published_at: timestamp,
  status: z.enum(["draft", "sent"]),
  trip_updated_at: timestamp,
  updated_at: timestamp,
  experience_quote_details: z
    .object({
      quote_id: z.string().uuid(),
      items: z.array(quoteItemSchema),
      internal_notes: z.string(),
    })
    .nullable(),
});
export const adminTripSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid().nullable(),
  title: z.string(),
  payload: tripPayloadSchema,
  created_at: timestamp,
  updated_at: timestamp,
  experience_quotes: z.array(adminQuoteSchema),
  customer: z
    .object({ full_name: z.string().nullable(), email: z.string().nullable() })
    .nullable(),
});
export const contactIdSchema = z
  .union([
    z.string().uuid(),
    z.string().regex(/^\d+$/),
    z.number().int().positive().safe(),
  ])
  .transform(String);
export const adminRequestSchema = z.object({
  id: contactIdSchema,
  nome: z.string().nullable(),
  cognome: z.string().nullable(),
  email: z.string(),
  telefono: z.string().nullable(),
  messaggio: z.string(),
  status: z.enum(["new", "in_progress", "resolved"]),
  created_at: timestamp,
  updated_at: timestamp,
});
export const resourceSchemas = {
  requests: adminRequestSchema,
  trips: adminTripSchema,
  suppliers: supplierSchema,
  services: serviceSchema,
};
export type Resource = keyof typeof resourceSchemas;
export type Supplier = z.infer<typeof supplierSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type AdminTrip = z.infer<typeof adminTripSchema>;
export type AdminRequest = z.infer<typeof adminRequestSchema>;
export type AdminQuote = z.infer<typeof adminQuoteSchema>;
export type QuoteItem = z.infer<typeof quoteItemSchema>;
export function quoteTotals(items: QuoteItem[]) {
  const revenue = items.reduce(
    (sum, item) => sum + item.price_cents * item.quantity,
    0,
  );
  const cost = items.some((item) => item.cost_cents === null)
    ? null
    : items.reduce((sum, item) => sum + item.cost_cents! * item.quantity, 0);
  return { revenue, cost, margin: cost === null ? null : revenue - cost };
}
