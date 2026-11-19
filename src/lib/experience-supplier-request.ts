import { z } from "zod";
import {
  EXPERIENCES,
  BOAT_PACKAGES,
  LOGISTICS,
} from "@/data/experience-content";
import { tripSelectionIds } from "@/lib/experience-trips";

const catalogue = new Map<string, { title: string; format?: string }>([
  ...EXPERIENCES.map(
    (item) =>
      [
        `activity:${item.id}`,
        { title: item.title, format: item.format },
      ] as const,
  ),
  ...BOAT_PACKAGES.map(
    (item) =>
      [`boat:${item.id}`, { title: item.title, format: item.format }] as const,
  ),
  ...LOGISTICS.map(
    (item) => [`service:${item.id}`, { title: item.title }] as const,
  ),
]);

const supplierServices = z
  .array(z.string().refine((id) => tripSelectionIds.includes(id)))
  .min(1)
  .max(tripSelectionIds.length)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Selezioni ogni servizio una sola volta.",
  );
const supplierTripVersion = z.string().datetime({ offset: true });
export const MAX_SUPPLIER_REQUESTS = 10;

export const supplierRequestInput = z
  .object({
    trip_version: supplierTripVersion,
    supplier_id: z.string().uuid().optional(),
    services: supplierServices,
  })
  .strict();

export const supplierEmailInput = z
  .object({
    action: z.literal("email"),
    trip_version: supplierTripVersion,
    supplier_id: z.string().uuid(),
    services: supplierServices,
    email: z.string().trim().email().max(254),
  })
  .strict();

export const supplierBatchInput = z
  .object({
    trip_version: supplierTripVersion,
    requests: z
      .array(
        z
          .object({
            supplier_id: z.string().uuid(),
            services: supplierServices,
          })
          .strict(),
      )
      .min(1)
      .max(MAX_SUPPLIER_REQUESTS)
      .refine(
        (requests) =>
          new Set(requests.map(({ supplier_id }) => supplier_id)).size ===
          requests.length,
        "Prepari una sola richiesta per fornitore.",
      ),
  })
  .strict();

export function supplierRequestServices(ids: readonly string[]) {
  const hasBoatFormula = ids.some((id) => id.startsWith("boat:"));
  return ids
    .filter((id) => !(hasBoatFormula && id === "activity:boat"))
    .map((id) => {
      const service = catalogue.get(id);
      if (!service) throw new Error("Unknown supplier service");
      return { id, ...service };
    });
}

export const MAX_PARTNER_SERVICES = 30;

export const partnerRequestInput = z.object({
  supplier_id: z.string().uuid(),
  services: z.array(z.string().uuid()).min(1).max(MAX_PARTNER_SERVICES)
    .refine((ids) => new Set(ids).size === ids.length),
  email: z.string().trim().email().max(254).optional(),
  request_code: z.string().regex(/^EXP-F-[0-9A-F]{12}$/).optional(),
}).strict().refine(({ email, request_code }) => Boolean(email) === Boolean(request_code));
