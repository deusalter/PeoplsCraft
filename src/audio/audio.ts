// Fully synthesized audio. Effects are short recipes of filtered noise and oscillators.
// Music is deliberately quiet and sparse: soft felt-piano notes and slow pads through a long
// reverb, irregular rhythm, and long silences between pieces. Boss fights swap the piano for a
// low drone, a slow heartbeat and dissonant swells. Nothing here keeps a steady melodic pulse.
type Mood = 'day' | 'night' | 'cave' | 'hollows' | 'rift' | 'boss' | 'menu' | 'none';

interface MoodDef {
  root: number;            // tonic in Hz
  scale: number[];         // semitones above the tonic
  chords: number[][];      // open voicings, semitones relative to the tonic
  beat: number;            // seconds per beat (slow)
  density: number;         // chance that a melody slot sounds at all
  oct: number;             // octaves above the tonic for the melody
  pad: number; keys: number; bright: number;
  piece: [number, number]; // seconds of music
  gap: [number, number];   // seconds of silence afterwards
  voice: 'piano' | 'bell';
}
const DAY: MoodDef = { root: 174.61, scale: [0, 2, 4, 7, 9, 11], chords: [[0, 7, 16], [-3, 4, 12], [4, 11, 19], [-5, 2, 11], [0, 7, 14]], beat: 1.2, density: 0.36, oct: 1, pad: 0.045, keys: 0.11, bright: 850, piece: [70, 120], gap: [50, 120], voice: 'piano' };
const MOODS: Record<Mood, MoodDef | null> = {
  day: DAY, menu: DAY,
  night: { root: 146.83, scale: [0, 2, 3, 5, 7, 10], chords: [[0, 7, 15], [-4, 3, 12], [-2, 5, 14], [0, 7, 14]], beat: 1.5, density: 0.25, oct: 1, pad: 0.05, keys: 0.1, bright: 620, piece: [70, 110], gap: [60, 140], voice: 'piano' },
  cave: { root: 110, scale: [0, 2, 3, 7, 8], chords: [[0, 7], [-4, 3], [0, 7, 14]], beat: 2.1, density: 0.13, oct: 2, pad: 0.05, keys: 0.085, bright: 380, piece: [50, 90], gap: [70, 160], voice: 'piano' },
  hollows: { root: 98, scale: [0, 1, 5, 7, 8], chords: [[0, 7, 13], [-2, 5, 12], [0, 7, 17]], beat: 1.9, density: 0.16, oct: 2, pad: 0.06, keys: 0.08, bright: 440, piece: [60, 100], gap: [50, 120], voice: 'bell' },
  rift: { root: 196, scale: [0, 2, 4, 6, 7, 9, 11], chords: [[0, 7, 14, 18], [2, 9, 18], [-5, 2, 11], [0, 7, 16]], beat: 1.3, density: 0.3, oct: 1, pad: 0.04, keys: 0.075, bright: 1500, piece: [70, 120], gap: [45, 100], voice: 'bell' },
  boss: null, none: null,
};
const STEPS = [-2, -1, -1, -1, 1, 1, 1, 2, 0, 3, -3];
const WAITS = [0.5, 1, 1, 1.5, 2, 2, 3, 4];

export class GameAudio {
  ctx: AudioContext | null = null;
  private master!: GainNode; private sfx!: GainNode; private music!: GainNode; private noise!: AudioBuffer;
  sfxVol = 0.8; musicVol = 0.45;
  private reverb!: ConvolverNode;
  private mood: Mood = 'none'; private cur: Mood = 'none'; private playing = false; private pieceEnd = 0; private restEnd = 0; private nextChord = 0; private nextSlot = 0;
  private chord = 0; private deg = 6; private nextBeat = 0; private beatN = 0; private nextSwell = 0;
  /** Listener position, for distance attenuation of world sounds. */
  lx = 0; ly = 0; lz = 0;

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new C();
      const c = this.ctx;
      this.master = c.createGain(); this.master.connect(c.destination);
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(this.master);
      this.sfx = c.createGain(); this.sfx.connect(comp);
      this.music = c.createGain(); this.music.connect(comp);
      // a long, dark hall: generated impulse response, no asset needed
      const len = Math.floor(c.sampleRate * 3.4), ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) { const t = i / len; lp += ((Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) - lp) * 0.32; d[i] = lp; }
      }
      this.reverb = c.createConvolver(); this.reverb.buffer = ir;
      const wet = c.createGain(); wet.gain.value = 1.5; this.reverb.connect(wet); wet.connect(comp);
      const send = c.createGain(); send.gain.value = 0.85; this.music.connect(send); send.connect(this.reverb);
      const fxSend = c.createGain(); fxSend.gain.value = 0.1; this.sfx.connect(fxSend); fxSend.connect(this.reverb);
      this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.setVolumes(this.sfxVol, this.musicVol);
    } catch { this.ctx = null; }
  }
  setVolumes(sfx: number, music: number): void {
    this.sfxVol = sfx; this.musicVol = music;
    if (!this.ctx) return;
    this.sfx.gain.value = sfx; this.music.gain.value = music * 0.5;
  }

  // ---- primitives ----
  private burst(freq: number, q: number, dur: number, vol: number, type: BiquadFilterType = 'bandpass', sweep = 0, delay = 0, out?: AudioNode): void {
    const c = this.ctx!; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out ?? this.sfx);
    s.start(t, Math.random() * 0.9); s.stop(t + dur + 0.02);
  }
  private tone(freq: number, dur: number, vol: number, type: OscillatorType = 'sine', sweep = 1, delay = 0, attack = 0.005, out?: AudioNode): void {
    const c = this.ctx!; const t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (sweep !== 1) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * sweep), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out ?? this.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /** Play a named effect. `at` positions it in the world; `pitch` scales its frequencies. */
  play(name: string, vol = 1, pitch = 1, at?: [number, number, number]): void {
    if (!this.ctx || this.sfxVol <= 0) return;
    if (at) {
      const d = Math.hypot(at[0] - this.lx, at[1] - this.ly, at[2] - this.lz);
      if (d > 34) return;
      vol *= 1 / (1 + d * d * 0.02);
    }
    const p = pitch * (0.94 + Math.random() * 0.12), v = vol;
    switch (name) {
      // materials: dig = light tap, break = fuller crunch, step = soft
      case 'dig_stone': this.burst(1900 * p, 2.5, 0.07, 0.35 * v); this.tone(190 * p, 0.05, 0.12 * v, 'square', 0.6); break;
      case 'break_stone': this.burst(1300 * p, 1.2, 0.2, 0.5 * v, 'bandpass', 0.4); this.tone(120 * p, 0.12, 0.25 * v, 'square', 0.5); break;
      case 'step_stone': this.burst(1500 * p, 2, 0.05, 0.1 * v); break;
      case 'dig_wood': this.burst(700 * p, 4, 0.07, 0.4 * v); this.tone(260 * p, 0.05, 0.14 * v, 'triangle', 0.7); break;
      case 'break_wood': this.burst(600 * p, 2, 0.2, 0.5 * v, 'bandpass', 0.5); this.tone(180 * p, 0.14, 0.28 * v, 'triangle', 0.5); break;
      case 'step_wood': this.burst(520 * p, 3, 0.06, 0.13 * v); break;
      case 'dig_dirt': case 'dig_grass': this.burst(420 * p, 1, 0.09, 0.4 * v, 'lowpass'); break;
      case 'break_dirt': case 'break_grass': this.burst(380 * p, 0.8, 0.2, 0.55 * v, 'lowpass', 0.5); break;
      case 'step_dirt': this.burst(360 * p, 1, 0.07, 0.12 * v, 'lowpass'); break;
      case 'step_grass': this.burst(2600 * p, 0.8, 0.08, 0.06 * v, 'highpass'); this.burst(340 * p, 1, 0.06, 0.08 * v, 'lowpass'); break;
      case 'dig_sand': case 'dig_snow': this.burst(3200 * p, 0.6, 0.1, 0.22 * v, 'highpass'); break;
      case 'break_sand': case 'break_snow': this.burst(2600 * p, 0.5, 0.22, 0.34 * v, 'highpass', 0.6); break;
      case 'step_sand': case 'step_snow': this.burst(2800 * p, 0.6, 0.09, 0.08 * v, 'highpass'); break;
      case 'dig_glass': case 'dig_crystal': this.tone(1800 * p, 0.08, 0.14 * v, 'sine'); this.tone(2700 * p, 0.06, 0.08 * v, 'sine'); break;
      case 'break_glass': case 'break_crystal': for (let i = 0; i < 5; i++) this.tone((1400 + Math.random() * 2600) * p, 0.16, 0.1 * v, 'sine', 1, i * 0.018); this.burst(5000, 1, 0.12, 0.2 * v, 'highpass'); break;
      case 'step_glass': case 'step_crystal': this.tone(1500 * p, 0.04, 0.05 * v); break;
      case 'dig_leaf': case 'dig_cloth': this.burst(3800 * p, 0.7, 0.08, 0.16 * v, 'highpass'); break;
      case 'break_leaf': case 'break_cloth': this.burst(3000 * p, 0.6, 0.18, 0.26 * v, 'highpass', 0.5); break;
      case 'step_leaf': case 'step_cloth': this.burst(3400 * p, 0.7, 0.06, 0.07 * v, 'highpass'); break;
      case 'dig_metal': this.tone(880 * p, 0.12, 0.16 * v, 'square'); this.tone(1320 * p, 0.1, 0.08 * v, 'square'); break;
      case 'break_metal': this.tone(660 * p, 0.3, 0.22 * v, 'square', 0.8); this.tone(990 * p, 0.25, 0.12 * v, 'square'); this.burst(2400, 2, 0.1, 0.2 * v); break;
      case 'step_metal': this.tone(700 * p, 0.05, 0.06 * v, 'square'); break;
      case 'step_liquid': case 'splash': this.burst(900 * p, 0.8, 0.25, 0.3 * v, 'bandpass', 2.2); break;
      case 'place': this.burst(520 * p, 2, 0.08, 0.38 * v, 'lowpass'); this.tone(150 * p, 0.06, 0.16 * v, 'sine', 0.7); break;
      // feedback
      case 'pop': this.tone(520 * p, 0.09, 0.22 * v, 'sine', 1.9); break;
      case 'click': this.tone(900 * p, 0.03, 0.12 * v, 'square'); break;
      case 'craft': this.burst(900, 2, 0.06, 0.2 * v, 'bandpass'); this.tone(523, 0.18, 0.09 * v, 'sine', 1, 0.03); break;
      case 'error': this.tone(180, 0.12, 0.16 * v, 'square', 0.8); break;
      case 'coin': this.tone(1568, 0.08, 0.07 * v, 'sine'); this.tone(2093, 0.2, 0.07 * v, 'sine', 1, 0.05); break;
      case 'eat': for (let i = 0; i < 3; i++) this.burst(900 + Math.random() * 400, 2, 0.07, 0.3 * v, 'bandpass', 0.6, i * 0.11); break;
      case 'drink': for (let i = 0; i < 3; i++) this.tone(300 + i * 60, 0.08, 0.14 * v, 'sine', 1.5, i * 0.1); break;
      case 'swing': this.burst(1100 * p, 0.7, 0.14, 0.18 * v, 'bandpass', 0.35); break;
      case 'hit': this.burst(900 * p, 1.2, 0.09, 0.5 * v, 'lowpass', 0.4); this.tone(150 * p, 0.09, 0.3 * v, 'square', 0.5); break;
      case 'crit': this.burst(1200, 1, 0.1, 0.5 * v, 'lowpass', 0.4); this.tone(880, 0.12, 0.2 * v, 'square', 1.5); this.tone(1320, 0.16, 0.14 * v, 'square', 1.2, 0.04); break;
      case 'hurt': this.tone(330 * p, 0.2, 0.3 * v, 'sawtooth', 0.5); this.burst(600, 1, 0.1, 0.3 * v, 'lowpass'); break;
      case 'death': this.tone(220, 0.7, 0.3 * v, 'sawtooth', 0.25); this.burst(300, 0.7, 0.6, 0.3 * v, 'lowpass', 0.3); break;
      case 'bow': this.tone(240 * p, 0.14, 0.2 * v, 'triangle', 0.5); this.burst(2400, 1, 0.07, 0.12 * v, 'highpass'); break;
      case 'magic': this.tone(700 * p, 0.2, 0.14 * v, 'sine', 2.2); this.tone(1050 * p, 0.16, 0.08 * v, 'triangle', 1.6, 0.02); break;
      case 'summon': this.tone(220, 0.9, 0.12 * v, 'sine', 1.5, 0, 0.25); this.tone(330, 0.9, 0.08 * v, 'sine', 1.5, 0.05, 0.25); break;
      case 'levelup': [0, 7, 14].forEach((n, i) => { this.tone(294 * Math.pow(2, n / 12), 1.6, 0.11 * v, 'sine', 1, i * 0.16, 0.02); this.tone(588 * Math.pow(2, n / 12), 1.1, 0.03 * v, 'sine', 1, i * 0.16, 0.02); }); break;
      case 'quest': [0, 7].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 1.1, 0.09 * v, 'sine', 1, i * 0.18, 0.02)); break;
      case 'door': this.burst(400 * p, 3, 0.12, 0.3 * v); this.tone(160, 0.08, 0.14 * v, 'triangle', 0.7, 0.05); break;
      case 'chest': this.tone(200 * p, 0.12, 0.16 * v, 'triangle', 1.4); this.burst(700, 2, 0.08, 0.2 * v); break;
      case 'fizz': this.burst(4200, 0.6, 0.4, 0.18 * v, 'highpass', 0.6); break;
      case 'teleport': this.tone(1200, 0.35, 0.16 * v, 'sine', 0.2); this.tone(300, 0.35, 0.14 * v, 'sine', 4, 0.05); break;
      case 'portal': this.tone(110, 1.4, 0.18 * v, 'sine', 2.5, 0, 0.5); this.tone(165, 1.4, 0.12 * v, 'sine', 2.5, 0, 0.5); break;
      case 'slam': this.tone(70, 0.5, 0.6 * v, 'sine', 0.4); this.burst(220, 0.6, 0.45, 0.6 * v, 'lowpass', 0.3); break;
      case 'thunder': this.burst(180, 0.5, 1.1, 0.6 * v, 'lowpass', 0.3); this.burst(2400, 0.5, 0.08, 0.3 * v, 'highpass'); break;
      case 'roar': this.tone(90 * p, 1.1, 0.4 * v, 'sawtooth', 0.6, 0, 0.12); this.tone(135 * p, 1.0, 0.25 * v, 'sawtooth', 0.55, 0, 0.12); this.burst(400, 0.6, 1.0, 0.35 * v, 'lowpass', 0.5); break;
      case 'growl': this.tone(120 * p, 0.3, 0.22 * v, 'sawtooth', 0.7, 0, 0.04); this.burst(500 * p, 1.5, 0.22, 0.12 * v); break;
      case 'mobhurt': this.tone(260 * p, 0.14, 0.22 * v, 'sawtooth', 0.6); break;
      case 'mobdie': this.tone(200 * p, 0.35, 0.22 * v, 'sawtooth', 0.3); this.burst(700, 0.8, 0.25, 0.2 * v, 'lowpass', 0.4); break;
      case 'shoot': this.tone(520 * p, 0.14, 0.14 * v, 'square', 0.5); break;
      case 'horn': this.tone(147, 1.4, 0.3 * v, 'sawtooth', 1, 0, 0.2); this.tone(220, 1.4, 0.2 * v, 'sawtooth', 1, 0.15, 0.2); break;
      case 'bell': [1, 2.76, 5.4].forEach((m, i) => this.tone(196 * m, 2.2 - i * 0.5, 0.2 * v / (i + 1), 'sine')); break;
    }
  }

  // ---- music ----
  /** Soft felt piano: a sine with two quiet overtones, fast attack, long darkening decay. */
  private keys(freq: number, at: number, vel: number, dur = 5): void {
    const c = this.ctx!, out = c.createGain(), f = c.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(Math.min(5200, 800 + freq * 2.4), at); f.frequency.exponentialRampToValueAtTime(Math.max(260, freq * 1.1), at + dur * 0.7);
    out.gain.setValueAtTime(0.0001, at); out.gain.linearRampToValueAtTime(vel, at + 0.01); out.gain.exponentialRampToValueAtTime(vel * 0.32, at + 0.4); out.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    const part = (mult: number, g: number, type: OscillatorType): void => {
      const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = freq * mult; og.gain.value = g;
      o.connect(og); og.connect(f); o.start(at); o.stop(at + dur + 0.05);
    };
    part(1, 1, 'sine'); part(2, 0.2, 'sine'); part(3, 0.05, 'sine'); part(1.003, 0.22, 'triangle');
    f.connect(out); out.connect(this.music);
  }
  /** Glassy bell with inharmonic partials, each dying at its own rate. */
  private bell(freq: number, at: number, vel: number): void {
    const c = this.ctx!;
    const part = (mult: number, g: number, dur: number): void => {
      const o = c.createOscillator(), og = c.createGain(); o.type = 'sine'; o.frequency.value = freq * mult;
      og.gain.setValueAtTime(0.0001, at); og.gain.linearRampToValueAtTime(vel * g, at + 0.012); og.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(og); og.connect(this.music); o.start(at); o.stop(at + dur + 0.05);
    };
    part(1, 1, 6); part(2.76, 0.3, 3.2); part(5.4, 0.12, 1.8); part(8.93, 0.05, 1);
  }
  /** Slow swelling pad: two slightly detuned oscillators per note behind a low-pass. */
  private padChord(freqs: number[], at: number, len: number, level: number, bright: number, type: OscillatorType = 'sine', attack = 0.38): void {
    const c = this.ctx!, f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = bright; f.Q.value = 0.3;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(level, at + len * attack); g.gain.setValueAtTime(level, at + len * 0.6); g.gain.linearRampToValueAtTime(0.0001, at + len);
    for (const fr of freqs) for (let k = 0; k < 2; k++) {
      const o = c.createOscillator(); o.type = k ? 'triangle' : type; o.frequency.value = fr; o.detune.value = k ? 6 : -5;
      const og = c.createGain(); og.gain.value = k ? 0.4 : 1;
      o.connect(og); og.connect(f); o.start(at); o.stop(at + len + 0.1);
    }
    f.connect(g); g.connect(this.music);
  }

  setMood(m: Mood): void {
    if (m === this.mood) return;
    const was = this.mood;
    this.mood = m;
    // stepping in and out of a cave, or dusk falling, must not cut a piece short: the piece that
    // is playing finishes in its own mood and the next one picks up the new surroundings
    const soft = (x: Mood): boolean => x === 'day' || x === 'night' || x === 'cave';
    if (soft(was) && soft(m)) return;
    this.playing = false;
    const now = this.ctx ? this.ctx.currentTime : 0;
    // let the world breathe before anything starts, except a boss, which arrives at once
    this.restEnd = now + (m === 'boss' ? 0.3 : was === 'boss' ? 12 : was === 'none' ? 8 : 18 + Math.random() * 25);
    this.nextBeat = now + 0.4; this.beatN = 0; this.nextSwell = now + 2;
  }

  /** Call every frame. Schedules a little ahead on the audio clock. */
  update(): void {
    const c = this.ctx;
    if (!c || this.musicVol <= 0 || this.mood === 'none') return;
    const now = c.currentTime;
    if (this.mood === 'boss') { this.bossMusic(now); return; }
    if (!this.playing) {
      if (now < this.restEnd) return;
      this.cur = this.mood;
    }
    const m = MOODS[this.cur];
    if (!m) return;
    if (!this.playing) {
      this.playing = true;
      this.pieceEnd = now + m.piece[0] + Math.random() * (m.piece[1] - m.piece[0]);
      this.nextChord = now + 0.2; this.nextSlot = now + 3 + Math.random() * 4;
      this.chord = Math.floor(Math.random() * m.chords.length); this.deg = m.scale.length + Math.floor(Math.random() * 3);
    } else if (now >= this.pieceEnd) {
      this.playing = false; this.restEnd = now + m.gap[0] + Math.random() * (m.gap[1] - m.gap[0]);
      return;
    }
    const hz = (semi: number): number => m.root * Math.pow(2, semi / 12);
    if (now >= this.nextChord) {
      this.chord = (this.chord + 1 + (Math.random() < 0.3 ? 1 : 0)) % m.chords.length;
      const ch = m.chords[this.chord], len = m.beat * 8;
      this.padChord(ch.map(hz), now, len + 4, m.pad, m.bright);
      if (Math.random() < 0.6) this.keys(hz(ch[0]) / 2, now + 0.06, m.keys * 0.55, 6);
      this.nextChord = now + len;
    }
    if (now >= this.nextSlot) {
      if (Math.random() < m.density) {
        const n = m.scale.length, ch = m.chords[this.chord];
        let d = Math.max(n - 2, Math.min(n * 3, this.deg + STEPS[Math.floor(Math.random() * STEPS.length)]));
        const semiOf = (q: number): number => m.scale[((q % n) + n) % n] + 12 * Math.floor(q / n);
        if (Math.random() < 0.4) {
          // lean on a chord tone: the nearest scale step whose pitch class is in the current chord
          for (const off of [0, 1, -1, 2, -2]) { const pc = ((semiOf(d + off) % 12) + 12) % 12; if (ch.some((x) => ((x % 12) + 12) % 12 === pc)) { d += off; break; } }
        }
        this.deg = d;
        const f = hz(semiOf(d)) * Math.pow(2, m.oct - 1), vel = m.keys * (0.55 + Math.random() * 0.5), at = now + Math.random() * 0.03;
        if (m.voice === 'bell') this.bell(f, at, vel * 0.8); else this.keys(f, at, vel);
        if (Math.random() < 0.14) { const f2 = hz(semiOf(d - 2)) * Math.pow(2, m.oct - 1); if (m.voice === 'bell') this.bell(f2, at + 0.03, vel * 0.5); else this.keys(f2, at + 0.03, vel * 0.6); }
        this.nextSlot = now + m.beat * (0.5 + WAITS[Math.floor(Math.random() * WAITS.length)]);
      } else this.nextSlot = now + m.beat * (0.5 + Math.random() * 1.5);
    }
  }

  /** Boss fights: a low drone, a slow uneven heartbeat, and dissonant swells. No tune. */
  private bossMusic(now: number): void {
    const beat = 0.62, root = 73.42;
    if (now < this.restEnd) return;
    if (now >= this.nextBeat) {
      const n = this.beatN % 8;
      if (this.beatN % 16 === 0) this.padChord([root, root * 1.498, root * 2.119], now, beat * 16 + 3, 0.075, 380, 'sawtooth', 0.2);
      if (n === 0 || n === 3 || n === 4 || n === 6) {
        const v = n === 0 || n === 4 ? 0.5 : 0.26;
        this.tone(62, 0.3, v, 'sine', 0.55, 0, 0.005, this.music); this.burst(95, 0.8, 0.1, v * 0.5, 'lowpass', 0.5, 0, this.music);
      }
      if (n === 4 && Math.random() < 0.4) { this.keys(root / 2, now + 0.02, 0.13, 5); this.keys(root, now + 0.02, 0.09, 5); }
      this.beatN++;
      this.nextBeat = this.nextBeat + beat < now ? now + beat : this.nextBeat + beat;
    }
    if (now >= this.nextSwell) {
      const pair = [[6, 13], [1, 8], [3, 10], [11, 18]][Math.floor(Math.random() * 4)];
      this.padChord(pair.map((x) => root * 2 * Math.pow(2, x / 12)), now, 5.5, 0.04, 1300, 'sawtooth', 0.55);
      this.nextSwell = now + 5 + Math.random() * 5;
    }
  }
}
