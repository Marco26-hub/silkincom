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
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: denied },
      { userAgent: 'Googlebot', allow: '/', disallow: ['/admin/', '/api/'] },
      { userAgent: 'Bingbot', allow: '/', disallow: ['/admin/', '/api/'] },
      ...aiBots.map((ua) => ({ userAgent: ua, allow: '/', disallow: ['/admin/', '/api/', '/account/', '/checkout/'] })),
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
