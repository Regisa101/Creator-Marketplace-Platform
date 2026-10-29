// ---------------------------------------------------------------------------
// Real photos and real brand logos - ONE source of truth for every page.
//
// - Well-known brands (Daraz, Bhatbhateni ...) get their real logo.
// - Every other brand gets a real photograph that matches its business, taken
//   from Wikipedia / Wikimedia Commons (free images): a restaurant photo as the
//   logo and a momo photo as the cover for a momo restaurant, a Phewa Lake
//   photo for a travel brand, a smartphone photo for a gadget store ...
// - Photos are looked up once at start-up (preloadPhotos) and cached in the
//   browser, so the SAME image shows for a brand on every page.
// - If an image cannot load, the drawn picture is the very last fallback.
// ---------------------------------------------------------------------------

type Slot = { logo: string[]; cover: string[] };

// Real brands -> website domain (used to fetch the real logo).
const BRAND_DOMAINS: Record<string, string> = {
  daraz: 'daraz.com.np',
  bhatbhateni: 'bhatbhateni.com.np',
  'himalayan java': 'himalayanjava.com',
  airbnb: 'airbnb.com',
  starbucks: 'starbucks.com',
  dior: 'dior.com',
  unilever: 'unilever.com',
  uniqlo: 'uniqlo.com',
};

// Business type -> Wikipedia article titles whose lead photo is used.
// Several titles per slot: the first one that has a photo wins.
const CATEGORY_PHOTOS: Record<string, Slot> = {
  Food: { logo: ['Restaurant', 'Cafe'], cover: ['Momo (food)', 'Dal bhat', 'Nepalese cuisine'] },
  Beauty: { logo: ['Cosmetics', 'Lipstick'], cover: ['Skin care', 'Cosmetics'] },
  Fashion: { logo: ['Boutique', 'Clothing'], cover: ['Fashion', 'Clothing'] },
  Travel: { logo: ['Phewa Lake', 'Pokhara'], cover: ['Annapurna Circuit', 'Annapurna Conservation Area', 'Pokhara'] },
  Education: { logo: ['Classroom', 'School'], cover: ['Student', 'School'] },
  Technology: { logo: ['Consumer electronics', 'Smartphone'], cover: ['Smartphone', 'Laptop'] },
  Finance: { logo: ['Mobile payment', 'Smartphone'], cover: ['Mobile payment', 'QR code'] },
  Fitness: { logo: ['Dumbbell', 'Gym'], cover: ['Health club', 'Weight training'] },
  Health: { logo: ['Yoga', 'Meditation'], cover: ['Meditation', 'Yoga'] },
  Gaming: { logo: ['Game controller', 'Video game'], cover: ['Esports', 'Video game'] },
  'Home & Living': { logo: ['Interior design', 'Furniture'], cover: ['Living room', 'Interior design'] },
  Sports: { logo: ['Futsal', 'Association football'], cover: ['Futsal', 'Association football'] },
  Music: { logo: ['Guitar', 'Musical instrument'], cover: ['Musical instrument', 'Guitar'] },
  Photography: { logo: ['Camera', 'Photography'], cover: ['Photography', 'Camera'] },
  Parenting: { logo: ['Toy', 'Wooden toy'], cover: ['Educational toy', 'Toy'] },
  Pets: { logo: ['Dog', 'Pet'], cover: ['Pet', 'Dog'] },
  Entertainment: { logo: ['Music festival', 'Concert'], cover: ['Concert', 'Music festival'] },
  Automotive: { logo: ['Electric motorcycles and scooters', 'Scooter (motorcycle)'], cover: ['Scooter (motorcycle)', 'Electric vehicle'] },
  Lifestyle: { logo: ['Tea', 'Organic food'], cover: ['Tea garden', 'Tea', 'Farm'] },
  Default: { logo: ['Shopping', 'Retail'], cover: ['Marketplace', 'Retail'] },
};

// Specific brands that deserve a more exact photo than their business type.
const BRAND_PHOTOS: Record<string, Slot> = {
  'himal brew co.': { logo: ['Coffeehouse', 'Cafe'], cover: ['Coffee', 'Latte'] },
  'himalayan java': { logo: ['Coffeehouse', 'Cafe'], cover: ['Coffee', 'Latte'] },
  'momo junction': { logo: ['Restaurant'], cover: ['Momo (food)'] },
  'thakali kitchen': { logo: ['Restaurant', 'Thali'], cover: ['Dal bhat', 'Thali'] },
  'everest trails nepal': { logo: ['Mount Everest', 'Trekking'], cover: ['Annapurna Circuit', 'Trekking'] },
  'lakeside stays': { logo: ['Phewa Lake', 'Pokhara'], cover: ['Pokhara', 'Phewa Lake'] },
  'newa lens studio': { logo: ['Camera'], cover: ['Bhaktapur Durbar Square', 'Bhaktapur'] },
  'dhaka weave studio': { logo: ['Dhaka topi', 'Textile'], cover: ['Textile', 'Dhaka topi'] },
  'nepali chiya co.': { logo: ['Tea', 'Masala chai'], cover: ['Ilam District', 'Tea garden'] },
  'terai organic farm': { logo: ['Organic farming', 'Farm'], cover: ['Terai', 'Organic farming'] },
  'paws nepal': { logo: ['Dog'], cover: ['Dog', 'Pet'] },
  'bhatbhateni': { logo: ['Supermarket'], cover: ['Supermarket', 'Shopping mall'] },
  daraz: { logo: ['Online shopping'], cover: ['Online shopping', 'E-commerce'] },
  lali: { logo: ['Cosmetics'], cover: ['Cosmetics', 'Skin care'] },
  'avani nepal': { logo: ['Skin care', 'Cosmetics'], cover: ['Skin care', 'Cosmetics'] },
};

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const CACHE_KEY = 'ch-wiki-photos-v1';
const CACHE_DAYS = 14;
type CacheEntry = { url: string | null; at: number };
const memory: Record<string, CacheEntry> = {};

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    Object.assign(memory, JSON.parse(raw) as Record<string, CacheEntry>);
  } catch {
    /* storage unavailable: just keep it in memory */
  }
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memory));
  } catch {
    /* ignore */
  }
}

const fresh = (e?: CacheEntry) => !!e && Date.now() - e.at < CACHE_DAYS * 86400000;

// ---------------------------------------------------------------------------
// Wikipedia lookup
// ---------------------------------------------------------------------------

type Summary = {
  thumbnail?: { source: string; width: number };
  originalimage?: { source: string; width: number };
};

function isPhoto(url?: string) {
  return !!url && /\.(jpe?g|png|webp)(\?|$)/i.test(url) && !/\.svg/i.test(url);
}

async function fetchTitle(title: string, width: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Summary;
    const original = data.originalimage;
    if (!original || !isPhoto(original.source)) return null;

    // Ask Wikimedia for a resized copy when the original is big enough.
    const thumb = data.thumbnail?.source;
    if (thumb && original.width >= width && /\/\d+px-/.test(thumb)) {
      return thumb.replace(/\/\d+px-/, `/${width}px-`);
    }
    return original.source;
  } catch {
    return null;
  }
}

async function resolveSlot(key: string, titles: string[], width: number) {
  if (fresh(memory[key])) return;
  for (const title of titles) {
    const url = await fetchTitle(title, width);
    if (url) {
      memory[key] = { url, at: Date.now() };
      return;
    }
  }
  memory[key] = { url: null, at: Date.now() };
}

/** Look up every photo once (cached for 2 weeks). Safe to call on every start. */
export async function preloadPhotos(timeoutMs = 2500) {
  if (typeof window === 'undefined') return;
  loadCache();

  const jobs: Promise<void>[] = [];
  const add = (prefix: string, slot: Slot) => {
    jobs.push(resolveSlot(`${prefix}:logo`, slot.logo, 500));
    jobs.push(resolveSlot(`${prefix}:cover`, slot.cover, 1280));
  };
  Object.entries(CATEGORY_PHOTOS).forEach(([k, v]) => add(`cat:${k}`, v));
  Object.entries(BRAND_PHOTOS).forEach(([k, v]) => add(`brand:${k}`, v));

  const all = Promise.all(jobs).then(saveCache);
  await Promise.race([all, new Promise((r) => setTimeout(r, timeoutMs))]);
  // Keep going in the background; later pages pick up whatever finished.
  all.then(saveCache);
}

// ---------------------------------------------------------------------------
// Public helpers (synchronous - used while rendering)
// ---------------------------------------------------------------------------

/** Domain of a known real brand found in the hints, if any. */
export function realBrandDomain(...hints: Array<string | null | undefined>): string | null {
  for (const hint of hints) {
    const key = (hint || '').trim().toLowerCase();
    if (key && BRAND_DOMAINS[key]) return BRAND_DOMAINS[key];
  }
  return null;
}

/** Real logo of a well-known brand (null for brands we do not know). */
export function realLogoUrl(...hints: Array<string | null | undefined>): string | null {
  const domain = realBrandDomain(...hints);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}

/** Real photo for a brand (its own photo if it has one, else its business type). */
export function wikiPhoto(
  category: string,
  hints: Array<string | null | undefined>,
  shape: 'logo' | 'cover',
): string | null {
  for (const hint of hints) {
    const key = (hint || '').trim().toLowerCase();
    if (key && BRAND_PHOTOS[key]) {
      const own = memory[`brand:${key}:${shape}`];
      if (own?.url) return own.url;
    }
  }
  return memory[`cat:${category}:${shape}`]?.url || memory[`cat:Default:${shape}`]?.url || null;
}

const fallbackMap = new Map<string, string[]>();

/** Remember what to show if `url` fails to load. */
export function registerFallback(url: string, ...fallbacks: string[]) {
  fallbackMap.set(url, fallbacks.filter(Boolean));
}

/** Call once at start-up: a broken <img> switches to its registered fallback. */
export function installImageFallbacks() {
  if (typeof window === 'undefined') return;
  window.addEventListener(
    'error',
    (event) => {
      const el = event.target as HTMLImageElement | null;
      if (!el || el.tagName !== 'IMG') return;
      const failed = el.getAttribute('src') || '';
      const next = fallbackMap.get(failed)?.[0];
      if (next && next !== failed) el.setAttribute('src', next);
    },
    true,
  );
}