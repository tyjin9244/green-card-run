import Phaser from 'phaser';
import { PixelCanvas, rng, dither } from './PixelCanvas';
import { addImage } from './sprites';
import { stampText } from './font';
import { GROUND_Y, W, PAL } from '../constants';

const O = PAL.out;

function gradient(c: PixelCanvas, cols: number[], y0: number, h: number): void {
  for (let y = 0; y < h; y++) {
    const t = (y / (h - 1)) * (cols.length - 1);
    const i = Math.min(cols.length - 2, Math.floor(t));
    const f = t - i;
    for (let x = 0; x < c.w; x++) c.set(x, y0 + y, dither(x, y, f) ? cols[i + 1] : cols[i]);
  }
}

function sky(stage: number): PixelCanvas {
  const c = new PixelCanvas(W, GROUND_Y);
  const cols = [
    [0x2b5fc8, 0x41a6f6, 0x73c8f7, 0xb0e8f8],
    [0x3aa0e8, 0x6ccff6, 0x9fe8f4, 0xe0f8e8],
    [0x2f7fd8, 0x5cb4f0, 0x9cdcf4, 0xfbe3a8]
  ][stage];
  gradient(c, cols, 0, GROUND_Y);
  if (stage === 0) {
    c.ellipse(410, 40, 14, 14, 0xfff2a0);
    c.ellipse(410, 40, 11, 11, 0xffffff);
  } else if (stage === 1) {
    c.ellipse(70, 34, 12, 12, 0xffffff);
  } else {
    // big California sun
    c.ellipse(400, 42, 18, 18, 0xfff2a0);
    c.ellipse(400, 42, 14, 14, 0xffffff);
  }
  return c;
}

function clouds(stage: number): PixelCanvas {
  const c = new PixelCanvas(256, 64);
  const r = rng(30 + stage);
  const main = 0xffffff;
  const shade = 0xc8dcf0;
  for (let i = 0; i < 4; i++) {
    const cx = 20 + i * 64 + r() * 20;
    const cy = 18 + r() * 28;
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const ox = cx + (k - n / 2) * 8;
      const rr = 6 + r() * 6;
      c.ellipse(ox, cy + 2, rr, rr * 0.65, shade);
    }
    for (let k = 0; k < n; k++) {
      const ox = cx + (k - n / 2) * 8;
      const rr = 5 + r() * 5;
      c.ellipse(ox, cy, rr, rr * 0.6, main);
    }
  }
  return c;
}

function cityFar(): PixelCanvas {
  const h = 130;
  const c = new PixelCanvas(512, h);
  const r = rng(101);
  let x = 0;
  while (x < 512) {
    let bw = 16 + Math.floor(r() * 26);
    if (x + bw > 512) bw = 512 - x;
    const bh = 30 + Math.floor(r() * 70);
    const col = r() < 0.5 ? 0x5a6fa8 : 0x4e5f96;
    c.rect(x, h - bh, bw, bh, col);
    c.hline(x, h - bh, bw, 0x7088c0);
    for (let wy = h - bh + 4; wy < h - 4; wy += 5) for (let wx = x + 3; wx < x + bw - 2; wx += 4) {
      if (r() < 0.7) c.set(wx, wy, r() < 0.2 ? 0xfff2a0 : 0x8aa6dc);
    }
    x += bw;
  }
  // the gaudy golden tower
  const tx = 220, tw = 34, th = 124;
  c.rect(tx, h - th, tw, th, 0xc9a24b);
  for (let y = h - th + 2; y < h; y += 3) c.hline(tx + 2, y, tw - 4, 0xe8c870);
  c.vline(tx, h - th, th, 0x9a7a30);
  c.rect(tx + 6, h - th - 6, tw - 12, 6, 0xc9a24b);
  c.rect(tx + 15, h - th - 14, 4, 8, 0xe8c870);
  return c;
}

function cityMid(): PixelCanvas {
  const h = 96;
  const c = new PixelCanvas(512, h);
  const r = rng(202);
  const fronts = [0xa05040, 0xd8b890, 0x7a8aa0, 0xc87858, 0x8a6aa0];
  let x = 0;
  while (x < 512) {
    let bw = 48 + Math.floor(r() * 30);
    if (x + bw > 512 - 30) bw = 512 - x;
    const bh = 46 + Math.floor(r() * 40);
    const col = fronts[Math.floor(r() * fronts.length)];
    const top = h - bh;
    c.rect(x, top, bw, bh, col);
    c.rect(x, top, bw, 3, 0xffffff & (col + 0x181818));
    c.hline(x, top + 3, bw, O);
    // windows
    for (let wy = top + 8; wy < h - 26; wy += 12) for (let wx = x + 5; wx < x + bw - 8; wx += 10) {
      c.rect(wx, wy, 6, 7, 0x29366f);
      c.rect(wx + 1, wy + 1, 2, 2, 0x8ab8f0);
      c.hline(wx - 1, wy + 7, 8, 0xe8e0d0);
    }
    // shop front with striped awning
    const aw = r() < 0.5 ? PAL.red : PAL.green;
    for (let i = 0; i < bw - 4; i++) c.rect(x + 2 + i, h - 24, 1, 5, ((i >> 2) & 1) ? aw : PAL.white);
    c.hline(x + 2, h - 19, bw - 4, O);
    c.rect(x + 6, h - 18, bw - 12, 18, 0x333c57);
    c.rect(x + 8, h - 16, bw - 16, 10, 0x6a8ac0);
    c.vline(x, top, bh, O);
    x += bw;
  }
  // street lamps
  for (const lx of [40, 200, 360]) {
    c.rect(lx, h - 40, 2, 40, 0x333c57);
    c.rect(lx - 2, h - 44, 6, 4, 0x333c57);
    c.rect(lx - 1, h - 41, 4, 2, 0xfff2a0);
  }
  return c;
}

function cityGround(): PixelCanvas {
  const c = new PixelCanvas(64, 34);
  c.rect(0, 0, 64, 2, 0xd8dce8);
  c.rect(0, 2, 64, 15, 0xb0b4c0);
  for (let x = 0; x < 64; x += 16) c.vline(x, 2, 15, 0x8a90a0);
  c.hline(0, 9, 64, 0x9aa0b0);
  c.set(5, 5, 0x9aa0b0); c.set(40, 12, 0x9aa0b0); c.set(27, 4, 0xc8ccd8);
  c.rect(0, 17, 64, 3, 0x6a7088);
  c.hline(0, 17, 64, 0x94a0b4);
  c.rect(0, 20, 64, 14, 0x3a3f58);
  const r = rng(5);
  for (let i = 0; i < 30; i++) c.set(Math.floor(r() * 64), 21 + Math.floor(r() * 13), r() < 0.5 ? 0x4a5070 : 0x2e3248);
  c.rect(8, 27, 20, 2, 0xffcd3c);
  return c;
}

function golfFar(): PixelCanvas {
  const h = 110;
  const c = new PixelCanvas(512, h);
  const TAU = Math.PI * 2;
  for (let x = 0; x < 512; x++) {
    const y1 = 38 + Math.sin((x / 512) * TAU * 2) * 10 + Math.sin((x / 512) * TAU * 5) * 4;
    for (let y = Math.floor(y1); y < h; y++) c.set(x, y, dither(x, y, (y - y1) / 60) ? 0x4e9a62 : 0x6cb878);
    const y2 = 64 + Math.sin((x / 512) * TAU * 3 + 1) * 8;
    for (let y = Math.floor(y2); y < h; y++) c.set(x, y, 0x3e8a50);
  }
  // clubhouse
  c.rect(300, 34, 60, 24, 0xf4f0e0);
  for (let i = 0; i < 12; i++) c.hline(296 + i, 34 - i, 68 - i * 2, 0xb84a3a);
  for (let wx = 306; wx < 356; wx += 9) c.rect(wx, 42, 5, 6, 0x5a7ad0);
  c.rect(326, 48, 8, 10, 0x8a5a3a);
  c.vline(330, 6, 18, 0x566c86);
  c.rect(331, 6, 8, 5, PAL.red);
  // trees
  const r = rng(77);
  for (let i = 0; i < 14; i++) {
    const tx = Math.floor(r() * 512);
    if (tx > 285 && tx < 375) continue;
    const ty = 58 + r() * 14;
    c.rect(tx - 1, ty, 3, 10, 0x6a4a30);
    c.ellipse(tx, ty - 4, 7, 8, 0x2e6a40);
    c.ellipse(tx - 2, ty - 7, 3, 3, 0x4e9a62);
  }
  return c;
}

function golfMid(): PixelCanvas {
  const h = 90;
  const c = new PixelCanvas(512, h);
  const r = rng(303);
  // palm trees
  for (const px of [30, 170, 330, 450]) {
    for (let y = 20; y < h - 10; y++) {
      const bend = Math.round(Math.sin((y / h) * 2) * 4);
      c.rect(px + bend, y, 4, 1, (y >> 1) & 1 ? 0x8a6a40 : 0xa8844e);
    }
    const cx = px + 4, cy = 20;
    for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2 + 0.3;
      for (let t = 0; t < 18; t++) {
        const fx = cx + Math.cos(ang) * t;
        const fy = cy + Math.sin(ang) * t * 0.5 + (t * t) / 40;
        c.rect(Math.round(fx), Math.round(fy), 2, 2, t > 12 ? 0x257a40 : 0x38b764);
      }
    }
    c.ellipse(cx, cy + 2, 3, 2, 0x6a4a30);
  }
  // hedges
  for (let x = 0; x < 512; x++) {
    const hh = 14 + Math.round(Math.sin(x / 9) * 2 + Math.sin(x / 3.7));
    for (let y = h - hh; y < h; y++) c.set(x, y, dither(x, y, (y - (h - hh)) / hh) ? 0x1d6a3a : 0x2e8a4a);
    if (r() < 0.08) c.set(x, h - hh + 2, 0xff8ab0);
  }
  // pin flag + bunker
  c.ellipse(250, h - 16, 18, 4, 0xf0d8a0);
  c.vline(258, h - 44, 28, PAL.white);
  c.rect(259, h - 44, 10, 6, PAL.red);
  return c;
}

function golfGround(): PixelCanvas {
  const c = new PixelCanvas(64, 34);
  for (let x = 0; x < 64; x++) {
    const stripe = ((x >> 4) & 1) ? 0x38b764 : 0x2fa258;
    c.rect(x, 0, 1, 12, stripe);
    if (x % 3 === 0) c.set(x, 0, PAL.greenL);
    if (x % 5 === 1) c.set(x, 1, PAL.greenL);
  }
  c.rect(0, 12, 64, 2, 0x257a40);
  c.rect(0, 14, 64, 20, 0x8a5a3a);
  const r = rng(8);
  for (let i = 0; i < 22; i++) c.set(Math.floor(r() * 64), 15 + Math.floor(r() * 18), r() < 0.5 ? 0x6a4028 : 0xa8744a);
  c.rect(20, 22, 4, 2, 0xa8a0a0); c.rect(48, 28, 3, 2, 0xa8a0a0);
  return c;
}

function valleyFar(): PixelCanvas {
  // Bay Area: golden rolling hills + distant glass towers
  const h = 110;
  const c = new PixelCanvas(512, h);
  const r = rng(77);
  // back hills (hazy green)
  for (let x = 0; x < 512; x++) {
    const y = Math.round(40 + Math.sin(x / 81.5) * 14 + Math.sin(x / 31) * 5);
    c.vline(x, h - y, y, 0x8fbf8a);
    c.set(x, h - y, 0xb0d8a0);
  }
  // distant towers (light, hazy blue glass)
  const towers: [number, number, number][] = [[60, 18, 50], [84, 12, 36], [300, 22, 62], [328, 14, 44], [440, 16, 40]];
  for (const [tx, tw, th] of towers) {
    c.rect(tx, h - 20 - th, tw, th, 0x9ab8e0);
    c.vline(tx, h - 20 - th, th, 0xc8dcf4);
    for (let y = h - 17 - th; y < h - 22; y += 4) c.hline(tx + 2, y, tw - 4, 0x7a98c8);
  }
  // front hills (golden California grass)
  for (let x = 0; x < 512; x++) {
    const y = Math.round(22 + Math.sin(x / 40.7 + 1) * 8 + Math.sin(x / 15) * 2);
    c.vline(x, h - y, y, 0xd8b45a);
    c.set(x, h - y, 0xf0d488);
  }
  // oak trees dotted on the hills
  for (let i = 0; i < 9; i++) {
    const tx = Math.floor(r() * 500) + 6;
    const ty = h - 14 - Math.floor(r() * 6);
    c.vline(tx, ty, 5, 0x6a4a2a);
    c.ellipse(tx, ty - 1, 5, 3, 0x4e8a4a);
    c.ellipse(tx - 1, ty - 2, 3, 2, 0x6aa85a);
  }
  return c;
}

function palm(c: PixelCanvas, x: number, base: number, hgt: number): void {
  for (let y = 0; y < hgt; y++) {
    const xx = x + Math.round(Math.sin(y / hgt * 1.4) * 3);
    c.rect(xx, base - y, 3, 1, y % 4 === 0 ? 0x8a5a3a : 0xa8744a);
  }
  const tx = x + Math.round(Math.sin(1.4) * 3) + 1, ty = base - hgt;
  const fronds: [number, number][] = [[-12, 5], [-9, 8], [-5, 9], [12, 5], [9, 8], [5, 9], [-8, -3], [8, -3], [0, -5]];
  for (const [fx, fy] of fronds) {
    const n = Math.max(Math.abs(fx), Math.abs(fy));
    for (let i = 0; i <= n; i++) {
      const px = tx + Math.round(fx * i / n);
      const py = ty + Math.round(fy * i / n - Math.sin(i / n * Math.PI) * 2);
      c.rect(px, py, 2, 2, i > n * 0.6 ? 0x2e8a4a : 0x38b764);
    }
  }
  c.ellipse(tx, ty + 1, 2, 2, 0x6a4028);
}

function valleyMid(): PixelCanvas {
  // tech campus: low modern offices with startup logos, palms, bikes
  const h = 96;
  const c = new PixelCanvas(512, h);
  const blds: { x: number; w: number; hgt: number; wall: number; accent: number; logo: string }[] = [
    { x: 0, w: 120, hgt: 56, wall: 0xf4f4f4, accent: 0x3b5dc9, logo: 'CLOUDLY' },
    { x: 150, w: 96, hgt: 70, wall: 0xe8e0d0, accent: 0xef7d57, logo: 'AI INC' },
    { x: 278, w: 130, hgt: 50, wall: 0xf4f4f4, accent: 0x38b764, logo: 'STARTUP' },
    { x: 432, w: 80, hgt: 62, wall: 0xdcd8e8, accent: 0x8b4fd0, logo: 'APPZ' }
  ];
  for (const b of blds) {
    const top = h - b.hgt;
    c.rect(b.x, top, b.w, b.hgt, b.wall);
    c.rect(b.x, top, b.w, 4, b.accent);
    c.hline(b.x, top + 4, b.w, O);
    // wide modern window bands
    for (let wy = top + 10; wy < h - 22; wy += 13) {
      c.rect(b.x + 4, wy, b.w - 8, 8, 0x4a7ac8);
      c.hline(b.x + 4, wy, b.w - 8, 0x9ad0f8);
      for (let wx = b.x + 4; wx < b.x + b.w - 4; wx += 16) c.vline(wx, wy, 8, 0x29366f);
    }
    // entrance
    c.rect(b.x + Math.floor(b.w / 2) - 10, h - 20, 20, 20, 0x29366f);
    c.rect(b.x + Math.floor(b.w / 2) - 8, h - 18, 7, 18, 0x9ad0f8);
    c.rect(b.x + Math.floor(b.w / 2) + 1, h - 18, 7, 18, 0x9ad0f8);
    c.vline(b.x, top, b.hgt, O); c.vline(b.x + b.w - 1, top, b.hgt, O);
    // rooftop logo sign
    const lw = b.logo.length * 6 + 8;
    const lx = b.x + Math.floor((b.w - lw) / 2);
    c.rect(lx, top - 13, lw, 12, b.accent);
    c.hline(lx, top - 13, lw, 0xffffff);
    c.vline(lx + 3, top - 1, 1, O); c.vline(lx + lw - 4, top - 1, 1, O);
    stampText(c, lx + 4, top - 11, b.logo, PAL.white);
  }
  // "WE'RE HIRING!" billboard between buildings
  c.rect(250, 20, 2, 76, 0x566c86); c.rect(272, 20, 2, 76, 0x566c86);
  c.rect(218, 6, 88, 30, O);
  c.rect(220, 8, 84, 26, 0x1d5034);
  stampText(c, 225, 12, "WE'RE", PAL.greenL);
  stampText(c, 225, 22, 'HIRING!', PAL.white);
  c.rect(280, 13, 18, 14, PAL.green); c.rect(283, 16, 5, 6, 0xf4e4c1); c.hline(290, 17, 6, PAL.white); c.hline(290, 20, 5, PAL.white);
  // palm trees
  for (const px of [128, 262, 416]) palm(c, px, h - 1, 52);
  // bike racks
  for (const bx of [30, 330]) {
    for (let i = 0; i < 3; i++) {
      const x = bx + i * 12;
      c.ellipse(x, h - 4, 3, 3, O); c.ellipse(x, h - 4, 2, 2, 0xdcd8e8);
      c.ellipse(x + 8, h - 4, 3, 3, O); c.ellipse(x + 8, h - 4, 2, 2, 0xdcd8e8);
      c.hline(x, h - 7, 8, [PAL.red, PAL.gold, PAL.blue][i]);
      c.vline(x + 6, h - 10, 4, [PAL.red, PAL.gold, PAL.blue][i]);
    }
  }
  return c;
}

function valleyGround(): PixelCanvas {
  // lawn edge, clean concrete path, green bike lane
  const c = new PixelCanvas(64, 34);
  c.rect(0, 0, 64, 3, 0x5cb85c);
  c.hline(0, 0, 64, 0x8ad06a);
  for (let x = 1; x < 64; x += 5) c.set(x, 0, 0x3a8a4a);
  c.hline(0, 3, 64, O);
  c.rect(0, 4, 64, 12, 0xe8e4dc);
  for (let x = 0; x < 64; x += 32) c.vline(x, 4, 12, 0xc8c0b4);
  c.hline(0, 15, 64, 0xc8c0b4);
  c.rect(0, 16, 64, 18, 0x3fa060);
  c.hline(0, 16, 64, 0x2e7a48);
  c.rect(6, 23, 18, 2, PAL.white);
  // bike symbol
  c.ellipse(42, 26, 2, 2, PAL.white); c.ellipse(50, 26, 2, 2, PAL.white); c.hline(42, 23, 8, PAL.white);
  return c;
}

export const LAYER_FACTORS = { clouds: 0.06, far: 0.18, mid: 0.45, ground: 1 };

export function buildBackgrounds(scene: Phaser.Scene): void {
  const builders = [
    [cityFar, cityMid, cityGround],
    [golfFar, golfMid, golfGround],
    [valleyFar, valleyMid, valleyGround]
  ];
  for (let s = 0; s < 3; s++) {
    addImage(scene, `bg${s}_sky`, sky(s));
    addImage(scene, `bg${s}_clouds`, clouds(s));
    addImage(scene, `bg${s}_far`, builders[s][0]());
    addImage(scene, `bg${s}_mid`, builders[s][1]());
    addImage(scene, `bg${s}_ground`, builders[s][2]());
  }
}
