export const W = 480;
export const H = 270;
export const GROUND_Y = 236;
export const HERO_X = 120; // ~25% of screen width

export const STEP = 1 / 120; // fixed physics step (frame-rate independent)
export const GRAVITY = 1150;
export const JUMP_V = 390;
export const DOUBLE_JUMP_V = 340;
export const FAST_FALL = 1400;

export const RUN_TIME = 45; // seconds until the office door
export const CHECKPOINTS = [15, 30];
export const STAGE_NAMES = ['DOWNTOWN', 'GOLF CLUB', 'SILICON VALLEY'];

export const SPEED_START = 150;
export const SPEED_END = 255;

export const GAP_START = 70;
export const GAP_MAX = 100;
export const GAP_HIT = 28;
export const GAP_BURGER = 18;
export const GAP_CHECKPOINT = 10;

export const PX_PER_METER = 16;

// Shared palette (16-bit-ish, slightly desaturated)
export const PAL = {
  out: 0x1a1c2c,
  white: 0xf4f4f4,
  gold: 0xffcd3c,
  goldL: 0xfff2a0,
  goldD: 0xc98a1b,
  green: 0x38b764,
  greenL: 0xa7f070,
  greenD: 0x257179,
  red: 0xd8282b,
  redD: 0x8e1a24,
  orange: 0xef7d57,
  gray: 0x94a0b4,
  grayD: 0x566c86,
  grayDD: 0x333c57,
  blue: 0x3b5dc9,
  sky: 0x73eff7
};
