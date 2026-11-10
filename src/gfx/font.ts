import Phaser from 'phaser';
import { PixelCanvas } from './PixelCanvas';
import { PAL } from '../constants';

// 5x7 pixel font. Special glyphs: ^ = up arrow, _ = down arrow, @ = heart.
const G: Record<string, string> = {
  A: '01110 10001 10001 11111 10001 10001 10001',
  B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110',
  D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111',
  F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111',
  H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110',
  J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001',
  L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001',
  N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110',
  P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101',
  R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110',
  T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110',
  V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010',
  X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100',
  Z: '11111 00001 00010 00100 01000 10000 11111',
  '0': '01110 10001 10011 10101 11001 10001 01110',
  '1': '00100 01100 00100 00100 00100 00100 01110',
  '2': '01110 10001 00001 00010 00100 01000 11111',
  '3': '11111 00010 00100 00010 00001 10001 01110',
  '4': '00010 00110 01010 10010 11111 00010 00010',
  '5': '11111 10000 11110 00001 00001 10001 01110',
  '6': '00110 01000 10000 11110 10001 10001 01110',
  '7': '11111 00001 00010 00100 01000 01000 01000',
  '8': '01110 10001 10001 01110 10001 10001 01110',
  '9': '01110 10001 10001 01111 00001 00010 01100',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
  '!': '00100 00100 00100 00100 00100 00000 00100',
  '?': '01110 10001 00001 00010 00100 00000 00100',
  '.': '00000 00000 00000 00000 00000 01100 01100',
  ',': '00000 00000 00000 00000 01100 00100 01000',
  ':': '00000 01100 01100 00000 01100 01100 00000',
  '-': '00000 00000 00000 11111 00000 00000 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000',
  "'": '00100 00100 01000 00000 00000 00000 00000',
  '"': '01010 01010 01010 00000 00000 00000 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000',
  '(': '00010 00100 01000 01000 01000 00100 00010',
  ')': '01000 00100 00010 00010 00010 00100 01000',
  '%': '11001 11010 00010 00100 01000 01011 10011',
  '<': '00010 00100 01000 10000 01000 00100 00010',
  '>': '01000 00100 00010 00001 00010 00100 01000',
  '^': '00100 01110 10101 00100 00100 00100 00100',
  _: '00100 00100 00100 00100 10101 01110 00100',
  '=': '00000 00000 11111 00000 11111 00000 00000',
  '*': '00000 10101 01110 11111 01110 10101 00000',
  '#': '01010 01010 11111 01010 11111 01010 01010',
  $: '00100 01111 10100 01110 00101 11110 00100',
  '&': '01100 10010 10100 01000 10101 10010 01101',
  '@': '00000 01010 11111 11111 01110 00100 00000'
};

export const FONT_CHARS = Object.keys(G).join('');
export const FONT_KEY = 'px';
const CW = 7;
const CH = 9;

function bits(ch: string): number[][] {
  const g = G[ch] ?? G['?'];
  return g.split(' ').map((r) => r.split('').map(Number));
}

/** Stamp text straight into a PixelCanvas (used for signs baked into textures). */
export function stampText(pc: PixelCanvas, x: number, y: number, s: string, color: number): void {
  [...s.toUpperCase()].forEach((ch, i) => {
    bits(ch).forEach((row, yy) => row.forEach((v, xx) => { if (v) pc.set(x + i * 6 + xx, y + yy, color); }));
  });
}
export const textWidth = (s: string): number => s.length * 6 - 1;

/** Build an outlined 5x7 bitmap font (white fill, dark outline → tint friendly). */
export function buildFont(scene: Phaser.Scene): void {
  const chars = FONT_CHARS;
  const pc = new PixelCanvas(chars.length * CW, CH);
  [...chars].forEach((ch, i) => {
    const b = bits(ch);
    const cell = new PixelCanvas(CW, CH);
    b.forEach((row, y) => row.forEach((v, x) => { if (v) cell.set(x + 1, y + 1, PAL.white); }));
    cell.outline(PAL.out, true);
    pc.blit(cell, i * CW, 0);
  });
  scene.textures.addCanvas('font_img', pc.toCanvas());
  const cfg = {
    image: 'font_img',
    width: CW,
    height: CH,
    chars,
    charsPerRow: chars.length,
    spacing: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    lineSpacing: 2
  };
  scene.cache.bitmapFont.add(FONT_KEY, Phaser.GameObjects.RetroFont.Parse(scene, cfg as unknown as Phaser.Types.GameObjects.BitmapText.RetroFontConfig));
}

export interface TextOpts {
  scale?: number;
  tint?: number;
  origin?: [number, number];
  align?: 0 | 1 | 2;
  depth?: number;
}

export function txt(scene: Phaser.Scene, x: number, y: number, s: string, o: TextOpts = {}): Phaser.GameObjects.BitmapText {
  const t = scene.add.bitmapText(x, y, FONT_KEY, s.toUpperCase());
  t.setLetterSpacing(-1);
  if (o.scale) t.setScale(o.scale);
  if (o.tint !== undefined) t.setTint(o.tint);
  t.setOrigin(...(o.origin ?? [0, 0]));
  if (o.align === 1) t.setCenterAlign();
  if (o.align === 2) t.setRightAlign();
  if (o.depth !== undefined) t.setDepth(o.depth);
  return t;
}

/**
 * Chunky multi-tone logo text (title, FREEDOM!, BUSTED!).
 * Each font pixel becomes `s`x`s`, with a vertical 3-tone gradient,
 * a thick dark outline and a drop shadow.
 */
export function logoCanvas(text: string, s: number, tones: [number, number, number], shadow = PAL.out): PixelCanvas {
  const chars = [...text.toUpperCase()];
  const gw = 6 * s;
  const pad = 4;
  const w = chars.length * gw - s + pad * 2 + 2;
  const h = 7 * s + pad * 2 + 2;
  const fill = new PixelCanvas(w, h);
  chars.forEach((ch, i) => {
    bits(ch).forEach((row, y) => row.forEach((v, x) => {
      if (!v) return;
      const tone = y <= 1 ? tones[0] : y >= 5 ? tones[2] : tones[1];
      fill.rect(pad + i * gw + x * s, pad + y * s, s, s, tone);
    }));
  });
  // highlight speck on top-left of each glyph pixel block row 0
  fill.outline(PAL.out, true);
  fill.outline(PAL.out, false);
  const out = new PixelCanvas(w, h);
  // shadow
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (fill.get(x, y) !== -1) out.set(x + 2, y + 2, shadow);
  }
  out.blit(fill, 0, 0);
  return out;
}
