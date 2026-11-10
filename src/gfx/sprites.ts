import Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';
import { stampText, textWidth } from './font';
import { PAL } from '../constants';

const O = PAL.out;

/** Register a horizontal strip of frames as one texture with numeric frames. */
export function addSheet(scene: Phaser.Scene, key: string, frames: PixelCanvas[]): void {
  const fw = frames[0].w;
  const fh = frames[0].h;
  const sheet = new PixelCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => sheet.blit(f, i * fw, 0));
  const tex = scene.textures.addCanvas(key, sheet.toCanvas())!;
  frames.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
}

export function addImage(scene: Phaser.Scene, key: string, pc: PixelCanvas): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pc.toCanvas());
}

/* ------------------------------------------------------------------ HERO */

const HC = {
  skin: 0xf4c49a, skinS: 0xd8946a, mouth: 0x7a2a2a,
  beanie: 0xb13e53, beanieL: 0xe0606a, pom: 0xf4f4f4,
  mask: O, eye: 0xffffff,
  stripeW: 0xeef0f4, stripeK: 0x3a3f58,
  pants: 0x3b5dc9, pantsS: 0x29408f,
  shoe: 0x29366f, shoeS: 0x1f2547
};

interface HeroPose {
  legF: number; legB: number; raiseF?: number; raiseB?: number;
  armF: number; armB: number; bob?: number; mouth?: boolean; dizzy?: boolean;
}

function heroArm(c: PixelCanvas, s: number, b: number, back: boolean): void {
  const sleeve = back ? HC.stripeK : HC.stripeW;
  const hand = back ? HC.skinS : HC.skin;
  switch (s) {
    case -1: c.rect(6, 13 + b, 2, 2, sleeve); c.rect(4, 15 + b, 2, 2, hand); break;
    case 0: c.rect(10, 13 + b, 2, 3, sleeve); c.rect(10, 16 + b, 2, 2, hand); break;
    case 1: c.rect(13, 13 + b, 2, 2, sleeve); c.rect(15, 13 + b, 2, 2, hand); break;
    case 2: c.rect(13, 11 + b, 2, 2, sleeve); c.rect(14, 9 + b, 2, 2, hand); break;
    case 3: c.rect(6, 11 + b, 2, 2, sleeve); c.rect(4, 9 + b, 2, 2, hand); break;
  }
}

function heroLeg(c: PixelCanvas, off: number, raise: number, back: boolean): void {
  const p = back ? HC.pantsS : HC.pants;
  const s = back ? HC.shoeS : HC.shoe;
  c.rect(10 + off, 20, 3, 5 - raise, p);
  c.rect(10 + off, 25 - raise, 4, 2, s);
}

function heroUpright(o: HeroPose): PixelCanvas {
  const c = new PixelCanvas(22, 28);
  const b = o.bob ?? 0;
  heroLeg(c, o.legB, o.raiseB ?? 0, true);
  heroArm(c, o.armB, b, true);
  c.rect(9, 19 + b, 5, 2, HC.pants);
  for (let y = 12; y <= 18; y++) c.hline(8, y + b, 6, y % 2 === 0 ? HC.stripeW : HC.stripeK);
  // head
  c.rect(7, 6 + b, 8, 6, HC.skin);
  c.vline(7, 6 + b, 6, HC.skinS);
  c.set(15, 9 + b, HC.skin);
  c.set(15, 10 + b, HC.skinS);
  c.set(9, 9 + b, HC.skinS);
  c.rect(9, 7 + b, 7, 2, HC.mask);
  if (o.dizzy) {
    c.set(11, 7 + b, HC.eye); c.set(12, 8 + b, HC.eye);
    c.set(14, 7 + b, HC.eye); c.set(13, 8 + b, HC.eye);
  } else {
    c.set(11, 8 + b, HC.eye); c.set(14, 8 + b, HC.eye);
  }
  if (o.mouth) c.rect(12, 10 + b, 2, 2, HC.mouth); else c.hline(12, 10 + b, 2, HC.skinS);
  // beanie
  c.hline(8, 2 + b, 6, HC.beanie);
  c.rect(7, 3 + b, 8, 3, HC.beanie);
  c.hline(6, 5 + b, 10, HC.beanieL);
  c.rect(5, 1 + b, 2, 2, HC.pom);
  heroLeg(c, o.legF, o.raiseF ?? 0, false);
  heroArm(c, o.armF, b, false);
  return c.outline(O);
}

function heroSlide(): PixelCanvas {
  const c = new PixelCanvas(22, 28);
  // raised arm holding the hanky
  c.rect(10, 18, 2, 3, HC.stripeK);
  c.rect(10, 16, 2, 2, HC.skinS);
  // torso (lying back)
  for (let y = 21; y <= 25; y++) c.hline(9, y, 7, y % 2 === 0 ? HC.stripeW : HC.stripeK);
  // legs forward + shoes toes up
  c.rect(16, 23, 4, 3, HC.pants);
  c.rect(19, 21, 2, 5, HC.shoe);
  // head
  c.rect(3, 19, 7, 6, HC.skin);
  c.vline(3, 19, 6, HC.skinS);
  c.rect(5, 20, 5, 2, HC.mask);
  c.set(6, 21, HC.eye); c.set(9, 21, HC.eye);
  c.set(10, 22, HC.skin);
  c.hline(7, 23, 2, HC.skinS);
  c.rect(3, 16, 7, 3, HC.beanie);
  c.hline(2, 18, 9, HC.beanieL);
  c.rect(1, 15, 2, 2, HC.pom);
  // front arm on ground
  c.rect(13, 20, 3, 2, HC.stripeW);
  c.rect(15, 19, 2, 2, HC.skin);
  return c.outline(O);
}

/** Frame index → back-hand position (where the hanky is held). */
export const HERO_HAND: { x: number; y: number }[] = [];

export function buildHero(scene: Phaser.Scene): void {
  const poses: (HeroPose | 'slide')[] = [
    { legF: 3, legB: -3, armF: -1, armB: -1 },               // 0 run
    { legF: 1, legB: -1, raiseF: 2, armF: 0, armB: -1, bob: -1 }, // 1 run
    { legF: -3, legB: 3, armF: 1, armB: -1 },                   // 2 run
    { legF: -1, legB: 1, raiseB: 2, armF: 0, armB: -1, bob: -1 }, // 3 run
    { legF: 2, legB: -2, raiseF: 3, raiseB: 1, armF: 2, armB: 3 }, // 4 jump
    { legF: 1, legB: -2, armF: 1, armB: -1, mouth: true },          // 5 fall
    'slide',                                                        // 6 slide
    { legF: 1, legB: -1, raiseF: 2, armF: 2, armB: 3, mouth: true, dizzy: true }, // 7 hit
    { legF: 1, legB: -1, armF: 0, armB: -1 },                       // 8 stand
    { legF: 2, legB: -2, armF: 1, armB: -1, bob: 1 }                // 9 sneak
  ];
  const frames = poses.map((p) => (p === 'slide' ? heroSlide() : heroUpright(p)));
  HERO_HAND.length = 0;
  poses.forEach((p) => {
    if (p === 'slide') HERO_HAND.push({ x: 10, y: 16 });
    else if (p.armB === 3) HERO_HAND.push({ x: 4, y: 9 + (p.bob ?? 0) });
    else HERO_HAND.push({ x: 4, y: 15 + (p.bob ?? 0) });
  });
  addSheet(scene, 'hero', frames);
}

/* --------------------------------------------------------------- CHASER */

const TC = {
  hair: 0xf5d547, hairL: 0xfff3a0, hairS: 0xc89b2a,
  face: 0xf29a52, faceS: 0xd27434, faceL: 0xf9d3a8,
  suit: 0x223064, suitL: 0x34478a, suitS: 0x161f45,
  shirt: 0xf4f4f4, tie: 0xd8282b, tieS: 0x9e1a20,
  shoe: 0x141414, mouth: 0x6b1a1a, tongue: 0xff8a8a
};

interface ChaserPose {
  legF: number; legB: number; raiseF?: number; raiseB?: number;
  armF: 'point' | 'down' | 'up' | 'fwd'; armB: 'back' | 'up' | 'fwd' | 'down';
  bob?: number; mouth: 0 | 1 | 2; pocket?: boolean; brows?: boolean;
}

function chaser(o: ChaserPose): PixelCanvas {
  const c = new PixelCanvas(34, 42);
  const b = o.bob ?? 0;
  const leg = (off: number, raise: number, back: boolean) => {
    c.rect(12 + off, 30, 5, 8 - raise, back ? TC.suitS : TC.suit);
    c.rect(12 + off, 38 - raise, 7, 3, TC.shoe);
    c.hline(13 + off, 38 - raise, 4, 0x3a3a3a);
  };
  leg(o.legB, o.raiseB ?? 0, true);
  // back arm
  switch (o.armB) {
    case 'back': c.rect(6, 18 + b, 3, 7, TC.suitS); c.rect(5, 25 + b, 3, 2, TC.faceS); break;
    case 'up': c.rect(7, 11 + b, 3, 7, TC.suitS); c.rect(7, 8 + b, 3, 3, TC.faceS); break;
    case 'fwd': c.rect(21, 20 + b, 6, 3, TC.suitS); c.rect(27, 20 + b, 3, 3, TC.faceS); break;
    case 'down': c.rect(8, 18 + b, 3, 8, TC.suitS); c.rect(8, 26 + b, 3, 2, TC.faceS); break;
  }
  // body
  c.rect(9, 17 + b, 15, 13, TC.suit);
  c.vline(24, 20 + b, 7, TC.suit);
  c.hline(9, 29 + b, 15, TC.suitS);
  c.rect(15, 17 + b, 5, 3, TC.shirt);
  c.rect(16, 20 + b, 3, 1, TC.shirt);
  c.vline(14, 17 + b, 6, TC.suitL);
  c.vline(20, 17 + b, 6, TC.suitL);
  // extra long tie
  c.rect(16, 17 + b, 3, 2, TC.tie);
  c.rect(16, 19 + b, 3, 10, TC.tie);
  c.rect(15, 28 + b, 5, 4, TC.tie);
  c.vline(18, 19 + b, 12, TC.tieS);
  if (o.pocket) { c.rect(11, 19 + b, 3, 2, PAL.green); c.set(11, 18 + b, PAL.greenL); c.set(13, 18 + b, PAL.greenL); }
  // face
  c.rect(12, 7 + b, 10, 9, TC.face);
  c.rect(22, 9 + b, 2, 4, TC.face);
  c.set(23, 12 + b, TC.faceS);
  c.rect(16, 9 + b, 6, 2, TC.faceL);
  c.set(17, 10 + b, O); c.set(20, 10 + b, O);
  if (o.brows) { c.set(16, 8 + b, TC.hairS); c.set(17, 8 + b, TC.hairS); c.set(18, 9 + b, TC.hairS); c.set(19, 9 + b, TC.hairS); c.set(20, 8 + b, TC.hairS); c.set(21, 8 + b, TC.hairS); }
  else { c.hline(16, 8 + b, 3, TC.hairS); c.hline(19, 8 + b, 3, TC.hairS); }
  c.rect(12, 12 + b, 3, 4, TC.faceS);
  c.hline(13, 16 + b, 8, TC.faceS);
  if (o.mouth === 0) { c.rect(19, 13 + b, 2, 1, TC.mouth); }
  else if (o.mouth === 1) { c.rect(18, 13 + b, 3, 2, TC.mouth); c.set(19, 14 + b, TC.tongue); }
  else { c.rect(17, 12 + b, 5, 3, TC.mouth); c.hline(18, 14 + b, 3, TC.tongue); c.hline(17, 12 + b, 5, TC.shirt); }
  // the famous swoop
  c.rect(10, 3 + b, 13, 4, TC.hair);
  c.rect(20, 5 + b, 6, 3, TC.hair);
  c.set(26, 6 + b, TC.hair);
  c.rect(9, 6 + b, 3, 7, TC.hair);
  c.hline(12, 3 + b, 9, TC.hairL);
  c.hline(14, 4 + b, 5, TC.hairL);
  c.hline(21, 7 + b, 5, TC.hairS);
  c.vline(9, 9 + b, 4, TC.hairS);
  c.hline(11, 2 + b, 8, TC.hair);
  leg(o.legF, o.raiseF ?? 0, false);
  // front arm
  switch (o.armF) {
    case 'point': c.rect(21, 18 + b, 6, 3, TC.suit); c.vline(27, 18 + b, 3, TC.shirt); c.rect(28, 18 + b, 3, 3, TC.face); c.hline(31, 18 + b, 2, TC.face); break;
    case 'fwd': c.rect(21, 19 + b, 6, 3, TC.suit); c.vline(27, 19 + b, 3, TC.shirt); c.rect(28, 19 + b, 3, 3, TC.face); break;
    case 'down': c.rect(20, 18 + b, 3, 8, TC.suit); c.rect(20, 26 + b, 3, 2, TC.face); break;
    case 'up': c.rect(21, 12 + b, 3, 7, TC.suit); c.hline(21, 11 + b, 3, TC.shirt); c.rect(21, 8 + b, 3, 3, TC.face); break;
  }
  return c.outline(O);
}

export function buildChaser(scene: Phaser.Scene): void {
  const poses: ChaserPose[] = [
    { legF: 4, legB: -4, armF: 'point', armB: 'back', mouth: 2, brows: true },                 // 0 run
    { legF: 1, legB: -1, raiseF: 3, armF: 'point', armB: 'down', bob: -1, mouth: 1, brows: true }, // 1
    { legF: -4, legB: 4, armF: 'point', armB: 'fwd', mouth: 2, brows: true },                  // 2
    { legF: -1, legB: 1, raiseB: 3, armF: 'point', armB: 'down', bob: -1, mouth: 1, brows: true }, // 3
    { legF: 1, legB: -1, armF: 'up', armB: 'down', mouth: 1, pocket: true },                    // 4 speech
    { legF: 1, legB: -1, armF: 'down', armB: 'down', mouth: 0, pocket: true },                  // 5 idle
    { legF: 1, legB: -1, raiseF: 2, armF: 'up', armB: 'up', mouth: 2, bob: -1 },                // 6 shocked
    { legF: 2, legB: -2, raiseF: 4, armF: 'up', armB: 'up', mouth: 2, brows: true },            // 7 stomp
    { legF: 3, legB: -3, armF: 'fwd', armB: 'fwd', mouth: 2, brows: true },                     // 8 grab
    { legF: 1, legB: -1, armF: 'up', armB: 'down', mouth: 1, brows: false }                    // 9 gloat (no pocket)
  ];
  addSheet(scene, 'chaser', poses.map(chaser));
}

/* ------------------------------------------------------------ GREEN CARD */

/** Where the hero's hand grips the card (right edge), as a sprite origin. */
export const HANKY_ORIGIN: [number, number] = [22 / 27, 8 / 19];

/** A proper-looking US "green card": flag, photo, text lines, gold seal, glowing rim. */
export function hankyFrame(f: number): PixelCanvas {
  const card = new PixelCanvas(27, 19);
  const bx = 3, by = 3, cw = 20, ch = 13;
  card.rect(bx, by, cw, ch, PAL.green);
  card.hline(bx, by, cw, PAL.greenL);
  card.hline(bx, by + ch - 1, cw, PAL.greenD);
  card.vline(bx + cw - 1, by, ch, PAL.greenD);
  // header band with tiny "text"
  card.rect(bx, by + 1, cw, 3, 0x1f7a45);
  for (let x = bx + 8; x < bx + cw - 1; x += 2) card.set(x, by + 2, PAL.white);
  // mini US flag
  card.rect(bx + 1, by + 1, 6, 3, PAL.white);
  card.hline(bx + 1, by + 1, 6, PAL.red); card.hline(bx + 1, by + 3, 6, PAL.red);
  card.rect(bx + 1, by + 1, 2, 2, PAL.blue);
  // photo
  card.rect(bx + 1, by + 5, 6, 7, 0xf4e4c1);
  card.rect(bx + 2, by + 7, 4, 4, 0xf4c49a);
  card.hline(bx + 2, by + 6, 4, 0x3a2a20);
  card.set(bx + 3, by + 8, O); card.set(bx + 5, by + 8, O);
  card.hline(bx + 2, by + 11, 4, PAL.blue);
  // text lines
  card.hline(bx + 9, by + 6, 9, PAL.white);
  card.hline(bx + 9, by + 8, 6, PAL.white);
  card.hline(bx + 9, by + 10, 5, PAL.greenL);
  // gold seal
  card.rect(bx + 16, by + 9, 3, 3, PAL.gold); card.set(bx + 17, by + 10, PAL.goldL);
  // moving shine stripe
  const sx = [-9, bx + 4, bx + 12][f];
  for (let y = by; y < by + ch; y++) {
    const x = sx + (by + ch - y) / 2;
    for (const xx of [Math.floor(x), Math.floor(x) + 1]) {
      if (xx >= bx && xx < bx + cw && card.get(xx, y) !== -1) card.set(xx, y, 0xe8ffe0);
    }
  }
  const out = card;
  out.outline(O);
  out.outline(f === 2 ? PAL.white : PAL.greenL); // glowing rim so it pops on any background
  return out;
}

export function buildHanky(scene: Phaser.Scene): void {
  addSheet(scene, 'hanky', [0, 1, 2].map((f) => hankyFrame(f)));
  // icon: mini card
  const ic = new PixelCanvas(14, 10);
  ic.rect(1, 1, 12, 8, PAL.green).hline(1, 1, 12, PAL.greenL).hline(1, 8, 12, PAL.greenD);
  ic.rect(2, 3, 3, 4, 0xf4e4c1).hline(7, 4, 5, PAL.white).hline(7, 6, 4, PAL.white);
  addImage(scene, 'hanky_icon', ic.outline(O));
}

/* ------------------------------------------------------------ OBSTACLES */

function cone(): PixelCanvas {
  const c = new PixelCanvas(16, 19);
  for (let y = 2; y <= 14; y++) {
    const half = Math.round(1 + (y - 2) * 0.42);
    const col = (y >= 6 && y <= 7) || (y >= 11 && y <= 12) ? PAL.white : PAL.orange;
    c.hline(8 - half, y, half * 2, col);
    c.set(8 - half, y, col === PAL.white ? 0xc8ccd8 : 0xffa070);
  }
  c.rect(1, 15, 14, 2, PAL.grayDD);
  c.hline(1, 15, 14, PAL.grayD);
  return c.outline(O);
}

function hydrant(): PixelCanvas {
  const c = new PixelCanvas(16, 20);
  c.rect(5, 6, 6, 11, PAL.red);
  c.vline(6, 6, 11, 0xff6a5a);
  c.vline(10, 6, 11, PAL.redD);
  c.rect(4, 4, 8, 2, PAL.red);
  c.rect(6, 2, 4, 2, PAL.redD);
  c.set(7, 1, PAL.redD); c.set(8, 1, PAL.redD);
  c.rect(2, 9, 3, 3, PAL.redD);
  c.rect(11, 9, 3, 3, PAL.redD);
  c.rect(4, 16, 8, 2, PAL.redD);
  c.set(8, 10, PAL.goldL);
  return c.outline(O);
}

function crate(c: PixelCanvas, x: number, y: number, w: number, h: number, wood: number, dark: number): void {
  c.rect(x, y, w, h, wood);
  c.hline(x, y, w, 0xe0a070);
  for (let yy = y + 5; yy < y + h; yy += 5) c.hline(x, yy, w, dark);
  c.vline(x, y, h, dark); c.vline(x + w - 1, y, h, dark);
  for (let i = 0; i < Math.min(w, h); i++) c.set(x + i, y + h - 1 - Math.floor(i * (h / w)), dark);
}

function crates(): PixelCanvas {
  const c = new PixelCanvas(24, 50);
  crate(c, 2, 25, 20, 23, 0xb86f50, 0x743f39);
  crate(c, 3, 3, 18, 22, 0xc28569, 0x743f39);
  c.rect(6, 11, 12, 5, 0xf4e4c1);
  c.hline(7, 13, 10, PAL.red);
  return c.outline(O);
}

function hangingSign(text: string, fill: number, border: number, ink: number, rope: number): PixelCanvas {
  const tw = textWidth(text);
  const w = tw + 14;
  const c = new PixelCanvas(w + 2, 232);
  c.vline(6, 0, 216, rope);
  c.vline(w - 5, 0, 216, rope);
  c.rect(1, 213, w, 17, border);
  c.rect(3, 215, w - 4, 13, fill);
  c.hline(3, 215, w - 4, 0xffffff & (fill + 0x202020));
  stampText(c, 8, 218, text, ink);
  c.set(6, 214, PAL.goldL); c.set(w - 5, 214, PAL.goldL);
  return c.outline(O);
}

function drone(f: number): PixelCanvas {
  const c = new PixelCanvas(24, 14);
  c.hline(3, 4, 18, PAL.grayDD);
  if (f === 0) { c.hline(0, 2, 8, PAL.gray); c.hline(16, 2, 8, PAL.gray); }
  else { c.hline(2, 2, 3, PAL.gray); c.hline(19, 2, 3, PAL.gray); }
  c.vline(4, 3, 2, PAL.grayD); c.vline(19, 3, 2, PAL.grayD);
  c.rect(7, 4, 10, 5, PAL.white);
  c.hline(7, 8, 10, PAL.gray);
  c.rect(9, 9, 6, 3, PAL.grayDD);
  c.set(11, 10, PAL.sky);
  c.set(15, 5, f === 0 ? PAL.red : 0xff9090);
  return c.outline(O);
}

function golfBag(): PixelCanvas {
  const c = new PixelCanvas(16, 26);
  c.rect(4, 2, 2, 8, PAL.gray); c.rect(3, 1, 3, 2, PAL.white);
  c.rect(7, 1, 2, 9, PAL.gray); c.rect(7, 0, 3, 2, PAL.grayD);
  c.rect(10, 3, 2, 7, PAL.gray); c.rect(10, 2, 3, 2, PAL.white);
  c.rect(3, 9, 10, 15, 0x2e7d4f);
  c.vline(4, 9, 15, 0x4aa86a);
  c.hline(3, 9, 10, PAL.goldD);
  c.rect(3, 15, 10, 2, PAL.gold);
  c.rect(3, 22, 10, 2, 0x1d5034);
  c.vline(12, 10, 10, PAL.grayDD);
  return c.outline(O);
}

function golfCart(): PixelCanvas {
  const c = new PixelCanvas(38, 28);
  c.rect(3, 2, 30, 3, 0x2e7d4f);
  c.hline(3, 2, 30, 0x4aa86a);
  c.vline(6, 5, 10, PAL.grayD); c.vline(29, 5, 10, PAL.grayD);
  c.rect(8, 9, 10, 5, 0x8a5a3a);
  c.rect(2, 14, 34, 8, PAL.white);
  c.hline(2, 21, 34, 0xc8ccd8);
  c.rect(30, 12, 6, 3, PAL.white);
  c.hline(20, 16, 10, PAL.goldD);
  c.ellipse(9.5, 23.5, 4, 4, PAL.grayDD); c.rect(8, 22, 3, 3, PAL.gray);
  c.ellipse(28.5, 23.5, 4, 4, PAL.grayDD); c.rect(27, 22, 3, 3, PAL.gray);
  c.set(35, 16, PAL.goldL);
  return c.outline(O);
}

function golfBall(): PixelCanvas {
  const c = new PixelCanvas(10, 10);
  c.ellipse(5, 5, 4, 4, PAL.white);
  c.set(3, 4, 0xc8ccd8); c.set(6, 3, 0xc8ccd8); c.set(5, 6, 0xc8ccd8); c.set(7, 6, 0xc8ccd8);
  return c.outline(O);
}

/** Stack of immigration paperwork. */
function paperStack(): PixelCanvas {
  const c = new PixelCanvas(20, 16);
  const sheets: [number, number][] = [[2, 12], [1, 10], [3, 8], [2, 6], [1, 4], [3, 2]];
  for (const [x, y] of sheets) {
    c.rect(x, y, 16, 2, 0xf4f4f4);
    c.hline(x, y + 1, 16, 0xc8ccd8);
    c.set(x + 3, y, 0x94a0b4); c.set(x + 9, y, 0x94a0b4);
  }
  c.rect(4, 0, 12, 2, 0xf4e4c1);
  c.rect(14, 1, 3, 3, PAL.red); // red "DENIED" tab
  return c.outline(O);
}

/** Blinking server rack (tech office). */
function serverRack(): PixelCanvas {
  const c = new PixelCanvas(22, 46);
  c.rect(1, 1, 20, 44, PAL.grayDD);
  c.vline(1, 1, 44, PAL.grayD); c.hline(1, 1, 20, PAL.grayD);
  for (let y = 4; y < 42; y += 6) {
    c.rect(3, y, 16, 4, 0x1f2547);
    c.hline(3, y, 16, PAL.grayD);
    c.set(5, y + 2, PAL.greenL); c.set(7, y + 2, y % 12 === 4 ? PAL.gold : PAL.green);
    for (let x = 10; x < 18; x += 2) c.set(x, y + 2, 0x566c86);
  }
  c.rect(2, 44, 4, 2, O); c.rect(16, 44, 4, 2, O);
  return c.outline(O);
}

function scooter(): PixelCanvas {
  const c = new PixelCanvas(26, 24);
  c.ellipse(4, 19, 3.5, 3.5, O); c.ellipse(4, 19, 2, 2, PAL.gray);
  c.ellipse(21, 19, 3.5, 3.5, O); c.ellipse(21, 19, 2, 2, PAL.gray);
  c.rect(4, 17, 16, 3, PAL.greenD); c.hline(4, 17, 16, PAL.green);
  for (let y = 2; y < 18; y++) c.set(20 - Math.floor((y - 2) / 8), y, PAL.grayDD);
  for (let y = 2; y < 18; y++) c.set(21 - Math.floor((y - 2) / 8), y, PAL.grayD);
  c.rect(15, 1, 8, 2, PAL.grayDD);
  c.rect(16, 6, 3, 2, PAL.goldL);
  return c.outline(O);
}

function coin(f: number): PixelCanvas {
  const c = new PixelCanvas(12, 12);
  const rx = [4.6, 3.2, 1.2, 3.2][f];
  if (f === 2) { c.rect(5, 1, 2, 10, PAL.goldD); c.vline(5, 1, 10, PAL.gold); }
  else {
    c.ellipse(6, 6, rx, 4.6, PAL.goldD);
    c.ellipse(6, 6, rx - 0.9, 3.7, PAL.gold);
    if (f === 0) { c.vline(6, 4, 4, PAL.goldD); c.hline(5, 4, 3, PAL.goldD); c.hline(5, 7, 3, PAL.goldD); c.set(4, 3, PAL.goldL); }
    else c.vline(6, 4, 4, PAL.goldD);
    c.set(Math.round(6 - rx + 1.5), 3, PAL.goldL);
  }
  return c.outline(O);
}

function burger(): PixelCanvas {
  const c = new PixelCanvas(18, 15);
  c.ellipse(9, 5, 7.5, 4, 0xe39a3b);
  c.rect(2, 5, 15, 2, 0xe39a3b);
  c.set(5, 3, PAL.white); c.set(9, 2, PAL.white); c.set(12, 3, PAL.white); c.set(7, 4, PAL.white); c.set(14, 5, PAL.white);
  c.hline(1, 7, 16, PAL.greenL);
  c.set(2, 8, PAL.greenL); c.set(8, 8, PAL.greenL); c.set(14, 8, PAL.greenL);
  c.rect(2, 8, 14, 1, PAL.gold);
  c.set(5, 9, PAL.gold); c.set(11, 9, PAL.gold);
  c.rect(2, 9, 14, 2, 0x6a3a2a);
  c.rect(2, 11, 14, 2, 0xd88a3a);
  c.hline(3, 12, 12, 0xb06a2a);
  return c.outline(O);
}

function flag(f: number): PixelCanvas {
  const c = new PixelCanvas(26, 58);
  c.vline(3, 3, 52, PAL.gray); c.vline(4, 3, 52, PAL.grayD);
  c.rect(2, 1, 4, 3, PAL.gold);
  c.rect(0, 54, 9, 3, PAL.grayDD);
  for (let x = 0; x < 18; x++) {
    const off = Math.round(Math.sin(x * 0.45 + f * 2.5) * 1.5 * (x / 18));
    for (let y = 0; y < 12; y++) {
      const chk = ((x >> 2) + (y >> 2)) % 2 === 0;
      c.set(6 + x, 4 + y + off, chk ? PAL.white : PAL.out);
    }
  }
  return c.outline(O);
}

function gate(): PixelCanvas {
  const c = new PixelCanvas(104, 126);
  const steel = PAL.grayD;
  // building wall
  c.rect(2, 24, 100, 100, 0xc8ccd8);
  c.rect(2, 24, 100, 4, PAL.gray);
  // door frame + glass
  c.rect(26, 44, 52, 80, steel);
  c.rect(30, 48, 44, 76, 0x2b3a67);
  for (let y = 48; y < 124; y++) for (let x = 30; x < 74; x++) {
    if ((x + y) % 23 < 2) c.set(x, y, 0x5a7ad0);
  }
  c.vline(51, 48, 76, steel); c.vline(52, 48, 76, steel);
  // bright light inside (freedom!)
  c.rect(34, 60, 36, 64, 0xfff2a0);
  c.rect(38, 64, 28, 60, 0xffffff);
  // sign
  c.rect(0, 0, 104, 22, 0x1f2547);
  c.rect(2, 2, 100, 18, 0x29366f);
  stampText(c, 22, 7, 'NOW HIRING', PAL.greenL);
  // briefcase icon
  c.rect(5, 8, 11, 8, 0xa86f48); c.hline(5, 8, 11, 0xd09a6a); c.rect(8, 6, 5, 2, 0x6a4028); c.hline(5, 11, 11, 0x6a4028);
  // green exit light
  c.rect(42, 34, 20, 6, PAL.green); c.hline(42, 34, 20, PAL.greenL);
  c.rect(46, 36, 3, 2, PAL.white); c.rect(51, 36, 3, 2, PAL.white); c.rect(56, 36, 3, 2, PAL.white);
  // potted plants
  c.rect(8, 112, 10, 12, PAL.redD); c.ellipse(13, 106, 7, 8, PAL.green); c.ellipse(11, 104, 3, 3, PAL.greenL);
  c.rect(86, 112, 10, 12, PAL.redD); c.ellipse(91, 106, 7, 8, PAL.green); c.ellipse(89, 104, 3, 3, PAL.greenL);
  return c.outline(O);
}

function plane(): PixelCanvas {
  const c = new PixelCanvas(70, 28);
  c.rect(6, 12, 56, 8, PAL.white);
  c.ellipse(62, 16, 6, 4, PAL.white);
  c.hline(6, 18, 58, 0xc8ccd8);
  c.hline(8, 15, 50, PAL.green);
  c.rect(4, 2, 8, 12, PAL.green); c.rect(2, 2, 4, 3, PAL.green);
  for (let x = 16; x < 56; x += 4) c.set(x, 13, 0x29366f);
  c.rect(61, 13, 4, 2, 0x29366f);
  c.rect(26, 19, 18, 3, PAL.grayD);
  c.rect(30, 22, 8, 3, PAL.grayDD);
  return c.outline(O);
}

function podium(): PixelCanvas {
  const c = new PixelCanvas(30, 34);
  c.rect(3, 4, 24, 28, 0x8a5a3a);
  c.rect(1, 2, 28, 4, 0xa86f48);
  c.hline(1, 2, 28, 0xd09a6a);
  c.vline(5, 6, 26, 0xa86f48);
  c.vline(24, 6, 26, 0x6a4028);
  c.ellipse(15, 17, 7, 7, PAL.goldD);
  c.ellipse(15, 17, 5.5, 5.5, PAL.gold);
  stampText(c, 13, 14, '*', PAL.goldD);
  c.rect(14, 0, 2, 3, PAL.grayDD); c.rect(13, 0, 4, 1, PAL.gray);
  return c.outline(O);
}

/* --------------------------------------------------------------- EFFECTS */

function fx(scene: Phaser.Scene): void {
  const dust = new PixelCanvas(5, 5);
  dust.rect(1, 0, 3, 5, 0xe8e0d0).rect(0, 1, 5, 3, 0xe8e0d0).set(1, 1, 0xffffff);
  addImage(scene, 'dust', dust);
  const sp = new PixelCanvas(5, 5);
  sp.vline(2, 0, 5, PAL.goldL).hline(0, 2, 5, PAL.goldL).set(2, 2, 0xffffff);
  addImage(scene, 'spark', sp);
  const star = new PixelCanvas(9, 9);
  star.map(0, 0, ['....w....', '....w....', '...www...', 'wwwwwwwww', '..wwwww..', '..ww.ww..', '.ww...ww.', '.w.....w.', '.........'], { w: PAL.white });
  addImage(scene, 'star', star.outline(O));
  const px = new PixelCanvas(3, 3);
  px.rect(0, 0, 3, 3, 0xffffff);
  addImage(scene, 'pixel', px);
  const conf = new PixelCanvas(2, 3);
  conf.rect(0, 0, 2, 3, 0xffffff);
  addImage(scene, 'confetti', conf);
}

/* ------------------------------------------------------------------- UI */

function icons(scene: Phaser.Scene): void {
  const head = new PixelCanvas(16, 14);
  head.rect(4, 4, 9, 8, TC.face).rect(5, 6, 6, 2, TC.faceL).set(7, 7, O).set(10, 7, O);
  head.rect(8, 10, 3, 1, TC.mouth);
  head.rect(3, 1, 10, 3, TC.hair).rect(10, 3, 5, 2, TC.hair).hline(5, 1, 6, TC.hairL).rect(2, 3, 2, 5, TC.hair);
  addImage(scene, 'icon_chaser', head.outline(O));

  const hh = new PixelCanvas(12, 12);
  hh.rect(2, 4, 8, 6, HC.skin).rect(3, 5, 7, 2, O).set(5, 6, 0xffffff).set(8, 6, 0xffffff);
  hh.rect(2, 1, 8, 3, HC.beanie).hline(1, 3, 10, HC.beanieL);
  addImage(scene, 'icon_hero', hh.outline(O));

  const bc = new PixelCanvas(14, 12);
  bc.rect(1, 3, 12, 8, 0xa86f48).hline(1, 3, 12, 0xd09a6a).rect(5, 1, 4, 2, 0x6a4028).hline(1, 6, 12, 0x6a4028).rect(6, 5, 2, 3, PAL.gold);
  addImage(scene, 'icon_goal', bc.outline(O));

  const pause = new PixelCanvas(12, 12);
  pause.rect(3, 2, 2, 8, PAL.white).rect(7, 2, 2, 8, PAL.white);
  addImage(scene, 'icon_pause', pause.outline(O));

  const sOn = new PixelCanvas(14, 12);
  sOn.rect(1, 4, 3, 4, PAL.white).rect(4, 3, 1, 6, PAL.white).rect(5, 2, 1, 8, PAL.white).rect(6, 1, 1, 10, PAL.white);
  sOn.vline(8, 4, 4, PAL.white).vline(10, 2, 8, PAL.white).set(9, 3, PAL.white).set(9, 8, PAL.white);
  addImage(scene, 'icon_sound', sOn.outline(O));
  const sOff = new PixelCanvas(14, 12);
  sOff.rect(1, 4, 3, 4, PAL.white).rect(4, 3, 1, 6, PAL.white).rect(5, 2, 1, 8, PAL.white).rect(6, 1, 1, 10, PAL.white);
  for (let i = 0; i < 5; i++) { sOff.set(8 + i, 3 + i, PAL.red); sOff.set(12 - i, 3 + i, PAL.red); }
  addImage(scene, 'icon_mute', sOff.outline(O));

  const arrow = (down: boolean) => {
    const a = new PixelCanvas(20, 20);
    for (let i = 0; i < 8; i++) a.hline(10 - i - 1, (down ? 16 - i : 3 + i), (i + 1) * 2, PAL.white);
    a.rect(7, down ? 3 : 11, 6, 7, PAL.white);
    return a.outline(O);
  };
  addImage(scene, 'icon_up', arrow(false));
  addImage(scene, 'icon_down', arrow(true));

  // danger vignette
  const v = new PixelCanvas(240, 135);
  for (let y = 0; y < v.h; y++) for (let x = 0; x < v.w; x++) {
    const ex = Math.min(x, v.w - 1 - x) / 28;
    const ey = Math.min(y, v.h - 1 - y) / 20;
    const t = 1 - Math.min(1, Math.min(ex, ey));
    if (t > 0 && ((x + y) & 1) === 0 && Math.random() < t * 1.2) v.set(x, y, 0xd8282b);
  }
  addImage(scene, 'vignette', v);
}

/** Pixel panel with a bevelled border (generated on demand, cached by key). */
export function panelKey(scene: Phaser.Scene, w: number, h: number, style: 'panel' | 'btn' | 'btnHi' | 'bubble' | 'touch' = 'panel'): string {
  const key = `${style}_${w}x${h}`;
  if (scene.textures.exists(key)) return key;
  const c = new PixelCanvas(w, h);
  const sch = {
    panel: [0x29366f, 0x3b5dc9, 0x1f2547, 0xf4f4f4],
    btn: [0x257179, 0x38b764, 0x1d5034, 0xf4f4f4],
    btnHi: [0x38b764, 0xa7f070, 0x257179, 0xffffff],
    bubble: [0xf4f4f4, 0xffffff, 0xc8ccd8, 0xf4f4f4],
    touch: [0x333c57, 0x566c86, 0x1a1c2c, 0x94a0b4]
  }[style];
  const [fill, light, dark, border] = sch;
  c.rect(1, 1, w - 2, h - 2, border);
  c.rect(3, 3, w - 6, h - 6, fill);
  c.hline(3, 3, w - 6, light);
  c.vline(3, 3, h - 6, light);
  c.hline(3, h - 4, w - 6, dark);
  c.vline(w - 4, 3, h - 6, dark);
  c.set(1, 1, -1); c.set(w - 2, 1, -1); c.set(1, h - 2, -1); c.set(w - 2, h - 2, -1);
  c.outline(O);
  addImage(scene, key, c);
  return key;
}

export function bubbleKey(scene: Phaser.Scene, w: number): string {
  const key = `sbubble_${w}`;
  if (scene.textures.exists(key)) return key;
  const h = 15;
  const c = new PixelCanvas(w, h + 5);
  c.rect(1, 1, w - 2, h - 2, PAL.white);
  c.set(1, 1, -1); c.set(w - 2, 1, -1); c.set(1, h - 2, -1); c.set(w - 2, h - 2, -1);
  c.hline(2, h - 3, w - 4, 0xc8ccd8);
  // tail pointing down-left
  c.rect(8, h - 1, 4, 1, PAL.white); c.rect(8, h, 3, 1, PAL.white); c.rect(8, h + 1, 2, 1, PAL.white); c.set(8, h + 2, PAL.white);
  c.outline(O);
  addImage(scene, key, c);
  return key;
}

export function buildSprites(scene: Phaser.Scene): void {
  buildHero(scene);
  buildChaser(scene);
  buildHanky(scene);
  addImage(scene, 'ob_cone', cone());
  addImage(scene, 'ob_hydrant', hydrant());
  addImage(scene, 'ob_crates', crates());
  addImage(scene, 'ob_banner', hangingSign('FAKE NEWS', PAL.red, PAL.gold, PAL.white, 0x4a3a2a));
  addSheet(scene, 'ob_drone', [drone(0), drone(1)]);
  addImage(scene, 'ob_golfbag', golfBag());
  addImage(scene, 'ob_cart', golfCart());
  addImage(scene, 'ob_vip', hangingSign('VIP ONLY', 0x2e7d4f, PAL.gold, PAL.goldL, 0x4a3a2a));
  addImage(scene, 'ob_ball', golfBall());
  addImage(scene, 'ob_paper', paperStack());
  addImage(scene, 'ob_server', serverRack());
  addImage(scene, 'ob_lottery', hangingSign('H-1B LOTTERY', 0x29366f, PAL.gray, PAL.gold, PAL.grayD));
  addImage(scene, 'ob_scooter', scooter());
  addSheet(scene, 'coin', [0, 1, 2, 3].map(coin));
  addImage(scene, 'burger', burger());
  addSheet(scene, 'flag', [flag(0), flag(1)]);
  addImage(scene, 'gate', gate());
  addImage(scene, 'plane', plane());
  addImage(scene, 'podium', podium());
  fx(scene);
  icons(scene);
}
