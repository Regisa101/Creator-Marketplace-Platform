// Shared creatorhub brand tokens.
//
// Keep this file as the compatibility layer for existing pages.
// New pages should preferably import from ./Logo.

export {
  BRAND_PURPLE,
  BRAND_PURPLE_DARK,
  BRAND_PINK_CORAL,
  BRAND_NAME,
  LogoMark,
} from "./Logo";

export {
  BRAND_PURPLE as VIOLET,
  BRAND_PURPLE_DARK as VIOLET_DARK,
  BRAND_PINK_CORAL as CORAL,
} from "./Logo";

export const CORAL_DARK = "#E86966";

export const PAGE_GRADIENT_BG = `
  radial-gradient(
    ellipse 1000px 640px at 20% 0%,
    rgba(118, 97, 161, 0.13),
    transparent 65%
  ),
  radial-gradient(
    ellipse 1000px 640px at 85% 5%,
    rgba(244, 124, 120, 0.11),
    transparent 65%
  ),
  #fbfaff
`;