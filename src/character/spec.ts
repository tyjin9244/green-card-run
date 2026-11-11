/**
 * Character spec: the OUTPUT of the character-creation agent and the INPUT of
 * the hero sprite generator. Shared shape between /api/character and the game.
 */
export const HATS = ['beanie', 'cap', 'hair', 'headband', 'none'] as const;
export const EYEWEAR = ['mask', 'glasses', 'shades', 'none'] as const;

export type Hat = (typeof HATS)[number];
export type Eyewear = (typeof EYEWEAR)[number];

export interface CharacterPalette {
  skin: string;      // '#rrggbb'
  hat: string;       // beanie / cap / hair / headband color
  hatAccent: string; // pom-pom, cap brim, hair under the headband
  shirtA: string;    // shirt stripe 1
  shirtB: string;    // shirt stripe 2
  pants: string;
  shoes: string;
}

export interface CharacterSpec {
  name: string;        // in-game name, A-Z, max 10 chars
  title: string;       // short English epithet, e.g. "CODE NINJA"
  catchphrase: string; // English, shown in-game
  bio: string;         // free text in the user's language (UI only)
  hat: Hat;
  eyewear: Eyewear;
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
  bio: '트럼프의 그린카드를 노리는 원조 도둑.',
  hat: 'beanie',
  eyewear: 'mask',
  palette: {
    skin: '#f4c49a', hat: '#b13e53', hatAccent: '#f4f4f4',
    shirtA: '#eef0f4', shirtB: '#3a3f58', pants: '#3b5dc9', shoes: '#29366f'
  }
};

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
    hat: HATS.includes(r.hat as Hat) ? (r.hat as Hat) : d.hat,
    eyewear: EYEWEAR.includes(r.eyewear as Eyewear) ? (r.eyewear as Eyewear) : d.eyewear,
    palette: {
      skin: color(p.skin, d.palette.skin),
      hat: color(p.hat, d.palette.hat),
      hatAccent: color(p.hatAccent, d.palette.hatAccent),
      shirtA: color(p.shirtA, d.palette.shirtA),
      shirtB: color(p.shirtB, d.palette.shirtB),
      pants: color(p.pants, d.palette.pants),
      shoes: color(p.shoes, d.palette.shoes)
    }
  };
}
