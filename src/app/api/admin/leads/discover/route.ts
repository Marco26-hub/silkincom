import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { forbidden, requireAdminApi } from "@/lib/admin-api";
import {
  discoverLeadFromWebsite,
  normalizeLeadUrl,
} from "@/lib/lead-discovery";
import { leadDiscoverySchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireAdminApi();
  if (!auth.ok) return forbidden(auth.status);

  const body = await req.json();
  const parsed = leadDiscoverySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Dati non validi" },
      { status: 400 },
    );
  }

  const urls = parsed.data.urls
    .map((url) => normalizeLeadUrl(url))
    .filter((url): url is string => Boolean(url));

  if (urls.length === 0) {
    return NextResponse.json({ error: "Nessun URL valido" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const discovered = [];
  const warnings: string[] = [];

  const results = await Promise.allSettled(
    urls.slice(0, 30).map(async (url) => {
      try {
        const lead = await discoverLeadFromWebsite(url, {
          industry: parsed.data.industry,
          notes: parsed.data.notes,
        });

        const { data, error } = await supabase
          .from("lead_accounts")
          .upsert(
            {
              company_name: lead.company_name,
              website_url: lead.website_url,
              industry: parsed.data.industry || "hospitality",
              city: lead.city,
              country: lead.country || "IT",
              contact_email: lead.contact_email,
              contact_phone: lead.contact_phone,
              source_url: lead.source_url,
              public_contact_page: lead.public_contact_page,
              discovery_query: lead.discovery_query,
              notes: parsed.data.notes || lead.notes || "",
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
          error instanceof Error ? error.message : `Errore su ${url}`;
        throw new Error(`${url}: ${message}`);
      }
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") discovered.push(result.value);
    else
      warnings.push(
        result.reason instanceof Error
          ? result.reason.message
          : "Errore discovery",
      );
  }

  return NextResponse.json({
    ok: true,
    discovered: discovered.length,
    warnings,
  });
}
