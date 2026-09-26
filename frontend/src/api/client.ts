import axios from 'axios';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only treat a 401 as "your session is dead" when it comes from the
    // auth check itself (/auth/me). A 401 from some other, secondary
    // endpoint (e.g. the wishlist/saved-campaigns call on the public
    // navbar) should not blow away a perfectly valid login — the caller
    // that made that request already handles its own failure gracefully.
    // AuthContext's checkAuth() does the real session-validity check
    // against /auth/me and clears the session itself if that fails, so
    // we don't duplicate (and over-trigger) that logic here.
    const isAuthCheck = error?.config?.url?.includes('/auth/me');
    if (isAuthCheck && error?.response?.status === 401 && localStorage.getItem('access_token')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

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

export interface CreatorRequirements {
  categories?: string[];
  content_types?: string[];
  creator_sizes?: string[];
  locations?: string[];
  languages?: string[];
  follower_ranges?: string[];
  gender?: string;
  age_ranges?: string[];
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
  availability?: string;
  starting_price: number;
  payout_account_holder_name: string;
  payout_provider: string;
  payout_account_number: string;
  payout_branch?: string;
  payout_routing?: string;
  payout_method?: string;
}

export interface BusinessOnboardingData {
  company_name: string;
  business_type?: string;
  industry?: string;
  location?: string;
  website?: string;
  social_links?: Record<string, string | undefined>;
  description?: string;
  logo_url?: string | null;
  contact_person_name?: string;
  contact_phone?: string;
  interested_categories?: string[];
  preferred_content_types?: string[];
  typical_budget?: number;
  team_size?: string;
  year_established?: number;
  default_dos?: string[];
  default_donts?: string[];
  default_video_spec?: VideoSpec;
  default_creator_requirements?: CreatorRequirements;
  default_application_questions?: string[];
}

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
  category: string;
  description: string;
  responsibilities?: string | null;
  creator_types?: string[] | null;
  experience_level?: string | null;
  required_skills?: string[] | null;
  location?: string | null;
  work_arrangement?: string | null;
  requirements?: string | null;
  deliverables?: string[] | null;
  creators_needed: number;
  engagement_type?: string | null;
  duration?: string | null;
  pricing_model?: string | null;
  compensation_type?: string | null;
  budget?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  compensation_description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  application_deadline?: string | null;
  application_questions?: string[] | null;
  status: CampaignStatus;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
  application_count: number;
}

export interface CampaignCreateData {
  title: string;
  category: string;
  description: string;
  responsibilities?: string;
  creator_types?: string[];
  creators_needed?: number;
  deliverables?: string[];
  engagement_type?: string;
  duration?: string;
  work_arrangement?: string;
  pricing_model?: string;
  compensation_type?: string;
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  compensation_description?: string;
  experience_level?: string;
  required_skills?: string[];
  location?: string;
  requirements?: string;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
  application_questions?: string[];
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

export interface PublicCampaign extends Campaign {
  brand_name?: string | null;
  brand_location?: string | null;
  brand_logo?: string | null;
  deadline?: string | null;
  creator_requirements?: CreatorRequirements | null;
  required_platform?: string | null;
  required_platforms?: string[] | null;
}

export interface PublicCampaignListResponse {
  campaigns: PublicCampaign[];
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
}

export interface PublicCampaignListParams {
  limit?: number;
  page?: number;
  category?: string;
  search?: string;
}

export interface PublicBusinessCampaign {
  id: number;
  title: string;
  category: string;
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
  social_links?: Record<string, string | undefined>;
  interested_categories: string[];
  preferred_content_types: string[];
  team_size?: string | null;
  year_established?: number | null;
  is_onboarding_complete: boolean;
  is_published: boolean;
  campaigns: PublicBusinessCampaign[];
  completed_collaborations?: number;
  creators_worked_with?: number;
  work_history?: any[];
}

export type ApplicationStatus =
  | 'pending'
  | 'selected'
  | 'accepted'
  | 'rejected'
  | 'withdrawn'
  | 'completed';

export interface ApplicationAnswer {
  question: string;
  answer: string;
}

export interface Application {
  id: number;
  campaign_id: number;
  creator_id: number;
  creator_name?: string | null;
  creator_avatar?: string | null;
  campaign_title?: string | null;
  campaign_budget?: number | null;
  proposal: string;
  rate?: number | null;
  message?: string | null;
  application_answers?: ApplicationAnswer[] | null;
  selected_portfolio?: any[] | null;
  creators_needed?: number | null;
  status: ApplicationStatus;
  agreed_rate?: number | null;
  rate_locked?: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface ApplicationCreateData {
  campaign_id: number;
  proposal: string;
  rate?: number | null;
  message?: string | null;
  application_answers?: ApplicationAnswer[];
  selected_portfolio?: any[];
}

export interface SavedCampaignEntry {
  id: number;
  creator_id: number;
  campaign_id: number;
  created_at: string;
  campaign: Campaign;
}

export interface PublicCreatorProfile {
  id: number;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  location?: string | null;
  profile_image?: string | null;
  creator_type?: string | null;
  categories: string[];
  content_types: string[];
  languages: string[];
  audience_age_range: string[];
  audience_location: string[];
  interests: string[];
  starting_price?: number | null;
  portfolio: any[];
  socials: any[];
  is_shortlisted?: boolean;
  avg_rating?: number | null;
  ratings_count?: number;
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  reference_id?: number | null;
  is_read: boolean;
  created_at: string;
}

export interface Payment {
  id: number;
  application_id?: number | null;
  campaign_id?: number | null;
  payment_type: string;
  purchase_order_id: string;
  pidx?: string | null;
  transaction_id?: string | null;
  amount: number;
  platform_fee?: number | null;
  creator_payout?: number | null;
  currency: string;
  status: 'initiated' | 'funded' | 'released' | 'completed' | 'failed' | 'refunded';
  method: string;
  paid_at?: string | null;
  created_at: string;
  funding_account_name?: string | null;
  funding_account_masked?: string | null;
}

export interface PaymentSummary {
  role: string;
  this_month: number;
  lifetime: number;
  completed_payment_count: number;
}

export interface Contract {
  id: number;
  campaign_id: number;
  application_id: number;
  business_id: number;
  creator_id: number;
  engagement_type?: string | null;
  duration?: string | null;
  pricing_model?: string | null;
  compensation_type?: string | null;
  compensation_description?: string | null;
  agreed_rate?: number | null;
  total_value?: number | null;
  platform_fee_rate: number;
  platform_fee_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  status: 'draft' | 'pending_payment' | 'active' | 'completed' | 'cancelled' | string;
  terms_note?: string | null;
  // Demo platform-fee payment (see routes/contracts.py::pay_platform_fee).
  // No real gateway is called — this is separate from the real Khalti
  // `Payment` flow above.
  payment_method?: 'wallet' | 'card' | null;
  payment_reference?: string | null;
  fee_paid: boolean;
  fee_paid_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  campaign_title?: string | null;
  creator_name?: string | null;
  business_name?: string | null;
}

export interface ContractFinalizeData {
  agreed_rate: number;
  total_value?: number | null;
  terms_note?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export interface ContractPayFeeData {
  payment_method: 'wallet' | 'card';
  wallet_number?: string;
  wallet_pin?: string;
  card_number?: string;
  card_expiry?: string;
  card_cvv?: string;
  card_holder?: string;
}

export interface ContractSummary {
  role: string;
  this_month: number;
  lifetime: number;
  active_contracts: number;
}

export interface CampaignDefaults {
  default_dos: string[];
  default_donts: string[];
  default_video_spec: VideoSpec | null;
  default_creator_requirements: CreatorRequirements | null;
  default_application_questions: string[];
}

const unwrap = <T>(request: Promise<{ data: T }>): Promise<T> =>
  request.then((response) => response.data);

export const register = (data: RegisterData) => unwrap(api.post<AuthResponse>('/auth/register', data));
export const login = (data: LoginData) => unwrap(api.post<AuthResponse>('/auth/login', data));
export const getCurrentUser = () => unwrap(api.get<User>('/auth/me'));
export const deleteAccount = async (password: string) => { await api.delete('/auth/account', { data: { password } }); };

export const completeCreatorOnboarding = (data: CreatorOnboardingData) => unwrap(api.post('/onboarding/creator/complete', data));
export const completeBusinessOnboarding = (data: BusinessOnboardingData) => unwrap(api.post('/onboarding/business/complete', data));
export type CreatorOnboardingProgressData = Partial<CreatorOnboardingData>;
export const saveCreatorProgress = (data: CreatorOnboardingProgressData) => unwrap(api.patch('/onboarding/creator/progress', data));
export const getCreatorProgress = async (): Promise<{ profile: any; socials: any[] } | null> => {
  try { return await unwrap(api.get('/onboarding/creator/profile')); }
  catch (error: any) { if (error?.response?.status === 404) return null; throw error; }
};
export type BusinessOnboardingProgressData = Partial<BusinessOnboardingData>;
export const saveBusinessProgress = (data: BusinessOnboardingProgressData) => unwrap(api.patch('/onboarding/business/progress', data));
export const getBusinessProgress = async (): Promise<{ profile: any } | null> => {
  try { return await unwrap(api.get('/onboarding/business/profile')); }
  catch (error: any) { if (error?.response?.status === 404) return null; throw error; }
};
export const getCampaignDefaults = async (): Promise<CampaignDefaults | null> => {
  try { return await unwrap(api.get<CampaignDefaults>('/onboarding/business/campaign-defaults')); }
  catch (error: any) { if (error?.response?.status === 404) return null; throw error; }
};
export const saveCampaignDefaults = (data: CampaignDefaults) => unwrap(api.patch<CampaignDefaults>('/onboarding/business/campaign-defaults', data));

export const getPublicBusinessProfile = (businessId: number | string) => unwrap(api.get<PublicBusinessProfile>(`/businesses/${businessId}/public-profile`));
export const getCampaigns = (params?: CampaignListParams) => unwrap(api.get<CampaignListResponse>('/campaigns', { params }));
export const getPublicCampaigns = (params?: PublicCampaignListParams) => unwrap(api.get<PublicCampaignListResponse>('/campaigns/public', { params }));
export const getPublicCampaign = (id: number | string) => unwrap(api.get<PublicCampaign>(`/campaigns/public/${id}`));
export const getCampaign = (id: number | string) => unwrap(api.get<Campaign>(`/campaigns/${id}`));
export const createCampaign = (data: CampaignCreateData) => unwrap(api.post<Campaign>('/campaigns', data));
export const duplicateCampaign = (id: number | string) => unwrap(api.post<Campaign>(`/campaigns/${id}/duplicate`, {}));
export const updateCampaign = (id: number | string, data: Partial<CampaignCreateData>) => unwrap(api.put<Campaign>(`/campaigns/${id}`, data));
export const publishCampaign = (id: number | string) => unwrap(api.put<Campaign>(`/campaigns/${id}/publish`, {}));
export const deleteCampaign = async (id: number | string) => { await api.delete(`/campaigns/${id}`); };
export const closeCampaign = (id: number | string) => unwrap(api.put<Campaign>(`/campaigns/${id}/close`, {}));

export const createApplication = (data: ApplicationCreateData) => unwrap(api.post<Application>('/applications', data));
export const getApplications = (params?: { campaign_id?: number; status?: string }) => unwrap(api.get<Application[]>('/applications', { params }));
export interface SelectionResult {
  application_id: number;
  contract_id: number;
  contract_status: string;
  agreed_rate?: number | null;
  total_value?: number | null;
  platform_fee?: number | null;
}

export const selectApplication = (id: number) =>
  unwrap(api.post<SelectionResult>(`/applications/${id}/select`));
export const updateApplicationStatus = (id: number, status: 'rejected') => unwrap(api.put<Application>(`/applications/${id}`, { status }));
export const withdrawApplication = (id: number) => unwrap(api.delete<{ message: string }>(`/applications/${id}`));

export const getContracts = (status?: string) => unwrap(api.get<Contract[]>('/contracts', { params: status ? { status } : undefined }));
export const getContract = (id: number) => unwrap(api.get<Contract>(`/contracts/${id}`));
export const finalizeContract = (id: number, data: ContractFinalizeData) => unwrap(api.put<Contract>(`/contracts/${id}/finalize`, data));
export const completeContract = (id: number) => unwrap(api.put<Contract>(`/contracts/${id}/complete`));
// Demo-only platform fee payment — replaces the old self-reported
// markContractFeePaid()/PUT /contracts/{id}/fee-paid. No real gateway is
// called; the backend just simulates a successful charge and activates
// the contract.
export const payContractFee = (id: number, data: ContractPayFeeData) => unwrap(api.post<Contract>(`/contracts/${id}/pay-fee`, data));
export const getContractSummary = () => unwrap(api.get<ContractSummary>('/contracts/summary/me'));

function notifyWishlistChanged() {
  window.dispatchEvent(new Event('ch:wishlist-changed'));
}
export const saveCampaign = async (campaignId: number) => {
  const result = await unwrap(api.post<SavedCampaignEntry>('/saved-campaigns/', { campaign_id: campaignId }));
  notifyWishlistChanged();
  return result;
};
export const unsaveCampaign = async (campaignId: number) => {
  await api.delete(`/saved-campaigns/${campaignId}`);
  notifyWishlistChanged();
};
export const getSavedCampaigns = () => unwrap(api.get<SavedCampaignEntry[]>('/saved-campaigns/'));

export const getCreatorProfile = (id: number | string) => unwrap(api.get<PublicCreatorProfile>(`/creators/${id}`));

export const getNotifications = (unreadOnly = false) => unwrap(api.get<Notification[]>('/notifications/', { params: { unread_only: unreadOnly } }));
export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>('/notifications/unread-count');
  return Number(response.data.count) || 0;
};
export const markNotificationRead = (id: number) => unwrap(api.patch<Notification>(`/notifications/${id}/read`, { is_read: true }));
export const markAllNotificationsRead = async () => { await api.post('/notifications/read-all'); };

export const verifyPayment = (pidx: string) => unwrap(api.get<Payment>('/payments/verify', { params: { pidx } }));
export const getPaymentSummary = () => unwrap(api.get<PaymentSummary>('/payments/summary'));

export const uploadImage = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap(api.post<{ url: string }>('/uploads/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
};
export const uploadMedia = async (file: File): Promise<{ url: string; media_type: 'image' | 'video' }> => {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap(api.post<{ url: string; media_type: 'image' | 'video' }>('/uploads/media', formData, { headers: { 'Content-Type': 'multipart/form-data' } }));
};

export default api;