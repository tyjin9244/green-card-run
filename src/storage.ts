const BEST = 'gcr_best';
const MUTED = 'gcr_muted';

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, v: string): void {
  try { localStorage.setItem(key, v); } catch { /* storage blocked: ignore */ }
}

export const store = {
  getBest: (): number => Number(read(BEST)) || 0,
  /** Saves and returns true when `score` is a new record. */
  submit(score: number): boolean {
    if (score > store.getBest()) { write(BEST, String(score)); return true; }
    return false;
  },
  getMuted: (): boolean => read(MUTED) === '1',
  setMuted: (m: boolean): void => write(MUTED, m ? '1' : '0')
};
