// Single source of truth for CreatorHub role-specific auth colors.
export type Role = "creator" | "business";

export interface RoleTheme {
  role: Role;
  label: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  gradientFrom: string;
  gradientTo: string;
  glow1: string;
  glow2: string;
  panelText: "dark" | "light";
  welcomeDesc: string;
}

export const ROLE_THEME: Record<Role, RoleTheme> = {
  creator: {
    role: "creator",
    label: "Creator",
    accent: "#111111",
    accentHover: "#000000",
    accentSoft: "#F5F5F5",
    gradientFrom: "#F8C6C2",
    gradientTo: "#FFF7F6",
    glow1: "rgba(255,255,255,0.95)",
    glow2: "rgba(17,17,17,0.30)",
    panelText: "dark",
    welcomeDesc:
      "Discover paid campaigns from brands, collaborate on exciting projects, and turn your creativity into opportunities.",
  },
  business: {
    role: "business",
    label: "Brand",
    accent: "#111111",
    accentHover: "#000000",
    accentSoft: "#F3F3F3",
    gradientFrom: "#D3D3D3",
    gradientTo: "#F9F9F9",
    glow1: "rgba(255,255,255,0.96)",
    glow2: "rgba(17,17,17,0.28)",
    panelText: "dark",
    welcomeDesc:
      "Find talented creators, launch campaigns, manage collaborations, and grow your brand's presence.",
  },
};

export const otherRole = (role: Role): Role =>
  role === "creator" ? "business" : "creator";
