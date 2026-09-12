// Shared creatorhub brand tokens.
//
// Keep this file as the compatibility layer for existing pages.
// New pages should preferably import from ./Logo.

import { OFF_WHITE } from "./Logo";

export {
  BRAND_PURPLE,
  BRAND_PURPLE_DARK,
  BRAND_PINK_CORAL,
  BRAND_NAME,
  LogoMark,
  OFF_WHITE,
} from "./Logo";

export {
  BRAND_PURPLE as VIOLET,
  BRAND_PURPLE_DARK as VIOLET_DARK,
  BRAND_PINK_CORAL as CORAL,
} from "./Logo";

export const CORAL_DARK = "#E86966";

// Kept as the same flat off-white (name preserved for backwards
// compatibility with pages that already import PAGE_GRADIENT_BG).
export const PAGE_GRADIENT_BG = OFF_WHITE;