// Fully synthesized audio: every effect is a short recipe of filtered noise and oscillators,
// and the music is a generative pad + pluck line that changes mode with the surroundings.
type Mood = 'day' | 'night' | 'cave' | 'hollows' | 'rift' | 'boss' | 'menu' | 'none';

const SCALES: Record<Mood, { root: number; notes: number[]; tempo: number; pad: OscillatorType; bright: number }> = {
  day: { root: 220, notes: [0, 2, 4, 7, 9, 12, 14, 16], tempo: 2.4, pad: 'triangle', bright: 1400 },
  night: { root: 196, notes: [0, 3, 5, 7, 10, 12, 15], tempo: 3.2, pad: 'sine', bright: 800 },
  cave: { root: 146.8, notes: [0, 2, 3, 7, 8, 12], tempo: 4.2, pad: 'sine', bright: 520 },
  hollows: { root: 138.6, notes: [0, 1, 5, 7, 8, 12, 13], tempo: 3.6, pad: 'sine', bright: 700 },
  rift: { root: 261.6, notes: [0, 2, 6, 7, 9, 11, 14], tempo: 2.8, pad: 'triangle', bright: 2200 },
  boss: { root: 110, notes: [0, 3, 5, 6, 7, 10, 12], tempo: 0.42, pad: 'sawtooth', bright: 1100 },
  menu: { root: 196, notes: [0, 4, 7, 11, 12, 14], tempo: 3, pad: 'triangle', bright: 1200 },
  none: { root: 220, notes: [0], tempo: 9, pad: 'sine', bright: 400 },
};

export class GameAudio {
  ctx: AudioContext | null = null;
  private master!: GainNode; private sfx!: GainNode; private music!: GainNode; private noise!: AudioBuffer;
  sfxVol = 0.8; musicVol = 0.45;
  private mood: Mood = 'none'; private nextNote = 0; private nextPad = 0; private step = 0;
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
      case 'craft': this.tone(660, 0.07, 0.16 * v, 'triangle'); this.tone(990, 0.1, 0.14 * v, 'triangle', 1, 0.06); break;
      case 'error': this.tone(180, 0.12, 0.16 * v, 'square', 0.8); break;
      case 'coin': this.tone(1568, 0.06, 0.12 * v, 'square'); this.tone(2093, 0.14, 0.12 * v, 'square', 1, 0.05); break;
      case 'eat': for (let i = 0; i < 3; i++) this.burst(900 + Math.random() * 400, 2, 0.07, 0.3 * v, 'bandpass', 0.6, i * 0.11); break;
      case 'drink': for (let i = 0; i < 3; i++) this.tone(300 + i * 60, 0.08, 0.14 * v, 'sine', 1.5, i * 0.1); break;
      case 'swing': this.burst(1100 * p, 0.7, 0.14, 0.18 * v, 'bandpass', 0.35); break;
      case 'hit': this.burst(900 * p, 1.2, 0.09, 0.5 * v, 'lowpass', 0.4); this.tone(150 * p, 0.09, 0.3 * v, 'square', 0.5); break;
      case 'crit': this.burst(1200, 1, 0.1, 0.5 * v, 'lowpass', 0.4); this.tone(880, 0.12, 0.2 * v, 'square', 1.5); this.tone(1320, 0.16, 0.14 * v, 'square', 1.2, 0.04); break;
      case 'hurt': this.tone(330 * p, 0.2, 0.3 * v, 'sawtooth', 0.5); this.burst(600, 1, 0.1, 0.3 * v, 'lowpass'); break;
      case 'death': this.tone(220, 0.7, 0.3 * v, 'sawtooth', 0.25); this.burst(300, 0.7, 0.6, 0.3 * v, 'lowpass', 0.3); break;
      case 'bow': this.tone(240 * p, 0.14, 0.2 * v, 'triangle', 0.5); this.burst(2400, 1, 0.07, 0.12 * v, 'highpass'); break;
      case 'magic': this.tone(700 * p, 0.2, 0.14 * v, 'sine', 2.2); this.tone(1050 * p, 0.16, 0.08 * v, 'triangle', 1.6, 0.02); break;
      case 'summon': for (let i = 0; i < 4; i++) this.tone(330 * Math.pow(1.26, i), 0.25, 0.12 * v, 'triangle', 1, i * 0.07); break;
      case 'levelup': [0, 4, 7, 12, 16].forEach((n, i) => this.tone(440 * Math.pow(2, n / 12), 0.35, 0.16 * v, 'triangle', 1, i * 0.09)); break;
      case 'quest': [0, 7, 12].forEach((n, i) => this.tone(523 * Math.pow(2, n / 12), 0.3, 0.12 * v, 'sine', 1, i * 0.1)); break;
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
  setMood(m: Mood): void { if (m !== this.mood) { this.mood = m; this.nextNote = 0; this.nextPad = 0; } }
  /** Schedule a little music ahead of time. Call every frame. */
  update(): void {
    const c = this.ctx;
    if (!c || this.musicVol <= 0 || this.mood === 'none') return;
    const now = c.currentTime, s = SCALES[this.mood];
    if (now >= this.nextPad) {
      // a slow two-note pad drawn from the scale
      const a = s.notes[(Math.random() * 3) | 0], b = s.notes[2 + ((Math.random() * 3) | 0)], len = this.mood === 'boss' ? 3.2 : 9;
      for (const n of [a, b, a - 12]) {
        const o = c.createOscillator(); o.type = s.pad; o.frequency.value = s.root * Math.pow(2, n / 12) * 0.5; o.detune.value = (Math.random() - 0.5) * 14;
        const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = s.bright;
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(this.mood === 'boss' ? 0.09 : 0.07, now + len * 0.35); g.gain.linearRampToValueAtTime(0.0001, now + len);
        o.connect(f); f.connect(g); g.connect(this.music); o.start(now); o.stop(now + len + 0.1);
      }
      this.nextPad = now + len * 0.8;
    }
    if (now >= this.nextNote) {
      this.step++;
      const boss = this.mood === 'boss';
      if (boss || Math.random() < 0.62) {
        const n = boss ? s.notes[[0, 0, 3, 0, 4, 0, 2, 5][this.step % 8]] - (this.step % 2 ? 0 : 12) : s.notes[(Math.random() * s.notes.length) | 0] + (Math.random() < 0.25 ? 12 : 0);
        this.tone(s.root * Math.pow(2, n / 12), boss ? 0.22 : 1.6, boss ? 0.16 : 0.09, boss ? 'square' : 'triangle', 1, 0, 0.01, this.music);
        if (boss && this.step % 2 === 0) this.burst(90, 1, 0.14, 0.5, 'lowpass', 0.5, 0, this.music);
      }
      this.nextNote = now + s.tempo * (boss ? 1 : 0.6 + Math.random() * 0.9);
    }
  }
}
