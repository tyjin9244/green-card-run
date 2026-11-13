import {
  EXTRAS, EYEWEAR, FACES, HATS, OUTFITS, PRESETS, SKIN_TONES, fontSafe,
  type CharacterPalette, type CharacterSpec
} from '../character/spec';
import { FONT_CHARS } from '../gfx/font';
import { heroPortrait } from '../gfx/sprites';

/**
 * HTML overlay for the character creator:
 *   PRESETS   – one-click ready-made heroes
 *   DESCRIBE  – free text → AI agent (or offline generator), or 🎲 random
 *   CUSTOMIZE – every field of the resulting spec is editable, live
 * DOM instead of canvas so IME, paste, color pickers and mobile keyboards just work.
 */
export interface PanelHandlers {
  onGenerate: (prompt: string) => void;
  onRandom: () => void;
  /** Spec picked or edited in the panel (preset click, pill, color, text). */
  onChange: (spec: CharacterSpec) => void;
  onStart: () => void;
  onBack: () => void;
}

const EXAMPLES = [
  'Coffee-addicted frontend dev, red cap, sunglasses, hoodie',
  'Purple-haired AI researcher in a lab coat with glasses',
  'Pirate product manager with a beard and an eyepatch',
  'Astronaut rocket engineer with a backpack',
  'Punk rocker with a pink mohawk',
  'Royal unicorn founder with a crown and a red cape'
];

const LABELS: Record<string, string> = {
  hair: 'short hair', long: 'long hair', tophat: 'top hat', none: 'none', labcoat: 'lab coat'
};
const COLOR_FIELDS: [keyof CharacterPalette, string][] = [
  ['hair', 'Hair'], ['hat', 'Hat'], ['hatAccent', 'Hat trim'], ['shirtA', 'Top'],
  ['shirtB', 'Top 2'], ['pants', 'Pants'], ['shoes', 'Shoes'], ['accent', 'Extra']
];
type PartKey = 'hat' | 'eyewear' | 'face' | 'outfit' | 'extra';
const PARTS: [PartKey, string, readonly string[]][] = [
  ['hat', 'HEAD', HATS], ['eyewear', 'EYES', EYEWEAR], ['face', 'FACE', FACES],
  ['outfit', 'OUTFIT', OUTFITS], ['extra', 'EXTRA', EXTRAS]
];

const CSS = `
#cc-panel { position: fixed; z-index: 10; right: max(16px, env(safe-area-inset-right)); top: 50%;
  transform: translateY(-50%); width: min(46vw, 430px); max-height: calc(100% - 32px); overflow: auto;
  box-sizing: border-box; padding: 12px 14px; background: rgba(26, 28, 44, 0.95); color: #f4f4f4;
  border: 3px solid #f4f4f4; box-shadow: 0 0 0 3px #1a1c2c, 6px 6px 0 3px rgba(0,0,0,.4);
  font: 12px/1.45 ui-monospace, Menlo, Consolas, monospace; -webkit-user-select: text; user-select: text;
  touch-action: auto; }
#cc-panel h2 { margin: 12px 0 6px; font-size: 12px; letter-spacing: .08em; color: #ffcd3c; }
#cc-panel h2:first-child { margin-top: 0; }
#cc-panel h2 span { color: #94a0b4; font-weight: normal; letter-spacing: 0; }
#cc-panel textarea, #cc-panel input[type=text] { width: 100%; box-sizing: border-box; padding: 6px 8px;
  background: #0e0f1a; color: #f4f4f4; border: 2px solid #566c86; font: inherit; outline: none; }
#cc-panel textarea { min-height: 52px; resize: vertical; }
#cc-panel textarea:focus, #cc-panel input[type=text]:focus { border-color: #73eff7; }
#cc-panel .row { display: flex; gap: 6px; margin: 8px 0; flex-wrap: wrap; align-items: center; }
#cc-panel button { font: inherit; font-weight: bold; padding: 6px 10px; cursor: pointer; color: #1a1c2c;
  background: #f4f4f4; border: 0; box-shadow: inset -3px -3px 0 #94a0b4; }
#cc-panel button:active { box-shadow: inset 3px 3px 0 #94a0b4; }
#cc-panel button:disabled { opacity: .5; cursor: wait; }
#cc-panel button.go { background: #38b764; box-shadow: inset -3px -3px 0 #257179; }
#cc-panel button.ghost { background: transparent; color: #94a0b4; box-shadow: none; padding: 6px 4px; }
#cc-panel .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
#cc-panel .chips button { font-weight: normal; font-size: 11px; padding: 3px 6px; background: #333c57; color: #c8d0e0; box-shadow: none; }
#cc-panel .status { min-height: 1.4em; color: #73eff7; font-size: 11px; }
#cc-panel .status.warn { color: #ef7d57; }
#cc-panel .presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 4px; }
#cc-panel .presets button { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px;
  background: #333c57; color: #c8d0e0; box-shadow: none; font-weight: normal; font-size: 9.5px; border: 2px solid transparent; }
#cc-panel .presets button:hover { border-color: #73eff7; }
#cc-panel .presets canvas { width: 44px; height: 56px; image-rendering: pixelated; }
#cc-panel .field { display: grid; grid-template-columns: 62px 1fr; gap: 6px; align-items: center; margin: 4px 0; }
#cc-panel .field > label, #cc-panel .lbl { color: #94a0b4; font-size: 10.5px; letter-spacing: .05em; }
#cc-panel .pills { display: flex; flex-wrap: wrap; gap: 3px; }
#cc-panel .pills button { font-weight: normal; font-size: 10.5px; padding: 2px 6px; background: #333c57; color: #c8d0e0; box-shadow: none; }
#cc-panel .pills button.on { background: #ffcd3c; color: #1a1c2c; font-weight: bold; }
#cc-panel .skins { display: flex; gap: 4px; }
#cc-panel .skins button { width: 20px; height: 20px; padding: 0; border: 2px solid #1a1c2c; box-shadow: none; }
#cc-panel .skins button.on { outline: 2px solid #ffcd3c; }
#cc-panel .colors { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 6px; margin-top: 4px; }
#cc-panel .colors label { display: flex; align-items: center; gap: 4px; color: #c8d0e0; font-size: 10.5px; }
#cc-panel input[type=color] { width: 22px; height: 22px; padding: 0; border: 2px solid #1a1c2c; background: none; cursor: pointer; }
#cc-panel .bio { color: #c8d0e0; margin: 6px 0; font-style: italic; }
#cc-panel details summary { cursor: pointer; color: #94a0b4; font-size: 11px; }
#cc-panel pre { margin: 6px 0 0; padding: 8px; background: #0e0f1a; font-size: 10px; overflow: auto; max-height: 160px; }
#cc-panel .foot { position: sticky; bottom: -12px; margin: 10px -14px -12px; padding: 8px 14px;
  background: rgba(26, 28, 44, 0.98); border-top: 2px dashed #566c86; }
@media (max-aspect-ratio: 1/1) {
  body.cc-open #game { height: 56.25vw !important; }
  #cc-panel { top: calc(56.25vw + 8px); bottom: 8px; right: 8px; left: 8px; transform: none; width: auto; max-height: none; padding: 10px; }
}`;

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

export class CharacterPanel {
  private root: HTMLDivElement;
  private style: HTMLStyleElement;
  private input: HTMLTextAreaElement;
  private genBtn: HTMLButtonElement;
  private status: HTMLDivElement;
  private spec: CharacterSpec;

  constructor(private h: PanelHandlers, initialPrompt: string, spec: CharacterSpec) {
    this.spec = spec;
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.id = 'cc-panel';
    this.root.innerHTML = `
      <h2>1 · PICK A HERO <span>ready-made runners</span></h2>
      <div class="presets"></div>
      <h2>2 · OR DESCRIBE ONE <span>the AI agent designs it</span></h2>
      <textarea maxlength="300" placeholder="e.g. ${esc(EXAMPLES[0])}"></textarea>
      <div class="chips"></div>
      <div class="row">
        <button class="gen" type="button">✨ Generate</button>
        <button class="rnd" type="button">🎲 Random</button>
      </div>
      <div class="status"></div>
      <h2>3 · CUSTOMIZE <span>tweak anything, it updates live</span></h2>
      <div class="custom"></div>
      <div class="row foot">
        <button class="go" type="button">▶ START RUN</button>
        <button class="ghost back" type="button">← Back</button>
      </div>`;
    document.body.appendChild(this.root);
    document.body.classList.add('cc-open');

    this.input = this.root.querySelector('textarea')!;
    this.input.value = initialPrompt;
    this.genBtn = this.root.querySelector('.gen')!;
    this.status = this.root.querySelector('.status')!;

    // presets with live sprite thumbnails
    const grid = this.root.querySelector('.presets')!;
    for (const p of PRESETS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.title = `${p.name} · ${p.title}`;
      b.appendChild(heroPortrait(p, spec));
      b.append(p.name);
      b.onclick = () => {
        this.setStatus(`${p.name}, ${p.title.toLowerCase()}. Tweak below or hit START.`);
        this.emit(structuredClone(p));
      };
      grid.appendChild(b);
    }

    const chips = this.root.querySelector('.chips')!;
    for (const ex of EXAMPLES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ex.length > 26 ? ex.slice(0, 25) + '…' : ex;
      b.title = ex;
      b.onclick = () => { this.input.value = ex; this.input.focus(); };
      chips.appendChild(b);
    }

    const submit = () => {
      const p = this.input.value.trim();
      if (!p) { this.setStatus('Describe your hero first.', true); this.input.focus(); return; }
      h.onGenerate(p);
    };
    this.genBtn.onclick = submit;
    (this.root.querySelector('.rnd') as HTMLButtonElement).onclick = () => h.onRandom();
    (this.root.querySelector('.go') as HTMLButtonElement).onclick = () => h.onStart();
    (this.root.querySelector('.back') as HTMLButtonElement).onclick = () => h.onBack();

    // Keep typing keys away from the game's global key handlers.
    const shield = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.type === 'keydown' && e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.target === this.input) submit();
    };
    this.root.addEventListener('keydown', shield);
    this.root.addEventListener('keyup', shield);
    for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchmove'] as const) {
      this.root.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    }
    this.renderCustom();
  }

  setBusy(busy: boolean): void {
    this.genBtn.disabled = busy;
    this.genBtn.textContent = busy ? '⏳ Designing…' : '✨ Generate';
  }

  setStatus(msg: string, warn = false): void {
    this.status.textContent = msg;
    this.status.classList.toggle('warn', warn);
  }

  /** Load a spec from outside (AI result, random) and rebuild the form. */
  setSpec(c: CharacterSpec): void {
    this.spec = structuredClone(c);
    this.renderCustom();
  }

  /** Apply a change made inside the panel. */
  private emit(c: CharacterSpec, rerender = true): void {
    this.spec = c;
    this.h.onChange(structuredClone(c));
    if (rerender) this.renderCustom();
    else this.refreshJson();
  }

  private refreshJson(): void {
    const pre = this.root.querySelector('.custom pre');
    if (pre) pre.textContent = JSON.stringify(this.spec, null, 2);
  }

  private renderCustom(): void {
    const c = this.spec;
    const box = this.root.querySelector('.custom') as HTMLDivElement;
    const open = (box.querySelector('details') as HTMLDetailsElement | null)?.open ?? false;
    const text = (key: 'name' | 'title' | 'catchphrase', label: string, max: number) =>
      `<div class="field"><label>${label}</label><input type="text" data-k="${key}" maxlength="${max}" value="${esc(c[key])}"></div>`;
    const pills = ([key, label, opts]: (typeof PARTS)[number]) => `
      <div class="field"><span class="lbl">${label}</span><div class="pills">${opts.map((o) =>
        `<button type="button" data-part="${key}" data-v="${o}" class="${c[key] === o ? 'on' : ''}">${esc(LABELS[o] ?? o)}</button>`).join('')}</div></div>`;
    box.innerHTML = `
      ${text('name', 'NAME', 10)}${text('title', 'TITLE', 20)}${text('catchphrase', 'SHOUT', 40)}
      ${PARTS.map(pills).join('')}
      <div class="field"><span class="lbl">SKIN</span><div class="skins">${SKIN_TONES.map((s) =>
        `<button type="button" data-skin="${s}" style="background:${s}" class="${c.palette.skin === s ? 'on' : ''}" title="${s}"></button>`).join('')}
        <input type="color" data-color="skin" value="${c.palette.skin}" title="custom skin"></div></div>
      <div class="lbl">COLORS</div>
      <div class="colors">${COLOR_FIELDS.map(([k, l]) =>
        `<label><input type="color" data-color="${k}" value="${c.palette[k]}">${l}</label>`).join('')}</div>
      <div class="bio">${esc(c.bio)}</div>
      <details${open ? ' open' : ''}><summary>Spec JSON (agent output)</summary><pre></pre></details>`;
    this.refreshJson();

    box.querySelectorAll<HTMLInputElement>('input[data-k]').forEach((el) => {
      const k = el.dataset.k as 'name' | 'title' | 'catchphrase';
      el.oninput = () => {
        const v = fontSafe(el.value, Number(el.maxLength), FONT_CHARS);
        if (v) this.emit({ ...this.spec, [k]: v }, false);
      };
      el.onblur = () => { el.value = this.spec[k]; };
    });
    box.querySelectorAll<HTMLButtonElement>('button[data-part]').forEach((el) => {
      el.onclick = () => this.emit({ ...this.spec, [el.dataset.part!]: el.dataset.v });
    });
    box.querySelectorAll<HTMLButtonElement>('button[data-skin]').forEach((el) => {
      el.onclick = () => this.emit({ ...this.spec, palette: { ...this.spec.palette, skin: el.dataset.skin! } });
    });
    box.querySelectorAll<HTMLInputElement>('input[data-color]').forEach((el) => {
      const k = el.dataset.color as keyof CharacterPalette;
      el.oninput = () => this.emit({ ...this.spec, palette: { ...this.spec.palette, [k]: el.value } }, false);
    });
  }

  destroy(): void {
    this.root.remove();
    this.style.remove();
    document.body.classList.remove('cc-open');
  }
}
