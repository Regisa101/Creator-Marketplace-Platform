// frontend/src/components/Logo.tsx
//
// SINGLE SOURCE OF TRUTH FOR CREATORHUB BRANDING
//
// Every public page and every future page should import the logo/colors
// from this file. Do not redefine creatorhub colors inside individual pages.

export const BRAND_PURPLE = "#7661A1";
export const BRAND_PURPLE_DARK = "#66518F";
export const BRAND_PINK_CORAL = "#F47C78";

export const BRAND_NAME = "creatorhub";

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      aria-hidden="true"
      style={{ flexShrink: 0, display: "block" }}
    >
      <circle
        cx="10"
        cy="13"
        r="8"
        fill={BRAND_PURPLE}
      />

      <circle
        cx="17"
        cy="9"
        r="6"
        fill={BRAND_PINK_CORAL}
        fillOpacity={0.92}
      />
    </svg>
  );
}