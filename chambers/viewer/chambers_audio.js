/**
 * Web Audio Chamber Synthesizer & 2 Hz Helmholtz Pulse Drum
 * Strictly user-triggered (WCAG 1.4.2 compliant).
 */

export class ChambersAudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.convolver = null;
    this.dry = null;
    this.wet = null;
    this.bus = null;

    this.pitchHz = 109.8;
    this.vol = 0.65;
    this.passageGain = 1.0;

    this.toneNode = null;
    this.chantNodes = null;
    this.pulseTimer = null;
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.bus = this.ctx.createGain();
      this.dry = this.ctx.createGain();
      this.wet = this.ctx.createGain();
      this.master = this.ctx.createGain();

      // Synthetic smooth stone-chamber impulse (~1.5 s)
      const len = Math.floor(1.5 * this.ctx.sampleRate);
      const ir = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) {
          const t = i / this.ctx.sampleRate;
          d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 3.8);
        }
      }
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = ir;

      this.dry.gain.value = 0.45;
      this.wet.gain.value = 0.65;
      this.bus.connect(this.dry);
      this.bus.connect(this.convolver);
      this.convolver.connect(this.wet);
      this.dry.connect(this.master);
      this.wet.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.setVolume(this.vol);
    }
    if (this.ctx.state === "suspended") return this.ctx.resume();
    return Promise.resolve();
  }

  setVolume(v) {
    this.vol = Math.max(0, Math.min(1, v));
    if (this.master) {
      this.master.gain.setTargetAtTime(this.vol * 0.75 * this.passageGain, this.ctx.currentTime, 0.02);
    }
  }

  setPassageGainFromDb(splDb) {
    // Map [-38 dB .. 0 dB] cleanly to [0.15 .. 1.0] audible amplitude when walking passage
    const lin = Math.max(0.15, Math.min(1.0, Math.pow(10, splDb / 40)));
    this.passageGain = lin;
    if (this.master) {
      this.master.gain.setTargetAtTime(this.vol * 0.75 * this.passageGain, this.ctx.currentTime, 0.03);
    }
  }

  setPitch(hz) {
    this.pitchHz = hz;
    const t = this.ctx?.currentTime ?? 0;
    if (this.toneNode) this.toneNode.osc.frequency.setTargetAtTime(hz, t, 0.03);
    if (this.chantNodes) {
      this.chantNodes.o1.frequency.setTargetAtTime(hz, t, 0.03);
      this.chantNodes.o2.frequency.setTargetAtTime(hz * 2, t, 0.03);
    }
  }

  async toggleTone() {
    await this._ensure();
    if (this.toneNode) {
      this.stopTone();
      return false;
    }
    this.stopChant();
    this.stopPulse();

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = this.pitchHz;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.32, this.ctx.currentTime + 0.08);
    osc.connect(g);
    g.connect(this.bus);
    osc.start();
    this.toneNode = { osc, g };
    return true;
  }

  stopTone() {
    if (!this.toneNode) return;
    const { osc, g } = this.toneNode;
    const t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0.0001, t, 0.04);
    osc.stop(t + 0.16);
    this.toneNode = null;
  }

  async toggleChant() {
    await this._ensure();
    if (this.chantNodes) {
      this.stopChant();
      return false;
    }
    this.stopTone();
    this.stopPulse();

    const t = this.ctx.currentTime;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    o1.type = "sawtooth";
    o2.type = "triangle";
    o1.frequency.value = this.pitchHz;
    o2.frequency.value = this.pitchHz * 2;

    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.frequency.value = 4.5;
    lg.gain.value = 1.3;
    lfo.connect(lg);
    lg.connect(o1.frequency);

    const f1 = this.ctx.createBiquadFilter();
    f1.type = "bandpass";
    f1.frequency.value = 470;
    f1.Q.value = 4.5;
    const f2 = this.ctx.createBiquadFilter();
    f2.type = "bandpass";
    f2.frequency.value = 910;
    f2.Q.value = 6.0;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.2);

    o1.connect(f1); o1.connect(f2); o2.connect(f1);
    f1.connect(g); f2.connect(g);
    g.connect(this.bus);
    o1.start(); o2.start(); lfo.start();
    this.chantNodes = { o1, o2, lfo, g };
    return true;
  }

  stopChant() {
    if (!this.chantNodes) return;
    const { o1, o2, lfo, g } = this.chantNodes;
    const t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0.0001, t, 0.06);
    o1.stop(t + 0.22);
    o2.stop(t + 0.22);
    lfo.stop(t + 0.22);
    this.chantNodes = null;
  }

  _strikeDrum() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(98.0, t);
    osc.frequency.exponentialRampToValueAtTime(48.0, t + 0.14);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  async togglePulse2Hz() {
    await this._ensure();
    if (this.pulseTimer) {
      this.stopPulse();
      return false;
    }
    this.stopTone();
    this.stopChant();
    this._strikeDrum();
    // 2.00 Hz = 500 ms interval (Watson & Keating 1998 Maeshowe drum experiment)
    this.pulseTimer = setInterval(() => this._strikeDrum(), 500);
    return true;
  }

  stopPulse() {
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
  }

  stopAll() {
    this.stopTone();
    this.stopChant();
    this.stopPulse();
  }
}
