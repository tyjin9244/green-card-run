/**
 * Character-creation agent.
 *
 *   INPUT : POST /api/character  { "prompt": "커피 중독 개발자, 빨간 모자, 선글라스" }
 *   OUTPUT: 200 { "character": CharacterSpec, "source": "ai" }
 *
 * The agent turns a free-form description (any language) into a CharacterSpec
 * that the game renders as the pixel-art hero. Model access goes through the
 * Vercel AI Gateway (OIDC on Vercel, AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN locally).
 *
 * Self-contained on purpose (no relative imports) so Vercel can bundle it as a
 * standalone function; vite.config.ts also imports it for `npm run dev`.
 */
import { Output, ToolLoopAgent } from 'ai';
import { z } from 'zod';

const MAX_PROMPT = 300;
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/).describe('hex color like #a1b2c3');
const ascii = (max: number) => z.string().max(max).describe(`UPPERCASE English A-Z, 0-9, basic punctuation only, max ${max} chars`);

export const characterSchema = z.object({
  name: ascii(10).describe('short in-game name, UPPERCASE A-Z only, max 10 chars'),
  title: ascii(20).describe('punchy English epithet, e.g. "CODE NINJA"'),
  catchphrase: ascii(40).describe('what the hero shouts while fleeing with the green card'),
  bio: z.string().max(200).describe("1-2 sentence bio written in the SAME language as the user's description"),
  hat: z.enum(['beanie', 'cap', 'hair', 'headband', 'none']),
  eyewear: z.enum(['mask', 'glasses', 'shades', 'none']),
  palette: z.object({
    skin: hex,
    hat: hex.describe('color of the beanie / cap / hair / headband'),
    hatAccent: hex.describe('pom-pom, cap brim, or hair color under a headband'),
    shirtA: hex.describe('shirt stripe color 1'),
    shirtB: hex.describe('shirt stripe color 2 (contrast with shirtA)'),
    pants: hex,
    shoes: hex
  })
});

export type GeneratedCharacter = z.infer<typeof characterSchema>;

const characterAgent = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',
  instructions: `You are the character designer for "GREEN CARD RUN", a pixel-art parody runner
where the hero snatches a green card from Trump and runs to a Silicon Valley job.

Turn the player's description (any language) into ONE playable hero.
- The sprite is only 22x28 px: pick bold, readable colors. Shirt stripes must contrast; clothes
  must stand out against a dark navy outline (#1a1c2c) and a bright city/grass background.
- Choose hat and eyewear from the allowed options that best match the description;
  use "mask" only for sneaky/thief vibes. If unspecified, invent something fitting and fun.
- name/title/catchphrase are rendered with an ASCII-only pixel font: UPPERCASE English only.
  Transliterate non-English names (e.g. 지민 -> JIMIN).
- bio is shown in the menu: write it in the user's language.
- Keep it playful parody; no slurs, no real private people.`,
  output: Output.object({ schema: characterSchema }),
  maxOutputTokens: 600
});

export async function generateCharacter(prompt: string): Promise<GeneratedCharacter> {
  const { output } = await characterAgent.generate({ prompt: prompt.slice(0, MAX_PROMPT) });
  return output;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request: Request): Promise<Response> {
  let prompt = '';
  try {
    const body = (await request.json()) as { prompt?: unknown };
    prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  } catch {
    return json({ error: 'Body must be JSON: { "prompt": string }' }, 400);
  }
  if (!prompt) return json({ error: 'prompt is required' }, 400);
  if (prompt.length > MAX_PROMPT) return json({ error: `prompt must be <= ${MAX_PROMPT} chars` }, 400);

  try {
    const character = await generateCharacter(prompt);
    return json({ character, source: 'ai' });
  } catch (err) {
    console.error('character agent failed', err);
    return json({ error: 'Character generation failed' }, 502);
  }
}
