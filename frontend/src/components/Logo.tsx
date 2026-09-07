// Single source of truth for the creatorhub logo mark — two overlapping
// circles (navy + coral) at a fixed viewBox. Every page that shows the
// logo (Dashboard sidebar, Landing nav/footer/merge visual, onboarding
// wordmark, auth panel) should import THIS component rather than
// redrawing its own <svg> — that duplication is exactly why Dashboard's
// logo drifted onto the old violet/coral palette while every other page
// moved to navy/coral. Only `size` should vary by placement; the
// geometry and colors are fixed here so they can't drift again.

export const LOGO_NAVY = '#1E2A78';
export const LOGO_CORAL = '#FF6B5A';

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="10" cy="13" r="8" fill={LOGO_NAVY} />
      <circle cx="17" cy="9" r="6" fill={LOGO_CORAL} fillOpacity={0.9} />
    </svg>
  );
}