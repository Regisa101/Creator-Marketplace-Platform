import type { PublicCampaign } from '../api/client';

/**
 * Shared "suggested campaign" logic, used by BOTH the creator dashboard
 * and the campaigns page so the two always show the same campaigns.
 *
 * Scoring (kept simple and explainable):
 *   +3  campaign category matches one of the creator's niches (required to be
 *       suggested when the creator has niches)
 *   +2  campaign requires a platform the creator has connected
 *   +1  campaign is aimed at the creator's creator type
 */

export const norm = (v?: string | null) => (v || '').trim().toLowerCase();

export function scoreCampaign(
  c: PublicCampaign,
  niches: string[],
  platforms: string[],
  creatorType: string,
) {
  let score = 0;
  let nicheMatch = false;

  if (niches.includes(norm(c.category))) {
    score += 3;
    nicheMatch = true;
  }

  const required = [...(c.required_platforms || []), c.required_platform || '']
    .map(norm)
    .filter(Boolean);
  if (required.some((p) => platforms.includes(p))) score += 2;

  if (creatorType && (c.creator_types || []).map(norm).includes(creatorType)) score += 1;

  return { score, nicheMatch };
}

export type SuggestedEntry = { c: PublicCampaign; score: number; nicheMatch: boolean };

/**
 * Returns campaigns ranked for a creator.
 * - Leaves out campaigns already applied to and campaigns past their deadline.
 * - Keeps only campaigns that actually match; if nothing matches it falls back
 *   to every open campaign (newest first) and reports personalised = false.
 */
export function buildSuggestions(
  campaigns: PublicCampaign[],
  profile: any,
  socials: any[],
  appliedCampaignIds: Set<number>,
): { list: SuggestedEntry[]; personalised: boolean } {
  const niches = (profile?.categories || []).map(norm);
  const platforms = (socials || []).map((s) => norm(s.platform));
  const creatorType = norm(profile?.creator_type);
  const now = Date.now();

  const scored = campaigns
    .filter(
      (c) =>
        !appliedCampaignIds.has(c.id) &&
        (!c.application_deadline || new Date(c.application_deadline).getTime() >= now),
    )
    .map((c) => ({ c, ...scoreCampaign(c, niches, platforms, creatorType) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.c.created_at).getTime() - new Date(a.c.created_at).getTime(),
    );

  // A campaign is only "suggested" when its category matches one of the
  // creator's niches. Platform / creator type alone is too broad (most
  // campaigns need Instagram, for example) and would suggest everything, so
  // they only help rank the matches. Creators with no niches yet fall back
  // to platform / creator-type matches.
  const matched =
    niches.length > 0
      ? scored.filter((s) => s.nicheMatch)
      : scored.filter((s) => s.score > 0);
  return matched.length > 0
    ? { list: matched, personalised: true }
    : { list: scored, personalised: false };
}