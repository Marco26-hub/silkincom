import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/app-url';

export default function robots(): MetadataRoute.Robots {
  const denied = ['/admin/', '/api/', '/account/', '/checkout/', '/cart/', '/(auth)/'];
  // GEO: tutti i principali AI crawler ammessi (visibilità in ChatGPT, Claude, Perplexity, Gemini, Bing Copilot, Meta AI)
  const aiBots = [
    'GPTBot',
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
      { userAgent: 'Googlebot', allow: feedAllow, disallow: ['/admin/', '/api/'] },
      { userAgent: 'Bingbot', allow: feedAllow, disallow: ['/admin/', '/api/'] },
      ...aiBots.map((ua) => ({ userAgent: ua, allow: '/', disallow: ['/admin/', '/api/', '/account/', '/checkout/'] })),
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
