// Server-only loader for generic home page CMS content.
// Two domains:
//   - home_sections (brand_story, editorial_banner, instagram_feed) → getHomeSection
//   - materials (5 home cards) → getHomeMaterials
//
// Uses createPublicClient inside unstable_cache. Admin mutations call
// revalidateHomeSections / revalidateHomeMaterials in src/lib/revalidate.ts.

import { unstable_cache } from 'next/cache';
import { createPublicClient } from '@/lib/supabase/server';
import type { Locale } from '@/i18n/routing';

type I18nMap = Partial<Record<string, string>> | null;

const VERIFIED_HOME_COPY: Record<string, Record<string, string>> = {
  madeInComoDesc: {
    it: 'Design e confezione nel distretto tessile di Como.', en: 'Design and making in the Como textile district.',
    es: 'Diseño y confección en el distrito textil de Como.', fr: 'Design et confection dans le district textile de Côme.',
    de: 'Design und Fertigung im Textilbezirk von Como.', pt: 'Design e confeção no distrito têxtil de Como.',
    nl: 'Ontwerp en vervaardiging in het textieldistrict van Como.',
  },
  returnsTitle: {
    it: 'Recesso entro 14 giorni', en: '14-day right of withdrawal', es: 'Desistimiento en 14 días', fr: 'Rétractation sous 14 jours',
    de: '14 Tage Widerrufsrecht', pt: 'Livre resolução em 14 dias', nl: '14 dagen bedenktijd',
  },
  returnsDesc: {
    it: 'Recesso: spedizione a carico del cliente. Difetti o errori SILKinCOM: reso gratuito.', en: 'Withdrawal: return shipping is paid by the customer. SILKinCOM faults or errors: free return.',
    es: 'Desistimiento: envío a cargo del cliente. Defectos o errores de SILKinCOM: devolución gratuita.', fr: 'Rétractation : retour à la charge du client. Défaut ou erreur SILKinCOM : retour offert.',
    de: 'Widerruf: Rücksendung auf Kosten des Kunden. SILKinCOM-Mängel oder -Fehler: kostenlose Rückgabe.', pt: 'Livre resolução: envio a cargo do cliente. Defeitos ou erros SILKinCOM: devolução gratuita.',
    nl: 'Bedenktijd: retourzending voor rekening van de klant. SILKinCOM-gebrek of -fout: gratis retour.',
  },
  announcementOrigin: {
    it: 'Design e confezione nel distretto tessile di Como', en: 'Designed and made in the Como textile district',
    es: 'Diseñado y confeccionado en el distrito textil de Como', fr: 'Dessiné et confectionné dans le district textile de Côme',
    de: 'Entworfen und gefertigt im Textilbezirk von Como', pt: 'Desenhado e confecionado no distrito têxtil de Como',
    nl: 'Ontworpen en gemaakt in het textieldistrict van Como',
  },
  announcementReturns: {
    it: 'Recesso entro 14 giorni dalla consegna', en: 'Right of withdrawal within 14 days of delivery',
    es: 'Desistimiento en 14 días desde la entrega', fr: 'Rétractation sous 14 jours après la livraison',
    de: 'Widerrufsrecht innerhalb von 14 Tagen nach Lieferung', pt: 'Livre resolução em 14 dias após a entrega',
    nl: '14 dagen bedenktijd na levering',
  },
};

function pickI18n(map: I18nMap, locale: string, fallback = ''): string {
  if (!map) return fallback;
  return map[locale] || map.en || map.it || fallback;
}

// ---------- HOME_SECTIONS ----------

export type HomeSectionImage = {
  url: string;
  storage_path: string;
  alt_i18n: Record<string, string>;
};

export type HomeSectionRow = {
  id: string;
  section_key: string;
  content_i18n: Record<string, I18nMap>;
  images: HomeSectionImage[];
  social_links: Record<string, string>;
  is_active: boolean;
};

export type HomeSectionLocalized = {
  id: string;
  sectionKey: string;
  content: Record<string, string>;
  images: { url: string; alt: string }[];
  socialLinks: Record<string, string>;
};

async function fetchSection(section_key: string): Promise<HomeSectionRow | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('home_sections')
    .select('*')
    .eq('section_key', section_key)
    .eq('is_active', true)
    .maybeSingle();
  if (error) {
    console.error(`home_sections fetch (${section_key})`, error);
    return null;
  }
  const row = (data as HomeSectionRow) || null;
  if (!row) return null;

  // Sanitize the full CMS payload before it enters Next's data cache. This
  // prevents stale claims from appearing even inside the serialized RSC data
  // read by crawlers, not only in the visible localized copy.
  const contentI18n = { ...(row.content_i18n || {}) };
  if (section_key === 'announcement_bar') {
    contentI18n.msg3 = VERIFIED_HOME_COPY.announcementOrigin;
    contentI18n.msg4 = VERIFIED_HOME_COPY.announcementReturns;
  }
  if (section_key === 'value_props') {
    contentI18n.madeInComoDesc = VERIFIED_HOME_COPY.madeInComoDesc;
    contentI18n.returnsTitle = VERIFIED_HOME_COPY.returnsTitle;
    contentI18n.returnsDesc = VERIFIED_HOME_COPY.returnsDesc;
  }
  return { ...row, content_i18n: contentI18n };
}

const getCachedSection = (key: string) =>
  unstable_cache(
    () => fetchSection(key),
    ['home-section', key],
    { revalidate: 60, tags: ['home-sections', `home-section:${key}`] }
  )();

export async function getHomeSection(section_key: string, locale: Locale | string): Promise<HomeSectionLocalized | null> {
  const row = await getCachedSection(section_key);
  if (!row) return null;
  const localeKey = String(locale);
  const content: Record<string, string> = {};
  for (const [k, v] of Object.entries(row.content_i18n || {})) {
    content[k] = pickI18n(v, localeKey);
  }
  if (section_key === 'announcement_bar') {
    content.msg3 = pickI18n(VERIFIED_HOME_COPY.announcementOrigin, localeKey);
    content.msg4 = pickI18n(VERIFIED_HOME_COPY.announcementReturns, localeKey);
  }
  if (section_key === 'value_props') {
    content.madeInComoDesc = pickI18n(VERIFIED_HOME_COPY.madeInComoDesc, localeKey);
    content.returnsTitle = pickI18n(VERIFIED_HOME_COPY.returnsTitle, localeKey);
    content.returnsDesc = pickI18n(VERIFIED_HOME_COPY.returnsDesc, localeKey);
  }
  const images = (row.images || []).map((img) => ({
    url: img.url,
    alt: pickI18n(img.alt_i18n, localeKey),
  }));
  return {
    id: row.id,
    sectionKey: row.section_key,
    content,
    images,
    socialLinks: row.social_links || {},
  };
}

// ---------- MATERIALS ----------

export type MaterialRow = {
  id: string;
  slug: string | null;
  code: string | null;
  href: string | null;
  image_url: string | null;
  storage_path: string | null;
  display_order: number | null;
  is_active: boolean;
  name_i18n: I18nMap;
  description_i18n: I18nMap;
  origin_title_i18n: I18nMap;
  origin_body_i18n: I18nMap;
  characteristics_title_i18n: I18nMap;
  characteristics_body_i18n: I18nMap;
  benefit_title_i18n: I18nMap;
  benefit_body_i18n: I18nMap;
};

export type HomeMaterialCard = {
  id: string;
  slug: string;
  code: string;
  href: string;
  image: string;
  name: string;
  description: string;
  tabs: {
    origine: { title: string; body: string };
    caratteristiche: { title: string; body: string };
    beneficio: { title: string; body: string };
  };
};

async function fetchMaterials(): Promise<MaterialRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from('materials')
    .select(`id, slug, code, href, image_url, storage_path, display_order, is_active,
             name_i18n, description_i18n,
             origin_title_i18n, origin_body_i18n,
             characteristics_title_i18n, characteristics_body_i18n,
             benefit_title_i18n, benefit_body_i18n`)
    .not('slug', 'is', null)
    .eq('is_active', true)
    .order('display_order', { ascending: true, nullsFirst: false });
  if (error) {
    console.error('home_materials fetch', error);
    return [];
  }
  return (data as MaterialRow[]) || [];
}

const getCachedMaterials = unstable_cache(
  fetchMaterials,
  ['home-materials'],
  { revalidate: 60, tags: ['home-materials'] }
);

function localizeMaterial(r: MaterialRow, locale: string): HomeMaterialCard {
  return {
    id: r.id,
    slug: r.slug || '',
    code: r.code || '',
    href: r.href || `/materiali#${r.slug || ''}`,
    image: r.image_url || '',
    name: pickI18n(r.name_i18n, locale, r.slug || ''),
    description: pickI18n(r.description_i18n, locale),
    tabs: {
      origine: {
        title: pickI18n(r.origin_title_i18n, locale),
        body: pickI18n(r.origin_body_i18n, locale),
      },
      caratteristiche: {
        title: pickI18n(r.characteristics_title_i18n, locale),
        body: pickI18n(r.characteristics_body_i18n, locale),
      },
      beneficio: {
        title: pickI18n(r.benefit_title_i18n, locale),
        body: pickI18n(r.benefit_body_i18n, locale),
      },
    },
  };
}

export async function getHomeMaterials(locale: Locale | string): Promise<HomeMaterialCard[]> {
  const rows = await getCachedMaterials();
  return rows.map((r) => localizeMaterial(r, String(locale)));
}
