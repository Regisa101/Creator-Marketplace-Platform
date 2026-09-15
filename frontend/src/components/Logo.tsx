// Shared monochrome branding for the Creator Marketplace Platform.

export const BRAND_PURPLE = "#111111";
export const BRAND_PURPLE_DARK = "#000000";
export const BRAND_PINK_CORAL = "#FFFFFF";

export const BRAND_NAME = "creatorhub";
export const OFF_WHITE = "#FFFFFF";

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      style={{
        flexShrink: 0,
        display: "block",
      }}
    >
      {/* Thin C-shaped outer mark */}
      <path
        d="M20.8 7.1
           C18.9 5.7 16.6 4.9 14.1 4.9
           C7.9 4.9 3 9.9 3 16
           C3 22.1 7.9 27.1 14.1 27.1
           C16.6 27.1 18.9 26.3 20.8 24.9"
        fill="none"
        stroke="#111111"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Slim inner connection */}
      <path
        d="M14 16H25"
        fill="none"
        stroke="#111111"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* White cut / separation */}
      <path
        d="M20.5 8.2L27 16L20.5 23.8"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}