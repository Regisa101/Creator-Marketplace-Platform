// Single source of truth for the brand mark + wordmark used across
// every page's topbar. Pulled out once here instead of copy-pasted
// per-page — the earlier "CreatorKhoj" mixup (a reference competitor's
// name, mistakenly used as this project's own brand across six files)
// happened partly because there was no single place defining what the
// real name/logo actually is.
//
// Same two circles + colors as the nav logo in Landing.tsx, so every
// page matches the actual marketing site instead of using placeholder
// text.
export const VIOLET = '#6C5DD3';
export const VIOLET_DARK = '#4A3BA8';
export const CORAL = '#FF8A5B';
export const CORAL_DARK = '#E86B3E';

export const BRAND_NAME = 'creatorhub';

export const LogoMark = ({ size = 22 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 26 26"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    <circle cx="10" cy="13" r="8" fill={VIOLET} />
    <circle cx="17" cy="9" r="6" fill={CORAL} fillOpacity={0.9} />
  </svg>
);

// The same soft two-tone radial-gradient wash used behind the whole
// Landing page, as a ready-to-spread CSS background value — so any
// page can do `background: ${PAGE_GRADIENT_BG}` instead of a flat
// color and match the marketing site's look.
export const PAGE_GRADIENT_BG = `
  radial-gradient(ellipse 1000px 640px at 20% 0%, rgba(108,93,211,0.13), transparent 65%),
  radial-gradient(ellipse 1000px 640px at 85% 5%, rgba(255,138,91,0.11), transparent 65%),
  #fbfaff
`;