/**
 * Canonical site URL resolver.
 *
 * The site is deployed on Vercel with the production custom domain
 * `www.silkincom.com`. Until the env var on Vercel is updated, the
 * `NEXT_PUBLIC_APP_URL` setting may still point at the preview URL
 * (`silkincom.vercel.app`). That breaks two things at once:
 *
 *   1) **Email deliverability**. Gmail and other inbox providers compare the
 *      sending domain (silkincom.com via Resend) to the URLs in the email
 *      body. A mismatch (silkincom.com → silkincom.vercel.app) trips the
 *      spam filter; Resend itself surfaces this as a "NEEDS ATTENTION:
 *      Ensure link URLs match sending domain" insight.
 *
 *   2) **SEO**. canonical, hreflang, sitemap, schema @id, llms.txt and the
 *      Google Merchant feed all emit absolute URLs from this same env var.
 *      A vercel.app preview leaks into search engines and splits authority
 *      between two domains.
 *
 * Centralising the resolution here means every consumer (email templates,
 * sitemap, schema, llms.txt, etc.) gets the same canonical URL even when
 * the env var is misconfigured. Any custom production domain other than a
 * Vercel preview is honoured as-is.
 */

const PRODUCTION_FALLBACK = 'https://www.silkincom.com';

function resolveAppUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env && !/vercel\.app/i.test(env)) {
    return env.replace(/\/$/, '');
  }
  return PRODUCTION_FALLBACK;
}

export const APP_URL = resolveAppUrl();
