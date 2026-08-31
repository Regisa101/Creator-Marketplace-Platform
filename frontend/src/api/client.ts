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
  // Returned by /auth/register, /auth/login, and /auth/me — see the
  // computed `profile` property on the User model (models/user.py).
  // This is the real, server-persisted profile; AuthContext's
  // updateProfile() also writes here optimistically before the network
  // round-trip finishes, so this can briefly hold client-only data too.
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
  logo_url?: string | null;
  contact_phone?: string;
  interested_categories?: string[];
  preferred_content_types?: string[];
  typical_budget?: number;
  team_size?: string;
  year_established?: number;
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

// Partial save — fires on every step's "Continue" (and on "Skip for
// now") so progress survives a refresh, a different browser, or a
// cleared localStorage, instead of only living in AuthContext's
// client-side cache. `Partial<...>` because each step only ever sends
// the fields that step collected.
export type CreatorOnboardingProgressData = Partial<CreatorOnboardingData>;

export const saveCreatorProgress = async (
  data: CreatorOnboardingProgressData
): Promise<any> => {
  const response = await api.patch('/onboarding/creator/progress', data);
  return response.data;
};

// Fetches whatever's been saved so far (from completeCreatorOnboarding
// or saveCreatorProgress) so the onboarding form can repopulate itself
// and resume on the right step instead of starting over blank. No
// profile saved yet is a normal, expected state for a brand-new
// creator — the backend 404s for that, and this resolves to `null`
// rather than throwing, so callers don't need their own try/catch for
// the "nothing saved yet" case.
export const getCreatorProgress = async (): Promise<{ profile: any; socials: any[] } | null> => {
  try {
    const response = await api.get('/onboarding/creator/profile');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// Same pattern as the creator progress functions above, for business.
export type BusinessOnboardingProgressData = Partial<BusinessOnboardingData>;

export const saveBusinessProgress = async (
  data: BusinessOnboardingProgressData
): Promise<any> => {
  const response = await api.patch('/onboarding/business/progress', data);
  return response.data;
};

export const getBusinessProgress = async (): Promise<{ profile: any } | null> => {
  try {
    const response = await api.get('/onboarding/business/profile');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

// ============================================
// FILE UPLOADS
// ============================================
// Deliberately NOT using the shared `api` axios instance here: it
// defaults every request to 'Content-Type: application/json', and a
// FormData body needs 'multipart/form-data' with a boundary that only
// the browser can generate correctly — overriding the header manually
// (rather than just omitting it) breaks that. Plain axios + a manually
// attached bearer token sidesteps the shared instance's JSON default.
export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('access_token');

  const response = await axios.post<{ url: string }>(
    `${API_BASE_URL}/uploads/image`,
    formData,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  return response.data;
};

export default api;