import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { forbidden, requireAdminApi } from "@/lib/admin-api";
import {
  discoverLeadFromWebsite,
  LeadSearchError,
  normalizeLeadUrl,
  searchLeadCandidates,
} from "@/lib/lead-discovery";
import {
  buildLeadSegmentQuery,
  getLeadSegments,
  type LeadSegment,
} from "@/lib/lead-segments";
import { leadSearchSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CategorizedSearchCandidate = Awaited<
  ReturnType<typeof searchLeadCandidates>
>["candidates"][number] & {
  industry: string;
  queryLabel: string;
  segmentLabels: string[];
};

function groupSegmentsByFocus(segments: LeadSegment[]) {
  const groups = new Map<string, LeadSegment[]>();
  for (const segment of segments) {
    groups.set(segment.focus, [...(groups.get(segment.focus) || []), segment]);
  }
  return [...groups.entries()].map(([focus, groupedSegments]) => ({
    focus,
    segments: groupedSegments,
  }));
}

function candidateDomainKey(candidate: CategorizedSearchCandidate) {
  const normalizedUrl = normalizeLeadUrl(candidate.link);
  if (!normalizedUrl) return candidate.link.toLowerCase();
  const parsed = new URL(normalizedUrl);
  return parsed.hostname.replace(/^www\./, "").toLowerCase();
}

function isCandidateRelevantToFocus(candidate: CategorizedSearchCandidate) {
  if (candidate.source === "openstreetmap") return true;
  const searchableText = [candidate.title, candidate.snippet, candidate.link]
    .join(" ")
    .toLowerCase();

  switch (candidate.industry) {
    case "boat_charter":
      return /boat|barca|yacht|charter|nautic|sailing|navigaz/.test(
        searchableText,
      );
    case "chauffeur_ncc":
      return /\bncc\b|chauffeur|private driver|autista|limousine|vip transfer|luxury transfer/.test(
        searchableText,
      );
    case "luxury_car_rental":
      return /luxury car|prestige car|supercar|exotic car|noleggio.{0,16}(auto|vettur)|car rental.{0,18}(luxury|prestige|supercar|exotic)/.test(
        searchableText,
      );
    default:
      return true;
  }
}

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

  const selectedSegments = getLeadSegments(input.segmentIds);
  const selectedGroups = groupSegmentsByFocus(selectedSegments);
  const searchGroups = selectedGroups.length
    ? selectedGroups
    : [{ focus: input.industry || "hospitality", segments: [] }];
  const baseResultsPerGroup = Math.floor(
    input.maxResults / searchGroups.length,
  );
  const groupsWithExtraResult = input.maxResults % searchGroups.length;
  const providerDiagnostics: Array<Record<string, unknown>> = [];
  const categorizedCandidates: CategorizedSearchCandidate[] = [];

  const groupedSearchResults = await Promise.allSettled(
    searchGroups.map(async (group, groupIndex) => {
      const groupQuery = group.segments.length
        ? buildLeadSegmentQuery(group.segments, input.customQuery)
        : input.query;
      const groupMaxResults = Math.max(
        1,
        baseResultsPerGroup +
          (groupIndex < groupsWithExtraResult ? 1 : 0),
      );
      const searchResult = await searchLeadCandidates({
        query: groupQuery,
        location: input.location,
        industry: group.focus,
        segmentIds: group.segments.map((segment) => segment.id),
        maxResults: groupMaxResults,
      });
      return {
        focus: group.focus,
        query: groupQuery,
        segmentLabels: group.segments.map((segment) => segment.label),
        searchResult,
      };
    }),
  );

  groupedSearchResults.forEach((result, index) => {
    const group = searchGroups[index];
    if (result.status === "rejected") {
      const message =
        result.reason instanceof Error
          ? result.reason.message
          : "Ricerca live non disponibile";
      warnings.push(`${group.focus}: ${message}`);
      if (result.reason instanceof LeadSearchError) {
        providerDiagnostics.push(
          ...result.reason.diagnostics.map((diagnostic) => ({
            ...diagnostic,
            focus: group.focus,
          })),
        );
      }
      return;
    }

    providerDiagnostics.push(
      ...result.value.searchResult.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        focus: result.value.focus,
      })),
    );
    categorizedCandidates.push(
      ...result.value.searchResult.candidates.map((candidate) => ({
        ...candidate,
        industry: result.value.focus,
        queryLabel: [result.value.query, input.location]
          .filter(Boolean)
          .join(" "),
        segmentLabels: result.value.segmentLabels,
      })),
    );
  });

  const uniqueCandidates = new Map<string, CategorizedSearchCandidate>();
  for (const candidate of categorizedCandidates.filter(
    isCandidateRelevantToFocus,
  )) {
    const domainKey = candidateDomainKey(candidate);
    if (!uniqueCandidates.has(domainKey)) {
      uniqueCandidates.set(domainKey, candidate);
    }
  }
  const candidates = [...uniqueCandidates.values()].slice(0, input.maxResults);

  if (candidates.length === 0) {
    return NextResponse.json(
      {
        error:
          warnings[0] ||
          "Nessuna azienda pertinente trovata per le categorie selezionate.",
        warnings,
        providerDiagnostics,
      },
      { status: 503 },
    );
  }

  const saved: Array<{
    data: { id?: string } | null;
    existed: boolean;
    industry: string;
  }> = [];
  const results = await Promise.allSettled(
    candidates.slice(0, input.maxResults).map(async (candidate) => {
      let lead: Awaited<ReturnType<typeof discoverLeadFromWebsite>> | null =
        null;
      let scanWarning: string | null = null;
      try {
        lead = await discoverLeadFromWebsite(candidate.link, {
          industry: candidate.industry,
          notes: [
            input.notes,
            candidate.segmentLabels.length
              ? `Segmenti: ${candidate.segmentLabels.join(", ")}`
              : "",
          ]
            .filter(Boolean)
            .join(" · "),
          query: candidate.queryLabel,
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
            industry: candidate.industry,
            city: lead?.city || candidate.city || null,
            country: lead?.country || candidate.country || "IT",
            contact_email: contactEmail,
            contact_phone: contactPhone,
            source_url: candidate.sourceUrl || candidate.link,
            public_contact_page: lead?.public_contact_page || null,
            discovery_query: candidate.queryLabel,
            notes:
              [
                input.notes,
                candidate.segmentLabels.length
                  ? `Segmenti: ${candidate.segmentLabels.join(", ")}`
                  : "",
              ]
                .filter(Boolean)
                .join(" · ") ||
              candidate.snippet ||
              lead?.notes ||
              "",
            status: contactEmail ? "qualified" : "scanned",
            score,
            last_scanned_at: new Date().toISOString(),
          },
          { onConflict: "website_url" },
        )
        .select()
        .single();

      if (error) throw new Error(error.message);
      return {
        data,
        warning: scanWarning,
        existed: Boolean(existingLead?.id),
        industry: candidate.industry,
      };
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      saved.push({
        data: result.value.data,
        existed: result.value.existed,
        industry: result.value.industry,
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
    categoryBreakdown: searchGroups.map((group) => {
      const groupedSaved = saved.filter(
        (item) => item.industry === group.focus,
      );
      return {
        focus: group.focus,
        label:
          group.segments.map((segment) => segment.label).join(" + ") ||
          group.focus,
        candidates: candidates.filter(
          (candidate) => candidate.industry === group.focus,
        ).length,
        saved: groupedSaved.length,
        created: groupedSaved.filter((item) => !item.existed).length,
        updated: groupedSaved.filter((item) => item.existed).length,
      };
    }),
    warnings,
    providerDiagnostics,
  });
}
