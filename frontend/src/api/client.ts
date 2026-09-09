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
  role?: 'creator' | 'business';
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
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
  type?: string;
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
  default_dos?: string[];
  default_donts?: string[];
  default_video_spec?: VideoSpec;
}

// ============================================
// CAMPAIGN TYPES
// ============================================

export interface ChecklistItem {
  text: string;
  checked: boolean;
}

export interface VideoSpec {
  platform: string;
  duration?: string;
  aspect_ratio?: string;
  resolution?: string;
  frame_rate?: string;
  file_type?: string;
  voiceover_required: boolean;
  subtitles_required: boolean;
}

export type CampaignType = 'paid' | 'gifted';
export type CampaignStatus =
  | 'draft'
  | 'published'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'closed';

export interface Campaign {
  id: number;
  business_id: number;
  title: string;
  tagline?: string | null;
  description: string;
  brief?: string | null;
  category: string;
  sub_category?: string | null;
  campaign_type: CampaignType;
  brand_name?: string | null;
  brand_location?: string | null;
  budget?: number | null;
  compensation_description?: string | null;
  requirements?: string | null;
  deliverables?: string[] | null;
  before_you_apply?: string[] | null;
  checklist?: ChecklistItem[] | null;
  required_scenes?: string[] | null;
  video_specs?: VideoSpec[] | null;
  dos?: string[] | null;
  donts?: string[] | null;
  suggested_caption?: string | null;
  hashtags?: string[] | null;
  guidelines_note?: string | null;
  deadline?: string | null;
  hero_image?: string | null;
  status: CampaignStatus;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  application_count: number;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CampaignListParams {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CampaignCreateData {
  title: string;
  tagline?: string;
  description: string;
  brief?: string;
  category: string;
  sub_category?: string;
  campaign_type?: CampaignType;
  brand_name?: string;
  brand_location?: string;
  budget?: number;
  compensation_description?: string;
  requirements?: string;
  deliverables?: string[];
  before_you_apply?: string[];
  checklist?: ChecklistItem[];
  required_scenes?: string[];
  video_specs?: VideoSpec[];
  dos?: string[];
  donts?: string[];
  suggested_caption?: string;
  hashtags?: string[];
  guidelines_note?: string;
  deadline?: string;
  hero_image?: string | null;
  extra_photos?: string[] | null;
}

export interface PublicBusinessCampaign {
  id: number;
  title: string;
  category: string;
  sub_category?: string | null;
  campaign_type: string;
  status: string;
}

export interface PublicBusinessProfile {
  id: number;
  company_name: string;
  business_type?: string | null;
  industry?: string | null;
  location?: string | null;
  website?: string | null;
  description?: string | null;
  logo_url?: string | null;
  interested_categories: string[];
  preferred_content_types: string[];
  team_size?: string | null;
  year_established?: number | null;
  is_onboarding_complete: boolean;
  is_published: boolean;
  campaigns: PublicBusinessCampaign[];
}

// ============================================
// APPLICATION TYPES
// ============================================

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Application {
  id: number;
  campaign_id: number;
  creator_id: number;
  creator_name?: string | null;
  creator_avatar?: string | null;
  campaign_title?: string | null;
  proposal: string;
  rate?: number | null;
  message?: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at?: string | null;
}

export interface ApplicationCreateData {
  campaign_id: number;
  proposal: string;
  rate?: number | null;
  message?: string | null;
}

// ============================================
// SAVED CAMPAIGN TYPES
// ============================================

export interface SavedCampaignEntry {
  id: number;
  creator_id: number;
  campaign_id: number;
  created_at: string;
  campaign: Campaign;
}

// ============================================
// API FUNCTIONS - AUTH
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

export const deleteAccount = async (password: string): Promise<void> => {
  await api.delete('/auth/account', { data: { password } });
};

// ============================================
// API FUNCTIONS - ONBOARDING
// ============================================

export const completeCreatorOnboarding = async (data: CreatorOnboardingData): Promise<any> => {
  const response = await api.post('/onboarding/creator/complete', data);
  return response.data;
};

export const completeBusinessOnboarding = async (data: BusinessOnboardingData): Promise<any> => {
  const response = await api.post('/onboarding/business/complete', data);
  return response.data;
};

export type CreatorOnboardingProgressData = Partial<CreatorOnboardingData>;

export const saveCreatorProgress = async (
  data: CreatorOnboardingProgressData
): Promise<any> => {
  const response = await api.patch('/onboarding/creator/progress', data);
  return response.data;
};

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
// API FUNCTIONS - CAMPAIGNS
// ============================================

export const getPublicBusinessProfile = async (businessId: number | string): Promise<PublicBusinessProfile> => {
  const response = await api.get<PublicBusinessProfile>(`/businesses/${businessId}/public-profile`);
  return response.data;
};

export const getCampaigns = async (
  params?: CampaignListParams
): Promise<CampaignListResponse> => {
  const response = await api.get<CampaignListResponse>('/campaigns', { params });
  return response.data;
};

export const getCampaign = async (id: number | string): Promise<Campaign> => {
  const response = await api.get<Campaign>(`/campaigns/${id}`);
  return response.data;
};

export const createCampaign = async (data: CampaignCreateData): Promise<Campaign> => {
  const response = await api.post<Campaign>('/campaigns', data);
  return response.data;
};

export const duplicateCampaign = async (id: number | string): Promise<Campaign> => {
  const response = await api.post<Campaign>(`/campaigns/${id}/duplicate`, {});
  return response.data;
};

export const updateCampaign = async (
  id: number | string,
  data: Partial<CampaignCreateData>
): Promise<Campaign> => {
  const response = await api.put<Campaign>(`/campaigns/${id}`, data);
  return response.data;
};

export const publishCampaign = async (id: number | string): Promise<Campaign> => {
  const response = await api.put<Campaign>(`/campaigns/${id}/publish`, {});
  return response.data;
};

export const deleteCampaign = async (id: number | string): Promise<void> => {
  await api.delete(`/campaigns/${id}`);
};

// ============================================
// API FUNCTIONS - APPLICATIONS
// ============================================

export const createApplication = async (data: ApplicationCreateData): Promise<Application> => {
  const response = await api.post<Application>('/applications', data);
  return response.data;
};

export const getApplications = async (params?: {
  campaign_id?: number;
  status?: string;
}): Promise<Application[]> => {
  const response = await api.get<Application[]>('/applications', { params });
  return response.data;
};

export const updateApplicationStatus = async (
  id: number,
  status: 'accepted' | 'rejected'
): Promise<Application> => {
  const response = await api.put<Application>(`/applications/${id}`, { status });
  return response.data;
};

// 🔥 NEW: DELETE /api/applications/{id} - creator withdraws their pending application
export const withdrawApplication = async (id: number): Promise<{ message: string }> => {
  const response = await api.delete<{ message: string }>(`/applications/${id}`);
  return response.data;
};

// ============================================
// API FUNCTIONS - SAVED CAMPAIGNS
// ============================================

export const saveCampaign = async (campaignId: number): Promise<SavedCampaignEntry> => {
  const response = await api.post<SavedCampaignEntry>('/saved-campaigns', { campaign_id: campaignId });
  return response.data;
};

export const unsaveCampaign = async (campaignId: number): Promise<void> => {
  await api.delete(`/saved-campaigns/${campaignId}`);
};

export const getSavedCampaigns = async (): Promise<SavedCampaignEntry[]> => {
  const response = await api.get<SavedCampaignEntry[]>('/saved-campaigns');
  return response.data;
};

// ============================================
// API FUNCTIONS - FILE UPLOADS
// ============================================

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