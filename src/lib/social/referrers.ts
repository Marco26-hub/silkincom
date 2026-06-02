/**
 * Maps an analytics referrer host to a social platform, so first-party
 * analytics (analytics_events.referrer_host) can be attributed to the social
 * channel that drove the visit — the integrated "social → site" analytics.
 * Covers the link-shim subdomains the apps use (l.instagram.com, lm.facebook.com…).
 */
export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'pinterest' | 'youtube' | 'threads' | 'twitter';

export const SOCIAL_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube', 'threads', 'twitter'];

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  pinterest: 'Pinterest',
  youtube: 'YouTube',
  threads: 'Threads',
  twitter: 'X / Twitter',
};

const RULES: Array<[RegExp, SocialPlatform]> = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)facebook\.com$/, 'facebook'],
  [/(^|\.)fb\.(com|me|watch)$/, 'facebook'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'pinterest'],
  [/(^|\.)pin\.it$/, 'pinterest'],
  [/(^|\.)youtube\.com$/, 'youtube'],
  [/(^|\.)youtu\.be$/, 'youtube'],
  [/(^|\.)threads\.(net|com)$/, 'threads'],
  [/(^|\.)t\.co$/, 'twitter'],
  [/(^|\.)twitter\.com$/, 'twitter'],
  [/(^|\.)x\.com$/, 'twitter'],
];

export function socialPlatformOf(host: string | null | undefined): SocialPlatform | null {
  if (!host) return null;
  const h = host.toLowerCase().replace(/^www\./, '');
  for (const [re, p] of RULES) if (re.test(h)) return p;
  return null;
}
