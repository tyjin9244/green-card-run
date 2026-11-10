import Phaser from 'phaser';
import {
  W, H, GROUND_Y, HERO_X, STEP, GRAVITY, JUMP_V, DOUBLE_JUMP_V, FAST_FALL, RUN_TIME, CHECKPOINTS,
  STAGE_NAMES, SPEED_START, SPEED_END, GAP_START, GAP_MAX, GAP_HIT, GAP_BURGER, GAP_CHECKPOINT, PX_PER_METER, PAL
} from '../constants';
import { Backdrop } from '../game/Backdrop';
import { txt } from '../gfx/font';
import { HERO_HAND, HANKY_ORIGIN, panelKey, bubbleKey } from '../gfx/sprites';
import { PixelButton, iconButton } from '../ui/Button';
import { logoImage } from './TitleScene';
import { sfx } from '../audio/Sfx';
import { store } from '../storage';

type ObType = 'low' | 'tall' | 'over' | 'air';
interface ObDef { key: string; type: ObType; hb: [number, number]; lift?: number; extraV?: number; anim?: string }

const OBS: Record<string, ObDef> = {
  cone: { key: 'ob_cone', type: 'low', hb: [9, 12] },
  hydrant: { key: 'ob_hydrant', type: 'low', hb: [9, 14] },
  crates: { key: 'ob_crates', type: 'tall', hb: [17, 44] },
  banner: { key: 'ob_banner', type: 'over', hb: [56, 220], lift: 13 },
  drone: { key: 'ob_drone', type: 'air', hb: [16, 8], lift: 15, anim: 'drone_fly' },
  golfbag: { key: 'ob_golfbag', type: 'low', hb: [9, 20] },
  cart: { key: 'ob_cart', type: 'low', hb: [30, 16] },
  vip: { key: 'ob_vip', type: 'over', hb: [56, 220], lift: 13 },
  ball: { key: 'ob_ball', type: 'air', hb: [6, 6], lift: 15, extraV: 150 },
  paper: { key: 'ob_paper', type: 'low', hb: [15, 12] },
  server: { key: 'ob_server', type: 'tall', hb: [18, 42] },
  lottery: { key: 'ob_lottery', type: 'over', hb: [64, 220], lift: 13 },
  scooter: { key: 'ob_scooter', type: 'low', hb: [20, 14] }
};

const STAGE_POOLS: Record<ObType, string[]>[] = [
  { low: ['cone', 'hydrant'], tall: ['crates'], over: ['banner'], air: ['drone'] },
  { low: ['golfbag', 'cart'], tall: ['crates'], over: ['vip'], air: ['ball', 'drone'] },
  { low: ['paper', 'scooter'], tall: ['server'], over: ['lottery'], air: ['drone'] }
];

const TAUNTS = [
  'COME BACK!', "THAT'S MINE!", "YOU'RE FIRED!", 'SAD!', 'FAKE RUNNER!', 'BIGLY RUDE!', 'STOP! THIEF!',
  'HUGE MISTAKE!', 'NOT NICE!', 'TOTAL DISASTER!', 'BELIEVE ME!', 'NOBODY RUNS FASTER!',
  'VERY UNFAIR!', 'I KNOW RUNNING. BEST!', "YOU'RE A LOSER!", 'LOW ENERGY RUNNER!',
  'WRONG!', 'TREMENDOUS THEFT!', 'FAKE NEWS RUNNER!', 'I HAVE THE BEST CARDS!',
  'GIVE IT BACK, BIGLY!', "I'M VERY FAST. VERY!"
];
// Visa / immigration-fee jokes, mixed in every so often (shown in gold)
const FEE_TAUNTS = [
  'STEM OPT? $70,000!!', 'STEM OPT 70,000$ !!', 'H-1B? $100,000!!', 'GOLD CARD $5,000,000!',
  'VISA FEE? DOUBLED!', 'OPT EXTENSION? $$$!', 'WANT TO STAY? PAY UP!', 'GREEN CARD? $1,000,000!',
  'I-485 FEE? $50,000!', 'VISA STAMP $9,999!', 'PLATINUM CARD $10M!', 'CAP-GAP? $$$$!',
  'EAD CARD? $25,000!', 'LOTTERY TICKET $1,000!', 'RFE FEE! $30,000!', 'BIOMETRICS? $5,000!',
  'PREMIUM PROCESSING $$$!', 'F-1 VISA? $80,000!', 'INTERVIEW FEE $12,345!', 'TAX THE GRADS! $$$!'
];
// Per-stage lines: DOWNTOWN, GOLF CLUB, SILICON VALLEY
const STAGE_TAUNTS = [
  ['MY CITY! MY CARD!', 'MY TOWER IS TALLER!', 'TAXI! FOLLOW HIM!', 'SECURITY! ANYONE?!'],
  ['GET OFF MY GREEN!', 'FORE!! STOP HIM!', 'I SHOT A 62 TODAY!', 'MEMBERS ONLY!', 'CADDIE! CATCH HIM!'],
  ['NO SPONSORSHIP!', 'LOTTERY SAYS NO!', 'NOT HIRING! FAKE!', 'AI WILL REPLACE YOU!', 'YOUR OFFER? REVOKED!', 'RTO 7 DAYS A WEEK!']
];

interface Ob {
  def: ObDef; spr: Phaser.GameObjects.Sprite; x: number; y: number;
  knocked: boolean; vx: number; vy: number; hitDone: boolean; phase: number;
}
interface Pickup { spr: Phaser.GameObjects.Sprite; x: number; y: number; kind: 'coin' | 'burger'; phase: number }

type State = 'play' | 'win' | 'caught' | 'result';

export class GameScene extends Phaser.Scene {
  // world
  private bd!: Backdrop;
  private state: State = 'play';
  private paused = false;
  private acc = 0;
  private elapsed = 0;
  private dist = 0;
  private speed = SPEED_START;
  private speedMul = 1;
  private dashT = 0;
  private nextSpawn = 0;
  private stage = 0;
  private cpSpawned: boolean[] = [];
  private gateSpawned = false;
  private lastBurger = 0;
  private obs: Ob[] = [];
  private picks: Pickup[] = [];
  private flagSpr?: Phaser.GameObjects.Sprite;
  private flagX = 0;
  private flagHit = false;
  private gateSpr?: Phaser.GameObjects.Image;
  private gateX = 0;
  private cloud = 0;
  // hero
  private hero!: Phaser.GameObjects.Sprite;
  private hanky!: Phaser.GameObjects.Sprite;
  private heroX = HERO_X;
  private hy = GROUND_Y;
  private vy = 0;
  private grounded = true;
  private jumps = 0;
  private jumpBuf = 0;
  private jumpQueued = false;
  private sliding = false;
  private invT = 0;
  private hitT = 0;
  private dustT = 0;
  private flipping = false;
  private hankyFree = false;
  private inGate = false;
  // chaser
  private boss!: Phaser.GameObjects.Sprite;
  private gap = GAP_START;
  private bossX = 0;
  private bossLock = false;
  private tauntT = 4;
  private lastTaunt = '';
  private bubble?: Phaser.GameObjects.Container;
  // scoring
  private coins = 0;
  private bonus = 0;
  // input
  private keySlide: Phaser.Input.Keyboard.Key[] = [];
  private touchSlide = new Set<number>();
  private bot = false;
  private god = false;
  // ui
  private scoreText!: Phaser.GameObjects.BitmapText;
  private coinText!: Phaser.GameObjects.BitmapText;
  private progHero!: Phaser.GameObjects.Image;
  private gapFill!: Phaser.GameObjects.Image;
  private dangerText!: Phaser.GameObjects.BitmapText;
  private vignette!: Phaser.GameObjects.Image;
  private muteBtn!: Phaser.GameObjects.Container;
  private touchJump?: Phaser.GameObjects.Container;
  private touchSlideBtn?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Container;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars!: Phaser.GameObjects.Particles.ParticleEmitter;
  private confetti!: Phaser.GameObjects.Particles.ParticleEmitter;
  private onVis = () => { if (document.hidden && this.state === 'play' && !this.paused) this.setPaused(true); };

  constructor() { super('Game'); }

  /** Everything is (re)initialised here so a restart is a completely fresh run. */
  create(): void {
    const q = new URLSearchParams(location.search);
    this.bot = q.get('bot') === '1';
    this.god = q.get('god') === '1';
    const startT = Math.max(0, Math.min(RUN_TIME - 5, Number(q.get('t')) || 0));

    this.state = 'play';
    this.paused = false;
    this.acc = 0;
    this.elapsed = startT;
    this.dist = 0;
    this.speedMul = 1;
    this.dashT = 0;
    this.nextSpawn = 220;
    this.stage = CHECKPOINTS.filter((c) => c <= startT).length;
    this.cpSpawned = CHECKPOINTS.map((c) => c <= startT);
    this.gateSpawned = false;
    this.lastBurger = startT;
    this.obs = [];
    this.picks = [];
    this.flagSpr = undefined;
    this.gateSpr = undefined;
    this.cloud = 0;
    this.heroX = HERO_X;
    this.hy = GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.jumps = 0;
    this.jumpBuf = 0;
    this.jumpQueued = false;
    this.sliding = false;
    this.invT = 0;
    this.hitT = 0;
    this.dustT = 0;
    this.flipping = false;
    this.hankyFree = false;
    this.inGate = false;
    this.gap = GAP_START;
    this.bossX = this.bossTarget();
    this.bossLock = false;
    this.tauntT = 1.2;
    this.bubble = undefined;
    this.coins = 0;
    this.bonus = 0;
    this.touchSlide = new Set();
    this.overlay = undefined;
    this.speed = this.baseSpeed();

    this.bd = new Backdrop(this, this.stage);

    this.boss = this.add.sprite(this.bossX, GROUND_Y, 'chaser').setOrigin(0.5, 1).setDepth(8).play('chaser_run');
    this.hanky = this.add.sprite(0, 0, 'hanky').setOrigin(...HANKY_ORIGIN).setDepth(9).play('hanky_flap');
    this.hero = this.add.sprite(HERO_X, GROUND_Y - 14, 'hero').setDepth(10).play('hero_run');

    this.dust = this.add.particles(0, 0, 'dust', {
      lifespan: 380, speedX: { min: -90, max: -40 }, speedY: { min: -26, max: -6 },
      alpha: { start: 0.9, end: 0 }, scale: { start: 1, end: 0.4 }, emitting: false
    }).setDepth(9);
    this.sparks = this.add.particles(0, 0, 'spark', {
      lifespan: 420, speed: { min: 40, max: 110 }, alpha: { start: 1, end: 0 }, emitting: false
    }).setDepth(20);
    this.stars = this.add.particles(0, 0, 'star', {
      lifespan: 600, speed: { min: 60, max: 140 }, angle: { min: 200, max: 340 }, gravityY: 300,
      alpha: { start: 1, end: 0 }, rotate: { min: 0, max: 360 }, emitting: false
    }).setDepth(20);
    this.confetti = this.add.particles(0, 0, 'confetti', {
      lifespan: 2600, speedX: { min: -60, max: 60 }, speedY: { min: 20, max: 80 }, gravityY: 40,
      rotate: { min: 0, max: 360 }, tint: [PAL.green, PAL.greenL, PAL.gold, PAL.white, PAL.red],
      x: { min: 0, max: W }, y: -6, frequency: 18, quantity: 2, emitting: false
    }).setDepth(40);

    this.buildHud();
    this.setupInput();

    document.addEventListener('visibilitychange', this.onVis);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.onVis);
      this.anims.resumeAll();
      sfx.musicStop();
    });

    sfx.musicStart('game');
    this.cameras.main.fadeIn(200);
    const go = this.add.image(W / 2, 110, logoImage(this, 'RUN!', 4, [PAL.goldL, PAL.gold, PAL.goldD])).setDepth(60).setScale(0.2);
    this.tweens.add({ targets: go, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: go, alpha: 0, y: 90, delay: 700, duration: 300, onComplete: () => go.destroy() });
  }

  /* ================================================================ INPUT */

  private setupInput(): void {
    const kb = this.input.keyboard!;
    kb.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');
    this.keySlide = [kb.addKey('DOWN'), kb.addKey('S')];
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return; // holding a key never auto-repeats a jump
      switch (e.code) {
        case 'Space': case 'ArrowUp': case 'KeyW':
          if (this.state === 'play' && !this.paused) this.jumpQueued = true;
          break;
        case 'KeyP': case 'Escape':
          if (this.state === 'play') this.setPaused(!this.paused);
          break;
        case 'KeyM': this.toggleMute(); break;
      }
    });

    const touch = this.sys.game.device.input.touch;
    if (touch) this.buildTouchButtons();

    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0 || this.state !== 'play' || this.paused) return;
      if (p.y < 28) return; // HUD strip
      if (p.x < W / 2) {
        this.touchSlide.add(p.id);
        this.touchSlideBtn?.setAlpha(0.95);
      } else {
        this.jumpQueued = true;
        if (this.touchJump) { this.touchJump.setAlpha(0.95); this.time.delayedCall(120, () => this.touchJump?.setAlpha(0.55)); }
      }
    });
    const release = (p: Phaser.Input.Pointer) => {
      this.touchSlide.delete(p.id);
      if (this.touchSlide.size === 0) this.touchSlideBtn?.setAlpha(0.55);
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('gameout', () => this.touchSlide.clear());
  }

  private buildTouchButtons(): void {
    const mk = (x: number, icon: string, label: string) => {
      const bg = this.add.image(0, 0, panelKey(this, 64, 40, 'touch'));
      const ic = this.add.image(0, -5, icon);
      const t = txt(this, 0, 9, label, { origin: [0.5, 0.5] });
      return this.add.container(x, H - 24, [bg, ic, t]).setDepth(70).setAlpha(0.55);
    };
    this.touchSlideBtn = mk(40, 'icon_down', 'SLIDE');
    this.touchJump = mk(W - 40, 'icon_up', 'JUMP');
  }

  private get slideHeld(): boolean {
    if (this.bot) return this.botSlide();
    return this.touchSlide.size > 0 || this.keySlide.some((k) => k.isDown);
  }

  private toggleMute(): void {
    const m = sfx.toggleMute();
    (this.muteBtn.getData('icon') as Phaser.GameObjects.Image).setTexture(m ? 'icon_mute' : 'icon_sound');
  }

  /* ================================================================== HUD */

  private buildHud(): void {
    const D = 50;
    this.add.image(0, 0, 'pixel').setOrigin(0, 0).setDisplaySize(W, 25).setTint(PAL.out).setAlpha(0.45).setDepth(D - 1);
    this.scoreText = txt(this, 6, 3, 'SCORE 000000', { depth: D });
    this.add.image(10, 18, 'coin', 0).setDepth(D);
    this.coinText = txt(this, 18, 14, 'X 000', { depth: D, tint: PAL.goldL });

    // progress to the departure gate
    const px0 = 150, px1 = 300;
    this.add.image(px0, 12, 'pixel').setOrigin(0, 0.5).setDisplaySize(px1 - px0, 4).setTint(PAL.grayDD).setDepth(D);
    this.add.image(px0, 11, 'pixel').setOrigin(0, 0.5).setDisplaySize(px1 - px0, 1).setTint(PAL.grayD).setDepth(D);
    for (const c of CHECKPOINTS) {
      const x = px0 + (c / RUN_TIME) * (px1 - px0);
      this.add.image(x, 12, 'pixel').setDisplaySize(2, 8).setTint(PAL.white).setDepth(D);
    }
    this.add.image(px1 + 8, 12, 'icon_goal').setDepth(D);
    this.progHero = this.add.image(px0, 11, 'icon_hero').setDepth(D + 1);

    // chase distance meter
    this.add.image(336, 12, 'icon_chaser').setDepth(D + 1);
    this.add.image(346, 12, panelKey(this, 64, 12, 'touch')).setOrigin(0, 0.5).setDepth(D);
    this.gapFill = this.add.image(349, 12, 'pixel').setOrigin(0, 0.5).setDisplaySize(10, 4).setDepth(D + 1);
    this.dangerText = txt(this, 378, 26, 'DANGER!', { origin: [0.5, 0], tint: PAL.red, depth: D }).setVisible(false);

    iconButton(this, W - 38, 12, 'icon_pause', () => { if (this.state === 'play') this.setPaused(!this.paused); }).setDepth(D + 2);
    this.muteBtn = iconButton(this, W - 14, 12, sfx.muted ? 'icon_mute' : 'icon_sound', () => this.toggleMute()).setDepth(D + 2);

    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0, 0).setScale(2).setDepth(45).setAlpha(0);
  }

  private updateHud(): void {
    const score = this.score();
    this.scoreText.setText(`SCORE ${String(score).padStart(6, '0')}`);
    this.coinText.setText(`X ${String(this.coins).padStart(3, '0')}`);
    const p = Phaser.Math.Clamp(this.elapsed / RUN_TIME, 0, 1);
    this.progHero.x = Math.round(150 + p * 150);
    const g = Phaser.Math.Clamp(this.gap / GAP_MAX, 0, 1);
    this.gapFill.setDisplaySize(Math.max(1, Math.round(58 * g)), 4);
    this.gapFill.setTint(g > 0.5 ? PAL.green : g > 0.25 ? PAL.gold : PAL.red);
    const danger = this.state === 'play' && this.gap < 28;
    const pulse = 0.5 + 0.5 * Math.sin(this.time.now / 110);
    this.dangerText.setVisible(danger && pulse > 0.3);
    this.vignette.setAlpha(danger ? (0.35 + 0.35 * pulse) * (1 - this.gap / 28) + 0.1 : Math.max(0, this.vignette.alpha - 0.05));
  }

  private score(): number {
    return Math.floor(this.dist / PX_PER_METER) + this.coins * 10 + this.bonus;
  }

  /* ================================================================ LOOP */

  update(_time: number, delta: number): void {
    if (this.paused) return;
    this.acc += Math.min(delta / 1000, 0.1);
    while (this.acc >= STEP) {
      this.step(STEP);
      this.acc -= STEP;
    }
    this.render();
    this.updateHud();
  }

  private baseSpeed(): number {
    const p = Phaser.Math.Clamp(this.elapsed / RUN_TIME, 0, 1);
    return SPEED_START + (SPEED_END - SPEED_START) * (p * 0.7 + p * p * 0.3);
  }

  private bossTarget(): number { return HERO_X - 30 - this.gap * 0.6; }

  private step(dt: number): void {
    const playing = this.state === 'play';
    if (playing) {
      this.elapsed += dt;
      this.speedMul = Math.min(1, this.speedMul + dt * 0.55);
      this.dashT = Math.max(0, this.dashT - dt);
      this.speed = this.baseSpeed() * this.speedMul * (this.dashT > 0 ? 1.15 : 1);

      const p = this.elapsed / RUN_TIME;
      this.gap += (1.5 - 0.6 * p) * dt;
      if (this.speedMul < 1) this.gap -= (1 - this.speedMul) * 16 * dt;
      this.gap = Phaser.Math.Clamp(this.gap, 0, GAP_MAX);
      if (this.gap <= 0 && !this.god) { this.caught(); }

      CHECKPOINTS.forEach((c, i) => {
        if (!this.cpSpawned[i] && this.elapsed >= c) { this.cpSpawned[i] = true; this.spawnFlag(); }
      });
      if (!this.gateSpawned && this.elapsed >= RUN_TIME - 3.4) this.spawnGate();
      if (!this.gateSpawned && this.dist >= this.nextSpawn && this.elapsed < RUN_TIME - 4.6) this.spawnPattern();

      this.tauntT -= dt;
      if (this.tauntT <= 0) this.taunt(this.pickTaunt(), false);
    } else {
      this.speed = Math.max(0, this.speed - 420 * dt);
      if (this.state === 'win' && !this.inGate) {
        this.heroX += 170 * dt;
        if (this.heroX >= this.gateX - 2) this.enterGate();
      }
    }

    const dx = this.speed * dt;
    this.dist += playing ? dx : 0;
    this.cloud += dt * 6;
    this.bd.update(dx, this.cloud);

    this.stepHero(dt);
    this.stepWorld(dt, dx);

    if (!this.bossLock) {
      const tx = this.bossTarget();
      this.bossX += (tx - this.bossX) * Math.min(1, dt * 3);
    }
  }

  /* ================================================================ HERO */

  private stepHero(dt: number): void {
    this.invT = Math.max(0, this.invT - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    if (this.state !== 'play') { this.jumpQueued = false; }
    if (this.bot && this.state === 'play') this.botThink();

    if (this.jumpQueued) { this.jumpQueued = false; this.tryJump(); }

    const wantSlide = this.state === 'play' && this.slideHeld;
    if (!this.grounded) {
      this.vy += GRAVITY * dt;
      if (wantSlide && this.vy > -100) this.vy += FAST_FALL * dt;
      this.hy += this.vy * dt;
      if (this.hy >= GROUND_Y) {
        this.hy = GROUND_Y;
        this.vy = 0;
        this.grounded = true;
        this.jumps = 0;
        this.dust.emitParticleAt(this.heroX - 2, GROUND_Y - 2, 4);
        if (this.jumpBuf > 0 && this.state === 'play') { this.jumpBuf = 0; this.tryJump(); }
      }
    }
    const wasSliding = this.sliding;
    this.sliding = this.grounded && wantSlide;
    if (this.sliding && !wasSliding) { sfx.slide(); this.dust.emitParticleAt(this.heroX + 4, GROUND_Y - 2, 5); }

    if (this.grounded && this.state === 'play') {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = this.sliding ? 0.04 : 0.09;
        this.dust.emitParticleAt(this.heroX - 3, GROUND_Y - 2, 1);
      }
    }
  }

  private tryJump(): void {
    if (this.grounded) {
      this.vy = -JUMP_V;
      this.grounded = false;
      this.jumps = 1;
      sfx.jump();
      this.dust.emitParticleAt(this.heroX, GROUND_Y - 2, 4);
    } else if (this.jumps < 2) {
      this.vy = -DOUBLE_JUMP_V;
      this.jumps = 2;
      sfx.doubleJump();
      this.sparks.emitParticleAt(this.heroX, this.hy - 4, 6);
      this.flipping = true;
      this.hero.angle = 0;
      this.tweens.add({ targets: this.hero, angle: 360, duration: 380, onComplete: () => { this.hero.angle = 0; this.flipping = false; } });
    } else {
      this.jumpBuf = 0.14; // remember the press for a landing jump
    }
  }

  /** Hitbox slightly smaller than the sprite to avoid unfair hits. */
  private heroBox(): { l: number; r: number; t: number; b: number } {
    if (this.sliding) return { l: this.heroX - 7, r: this.heroX + 8, t: this.hy - 9, b: this.hy - 1 };
    return { l: this.heroX - 4, r: this.heroX + 5, t: this.hy - 19, b: this.hy - 1 };
  }

  /* =============================================================== WORLD */

  private spawnOb(name: string, x: number): Ob {
    const def = OBS[name];
    const y = GROUND_Y - (def.lift ?? 0);
    const spr = this.add.sprite(x, y, def.key).setOrigin(0.5, 1).setDepth(def.type === 'over' ? 12 : 7);
    if (def.anim) spr.play(def.anim);
    const ob: Ob = { def, spr, x, y, knocked: false, vx: 0, vy: 0, hitDone: false, phase: Math.random() * 6 };
    this.obs.push(ob);
    return ob;
  }

  private spawnPick(kind: 'coin' | 'burger', x: number, yAbove: number): void {
    const y = GROUND_Y - yAbove;
    const spr = this.add.sprite(x, y, kind === 'coin' ? 'coin' : 'burger').setDepth(6);
    if (kind === 'coin') spr.play({ key: 'coin_spin', startFrame: Math.floor(Math.random() * 4) });
    this.picks.push({ spr, x, y, kind, phase: Math.random() * 6 });
  }

  private coinLine(x: number, n: number, yAbove: number, gap = 14): void {
    for (let i = 0; i < n; i++) this.spawnPick('coin', x + i * gap, yAbove);
  }

  /** Coins following the real jump arc centred on x. */
  private coinArc(cx: number, n: number, jumpV = JUMP_V): void {
    const tAir = (2 * jumpV) / GRAVITY;
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * tAir * 0.84 + tAir * 0.08;
      const h = jumpV * t - 0.5 * GRAVITY * t * t;
      this.spawnPick('coin', cx + (t - tAir / 2) * this.speed, 10 + h);
    }
  }

  private spawnPattern(): void {
    const pool = STAGE_POOLS[this.stage];
    const d = Phaser.Math.Clamp(this.elapsed / RUN_TIME, 0, 1);
    const x0 = W + 40;
    const pick = (t: ObType) => Phaser.Utils.Array.GetRandom(pool[t]) as string;
    const weights: [string, number][] = [
      ['low', 0.3], ['tall', d > 0.08 ? 0.13 : 0], ['over', 0.18], ['air', d > 0.05 ? 0.13 : 0],
      ['double', d > 0.22 ? 0.14 : 0], ['combo', d > 0.42 ? 0.12 : 0], ['coins', 0.1]
    ];
    let r = Math.random() * weights.reduce((a, w) => a + w[1], 0);
    let kind = 'low';
    for (const [k, w] of weights) { if ((r -= w) <= 0) { kind = k; break; } }

    let len = 0;
    switch (kind) {
      case 'low': {
        const ob = this.spawnOb(pick('low'), x0);
        if (Math.random() < 0.65) this.coinArc(ob.x, 6);
        len = ob.def.hb[0];
        break;
      }
      case 'tall': {
        this.spawnOb(pick('tall'), x0);
        if (Math.random() < 0.6) this.coinArc(x0, 7);
        len = 24;
        break;
      }
      case 'over': {
        const ob = this.spawnOb(pick('over'), x0);
        const w = ob.spr.width;
        this.coinLine(x0 - w / 2 - 6, Math.ceil(w / 14) + 2, 6);
        len = w;
        break;
      }
      case 'air': {
        const name = pick('air');
        const ob = this.spawnOb(name, x0);
        if (name === 'drone' && Math.random() < 0.5) {
          ob.y = GROUND_Y - 42 - Math.random() * 6; // high drone: run under, coins on the floor
          ob.spr.y = ob.y;
          this.coinLine(x0 - 20, 4, 8);
        } else {
          this.coinLine(x0 - 20, 4, 6);
        }
        len = 30;
        break;
      }
      case 'double': {
        const a = this.spawnOb(pick('low'), x0);
        const sp = this.speed * (0.66 + Math.random() * 0.1);
        this.spawnOb(pick('low'), x0 + sp);
        this.spawnPick('coin', x0 + sp / 2, 12);
        len = sp + a.def.hb[0];
        break;
      }
      case 'combo': {
        this.spawnOb(pick('low'), x0);
        const sp = this.speed * 0.9;
        const ob = this.spawnOb(pick('over'), x0 + sp);
        this.coinLine(x0 + sp - 20, 4, 6);
        len = sp + ob.spr.width;
        break;
      }
      default: {
        const n = 8;
        const wave = Math.random() < 0.5;
        for (let i = 0; i < n; i++) this.spawnPick('coin', x0 + i * 14, wave ? 14 + Math.sin(i / 1.3) * 10 : 10);
        len = n * 14;
        if (this.elapsed - this.lastBurger > 13) {
          this.lastBurger = this.elapsed;
          this.spawnPick('burger', x0 + len + 30, 52);
          len += 40;
        }
      }
    }
    const gapT = 1.3 - 0.5 * d + Math.random() * 0.35;
    this.nextSpawn = this.dist + len + this.speed * gapT;
  }

  private spawnFlag(): void {
    this.flagX = W + 30;
    this.flagHit = false;
    this.flagSpr?.destroy();
    this.flagSpr = this.add.sprite(this.flagX, GROUND_Y, 'flag').setOrigin(0.15, 1).setDepth(6).play('flag_wave');
    this.nextSpawn = Math.max(this.nextSpawn, this.dist + this.speed * 1.7);
  }

  private spawnGate(): void {
    this.gateSpawned = true;
    this.gateX = W + 60;
    this.gateSpr = this.add.image(this.gateX, GROUND_Y, 'gate').setOrigin(0.5, 1).setDepth(5);
  }

  private stepWorld(dt: number, dx: number): void {
    const hb = this.heroBox();
    for (let i = this.obs.length - 1; i >= 0; i--) {
      const o = this.obs[i];
      if (o.knocked) {
        o.x += o.vx * dt - dx * 0.3;
        o.vy += 700 * dt;
        o.y += o.vy * dt;
        o.spr.angle += 540 * dt;
        o.spr.alpha = Math.max(0, o.spr.alpha - dt * 1.2);
      } else {
        o.x -= dx + (o.def.extraV ?? 0) * dt * (this.state === 'play' ? 1 : 0);
        if (o.def.type === 'air') { o.phase += dt * 6; o.spr.y = o.y + Math.round(Math.sin(o.phase) * 1.5); }
        // collision
        if (this.state === 'play' && !o.hitDone && this.invT <= 0) {
          const w = o.def.hb[0] / 2;
          const bottom = o.y - 2;
          const top = bottom - o.def.hb[1];
          if (hb.r > o.x - w && hb.l < o.x + w && hb.b > top && hb.t < bottom) {
            o.hitDone = true;
            this.onHit(o);
          }
        }
        // the chaser bulldozes everything behind the hero
        if (!o.knocked && o.x < this.bossX + 12 && this.bossX > -20 && o.def.type !== 'over') this.knock(o, true);
      }
      o.spr.x = Math.round(o.x);
      if (o.knocked || o.def.type !== 'air') o.spr.y = Math.round(o.y);
      if (o.x < -80 || o.y > H + 60 || o.spr.alpha <= 0) { o.spr.destroy(); this.obs.splice(i, 1); }
    }

    for (let i = this.picks.length - 1; i >= 0; i--) {
      const p = this.picks[i];
      p.x -= dx;
      p.phase += dt * 4;
      const yy = p.kind === 'burger' ? p.y + Math.sin(p.phase) * 3 : p.y;
      p.spr.setPosition(Math.round(p.x), Math.round(yy));
      const r = p.kind === 'burger' ? 9 : 6;
      if (this.state === 'play' && hb.r + 3 > p.x - r && hb.l - 3 < p.x + r && hb.b + 2 > yy - r && hb.t - 3 < yy + r) {
        this.collect(p);
        this.picks.splice(i, 1);
        continue;
      }
      if (p.x < -20) { p.spr.destroy(); this.picks.splice(i, 1); }
    }

    if (this.flagSpr) {
      this.flagX -= dx;
      this.flagSpr.x = Math.round(this.flagX);
      if (!this.flagHit && this.flagX <= this.heroX) { this.flagHit = true; this.checkpoint(); }
      if (this.flagX < -40) { this.flagSpr.destroy(); this.flagSpr = undefined; }
    }

    if (this.gateSpr) {
      this.gateX -= dx;
      if (this.state === 'play' && this.gateX <= this.heroX + 150) this.win();
      this.gateSpr.x = Math.round(this.gateX);
    }
  }

  private knock(o: Ob, byBoss: boolean): void {
    o.knocked = true;
    o.vx = byBoss ? -40 : 90;
    o.vy = -260;
    if (byBoss && this.bossX > 0) { sfx.knock(); this.stars.emitParticleAt(o.x, o.y - 10, 2); }
  }

  private onHit(o: Ob): void {
    if (this.god) { this.knock(o, false); return; }
    this.gap -= GAP_HIT;
    this.invT = 1.3;
    this.hitT = 0.35;
    this.speedMul = 0.55;
    sfx.hit();
    this.cameras.main.shake(160, 0.012);
    this.stars.emitParticleAt(this.heroX + 6, this.hy - 14, 6);
    this.popText(this.heroX, this.hy - 34, 'OUCH!', PAL.red);
    if (o.def.type !== 'over') this.knock(o, false);
    if (this.gap <= 0) this.caught();
  }

  private collect(p: Pickup): void {
    if (p.kind === 'coin') {
      this.coins++;
      sfx.coin();
      this.sparks.emitParticleAt(p.x, p.y, 5);
      this.popText(p.x, p.y - 8, '+10', PAL.goldL);
      this.tweens.add({ targets: this.coinText, scale: 1.25, duration: 70, yoyo: true });
    } else {
      this.bonus += 50;
      this.gap = Math.min(GAP_MAX, this.gap + GAP_BURGER);
      this.dashT = 1.6;
      this.invT = Math.max(this.invT, 1.6);
      sfx.burger();
      this.sparks.emitParticleAt(p.x, p.y, 14);
      this.popText(p.x, p.y - 12, 'BURGER BOOST! +50', PAL.greenL);
      this.taunt('MY BURGER!!');
    }
    p.spr.destroy();
  }

  private popText(x: number, y: number, s: string, tint: number): void {
    const t = txt(this, Math.round(x), Math.round(y), s, { origin: [0.5, 0.5], tint, depth: 30 });
    this.tweens.add({ targets: t, y: y - 16, alpha: 0, duration: 650, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }

  private pickTaunt(): string {
    const r = Math.random();
    const pool = r < 0.4 ? FEE_TAUNTS : r < 0.65 ? STAGE_TAUNTS[this.stage] : TAUNTS;
    let line = Phaser.Utils.Array.GetRandom(pool) as string;
    if (line === this.lastTaunt) line = Phaser.Utils.Array.GetRandom(pool) as string;
    this.lastTaunt = line;
    return line;
  }

  /** Show a speech bubble. Lines chain back-to-back so Trump never stops talking. */
  private taunt(s: string, loud = true): void {
    if (this.bossX < 4) return;
    this.bubble?.destroy();
    const w = s.length * 6 + 10;
    const bg = this.add.image(0, 0, bubbleKey(this, w)).setOrigin(0, 0);
    const money = s.includes('$');
    const t = txt(this, w / 2, 3, s, { origin: [0.5, 0], tint: money ? PAL.goldD : PAL.red });
    this.bubble = this.add.container(0, 0, [bg, t]).setDepth(25);
    this.bubble.setScale(0.8);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 120, ease: 'Back.out' });
    // grunt only now and then, so the non-stop chatter doesn't get noisy
    if (loud || Math.random() < 0.3) sfx.shout();
    const dur = 1.7 + s.length * 0.05 + (money ? 0.5 : 0);
    this.tauntT = dur; // next line replaces this one right as it ends → no gaps
    const b = this.bubble;
    this.time.delayedCall(dur * 1000 + 300, () => { if (this.bubble === b) { b.destroy(); this.bubble = undefined; } });
  }

  /* ============================================================ EVENTS */

  private checkpoint(): void {
    const idx = Math.min(2, this.stage + 1);
    this.stage = idx;
    this.bd.setStage(idx);
    this.bonus += 200;
    this.gap = Math.min(GAP_MAX, this.gap + GAP_CHECKPOINT);
    sfx.checkpoint();
    this.sparks.emitParticleAt(this.heroX, this.hy - 30, 16);
    const a = this.add.image(W / 2, 74, logoImage(this, 'CHECKPOINT!', 2, [PAL.goldL, PAL.gold, PAL.goldD])).setDepth(60).setScale(0, 1);
    const b = txt(this, W / 2, 96, `NOW ENTERING: ${STAGE_NAMES[idx]}  +200`, { origin: [0.5, 0.5], depth: 60, tint: PAL.white });
    this.tweens.add({ targets: a, scaleX: 1, duration: 240, ease: 'Back.out' });
    this.tweens.add({ targets: [a, b], alpha: 0, delay: 1600, duration: 400, onComplete: () => { a.destroy(); b.destroy(); } });
  }

  private win(): void {
    this.state = 'win';
    this.bonus += 1000;
    sfx.musicStop();
    sfx.win();
    this.bubble?.destroy();
    this.bossLock = true;
    this.boss.play('chaser_stomp');
    this.time.delayedCall(700, () => this.taunt('SAD! VERY SAD!'));
  }

  /** Hero dashes into the tech office with the green card → YOU'RE HIRED! */
  private enterGate(): void {
    this.inGate = true;
    this.hankyFree = true;
    this.tweens.add({ targets: [this.hero, this.hanky], alpha: 0, duration: 160 });
    this.sparks.emitParticleAt(this.gateX, GROUND_Y - 30, 20);
    const st = this.add.image(this.gateX, GROUND_Y - 80, logoImage(this, 'APPROVED', 2, [0xff9a9a, PAL.red, PAL.redD])).setDepth(59).setAngle(-12).setScale(3).setAlpha(0);
    this.tweens.add({ targets: st, scale: 1, alpha: 1, duration: 220, ease: 'Back.out' });
    this.confetti.start();
    const f = this.add.image(W / 2, -30, logoImage(this, "YOU'RE HIRED!", 4, [PAL.greenL, PAL.green, PAL.greenD])).setDepth(60);
    this.tweens.add({ targets: f, y: 70, duration: 700, ease: 'Bounce.out' });
    this.time.delayedCall(2300, () => { f.destroy(); this.showResult(true); });
  }

  private caught(): void {
    if (this.state !== 'play') return;
    this.state = 'caught';
    this.gap = 0;
    sfx.musicStop();
    sfx.lose();
    this.bossLock = true;
    this.boss.stop().setFrame(8);
    this.tweens.add({ targets: this, bossX: this.heroX - 14, duration: 240, ease: 'Quad.out' });
    this.time.delayedCall(240, () => {
      this.cameras.main.shake(200, 0.015);
      this.hankyFree = true;
      this.tweens.add({ targets: this.hanky, x: this.bossX + 14, y: GROUND_Y - 36, duration: 260 });
      this.tweens.add({ targets: this, hy: GROUND_Y - 34, duration: 260, yoyo: true, ease: 'Quad.out' });
      this.tweens.add({ targets: this.hero, angle: -30, duration: 260 });
      this.boss.setFrame(9);
      this.taunt('MINE! BIGLY!');
      const f = this.add.image(W / 2, 80, logoImage(this, 'BUSTED!', 5, [0xff9a9a, PAL.red, PAL.redD])).setDepth(60).setScale(3).setAlpha(0);
      this.tweens.add({ targets: f, scale: 1, alpha: 1, duration: 300, ease: 'Back.out' });
      this.time.delayedCall(1800, () => { f.destroy(); this.showResult(false); });
    });
  }

  /* ============================================================ RENDER */

  private render(): void {
    this.hero.x = Math.round(this.heroX);
    this.hero.y = Math.round(this.hy - 14);
    let frame = -1;
    if (this.state === 'caught' || this.hitT > 0) frame = 7;
    else if (!this.grounded) frame = this.vy < 0 ? 4 : 5;
    else if (this.sliding) frame = 6;
    if (frame >= 0) { this.hero.anims.stop(); this.hero.setFrame(frame); }
    else {
      if (!this.hero.anims.isPlaying) this.hero.play('hero_run');
      this.hero.anims.timeScale = this.speed / 170;
    }
    if (this.state === 'play' || this.state === 'win') {
      this.hero.setVisible(this.invT <= 0 || Math.floor(this.invT * 14) % 2 === 0 || this.dashT > 0);
      this.hero.setTint(this.dashT > 0 && Math.floor(this.dashT * 10) % 2 === 0 ? 0xa7f070 : 0xffffff);
    }

    if (!this.hankyFree) {
      const f = Number(this.hero.frame.name);
      const h = HERO_HAND[f] ?? HERO_HAND[0];
      const ox = h.x - 11, oy = h.y - 14;
      const a = Phaser.Math.DegToRad(this.hero.angle);
      this.hanky.setPosition(
        Math.round(this.hero.x + ox * Math.cos(a) - oy * Math.sin(a)),
        Math.round(this.hero.y + ox * Math.sin(a) + oy * Math.cos(a))
      );
      this.hanky.setVisible(this.hero.visible);
      this.hanky.anims.timeScale = this.speed / 150;
    }

    this.boss.x = Math.round(this.bossX);
    if (this.state === 'play') this.boss.anims.timeScale = Math.max(0.6, this.speed / 170) * (this.gap < 28 ? 1.3 : 1);
    if (this.bubble) this.bubble.setPosition(Math.max(4, Math.round(this.bossX + 6)), GROUND_Y - 62);
    if (this.flipping === false && this.hero.angle !== 0 && this.state === 'play') this.hero.angle = 0;
  }

  /* ========================================================= OVERLAYS */

  private setPaused(p: boolean): void {
    if (this.state !== 'play' || p === this.paused) return;
    this.paused = p;
    if (p) {
      this.tweens.pauseAll();
      this.anims.pauseAll();
      this.time.paused = true;
      [this.dust, this.sparks, this.stars].forEach((e) => e.pause());
      sfx.musicStop();
      this.touchSlide.clear();
      const c = this.add.container(0, 0).setDepth(100);
      const dim = this.add.image(0, 0, 'pixel').setOrigin(0, 0).setDisplaySize(W, H).setTint(0x000000).setAlpha(0.55);
      const panel = this.add.image(W / 2, H / 2, panelKey(this, 180, 130));
      const title = txt(this, W / 2, H / 2 - 46, 'PAUSED', { origin: [0.5, 0.5], scale: 2, tint: PAL.gold });
      const resume = new PixelButton(this, W / 2, H / 2 - 12, 'RESUME (P)', 120, () => this.setPaused(false));
      const restart = new PixelButton(this, W / 2, H / 2 + 14, 'RESTART', 120, () => this.restart());
      const title2 = new PixelButton(this, W / 2, H / 2 + 40, 'TITLE', 120, () => this.toTitle());
      c.add([dim, panel, title, resume, restart, title2]);
      this.overlay = c;
    } else {
      this.overlay?.destroy();
      this.overlay = undefined;
      this.tweens.resumeAll();
      this.anims.resumeAll();
      this.time.paused = false;
      [this.dust, this.sparks, this.stars].forEach((e) => e.resume());
      this.acc = 0;
      sfx.musicStart();
    }
  }

  private restart(): void {
    this.anims.resumeAll();
    this.tweens.resumeAll();
    this.time.paused = false;
    this.scene.restart();
  }

  private toTitle(): void {
    this.anims.resumeAll();
    this.time.paused = false;
    this.scene.start('Title');
  }

  private showResult(won: boolean): void {
    this.state = 'result';
    this.confetti.stop();
    const score = this.score();
    const isBest = store.submit(score);
    const best = store.getBest();
    const D = 100;
    const c = this.add.container(0, 0).setDepth(D);
    const dim = this.add.image(0, 0, 'pixel').setOrigin(0, 0).setDisplaySize(W, H).setTint(0x000000).setAlpha(0.5);
    const pw = 220, ph = 176;
    const panel = this.add.image(W / 2, H / 2 + 4, panelKey(this, pw, ph));
    const head = this.add.image(W / 2, H / 2 - 64, won
      ? logoImage(this, 'HIRED!', 3, [PAL.greenL, PAL.green, PAL.greenD])
      : logoImage(this, 'BUSTED!', 3, [0xff9a9a, PAL.red, PAL.redD]));
    const sub = txt(this, W / 2, H / 2 - 40, won ? 'WELCOME TO THE AMERICAN DREAM!' : 'HE GOT HIS GREEN CARD BACK...', { origin: [0.5, 0.5], tint: PAL.gray });
    const L = W / 2 - 84, R = W / 2 + 84;
    const rows: [string, string, number][] = [
      ['DISTANCE', `${Math.floor(this.dist / PX_PER_METER)} M`, PAL.white],
      ['COINS', `${this.coins} X 10`, PAL.goldL],
      ['BONUS', `${this.bonus}`, PAL.greenL],
      ['SCORE', `${score}`, PAL.gold],
      ['BEST', `${best}`, PAL.sky]
    ];
    const items: Phaser.GameObjects.GameObject[] = [dim, panel, head, sub];
    rows.forEach(([k, v, tint], i) => {
      const y = H / 2 - 24 + i * 12;
      items.push(txt(this, L, y, k, { tint: PAL.gray }));
      items.push(txt(this, R, y, v, { origin: [1, 0], tint }));
    });
    if (isBest && score > 0) {
      const nb = txt(this, W / 2, H / 2 + 38, '*** NEW BEST! ***', { origin: [0.5, 0.5], tint: PAL.gold });
      this.tweens.add({ targets: nb, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
      items.push(nb);
    }
    const retry = new PixelButton(this, W / 2 - 50, H / 2 + 62, 'RETRY', 88, () => this.restart());
    const title = new PixelButton(this, W / 2 + 50, H / 2 + 62, 'TITLE', 88, () => this.toTitle());
    items.push(retry, title);
    c.add(items);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 250 });
    const hint = txt(this, W / 2, H - 12, 'SPACE / ENTER: RETRY    ESC: TITLE', { origin: [0.5, 0.5], tint: PAL.gray, depth: D + 1 });
    c.add(hint);

    this.time.delayedCall(450, () => {
      this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
        if (e.repeat || this.state !== 'result') return;
        if (['Space', 'Enter', 'KeyR'].includes(e.code)) this.restart();
        else if (['Escape', 'KeyT'].includes(e.code)) this.toTitle();
      });
    });
  }

  /* ========================================================= TEST BOT */

  private botThink(): void {
    for (const o of this.obs) {
      if (o.knocked || o.hitDone) continue;
      const ahead = o.x - this.heroX;
      const t = o.def.type;
      const lowAir = t === 'air' && GROUND_Y - o.y < 30;
      if ((t === 'low' || t === 'tall') && this.grounded) {
        const lead = this.speed * 0.3 + o.def.hb[0] / 2;
        if (ahead > 0 && ahead < lead) this.jumpQueued = true;
      }
      if (t === 'air' && !lowAir) continue;
    }
  }

  private botSlide(): boolean {
    return this.obs.some((o) => {
      if (o.knocked) return false;
      const t = o.def.type;
      const low = t === 'over' || (t === 'air' && GROUND_Y - o.y < 30);
      const ahead = o.x - this.heroX;
      const w = o.def.hb[0] / 2 + 10;
      return low && ahead < w + this.speed * 0.2 + (o.def.extraV ?? 0) * 0.2 && ahead > -w;
    });
  }
}
