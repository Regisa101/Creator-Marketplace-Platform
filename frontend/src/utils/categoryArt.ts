import { realLogoUrl, registerFallback, wikiPhoto } from './photos';
// ---------------------------------------------------------------------------
// Pictures by company type.
//
// When a brand has no logo (or no cover) we show a picture that matches what
// the company does (food, beauty, fashion, travel ...) instead of a plain box
// with letters. Everything is drawn as SVG, so nothing needs to be downloaded.
// A brand's own logo / cover always wins over these.
// ---------------------------------------------------------------------------

type Art = {
  bg: [string, string];
  art: string;
  // Drawn under `art` on square pictures only.
  ground?: string;
  // Drawn under `art` on wide covers only.
  coverGround?: string;
};

// Every scene is drawn in a 200 x 200 box.
const ART: Record<string, Art> = {
  Food: {
    bg: ['#ffb84d', '#f0641e'],
    art:
      '<ellipse cx="100" cy="150" rx="74" ry="17" fill="#ffffff"/><ellipse cx="100" cy="148" rx="60" ry="11" fill="#f3e9dc"/>' +
      '<g fill="#fff7ea" stroke="#e3bd88" stroke-width="2">' +
      '<path d="M96 126 C96 98 110 82 124 82 C138 82 152 98 152 126 Z"/>' +
      '<path d="M48 134 C48 106 62 90 76 90 C90 90 104 106 104 134 Z"/>' +
      '<path d="M82 140 C82 112 96 96 110 96 C124 96 138 112 138 140 Z"/></g>' +
      '<g fill="none" stroke="#e3bd88" stroke-width="2" stroke-linecap="round"><path d="M110 98 l-4 10 M118 98 l0 12 M126 98 l4 10"/><path d="M62 106 l-4 10 M70 106 l0 12 M78 106 l4 10"/><path d="M96 122 l-4 10 M104 122 l0 12 M112 122 l4 10"/></g>' +
      '<g fill="none" stroke="#ffffff" stroke-opacity=".75" stroke-width="5" stroke-linecap="round"><path d="M78 70 C70 58 86 52 78 38"/><path d="M104 66 C96 54 112 48 104 34"/><path d="M130 70 C122 58 138 52 130 38"/></g>',
  },
  Beauty: {
    bg: ['#ff9ec7', '#d6336c'],
    art:
      '<circle cx="70" cy="132" r="36" fill="#ffffff"/><circle cx="70" cy="132" r="28" fill="#ffd6e8"/><path d="M50 122 Q60 108 80 110" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>' +
      '<rect x="116" y="112" width="30" height="52" rx="5" fill="#7a1038"/><rect x="116" y="98" width="30" height="16" rx="3" fill="#f4c95d"/>' +
      '<path d="M120 98 V70 Q131 54 142 70 V98 Z" fill="#ff4d8d"/>' +
      '<g fill="#ffffff"><path d="M154 44 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/><path d="M44 54 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/></g>',
  },
  Fashion: {
    bg: ['#b197fc', '#6741d9'],
    art:
      '<path d="M100 56 V46 a9 9 0 1 1 9 9" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M100 56 L48 86 M100 56 L152 86" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M68 88 H132 L138 108 L124 116 L154 176 H46 L76 116 L62 108 Z" fill="#ffffff"/>' +
      '<path d="M78 116 H122" stroke="#6741d9" stroke-opacity=".35" stroke-width="6" stroke-linecap="round"/>' +
      '<g fill="#b197fc" fill-opacity=".55"><circle cx="80" cy="140" r="4"/><circle cx="102" cy="150" r="4"/><circle cx="124" cy="138" r="4"/><circle cx="92" cy="164" r="4"/><circle cx="116" cy="164" r="4"/></g>',
  },
  Travel: {
    bg: ['#4dabf7', '#bfe3ff'],
    ground:
      '<rect y="164" width="200" height="40" fill="#2f9e44"/><path d="M0 172 Q50 164 100 172 T200 172 V200 H0Z" fill="#37b24d"/>',
    coverGround:
      '<path d="M0 330 Q200 290 420 326 T860 322 T1260 318 T1600 322 V400 H0Z" fill="#37b24d"/><path d="M0 366 Q260 336 560 362 T1120 360 T1600 362 V400 H0Z" fill="#2f9e44"/>',
    art:
      '<circle cx="152" cy="52" r="17" fill="#ffd43b"/>' +
      '<ellipse cx="60" cy="48" rx="24" ry="9" fill="#ffffff" fill-opacity=".9"/><ellipse cx="76" cy="42" rx="16" ry="9" fill="#ffffff" fill-opacity=".9"/>' +
      '<path d="M0 170 L68 70 L136 170 Z" fill="#5c7cfa"/><path d="M68 70 L52 96 L62 92 L68 102 L76 92 L86 96 Z" fill="#ffffff"/>' +
      '<path d="M84 170 L146 92 L208 170 Z" fill="#3b5bdb"/><path d="M146 92 L134 110 L142 107 L146 114 L152 107 L160 110 Z" fill="#ffffff"/>',
  },
  Education: {
    bg: ['#74c0fc', '#364fc7'],
    art:
      '<path d="M100 40 L152 62 L100 84 L48 62 Z" fill="#1b2a6b"/><path d="M72 76 V94 Q100 108 128 94 V76 L100 88 Z" fill="#243b9c"/>' +
      '<path d="M152 62 V92" stroke="#ffd43b" stroke-width="4" stroke-linecap="round"/><circle cx="152" cy="96" r="5" fill="#ffd43b"/>' +
      '<path d="M100 164 V116 Q70 104 36 114 V162 Q70 152 100 164 Z" fill="#ffffff"/><path d="M100 164 V116 Q130 104 164 114 V162 Q130 152 100 164 Z" fill="#e3ecff"/>' +
      '<g stroke="#364fc7" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"><path d="M48 126 Q70 120 90 128"/><path d="M48 140 Q70 134 90 142"/><path d="M110 128 Q130 120 152 126"/><path d="M110 142 Q130 134 152 140"/></g>',
  },
  Technology: {
    bg: ['#4c6ef5', '#1b2a6b'],
    art:
      '<rect x="44" y="52" width="112" height="78" rx="7" fill="#0b1437" stroke="#ffffff" stroke-width="4"/>' +
      '<g stroke-width="5" stroke-linecap="round"><path d="M58 70 H92" stroke="#63e6be"/><path d="M68 84 H112" stroke="#74c0fc"/><path d="M68 98 H98" stroke="#ffd43b"/><path d="M58 112 H86" stroke="#ff8787"/><path d="M108 112 H130" stroke="#63e6be"/></g>' +
      '<path d="M26 138 H174 L164 154 H36 Z" fill="#d0d9ff"/><rect x="82" y="138" width="36" height="5" rx="2" fill="#9aa8f0"/>',
  },
  Finance: {
    bg: ['#69db7c', '#087f5b'],
    art:
      '<g fill="#ffffff" fill-opacity=".92"><rect x="44" y="112" width="24" height="46" rx="4"/><rect x="78" y="90" width="24" height="68" rx="4"/><rect x="112" y="66" width="24" height="92" rx="4"/></g>' +
      '<path d="M40 104 L82 80 L106 92 L150 48" fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M132 46 H152 V66" fill="none" stroke="#ffd43b" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="152" cy="136" r="24" fill="#ffd43b"/><circle cx="152" cy="136" r="16" fill="none" stroke="#f08c00" stroke-width="4"/>',
  },
  Fitness: {
    bg: ['#ff8787', '#c92a2a'],
    art:
      '<g transform="rotate(-18 100 100)"><rect x="56" y="93" width="88" height="14" rx="4" fill="#ffffff"/>' +
      '<rect x="40" y="68" width="16" height="64" rx="5" fill="#ffe3e3"/><rect x="24" y="78" width="16" height="44" rx="5" fill="#ffffff"/>' +
      '<rect x="144" y="68" width="16" height="64" rx="5" fill="#ffe3e3"/><rect x="160" y="78" width="16" height="44" rx="5" fill="#ffffff"/></g>' +
      '<path d="M44 46 q6 10 0 16 q-6 -6 0 -16z M162 150 q6 10 0 16 q-6 -6 0 -16z" fill="#ffffff" fill-opacity=".8"/>',
  },
  Health: {
    bg: ['#63e6be', '#0b7285'],
    art:
      '<g transform="translate(100 150)"><path d="M0 -10 C26 -44 26 -86 0 -112 C-26 -86 -26 -44 0 -10Z" fill="#ffffff"/>' +
      '<path d="M0 -10 C26 -44 26 -86 0 -112 C-26 -86 -26 -44 0 -10Z" fill="#e6fcf5" transform="rotate(42)"/><path d="M0 -10 C26 -44 26 -86 0 -112 C-26 -86 -26 -44 0 -10Z" fill="#e6fcf5" transform="rotate(-42)"/>' +
      '<path d="M0 -10 C26 -44 26 -86 0 -112 C-26 -86 -26 -44 0 -10Z" fill="#c3fae8" transform="rotate(78)"/><path d="M0 -10 C26 -44 26 -86 0 -112 C-26 -86 -26 -44 0 -10Z" fill="#c3fae8" transform="rotate(-78)"/></g>' +
      '<ellipse cx="100" cy="158" rx="62" ry="9" fill="#0b7285" fill-opacity=".35"/>',
  },
  Gaming: {
    bg: ['#9775fa', '#5f3dc4'],
    art:
      '<path d="M62 76 Q40 76 34 118 Q30 152 52 154 Q66 154 76 134 H124 Q134 154 148 154 Q170 152 166 118 Q160 76 138 76 Z" fill="#f1f3f5"/>' +
      '<g fill="#5f3dc4"><rect x="56" y="102" width="26" height="8" rx="2"/><rect x="65" y="93" width="8" height="26" rx="2"/></g>' +
      '<circle cx="134" cy="96" r="6" fill="#ff6b6b"/><circle cx="148" cy="108" r="6" fill="#ffd43b"/><circle cx="120" cy="108" r="6" fill="#51cf66"/><circle cx="134" cy="120" r="6" fill="#339af0"/>' +
      '<circle cx="86" cy="128" r="9" fill="#ced4da"/><circle cx="114" cy="128" r="9" fill="#ced4da"/>',
  },
  'Home & Living': {
    bg: ['#ffc078', '#e8590c'],
    art:
      '<rect x="44" y="82" width="92" height="42" rx="12" fill="#ffe8cc"/><rect x="38" y="112" width="104" height="38" rx="10" fill="#ffffff"/>' +
      '<rect x="28" y="100" width="20" height="50" rx="9" fill="#fff4e6"/><rect x="132" y="100" width="20" height="50" rx="9" fill="#fff4e6"/>' +
      '<rect x="44" y="150" width="8" height="12" rx="2" fill="#a14b12"/><rect x="128" y="150" width="8" height="12" rx="2" fill="#a14b12"/>' +
      '<path d="M166 66 V160" stroke="#fff4e6" stroke-width="5" stroke-linecap="round"/><path d="M150 66 L158 40 H174 L182 66 Z" fill="#ffe066"/><ellipse cx="166" cy="162" rx="14" ry="4" fill="#fff4e6"/>',
  },
  Sports: {
    bg: ['#66d9e8', '#0b7285'],
    art:
      '<ellipse cx="100" cy="158" rx="50" ry="8" fill="#0b7285" fill-opacity=".35"/>' +
      '<circle cx="100" cy="100" r="50" fill="#ffffff" stroke="#e9ecef" stroke-width="3"/>' +
      '<polygon points="100,80 119,94 112,116 88,116 81,94" fill="#212529"/>' +
      '<g stroke="#212529" stroke-width="3.5" stroke-linecap="round"><path d="M100 80 V54"/><path d="M119 94 L142 86"/><path d="M112 116 L128 136"/><path d="M88 116 L72 136"/><path d="M81 94 L58 86"/></g>' +
      '<g stroke="#ffffff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"><path d="M14 72 H38"/><path d="M8 96 H30"/><path d="M16 120 H36"/></g>',
  },
  Music: {
    bg: ['#f783ac', '#a61e4d'],
    art:
      '<path d="M54 118 Q54 54 100 54 Q146 54 146 118" fill="none" stroke="#ffffff" stroke-width="11" stroke-linecap="round"/>' +
      '<rect x="40" y="104" width="28" height="50" rx="12" fill="#ffffff"/><rect x="132" y="104" width="28" height="50" rx="12" fill="#ffffff"/>' +
      '<rect x="46" y="112" width="16" height="34" rx="8" fill="#a61e4d" fill-opacity=".3"/><rect x="138" y="112" width="16" height="34" rx="8" fill="#a61e4d" fill-opacity=".3"/>' +
      '<g fill="#ffe066"><circle cx="92" cy="140" r="8"/><path d="M99 140 V100 L116 106 V114 L103 110" fill="none" stroke="#ffe066" stroke-width="4" stroke-linecap="round"/></g>',
  },
  Photography: {
    bg: ['#adb5bd', '#495057'],
    art:
      '<path d="M72 72 L80 56 H120 L128 72 Z" fill="#e9ecef"/><rect x="36" y="70" width="128" height="82" rx="13" fill="#f1f3f5"/>' +
      '<rect x="46" y="80" width="20" height="10" rx="3" fill="#ff8787"/>' +
      '<circle cx="100" cy="112" r="31" fill="#343a40"/><circle cx="100" cy="112" r="23" fill="#4263eb"/><circle cx="100" cy="112" r="11" fill="#dbe4ff"/><circle cx="92" cy="104" r="5" fill="#ffffff" fill-opacity=".8"/>',
  },
  Parenting: {
    bg: ['#ffe066', '#f59f00'],
    art:
      '<rect x="40" y="110" width="54" height="54" rx="7" fill="#ff6b6b"/><rect x="106" y="110" width="54" height="54" rx="7" fill="#4dabf7"/><rect x="73" y="54" width="54" height="54" rx="7" fill="#51cf66"/>' +
      '<g fill="#ffffff" fill-opacity=".9"><circle cx="67" cy="137" r="9"/><path d="M133 122 l7 14 15 2 -11 10 3 15 -14 -8 -14 8 3 -15 -11 -10 15 -2z" transform="translate(-6 -4) scale(.9)"/><path d="M100 70 l20 36 h-40z"/></g>',
  },
  Pets: {
    bg: ['#8ce99a', '#2b8a3e'],
    art:
      '<g fill="#ffffff"><path d="M100 94 C70 94 56 118 62 138 C66 152 82 152 100 146 C118 152 134 152 138 138 C144 118 130 94 100 94Z"/>' +
      '<ellipse cx="56" cy="92" rx="12" ry="17" transform="rotate(-20 56 92)"/><ellipse cx="84" cy="64" rx="12" ry="18" transform="rotate(-6 84 64)"/><ellipse cx="116" cy="64" rx="12" ry="18" transform="rotate(6 116 64)"/><ellipse cx="144" cy="92" rx="12" ry="17" transform="rotate(20 144 92)"/></g>',
  },
  Entertainment: {
    bg: ['#da77f2', '#862e9c'],
    art:
      '<path d="M44 66 H156 a8 8 0 0 1 8 8 V92 a9 9 0 0 0 0 16 V126 a8 8 0 0 1 -8 8 H44 a8 8 0 0 1 -8 -8 V108 a9 9 0 0 0 0 -16 V74 a8 8 0 0 1 8 -8Z" fill="#ffe066" transform="translate(0 4)"/>' +
      '<path d="M126 74 V132" stroke="#f08c00" stroke-width="3" stroke-dasharray="5 5"/>' +
      '<path d="M82 84 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2z" fill="#862e9c" transform="translate(6 -2)"/>' +
      '<g fill="#ffffff" fill-opacity=".85"><path d="M158 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><path d="M40 150 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z" transform="translate(4 0)"/></g>',
  },
  Automotive: {
    bg: ['#74c0fc', '#1864ab'],
    art:
      '<path d="M22 138 Q22 120 40 116 L58 94 Q64 86 76 86 H124 Q136 86 144 96 L158 114 Q178 116 178 132 V144 H22 Z" fill="#ffffff"/>' +
      '<path d="M68 96 H94 V114 H54 Z M102 96 H122 Q128 96 133 102 L144 114 H102 Z" fill="#a5d8ff"/>' +
      '<circle cx="58" cy="146" r="17" fill="#212529"/><circle cx="58" cy="146" r="7" fill="#ced4da"/><circle cx="144" cy="146" r="17" fill="#212529"/><circle cx="144" cy="146" r="7" fill="#ced4da"/>' +
      '<rect x="166" y="124" width="12" height="8" rx="3" fill="#ffd43b"/>' +
      '<g stroke="#ffffff" stroke-opacity=".7" stroke-width="4" stroke-linecap="round"><path d="M8 100 H30"/><path d="M4 120 H20"/></g>',
  },
  Lifestyle: {
    bg: ['#b2f2bb', '#2b8a3e'],
    art:
      '<path d="M56 94 H140 V118 Q140 152 98 152 Q56 152 56 118 Z" fill="#ffffff"/>' +
      '<path d="M140 102 Q166 102 162 122 Q158 138 138 134" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>' +
      '<ellipse cx="98" cy="156" rx="56" ry="9" fill="#ebfbee"/>' +
      '<g fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="5" stroke-linecap="round"><path d="M80 82 C72 70 88 64 80 50"/><path d="M108 80 C100 68 116 62 108 48"/></g>' +
      '<ellipse cx="46" cy="64" rx="22" ry="10" fill="#d3f9d8" transform="rotate(-35 46 64)"/><path d="M30 78 L60 54" stroke="#2b8a3e" stroke-opacity=".5" stroke-width="2"/>',
  },
  Default: {
    bg: ['#69db7c', '#197935'],
    art:
      '<circle cx="78" cy="96" r="38" fill="#ffffff" fill-opacity=".9"/><circle cx="124" cy="96" r="38" fill="#ffffff" fill-opacity=".55"/>' +
      '<path d="M100 60 l8 18 20 3 -15 13 4 20 -17 -10 -17 10 4 -20 -15 -13 20 -3z" fill="#ffd43b" transform="translate(0 6) scale(.9) translate(11 4)"/>',
  },
};

// keyword -> category (checked in order, case-insensitive)
const KEYWORDS: Array<[string, RegExp]> = [
  ['Food', /food|restaurant|cafe|caf\u00e9|coffee|bakery|kitchen|momo|dining|beverage|drink|cater|brew|snack/],
  ['Beauty', /beauty|skincare|skin care|cosmetic|makeup|make-up|salon|spa\b|glow/],
  ['Fashion', /fashion|apparel|cloth|wear|boutique|garment|thread|textile|jewel/],
  ['Travel', /travel|tour|trek|hotel|stay|homestay|resort|hospitality|airline|trail|adventure/],
  ['Education', /educat|school|college|learn|academy|course|tuition|pathshala|universit|training/],
  ['Technology', /tech|software|saas|electronic|gadget|digital|startup|\bapp\b|\bit\b|code|kode/],
  ['Finance', /financ|bank|wallet|\bpay\b|insurance|fintech|invest|money/],
  ['Fitness', /fitness|gym|workout|nutrition|fuel/],
  ['Health', /health|wellness|yoga|medical|clinic|pharma|hospital|mindful/],
  ['Gaming', /gam(e|ing)|esport/],
  ['Home & Living', /home|living|interior|furniture|decor|real estate|construction|apartment/],
  ['Sports', /sport|futsal|cricket|football|athlet/],
  ['Music', /music|band|song|instrument|madal/],
  ['Photography', /photo|camera|lens|videograph/],
  ['Parenting', /parent|kid|baby|toy|child|yeti kids/],
  ['Pets', /\bpet|\bdog|\bcat\b|animal|vet\b|paws/],
  ['Entertainment', /entertain|event|movie|festival|media|ticket|cinema/],
  ['Automotive', /auto|\bcar\b|scooter|bike|vehicle|motor|garage/],
  ['Lifestyle', /lifestyle|tea|farm|organic|grocer|retail|supermarket|general/],
];

/** Best matching category for a list of hints (category first, then industry, type, name ...). */
export function categoryKey(...hints: Array<string | null | undefined>): string {
  const texts = hints.map((h) => (h || '').trim()).filter(Boolean);

  // 1) an exact category name wins
  for (const text of texts) {
    const exact = Object.keys(ART).find((key) => key.toLowerCase() === text.toLowerCase());
    if (exact && exact !== 'Default') return exact;
  }
  // 2) otherwise look for keywords, hint by hint
  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const [key, pattern] of KEYWORDS) {
      if (pattern.test(lower)) return key;
    }
  }
  return 'Default';
}

const asDataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

/** Drawn square picture for a company type (last-resort fallback). */
export function categoryImageArt(...hints: Array<string | null | undefined>): string {
  const { bg, art, ground } = ART[categoryKey(...hints)];
  return asDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
      `<defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs>` +
      `<rect width="200" height="200" fill="url(#b)"/>${ground || ''}${art}</svg>`,
  );
}

function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Drawn wide banner for a company type (last-resort fallback). */
export function categoryCoverArt(name: string, ...hints: Array<string | null | undefined>): string {
  const { bg, art, coverGround } = ART[categoryKey(...hints)];
  const rand = seeded(name.toLowerCase());
  const W = 1600;
  const H = 400;

  const circles = Array.from({ length: 4 }, () => {
    const cx = Math.round(rand() * W);
    const cy = Math.round(rand() * H);
    const r = Math.round(80 + rand() * 170);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" fill-opacity="${(0.06 + rand() * 0.07).toFixed(3)}"/>`;
  }).join('');

  const faint = [
    { x: 80, y: 190, s: 1.0, r: -12 },
    { x: 330, y: 20, s: 0.75, r: 10 },
    { x: 560, y: 210, s: 1.1, r: 8 },
    { x: 820, y: 30, s: 0.8, r: -8 },
  ]
    .map(
      (p) =>
        `<g opacity=".16" transform="translate(${p.x} ${p.y}) rotate(${p.r} 100 100) scale(${p.s})">${art}</g>`,
    )
    .join('');

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient>` +
    `<pattern id="d" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#ffffff" fill-opacity=".2"/></pattern></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#g)"/>` +
    `<rect x="${Math.round(W * 0.45)}" width="${Math.round(W * 0.55)}" height="${H}" fill="url(#d)"/>` +
    circles +
    `<path d="M0 300 C280 240 520 350 820 290 S1360 230 ${W} 290 V${H} H0Z" fill="#ffffff" fill-opacity=".08"/>` +
    (coverGround || '') +
    faint +
    // the main picture on the right
    `<g transform="translate(1010 0) scale(2)">${art}</g>` +
    `</svg>`;

  return asDataUri(svg);
}

/**
 * Picture used where a logo would go: the real logo for well-known brands,
 * otherwise a real photo for the business. Every page calls this, so a brand
 * looks the same everywhere. The drawn picture is only a last fallback.
 */
export function categoryImage(...hints: Array<string | null | undefined>): string {
  const art = categoryImageArt(...hints);
  const logo = realLogoUrl(...hints);
  const photo = wikiPhoto(categoryKey(...hints), hints, 'logo');

  if (logo) {
    registerFallback(logo, ...(photo ? [photo] : []), art);
    if (photo) registerFallback(photo, art);
    return logo;
  }
  if (photo) {
    registerFallback(photo, art);
    return photo;
  }
  return art;
}

/** Real wide photo for a business, used as a profile cover. */
export function categoryCover(name: string, ...hints: Array<string | null | undefined>): string {
  return wikiPhoto(categoryKey(...hints), [name, ...hints], 'cover') || categoryCoverArt(name, ...hints);
}