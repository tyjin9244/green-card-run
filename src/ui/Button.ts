import Phaser from 'phaser';
import { panelKey } from '../gfx/sprites';
import { txt } from '../gfx/font';
import { sfx } from '../audio/Sfx';

/** Pixel-art button: bevelled panel + bitmap label, hover/press states. */
export class PixelButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Image;
  private keyN: string;
  private keyH: string;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, w: number, onClick: () => void, h = 22) {
    super(scene, x, y);
    this.keyN = panelKey(scene, w, h, 'btn');
    this.keyH = panelKey(scene, w, h, 'btnHi');
    this.bg = scene.add.image(0, 0, this.keyN);
    const t = txt(scene, 0, 0, label, { origin: [0.5, 0.5] });
    this.add([this.bg, t]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => this.bg.setTexture(this.keyH));
    this.on('pointerout', () => { this.bg.setTexture(this.keyN); this.setScale(1); });
    this.on('pointerdown', () => this.setScale(0.94));
    this.on('pointerup', () => {
      this.setScale(1);
      sfx.click();
      onClick();
    });
    scene.add.existing(this);
  }
}

/** Small square icon button used for pause / mute. */
export function iconButton(scene: Phaser.Scene, x: number, y: number, icon: string, onClick: () => void): Phaser.GameObjects.Container {
  const bg = scene.add.image(0, 0, panelKey(scene, 20, 20, 'touch')).setAlpha(0.85);
  const ic = scene.add.image(0, 0, icon);
  const c = scene.add.container(x, y, [bg, ic]);
  c.setSize(22, 22).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => c.setScale(0.9));
  c.on('pointerout', () => c.setScale(1));
  c.on('pointerup', () => { c.setScale(1); onClick(); });
  c.setData('icon', ic);
  return c;
}
