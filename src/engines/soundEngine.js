// =========================================================================
// PROCEDURAL WEB AUDIO API SYNTHESIZER
// =========================================================================
const MUSIC_TRACKS = [
  new URL('../assets/music/soundtrack1.wav', import.meta.url).href,
  new URL('../assets/music/soundtrack2.wav', import.meta.url).href,
  new URL('../assets/music/soundtrack3.wav', import.meta.url).href,
  new URL('../assets/music/soundtrack4.wav', import.meta.url).href
];

export class SoundEngine {
  constructor() {
    this.ctx = null;
    this._muted = false;
    this.noiseBuf = null;

    // Background music playlist
    this.tracks = MUSIC_TRACKS;
    this.trackIndex = 0;
    this.musicVolume = 0.28;
    this.bgm = null;
    this.musicStarted = false;
  }

  get muted() {
    return this._muted;
  }

  set muted(val) {
    this._muted = Boolean(val);
    if (this.bgm) {
      this.bgm.muted = this._muted;
      if (!this._muted && this.musicStarted && this.bgm.paused) {
        this.bgm.play().catch(() => {});
      }
    }
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.ctx = new AC();
        const len = Math.floor(this.ctx.sampleRate * 0.25);
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.startMusic();
  }

  startMusic() {
    if (typeof Audio === 'undefined' || this.tracks.length === 0) return;
    if (!this.bgm) {
      this.bgm = new Audio(this.tracks[this.trackIndex]);
      this.bgm.volume = this.musicVolume;
      this.bgm.muted = this._muted;
      this.bgm.preload = 'auto';
      this.bgm.addEventListener('ended', () => this.nextTrack());
    }
    this.musicStarted = true;
    if (!this._muted && this.bgm.paused) {
      this.bgm.play().catch(() => {});
    }
  }

  nextTrack() {
    if (!this.bgm || this.tracks.length === 0) return;
    this.trackIndex = (this.trackIndex + 1) % this.tracks.length;
    this.bgm.src = this.tracks[this.trackIndex];
    this.bgm.currentTime = 0;
    if (!this._muted) {
      this.bgm.play().catch(() => {});
    }
  }

  tone(freq, dur, type = 'triangle', gainVal = 0.14, delay = 0, freqEnd = null) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + dur);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  noise(dur, filterFreq = 1200, q = 2.0, gainVal = 0.12, delay = 0) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx || !this.noiseBuf) return;
    const now = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(filterFreq, now);
    filt.Q.setValueAtTime(q, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filt);
    filt.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(now);
    src.stop(now + dur + 0.02);
  }

  click() {
    this.tone(520, 0.045, 'triangle', 0.08, 0, 320);
  }

  dieSelect(selected) {
    if (selected) {
      this.tone(390, 0.075, 'triangle', 0.12, 0, 620);
    } else {
      this.tone(360, 0.075, 'triangle', 0.09, 0, 220);
    }
  }

  diceRoll(count = 5) {
    const hits = Math.min(8, Math.max(3, count + 2));
    for (let i = 0; i < hits; i++) {
      const d = i * 0.05 + Math.random() * 0.025;
      const f = 750 + Math.random() * 900;
      this.noise(0.045, f, 3.2, 0.11 - i * 0.008, d);
      this.tone(210 + Math.random() * 140, 0.04, 'triangle', 0.07, d, 110);
    }
  }

  cardSnap() {
    this.noise(0.04, 1900, 1.8, 0.09, 0);
    this.tone(440, 0.06, 'sine', 0.08, 0, 580);
  }

  buyCard() {
    this.tone(660, 0.09, 'triangle', 0.13, 0);
    this.tone(880, 0.12, 'triangle', 0.13, 0.065);
    this.tone(1320, 0.18, 'sine', 0.11, 0.12);
  }

  sellCard() {
    this.tone(1180, 0.08, 'sine', 0.12, 0);
    this.tone(1560, 0.14, 'triangle', 0.11, 0.055);
  }

  error() {
    this.tone(155, 0.14, 'sawtooth', 0.08, 0, 115);
  }

  scoreStep(stepIdx, kind) {
    // Escalating pentatonic pitch ladder
    const semis = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33, 36];
    const semi = semis[Math.min(semis.length - 1, stepIdx)];
    const baseFreq = 392 * Math.pow(2, semi / 12);

    if (kind === 'chips') {
      this.tone(baseFreq, 0.13, 'triangle', 0.13, 0);
      this.tone(baseFreq * 2, 0.09, 'sine', 0.06, 0.015);
    } else if (kind === 'mult') {
      this.tone(baseFreq * 0.9, 0.16, 'sawtooth', 0.07, 0);
      this.tone(baseFreq * 1.25, 0.16, 'triangle', 0.12, 0.01);
    } else if (kind === 'xmult') {
      this.tone(baseFreq, 0.22, 'sawtooth', 0.08, 0, baseFreq * 1.15);
      this.tone(baseFreq * 1.5, 0.24, 'triangle', 0.14, 0.02);
      this.tone(baseFreq * 2, 0.26, 'sine', 0.10, 0.04);
    } else if (kind === 'money') {
      this.tone(1318, 0.09, 'sine', 0.11, 0);
      this.tone(1760, 0.14, 'triangle', 0.11, 0.055);
    } else if (kind === 'retrigger') {
      this.tone(540, 0.06, 'square', 0.06, 0, 720);
      this.tone(720, 0.07, 'triangle', 0.09, 0.045);
    } else if (kind === 'debuff') {
      this.tone(140, 0.16, 'sawtooth', 0.09, 0, 95);
    } else {
      this.tone(baseFreq, 0.12, 'triangle', 0.11, 0);
    }
  }

  totalSlam(beatTarget) {
    this.tone(110, 0.28, 'sine', 0.22, 0, 48);
    this.noise(0.11, 420, 1.2, 0.14, 0);
    if (beatTarget) {
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((f, i) => {
        this.tone(f, 0.34, 'triangle', 0.12, 0.05 + i * 0.055);
      });
    } else {
      this.tone(330, 0.16, 'triangle', 0.12, 0.04, 392);
    }
  }

  scoreTick() {
    this.tone(780 + Math.random() * 140, 0.025, 'sine', 0.04, 0);
  }

  bossIntro() {
    this.tone(130.81, 0.45, 'sawtooth', 0.09, 0, 123.47);
    this.tone(155.56, 0.45, 'triangle', 0.10, 0.08);
    this.tone(196.0, 0.55, 'sawtooth', 0.08, 0.16, 185.0);
  }

  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((f, i) => {
      this.tone(f, 0.42, 'triangle', 0.12, i * 0.08);
      this.tone(f * 0.5, 0.36, 'sine', 0.07, i * 0.08);
    });
  }

  gameOver() {
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((f, i) => {
      this.tone(f, 0.35, 'sawtooth', 0.07, i * 0.12, f * 0.94);
    });
  }
}

export const sfx = new SoundEngine();
