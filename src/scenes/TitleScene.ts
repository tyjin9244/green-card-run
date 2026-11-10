import Phaser from 'phaser';
import { W, GROUND_Y, PAL } from '../constants';
import { Backdrop } from '../game/Backdrop';
import { logoCanvas, txt } from '../gfx/font';
import { addImage, HERO_HAND, HANKY_ORIGIN } from '../gfx/sprites';
import { iconButton } from '../ui/Button';
import { store } from '../storage';
import { sfx } from '../audio/Sfx';

export function logoImage(scene: Phaser.Scene, text: string, s: number, tones: [number, number, number]): string {
  const key = `logo_${text}_${s}_${tones[1]}`;
  if (!scene.textures.exists(key)) addImage(scene, key, logoCanvas(text, s, tones));
  return key;
}

export class TitleScene extends Phaser.Scene {
  private bd!: Backdrop;
  private scroll = 0;
  private hero!: Phaser.GameObjects.Sprite;
  private hanky!: Phaser.GameObjects.Sprite;
  private starting = false;

  constructor() { super('Title'); }

  create(): void {
    this.starting = false;
    this.scroll = 0;
    this.bd = new Backdrop(this, 0, 1);

    const g = logoImage(this, 'GREEN CARD', 4, [PAL.greenL, PAL.green, PAL.greenD]);
    const r = logoImage(this, 'RUN!', 5, [PAL.goldL, PAL.gold, PAL.goldD]);
    const l1 = this.add.image(W / 2, 44, g);
    const l2 = this.add.image(W / 2, 88, r);
    this.tweens.add({ targets: l1, y: 41, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: l2, y: 91, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut', delay: 200 });
    txt(this, W / 2, 118, 'THE GREAT GREEN CARD HEIST', { origin: [0.5, 0.5], tint: PAL.white });

    const start = txt(this, W / 2, 146, 'PRESS SPACE OR TAP TO START', { origin: [0.5, 0.5], tint: PAL.goldL });
    this.tweens.add({ targets: start, alpha: 0.15, duration: 520, yoyo: true, repeat: -1 });
    const best = store.getBest();
    txt(this, W / 2, 162, `BEST ${String(best).padStart(6, '0')}`, { origin: [0.5, 0.5], tint: PAL.sky });

    this.add.sprite(170, GROUND_Y, 'chaser').setOrigin(0.5, 1).play('chaser_run');
    this.hanky = this.add.sprite(0, 0, 'hanky').play('hanky_flap').setOrigin(...HANKY_ORIGIN);
    this.hero = this.add.sprite(300, GROUND_Y - 14, 'hero').play('hero_run');

    txt(this, W / 2, 243, 'SPACE/^ JUMP (X2 IN AIR)   _ SLIDE   P PAUSE   M MUTE', { origin: [0.5, 0], tint: PAL.white });
    txt(this, W / 2, 256, 'PARODY GAME - NOT A REAL GREEN CARD', { origin: [0.5, 0], tint: PAL.gray });

    const mute = iconButton(this, W - 14, 14, sfx.muted ? 'icon_mute' : 'icon_sound', () => {
      const m = sfx.toggleMute();
      (mute.getData('icon') as Phaser.GameObjects.Image).setTexture(m ? 'icon_mute' : 'icon_sound');
    });

    this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyM') {
        const m = sfx.toggleMute();
        (mute.getData('icon') as Phaser.GameObjects.Image).setTexture(m ? 'icon_mute' : 'icon_sound');
      } else if (['Space', 'Enter', 'ArrowUp', 'KeyW'].includes(e.code)) this.go();
    });
    this.input.on('pointerup', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) this.go();
    });
    this.cameras.main.fadeIn(300);
    sfx.musicStart('title');
  }

  private go(): void {
    if (this.starting) return;
    this.starting = true;
    sfx.unlock();
    sfx.click();
    sfx.musicStart('title');
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Intro'));
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.1);
    this.scroll += 130 * dt;
    this.bd.update(130 * dt, this.scroll * 0.05);
    const f = Number(this.hero.frame.name);
    const hand = HERO_HAND[f] ?? { x: 4, y: 15 };
    this.hanky.setPosition(this.hero.x - 11 + hand.x, this.hero.y - 14 + hand.y);
  }
}
