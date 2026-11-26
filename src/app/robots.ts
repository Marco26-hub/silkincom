import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/app-url';
import { LOCALES } from '@/i18n/routing';

// Force a fully static robots.txt (no per-request serverless work) so crawlers
// and Lighthouse always download it instantly.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const privatePaths = ['admin', 'api', 'account', 'checkout', 'cart', 'carrello', 'login', 'registrati'];
  const denied = ['', ...LOCALES.map(locale => `/${locale}`)]
    .flatMap(prefix => privatePaths.map(path => `${prefix}/${path}`));
  // GEO: tutti i principali AI crawler ammessi (visibilità in ChatGPT, Claude, Perplexity, Gemini, Bing Copilot, Meta AI)
  const aiBots = [
    'ChatGPT-User',
    'OAI-SearchBot',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
    'cohere-ai',
    'Bytespider',
    'Amazonbot',
    'Meta-ExternalAgent',
    'FacebookBot',
    'DuckAssistBot',
    'YouBot',
    'Diffbot',
  ];
  // The Google Merchant / Shopping product feed lives under /api/ but must stay
  // crawlable/fetchable (free product listings + Merchant Center scheduled fetch
  // respect robots.txt). A more-specific Allow overrides the /api/ Disallow.
  const feedAllow = ['/', '/api/google-merchant/feed.xml'];
  return {
    rules: [
      { userAgent: '*', allow: feedAllow, disallow: denied },
      { userAgent: 'Googlebot', allow: feedAllow, disallow: denied },
      { userAgent: 'Bingbot', allow: feedAllow, disallow: denied },
      ...aiBots.map((ua) => ({ userAgent: ua, allow: feedAllow, disallow: denied })),
      // GPTBot controls training; OAI-SearchBot controls search discovery.
      // Preserve the existing training permission as a separate policy.
      { userAgent: 'GPTBot', allow: feedAllow, disallow: denied },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
