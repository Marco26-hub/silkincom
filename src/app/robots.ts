import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://silkincom.vercel.app';

export default function robots(): MetadataRoute.Robots {
  const denied = ['/admin/', '/api/', '/account/', '/checkout/', '/cart/', '/(auth)/'];
  // GEO: tutti i principali AI crawler ammessi (visibilità in ChatGPT, Claude, Perplexity, Gemini)
  const aiBots = ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'cohere-ai', 'anthropic-ai', 'Bytespider', 'Amazonbot'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: denied },
      { userAgent: 'Googlebot', allow: '/', disallow: ['/admin/', '/api/'] },
      ...aiBots.map((ua) => ({ userAgent: ua, allow: '/', disallow: ['/admin/', '/api/', '/account/', '/checkout/'] })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
