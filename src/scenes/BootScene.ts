import Phaser from 'phaser';
import { buildFont } from '../gfx/font';
import { buildSprites } from '../gfx/sprites';
import { buildBackgrounds } from '../gfx/backgrounds';

/** Generates every texture procedurally, registers animations, then routes. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    buildFont(this);
    buildSprites(this);
    buildBackgrounds(this);

    const anim = (key: string, tex: string, frames: number[], frameRate: number, repeat = -1) =>
      this.anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate, repeat });
    anim('hero_run', 'hero', [0, 1, 2, 3], 12);
    anim('hero_sneak', 'hero', [9, 8], 4);
    anim('chaser_run', 'chaser', [0, 1, 2, 3], 10);
    anim('chaser_talk', 'chaser', [4, 5], 4);
    anim('chaser_stomp', 'chaser', [7, 6], 6);
    anim('hanky_flap', 'hanky', [0, 1, 2], 12);
    anim('coin_spin', 'coin', [0, 1, 2, 3], 10);
    anim('drone_fly', 'ob_drone', [0, 1], 20);
    anim('flag_wave', 'flag', [0, 1], 5);

    // Debug / test hooks: ?scene=game&t=40&bot=1&god=1
    const q = new URLSearchParams(location.search);
    const target = q.get('scene');
    if (target === 'game') this.scene.start('Game');
    else if (target === 'intro') this.scene.start('Intro');
    else this.scene.start('Title');
  }
}
