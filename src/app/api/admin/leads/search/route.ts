import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { forbidden, requireAdminApi } from "@/lib/admin-api";
import {
  discoverLeadFromWebsite,
  LeadSearchError,
  normalizeLeadUrl,
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
  let providerDiagnostics;
  try {
    const searchResult = await searchLeadCandidates({
      query: input.query,
      location: input.location,
      industry: input.industry,
      segmentIds: input.segmentIds,
      maxResults: input.maxResults,
    });
    candidates = searchResult.candidates;
    providerDiagnostics = searchResult.diagnostics;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ricerca live non disponibile";
    return NextResponse.json(
      {
        error: message,
        providerDiagnostics:
          error instanceof LeadSearchError ? error.diagnostics : [],
      },
      { status: 503 },
    );
  }

  const saved: Array<{ data: { id?: string } | null; existed: boolean }> = [];
  const queryLabel = [input.query, input.location].filter(Boolean).join(" ");

  const results = await Promise.allSettled(
    candidates.slice(0, input.maxResults).map(async (candidate) => {
      let lead: Awaited<ReturnType<typeof discoverLeadFromWebsite>> | null =
        null;
      let scanWarning: string | null = null;
      try {
        lead = await discoverLeadFromWebsite(candidate.link, {
          industry: input.industry,
          notes: input.notes,
          query: queryLabel,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Errore discovery";
        scanWarning = `${candidate.link}: ${message}`;
      }

      const websiteUrl = lead?.website_url || normalizeLeadUrl(candidate.link);
      if (!websiteUrl) throw new Error(`${candidate.link}: URL non valido`);
      const contactEmail =
        lead?.contact_email || candidate.contactEmail || null;
      const contactPhone =
        lead?.contact_phone || candidate.contactPhone || null;
      const score = Math.max(
        lead?.score || 10,
        contactEmail ? 70 : contactPhone ? 35 : 20,
      );
      const { data: existingLead, error: existingError } = await supabase
        .from("lead_accounts")
        .select("id")
        .eq("website_url", websiteUrl)
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);

      const { data, error } = await supabase
        .from("lead_accounts")
        .upsert(
          {
            company_name: lead?.company_name || candidate.title,
            website_url: websiteUrl,
            industry: input.industry || "hospitality",
            city: lead?.city || candidate.city || null,
            country: lead?.country || candidate.country || "IT",
            contact_email: contactEmail,
            contact_phone: contactPhone,
            source_url: candidate.sourceUrl || candidate.link,
            public_contact_page: lead?.public_contact_page || null,
            discovery_query: queryLabel,
            notes: input.notes || candidate.snippet || lead?.notes || "",
            status: contactEmail ? "qualified" : "scanned",
            score,
            last_scanned_at: new Date().toISOString(),
          },
          { onConflict: "website_url" },
        )
        .select()
        .single();

      if (error) throw new Error(error.message);
      return { data, warning: scanWarning, existed: Boolean(existingLead?.id) };
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      saved.push({
        data: result.value.data,
        existed: result.value.existed,
      });
      if (result.value.warning) warnings.push(result.value.warning);
    } else
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
    created: saved.filter((item) => !item.existed).length,
    updated: saved.filter((item) => item.existed).length,
    createdLeadIds: saved
      .filter((item) => !item.existed)
      .map((item) => item.data?.id)
      .filter(Boolean),
    updatedLeadIds: saved
      .filter((item) => item.existed)
      .map((item) => item.data?.id)
      .filter(Boolean),
    warnings,
    providerDiagnostics,
  });
}
