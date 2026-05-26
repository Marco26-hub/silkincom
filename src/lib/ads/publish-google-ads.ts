/**
 * Publish a draft campaign to Google Ads.
 *
 * Sequence the Ads API requires (each step is a separate mutate call):
 *   1. campaignBudgets — create the daily budget, get its resource name.
 *   2. campaigns       — create the campaign, link to budget, set bidding.
 *   3. adGroups        — create the default ad group under the campaign.
 *   4. adGroupAds      — create one Responsive Search Ad with the draft's
 *                        headlines + descriptions + final URL.
 *   5. adGroupCriteria — add the draft's keywords as exact-match criteria.
 *
 * All operations run within the same customer account; the developer token
 * + login-customer-id headers are set automatically by `gadsFetch`.
 *
 * Output: the new campaign's resource name + external id, which the caller
 * uses to upsert into `ad_campaigns` (so it shows up on /admin/ads as soon
 * as the next sync runs — or immediately, if we trigger one here).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { gadsFetch, getCustomerId } from '@/lib/google-ads/client';
import { syncGoogleAds } from '@/lib/ads/sync-google-ads';

type Draft = {
  id: string;
  name: string;
  channel_type: string | null;
  daily_budget: number | null;
  target_roas: number | null;
  target_cpa: number | null;
  bidding_strategy: string | null;
  final_url: string | null;
  headlines: string[];
  descriptions: string[];
  keywords: string[];
  product_slugs: string[];
};

export type PublishResult = {
  ok: boolean;
  campaign_resource_name?: string;
  external_id?: string;
  error?: string;
};

const toMicros = (eur: number) => Math.round(eur * 1_000_000);

async function mutate<T>(customerId: string, endpoint: string, body: unknown): Promise<T> {
  return gadsFetch<T>(`/customers/${customerId}/${endpoint}:mutate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function publishDraftToGoogleAds(
  supabase: SupabaseClient,
  draftId: string,
): Promise<PublishResult> {
  // ---- 0. Load draft + sanity checks ----
  const { data: draft } = await supabase
    .from('ad_drafts')
    .select('*')
    .eq('id', draftId)
    .single();
  if (!draft) return { ok: false, error: 'Bozza non trovata' };

  const d = draft as Draft;
  if (!d.daily_budget || d.daily_budget <= 0) return { ok: false, error: 'Budget giornaliero mancante' };
  if (!d.final_url) return { ok: false, error: 'Final URL mancante' };
  if (d.headlines.length < 3) return { ok: false, error: 'Almeno 3 titoli richiesti' };
  if (d.descriptions.length < 2) return { ok: false, error: 'Almeno 2 descrizioni richieste' };
  if (d.keywords.length === 0) return { ok: false, error: 'Almeno 1 keyword richiesta' };

  let customerId: string;
  try {
    customerId = getCustomerId();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const channelType = d.channel_type ?? 'SEARCH';

  try {
    // ---- 1. Budget ----
    const budgetRes = await mutate<{ results?: Array<{ resourceName: string }> }>(
      customerId,
      'campaignBudgets',
      {
        operations: [
          {
            create: {
              name: `${d.name} — Budget (${Date.now()})`,
              amountMicros: String(toMicros(d.daily_budget)),
              deliveryMethod: 'STANDARD',
              explicitlyShared: false,
            },
          },
        ],
      },
    );
    const budgetResource = budgetRes.results?.[0]?.resourceName;
    if (!budgetResource) throw new Error('Budget non creato');

    // ---- 2. Campaign ----
    const biddingStrategy = d.bidding_strategy ?? 'MAXIMIZE_CONVERSION_VALUE';
    const campaignBody: Record<string, unknown> = {
      name: d.name,
      status: 'PAUSED', // safety: never publish ENABLED. Admin toggles in
                       // Google Ads UI after a final review.
      advertisingChannelType: channelType,
      campaignBudget: budgetResource,
      networkSettings: {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
        targetPartnerSearchNetwork: false,
      },
    };
    if (biddingStrategy === 'MAXIMIZE_CONVERSION_VALUE') {
      campaignBody.maximizeConversionValue = d.target_roas
        ? { targetRoas: d.target_roas }
        : {};
    } else if (biddingStrategy === 'TARGET_CPA') {
      campaignBody.maximizeConversions = d.target_cpa
        ? { targetCpaMicros: String(toMicros(d.target_cpa)) }
        : {};
    }

    const campaignRes = await mutate<{ results?: Array<{ resourceName: string }> }>(
      customerId,
      'campaigns',
      { operations: [{ create: campaignBody }] },
    );
    const campaignResource = campaignRes.results?.[0]?.resourceName;
    if (!campaignResource) throw new Error('Campagna non creata');
    const externalId = campaignResource.split('/').pop() ?? '';

    // ---- 3. Ad group ----
    const adGroupRes = await mutate<{ results?: Array<{ resourceName: string }> }>(
      customerId,
      'adGroups',
      {
        operations: [
          {
            create: {
              name: `${d.name} — Ad Group`,
              campaign: campaignResource,
              type: channelType === 'SEARCH' ? 'SEARCH_STANDARD' : 'DISPLAY_STANDARD',
              status: 'ENABLED',
              cpcBidMicros: undefined, // bidding strategy lives at campaign level
            },
          },
        ],
      },
    );
    const adGroupResource = adGroupRes.results?.[0]?.resourceName;
    if (!adGroupResource) throw new Error('Ad group non creato');

    // ---- 4. Responsive Search Ad ----
    if (channelType === 'SEARCH') {
      await mutate(customerId, 'adGroupAds', {
        operations: [
          {
            create: {
              adGroup: adGroupResource,
              status: 'PAUSED',
              ad: {
                finalUrls: [d.final_url],
                responsiveSearchAd: {
                  headlines: d.headlines.slice(0, 15).map((h) => ({ text: h })),
                  descriptions: d.descriptions.slice(0, 4).map((d) => ({ text: d })),
                },
              },
            },
          },
        ],
      });

      // ---- 5. Keywords ----
      await mutate(customerId, 'adGroupCriteria', {
        operations: d.keywords.slice(0, 200).map((kw) => ({
          create: {
            adGroup: adGroupResource,
            status: 'ENABLED',
            keyword: { text: kw, matchType: 'PHRASE' },
          },
        })),
      });
    }

    // ---- 6. Mark draft published, trigger sync so /admin/ads picks it up ----
    await supabase
      .from('ad_drafts')
      .update({ status: 'published', updated_at: new Date().toISOString() })
      .eq('id', draftId);

    // Fire-and-forget sync (we await so the caller can return a populated
    // /admin/ads page right away).
    await syncGoogleAds(supabase).catch(() => undefined);

    return { ok: true, campaign_resource_name: campaignResource, external_id: externalId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
