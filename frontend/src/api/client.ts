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
  default_creator_requirements?: CreatorRequirements;
  default_application_questions?: string[];
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

export type CampaignType = 'paid';
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
  creator_requirements?: CreatorRequirements | null;
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
  application_deadline?: string | null;
  deliverable_deadline?: string | null;
  creators_needed: number;
  application_questions?: string[] | null;
  hero_image?: string | null;
  extra_photos?: string[] | null;
  completion_mode?: 'approval_only' | 'publication_required' | string;
  required_platforms?: string[] | null;
  required_post_types?: string[] | null;
  required_platform?: string | null;
  required_post_type?: string | null;
  publication_deadline?: string | null;
  required_mentions?: string[] | null;
  status: CampaignStatus;
  is_active: boolean;
  funding_status?: 'unfunded' | 'pending' | 'funded' | 'refunded' | string;
  funded_amount?: number | null;
  funded_at?: string | null;
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
  creator_requirements?: CreatorRequirements;
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
  application_deadline?: string;
  deliverable_deadline?: string;
  creators_needed?: number;
  application_questions?: string[];
  hero_image?: string | null;
  extra_photos?: string[] | null;
  completion_mode?: 'approval_only' | 'publication_required';
  required_platforms?: string[];
  required_post_types?: string[];
  required_platform?: string;
  required_post_type?: string;
  publication_deadline?: string;
  required_mentions?: string[];
}

// ============================================
// PUBLIC CAMPAIGN TYPES
// ============================================
// Used by the public/logged-out landing + campaign browse pages. Extends the
// authenticated Campaign shape with fields the public serializer adds
// (e.g. the brand's logo) that aren't part of the internal Campaign type.

export interface PublicCampaign extends Campaign {
  brand_logo?: string | null;
}

export interface PublicCampaignListResponse {
  campaigns: PublicCampaign[];
  total?: number;
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
  completed_collaborations?: number;
  creators_worked_with?: number;
  work_history?: any[];
}

// ============================================
// APPLICATION TYPES
// ============================================

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'completed';

export interface Application {
  id: number;
  campaign_id: number;
  creator_id: number;
  creator_name?: string | null;
  creator_avatar?: string | null;
  campaign_title?: string | null;
  campaign_budget?: number | null;
  campaign_type?: string | null;
  proposal: string;
  rate?: number | null;
  message?: string | null;
  application_answers?: { question: string; answer: string }[] | null;
  selected_portfolio?: any[] | null;
  deliverable_deadline?: string | null;
  completed_collaborations?: number;
  creators_needed?: number;
  match_score?: number | null;
  match_breakdown?: { key: string; label: string; score: number; max: number; matched: boolean; detail?: string }[] | null;
  match_reasons?: string[] | null;
  match_configured_count?: number;
  status: ApplicationStatus;
  agreed_rate?: number | null;
  rate_locked?: boolean;
  negotiation_status?: string;
  created_at: string;
  updated_at?: string | null;
}

export interface ApplicationCreateData {
  campaign_id: number;
  proposal: string;
  rate?: number | null;
  message?: string | null;
  application_answers?: { question: string; answer: string }[];
  selected_portfolio?: any[];
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
// CREATOR DISCOVERY TYPES (Increment 5)
// ============================================

export interface CreatorListItem {
  id: number;
  display_name?: string | null;
  username?: string | null;
  bio?: string | null;
  location?: string | null;
  profile_image?: string | null;
  creator_type?: string | null;
  categories: string[];
  content_types: string[];
  starting_price?: number | null;
  is_shortlisted: boolean;
  avg_rating?: number | null;
  ratings_count: number;
}

export interface CreatorListResponse {
  creators: CreatorListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreatorListParams {
  search?: string;
  category?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  limit?: number;
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
  is_shortlisted: boolean;
  avg_rating?: number | null;
  ratings_count: number;
}

export interface ShortlistEntry {
  id: number;
  creator_id: number;
  created_at: string;
  creator: CreatorListItem;
}

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface CreatorInvite {
  id: number;
  business_id: number;
  creator_id: number;
  campaign_id?: number | null;
  message?: string | null;
  status: InviteStatus;
  created_at: string;
  updated_at?: string | null;
  business_name?: string | null;
  creator_name?: string | null;
  campaign_title?: string | null;
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

export interface CampaignPerformance {
  id?: number | null;
  campaign_id: number;
  campaign_title?: string | null;
  creator_spend: number;
  revenue: number;
  other_costs: number;
  total_cost: number;
  estimated_profit: number;
  roi_percent: number;
  sales_count?: number | null;
  reach?: number | null;
  engagement?: number | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PaymentSummary {
  role: 'creator' | 'business' | string;
  this_month: number;
  lifetime: number;
  completed_payment_count: number;
}

// ============================================
// WORKSPACE TYPES (Increment 5)
// ============================================

export interface Collab {
  id: number; // application id
  campaign_id: number;
  campaign_title?: string | null;
  business_id: number;
  business_name?: string | null;
  business_logo?: string | null;
  creator_id: number;
  creator_name?: string | null;
  creator_avatar?: string | null;
  rate?: number | null;
  agreed_rate?: number | null;
  rate_locked?: boolean;
  negotiation_status?: string;
  status: string;
  created_at: string;
  creator_confirmed?: boolean;
  creator_verified?: boolean;
  pending_deliverables: number;
  unread_messages: number;
  payment_status?: 'initiated' | 'funded' | 'released' | 'completed' | 'failed' | 'refunded' | null;
  funded_amount?: number | null;
  completion_mode?: 'approval_only' | 'publication_required' | string | null;
  required_platforms?: string[] | null;
  required_post_types?: string[] | null;
  required_platform?: string | null;
  required_post_type?: string | null;
  publication_deadline?: string | null;
  amount_paid?: number | null;
  rated?: boolean;
  campaign_type?: 'paid' | string | null;
  deliverable_deadline?: string | null;
  total_deliverables: number;
  submitted_deliverables: number;
  approved_deliverables: number;
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
}

export interface Rating {
  id: number;
  application_id: number;
  business_id: number;
  creator_id: number;
  business_name?: string | null;
  campaign_title?: string | null;
  score: number;
  review?: string | null;
  created_at: string;
}

export interface CreatorRatingSummary {
  average?: number | null;
  count: number;
  ratings: Rating[];
}


export type DeliverableStatus = 'pending' | 'submitted' | 'approved' | 'revision_requested';

export interface PublicationProof {
  id: number; application_id: number; deliverable_id?: number | null; platform: string; post_type?: string | null; post_url: string; screenshot_url?: string | null; status: string; feedback?: string | null; submitted_at?: string | null; verified_at?: string | null; verified_by?: number | null;
}

export interface WorkspaceDeliverable {
  id: number;
  application_id: number;
  campaign_title?: string | null;
  other_party_name?: string | null;
  title: string;
  description?: string | null;
  due_date?: string | null;
  status: DeliverableStatus;
  file_url?: string | null;
  media_type?: 'image' | 'video' | null;
  submission_note?: string | null;
  feedback?: string | null;
  submitted_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  payment_released?: boolean;
  payment_amount?: number | null;
  payment_id?: number | null;
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

export interface CampaignDefaults {
  default_dos: string[];
  default_donts: string[];
  default_video_spec: VideoSpec | null;
  default_creator_requirements: CreatorRequirements | null;
  default_application_questions: string[];
}

export const getCampaignDefaults = async (): Promise<CampaignDefaults | null> => {
  try {
    const response = await api.get<CampaignDefaults>('/onboarding/business/campaign-defaults');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

export const saveCampaignDefaults = async (data: CampaignDefaults): Promise<CampaignDefaults> => {
  const response = await api.patch<CampaignDefaults>('/onboarding/business/campaign-defaults', data);
  return response.data;
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

// Public, unauthenticated campaign feed used by the logged-out landing page
// and public campaign browse view. Only "published"/"in_progress" campaigns
// should ever come back from this endpoint — draft/cancelled campaigns must
// stay hidden server-side.
//
// NOTE: adjust the path below to match whatever your backend actually
// exposes (e.g. it may be `/campaigns/public`, `/public/campaigns`, or
// `/campaigns?public=true`) and confirm the response is shaped as
// `{ campaigns: [...] }`.
export const getPublicCampaigns = async (
  params?: PublicCampaignListParams
): Promise<PublicCampaignListResponse> => {
  const response = await api.get<PublicCampaignListResponse>('/campaigns/public', { params });
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

// A campaign auto-flips to "in_progress" as soon as one application on it
// is accepted, and the backend refuses to delete anything "in_progress"
// (app/routes/campaigns.py). There was previously no way back out of that
// state. This calls the same PUT /campaigns/{id} update endpoint (which only
// blocks changes on "completed" campaigns) to move the status to
// "cancelled" instead, after which delete works normally. Kept separate
// from updateCampaign's typed payload since `status` isn't part of
// CampaignCreateData.
export const closeCampaign = async (id: number | string): Promise<Campaign> => {
  const response = await api.put<Campaign>(`/campaigns/${id}/close`, {});
  return response.data;
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
// API FUNCTIONS - CREATOR DISCOVERY (Increment 5)
// ============================================

export const getCreators = async (params?: CreatorListParams): Promise<CreatorListResponse> => {
  const response = await api.get<CreatorListResponse>('/creators', { params });
  return response.data;
};

export const getCreatorProfile = async (id: number | string): Promise<PublicCreatorProfile> => {
  const response = await api.get<PublicCreatorProfile>(`/creators/${id}`);
  return response.data;
};

export const shortlistCreator = async (id: number | string): Promise<ShortlistEntry> => {
  const response = await api.post<ShortlistEntry>(`/creators/${id}/shortlist`, {});
  return response.data;
};

export const unshortlistCreator = async (id: number | string): Promise<void> => {
  await api.delete(`/creators/${id}/shortlist`);
};

export const getShortlist = async (): Promise<ShortlistEntry[]> => {
  const response = await api.get<ShortlistEntry[]>('/creators/shortlist');
  return response.data;
};

export const inviteCreator = async (
  id: number | string,
  data: { campaign_id?: number | null; message?: string }
): Promise<CreatorInvite> => {
  const response = await api.post<CreatorInvite>(`/creators/${id}/invite`, data);
  return response.data;
};

export const getInvites = async (): Promise<CreatorInvite[]> => {
  const response = await api.get<CreatorInvite[]>('/creators/invites');
  return response.data;
};

export const respondToInvite = async (
  id: number,
  status: 'accepted' | 'declined'
): Promise<CreatorInvite> => {
  const response = await api.put<CreatorInvite>(`/creators/invites/${id}`, { status });
  return response.data;
};

// ============================================
// API FUNCTIONS - WORKSPACE (Increment 5)
// ============================================

export const confirmCollaboration = async (collabId: number): Promise<Collab> => {
  const response = await api.post<Collab>(`/workspace/collabs/${collabId}/confirm`);
  return response.data;
};

export const verifyCollaboration = async (collabId: number): Promise<Collab> => {
  const response = await api.post<Collab>(`/workspace/collabs/${collabId}/verify`);
  return response.data;
};

// Repairs a collaboration that was somehow accepted without an agreed rate
// (legacy data, or a campaign edited after acceptance). Fails with 400 if
// the collaboration already has a rate — this is not a renegotiation path.
export const fixCollabRate = async (collabId: number, amount: number): Promise<Collab> => {
  const response = await api.put<Collab>(`/workspace/collabs/${collabId}/rate`, { amount });
  return response.data;
};

export const getCollabs = async (): Promise<Collab[]> => {
  const response = await api.get<Collab[]>('/workspace/collabs');
  return response.data;
};

export const getCollabHistory = async (): Promise<Collab[]> => {
  const response = await api.get<Collab[]>('/workspace/history');
  return response.data;
};

// ============================================
// API FUNCTIONS - PAYMENTS (Khalti)
// ============================================

export const initiateCampaignFunding = async (
  campaignId: number
): Promise<{ payment_url: string; pidx: string; purchase_order_id: string }> => {
  const response = await api.post(`/payments/campaign/${campaignId}/initiate`);
  return response.data;
};

export const getCampaignPayments = async (campaignId: number): Promise<Payment[]> => {
  const response = await api.get<Payment[]>(`/payments/campaign/${campaignId}`);
  return response.data;
};

export const initiatePayment = async (
  collabId: number
): Promise<{ payment_url: string; pidx: string; purchase_order_id: string }> => {
  const response = await api.post('/payments/initiate', { collab_id: collabId });
  return response.data;
};

export const releasePayment = async (collabId: number): Promise<Payment> =>
  (await api.post<Payment>(`/payments/release/${collabId}`)).data;

export interface NegotiationOffer {
  id: number;
  application_id: number;
  sender_id: number;
  sender_name?: string | null;
  sender_role?: string | null;
  amount: number;
  message?: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'superseded';
  created_at: string;
  responded_at?: string | null;
}

export const getNegotiation = async (applicationId: number): Promise<NegotiationOffer[]> => {
  const response = await api.get<NegotiationOffer[]>(`/negotiations/${applicationId}`);
  return response.data;
};

export const makeNegotiationOffer = async (applicationId: number, amount: number, message?: string): Promise<NegotiationOffer> => {
  const response = await api.post<NegotiationOffer>(`/negotiations/${applicationId}/offers`, { amount, message });
  return response.data;
};

export const acceptNegotiationOffer = async (applicationId: number, offerId: number): Promise<NegotiationOffer> => {
  const response = await api.post<NegotiationOffer>(`/negotiations/${applicationId}/offers/${offerId}/accept`);
  return response.data;
};

export const rejectNegotiationOffer = async (applicationId: number, offerId: number): Promise<NegotiationOffer> => {
  const response = await api.post<NegotiationOffer>(`/negotiations/${applicationId}/offers/${offerId}/reject`);
  return response.data;
};

export const verifyPayment = async (pidx: string): Promise<Payment> => {
  const response = await api.get<Payment>('/payments/verify', { params: { pidx } });
  return response.data;
};

export const completeDemoPayment = async (
  pidx: string,
  options?: { method?: string; account_name?: string; reference_note?: string },
): Promise<Payment> => {
  const response = await api.post<Payment>('/payments/demo/complete', null, {
    params: { pidx, ...(options || {}) },
  });
  return response.data;
};

export const getPaymentsForCollab = async (collabId: number): Promise<Payment[]> => {
  const response = await api.get<Payment[]>(`/payments/by-collab/${collabId}`);
  return response.data;
};

export const getPaymentSummary = async (): Promise<PaymentSummary> => {
  const response = await api.get<PaymentSummary>('/payments/summary');
  return response.data;
};

export const getCampaignPerformances = async (): Promise<CampaignPerformance[]> => {
  const response = await api.get<CampaignPerformance[]>('/campaign-performance');
  return response.data;
};

export const getCampaignPerformance = async (campaignId: number): Promise<CampaignPerformance> => {
  const response = await api.get<CampaignPerformance>(`/campaign-performance/${campaignId}`);
  return response.data;
};

export const updateCampaignPerformance = async (campaignId: number, data: {
  revenue: number; other_costs: number; sales_count?: number; reach?: number; engagement?: number; notes?: string;
}): Promise<CampaignPerformance> => {
  const response = await api.put<CampaignPerformance>(`/campaign-performance/${campaignId}`, data);
  return response.data;
};

export const getNotifications = async (unreadOnly = false): Promise<Notification[]> => {
  const response = await api.get<Notification[]>('/notifications/', { params: { unread_only: unreadOnly } });
  return response.data;
};

export const getUnreadNotificationCount = async (): Promise<number> => {
  const response = await api.get<{ count: number }>('/notifications/unread-count');
  return response.data.count;
};

export const markNotificationRead = async (notificationId: number): Promise<Notification> => {
  const response = await api.patch<Notification>(`/notifications/${notificationId}/read`, { is_read: true });
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post('/notifications/read-all');
};

// ============================================
// API FUNCTIONS - RATINGS
// ============================================

export const rateCreator = async (collabId: number, score: number, review?: string): Promise<Rating> => {
  const response = await api.post<Rating>('/ratings/', { collab_id: collabId, score, review });
  return response.data;
};

export const getRatingForCollab = async (collabId: number): Promise<Rating | null> => {
  const response = await api.get<Rating | null>(`/ratings/by-collab/${collabId}`);
  return response.data;
};

export const getCreatorRatings = async (creatorId: number | string): Promise<CreatorRatingSummary> => {
  const response = await api.get<CreatorRatingSummary>(`/ratings/creator/${creatorId}`);
  return response.data;
};

export const getDeliverables = async (collabId?: number): Promise<WorkspaceDeliverable[]> => {
  const response = await api.get<WorkspaceDeliverable[]>('/workspace/deliverables', {
    params: collabId ? { collab_id: collabId } : undefined,
  });
  return response.data;
};

export const createDeliverable = async (data: {
  collab_id: number;
  title: string;
  description?: string;
  due_date?: string;
}): Promise<WorkspaceDeliverable> => {
  const response = await api.post<WorkspaceDeliverable>('/workspace/deliverables', data);
  return response.data;
};

export const submitDeliverable = async (
  id: number,
  data: { file_url: string; media_type: 'image' | 'video'; submission_note?: string }
): Promise<WorkspaceDeliverable> => {
  const response = await api.put<WorkspaceDeliverable>(`/workspace/deliverables/${id}/submit`, data);
  return response.data;
};

export const getPublicationProofs = async (collabId: number): Promise<PublicationProof[]> =>
  (await api.get<PublicationProof[]>(`/publication/${collabId}`)).data;

export const submitPublicationProof = async (
  collabId: number,
  data: { deliverable_id?: number; platform: string; post_type?: string; post_url: string; screenshot_url?: string }
): Promise<PublicationProof> =>
  (await api.post<PublicationProof>(`/publication/${collabId}`, data)).data;

export const reviewPublicationProof = async (
  collabId: number,
  proofId: number,
  data: { status: string; feedback?: string }
): Promise<PublicationProof> =>
  (await api.post<PublicationProof>(`/publication/${collabId}/${proofId}/review`, data)).data;

export const reviewDeliverable = async (
  id: number,
  data: { status: 'approved' | 'revision_requested'; feedback?: string }
): Promise<WorkspaceDeliverable> => {
  const response = await api.put<WorkspaceDeliverable>(`/workspace/deliverables/${id}/review`, data);
  return response.data;
};

export const reviewAllDeliverables = async (
  collabId: number
): Promise<WorkspaceDeliverable[]> => {
  const response = await api.put<WorkspaceDeliverable[]>(
    `/workspace/deliverables/review-all?collab_id=${collabId}`,
    { status: 'approved' }
  );
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

export const uploadMedia = async (file: File): Promise<{ url: string; media_type: 'image' | 'video' }> => {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('access_token');
  const response = await axios.post<{ url: string; media_type: 'image' | 'video' }>(
    `${API_BASE_URL}/uploads/media`, formData,
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
  );
  return response.data;
};

// ============================================
// API FUNCTIONS - ADMIN
// ============================================

export interface AdminOverview {
  users: number;
  brands: number;
  creators: number;
  active_campaigns: number;
  active_collaborations: number;
  open_cases: number;
  funded_payments: number;
}

export interface AdminCase {
  id: number;
  application_id?: number | null;
  reported_user_id: number;
  case_type: string;
  status: string;
  severity: string;
  description?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
}

export const getAdminOverview = async (): Promise<AdminOverview> =>
  (await api.get<AdminOverview>('/admin/overview')).data;

export const getAdminCases = async (): Promise<AdminCase[]> =>
  (await api.get<AdminCase[]>('/admin/cases')).data;

export const updateAdminCase = async (
  id: number,
  data: { status: string; severity?: string; resolution?: string }
): Promise<AdminCase> => (await api.patch<AdminCase>(`/admin/cases/${id}`, data)).data;

export const getAdminUsers = async (): Promise<any[]> =>
  (await api.get<any[]>('/admin/users')).data;

export const adminUserAction = async (
  id: number,
  action: 'warn' | 'suspend' | 'activate' | 'ban'
) => (await api.post(`/admin/users/${id}/action`, { action })).data;

export const openDispute = async (collabId: number, reason: string): Promise<AdminCase> =>
  (await api.post<AdminCase>(`/disputes/${collabId}`, { reason })).data;

export default api;