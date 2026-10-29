import type { Campaign, PublicCreatorProfile } from '../api/client';

/**
 * Ranks the creators who applied to a campaign, so a brand with many
 * applications sees the best fits first.
 *
 * Score (max 100, kept simple and explainable):
 *   35  creator's niche (categories) matches the campaign category
 *   20  creator has a social account on a platform the campaign needs
 *   10  creator type matches one the campaign is looking for
 *   10  content types / languages overlap with what the brand asked for
 *   15  experience: completed collaborations + average rating
 *   10  price fit: creator's starting price / proposed rate fits the budget
 */

const norm = (v?: string | null) => (v || '').trim().toLowerCase();
const normList = (list?: (string | null | undefined)[] | null) =>
  (list || []).map(norm).filter(Boolean);

export type MatchReason = { label: string; points: number };

export type CreatorMatch = {
  score: number;
  /** Shown as a badge: "Top match" (>= 65), "Good match" (>= 35, i.e. a niche match alone) or none. */
  tier: 'top' | 'good' | 'none';
  reasons: string[];
};

export function tierOf(score: number): CreatorMatch['tier'] {
  if (score >= 65) return 'top';
  if (score >= 35) return 'good';
  return 'none';
}

function requiredPlatforms(campaign: any): string[] {
  return normList([...(campaign?.required_platforms || []), campaign?.required_platform]);
}

export function scoreCreator(
  campaign: Partial<Campaign> | any | null | undefined,
  creator: PublicCreatorProfile | null | undefined,
  proposedRate?: number | null,
): CreatorMatch {
  // Without profile data we cannot judge: keep them neutral (not penalised).
  if (!creator || !campaign) return { score: 0, tier: 'none', reasons: [] };

  let score = 0;
  const reasons: string[] = [];

  // 1. Niche -> category (35)
  const niches = normList(creator.categories);
  const category = norm(campaign.category);
  const nicheHit = category !== '' && niches.some((n) => n === category || n.includes(category) || category.includes(n));
  if (nicheHit) {
    score += 35;
    reasons.push(`Works in ${campaign.category}`);
  }

  // 2. Platforms (20)
  const needed = requiredPlatforms(campaign);
  const have = normList((creator.socials || []).map((s: any) => s?.platform));
  if (needed.length > 0) {
    const hit = needed.filter((p) => have.includes(p));
    if (hit.length > 0) {
      score += Math.round(20 * (hit.length / needed.length));
      reasons.push(`Active on ${hit.map((p) => p[0].toUpperCase() + p.slice(1)).join(', ')}`);
    }
  }

  // 3. Creator type (10)
  const types = normList(campaign.creator_types);
  const creatorTypes = norm(creator.creator_type)
    .split(/[,/]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const typeHit = types.find((t) => creatorTypes.includes(t));
  if (typeHit) {
    score += 10;
    const label = (campaign.creator_types || []).find((t: string) => norm(t) === typeHit) || typeHit;
    reasons.push(`Is a ${label}`);
  }

  // 4. Content types / languages asked for in the requirements (10)
  const req = (campaign.creator_requirements || {}) as {
    content_types?: string[];
    languages?: string[];
  };
  const wantedContent = normList(req.content_types);
  const wantedLang = normList(req.languages);
  let fitPoints = 0;
  if (wantedContent.length > 0) {
    const mine = normList(creator.content_types);
    if (wantedContent.some((c) => mine.includes(c))) fitPoints += 5;
  }
  if (wantedLang.length > 0) {
    const mine = normList(creator.languages);
    if (wantedLang.some((l) => mine.includes(l))) fitPoints += 5;
  }
  if (fitPoints > 0) {
    score += fitPoints;
    reasons.push('Matches the content / language you asked for');
  }

  // 5. Experience (15): up to 8 for completed collaborations, 7 for rating
  const done = Number(creator.completed_collaborations || 0);
  if (done > 0) {
    score += Math.min(8, done * 2);
    reasons.push(`${done} completed collaboration${done === 1 ? '' : 's'}`);
  }
  const rating = Number(creator.avg_rating || 0);
  if (rating > 0) {
    score += Math.round((Math.min(5, rating) / 5) * 7);
    if (rating >= 4) reasons.push(`Rated ${rating.toFixed(1)}/5`);
  }

  // 6. Price fit (10)
  const budgetMax = Number(campaign.budget_max ?? campaign.budget ?? 0);
  const price = Number(proposedRate ?? creator.starting_price ?? 0);
  if (budgetMax > 0 && price > 0 && price <= budgetMax) {
    score += 10;
    reasons.push('Rate fits your budget');
  }

  score = Math.max(0, Math.min(100, score));
  return { score, tier: tierOf(score), reasons: reasons.slice(0, 3) };
}