import { createHmac, timingSafeEqual } from 'node:crypto';
import { APP_URL } from './app-url';

type LeadPublicPurpose = 'proposal' | 'stop';

function getSigningSecret(): string | null {
  return (
    process.env.LEAD_PUBLIC_LINK_SECRET ||
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET ||
    null
  );
}

export function createLeadPublicToken(
  leadId: string,
  purpose: LeadPublicPurpose,
): string | null {
  const secret = getSigningSecret();
  if (!secret) return null;
  return createHmac('sha256', secret)
    .update(`${purpose}:${leadId}`)
    .digest('base64url');
}

export function verifyLeadPublicToken(
  leadId: string,
  purpose: LeadPublicPurpose,
  token: string,
): boolean {
  const expected = createLeadPublicToken(leadId, purpose);
  if (!expected) return false;
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);
  return (
    expectedBuffer.length === tokenBuffer.length &&
    timingSafeEqual(expectedBuffer, tokenBuffer)
  );
}

export function buildLeadProposalUrl(leadId?: string | null): string {
  if (!leadId) return `${APP_URL}/it/b2b#richiedi-proposta`;
  const token = createLeadPublicToken(leadId, 'proposal');
  if (!token) return `${APP_URL}/it/b2b#richiedi-proposta`;
  const params = new URLSearchParams({ lead: leadId, token });
  return `${APP_URL}/it/b2b?${params.toString()}#richiedi-proposta`;
}

export function buildLeadStopUrl(leadId?: string | null): string | null {
  if (!leadId) return null;
  const token = createLeadPublicToken(leadId, 'stop');
  if (!token) return null;
  const params = new URLSearchParams({ lead: leadId, token });
  return `${APP_URL}/it/b2b/stop?${params.toString()}`;
}
