import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.com';

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
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
