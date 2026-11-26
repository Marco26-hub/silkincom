/** Public identity, metadata, feeds and email links share one canonical host.
 * Local and Vercel preview origins must not leak into these public resources. */
const CANONICAL_URL = 'https://www.silkincom.com';

const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
if (configured && configured !== CANONICAL_URL && configured !== 'https://silkincom.com') {
  console.warn('[app-url] Ignoring noncanonical NEXT_PUBLIC_APP_URL for public site links; using www.silkincom.com.');
}

export const APP_URL = CANONICAL_URL;
