import { createHmac, randomBytes } from 'crypto';

// CSRF_SECRET must come from the environment. In production a missing
// secret used to silently fall back to a hard-coded string, which any
// attacker reading the source could use to forge tokens. Now: refuse to
// start without it in production; in dev/test fall back to a random per-
// process value so local work still functions (tokens become invalid on
// process restart, which is the desired tradeoff).
let cachedSecret: string | null = null;
function getCsrfSecret(): string {
  if (cachedSecret) return cachedSecret;
  const env = process.env.CSRF_SECRET?.trim();
  if (env && env.length >= 16) {
    cachedSecret = env;
    return cachedSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CSRF_SECRET non configurato (o troppo corto, min 16 char). Imposta una secret >=32 char in Vercel env e ridepoia.'
    );
  }
  // Dev / test fallback — random per process, never logged.
  cachedSecret = randomBytes(32).toString('hex');
  return cachedSecret;
}

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

function sign(token: string, timestamp: string): string {
  const hmac = createHmac('sha256', getCsrfSecret());
  hmac.update(`${token}:${timestamp}`);
  return hmac.digest('hex');
}

export function generateCsrfToken(): string {
  const token = crypto.randomUUID();
  const timestamp = Date.now().toString();
  const signature = sign(token, timestamp);
  return `${token}.${timestamp}.${signature}`;
}

export function validateCsrfToken(tokenString: string): boolean {
  try {
    const [token, timestamp, signature] = tokenString.split('.');
    if (!token || !timestamp || !signature) return false;

    const ts = Number(timestamp);
    const now = Date.now();
    if (now - ts > TOKEN_EXPIRY_MS) return false;

    const expectedSig = sign(token, timestamp);
    return signature === expectedSig;
  } catch {
    return false;
  }
}
