import Phaser from 'phaser';
import { GROUND_Y, W, H } from '../constants';
import { LAYER_FACTORS } from '../gfx/backgrounds';

interface StageLayers {
  sky: Phaser.GameObjects.Image;
  clouds: Phaser.GameObjects.TileSprite;
  far: Phaser.GameObjects.TileSprite;
  mid: Phaser.GameObjects.TileSprite;
  ground: Phaser.GameObjects.TileSprite;
}

/** Three-stage parallax background; stages cross-fade at checkpoints. */
export class Backdrop {
  private stages: StageLayers[] = [];
  private scroll = 0;
  current = 0;

  constructor(private scene: Phaser.Scene, stage = 0, stagesToBuild = 3) {
    for (let s = 0; s < stagesToBuild; s++) {
      const farH = scene.textures.get(`bg${s}_far`).getSourceImage().height;
      const midH = scene.textures.get(`bg${s}_mid`).getSourceImage().height;
      const l: StageLayers = {
        sky: scene.add.image(0, 0, `bg${s}_sky`).setOrigin(0, 0),
        clouds: scene.add.tileSprite(0, 12, W, 64, `bg${s}_clouds`).setOrigin(0, 0),
        far: scene.add.tileSprite(0, GROUND_Y - farH, W, farH, `bg${s}_far`).setOrigin(0, 0),
        mid: scene.add.tileSprite(0, GROUND_Y - midH, W, midH, `bg${s}_mid`).setOrigin(0, 0),
        ground: scene.add.tileSprite(0, GROUND_Y, W, H - GROUND_Y, `bg${s}_ground`).setOrigin(0, 0)
      };
      Object.values(l).forEach((o) => o.setDepth(-100 + s).setAlpha(s === stage ? 1 : 0));
      l.ground.setDepth(-50 + s);
      this.stages.push(l);
    }
    this.current = stage;
  }

  update(dx: number, cloudDrift: number): void {
    this.scroll += dx;
    for (const l of this.stages) {
      if (l.sky.alpha === 0) continue;
      l.clouds.tilePositionX = Math.round(this.scroll * LAYER_FACTORS.clouds + cloudDrift);
      l.far.tilePositionX = Math.round(this.scroll * LAYER_FACTORS.far);
      l.mid.tilePositionX = Math.round(this.scroll * LAYER_FACTORS.mid);
      l.ground.tilePositionX = Math.round(this.scroll * LAYER_FACTORS.ground);
    }
  }

  setStage(s: number, ms = 1200): void {
    if (s === this.current || !this.stages[s]) return;
    const next = this.stages[s];
    Object.values(next).forEach((o) => this.scene.tweens.add({ targets: o, alpha: 1, duration: ms }));
    const prev = this.stages[this.current];
    Object.values(prev).forEach((o) => this.scene.tweens.add({ targets: o, alpha: 0, duration: ms, delay: ms * 0.5 }));
    this.current = s;
  }
}
