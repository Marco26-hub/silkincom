/**
 * Pull Google Ads campaigns, ad groups, responsive search ads, and the
 * last 30 days of performance metrics into our local tables.
 *
 * Why we mirror Google's data instead of querying it on every page load:
 *   - The Ads API enforces a per-account QPS quota; the admin would burn
 *     through it just opening the dashboard.
 *   - We want to join campaign performance against our own catalog +
 *     orders tables (e.g. "spend per product" or "ROAS per collezione"),
 *     which is only possible if the data lives in our DB.
 *
 * Idempotent + resumable: upserts on (source, external_id). Pulled via the
 * googleAds:searchStream GAQL endpoint. Skips silently when not connected,
 * same pattern as financial sync.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { gadsFetch, getCustomerId } from '@/lib/google-ads/client';

export type SyncResult = {
  source: 'google_ads';
  synced: number;
  errors: string[];
  durationMs: number;
};

type GadsRow = {
  campaign?: {
    id: string;
    name: string;
    status: string;
    advertisingChannelType?: string;
    biddingStrategyType?: string;
    startDate?: string;
    endDate?: string;
    campaignBudget?: string;
    maximizeConversionValue?: { targetRoas?: number };
    targetCpa?: { targetCpaMicros?: string };
  };
  campaignBudget?: {
    amountMicros?: string;
    deliveryMethod?: string;
  };
  adGroup?: {
    id: string;
    name: string;
    status: string;
    campaign: string;
  };
  adGroupAd?: {
    ad: {
      id: string;
      type: string;
      finalUrls?: string[];
      responsiveSearchAd?: {
        headlines?: Array<{ text: string }>;
        descriptions?: Array<{ text: string }>;
      };
    };
    status: string;
    adGroup: string;
  };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number;
    conversionsValue?: number;
  };
  segments?: { date?: string };
};

type SearchStreamResp = { results?: GadsRow[] };

const fromMicros = (v: string | number | undefined): number =>
  v === undefined || v === null ? 0 : Number(v) / 1_000_000;

async function gaql(customerId: string, query: string): Promise<GadsRow[]> {
  const res = await gadsFetch<SearchStreamResp | SearchStreamResp[]>(
    `/customers/${customerId}/googleAds:searchStream`,
    { method: 'POST', body: JSON.stringify({ query }) },
  );
  // searchStream may return an array of response chunks.
  const chunks = Array.isArray(res) ? res : [res];
  const out: GadsRow[] = [];
  for (const c of chunks) {
    if (c.results) out.push(...c.results);
  }
  return out;
}

export async function syncGoogleAds(supabase: SupabaseClient): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = { source: 'google_ads', synced: 0, errors: [], durationMs: 0 };

  const { data: integration } = await supabase
    .from('integrations')
    .select('refresh_token')
    .eq('provider', 'google_ads')
    .maybeSingle();
  if (!integration?.refresh_token) {
    result.errors.push('google_ads not connected');
    result.durationMs = Date.now() - start;
    return result;
  }

  let customerId: string;
  try {
    customerId = getCustomerId();
  } catch (e) {
    result.errors.push((e as Error).message);
    result.durationMs = Date.now() - start;
    return result;
  }

  // ---- 1. Campaigns ----
  const campaignIdMap = new Map<string, string>(); // ext_id → uuid
  try {
    const rows = await gaql(
      customerId,
      `SELECT campaign.id, campaign.name, campaign.status,
              campaign.advertising_channel_type, campaign.bidding_strategy_type,
              campaign.start_date, campaign.end_date,
              campaign_budget.amount_micros, campaign_budget.delivery_method,
              campaign.maximize_conversion_value.target_roas,
              campaign.target_cpa.target_cpa_micros
         FROM campaign
         WHERE campaign.status IN ('ENABLED', 'PAUSED', 'REMOVED')`,
    );
    for (const r of rows) {
      const c = r.campaign;
      if (!c) continue;
      const targetRoas = c.maximizeConversionValue?.targetRoas;
      const targetCpa = c.targetCpa?.targetCpaMicros
        ? fromMicros(c.targetCpa.targetCpaMicros)
        : null;
      const { data: upserted } = await supabase
        .from('ad_campaigns')
        .upsert(
          {
            source: 'google_ads',
            external_id: c.id,
            name: c.name,
            status: c.status.toLowerCase(),
            channel_type: c.advertisingChannelType,
            bidding_strategy: c.biddingStrategyType,
            start_date: c.startDate ?? null,
            end_date: c.endDate ?? null,
            daily_budget: fromMicros(r.campaignBudget?.amountMicros),
            target_roas: targetRoas ?? null,
            target_cpa: targetCpa,
            raw_data: r as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'source,external_id' },
        )
        .select('id, external_id')
        .single();
      if (upserted) campaignIdMap.set(upserted.external_id, upserted.id);
      result.synced++;
    }
  } catch (e) {
    result.errors.push(`campaigns: ${(e as Error).message}`);
  }

  // ---- 2. Ad groups ----
  const adGroupIdMap = new Map<string, { id: string; campaign_id: string }>();
  try {
    const rows = await gaql(
      customerId,
      `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.campaign
         FROM ad_group
         WHERE ad_group.status IN ('ENABLED', 'PAUSED')`,
    );
    for (const r of rows) {
      const g = r.adGroup;
      if (!g) continue;
      const campaignExt = g.campaign?.split('/').pop();
      const campaignUuid = campaignExt ? campaignIdMap.get(campaignExt) : null;
      if (!campaignUuid) continue;
      const { data: upserted } = await supabase
        .from('ad_ad_groups')
        .upsert(
          {
            campaign_id: campaignUuid,
            external_id: g.id,
            name: g.name,
            status: g.status.toLowerCase(),
            raw_data: r as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'campaign_id,external_id' },
        )
        .select('id, external_id')
        .single();
      if (upserted) adGroupIdMap.set(upserted.external_id, { id: upserted.id, campaign_id: campaignUuid });
    }
  } catch (e) {
    result.errors.push(`ad_groups: ${(e as Error).message}`);
  }

  // ---- 3. Ads (responsive search ads + PMax assets, lightweight) ----
  try {
    const rows = await gaql(
      customerId,
      `SELECT ad_group_ad.ad.id, ad_group_ad.ad.type,
              ad_group_ad.ad.final_urls,
              ad_group_ad.ad.responsive_search_ad.headlines,
              ad_group_ad.ad.responsive_search_ad.descriptions,
              ad_group_ad.status, ad_group_ad.ad_group
         FROM ad_group_ad
         WHERE ad_group_ad.status IN ('ENABLED', 'PAUSED')`,
    );
    for (const r of rows) {
      const a = r.adGroupAd;
      if (!a) continue;
      const adGroupExt = a.adGroup?.split('/').pop();
      const adGroupRow = adGroupExt ? adGroupIdMap.get(adGroupExt) : null;
      if (!adGroupRow) continue;
      const headlines = (a.ad.responsiveSearchAd?.headlines ?? []).map((h) => h.text);
      const descriptions = (a.ad.responsiveSearchAd?.descriptions ?? []).map((d) => d.text);
      await supabase
        .from('ad_creatives')
        .upsert(
          {
            ad_group_id: adGroupRow.id,
            campaign_id: adGroupRow.campaign_id,
            external_id: a.ad.id,
            ad_type: a.ad.type,
            status: a.status.toLowerCase(),
            headlines,
            descriptions,
            final_url: a.ad.finalUrls?.[0] ?? null,
            raw_data: r as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'external_id' },
        );
    }
  } catch (e) {
    result.errors.push(`ads: ${(e as Error).message}`);
  }

  // ---- 4. Daily metrics, last 30 days ----
  try {
    const rows = await gaql(
      customerId,
      `SELECT campaign.id, segments.date,
              metrics.impressions, metrics.clicks, metrics.cost_micros,
              metrics.conversions, metrics.conversions_value
         FROM campaign
         WHERE segments.date DURING LAST_30_DAYS`,
    );
    for (const r of rows) {
      const extId = r.campaign?.id;
      const date = r.segments?.date;
      if (!extId || !date) continue;
      const uuid = campaignIdMap.get(extId);
      if (!uuid) continue;
      await supabase
        .from('ad_metrics_daily')
        .upsert(
          {
            campaign_id: uuid,
            date,
            impressions: Number(r.metrics?.impressions ?? 0),
            clicks: Number(r.metrics?.clicks ?? 0),
            cost: fromMicros(r.metrics?.costMicros),
            conversions: Number(r.metrics?.conversions ?? 0),
            conversion_value: Number(r.metrics?.conversionsValue ?? 0),
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'campaign_id,date' },
        );
    }
  } catch (e) {
    result.errors.push(`metrics: ${(e as Error).message}`);
  }

  result.durationMs = Date.now() - start;
  return result;
}
