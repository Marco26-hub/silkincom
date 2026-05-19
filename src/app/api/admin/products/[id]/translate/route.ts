import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdminApi, forbidden } from '@/lib/admin-api';
import { logAdminAction } from '@/lib/audit';
import { revalidateCatalog } from '@/lib/revalidate';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Italian is the source; these are the 6 target locales filled in *_i18n.
const TARGET_LANGS: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  nl: 'Dutch',
};

const MODEL = process.env.TRANSLATE_MODEL || 'claude-3-5-haiku-latest';

type Fields = { name: string; description: string; composition: string };

async function translateFields(targetLang: string, fields: Fields): Promise<Fields> {
  const system =
    `You translate content for SILKinCOM, a luxury silk and cashmere accessories brand, Made in Como, Italy. ` +
    `Translate from Italian into ${targetLang}. Use a premium, editorial tone. ` +
    `Keep brand names (SILKinCOM, Como) unchanged; render "Lago di Como" with the natural local name for Lake Como. ` +
    `Return ONLY a JSON object with keys "name", "description", "composition" — no prose, no code fence.`;
  const user =
    `Translate these Italian product fields to ${targetLang}. Return JSON {name, description, composition}.\n\n` +
    JSON.stringify(fields);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  let text = (json.content?.[0]?.text || '').trim();
  if (text.startsWith('```')) text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(text) as Fields;
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(['admin', 'super_admin', 'editor']);
  if (!auth.ok) return forbidden(auth.status);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY non configurata sul server' }, { status: 500 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: product, error: readErr } = await supabase
    .from('products')
    .select('id, name, description_long, composition')
    .eq('id', id)
    .single();
  if (readErr || !product) return NextResponse.json({ error: 'Prodotto non trovato' }, { status: 404 });

  const source: Fields = {
    name: product.name || '',
    description: product.description_long || '',
    composition: product.composition || '',
  };

  // Italian is stored as the `it` key alongside the translations.
  const nameI18n: Record<string, string> = { it: source.name };
  const descI18n: Record<string, string> = { it: source.description };
  const compI18n: Record<string, string> = { it: source.composition };

  try {
    const results = await Promise.all(
      Object.entries(TARGET_LANGS).map(async ([loc, langName]) => ({
        loc,
        t: await translateFields(langName, source),
      })),
    );
    for (const { loc, t } of results) {
      nameI18n[loc] = t.name;
      descI18n[loc] = t.description;
      compI18n[loc] = t.composition;
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Traduzione fallita: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const { error: updErr } = await supabase
    .from('products')
    .update({
      name_i18n: nameI18n,
      description_long_i18n: descI18n,
      composition_i18n: compI18n,
    })
    .eq('id', id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  await logAdminAction(auth.userId, 'translate_product', 'product', id, {
    languages: Object.keys(TARGET_LANGS),
  });
  revalidateCatalog();

  return NextResponse.json({ ok: true, languages: Object.keys(TARGET_LANGS) });
}
