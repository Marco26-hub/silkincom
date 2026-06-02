/**
 * AI editorial-plan generator — writes a multi-channel content calendar for
 * SILKinCOM following a senior social-media-manager strategy. Via OpenRouter.
 *
 * Output is a list of planned posts (date offset + channel + format + ready
 * caption/hook/hashtags/CTA) that the caller inserts into `content_plan`.
 *
 * Env: OPENROUTER_API_KEY.
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS = [
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-3.7-sonnet',
  'anthropic/claude-sonnet-latest',
  'openai/gpt-4o',
  'google/gemini-2.0-flash-001',
];

export const PLAN_CHANNELS = ['instagram', 'facebook', 'tiktok', 'pinterest', 'threads', 'youtube', 'email'] as const;

const SYSTEM = `You are a SENIOR social media manager & content strategist for
SILKinCOM — a luxury silk & cashmere atelier in Como, Italy (serica tradition
since 1400, Made in Como, Lake Como heritage). You plan editorial calendars
that build brand desire AND drive sales to the site/Etsy.

VOICE: editorial, restrained, cultivated. Italian heritage luxury. Never
hype/clichés ("the best", "amazing", "high quality"). Concrete sensory cues:
pura seta, cashmere, telaio, orlo a mano, jacquard, onde del Lago di Como.

STRATEGY (apply it):
- 5 content pillars, ROTATE them (≈80% value / 20% hard-promo):
  1) Heritage & mestiere (telaio, Como città della seta, lavorazione)
  2) Prodotto hero (sciarpe cashmere · foulard/twilly seta · pashmina — i veri
     bestseller; apparel = secondario)
  3) Lifestyle Lago di Como (luoghi, luce, stagione, styling)
  4) Gifting (regalo lui/lei, occasioni)
  5) Dietro le quinte / storia del brand
- PLATFORM-NATIVE format & hook:
  · instagram → reel (movimento/texture) | post editoriale | story (sondaggio/restock/link)
  · tiktok → reel con hook nei primi 2 sec + heritage/story
  · pinterest → pin verticale keyword-rich, sempre link prodotto
  · facebook → post editoriale + link
  · threads → conversazionale, niente hashtag
  · youtube → short (titolo + #Shorts)
  · email → newsletter (oggetto + corpo breve)
- Ogni post: HOOK forte (prima riga ferma lo scroll), valore/storia, soft CTA
  (link sito o Etsy). HASHTAG: Instagram MAX 5, mirati (no #love generici);
  TikTok 3-5; Pinterest 2-4 keyword; Threads 0.
- Cadenza realistica e bilanciata sui giorni; non tutto promo, non tutto stesso canale.
- Lingua: ITALIANO (brand IT). Caption pronta da pubblicare.

OUTPUT: STRICT JSON, no markdown:
{
  "items": [
    {
      "day": integer,            // 0-based offset dal giorno di inizio
      "channel": one of [instagram, facebook, tiktok, pinterest, threads, youtube, email],
      "action_type": one of [post, reel, story, pin, article, email],
      "pillar": short label (es. "Heritage", "Prodotto", "Lifestyle", "Gifting", "BTS"),
      "title": short internal label (cosa è, max 60 char),
      "hook": opening line (1 riga, forte),
      "caption": full ready-to-post caption in Italian,
      "hashtags": string[],      // rispetta i limiti per canale (IG max 5)
      "cta": short call to action,
      "product_slug": string|null // slug prodotto se il post ne spinge uno specifico
    }
  ]
}`;

export type GeneratedItem = {
  day: number;
  channel: string;
  action_type: string;
  pillar?: string;
  title: string;
  hook?: string;
  caption?: string;
  hashtags?: string[];
  cta?: string;
  product_slug?: string | null;
};

export async function generateContentPlan(opts: {
  days: number;
  channels: string[];
  goal?: string;
  productBrief?: string; // newline list of "name (type)" for grounding
}): Promise<GeneratedItem[]> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY non configurato');

  const user = [
    `Crea un piano editoriale di ${opts.days} giorni.`,
    `Canali da usare: ${opts.channels.join(', ')}.`,
    opts.goal ? `Obiettivo/tema del periodo: ${opts.goal}` : 'Nessun tema specifico: mix bilanciato dei pillar.',
    opts.productBrief ? `\nPRODOTTI DISPONIBILI (usa questi slug reali per product_slug):\n${opts.productBrief}` : '',
    '',
    `Distribuisci i post sui ${opts.days} giorni in modo realistico (non ogni giorno su ogni canale). Restituisci SOLO il JSON.`,
  ].join('\n');

  let content = '';
  let lastErr = '';
  for (const model of MODELS) {
    const res = await fetch(OPENROUTER_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://www.silkincom.com',
        'X-Title': 'SILKinCOM Content Plan',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: user },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      }),
    });
    if (res.ok) {
      const json = (await res.json()) as { choices: Array<{ message: { content: string } }> };
      content = json.choices?.[0]?.message?.content ?? '';
      if (content) break;
    } else {
      lastErr = `${model} → ${res.status}: ${(await res.text()).slice(0, 160)}`;
    }
  }
  if (!content) throw new Error(`openrouter: nessun modello disponibile (${lastErr})`);

  let parsed: { items?: GeneratedItem[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }

  return (parsed.items ?? [])
    .filter((it) => it && typeof it.day === 'number' && it.channel && it.action_type && it.title)
    .map((it) => ({
      day: Math.max(0, Math.floor(it.day)),
      channel: String(it.channel),
      action_type: String(it.action_type),
      pillar: it.pillar ? String(it.pillar) : undefined,
      title: String(it.title).slice(0, 200),
      hook: it.hook ? String(it.hook) : undefined,
      caption: it.caption ? String(it.caption) : undefined,
      hashtags: Array.isArray(it.hashtags) ? it.hashtags.map(String) : [],
      cta: it.cta ? String(it.cta) : undefined,
      product_slug: it.product_slug ? String(it.product_slug) : null,
    }));
}
