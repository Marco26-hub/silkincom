import { createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'dev-secret-change-in-production';
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24h

function sign(token: string, timestamp: string): string {
  const hmac = createHmac('sha256', CSRF_SECRET);
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
