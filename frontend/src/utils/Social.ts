export type SocialPlatform = 'Instagram' | 'TikTok' | 'Facebook';

export interface ParsedSocialLink {
  url: string;
  platform: SocialPlatform;
  handle: string;
}

const HOSTS: { platform: SocialPlatform; domains: string[] }[] = [
  { platform: 'Instagram', domains: ['instagram.com', 'instagr.am'] },
  { platform: 'TikTok', domains: ['tiktok.com'] },
  { platform: 'Facebook', domains: ['facebook.com', 'fb.com'] },
];

// Accepts "https://instagram.com/name", "instagram.com/name" or "www.tiktok.com/@name".
// Returns null unless it is a real Instagram / TikTok / Facebook profile link.
export function parseSocialLink(input?: string | null): ParsedSocialLink | null {
  const raw = (input || '').trim();
  if (!raw || /\s/.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^(www|m|web|mbasic)\./, '');
  const match = HOSTS.find((h) => h.domains.some((d) => host === d));
  if (!match) return null;

  // Must point at an account, not just the home page.
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const first = decodeURIComponent(parts[0]);
  const handle = first.startsWith('@') ? first : `@${first}`;
  if (handle.length < 3) return null;

  return { url: `https://${url.hostname}${url.pathname}${url.search}`, platform: match.platform, handle };
}