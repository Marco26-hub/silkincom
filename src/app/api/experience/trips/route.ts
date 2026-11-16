import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { tripWriteSchema } from "@/lib/experience-trips";
import { z } from "zod";

export const dynamic = "force-dynamic";
const fields =
  "id,title,payload,created_at,updated_at,experience_quotes(id,total_cents,currency,inclusions,exclusions,conditions,valid_until,published_at,trip_updated_at)";
function json(body: unknown, status = 200) {
  if (status >= 400) console.warn("[experience-trips] Request rejected:", status, (body as { error?: string }).error);
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
async function authenticate(req: NextRequest, write = false) {
  const limited = rateLimit(req, write ? 30 : 90, 60_000);
  if (limited) return { response: limited };
  if (write) {
    const origin = req.headers.get("origin");
    if (
      !origin ||
      (origin !== req.nextUrl.origin &&
        origin !== process.env.NEXT_PUBLIC_APP_URL)
    )
      return { response: json({ error: "invalid_origin" }, 403) };
  }
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user)
    return { response: json({ error: "auth_required" }, 401) };
  return { supabase, user };
}
function failure(error: { code?: string; message?: string }) {
  console.error(
    "[experience-trips] Database operation failed:",
    error.code,
    error.message,
  );
  return json(
    {
      error:
        error.code === "42P01" || error.code === "PGRST205"
          ? "storage_unavailable"
          : "storage_error",
    },
    503,
  );
}
export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (auth.response) return auth.response;
  const id = req.nextUrl.searchParams.get("id");
  if (id && !z.string().uuid().safeParse(id).success)
    return json({ error: "invalid_id" }, 400);
  let query = auth
    .supabase!.from("experience_trips")
    .select(fields)
    .eq("user_id", auth.user!.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  if (id) query = query.eq("id", id);
  const { data, error } = await query;
  if (error) return failure(error);
  if (id && !data.length) return json({ error: "not_found" }, 404);
  return json({ trips: data });
}
export async function POST(req: NextRequest) {
  const auth = await authenticate(req, true);
  if (auth.response) return auth.response;
  let input: unknown;
  try {
    if (Number(req.headers.get("content-length") || 0) > 32768)
      return json({ error: "payload_too_large" }, 413);
    const body = await req.text();
    if (Buffer.byteLength(body, "utf8") > 32768)
      return json({ error: "payload_too_large" }, 413);
    input = JSON.parse(body);
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const parsed = tripWriteSchema.safeParse(input);
  if (!parsed.success) return json({ error: "invalid_input" }, 400);
  const { id, updated_at, title, payload } = parsed.data;
  if (id && !updated_at) return json({ error: "version_required" }, 400);
  const query = id
    ? auth
        .supabase!.from("experience_trips")
        .update({ title, payload })
        .eq("id", id)
        .eq("user_id", auth.user!.id)
        .eq("updated_at", updated_at!)
    : auth
        .supabase!.from("experience_trips")
        .insert({ title, payload, user_id: auth.user!.id });
  const { data, error } = await query
    .select(fields)
    .maybeSingle();
  if (error) return failure(error);
  if (!data) return json({ error: "version_conflict" }, 409);
  return json({ trip: data }, id ? 200 : 201);
}
