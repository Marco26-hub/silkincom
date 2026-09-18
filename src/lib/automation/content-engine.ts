import { z } from 'zod';
import { slugify } from '@/lib/utils';
import { EDITORIAL_RULES, buildEditorialContext, lintBlogContent } from '@/lib/blog/editorial-standards';
import { getOpenRouterKey } from '@/lib/secrets/openrouter';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

export const socialAutomationInputSchema = z.object({
  campaign: z.string().min(3),
  platforms: z.array(z.enum(['instagram', 'facebook', 'tiktok', 'pinterest'])).default(['instagram']),
  productName: z.string().optional(),
  productUrl: z.string().url().optional(),
  notes: z.string().optional(),
  publishWindowHours: z.number().int().positive().default(72),
});

export const socialPostSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'tiktok', 'pinterest']),
  caption: z.string().min(20),
  hashtags: z.array(z.string()).default([]),
  cta: z.string().min(3),
  mediaPrompt: z.string().min(10),
  scheduledFor: z.string(),
});

export const blogAutomationInputSchema = z.object({
  topic: z.string().min(5),
  keywords: z.array(z.string()).default([]),
  productName: z.string().optional(),
  brief: z.string().optional(),
  tone: z.string().default('elegante, editoriale, premium'),
  minWords: z.number().int().min(400).max(2400).default(1200),
  categorySlug: z.string().default('collezioni'),
  featuredImageUrl: z.string().url().optional(),
});

export const blogDraftSchema = z.object({
  title: z.string().min(10),
  slug: z.string().min(3),
  excerpt: z.string().min(30),
  content: z.string().min(500),
  seoTitle: z.string().min(10),
  seoDescription: z.string().min(30),
});

export const productFromPhotosInputSchema = z.object({
  notes: z.string().optional(),
  productNameHint: z.string().optional(),
  priceHint: z.number().positive().optional(),
  imageUrls: z.array(z.string()).default([]),
  imageDataUrls: z.array(z.string()).default([]),
});

export const productDraftSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  sku: z.string().min(2),
  price: z.number().positive(),
  descriptionShort: z.string().min(20),
  descriptionLong: z.string().min(80),
  composition: z.string().min(3),
  dimensions: z.string().optional().default(''),
  careInstructions: z.string().default('Lavaggio a mano a freddo o dry clean.'),
  origin: z.string().default('Como, Italy'),
  imageLayout: z.object({
    heroImageIndex: z.number().int().nonnegative().default(0),
    galleryOrder: z.array(z.number().int().nonnegative()).default([0]),
    desktopRatio: z.string().default('4:5'),
    mobileRatio: z.string().default('4:5'),
    backgroundTone: z.string().default('warm-white'),
  }),
});

type SocialAutomationInput = z.input<typeof socialAutomationInputSchema>;
type BlogAutomationInput = z.input<typeof blogAutomationInputSchema>;
type ProductFromPhotosInput = z.input<typeof productFromPhotosInputSchema>;

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function safeJsonParse<T>(raw: string, schema: z.ZodType<T>): T | null {
  try {
    const json = JSON.parse(raw);
    const result = schema.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

async function runOpenAIJson<T>({
  system,
  user,
  schema,
}: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
}): Promise<T | null> {
  if (!hasOpenAIKey()) return null;

  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.65,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!resp.ok) return null;

  const payload = await resp.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') return null;

  return safeJsonParse(text, schema);
}

async function runOpenAIVisionJson<T>({
  system,
  text,
  imageDataUrls,
  schema,
}: {
  system: string;
  text: string;
  imageDataUrls: string[];
  schema: z.ZodType<T>;
}): Promise<T | null> {
  if (!hasOpenAIKey()) return null;

  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: 'text', text },
    ...imageDataUrls.map((url) => ({ type: 'image_url', image_url: { url } })),
  ];

  const resp = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.45,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content },
      ],
    }),
  });

  if (!resp.ok) return null;

  const payload = await resp.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== 'string') return null;

  return safeJsonParse(raw, schema);
}

export async function generateSocialPosts(input: SocialAutomationInput) {
  const parsed = socialAutomationInputSchema.parse(input);

  const now = Date.now();
  const stepMs = Math.floor((parsed.publishWindowHours * 3600 * 1000) / Math.max(parsed.platforms.length, 1));

  const aiSchema = z.object({
    posts: z.array(socialPostSchema).min(1),
  });

  const ai = await runOpenAIJson({
    system:
      'Sei un social media strategist luxury fashion. Scrivi in italiano premium, caldo, non urlato. Rispondi solo JSON valido.',
    user: JSON.stringify(parsed),
    schema: aiSchema,
  });

  if (ai?.posts?.length) return ai.posts;

  return parsed.platforms.map((platform, index) => ({
    platform,
    caption:
      `Nuovo capitolo SILKinCOM: ${parsed.campaign}. ${parsed.productName ? `Protagonista: ${parsed.productName}. ` : ''}` +
      'Design contemporaneo, filati pregiati, anima comasca.',
    hashtags: ['#silkincom', '#madeincomo', '#setaitaliana', '#cashmereluxury'],
    cta: parsed.productUrl ? `Scopri ora: ${parsed.productUrl}` : 'Scopri la collezione sul sito.',
    mediaPrompt:
      'Scatto editoriale luxury in luce naturale, texture seta/cashmere in primo piano, palette avorio e oro.',
    scheduledFor: new Date(now + index * stepMs).toISOString(),
  }));
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// Current OpenRouter slugs (checked 2026-09-18), all vision-capable; cross-vendor last.
const BLOG_MODELS = ['anthropic/claude-sonnet-5', 'anthropic/claude-sonnet-4.6', 'anthropic/claude-sonnet-4.5', 'openai/gpt-4.1'];

/**
 * Models often return JSON with raw line breaks inside string values (invalid
 * JSON). Escape control characters that sit inside strings, then parse.
 */
function parseLooseJson(text: string): unknown {
  const raw = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
  try {
    return JSON.parse(raw);
  } catch {
    let out = '';
    let inString = false;
    let escaped = false;
    for (const ch of raw) {
      if (inString) {
        if (escaped) { out += ch; escaped = false; continue; }
        if (ch === '\\') { out += ch; escaped = true; continue; }
        if (ch === '"') { inString = false; out += ch; continue; }
        if (ch === '\n') { out += '\\n'; continue; }
        if (ch === '\r') { out += '\\r'; continue; }
        if (ch === '\t') { out += '\\t'; continue; }
        out += ch;
      } else {
        if (ch === '"') inString = true;
        out += ch;
      }
    }
    return JSON.parse(out);
  }
}

// Accept snake_case keys too (seo_title → seoTitle): models drift on naming.
function camelKeys(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
      v,
    ]),
  );
}

/**
 * Tries each model in turn. Returns the parsed result, or the reason every
 * model failed so the admin sees what went wrong (credit, auth, bad JSON…).
 */
async function runOpenRouterJson<T>({
  system,
  user,
  schema,
  imageUrl,
}: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  /** Public image the model should look at (vision), e.g. the cover photo. */
  imageUrl?: string;
}): Promise<{ data: T | null; errors: string[] }> {
  const errors: string[] = [];
  const apiKey = await getOpenRouterKey();
  if (!apiKey) return { data: null, errors: ['chiave OpenRouter non configurata (Admin → Blog)'] };
  const userContent = imageUrl
    ? [{ type: 'text', text: user }, { type: 'image_url', image_url: { url: imageUrl } }]
    : user;

  for (const model of BLOG_MODELS) {
    let resp: Response;
    try {
      resp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://www.silkincom.com',
          'X-Title': 'SILKinCOM Blog Draft',
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          max_tokens: 6000,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userContent },
          ],
        }),
      });
    } catch (e) {
      errors.push(`${model}: rete (${(e as Error).message})`);
      continue;
    }
    if (!resp.ok) {
      errors.push(`${model}: HTTP ${resp.status} ${(await resp.text()).slice(0, 180)}`);
      continue;
    }

    const payload = await resp.json().catch(() => null);
    const text: unknown = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text) {
      errors.push(`${model}: risposta vuota${payload?.error ? ` (${JSON.stringify(payload.error).slice(0, 160)})` : ''}`);
      continue;
    }
    let json: unknown;
    try {
      json = camelKeys(parseLooseJson(text));
    } catch {
      errors.push(`${model}: JSON non valido`);
      continue;
    }
    const parsed = schema.safeParse(json);
    if (parsed.success) return { data: parsed.data, errors };
    errors.push(`${model}: campi non validi (${parsed.error.issues.map((i) => i.path.join('.') + ' ' + i.message).join('; ').slice(0, 160)})`);
  }
  return { data: null, errors };
}

/**
 * Italian draft written to the SILKinCOM editorial standard (see
 * src/lib/blog/editorial-standards.ts): live catalogue facts, real link
 * targets, renderer-safe markdown. Throws when no model answers — a
 * placeholder article saved as a draft is worse than a clear error.
 */
export async function generateBlogDraft(input: BlogAutomationInput) {
  const parsed = blogAutomationInputSchema.parse(input);
  const ctx = await buildEditorialContext();

  const user = [
    `ARGOMENTO: ${parsed.topic}`,
    parsed.brief ? `BRIEF (angolo, protagonista, pubblico): ${parsed.brief}` : '',
    parsed.productName ? `PRODOTTO PROTAGONISTA: ${parsed.productName}` : '',
    parsed.keywords.length ? `PAROLE CHIAVE: ${parsed.keywords.join(', ')}` : '',
    parsed.featuredImageUrl ? 'FOTO DI COPERTINA: allegata (vedi regole FOTO).' : '',
    `LUNGHEZZA MINIMA: ${parsed.minWords} parole`,
    '',
    ctx.text,
  ].filter(Boolean).join('\n');

  const openrouter = await runOpenRouterJson({
    system: EDITORIAL_RULES,
    user,
    schema: blogDraftSchema,
    imageUrl: parsed.featuredImageUrl,
  });
  const ai =
    openrouter.data ?? (await runOpenAIJson({ system: EDITORIAL_RULES, user, schema: blogDraftSchema }));
  if (!ai) {
    throw new Error(`Nessun modello AI ha prodotto una bozza valida — ${openrouter.errors.join(' | ')}`);
  }

  const { content, fixes } = lintBlogContent(ai.content, ctx.allowedPaths);
  const seoTitle = ai.seoTitle.length > 60
    ? `${ai.seoTitle.replace(/\s*\|\s*SILKinCOM\s*$/i, '').slice(0, 47).trim()} | SILKinCOM`
    : ai.seoTitle;

  return {
    ...ai,
    content,
    seoTitle,
    seoDescription: ai.seoDescription.slice(0, 160),
    slug: slugify(ai.slug || ai.title),
    fixes,
  };
}

export async function generateProductDraftFromPhotos(input: ProductFromPhotosInput) {
  const parsed = productFromPhotosInputSchema.parse(input);

  const ai = await runOpenAIVisionJson({
    system:
      'Sei un merchandiser e-commerce luxury. Analizza le foto e crea scheda prodotto completa in italiano. Rispondi in JSON valido.',
    text: JSON.stringify({
      notes: parsed.notes,
      productNameHint: parsed.productNameHint,
      priceHint: parsed.priceHint,
      imageUrls: parsed.imageUrls,
    }),
    imageDataUrls: parsed.imageDataUrls.slice(0, 6),
    schema: productDraftSchema,
  });

  if (ai) {
    return {
      ...ai,
      slug: slugify(ai.slug || ai.name),
    };
  }

  const baseName = parsed.productNameHint || 'Nuovo accessorio SILKinCOM';
  const name = baseName.trim();
  const slug = slugify(name);
  const nowCode = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const price = parsed.priceHint || 95;

  return {
    name,
    slug,
    sku: `AI-${nowCode}`,
    price,
    descriptionShort: 'Accessorio premium Made in Como, selezionato da analisi AI delle immagini.',
    descriptionLong:
      'Questo prodotto è stato inserito tramite workflow AI da foto mobile. Il team editoriale può rifinire copy, materiali e varianti prima della pubblicazione.',
    composition: 'Da verificare',
    dimensions: '',
    careInstructions: 'Lavaggio a mano a freddo o dry clean.',
    origin: 'Como, Italy',
    imageLayout: {
      heroImageIndex: 0,
      galleryOrder: [0, 1, 2, 3],
      desktopRatio: '4:5',
      mobileRatio: '4:5',
      backgroundTone: 'warm-white',
    },
  };
}
