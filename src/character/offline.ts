import { DEFAULT_CHARACTER, type CharacterSpec, type Hat, type Eyewear } from './spec';
import { rng } from '../gfx/PixelCanvas';

/**
 * Offline fallback "agent": keyword rules + seeded randomness. Used when the
 * AI endpoint is unreachable so the input → output flow always works.
 */
const COLORS: [RegExp, string][] = [
  [/빨|레드|red/i, '#d8282b'], [/주황|오렌지|orange/i, '#ef7d57'], [/노랑|노란|yellow|gold|금/i, '#ffcd3c'],
  [/초록|녹색|그린|green/i, '#38b764'], [/파랑|파란|블루|blue/i, '#3b5dc9'], [/하늘|sky|cyan/i, '#73eff7'],
  [/보라|퍼플|purple|violet/i, '#7b4fc9'], [/분홍|핑크|pink/i, '#f58cc4'], [/검정|검은|블랙|black/i, '#333c57'],
  [/흰|하양|화이트|white/i, '#f4f4f4'], [/갈색|브라운|brown|커피|coffee/i, '#8a5a3c'], [/회색|그레이|gray|grey/i, '#94a0b4']
];
const HAT_RULES: [RegExp, Hat][] = [
  [/비니|beanie/i, 'beanie'], [/캡|모자|야구|cap|hat/i, 'cap'], [/헤어밴드|머리띠|headband|운동/i, 'headband'],
  [/대머리|민머리|bald/i, 'none'], [/머리|헤어|hair|펑크|punk/i, 'hair']
];
const EYE_RULES: [RegExp, Eyewear][] = [
  [/선글라스|썬글|sunglass|shades|cool|멋/i, 'shades'], [/안경|glasses|nerd|너드|개발|developer|코더/i, 'glasses'],
  [/마스크|복면|도둑|thief|mask|ninja|닌자/i, 'mask']
];
const NAMES = ['MAX', 'JUNO', 'REX', 'NOVA', 'KAI', 'MIRA', 'ZED', 'LUNA', 'ACE', 'PIXEL'];
const TITLES = ['VISA HUNTER', 'CODE RUNNER', 'H1B HERO', 'STARTUP DREAMER', 'OFFER CHASER'];
const LINES = ['MY VISA, MY RULES!', 'HIRED OR BUST!', 'CATCH ME IF YOU CAN!', 'SEE YOU AT STANDUP!', 'NO SPONSOR NEEDED!'];
const SKINS = ['#f4c49a', '#e0a878', '#c68a5a', '#8d5a3a', '#ffd9b8'];

function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

export function offlineCharacter(prompt: string): CharacterSpec {
  const r = rng(hash(prompt));
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const found = COLORS.filter(([re]) => re.test(prompt)).map(([, c]) => c);
  const randColor = () => '#' + Math.floor(r() * 0xffffff).toString(16).padStart(6, '0');
  const c = (i: number) => found[i] ?? randColor();
  const latin = prompt.match(/\b[A-Za-z]{2,10}\b/)?.[0];
  return {
    name: (latin ?? pick(NAMES)).toUpperCase(),
    title: pick(TITLES),
    catchphrase: pick(LINES),
    bio: `오프라인 생성: "${prompt.slice(0, 60)}"`,
    hat: HAT_RULES.find(([re]) => re.test(prompt))?.[1] ?? pick(['beanie', 'cap', 'hair', 'headband'] as const),
    eyewear: EYE_RULES.find(([re]) => re.test(prompt))?.[1] ?? pick(['glasses', 'shades', 'none'] as const),
    palette: {
      skin: pick(SKINS), hat: c(0), hatAccent: c(1), shirtA: c(2), shirtB: DEFAULT_CHARACTER.palette.shirtB,
      pants: found[3] ?? DEFAULT_CHARACTER.palette.pants, shoes: DEFAULT_CHARACTER.palette.shoes
    }
  };
}
