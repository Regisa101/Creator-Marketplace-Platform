// Single source of truth for the two auth "roles" and their colors.
// Change a color here and every login/register page for that role
// (and the role-picker cards) updates automatically.

export type Role = 'creator' | 'business';

export interface RoleTheme {
  role: Role;
  label: string;              // shown to users: "Creator" / "Brand"
  accent: string;             // button / input-focus color
  accentHover: string;
  accentSoft: string;         // light tint, used for focus rings
  gradientFrom: string;       // side-panel gradient base
  gradientTo: string;
  glow1: string;              // soft radial highlight, top-right of panel
  glow2: string;              // soft radial highlight, bottom-left of panel
  panelText: 'dark' | 'light'; // text color that reads well on the gradient
  welcomeDesc: string;        // side-panel marketing copy
}

export const ROLE_THEME: Record<Role, RoleTheme> = {
  creator: {
    role: 'creator',
    label: 'Creator',
    accent: '#FF6B5A',
    accentHover: '#F0523F',
    accentSoft: '#FFEDEA',
    gradientFrom: '#FFD9C9',
    gradientTo: '#FFF6F0',
    glow1: 'rgba(255,255,255,0.9)',
    glow2: 'rgba(255,150,120,0.55)',
    panelText: 'dark',
    welcomeDesc:
      'creatorhub makes brand collabs effortless. Get matched with top brands and manage every deal from pitch to payment.',
  },
  business: {
    role: 'business',
    label: 'Brand',
    accent: '#2B2F6B',
    accentHover: '#20244F',
    accentSoft: '#EAEBF5',
    // Same light, airy treatment as the creator panel — a soft navy
    // tint fading to near-white, instead of a solid dark-navy block
    // that overpowered the panel.
    gradientFrom: '#DBDEF5',
    gradientTo: '#F8F8FC',
    glow1: 'rgba(255,255,255,0.9)',
    glow2: 'rgba(120,130,220,0.4)',
    panelText: 'dark',
    welcomeDesc:
      'creatorhub makes creator sourcing effortless. Discover vetted creators and manage every campaign from brief to results.',
  },
};

export const otherRole = (role: Role): Role =>
  role === 'creator' ? 'business' : 'creator';