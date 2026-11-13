import {
  EXTRAS, EYEWEAR, FACES, HATS, OUTFITS, SKIN_TONES,
  type CharacterSpec, type Extra, type Eyewear, type Face, type Hat, type Outfit
} from './spec';
import { rng } from '../gfx/PixelCanvas';

/**
 * Offline fallback "agent": keyword rules + seeded randomness. Used when the
 * AI endpoint is unreachable so the input → output flow always works.
 * Keywords match English and Korean descriptions.
 */
const COLORS: [RegExp, string][] = [
  [/빨|레드|red|crimson/i, '#d8282b'], [/주황|오렌지|orange/i, '#ef7d57'], [/노랑|노란|yellow|gold|금/i, '#ffcd3c'],
  [/초록|녹색|그린|green|lime/i, '#38b764'], [/파랑|파란|블루|blue|navy/i, '#3b5dc9'], [/하늘|sky|cyan|teal/i, '#73eff7'],
  [/보라|퍼플|purple|violet/i, '#7b4fc9'], [/분홍|핑크|pink/i, '#f58cc4'], [/검정|검은|블랙|black|dark/i, '#333c57'],
  [/흰|하양|화이트|white/i, '#f4f4f4'], [/갈색|브라운|brown|coffee|커피/i, '#8a5a3c'], [/회색|그레이|gray|grey|silver/i, '#94a0b4']
];
const HAT_RULES: [RegExp, Hat][] = [
  [/왕관|king|queen|royal|crown|prince|princess/i, 'crown'], [/cowboy|카우보이|ranch|western/i, 'cowboy'],
  [/astronaut|우주|helmet|헬멧|rocket|biker|racer/i, 'helmet'], [/top ?hat|magician|마술|gentleman|신사/i, 'tophat'],
  [/punk|펑크|mohawk|모히칸|rock/i, 'mohawk'], [/afro|아프로|disco|groovy/i, 'afro'],
  [/long hair|긴 ?머리|ponytail|포니테일/i, 'long'], [/비니|beanie/i, 'beanie'], [/캡|모자|야구|cap|hat/i, 'cap'],
  [/헤어밴드|머리띠|headband|ninja|닌자|athlete|운동/i, 'headband'], [/대머리|민머리|bald/i, 'none'],
  [/머리|헤어|hair/i, 'hair']
];
const EYE_RULES: [RegExp, Eyewear][] = [
  [/pirate|해적|eyepatch|안대/i, 'eyepatch'], [/monocle|모노클|professor|교수|rich|부자/i, 'monocle'],
  [/visor|vr|cyber|사이버|robot|로봇|astronaut|우주/i, 'visor'],
  [/선글라스|썬글|sunglass|shades|cool|멋/i, 'shades'],
  [/마스크|복면|도둑|thief|mask|ninja|닌자|spy/i, 'mask'],
  [/안경|glasses|nerd|너드|개발|developer|coder|engineer|researcher/i, 'glasses']
];
const FACE_RULES: [RegExp, Face][] = [
  [/beard|수염|pirate|해적|wizard|professor|교수|lumberjack/i, 'beard'],
  [/mustache|moustache|콧수염|cowboy|chef/i, 'mustache'], [/stubble|tired|피곤|all-nighter|밤샘/i, 'stubble']
];
const OUTFIT_RULES: [RegExp, Outfit][] = [
  [/lab ?coat|scientist|과학|연구|researcher|doctor|의사|ai\b/i, 'labcoat'],
  [/suit|정장|ceo|founder|banker|lawyer|변호사|manager|business/i, 'suit'],
  [/hoodie|후드|developer|개발|coder|hacker|해커/i, 'hoodie'],
  [/stripe|줄무늬|pirate|해적|sailor/i, 'stripes'], [/t-?shirt|티셔츠|tee|designer|디자이너/i, 'tee']
];
const EXTRA_RULES: [RegExp, Extra][] = [
  [/cape|망토|super|hero|히어로|king|queen|royal|wizard/i, 'cape'],
  [/backpack|백팩|가방|student|학생|intern|인턴|hiker|astronaut/i, 'backpack'],
  [/scarf|목도리|스카프|winter|겨울|ninja|닌자/i, 'scarf']
];

const NAMES = ['MAX', 'JUNO', 'REX', 'NOVA', 'KAI', 'MIRA', 'ZED', 'LUNA', 'ACE', 'PIXEL', 'BYTE', 'SKY', 'ROX', 'TOBI'];
const TITLES = ['VISA HUNTER', 'CODE RUNNER', 'H1B HERO', 'STARTUP DREAMER', 'OFFER CHASER', 'BUG SQUASHER',
  'DEMO DAY LEGEND', 'MERGE MASTER', 'SPRINT SPRINTER', 'PIVOT PRO'];
const LINES = ['MY VISA, MY RULES!', 'HIRED OR BUST!', 'CATCH ME IF YOU CAN!', 'SEE YOU AT STANDUP!', 'NO SPONSOR NEEDED!',
  'GIT PUSH --FORCE!', 'OFFER LETTER INCOMING!', 'RUNNING ON CAFFEINE!', 'TO THE VALLEY!'];
const VIVID = ['#d8282b', '#ef7d57', '#ffcd3c', '#38b764', '#3b5dc9', '#73eff7', '#7b4fc9', '#f58cc4', '#333c57', '#f4f4f4', '#257179', '#b13e53'];
const HAIRS = ['#1a1c2c', '#2b1d14', '#4a2f20', '#8a5a3c', '#c98a1b', '#ffcd3c', '#94a0b4', '#d8282b', '#7b4fc9', '#f58cc4', '#73eff7'];

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

/** INPUT: description → OUTPUT: CharacterSpec (keywords first, seeded randomness for the rest). */
export function offlineCharacter(prompt: string): CharacterSpec {
  const r = rng(hash(prompt));
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const rule = <T,>(rules: [RegExp, T][]) => rules.find(([re]) => re.test(prompt))?.[1];
  const found = COLORS.filter(([re]) => re.test(prompt)).map(([, c]) => c);
  const c = (i: number) => found[i] ?? pick(VIVID);
  let shirtA = c(0);
  let shirtB = pick(VIVID);
  while (shirtB === shirtA) shirtB = pick(VIVID);
  const latin = prompt.match(/\b(?:named|called)\s+([A-Za-z]{2,10})\b/i)?.[1];
  return {
    name: (latin ?? pick(NAMES)).toUpperCase(),
    title: pick(TITLES),
    catchphrase: pick(LINES),
    bio: `Built offline from: "${prompt.slice(0, 80)}"`,
    hat: rule(HAT_RULES) ?? pick(HATS),
    eyewear: rule(EYE_RULES) ?? pick([...EYEWEAR, 'none', 'none'] as const),
    face: rule(FACE_RULES) ?? pick([...FACES, 'none', 'none'] as const),
    outfit: rule(OUTFIT_RULES) ?? pick(OUTFITS),
    extra: rule(EXTRA_RULES) ?? pick([...EXTRAS, 'none'] as const),
    palette: {
      skin: pick(SKIN_TONES), hair: found[1] ?? pick(HAIRS), hat: c(1), hatAccent: c(2),
      shirtA, shirtB, pants: found[3] ?? pick(['#3b5dc9', '#333c57', '#29366f', '#566c86', '#8a5a3c']),
      shoes: pick(['#1a1c2c', '#f4f4f4', '#d8282b', '#ffcd3c', '#29366f']), accent: c(2)
    }
  };
}

/** Fully random hero for the 🎲 button. */
export function randomCharacter(): CharacterSpec {
  return { ...offlineCharacter(String(Math.random())), bio: 'A totally random runner. Reroll if you dare.' };
}
