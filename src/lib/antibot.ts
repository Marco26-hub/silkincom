import crypto from 'crypto';

/**
 * Lightweight anti-bot for public POST endpoints (checkout, contact, newsletter).
 *
 * Two independent layers, both cheap and dependency-free:
 *  1. Honeypot  — a hidden field real users never fill; any value ⇒ bot.
 *  2. Timing token — an HMAC-signed timestamp minted when the form/page loads
 *     (GET /api/antibot/token). A valid submission must echo it back, and it
 *     must be at least a couple of seconds old (humans take time to fill a form)
 *     and no older than an hour. Bots hitting the API directly have no valid
 *     token, so they're rejected before any order/row is created.
 *
 * Not bulletproof on its own (tokens aren't single-use — that needs shared
 * storage), but combined with per-IP rate limiting it stops the direct-API
 * order spam we were seeing. Runs only in the Node.js runtime (uses `crypto`).
 */

// No silent weak default: if no signing secret is configured we fail loudly
// (throws → 500) rather than silently minting forgeable tokens with a public
// constant. STRIPE_SECRET_KEY is present in any working deploy, so this only
// ever fires on a genuine env misconfiguration — which we WANT to surface.
function secret(): string {
  const s =
    process.env.ANTIBOT_SECRET ||
    process.env.STRIPE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (s) return s;
  // Production must never silently fall back to a public constant (forgeable
  // tokens). Fail loudly instead. In dev, warn loudly and use a throwaway key
  // so local testing works — noisy, not silent.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[antibot] no signing secret configured (set ANTIBOT_SECRET)');
  }
  console.warn('[antibot] no secret configured — using INSECURE dev-only fallback');
  return 'silkincom-antibot-dev-only-insecure';
}

// Hidden field names. If any arrives non-empty, it was filled by a bot.
const HONEYPOT_FIELDS = ['website', 'company_url', 'fax'];

export function mintFormToken(nowMs = Date.now()): string {
  const payload = Buffer.from(String(nowMs)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function honeypotTriggered(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return HONEYPOT_FIELDS.some(
    (f) => typeof b[f] === 'string' && (b[f] as string).trim().length > 0,
  );
}

type TokenOpts = { minMs?: number; maxMs?: number };

export function formTokenValid(token: unknown, opts: TokenOpts = {}): boolean {
  const minMs = opts.minMs ?? 2000; // submitted too fast ⇒ bot
  const maxMs = opts.maxMs ?? 60 * 60 * 1000; // stale ⇒ reject (1h)
  if (typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const ts = Number(Buffer.from(payload, 'base64url').toString());
  if (!Number.isFinite(ts)) return false;
  const age = Date.now() - ts;
  return age >= minMs && age <= maxMs;
}

/**
 * Combined gate. Returns an error descriptor to short-circuit the handler,
 * or null when the request looks human. Set requireToken:false to run
 * honeypot-only (e.g. an endpoint whose client can't mint a token yet).
 */
export function antibotGate(
  body: unknown,
  opts: { requireToken?: boolean } & TokenOpts = {},
): { status: number; error: string } | null {
  if (honeypotTriggered(body)) {
    return { status: 400, error: 'Richiesta non valida.' };
  }
  if (opts.requireToken ?? true) {
    const token = (body as Record<string, unknown> | null)?.antibot_token;
    if (!formTokenValid(token, opts)) {
      return { status: 403, error: 'Sessione scaduta. Ricarica la pagina e riprova.' };
    }
  }
  return null;
}
