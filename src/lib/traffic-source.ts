// Observable referrals only. Google/Bing search traffic cannot reliably be
// split into AI and traditional results from the referrer alone.
const AI_HOSTS = ['chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com'];

export function referralSource(referrer: string): { source: string; medium: string } | null {
  if (!referrer) return null;
  let host: string;
  try { host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, ''); }
  catch { return null; }
  const isHost = (domain: string) => host === domain || host.endsWith(`.${domain}`);
  if (isHost('silkincom.com')) return null;
  if (AI_HOSTS.some(isHost)) return { source: host, medium: 'ai_assistant' };
  if (['instagram.com', 'facebook.com', 'threads.net', 'threads.com', 'tiktok.com', 'pinterest.com', 'youtube.com', 'linkedin.com', 't.co', 'twitter.com', 'x.com'].some(isHost)) return { source: host, medium: 'social' };
  if (/^(?:[a-z]+\.)?(?:google|bing|duckduckgo|ecosia|yahoo|qwant)\.[a-z.]+$/.test(host)) return { source: host, medium: 'organic' };
  return { source: host, medium: 'referral' };
}

export function isAiSource(source: string): boolean {
  return AI_HOSTS.some(host => source === host || source.endsWith(`.${host}`))
    || ['chatgpt', 'perplexity', 'claude', 'gemini', 'copilot'].includes(source.toLowerCase());
}
