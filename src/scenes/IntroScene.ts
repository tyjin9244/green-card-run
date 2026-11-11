import Phaser from 'phaser';
import { W, GROUND_Y, PAL } from '../constants';
import { Backdrop } from '../game/Backdrop';
import { txt } from '../gfx/font';
import { panelKey, bubbleKey, HERO_HAND, HANKY_ORIGIN } from '../gfx/sprites';
import { PixelButton } from '../ui/Button';
import { sfx } from '../audio/Sfx';
import { getCharacter } from '../character/agentClient';

/** Short skippable opening: the heist of the Green Card hanky. */
export class IntroScene extends Phaser.Scene {
  private done = false;
  private hero!: Phaser.GameObjects.Sprite;
  private hanky!: Phaser.GameObjects.Sprite;
  private holding = false;
  private name!: Phaser.GameObjects.BitmapText;
  private line!: Phaser.GameObjects.BitmapText;
  private typeEv?: Phaser.Time.TimerEvent;

  constructor() { super('Intro'); }

  create(): void {
    this.done = false;
    this.holding = false;
    new Backdrop(this, 0, 1);

    this.add.image(356, GROUND_Y, 'podium').setOrigin(0.5, 1).setDepth(3);
    const boss = this.add.sprite(322, GROUND_Y, 'chaser').setOrigin(0.5, 1).setDepth(2).play('chaser_talk');
    // pocket position of the hanky on the chaser sprite (frame 4/5 pocket at 11..13, 18..20)
    this.hanky = this.add.sprite(322 - 17 + 13, GROUND_Y - 42 + 20, 'hanky', 0).setOrigin(...HANKY_ORIGIN).setDepth(1.5).setVisible(false);
    this.hero = this.add.sprite(-20, GROUND_Y - 14, 'hero', 9).setDepth(2.5).play('hero_sneak');

    this.add.image(W / 2, 34, panelKey(this, 456, 46)).setDepth(10);
    this.name = txt(this, 22, 16, '', { tint: PAL.gold, depth: 11 });
    this.line = txt(this, 22, 29, '', { depth: 11 }).setMaxWidth(430);

    const skip = new PixelButton(this, W - 34, 74, 'SKIP >', 52, () => this.finish());
    skip.setDepth(12);
    txt(this, W / 2, 258, 'SPACE / TAP / ESC : SKIP', { origin: [0.5, 0], tint: PAL.gray, depth: 12 });

    const say = (who: string, text: string) => {
      this.name.setText(who);
      this.line.setText('');
      this.typeEv?.remove();
      let i = 0;
      this.typeEv = this.time.addEvent({
        delay: 28, repeat: text.length - 1,
        callback: () => { i++; this.line.setText(text.slice(0, i)); }
      });
    };

    const at = (s: number, fn: () => void) => this.time.delayedCall(s * 1000, () => { if (!this.done) fn(); });

    say('TRUMP', 'MY GREEN CARD IS THE MOST BEAUTIFUL CARD. TREMENDOUS. EVERYBODY SAYS SO!');
    at(2.6, () => {
      say('???', '(PSST... THAT GREEN CARD IS MY TICKET TO STAY HERE.)');
      this.tweens.add({ targets: this.hero, x: 300, duration: 2200 });
    });
    at(5.0, () => {
      this.hanky.setVisible(true).play('hanky_flap');
      sfx.snatch();
      this.tweens.add({
        targets: this.hanky, x: 300 - 11 + HERO_HAND[9].x, y: this.hero.y - 14 + HERO_HAND[9].y, duration: 220,
        onComplete: () => { this.holding = true; }
      });
      boss.stop().setFrame(6);
      this.tweens.add({ targets: boss, y: GROUND_Y - 10, duration: 140, yoyo: true });
      const b = this.add.image(boss.x + 14, boss.y - 52, bubbleKey(this, 20)).setOrigin(0, 0).setDepth(5);
      const e = txt(this, b.x + 10, b.y + 4, '!!', { origin: [0.5, 0], tint: PAL.red, depth: 6 });
      this.time.delayedCall(1400, () => { b.destroy(); e.destroy(); });
      this.hero.stop().setFrame(8);
    });
    at(6.0, () => { say('TRUMP', "HEY!! THAT'S MY GREEN CARD! COME BACK HERE!"); sfx.shout(); boss.setFrame(7); });
    at(7.6, () => {
      say(getCharacter().name, getCharacter().catchphrase);
      this.hero.play('hero_run');
      this.tweens.add({ targets: this.hero, x: W + 30, duration: 1300 });
    });
    at(8.3, () => {
      boss.setFlipX(false).play('chaser_run');
      this.tweens.add({ targets: boss, x: W + 40, duration: 1500 });
    });
    at(9.6, () => this.finish());

    this.time.delayedCall(250, () => {
      this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
        if (!e.repeat && ['Space', 'Enter', 'Escape', 'ArrowUp'].includes(e.code)) this.finish();
      });
      this.input.on('pointerup', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length === 0) this.finish();
      });
    });
    sfx.musicStart('title');
    this.cameras.main.fadeIn(250);
  }

  update(): void {
    if (this.holding) {
      const f = Number(this.hero.frame.name);
      const h = HERO_HAND[f] ?? HERO_HAND[0];
      this.hanky.setPosition(this.hero.x - 11 + h.x, this.hero.y - 14 + h.y);
    }
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game'));
  }
}
