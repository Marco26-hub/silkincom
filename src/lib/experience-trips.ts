import { z } from "zod";
import {
  EXPERIENCES,
  BOAT_PACKAGES,
  LOGISTICS,
} from "@/data/experience-content";

export const EXPERIENCE_DRAFT_KEY = "silkincom.experience.selection.v1";
export function isExperiencePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return (
    /^\+?[0-9(). -]{6,40}$/.test(value) &&
    digits.length >= 6 &&
    digits.length <= 15
  );
}
export const tripDestinations = [
  "Da scegliere insieme",
  "Lago di Como",
  "Lago Maggiore",
  "Entrambi i laghi",
] as const;
export const tripSelectionIds = [
  ...EXPERIENCES.map((item) => `activity:${item.id}`),
  ...BOAT_PACKAGES.map((item) => `boat:${item.id}`),
  ...LOGISTICS.map((item) => `service:${item.id}`),
];
const tripDetailsSchema = z
  .object({
    arrival: z.string().max(10),
    departure: z.string().max(10),
    guests: z.number().int().min(1).max(100),
    budget: z.string().max(12),
    experienceStyle: z.enum(["", "private", "shared"]),
    arrivalPoint: z.string().max(300),
    hotel: z.string().max(300),
    stops: z.array(z.string().max(300)).max(3),
    notes: z.string().max(3000),
  })
  .strict()
  .superRefine((details, context) => {
    const validDate = (value: string) =>
      !value ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)));
    if (
      !validDate(details.arrival) ||
      !validDate(details.departure) ||
      (details.arrival &&
        details.departure &&
        details.departure < details.arrival)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid travel dates",
      });
    if (
      details.budget &&
      (!Number.isFinite(Number(details.budget)) ||
        Number(details.budget) < 0 ||
        Number(details.budget) > 1000000)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid budget",
      });
  });
export const tripPayloadSchema = z
  .object({
    version: z.literal(1),
    ids: z
      .array(z.string().refine((id) => tripSelectionIds.includes(id)))
      .max(tripSelectionIds.length),
    lake: z.enum(tripDestinations),
    details: tripDetailsSchema.optional(),
  })
  .strict()
  .superRefine((draft, context) => {
    if (
      new Set(draft.ids).size !== draft.ids.length ||
      draft.ids.filter((id) => id.startsWith("boat:")).length > 1
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid duplicate selection",
      });
    }
  });
export const tripWriteSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(80),
    payload: tripPayloadSchema,
    updated_at: z.string().datetime({ offset: true }).optional(),
  })
  .strict();
export type TripPayload = z.infer<typeof tripPayloadSchema>;
export type TripQuote = {
  id: string;
  total_cents: number;
  currency: string;
  inclusions: string[];
  exclusions: string[];
  conditions: string;
  valid_until: string | null;
  published_at: string;
  trip_updated_at: string;
};
export type SavedTrip = {
  id: string;
  title: string;
  payload: TripPayload;
  created_at: string;
  updated_at: string;
  experience_quotes: TripQuote[];
};
export const savedTripSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(80),
    payload: tripPayloadSchema,
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    experience_quotes: z.array(
      z
        .object({
          id: z.string().uuid(),
          total_cents: z.number().int().positive(),
          currency: z.literal("EUR"),
          inclusions: z.array(z.string()),
          exclusions: z.array(z.string()),
          conditions: z.string(),
          valid_until: z.string().datetime({ offset: true }).nullable(),
          published_at: z.string().datetime({ offset: true }),
          trip_updated_at: z.string().datetime({ offset: true }),
        })
        .strict(),
    ),
  })
  .strict();
export type SavedTripDraft = Pick<
  SavedTrip,
  "id" | "title" | "payload" | "updated_at"
>;
