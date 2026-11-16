import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-api";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/audit";
import {
  supplierInput,
  serviceInput,
  quoteInput,
  contactIdSchema,
  resourceSchemas,
  type Resource,
} from "@/lib/experience-admin";
export const dynamic = "force-dynamic";
function json(body: unknown, status = 200) {
  if (status >= 400)
    console.warn(
      "[experience-admin] Request rejected:",
      status,
      (body as { error?: string }).error,
    );
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
async function guard(req: NextRequest, write = false) {
  const auth = await requireAdminApi();
  if (!auth.ok)
    return {
      response: json(
        {
          error:
            auth.status === 401
              ? "Acceda al suo account."
              : "Permessi amministratore richiesti.",
        },
        auth.status,
      ),
    };
  const limited = rateLimit(req, write ? 40 : 120, 60000);
  if (limited) return { response: limited };
  if (write) {
    const origin = req.headers.get("origin");
    if (
      !origin ||
      (origin !== req.nextUrl.origin &&
        origin !== process.env.NEXT_PUBLIC_APP_URL)
    )
      return {
        response: json({ error: "Origine della richiesta non valida." }, 403),
      };
  }
  return { auth };
}
function failure(cause: unknown) {
  const error = cause as { code?: string; message?: string };
  console.error(
    "[experience-admin] Operation failed:",
    error.code,
    error.message,
  );
  if (error.code === "40001")
    return json(
      {
        error:
          "I dati sono cambiati o il preventivo è già pubblicato. Ricarichi e riprovi.",
      },
      409,
    );
  if (error.code === "P0002")
    return json({ error: "Viaggio o preventivo non disponibile." }, 404);
  if (error.code === "22023")
    return json({ error: "Controlli importi e scadenza del preventivo." }, 400);
  return json(
    {
      error:
        "Gestione Experience non disponibile. Riprovi; se il problema persiste verifichi la configurazione del database.",
    },
    503,
  );
}
export async function GET(req: NextRequest) {
  const access = await guard(req);
  if (access.response) return access.response;
  const resource = req.nextUrl.searchParams.get("resource") || "requests";
  if (!Object.hasOwn(resourceSchemas, resource))
    return json({ error: "Sezione non valida." }, 400);
  const page = Number(req.nextUrl.searchParams.get("page") || 0);
  if (!Number.isInteger(page) || page < 0 || page > 10000)
    return json({ error: "Pagina non valida." }, 400);
  const search = (req.nextUrl.searchParams.get("search") || "").trim();
  if (search.length > 100) return json({ error: "Ricerca troppo lunga." }, 400);
  const tripId = req.nextUrl.searchParams.get("trip");
  if (tripId && !z.string().uuid().safeParse(tripId).success)
    return json({ error: "Viaggio non valido." }, 400);
  try {
    const db = createServiceClient();
    const table = {
      requests: "contacts",
      trips: "experience_trips",
      suppliers: "experience_suppliers",
      services: "experience_services",
    }[resource as Resource];
    const fields =
      resource === "trips"
        ? "id,user_id,title,payload,created_at,updated_at,experience_quotes(*,experience_quote_details(*))"
        : resource === "requests"
          ? "id,nome,cognome,email,telefono,messaggio,status,created_at,updated_at"
          : "*";
    let query = db.from(table).select(fields, { count: "exact" });
    if (resource === "requests")
      query = query.like("messaggio", "SILKinCOM EXPERIENCE%");
    if (tripId && resource === "trips") query = query.eq("id", tripId);
    if (search) {
      const escaped = search.replace(/[\\%_]/g, "\\$&");
      query = query.ilike(
        resource === "requests"
          ? "email"
          : resource === "suppliers"
            ? "name"
            : "title",
        `%${escaped}%`,
      );
    }
    const { data, error, count } = await query
      .order(resource === "requests" ? "created_at" : "updated_at", {
        ascending: false,
      })
      .range(page * 30, page * 30 + 29);
    if (error) throw error;
    let rows: unknown[] = data;
    if (resource === "trips") {
      const trips = data as unknown as { user_id: string }[];
      let customers: {
        id: string;
        full_name: string | null;
        email: string | null;
      }[] = [];
      if (trips.length) {
        const result = await db
          .from("profiles")
          .select("id,full_name,email")
          .in(
            "id",
            trips.map((t) => t.user_id),
          );
        if (result.error) throw result.error;
        customers = result.data;
      }
      rows = (data as unknown as Record<string, unknown>[]).map((row) => ({
        ...row,
        customer:
          customers.find(
            (c) => c.id === (row as unknown as { user_id: string }).user_id,
          ) ?? null,
      }));
    }
    const parsed = z
      .array(resourceSchemas[resource as Resource])
      .safeParse(rows);
    if (!parsed.success) {
      console.error(
        "[experience-admin] Invalid stored data:",
        parsed.error.issues.map((i) => ({ path: i.path, code: i.code })),
      );
      return json(
        {
          error:
            "Dati salvati non validi: è necessario un controllo amministrativo.",
        },
        503,
      );
    }
    return json({ rows: parsed.data, total: count, page });
  } catch (cause) {
    return failure(cause);
  }
}
const version = {
  id: z.string().uuid().optional(),
  updated_at: z.string().datetime({ offset: true }).optional(),
};
export async function POST(req: NextRequest) {
  const access = await guard(req, true);
  if (access.response) return access.response;
  let body: unknown;
  try {
    const text = await req.text();
    if (Buffer.byteLength(text) > 65536)
      return json({ error: "Richiesta troppo grande." }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "Richiesta non valida." }, 400);
  }
  const envelope = z
    .discriminatedUnion("action", [
      z
        .object({
          action: z.literal("supplier"),
          ...version,
          data: supplierInput,
        })
        .strict(),
      z
        .object({
          action: z.literal("service"),
          ...version,
          data: serviceInput,
        })
        .strict(),
      z.object({ action: z.literal("quote"), data: quoteInput }).strict(),
      z
        .object({
          action: z.literal("request_status"),
          id: contactIdSchema,
          updated_at: z.string().datetime({ offset: true }),
          status: z.enum(["new", "in_progress", "resolved"]),
        })
        .strict(),
    ])
    .safeParse(body);
  if (!envelope.success)
    return json(
      {
        error:
          envelope.error.issues[0]?.message || "Controlli i dati inseriti.",
      },
      400,
    );
  const input = envelope.data;
  try {
    const db = createServiceClient();
    let id: string;
    if (input.action === "quote") {
      const q = input.data;
      const result = await db.rpc("admin_save_experience_quote", {
        p_id: q.id ?? null,
        p_trip_id: q.trip_id,
        p_trip_version: q.trip_version,
        p_quote_version: q.quote_version ?? null,
        p_items: q.items,
        p_inclusions: q.inclusions,
        p_exclusions: q.exclusions,
        p_conditions: q.conditions,
        p_valid_until: q.valid_until,
        p_internal_notes: q.internal_notes,
        p_publish: q.publish,
      });
      if (result.error) throw result.error;
      id = z.string().uuid().parse(result.data);
    } else if (input.action === "request_status") {
      const result = await db
        .from("contacts")
        .update({ status: input.status })
        .eq("id", input.id)
        .eq("updated_at", input.updated_at)
        .like("messaggio", "SILKinCOM EXPERIENCE%")
        .select("id")
        .maybeSingle();
      if (result.error) throw result.error;
      if (!result.data)
        return json(
          {
            error: "Richiesta cambiata o non disponibile. Ricarichi la pagina.",
          },
          409,
        );
      id = result.data.id;
    } else {
      const table =
        input.action === "supplier"
          ? "experience_suppliers"
          : "experience_services";
      if (input.id && !input.updated_at)
        return json({ error: "Versione dei dati mancante." }, 400);
      if (input.action === "service" && input.data.supplier_id) {
        const supplier = await db
          .from("experience_suppliers")
          .select("id")
          .eq("id", input.data.supplier_id)
          .maybeSingle();
        if (supplier.error) throw supplier.error;
        if (!supplier.data)
          return json({ error: "Fornitore non disponibile." }, 400);
      }
      const values: Record<string, unknown> = input.data;
      const query = input.id
        ? db
            .from(table)
            .update(values)
            .eq("id", input.id)
            .eq("updated_at", input.updated_at!)
        : db.from(table).insert(values);
      const result = await query.select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data)
        return json(
          {
            error: "Dati modificati da un’altra sessione. Ricarichi e riprovi.",
          },
          409,
        );
      id = result.data.id;
    }
    await logAdminAction(
      access.auth!.userId,
      "experience_" + input.action,
      input.action === "quote"
        ? "experience_quote"
        : "experience_" + input.action,
      id,
      { published: input.action === "quote" ? input.data.publish : undefined },
    );
    return json({ ok: true, id });
  } catch (cause) {
    return failure(cause);
  }
}
