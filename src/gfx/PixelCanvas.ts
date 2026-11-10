/**
 * Tiny pixel-art drawing surface. Everything is drawn at 1:1 and later scaled
 * with nearest-neighbour filtering, so all game art stays on the pixel grid.
 */
export class PixelCanvas {
  readonly w: number;
  readonly h: number;
  readonly px: Int32Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Int32Array(w * h).fill(-1);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return -1;
    return this.px[y * this.w + x];
  }

  set(x: number, y: number, c: number): this {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.px[y * this.w + x] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: number): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  hline(x: number, y: number, w: number, c: number): this { return this.rect(x, y, w, 1, c); }
  vline(x: number, y: number, h: number, c: number): this { return this.rect(x, y, 1, h, c); }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
    return this;
  }

  /** Draw from an ASCII map using a char→color palette ('.' / ' ' = skip). */
  map(x: number, y: number, rows: string[], pal: Record<string, number>): this {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c !== undefined) this.set(x + i, y + j, c);
      }
    });
    return this;
  }

  /** Recolor every opaque pixel matching `from`. */
  replace(from: number, to: number): this {
    for (let i = 0; i < this.px.length; i++) if (this.px[i] === from) this.px[i] = to;
    return this;
  }

  /** Add a 1px outline around all opaque pixels (4-neighbour, optional diagonals). */
  outline(c: number, diagonal = false): this {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) !== -1) continue;
        let hit = this.get(x - 1, y) !== -1 || this.get(x + 1, y) !== -1 ||
          this.get(x, y - 1) !== -1 || this.get(x, y + 1) !== -1;
        if (!hit && diagonal) {
          hit = this.get(x - 1, y - 1) !== -1 || this.get(x + 1, y - 1) !== -1 ||
            this.get(x - 1, y + 1) !== -1 || this.get(x + 1, y + 1) !== -1;
        }
        if (hit) add.push(y * this.w + x);
      }
    }
    for (const i of add) this.px[i] = c;
    return this;
  }

  /** Paste another canvas (opaque pixels only). */
  blit(src: PixelCanvas, ox: number, oy: number, flipX = false): this {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.px[y * src.w + (flipX ? src.w - 1 - x : x)];
        if (c !== -1) this.set(ox + x, oy + y, c);
      }
    }
    return this;
  }

  toCanvas(scale = 1): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w * scale;
    cv.height = this.h * scale;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    for (let i = 0; i < this.px.length; i++) {
      const c = this.px[i];
      if (c === -1) continue;
      img.data[i * 4] = (c >> 16) & 255;
      img.data[i * 4 + 1] = (c >> 8) & 255;
      img.data[i * 4 + 2] = c & 255;
      img.data[i * 4 + 3] = 255;
    }
    if (scale === 1) {
      ctx.putImageData(img, 0, 0);
    } else {
      const tmp = document.createElement('canvas');
      tmp.width = this.w; tmp.height = this.h;
      tmp.getContext('2d')!.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, cv.width, cv.height);
    }
    return cv;
  }
}

/** Deterministic RNG so generated backgrounds look the same every run. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 4x4 Bayer threshold for ordered dithering (classic 16-bit gradient look). */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function dither(x: number, y: number, t: number): boolean {
  return t * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5;
}
