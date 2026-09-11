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
    accent: "#F47C78",
    accentHover: "#E86966",
    accentSoft: "#FFF0EF",
    gradientFrom: "#F8C6C2",
    gradientTo: "#FFF7F6",
    glow1: "rgba(255,255,255,0.95)",
    glow2: "rgba(244,124,120,0.30)",
    panelText: "dark",
    welcomeDesc:
      "Discover paid campaigns from brands, collaborate on exciting projects, and turn your creativity into opportunities.",
  },
  business: {
    role: "business",
    label: "Brand",
    accent: "#7661A1",
    accentHover: "#66518F",
    accentSoft: "#F0EBF6",
    gradientFrom: "#D9CFEA",
    gradientTo: "#FAF8FC",
    glow1: "rgba(255,255,255,0.96)",
    glow2: "rgba(118,97,161,0.28)",
    panelText: "dark",
    welcomeDesc:
      "Find talented creators, launch campaigns, manage collaborations, and grow your brand's presence.",
  },
};

export const otherRole = (role: Role): Role =>
  role === "creator" ? "business" : "creator";
