/**
 * Signed review tokens — let a customer who received the post-delivery review
 * email leave a *verified* review WITHOUT creating an account (most checkouts
 * are guest). The token binds the recipient email to the product slug and is
 * HMAC-signed, so it can't be forged; the review is still admin-moderated.
 */
import crypto from 'crypto';

function secret(): string {
  return process.env.REVIEW_TOKEN_SECRET || process.env.CRON_SECRET || '';
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

export function signReviewToken(email: string, slug: string): string {
  const payload = Buffer.from(JSON.stringify({ e: email, s: slug })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Returns the bound email if the token is valid for `slug`, else null. */
export function verifyReviewToken(token: string | null | undefined, slug: string): string | null {
  if (!token || !secret()) return null;
  const [payload, mac] = token.split('.');
  if (!payload || !mac) return null;
  // Constant-time compare to avoid timing leaks.
  const expected = sign(payload);
  if (expected.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(mac))) {
    return null;
  }
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!obj || obj.s !== slug || typeof obj.e !== 'string') return null;
    return obj.e;
  } catch {
    return null;
  }
}
