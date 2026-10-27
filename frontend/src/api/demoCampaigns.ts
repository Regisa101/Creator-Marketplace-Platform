// ---------------------------------------------------------------------------
// SAMPLE CAMPAIGNS
//
// Reference campaigns that keep the marketplace from looking empty while real
// brands are still posting. They are NOT stored in the database:
//   - they always sort AFTER real campaigns,
//   - creators can open, save and apply to them (kept in this browser only),
//   - nothing is ever sent to the backend or to a brand.
//
// To remove them completely, set SHOW_SAMPLE_CAMPAIGNS to false.
// ---------------------------------------------------------------------------
import type {
  Application,
  ApplicationCreateData,
  PublicBusinessProfile,
  PublicCampaign,
  SavedCampaignEntry,
} from './client';

export const SHOW_SAMPLE_CAMPAIGNS = true;

const DEMO_CAMPAIGN_START = 900001;
const DEMO_APPLICATION_START = 800001;

export const isDemoCampaignId = (id: number | string | null | undefined) => {
  const n = Number(id);
  return Number.isFinite(n) && n >= DEMO_CAMPAIGN_START;
};

export const isDemoApplicationId = (id: number | string | null | undefined) => {
  const n = Number(id);
  return Number.isFinite(n) && n >= DEMO_APPLICATION_START && n < DEMO_CAMPAIGN_START;
};

export const isDemoCampaign = (c?: { id?: number | string | null } | null) =>
  !!c && isDemoCampaignId(c.id);

/** Real campaigns first, sample campaigns last (keeps the original order inside each group). */
export function demoLast<T extends { id?: number | string | null }>(items: T[]): T[] {
  return [
    ...items.filter((c) => !isDemoCampaignId(c.id)),
    ...items.filter((c) => isDemoCampaignId(c.id)),
  ];
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Row = {
  brand: string;
  type: string; // business type shown on the brand page
  city: string;
  category: string;
  title: string;
  about: string;
  creatorTypes: string[];
  platforms: string[];
  skills: string[];
  deliverables: string[];
  min: number;
  max: number;
  engagement: 'One-time' | 'Weekly' | 'Monthly' | 'Long-term';
  duration: string;
  level: 'Entry level' | 'Intermediate' | 'Experienced';
  needed: number;
  color: string;
};

const ROWS: Row[] = [
  { brand: 'Himal Brew Co.', type: 'Cafe', city: 'Kathmandu, Nepal', category: 'Food', title: 'Cafe Reels for Our Winter Menu Launch', about: 'We are launching a winter menu of hot chocolate, masala chiya lattes and baked treats at our Thamel cafe. We need warm, cosy short videos that make people want to visit.', creatorTypes: ['Content Creator', 'Videographer'], platforms: ['Instagram', 'TikTok'], skills: ['Short-form video', 'Video editing'], deliverables: ['3 Instagram Reels (20-30s)', '10 story frames'], min: 8000, max: 15000, engagement: 'One-time', duration: '2 weeks', level: 'Entry level', needed: 2, color: '#8d5524' },
  { brand: 'Momo Junction', type: 'Restaurant', city: 'Lalitpur, Nepal', category: 'Food', title: 'Short Food Videos for Our Momo Festival Week', about: 'A week-long festival of 12 momo varieties. Show the steam, the sizzle and the first bite. Fun, fast-paced edits work best.', creatorTypes: ['UGC Creator', 'Content Creator'], platforms: ['TikTok', 'Instagram'], skills: ['Short-form video', 'Storytelling'], deliverables: ['4 short videos', '1 behind-the-scenes reel'], min: 6000, max: 12000, engagement: 'One-time', duration: '10 days', level: 'Entry level', needed: 3, color: '#d9480f' },
  { brand: 'Thakali Kitchen', type: 'Restaurant', city: 'Pokhara, Nepal', category: 'Food', title: 'Dal Bhat Photo and Reel Series', about: 'Authentic Thakali thali served on brass plates. We want honest, beautiful photos and reels showing how the meal is prepared and served.', creatorTypes: ['Photographer', 'Videographer'], platforms: ['Instagram', 'Facebook'], skills: ['Product photography', 'Storytelling'], deliverables: ['20 edited photos', '2 reels'], min: 12000, max: 22000, engagement: 'One-time', duration: '1 month', level: 'Intermediate', needed: 1, color: '#b7791f' },
  { brand: 'Sunakhari Skin', type: 'Skincare brand', city: 'Kathmandu, Nepal', category: 'Beauty', title: 'Skincare Routine UGC Videos', about: 'Create genuine morning and night routine videos using our gentle cleanser, serum and sunscreen. No scripted ads, just real routines.', creatorTypes: ['UGC Creator', 'Influencer'], platforms: ['Instagram', 'TikTok'], skills: ['Reviews', 'Short-form video'], deliverables: ['3 UGC videos (30-45s)', 'Raw footage'], min: 10000, max: 18000, engagement: 'One-time', duration: '3 weeks', level: 'Entry level', needed: 4, color: '#c2255c' },
  { brand: 'Himalayan Glow', type: 'Cosmetics brand', city: 'Bhaktapur, Nepal', category: 'Beauty', title: 'Herbal Face Pack Review Series', about: 'Try our herbal face packs for two weeks and share honest weekly reviews with before and after notes.', creatorTypes: ['Influencer', 'Blogger'], platforms: ['Instagram', 'YouTube'], skills: ['Reviews', 'Tutorials'], deliverables: ['2 review reels', '1 YouTube review'], min: 9000, max: 16000, engagement: 'Weekly', duration: '4 weeks', level: 'Intermediate', needed: 2, color: '#2f9e44' },
  { brand: 'Thamel Threads', type: 'Fashion label', city: 'Kathmandu, Nepal', category: 'Fashion', title: 'Dashain Collection Lookbook Shoot', about: 'Our festive collection mixes traditional prints with modern cuts. We need a creator who can style, shoot and edit a lookbook.', creatorTypes: ['Model', 'Photographer'], platforms: ['Instagram'], skills: ['Photography', 'Graphic design'], deliverables: ['30 lookbook photos', '3 styling reels'], min: 20000, max: 35000, engagement: 'One-time', duration: '3 weeks', level: 'Experienced', needed: 2, color: '#7048e8' },
  { brand: 'Dhaka Weave Studio', type: 'Fashion label', city: 'Palpa, Nepal', category: 'Fashion', title: 'Modern Dhaka Topi Styling Reels', about: 'Show young people how to style Dhaka topi and fabric accessories for college, office and weddings.', creatorTypes: ['Content Creator', 'Influencer'], platforms: ['TikTok', 'Instagram'], skills: ['Short-form video', 'Storytelling'], deliverables: ['5 styling reels'], min: 7000, max: 13000, engagement: 'One-time', duration: '2 weeks', level: 'Entry level', needed: 3, color: '#e8590c' },
  { brand: 'Everest Trails Nepal', type: 'Trekking company', city: 'Kathmandu, Nepal', category: 'Travel', title: 'Annapurna Circuit Trekking Vlog', about: 'Join one of our guided groups and document the journey day by day. Strong storytelling and mountain-ready gear are a must.', creatorTypes: ['Videographer', 'Content Creator'], platforms: ['YouTube', 'Instagram'], skills: ['Video editing', 'Storytelling', 'Live content'], deliverables: ['1 YouTube vlog (8-12 min)', '6 reels'], min: 40000, max: 60000, engagement: 'One-time', duration: '3 weeks', level: 'Experienced', needed: 1, color: '#1971c2' },
  { brand: 'Lakeside Stays', type: 'Boutique homestay', city: 'Pokhara, Nepal', category: 'Travel', title: 'Boutique Homestay Photo and Video Package', about: 'Capture our rooms, lake view breakfast and local experiences for our website and social pages.', creatorTypes: ['Photographer', 'Videographer'], platforms: ['Instagram', 'Facebook'], skills: ['Photography', 'Video editing'], deliverables: ['25 photos', '1 walkthrough video'], min: 15000, max: 25000, engagement: 'One-time', duration: '1 week', level: 'Intermediate', needed: 1, color: '#0c8599' },
  { brand: 'Pathshala Online', type: 'Education platform', city: 'Kathmandu, Nepal', category: 'Education', title: 'Student Success Story Reels', about: 'Interview and feature students who passed their entrance exams with our online classes. Warm, honest storytelling please.', creatorTypes: ['Content Creator', 'Videographer'], platforms: ['Instagram', 'Facebook'], skills: ['Storytelling', 'Video editing'], deliverables: ['4 testimonial reels'], min: 9000, max: 14000, engagement: 'One-time', duration: '3 weeks', level: 'Entry level', needed: 2, color: '#364fc7' },
  { brand: 'Kode Kathmandu', type: 'Software company', city: 'Lalitpur, Nepal', category: 'Technology', title: 'App Walkthrough and Tutorial Videos', about: 'Our budgeting app is new and needs clear, friendly tutorial videos that explain features in simple Nepali and English.', creatorTypes: ['Content Creator', 'UGC Creator'], platforms: ['YouTube', 'TikTok'], skills: ['Tutorials', 'Voiceover', 'Video editing'], deliverables: ['5 tutorial videos (60-90s)'], min: 14000, max: 24000, engagement: 'Monthly', duration: '2 months', level: 'Intermediate', needed: 2, color: '#1098ad' },
  { brand: 'Gadget Ghar', type: 'Electronics store', city: 'Kathmandu, Nepal', category: 'Technology', title: 'Smartphone Unboxing and Honest Reviews', about: 'Review the latest phones and earbuds from our store. We value honest, detailed reviews over hype.', creatorTypes: ['Influencer', 'Videographer'], platforms: ['YouTube', 'TikTok'], skills: ['Reviews', 'Video editing'], deliverables: ['2 long reviews', '4 shorts'], min: 18000, max: 30000, engagement: 'Monthly', duration: '1 month', level: 'Experienced', needed: 2, color: '#495057' },
  { brand: 'Sajilo Pay', type: 'Fintech startup', city: 'Kathmandu, Nepal', category: 'Finance', title: 'Digital Wallet Basics Explainer Reels', about: 'Explain QR payments, bill pay and saving in plain language for first-time users, especially students.', creatorTypes: ['Content Creator', 'Influencer'], platforms: ['Instagram', 'TikTok'], skills: ['Short-form video', 'Copywriting', 'Tutorials'], deliverables: ['6 explainer reels'], min: 15000, max: 26000, engagement: 'Monthly', duration: '6 weeks', level: 'Intermediate', needed: 2, color: '#099268' },
  { brand: 'FitFuel Nepal', type: 'Gym and nutrition', city: 'Lalitpur, Nepal', category: 'Fitness', title: '30-Day Home Workout Challenge', about: 'Lead a 30-day beginner challenge with daily short workouts that can be done at home without equipment.', creatorTypes: ['Influencer', 'Content Creator'], platforms: ['Instagram', 'YouTube'], skills: ['Short-form video', 'Live content', 'Tutorials'], deliverables: ['30 daily short videos', '2 live sessions'], min: 25000, max: 40000, engagement: 'Long-term', duration: '1 month', level: 'Experienced', needed: 1, color: '#e03131' },
  { brand: 'Yoga Himal', type: 'Wellness studio', city: 'Lalitpur, Nepal', category: 'Health', title: 'Morning Yoga and Mindfulness Content Series', about: 'Calm, beautifully shot morning yoga clips for our studio page and newsletter.', creatorTypes: ['Videographer', 'Content Creator'], platforms: ['Instagram', 'YouTube'], skills: ['Video editing', 'Voiceover'], deliverables: ['8 short clips', '2 long sessions'], min: 12000, max: 20000, engagement: 'Weekly', duration: '6 weeks', level: 'Intermediate', needed: 1, color: '#5f3dc4' },
  { brand: 'Aakar Gaming Lounge', type: 'Gaming cafe', city: 'Kathmandu, Nepal', category: 'Gaming', title: 'Esports Night Streaming and Highlights', about: 'Stream our monthly esports night and cut highlight clips for social media.', creatorTypes: ['Content Creator', 'Influencer'], platforms: ['YouTube', 'TikTok'], skills: ['Live content', 'Video editing'], deliverables: ['1 live stream', '6 highlight clips'], min: 10000, max: 18000, engagement: 'Monthly', duration: '2 months', level: 'Intermediate', needed: 2, color: '#6741d9' },
  { brand: 'Ghar Ko Maya Interiors', type: 'Interior studio', city: 'Bhaktapur, Nepal', category: 'Home & Living', title: 'Apartment Makeover Reel Series', about: 'Film before and after reveals of small apartment makeovers using local furniture and decor.', creatorTypes: ['Videographer', 'Photographer'], platforms: ['Instagram', 'Facebook'], skills: ['Video editing', 'Photography', 'Storytelling'], deliverables: ['3 makeover reels', '15 photos'], min: 16000, max: 28000, engagement: 'One-time', duration: '1 month', level: 'Intermediate', needed: 1, color: '#c2410c' },
  { brand: 'Sherpa Sports Club', type: 'Sports club', city: 'Kathmandu, Nepal', category: 'Sports', title: 'Futsal Tournament Highlights and Photos', about: 'Cover our weekend futsal tournament with photos, quick highlight reels and player interviews.', creatorTypes: ['Photographer', 'Videographer'], platforms: ['Instagram', 'Facebook'], skills: ['Photography', 'Video editing', 'Live content'], deliverables: ['40 photos', '3 highlight reels'], min: 9000, max: 16000, engagement: 'One-time', duration: '1 week', level: 'Entry level', needed: 2, color: '#0b7285' },
  { brand: 'Madal Music House', type: 'Music school', city: 'Kathmandu, Nepal', category: 'Music', title: 'Cover Song Collab Videos', about: 'Record acoustic covers of popular Nepali songs using our instruments for our channel.', creatorTypes: ['Content Creator', 'Podcaster'], platforms: ['YouTube', 'Instagram'], skills: ['Video editing', 'Voiceover'], deliverables: ['4 cover videos'], min: 8000, max: 14000, engagement: 'Monthly', duration: '1 month', level: 'Entry level', needed: 3, color: '#a61e4d' },
  { brand: 'Newa Lens Studio', type: 'Photo studio', city: 'Bhaktapur, Nepal', category: 'Photography', title: 'Old Bhaktapur Street Photography Walk Content', about: 'Document a guided photography walk through old Bhaktapur and turn it into a short film and photo set.', creatorTypes: ['Photographer', 'Videographer'], platforms: ['Instagram', 'YouTube'], skills: ['Photography', 'Storytelling', 'Video editing'], deliverables: ['20 photos', '1 short film'], min: 14000, max: 22000, engagement: 'One-time', duration: '2 weeks', level: 'Intermediate', needed: 1, color: '#343a40' },
  { brand: 'Little Yeti Kids', type: 'Toy and kids store', city: 'Lalitpur, Nepal', category: 'Parenting', title: 'Parent Review Videos for Our Toy Range', about: 'Parents who test our wooden and learning toys with their kids and share honest reviews.', creatorTypes: ['UGC Creator', 'Blogger'], platforms: ['Instagram', 'Facebook'], skills: ['Reviews', 'Short-form video'], deliverables: ['2 review videos', '5 photos'], min: 7000, max: 12000, engagement: 'One-time', duration: '3 weeks', level: 'Entry level', needed: 4, color: '#f08c00' },
  { brand: 'Paws Nepal', type: 'Pet care', city: 'Kathmandu, Nepal', category: 'Pets', title: 'Pet Adoption Awareness Reels', about: 'Help rescued dogs and cats find homes with heartfelt stories and clean, bright videos.', creatorTypes: ['Content Creator', 'Photographer'], platforms: ['Instagram', 'TikTok'], skills: ['Short-form video', 'Storytelling', 'Photography'], deliverables: ['6 adoption reels', '20 portraits'], min: 6000, max: 11000, engagement: 'Monthly', duration: '2 months', level: 'Entry level', needed: 2, color: '#37b24d' },
  { brand: 'Rato Bhale Events', type: 'Event company', city: 'Kathmandu, Nepal', category: 'Entertainment', title: 'Festival Aftermovie Video Editor', about: 'Edit a 3-minute aftermovie and 5 teaser clips from our weekend music festival footage.', creatorTypes: ['Videographer'], platforms: ['YouTube', 'Instagram'], skills: ['Video editing', 'Storytelling'], deliverables: ['1 aftermovie', '5 teasers'], min: 20000, max: 32000, engagement: 'One-time', duration: '2 weeks', level: 'Experienced', needed: 1, color: '#d6336c' },
  { brand: 'Kathmandu Kicks Autos', type: 'Scooter dealership', city: 'Kathmandu, Nepal', category: 'Automotive', title: 'Electric Scooter Review Reels', about: 'Take our electric scooters around the valley and review range, comfort and city riding.', creatorTypes: ['Influencer', 'Videographer'], platforms: ['YouTube', 'Instagram'], skills: ['Reviews', 'Video editing'], deliverables: ['1 long review', '3 reels'], min: 15000, max: 25000, engagement: 'One-time', duration: '3 weeks', level: 'Intermediate', needed: 2, color: '#1864ab' },
  { brand: 'Nepali Chiya Co.', type: 'Tea brand', city: 'Ilam, Nepal', category: 'Lifestyle', title: 'Slow Morning Routine Lifestyle Content', about: 'Share a cosy morning routine featuring our Ilam tea. Natural light, calm pace, honest voice.', creatorTypes: ['Content Creator', 'UGC Creator'], platforms: ['Instagram', 'TikTok'], skills: ['Short-form video', 'Storytelling'], deliverables: ['3 reels', '8 photos'], min: 6000, max: 10000, engagement: 'One-time', duration: '2 weeks', level: 'Entry level', needed: 3, color: '#2b8a3e' },
  { brand: 'Terai Organic Farm', type: 'Organic farm', city: 'Butwal, Nepal', category: 'Lifestyle', title: 'Farm-to-Table Story Series', about: 'Visit our farm and tell the story of how vegetables and honey reach Kathmandu kitchens.', creatorTypes: ['Videographer', 'Blogger'], platforms: ['Facebook', 'Instagram'], skills: ['Storytelling', 'Photography', 'Copywriting'], deliverables: ['1 mini documentary', '10 photos'], min: 13000, max: 21000, engagement: 'One-time', duration: '1 month', level: 'Intermediate', needed: 1, color: '#5c940d' },
];

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;

function build(): PublicCampaign[] {
  const now = Date.now();

  return ROWS.map((r, i) => {
    const id = DEMO_CAMPAIGN_START + i;
    const deadline = new Date(now + (14 + ((i * 5) % 27)) * DAY).toISOString();
    const created = new Date(now - (3 + i * 2) * DAY).toISOString();

    return {
      id,
      business_id: id,
      title: r.title,
      category: r.category,
      description: r.about,
      responsibilities:
        'Plan the content with our team, shoot and edit it, and share drafts for feedback before posting.',
      creator_types: r.creatorTypes,
      experience_level: r.level,
      required_skills: r.skills,
      location: r.city,
      work_arrangement: 'Flexible',
      requirements:
        'Original content only. Clear audio and good lighting. Share your public profile link when you apply.',
      deliverables: r.deliverables,
      creators_needed: r.needed,
      engagement_type: r.engagement,
      duration: r.duration,
      pricing_model: 'Custom budget',
      compensation_type: 'Budget range',
      platform_fee_rate: 0.1,
      budget: r.max,
      budget_min: r.min,
      budget_max: r.max,
      start_date: null,
      end_date: null,
      application_deadline: deadline,
      application_questions: [
        'Why are you a good fit for this campaign?',
        'Share a link to similar content you have created.',
      ],
      status: 'published',
      is_active: true,
      created_at: created,
      updated_at: created,
      application_count: 2 + ((i * 3) % 9),
      brand_name: r.brand,
      brand_location: r.city,
      // No logo on purpose: the app shows a picture for the company type instead.
      brand_logo: null,
      deadline,
      required_platforms: r.platforms,
      required_platform: r.platforms[0],
    } as PublicCampaign;
  });
}

let cache: PublicCampaign[] | null = null;

export function getDemoCampaigns(): PublicCampaign[] {
  if (!SHOW_SAMPLE_CAMPAIGNS) return [];
  if (!cache) cache = build();
  return cache;
}

export function getDemoCampaign(id: number | string): PublicCampaign | null {
  return getDemoCampaigns().find((c) => c.id === Number(id)) || null;
}

/** Sample campaigns matching the same filters the public list endpoint accepts. */
export function filterDemoCampaigns(params?: { category?: string; search?: string }) {
  const category = params?.category?.trim().toLowerCase();
  const search = params?.search?.trim().toLowerCase();

  return getDemoCampaigns().filter((c) => {
    if (category && c.category.toLowerCase() !== category) return false;
    if (search) {
      const text = [c.title, c.description, c.category, c.brand_name, c.location]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!text.includes(search)) return false;
    }
    return true;
  });
}

export function getDemoBusinessProfile(businessId: number | string): PublicBusinessProfile | null {
  const campaign = getDemoCampaign(businessId);
  if (!campaign) return null;
  const row = ROWS[campaign.id - DEMO_CAMPAIGN_START];

  return {
    id: campaign.business_id,
    company_name: campaign.brand_name || row.brand,
    business_type: row.type,
    industry: row.category,
    location: row.city,
    website: null,
    description: `${row.brand} is a sample brand used to show how a business page looks on CreatorHub.`,
    logo_url: null,
    social_links: {},
    interested_categories: [row.category],
    preferred_content_types: row.platforms,
    team_size: null,
    year_established: null,
    typical_budget: row.max,
    is_onboarding_complete: true,
    is_published: true,
    campaigns: [
      {
        id: campaign.id,
        title: campaign.title,
        category: campaign.category,
        status: 'published',
        budget: campaign.budget ?? null,
        campaign_type: campaign.engagement_type ?? null,
      },
    ],
    completed_collaborations: 0,
    creators_worked_with: 0,
    work_history: [],
  } as PublicBusinessProfile;
}

// ---------------------------------------------------------------------------
// Local (browser-only) applications and saved items for sample campaigns
// ---------------------------------------------------------------------------

const APPLICATIONS_KEY = 'ch-sample-applications';
const SAVED_KEY = 'ch-sample-saved';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (private mode); sample data is optional.
  }
}

function currentUserId(): number {
  try {
    const raw = localStorage.getItem('user');
    return raw ? Number(JSON.parse(raw)?.id) || 0 : 0;
  } catch {
    return 0;
  }
}

export function getDemoApplications(campaignId?: number): Application[] {
  const uid = currentUserId();
  return readJson<Application[]>(APPLICATIONS_KEY, []).filter(
    (a) => a.creator_id === uid && (campaignId == null || a.campaign_id === Number(campaignId)),
  );
}

export function createDemoApplication(data: ApplicationCreateData): Application {
  const campaign = getDemoCampaign(data.campaign_id);
  const all = readJson<Application[]>(APPLICATIONS_KEY, []);
  const uid = currentUserId();

  const existing = all.find((a) => a.creator_id === uid && a.campaign_id === data.campaign_id);
  if (existing) return existing;

  const now = new Date().toISOString();
  const application: Application = {
    id: DEMO_APPLICATION_START + all.length,
    campaign_id: data.campaign_id,
    creator_id: uid,
    campaign_title: campaign?.title ?? null,
    campaign_budget: campaign?.budget ?? null,
    proposal: data.proposal,
    rate: data.rate ?? null,
    message: data.message ?? null,
    application_answers: data.application_answers ?? [],
    selected_portfolio: data.selected_portfolio ?? [],
    social_link: data.social_link,
    creators_needed: campaign?.creators_needed ?? null,
    status: 'pending',
    created_at: now,
    updated_at: now,
  };

  writeJson(APPLICATIONS_KEY, [...all, application]);
  return application;
}

export function removeDemoApplication(id: number) {
  writeJson(
    APPLICATIONS_KEY,
    readJson<Application[]>(APPLICATIONS_KEY, []).filter((a) => a.id !== id),
  );
}

function savedIds(): number[] {
  return readJson<Record<string, number[]>>(SAVED_KEY, {})[String(currentUserId())] || [];
}

function setSavedIds(ids: number[]) {
  const all = readJson<Record<string, number[]>>(SAVED_KEY, {});
  all[String(currentUserId())] = ids;
  writeJson(SAVED_KEY, all);
}

export function saveDemoCampaign(campaignId: number): SavedCampaignEntry {
  const ids = savedIds();
  if (!ids.includes(campaignId)) setSavedIds([...ids, campaignId]);

  return {
    id: campaignId,
    creator_id: currentUserId(),
    campaign_id: campaignId,
    created_at: new Date().toISOString(),
    campaign: getDemoCampaign(campaignId) as PublicCampaign,
  };
}

export function unsaveDemoCampaign(campaignId: number) {
  setSavedIds(savedIds().filter((id) => id !== campaignId));
}

export function getDemoSavedEntries(): SavedCampaignEntry[] {
  return savedIds()
    .map((id) => getDemoCampaign(id))
    .filter((c): c is PublicCampaign => !!c)
    .map((c) => ({
      id: c.id,
      creator_id: currentUserId(),
      campaign_id: c.id,
      created_at: c.created_at,
      campaign: c,
    }));
}