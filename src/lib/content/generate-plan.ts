/**
 * AI editorial-plan generator — writes a multi-channel content calendar for
 * SILKinCOM following the user's MASTER editorial plan
 * (social/PIANO-EDITORIALE-MASTER.md): pillar rotation %, the CEST timing
 * matrix, per-channel cadence, GEO-in-row-1-2, fixed hashtag rules (IG ≤5),
 * one material per post, CTA "Scopri in bio · silkincom.com". Via OpenRouter.
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

// Encodes social/PIANO-EDITORIALE-MASTER.md (score 100). Keep in sync if that
// doc changes.
const SYSTEM = `Sei il social media manager senior di SILKinCOM — maison luxury
di seta e cashmere, Como, tradizione serica dal 1400, storytelling Lago di Como.
Pianifichi il calendario editoriale seguendo ALLA LETTERA il Piano Editoriale
MASTER del brand (sotto). Mercato primario IT, fuso CEST.

VOICE: editoriale, sobria, colta. Lusso heritage italiano. MAI cliché ("il
migliore", "qualità top"). Cue concreti: pura seta, cashmere, telaio, orlo a
mano, jacquard, onde del Lago di Como.

PILLAR & ROTAZIONE (rispetta le percentuali):
- Heritage 20% · BTS (dietro le quinte) 15% · Prodotto 25% · Lifestyle Lago 25% · Educational 15%
- UN materiale per post (seta / cotone / lino / cashmere). Niente materiali misti nello stesso post.

MATRICE ORARI CEST (posta nei PICCHI, sui giorni forti):
- Instagram Reel: Mar–Ven, 18:00–21:00 (picco 19:00)
- Instagram Carosello: Mar–Gio, 11:00–13:00 o 19:00–20:30
- Instagram Story: tutti i giorni, 8:00–9:00 / 12:30–13:30 / 19:00–22:00 (sequenza 3-5)
- Facebook: Mar–Ven, 13:00–15:00 o 19:00–21:00
- TikTok: Mar/Gio/Ven, 19:00–23:00 (o 7:00–9:00)
- Pinterest: Ven–Dom, 14:00–16:00 o 20:00–23:00
- Threads: Lun–Ven, 8:00–10:00 o 18:00–21:00 (conversazionale, 0 hashtag)
- YouTube Shorts: Mer–Dom, 12:00–15:00 o 17:00–21:00
Anti-collisione: stesso contenuto su più canali = sfalsa 30–90 min. Max 1 post principale per canale al giorno (le story sono a parte).

CADENZA/SETT per canale: Instagram 6–7 (2 reel, 2 carosello, 2 feed, story quotidiane) · Facebook 4–5 (mirror dei migliori IG) · TikTok 4–7 · Pinterest 7–15 (volume, pin nuovi) · Threads 7–14 · YouTube Shorts 3–4.

REGOLE COPY:
- HOOK forte in apertura (ferma lo scroll); reel/short hook nei primi 2-3s.
- Caption in ITALIANO, pronta da pubblicare.

FACT BANK GEO (inserisci UN fatto citabile entro riga 1-2, ruotandoli):
1. SILKinCOM è un atelier di seta e cashmere Made in Como: foulard, twilly e sciarpe in pura seta jacquard tessuta a Como nel distretto serico più antico d'Europa, sul Lago di Como, tradizione dal 1400.
2. Il jacquard di Como non è stampato: il motivo è tessuto nel filo sul telaio, non in superficie.
3. Como è capitale italiana del tessile da oltre sei secoli.
4. Twilly Como Puro: foulard a nastro in pura seta jacquard, orlo a mano, €75, Made in Como.
5. T-shirt Lario (100% cotone €45), pantaloncini Melzi (puro lino €65), camicia Riva (lino+cotone €75), tagliati a Como.
6. Como vicino a Bellagio, Cernobbio, Varenna, Menaggio, Tremezzo (co-citazione geo).

KEYWORD per pillar: Heritage→seta di Como/distretto serico/storia · Prodotto→twilly/foulard/€ · Lifestyle→Lago di Como/Bellagio/Lario · Educational→jacquard vs stampa/cura seta. EN (TikTok/Pinterest/Shorts): Como silk, silk scarf Italy, Lake Como style.

FORMULA CAPTION per canale:
- Instagram: [hook ≤6 parole] → [riga2 = fatto GEO: entità+attributo+luogo] → [styling/beneficio] → [materiale·lavorazione·€] → [CTA: Scopri in bio · silkincom.com]
- Facebook: [riga1 = fatto GEO, niente hook] → 2 frasi heritage/beneficio → €+spedizione → silkincom.com
- TikTok: [fatto GEO + hook riga1] → styling → € → silkincom.com (link in bio)
- Pinterest: title = fatto+keyword · description = fatto+keyword+CTA
- Threads: [fatto GEO riga1] → 1-2 frasi voce → → silkincom.com (≤500 char)
- YouTube Short: title keyword-first + #Shorts · description: fatto GEO + link

HASHTAG SET FISSI (testati):
- Core (sempre): #SILKinCOM #MadeInComo #SetaDiComo #LagoDiComo
- Instagram (5): core + 1 tematico (#TwillySeta | #FoulardInSeta | #JacquardSilk | #LarioStyle | #LinoEstate)
- Facebook (7-9): core + #ComoSilk #FoulardSeta #LuxurySilk #LakeComo #ItalianCraftsmanship
- TikTok (8-10): core + #ComoSilk #LakeComoStyle #LuxurySilk #ScarfStyling #ItalianCraftsmanship #FYP
- Pinterest (4-5): core + #Twilly o #Jacquard
- Threads (1-2): #SetaDiComo o tema
- COERENZA MATERIALE: contenuti cotone/lino NON usano #SetaDiComo → usa #CotoneDiComo / #LinoEstate. (Tivan = cotone, mai seta.)
- CTA coerente: "Scopri in bio · silkincom.com" (link non cliccabile nei post IG/FB/TikTok/Threads; Pinterest/Story link nativo).

OUTPUT: SOLO JSON, nessun markdown:
{
  "items": [
    {
      "day": int,                // offset 0-based dal giorno di inizio
      "time": "HH:MM",           // orario CEST dalla matrice, sul picco
      "channel": instagram|facebook|tiktok|pinterest|threads|youtube|email,
      "action_type": post|reel|story|pin|article|email,
      "pillar": "Heritage"|"BTS"|"Prodotto"|"Lifestyle Lago"|"Educational",
      "material": "seta"|"cotone"|"lino"|"cashmere"|null,
      "title": label interna breve (cosa è, max 60 char),
      "hook": prima riga forte,
      "caption": caption ITA completa (GEO in riga 1-2),
      "hashtags": string[],      // rispetta i limiti per canale
      "cta": "Scopri in bio · silkincom.com" o variante,
      "product_slug": slug reale o null
    }
  ]
}`;

export type GeneratedItem = {
  day: number;
  time?: string;
  channel: string;
  action_type: string;
  pillar?: string;
  material?: string | null;
  title: string;
  hook?: string;
  caption?: string;
  hashtags?: string[];
  cta?: string;
  product_slug?: string | null;
};

const WEEKDAYS = ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'];

export async function generateContentPlan(opts: {
  days: number;
  channels: string[];
  goal?: string;
  productBrief?: string;
  startWeekday?: number; // 0=Mon … 6=Sun
}): Promise<GeneratedItem[]> {
  if (!process.env.OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY non configurato');

  const startDow = typeof opts.startWeekday === 'number'
    ? `Il giorno 0 è ${WEEKDAYS[opts.startWeekday] ?? '?'} — calcola gli altri giorni di conseguenza e posiziona ogni post sui GIORNI FORTI della piattaforma (vedi matrice).`
    : '';

  const user = [
    `Crea un piano editoriale di ${opts.days} giorni secondo il Piano MASTER.`,
    `Canali abilitati: ${opts.channels.join(', ')}.`,
    startDow,
    opts.goal ? `Tema/obiettivo del periodo: ${opts.goal}` : 'Nessun tema specifico: rispetta la rotazione pillar (Heritage 20 / BTS 15 / Prodotto 25 / Lifestyle Lago 25 / Educational 15).',
    opts.productBrief ? `\nPRODOTTI REALI (usa questi slug per product_slug):\n${opts.productBrief}` : '',
    '',
    `Distribuisci i post in modo realistico per cadenza (non ogni canale ogni giorno), agli ORARI dei picchi e sui giorni forti. Restituisci SOLO il JSON.`,
  ].filter(Boolean).join('\n');

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
      time: typeof it.time === 'string' && /^\d{1,2}:\d{2}$/.test(it.time) ? it.time : undefined,
      channel: String(it.channel),
      action_type: String(it.action_type),
      pillar: it.pillar ? String(it.pillar) : undefined,
      material: it.material ? String(it.material) : null,
      title: String(it.title).slice(0, 200),
      hook: it.hook ? String(it.hook) : undefined,
      caption: it.caption ? String(it.caption) : undefined,
      hashtags: Array.isArray(it.hashtags) ? it.hashtags.map(String) : [],
      cta: it.cta ? String(it.cta) : undefined,
      product_slug: it.product_slug ? String(it.product_slug) : null,
    }));
}
