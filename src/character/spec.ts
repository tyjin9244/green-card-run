/**
 * Character spec: the OUTPUT of the character-creation agent and the INPUT of
 * the hero sprite generator. Shared shape between /api/character and the game.
 * Keep the option lists in sync with api/character.ts.
 */
export const HATS = [
  'beanie', 'cap', 'hair', 'long', 'mohawk', 'afro', 'headband',
  'tophat', 'cowboy', 'crown', 'helmet', 'none'
] as const;
export const EYEWEAR = ['mask', 'glasses', 'shades', 'visor', 'monocle', 'eyepatch', 'none'] as const;
export const FACES = ['none', 'mustache', 'beard', 'stubble'] as const;
export const OUTFITS = ['stripes', 'solid', 'tee', 'hoodie', 'suit', 'labcoat'] as const;
export const EXTRAS = ['none', 'backpack', 'cape', 'scarf'] as const;

export type Hat = (typeof HATS)[number];
/** Head options drawn in the `hair` color rather than the `hat` color. */
export const HAIR_STYLES: readonly Hat[] = ['hair', 'long', 'mohawk', 'afro'];
export type Eyewear = (typeof EYEWEAR)[number];
export type Face = (typeof FACES)[number];
export type Outfit = (typeof OUTFITS)[number];
export type Extra = (typeof EXTRAS)[number];

export interface CharacterPalette {
  skin: string;      // '#rrggbb'
  hair: string;      // hair styles (hair/long/mohawk/afro), facial hair, hair under a headband
  hat: string;       // beanie / cap / headband / top hat / cowboy / crown / helmet
  hatAccent: string; // pom-pom, brim, hat band, crown jewels, hair tips
  shirtA: string;    // main outfit color
  shirtB: string;    // secondary outfit color (stripes, tie, logo, trim)
  pants: string;
  shoes: string;
  accent: string;    // backpack / cape / scarf
}

export interface CharacterSpec {
  name: string;        // in-game name, A-Z, max 10 chars
  title: string;       // short English epithet, e.g. "CODE NINJA"
  catchphrase: string; // English, shown in-game
  bio: string;         // short English bio (UI only)
  hat: Hat;
  eyewear: Eyewear;
  face: Face;
  outfit: Outfit;
  extra: Extra;
  palette: CharacterPalette;
}

/** Request body for POST /api/character. */
export interface CharacterRequest { prompt: string }
/** Response body for POST /api/character. */
export interface CharacterResponse { character: CharacterSpec; source: 'ai' | 'offline' }

/** The original hero (beanie + bandit mask + striped shirt). */
export const DEFAULT_CHARACTER: CharacterSpec = {
  name: 'YOU',
  title: 'GREEN CARD THIEF',
  catchphrase: 'SEE YOU IN SILICON VALLEY!',
  bio: 'The original thief who swiped the green card right out of Trump\'s pocket.',
  hat: 'beanie',
  eyewear: 'mask',
  face: 'none',
  outfit: 'stripes',
  extra: 'none',
  palette: {
    skin: '#f4c49a', hair: '#4a2f20', hat: '#b13e53', hatAccent: '#f4f4f4',
    shirtA: '#eef0f4', shirtB: '#3a3f58', pants: '#3b5dc9', shoes: '#29366f', accent: '#d8282b'
  }
};

/** Ready-made heroes for one-click picking. */
export const PRESETS: CharacterSpec[] = [
  DEFAULT_CHARACTER,
  {
    name: 'DEV', title: 'COFFEE CODER', catchphrase: 'IT WORKS ON MY MACHINE!',
    bio: 'Full-stack dev powered by cold brew. Ships on Fridays.',
    hat: 'cap', eyewear: 'glasses', face: 'stubble', outfit: 'hoodie', extra: 'backpack',
    palette: { skin: '#e0a878', hair: '#2b1d14', hat: '#d8282b', hatAccent: '#f4f4f4', shirtA: '#333c57', shirtB: '#ffcd3c', pants: '#29366f', shoes: '#f4f4f4', accent: '#38b764' }
  },
  {
    name: 'DR NOVA', title: 'AI RESEARCHER', catchphrase: 'MY MODEL PREDICTED THIS!',
    bio: 'Trained a model to dodge burgers. It overfit.',
    hat: 'long', eyewear: 'glasses', face: 'none', outfit: 'labcoat', extra: 'none',
    palette: { skin: '#ffd9b8', hair: '#7b4fc9', hat: '#7b4fc9', hatAccent: '#b58cff', shirtA: '#38b764', shirtB: '#257179', pants: '#333c57', shoes: '#1a1c2c', accent: '#73eff7' }
  },
  {
    name: 'CEO', title: 'STARTUP FOUNDER', catchphrase: 'WE ARE PRE REVENUE!',
    bio: 'Raised a seed round on a napkin. Runs marathons and meetings.',
    hat: 'hair', eyewear: 'shades', face: 'none', outfit: 'suit', extra: 'none',
    palette: { skin: '#c68a5a', hair: '#1a1c2c', hat: '#1a1c2c', hatAccent: '#566c86', shirtA: '#333c57', shirtB: '#d8282b', pants: '#333c57', shoes: '#8a5a3c', accent: '#ffcd3c' }
  },
  {
    name: 'ZED', title: 'NINJA INTERN', catchphrase: 'YOU SAW NOTHING!',
    bio: 'Unpaid, unseen, unstoppable.',
    hat: 'headband', eyewear: 'mask', face: 'none', outfit: 'solid', extra: 'scarf',
    palette: { skin: '#f4c49a', hair: '#1a1c2c', hat: '#d8282b', hatAccent: '#1a1c2c', shirtA: '#333c57', shirtB: '#1a1c2c', pants: '#333c57', shoes: '#ffcd3c', accent: '#d8282b' }
  },
  {
    name: 'ROCKY', title: 'PUNK ROCKER', catchphrase: 'NO VISA NO PROBLEM!',
    bio: 'Plays three chords and crowd-surfs past security.',
    hat: 'mohawk', eyewear: 'shades', face: 'none', outfit: 'tee', extra: 'none',
    palette: { skin: '#ffd9b8', hair: '#f58cc4', hat: '#f58cc4', hatAccent: '#ffcd3c', shirtA: '#1a1c2c', shirtB: '#d8282b', pants: '#566c86', shoes: '#1a1c2c', accent: '#94a0b4' }
  },
  {
    name: 'TEX', title: 'CRYPTO COWBOY', catchphrase: 'HODL THE CARD!',
    bio: 'Mined his first coin on a ranch. Still has the hat.',
    hat: 'cowboy', eyewear: 'none', face: 'mustache', outfit: 'stripes', extra: 'scarf',
    palette: { skin: '#e0a878', hair: '#8a5a3c', hat: '#8a5a3c', hatAccent: '#3a2a1e', shirtA: '#ef7d57', shirtB: '#f4f4f4', pants: '#3b5dc9', shoes: '#5a3a24', accent: '#d8282b' }
  },
  {
    name: 'QUEEN B', title: 'UNICORN FOUNDER', catchphrase: 'BOW TO THE VALUATION!',
    bio: 'Billion-dollar startup, zero-dollar sponsorship letter.',
    hat: 'crown', eyewear: 'none', face: 'none', outfit: 'suit', extra: 'cape',
    palette: { skin: '#8d5a3a', hair: '#1a1c2c', hat: '#ffcd3c', hatAccent: '#d8282b', shirtA: '#7b4fc9', shirtB: '#ffcd3c', pants: '#333c57', shoes: '#ffcd3c', accent: '#d8282b' }
  },
  {
    name: 'ASTRO', title: 'ROCKET ENGINEER', catchphrase: 'NEXT STOP MARS!',
    bio: 'Builds reusable rockets, cannot reuse a visa.',
    hat: 'helmet', eyewear: 'visor', face: 'none', outfit: 'solid', extra: 'backpack',
    palette: { skin: '#f4c49a', hair: '#4a2f20', hat: '#f4f4f4', hatAccent: '#d8282b', shirtA: '#f4f4f4', shirtB: '#3b5dc9', pants: '#f4f4f4', shoes: '#566c86', accent: '#94a0b4' }
  },
  {
    name: 'PROF', title: 'TENURED GENIUS', catchphrase: 'PEER REVIEW THIS!',
    bio: 'Published 300 papers. Lost the 301st to a golf cart.',
    hat: 'tophat', eyewear: 'monocle', face: 'beard', outfit: 'suit', extra: 'none',
    palette: { skin: '#ffd9b8', hair: '#94a0b4', hat: '#1a1c2c', hatAccent: '#d8282b', shirtA: '#566c86', shirtB: '#257179', pants: '#333c57', shoes: '#1a1c2c', accent: '#ffcd3c' }
  },
  {
    name: 'GROOVE', title: 'DESIGN LEAD', catchphrase: 'MAKE IT POP!',
    bio: 'Kerning perfectionist with legendary hair.',
    hat: 'afro', eyewear: 'glasses', face: 'none', outfit: 'tee', extra: 'none',
    palette: { skin: '#8d5a3a', hair: '#2b1d14', hat: '#2b1d14', hatAccent: '#f58cc4', shirtA: '#ffcd3c', shirtB: '#ef7d57', pants: '#257179', shoes: '#f4f4f4', accent: '#73eff7' }
  },
  {
    name: 'CAPT', title: 'PIRATE PM', catchphrase: 'SHIP IT OR WALK THE PLANK!',
    bio: 'Roadmaps are more like guidelines anyway.',
    hat: 'none', eyewear: 'eyepatch', face: 'beard', outfit: 'stripes', extra: 'none',
    palette: { skin: '#e0a878', hair: '#b13e53', hat: '#b13e53', hatAccent: '#f4f4f4', shirtA: '#f4f4f4', shirtB: '#d8282b', pants: '#29366f', shoes: '#1a1c2c', accent: '#ffcd3c' }
  }
];

export const SKIN_TONES = ['#ffd9b8', '#f4c49a', '#e0a878', '#c68a5a', '#8d5a3a', '#5e3a24'];

/* ------------------------------------------------------------ validation */

const HEX = /^#?([0-9a-f]{6})$/i;

export function hexToInt(hex: string, fallback: number): number {
  const m = HEX.exec(hex.trim());
  return m ? parseInt(m[1], 16) : fallback;
}

/** Keep only characters the 5x7 pixel font can draw. */
export function fontSafe(s: string, max: number, allowed: string): string {
  const out = [...s.toUpperCase()].filter((ch) => ch === ' ' || allowed.includes(ch)).join('');
  return out.replace(/\s+/g, ' ').trim().slice(0, max);
}

const oneOf = <T extends string>(list: readonly T[], v: unknown, fb: T): T =>
  list.includes(v as T) ? (v as T) : fb;

/** Defensive normalisation of anything that claims to be a CharacterSpec. */
export function normalizeSpec(raw: unknown, fontChars: string): CharacterSpec {
  const d = DEFAULT_CHARACTER;
  const r = (raw ?? {}) as Partial<CharacterSpec>;
  const p = (r.palette ?? {}) as Partial<CharacterPalette>;
  const color = (v: unknown, fb: string) => (typeof v === 'string' && HEX.test(v.trim()) ? '#' + HEX.exec(v.trim())![1].toLowerCase() : fb);
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    name: fontSafe(str(r.name), 10, fontChars) || d.name,
    title: fontSafe(str(r.title), 20, fontChars) || d.title,
    catchphrase: fontSafe(str(r.catchphrase), 40, fontChars) || d.catchphrase,
    bio: str(r.bio).slice(0, 200) || d.bio,
    hat: oneOf(HATS, r.hat, d.hat),
    eyewear: oneOf(EYEWEAR, r.eyewear, d.eyewear),
    face: oneOf(FACES, r.face, d.face),
    outfit: oneOf(OUTFITS, r.outfit, d.outfit),
    extra: oneOf(EXTRAS, r.extra, d.extra),
    palette: {
      skin: color(p.skin, d.palette.skin),
      // older saved specs had no `hair`: the 'hair' style used `hat`, headbands used `hatAccent`
      hair: color(p.hair, color(HAIR_STYLES.includes(r.hat as Hat) ? p.hat : p.hatAccent, d.palette.hair)),
      hat: color(p.hat, d.palette.hat),
      hatAccent: color(p.hatAccent, d.palette.hatAccent),
      shirtA: color(p.shirtA, d.palette.shirtA),
      shirtB: color(p.shirtB, d.palette.shirtB),
      pants: color(p.pants, d.palette.pants),
      shoes: color(p.shoes, d.palette.shoes),
      accent: color(p.accent, d.palette.accent)
    }
  };
}
