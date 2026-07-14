import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { forbidden, requireAdminApi } from "@/lib/admin-api";
import {
  discoverLeadFromWebsite,
  searchLeadCandidates,
} from "@/lib/lead-discovery";
import { leadSearchSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const body = await req.json();
  const parsed = leadSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dati non validi" },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const supabase = createServiceClient();
  const warnings: string[] = [];

  let candidates;
  try {
    candidates = await searchLeadCandidates({
      query: input.query,
      location: input.location,
      maxResults: input.maxResults,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ricerca live non disponibile";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const saved = [];
  const queryLabel = [input.query, input.location].filter(Boolean).join(" ");

  const results = await Promise.allSettled(
    candidates.slice(0, input.maxResults).map(async (candidate) => {
      try {
        const lead = await discoverLeadFromWebsite(candidate.link, {
          industry: input.industry,
          notes: input.notes,
          query: queryLabel,
        });

        const { data, error } = await supabase
          .from("lead_accounts")
          .upsert(
            {
              company_name: lead.company_name || candidate.title,
              website_url: lead.website_url,
              industry: input.industry || "hospitality",
              city: lead.city,
              country: lead.country || "IT",
              contact_email: lead.contact_email,
              contact_phone: lead.contact_phone,
              source_url: candidate.link,
              public_contact_page: lead.public_contact_page,
              discovery_query: queryLabel,
              notes: input.notes || candidate.snippet || lead.notes || "",
              status: lead.contact_email ? "qualified" : "scanned",
              score: lead.score,
              last_scanned_at: new Date().toISOString(),
            },
            { onConflict: "website_url" },
          )
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }
        return data;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Errore discovery";
        throw new Error(`${candidate.link}: ${message}`);
      }
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") saved.push(result.value);
    else
      warnings.push(
        result.reason instanceof Error
          ? result.reason.message
          : "Errore discovery",
      );
  }

  return NextResponse.json({
    ok: true,
    provider: candidates[0]?.source || "unknown",
    candidates: candidates.length,
    saved: saved.length,
    warnings,
  });
}
