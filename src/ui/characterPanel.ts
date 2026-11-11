import type { CharacterSpec } from '../character/spec';

/**
 * HTML overlay for the character agent: INPUT (description textarea) and
 * OUTPUT (generated spec + raw JSON). DOM instead of canvas so Korean IME,
 * paste and mobile keyboards just work.
 */
export interface PanelHandlers {
  onGenerate: (prompt: string) => void;
  onStart: () => void;
  onBack: () => void;
}

const EXAMPLES = [
  '커피 중독 프론트엔드 개발자, 빨간 야구모자, 선글라스',
  '보라색 머리의 AI 연구원, 안경, 초록 줄무늬 티셔츠',
  '헤어밴드 한 마라톤 선수 출신 스타트업 CEO',
  'A sneaky ninja intern with a black mask and gold sneakers'
];

const CSS = `
#cc-panel { position: fixed; z-index: 10; right: max(16px, env(safe-area-inset-right)); top: 50%;
  transform: translateY(-50%); width: min(44vw, 400px); max-height: calc(100% - 32px); overflow: auto;
  box-sizing: border-box; padding: 14px; background: rgba(26, 28, 44, 0.94); color: #f4f4f4;
  border: 3px solid #f4f4f4; box-shadow: 0 0 0 3px #1a1c2c, 6px 6px 0 3px rgba(0,0,0,.4);
  font: 13px/1.45 ui-monospace, Menlo, Consolas, monospace; -webkit-user-select: text; user-select: text;
  touch-action: auto; image-rendering: pixelated; }
#cc-panel h2 { margin: 0 0 6px; font-size: 12px; letter-spacing: .08em; color: #ffcd3c; }
#cc-panel h2 span { color: #94a0b4; font-weight: normal; }
#cc-panel textarea { width: 100%; box-sizing: border-box; min-height: 64px; resize: vertical; padding: 8px;
  background: #0e0f1a; color: #f4f4f4; border: 2px solid #566c86; font: inherit; outline: none; }
#cc-panel textarea:focus { border-color: #73eff7; }
#cc-panel .row { display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap; }
#cc-panel button { font: inherit; font-weight: bold; padding: 7px 12px; cursor: pointer; color: #1a1c2c;
  background: #f4f4f4; border: 0; box-shadow: inset -3px -3px 0 #94a0b4; }
#cc-panel button:active { box-shadow: inset 3px 3px 0 #94a0b4; }
#cc-panel button:disabled { opacity: .5; cursor: wait; }
#cc-panel button.go { background: #38b764; box-shadow: inset -3px -3px 0 #257179; }
#cc-panel button.ghost { background: transparent; color: #94a0b4; box-shadow: none; padding: 7px 4px; }
#cc-panel .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
#cc-panel .chips button { font-weight: normal; font-size: 11px; padding: 3px 6px; background: #333c57; color: #c8d0e0; box-shadow: none; }
#cc-panel .status { min-height: 1.4em; color: #73eff7; font-size: 12px; }
#cc-panel .status.warn { color: #ef7d57; }
#cc-panel .out { border-top: 2px dashed #566c86; margin-top: 10px; padding-top: 10px; }
#cc-panel .name { font-size: 16px; font-weight: bold; color: #a7f070; }
#cc-panel .title { color: #ffcd3c; font-size: 11px; }
#cc-panel .quote { color: #f4f4f4; margin: 4px 0; }
#cc-panel .bio { color: #c8d0e0; margin: 4px 0; }
#cc-panel .swatches { display: flex; gap: 3px; margin: 6px 0; }
#cc-panel .swatches i { width: 16px; height: 16px; border: 2px solid #1a1c2c; outline: 1px solid #566c86; }
#cc-panel details summary { cursor: pointer; color: #94a0b4; font-size: 11px; }
#cc-panel pre { margin: 6px 0 0; padding: 8px; background: #0e0f1a; font-size: 10.5px; overflow: auto; max-height: 160px; }
@media (max-aspect-ratio: 1/1) {
  body.cc-open #game { height: 56.25vw !important; }
  #cc-panel { top: calc(56.25vw + 8px); bottom: 8px; right: 8px; left: 8px; transform: none; width: auto; max-height: none; padding: 10px; }
}`;

export class CharacterPanel {
  private root: HTMLDivElement;
  private style: HTMLStyleElement;
  private input: HTMLTextAreaElement;
  private genBtn: HTMLButtonElement;
  private status: HTMLDivElement;
  private out: HTMLDivElement;

  constructor(h: PanelHandlers, initialPrompt: string) {
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.id = 'cc-panel';
    this.root.innerHTML = `
      <h2>INPUT <span>· 어떤 캐릭터로 달릴까요?</span></h2>
      <textarea maxlength="300" placeholder="예: ${EXAMPLES[0]}"></textarea>
      <div class="chips"></div>
      <div class="row">
        <button class="gen" type="button">✨ 캐릭터 생성</button>
        <button class="go" type="button">▶ START</button>
        <button class="ghost back" type="button">← 타이틀</button>
      </div>
      <div class="status"></div>
      <div class="out"></div>`;
    document.body.appendChild(this.root);
    document.body.classList.add('cc-open');

    this.input = this.root.querySelector('textarea')!;
    this.input.value = initialPrompt;
    this.genBtn = this.root.querySelector('.gen')!;
    this.status = this.root.querySelector('.status')!;
    this.out = this.root.querySelector('.out')!;

    const chips = this.root.querySelector('.chips')!;
    for (const ex of EXAMPLES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ex.length > 22 ? ex.slice(0, 21) + '…' : ex;
      b.title = ex;
      b.onclick = () => { this.input.value = ex; this.input.focus(); };
      chips.appendChild(b);
    }

    const submit = () => {
      const p = this.input.value.trim();
      if (!p) { this.setStatus('설명을 입력해 주세요.', true); this.input.focus(); return; }
      h.onGenerate(p);
    };
    this.genBtn.onclick = submit;
    (this.root.querySelector('.go') as HTMLButtonElement).onclick = () => h.onStart();
    (this.root.querySelector('.back') as HTMLButtonElement).onclick = () => h.onBack();

    // Keep typing keys away from the game's global key handlers.
    const shield = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.type === 'keydown' && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
    };
    this.root.addEventListener('keydown', shield);
    this.root.addEventListener('keyup', shield);
    for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchmove'] as const) {
      this.root.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
    }
  }

  setBusy(busy: boolean): void {
    this.genBtn.disabled = busy;
    this.genBtn.textContent = busy ? '⏳ 생성 중…' : '✨ 캐릭터 생성';
  }

  setStatus(msg: string, warn = false): void {
    this.status.textContent = msg;
    this.status.classList.toggle('warn', warn);
  }

  showOutput(c: CharacterSpec): void {
    const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
    const sw = Object.values(c.palette).map((v) => `<i style="background:${esc(v)}" title="${esc(v)}"></i>`).join('');
    this.out.innerHTML = `
      <h2>OUTPUT</h2>
      <div class="name">${esc(c.name)}</div>
      <div class="title">${esc(c.title)} · ${esc(c.hat)} / ${esc(c.eyewear)}</div>
      <div class="quote">“${esc(c.catchphrase)}”</div>
      <div class="bio">${esc(c.bio)}</div>
      <div class="swatches">${sw}</div>
      <details><summary>JSON</summary><pre>${esc(JSON.stringify(c, null, 2))}</pre></details>`;
  }

  destroy(): void {
    this.root.remove();
    this.style.remove();
    document.body.classList.remove('cc-open');
  }
}
