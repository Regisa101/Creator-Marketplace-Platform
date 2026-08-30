import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// TYPES - MUST BE EXPORTED
// ============================================

export interface RegisterData {
  email: string;
  full_name: string;
  password: string;
  role: 'creator' | 'business';
  niche?: string;
  platform?: string;
  audience_size?: string;
  company_name?: string;
  industry?: string;
  team_size?: string;
  website?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  // Not returned by GET /auth/me today — there's no backend field or
  // partial-save endpoint for onboarding-in-progress yet. This exists
  // purely so AuthContext's client-side updateProfile() (localStorage-
  // backed, same-browser only) can attach onboarding data to `user`
  // without `any` casts. Once a real partial-save endpoint exists and
  // /auth/me starts returning saved profile data, this becomes the
  // real source of truth too.
  profile?: Record<string, any>;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ============================================
// ONBOARDING TYPES
// ============================================

export interface CreatorSocialData {
  platform: string;
  username: string;
  profile_url: string;
  follower_count: number;
}

export interface CreatorPortfolioItemData {
  title: string;
  description?: string;
  media_url: string;
  platform?: string;
  type?: string; // image, video, reel, link
}

export interface CreatorOnboardingData {
  display_name: string;
  username: string;
  bio: string;
  location: string;
  profile_image?: string | null;
  creator_type: string;
  niches: string[];
  content_languages: string[];
  content_types: string[];
  audience_age_range: string[];
  audience_location: string[];
  audience_interests: string[];
  socials: CreatorSocialData[];
  // Not collected by the onboarding UI yet — backend defaults this to
  // an empty list, so it's safe to omit or send [].
  portfolio?: CreatorPortfolioItemData[];
  starting_price: number;
}

export interface BusinessOnboardingData {
  company_name: string;
  business_type?: string;
  industry?: string;
  location?: string;
  website?: string;
  description?: string;
  logo_url?: string;
  contact_phone?: string;
  interested_categories?: string[];
  preferred_content_types?: string[];
  typical_budget?: number;
}

// ============================================
// API FUNCTIONS - MUST BE EXPORTED
// ============================================

export const register = async (data: RegisterData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/register', data);
  return response.data;
};

export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/auth/login', data);
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>('/auth/me');
  return response.data;
};

// ============================================
// ONBOARDING API FUNCTIONS
// ============================================

export const completeCreatorOnboarding = async (data: CreatorOnboardingData): Promise<any> => {
  const response = await api.post('/onboarding/creator/complete', data);
  return response.data;
};

export const completeBusinessOnboarding = async (data: BusinessOnboardingData): Promise<any> => {
  const response = await api.post('/onboarding/business/complete', data);
  return response.data;
};

export default api;