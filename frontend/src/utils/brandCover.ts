import type { CSSProperties } from 'react';
import { categoryCover, categoryCoverArt } from './categoryArt';

// ---------------------------------------------------------------------------
// Cover images for brand profiles.
//
// A brand's own cover (cover_url) always wins. Without one, the cover is a
// picture that matches the company type (food, beauty, travel ...).
// ---------------------------------------------------------------------------

export type BrandCoverOptions = {
  name?: string | null;
  /** Main category / industry of the brand or its campaign. */
  category?: string | null;
  /** Extra hints (business type, interested categories ...). */
  hints?: Array<string | null | undefined>;
};

export function makeBrandCover({ name, category, hints = [] }: BrandCoverOptions): string {
  return categoryCover(name || 'brand', category, ...hints, name);
}

/** Inline style for a cover element: the brand's own cover if it has one, otherwise a picture for its company type. */
export function brandCoverStyle(
  options: BrandCoverOptions & { coverUrl?: string | null },
  resolveUrl?: (url?: string | null) => string,
): CSSProperties {
  const own = options.coverUrl ? (resolveUrl ? resolveUrl(options.coverUrl) : options.coverUrl) : '';
  const hints = [options.category, ...(options.hints || []), options.name];
  // Real photo on top; the drawn banner sits underneath as a fallback.
  const layers = own
    ? [own]
    : [makeBrandCover(options), categoryCoverArt(options.name || 'brand', ...hints)];

  return {
    backgroundImage: layers.map((u) => `url("${u}")`).join(', '),
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
}