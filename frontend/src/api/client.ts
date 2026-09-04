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
  // Brand-level campaign defaults — read/written through the same
  // saveBusinessProgress()/getBusinessProgress() pair as the rest of
  // this interface. See Campaignform.tsx's "Manage my campaign
  // defaults" panel and its create-mode autofill effect.
  default_dos?: string[];
  default_donts?: string[];
  default_video_spec?: VideoSpec;
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
// CAMPAIGNS
// ============================================

// Mirrors backend/app/schemas/campaign.py::ChecklistItem
export interface ChecklistItem {
  text: string;
  checked: boolean;
}

// Mirrors backend/app/schemas/campaign.py::VideoSpec
export interface VideoSpec {
  platform: string;
  duration?: string;
  aspect_ratio?: string;
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

// Mirrors backend/app/schemas/campaign.py::CampaignResponse
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
  checklist?: ChecklistItem[] | null;
  required_scenes?: string[] | null;
  video_specs?: VideoSpec[] | null;
  dos?: string[] | null;
  donts?: string[] | null;
  suggested_caption?: string | null;
  hashtags?: string[] | null;
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

// GET /api/campaigns - list (creators see published only, businesses see their own)
export const getCampaigns = async (
  params?: CampaignListParams
): Promise<CampaignListResponse> => {
  const response = await api.get<CampaignListResponse>('/campaigns', { params });
  return response.data;
};

// GET /api/campaigns/{id} - single campaign detail
export const getCampaign = async (id: number | string): Promise<Campaign> => {
  const response = await api.get<Campaign>(`/campaigns/${id}`);
  return response.data;
};

// Payload for POST /api/campaigns. Every field here mirrors
// CampaignCreate in backend/app/schemas/campaign.py — only `title`,
// `description`, and `category` are actually required server-side,
// everything else is optional and can be filled in across later form
// slices without breaking this type.
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
  checklist?: ChecklistItem[];
  required_scenes?: string[];
  video_specs?: VideoSpec[];
  dos?: string[];
  donts?: string[];
  suggested_caption?: string;
  hashtags?: string[];
  deadline?: string;
  hero_image?: string;
}

// POST /api/campaigns - business-only (backend enforces via
// get_current_business). New campaigns always land in "draft" status
// server-side — call publishCampaign() afterwards to make it live.
export const createCampaign = async (data: CampaignCreateData): Promise<Campaign> => {
  const response = await api.post<Campaign>('/campaigns', data);
  return response.data;
};

// POST /api/campaigns/{id}/duplicate - business-only, and only for
// campaigns you own (backend enforces both). Always returns a new
// "draft" campaign — applications, timestamps, and id are never
// copied. Deadline is deliberately dropped too (see backend comment).
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

// PUT /api/campaigns/{id}/publish - flips a draft to published.
// Backend rejects this if the campaign isn't currently "draft".
export const publishCampaign = async (id: number | string): Promise<Campaign> => {
  const response = await api.put<Campaign>(`/campaigns/${id}/publish`, {});
  return response.data;
};

// DELETE /api/campaigns/{id} - business-only, and only for campaigns
// you own (backend enforces both).
export const deleteCampaign = async (id: number | string): Promise<void> => {
  await api.delete(`/campaigns/${id}`);
};

// ============================================
// APPLICATIONS
// ============================================

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface Application {
  id: number;
  campaign_id: number;
  creator_id: number;
  // Computed server-side from the applicant's profile / the parent
  // campaign — see ApplicationResponse in
  // backend/app/schemas/application.py. Optional because a creator
  // with no profile filled in yet still has a valid application.
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

// POST /api/applications - creator applies to a campaign.
// Backend enforces: campaign must be published, creator can't apply twice,
// and only role="creator" accounts may call this at all.
export const createApplication = async (data: ApplicationCreateData): Promise<Application> => {
  const response = await api.post<Application>('/applications', data);
  return response.data;
};

// GET /api/applications - server scopes results to the logged-in user
// automatically (creators see their own, businesses see applicants to
// their campaigns), so `campaign_id` here is just an extra filter, not
// an access check.
export const getApplications = async (params?: {
  campaign_id?: number;
  status?: string;
}): Promise<Application[]> => {
  const response = await api.get<Application[]>('/applications', { params });
  return response.data;
};

// PUT /api/applications/{id} - business-only, accept/reject a pending
// application. Backend rejects this if the application isn't
// currently "pending", or if the caller doesn't own the campaign.
export const updateApplicationStatus = async (
  id: number,
  status: 'accepted' | 'rejected'
): Promise<Application> => {
  const response = await api.put<Application>(`/applications/${id}`, { status });
  return response.data;
};

// ============================================
// SAVED CAMPAIGNS
// ============================================
// Creator-only bookmarking — the "Save Campaign" button on the
// campaign detail page. Backend enforces creator-only via
// get_current_creator, same as applications.

export interface SavedCampaignEntry {
  id: number;
  creator_id: number;
  campaign_id: number;
  created_at: string;
  campaign: Campaign;
}

// POST /api/saved-campaigns - idempotent: saving an already-saved
// campaign just returns the existing row rather than erroring.
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