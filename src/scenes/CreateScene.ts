import Phaser from 'phaser';
import { GROUND_Y, PAL } from '../constants';
import { Backdrop } from '../game/Backdrop';
import { txt } from '../gfx/font';
import { applyCharacter, HERO_HAND, HANKY_ORIGIN } from '../gfx/sprites';
import { CharacterPanel } from '../ui/characterPanel';
import { createCharacter, getCharacter, setCharacter } from '../character/agentClient';
import { randomCharacter } from '../character/offline';
import { normalizeSpec } from '../character/spec';
import { FONT_CHARS } from '../gfx/font';
import type { CharacterSpec } from '../character/spec';
import { sfx } from '../audio/Sfx';

let lastPrompt = '';
const PX = 112; // preview x (left side, the panel sits on the right)
const S = 3;    // preview scale

/** Character creation: presets / description → agent / manual edits → CharacterSpec → live sprite preview. */
export class CreateScene extends Phaser.Scene {
  private panel?: CharacterPanel;
  private hero!: Phaser.GameObjects.Sprite;
  private hanky!: Phaser.GameObjects.Sprite;
  private nameT!: Phaser.GameObjects.BitmapText;
  private titleT!: Phaser.GameObjects.BitmapText;
  private quoteT!: Phaser.GameObjects.BitmapText;
  private bd!: Backdrop;
  private scroll = 0;
  private leaving = false;
  private reqId = 0;

  constructor() { super('Create'); }

  create(): void {
    this.leaving = false;
    this.scroll = 0;
    this.bd = new Backdrop(this, 0, 1);
    this.add.rectangle(0, 0, 480, 270, PAL.out, 0.35).setOrigin(0);

    this.nameT = txt(this, PX, 34, '', { origin: [0.5, 0.5], scale: 2, tint: PAL.greenL });
    this.titleT = txt(this, PX, 54, '', { origin: [0.5, 0.5], tint: PAL.gold });
    this.quoteT = txt(this, PX, 72, '', { origin: [0.5, 0.5], tint: PAL.white }).setMaxWidth(200).setCenterAlign();
    this.hanky = this.add.sprite(0, 0, 'hanky').play('hanky_flap').setOrigin(...HANKY_ORIGIN).setScale(S);
    this.hero = this.add.sprite(PX, GROUND_Y - 14 * S, 'hero').setScale(S).play('hero_run');

    this.panel = new CharacterPanel({
      onGenerate: (p) => this.generate(p),
      onRandom: () => this.pick(randomCharacter(), 'Rolled a random runner. Roll again or tweak below.'),
      onChange: (c) => this.apply(normalizeSpec(c, FONT_CHARS), false),
      onStart: () => this.leave('Intro'),
      onBack: () => this.leave('Title')
    }, lastPrompt, getCharacter());
    this.show(getCharacter());
    this.game.scale.refresh();

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Escape') this.leave('Title');
      else if (e.code === 'Enter') this.leave('Intro');
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.panel?.destroy();
      this.panel = undefined;
      this.game.scale.refresh();
    });
    this.cameras.main.fadeIn(250);
  }

  private async generate(prompt: string): Promise<void> {
    lastPrompt = prompt;
    const id = ++this.reqId;
    this.panel?.setBusy(true);
    this.panel?.setStatus('The agent is designing your runner…');
    const { character, source, reason } = await createCharacter(prompt);
    if (id !== this.reqId || !this.panel) return; // scene left or newer request
    this.panel.setBusy(false);
    const msg = source === 'ai'
      ? 'Done! Tweak it below, regenerate, or hit START.'
      : reason === 'billing'
        ? 'AI offline (Vercel AI Gateway needs billing) → used the built-in generator.'
        : 'AI unreachable → used the built-in generator.';
    this.pick(character, msg, source !== 'ai');
  }

  /** A whole new spec (AI result, random roll): rebuild the form and pop the sprite. */
  private pick(c: CharacterSpec, msg: string, warn = false): void {
    this.panel?.setStatus(msg, warn);
    this.panel?.setSpec(c);
    this.apply(c, true);
  }

  private apply(c: CharacterSpec, pop: boolean): void {
    setCharacter(c);
    this.show(c);
    if (!pop) return;
    sfx.click();
    this.tweens.add({ targets: this.hero, scale: { from: S * 1.25, to: S }, duration: 260, ease: 'Back.out' });
  }

  private show(c: CharacterSpec): void {
    applyCharacter(this, c);
    this.nameT.setText(c.name);
    this.titleT.setText(c.title);
    this.quoteT.setText(`"${c.catchphrase}"`);
  }

  private leave(to: 'Intro' | 'Title'): void {
    if (this.leaving) return;
    this.leaving = true;
    sfx.click();
    this.panel?.destroy();
    this.panel = undefined;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(to));
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);
    this.scroll += 90 * dt;
    this.bd.update(90 * dt, this.scroll * 0.05);
    const f = Number(this.hero.frame.name);
    const h = HERO_HAND[f] ?? HERO_HAND[0];
    this.hanky.setPosition(this.hero.x + (h.x - 11) * this.hero.scaleX, this.hero.y + (h.y - 14) * this.hero.scaleY);
  }
}
