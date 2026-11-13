import { DEFAULT_CHARACTER, normalizeSpec, type CharacterResponse, type CharacterSpec } from './spec';
import { offlineCharacter } from './offline';
import { FONT_CHARS } from '../gfx/font';

const KEY = 'gcr_character';

let current: CharacterSpec = load();

function load(): CharacterSpec {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalizeSpec(JSON.parse(raw), FONT_CHARS);
  } catch { /* storage blocked or bad JSON */ }
  return DEFAULT_CHARACTER;
}

export function getCharacter(): CharacterSpec { return current; }

export function setCharacter(c: CharacterSpec): void {
  current = c;
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

/**
 * INPUT: free-text description → OUTPUT: validated CharacterSpec.
 * Calls the server agent; falls back to the offline generator on failure.
 */
export async function createCharacter(prompt: string): Promise<CharacterResponse & { reason?: string }> {
  try {
    const res = await fetch('/api/character', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { code?: string };
      throw new Error(err.code === 'billing' ? 'billing' : `HTTP ${res.status}`);
    }
    const data = (await res.json()) as CharacterResponse;
    return { character: normalizeSpec(data.character, FONT_CHARS), source: 'ai' };
  } catch (err) {
    console.warn('AI character agent unavailable, using offline generator', err);
    const reason = err instanceof Error && err.message === 'billing' ? 'billing' : 'offline';
    return { character: normalizeSpec(offlineCharacter(prompt), FONT_CHARS), source: 'offline', reason };
  }
}
