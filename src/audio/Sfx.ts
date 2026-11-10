import { store } from '../storage';

type Wave = OscillatorType;
export type Track = 'title' | 'game';

interface TrackDef { bpm: number; bass: number[]; lead: number[]; bassVol: number; leadVol: number; leadWave: Wave; hat: boolean }

// Background music kept soft (triangle voices, low-passed bus) so it never fights the SFX.
const TRACKS: Record<Track, TrackDef> = {
  // relaxed menu / intro loop: C - Am - F - G
  title: {
    bpm: 92,
    bass: [48, 0, 0, 0, 55, 0, 0, 0, 45, 0, 0, 0, 52, 0, 0, 0, 41, 0, 0, 0, 48, 0, 0, 0, 43, 0, 0, 0, 50, 0, 47, 0],
    lead: [72, 0, 0, 76, 0, 0, 79, 0, 72, 0, 0, 76, 0, 0, 74, 0, 69, 0, 0, 72, 0, 0, 77, 0, 71, 0, 74, 0, 79, 0, 0, 0],
    bassVol: 0.38, leadVol: 0.16, leadWave: 'triangle', hat: false
  },
  // bouncy chase loop
  game: {
    bpm: 152,
    bass: [48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 55, 0, 50, 0, 45, 0, 52, 0, 45, 0, 52, 0, 53, 0, 55, 0, 55, 57, 59, 0],
    lead: [
      64, 0, 67, 72, 0, 67, 64, 0, 65, 0, 69, 72, 0, 69, 67, 0,
      64, 0, 67, 72, 0, 74, 76, 0, 74, 72, 71, 0, 67, 0, 0, 0
    ],
    bassVol: 0.4, leadVol: 0.2, leadWave: 'triangle', hat: true
  }
};

/**
 * Chiptune SFX + music synthesised with WebAudio (no audio files).
 * The context is only created after the first user gesture (autoplay policy).
 */
class Sfx {
  private ctx?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private noise?: AudioBuffer;
  muted = store.getMuted();
  private musicTimer = 0;
  private musicStep = 0;
  private nextNoteAt = 0;
  private musicOn = false;
  private track: Track = 'game';

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2200;
      this.musicGain.connect(lp).connect(this.master);
      const len = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get ready(): boolean { return !!this.ctx && this.ctx.state === 'running'; }

  toggleMute(): boolean {
    this.muted = !this.muted;
    store.setMuted(this.muted);
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    return this.muted;
  }

  private tone(f0: number, f1: number, dur: number, type: Wave = 'square', vol = 0.25, at = 0, dest?: AudioNode): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private burst(dur: number, vol = 0.3, freq = 1200, at = 0): void {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime + at;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t);
    s.stop(t + dur);
  }

  jump(): void { this.tone(300, 720, 0.14, 'square', 0.16); }
  doubleJump(): void { this.tone(520, 1200, 0.16, 'square', 0.15); this.tone(780, 1560, 0.1, 'triangle', 0.1, 0.05); }
  slide(): void { this.burst(0.16, 0.12, 900); }
  coin(): void { this.tone(988, 988, 0.06, 'square', 0.12); this.tone(1319, 1319, 0.14, 'square', 0.12, 0.06); }
  burger(): void { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.1, 'square', 0.13, i * 0.06)); }
  hit(): void { this.burst(0.25, 0.4, 700); this.tone(220, 70, 0.3, 'sawtooth', 0.2); }
  knock(): void { this.burst(0.1, 0.18, 2200); this.tone(160, 90, 0.1, 'square', 0.1); }
  checkpoint(): void { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, f, 0.14, 'square', 0.13, i * 0.09)); }
  click(): void { this.tone(660, 880, 0.05, 'square', 0.1); }
  shout(): void { this.tone(180, 140, 0.18, 'sawtooth', 0.08); this.tone(240, 160, 0.14, 'sawtooth', 0.06, 0.12); }
  snatch(): void { this.tone(400, 1600, 0.2, 'triangle', 0.18); this.burst(0.12, 0.1, 3000); }
  win(): void {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone(f, f, i === notes.length - 1 ? 0.6 : 0.14, 'square', 0.14, i * 0.13));
    notes.forEach((f, i) => this.tone(f / 2, f / 2, 0.14, 'triangle', 0.15, i * 0.13));
  }
  lose(): void { [392, 370, 349, 311].forEach((f, i) => this.tone(f, f * 0.97, i === 3 ? 0.6 : 0.22, 'square', 0.14, i * 0.24)); }

  /* -------- music: soft 2-voice chiptune loops -------- */
  musicStart(track: Track = 'game'): void {
    if (!this.ctx) return;
    if (this.musicOn && this.track === track) return;
    this.musicStop();
    this.musicOn = true;
    this.track = track;
    this.musicStep = 0;
    this.nextNoteAt = this.ctx.currentTime + 0.05;
    const def = TRACKS[track];
    const stepDur = 60 / def.bpm / 2;
    const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx) return;
      while (this.nextNoteAt < this.ctx.currentTime + 0.12) {
        const i = this.musicStep % 32;
        const at = this.nextNoteAt - this.ctx.currentTime;
        const b = def.bass[i];
        const l = def.lead[i];
        if (b) this.tone(midi(b), midi(b), stepDur * 0.9, 'triangle', def.bassVol, at, this.musicGain);
        if (l) this.tone(midi(l), midi(l), stepDur * (def.hat ? 0.8 : 1.6), def.leadWave, def.leadVol, at, this.musicGain);
        if (def.hat && i % 4 === 2) this.burstMusic(at);
        this.nextNoteAt += stepDur;
        this.musicStep++;
      }
    }, 25);
  }

  private burstMusic(at: number): void {
    if (!this.ctx || !this.noise || !this.musicGain) return;
    const t = this.ctx.currentTime + Math.max(0, at);
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f).connect(g).connect(this.musicGain);
    s.start(t);
    s.stop(t + 0.06);
  }

  musicStop(): void {
    this.musicOn = false;
    window.clearInterval(this.musicTimer);
  }
}

export const sfx = new Sfx();
