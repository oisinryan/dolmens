/**
 * Web Audio Auralization Engine for Newgrange Acoustic 3D Model
 * Uses 48 kHz stereo hybrid IRs (3D FDTD + Ray-Trace) inside ConvolverNode.
 * Strictly user-triggered (no autoplay, WCAG 1.4.2 compliant).
 */

export class NewgrangeAudioEngine {
  constructor() {
    this.ctx = null;
    this.convolver = null;
    this.dryGain = null;
    this.wetGain = null;
    this.masterGain = null;
    this.sourceBus = null;

    this.irCache = new Map();
    this.activeStation = "chamber_center";
    this.wetRatio = 0.85;
    this.masterLevel = 0.70;
    this.pitchHz = 105.4;

    this.toneNodes = null;
    this.chantNodes = null;
    this.sweepTimer = null;
    this.micStream = null;
    this.micSource = null;
  }

  _ensureCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ sampleRate: 48000 });
      this.sourceBus = this.ctx.createGain();
      this.dryGain = this.ctx.createGain();
      this.wetGain = this.ctx.createGain();
      this.convolver = this.ctx.createConvolver();
      this.convolver.normalize = true;

      const limiter = this.ctx.createDynamicsCompressor();
      limiter.threshold.value = -2.0;
      limiter.knee.value = 6.0;
      limiter.ratio.value = 12.0;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.12;

      this.masterGain = this.ctx.createGain();

      this.sourceBus.connect(this.dryGain);
      this.sourceBus.connect(this.convolver);
      this.convolver.connect(this.wetGain);
      this.dryGain.connect(limiter);
      this.wetGain.connect(limiter);
      limiter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.setWetMix(this.wetRatio);
      this.setMasterVolume(this.masterLevel);
    }
    if (this.ctx.state === "suspended") {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }

  async loadIR(stationKey, wavUrl) {
    this.activeStation = stationKey;
    await this._ensureCtx();
    if (this.irCache.has(stationKey)) {
      this.convolver.buffer = this.irCache.get(stationKey);
      return;
    }
    const resp = await fetch(wavUrl);
    const arr = await resp.arrayBuffer();
    const decoded = await this.ctx.decodeAudioData(arr);
    this.irCache.set(stationKey, decoded);
    if (this.activeStation === stationKey) {
      this.convolver.buffer = decoded;
    }
  }

  setWetMix(ratio) {
    this.wetRatio = Math.max(0, Math.min(1, ratio));
    if (!this.dryGain || !this.wetGain) return;
    const t = this.ctx.currentTime;
    this.dryGain.gain.setTargetAtTime(Math.cos(this.wetRatio * Math.PI * 0.5), t, 0.02);
    this.wetGain.gain.setTargetAtTime(Math.sin(this.wetRatio * Math.PI * 0.5), t, 0.02);
  }

  setMasterVolume(level) {
    this.masterLevel = Math.max(0, Math.min(1, level));
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(this.masterLevel * 0.85, this.ctx.currentTime, 0.02);
  }

  setPitch(hz) {
    this.pitchHz = hz;
    const t = this.ctx?.currentTime ?? 0;
    if (this.toneNodes) {
      this.toneNodes.osc.frequency.setTargetAtTime(hz, t, 0.03);
    }
    if (this.chantNodes) {
      this.chantNodes.osc1.frequency.setTargetAtTime(hz, t, 0.04);
      this.chantNodes.osc2.frequency.setTargetAtTime(hz * 2.0, t, 0.04);
    }
  }

  async toggleTone(wavUrl) {
    await this._ensureCtx();
    if (!this.convolver.buffer) await this.loadIR(this.activeStation, wavUrl);
    if (this.toneNodes) {
      this.stopTone();
      return false;
    }
    this.stopSweep();
    this.stopChant();

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = this.pitchHz;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.28, this.ctx.currentTime + 0.08);
    osc.connect(g);
    g.connect(this.sourceBus);
    osc.start();
    this.toneNodes = { osc, gain: g };
    return true;
  }

  stopTone() {
    if (!this.toneNodes) return;
    const { osc, gain } = this.toneNodes;
    const t = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0.0001, t, 0.04);
    osc.stop(t + 0.18);
    this.toneNodes = null;
  }

  async toggleChant(wavUrl) {
    await this._ensureCtx();
    if (!this.convolver.buffer) await this.loadIR(this.activeStation, wavUrl);
    if (this.chantNodes) {
      this.stopChant();
      return false;
    }
    this.stopTone();
    this.stopSweep();

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = "sawtooth";
    osc2.type = "triangle";
    osc1.frequency.value = this.pitchHz;
    osc2.frequency.value = this.pitchHz * 2.0;

    // Subtle vocal vibrato
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 4.6;
    lfoGain.gain.value = 1.4;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    // Two throat/vowel formants ("Omm" / deep baritone vowel)
    const f1 = this.ctx.createBiquadFilter();
    f1.type = "bandpass";
    f1.frequency.value = 480;
    f1.Q.value = 4.5;

    const f2 = this.ctx.createBiquadFilter();
    f2.type = "bandpass";
    f2.frequency.value = 920;
    f2.Q.value = 6.0;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.25);

    osc1.connect(f1);
    osc1.connect(f2);
    osc2.connect(f1);
    f1.connect(g);
    f2.connect(g);
    g.connect(this.sourceBus);

    osc1.start();
    osc2.start();
    lfo.start();
    this.chantNodes = { osc1, osc2, lfo, gain: g };
    return true;
  }

  stopChant() {
    if (!this.chantNodes) return;
    const { osc1, osc2, lfo, gain } = this.chantNodes;
    const t = this.ctx.currentTime;
    gain.gain.setTargetAtTime(0.0001, t, 0.08);
    osc1.stop(t + 0.25);
    osc2.stop(t + 0.25);
    lfo.stop(t + 0.25);
    this.chantNodes = null;
  }

  async toggleSweep(wavUrl, onFreqStep, onFinished) {
    await this._ensureCtx();
    if (!this.convolver.buffer) await this.loadIR(this.activeStation, wavUrl);
    if (this.sweepTimer) {
      this.stopSweep();
      return false;
    }
    this.stopTone();
    this.stopChant();

    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    const t0 = this.ctx.currentTime;
    const dur = 8.0;
    osc.frequency.setValueAtTime(40.0, t0);
    osc.frequency.exponentialRampToValueAtTime(220.0, t0 + dur);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.12);
    g.gain.setValueAtTime(0.28, t0 + dur - 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g);
    g.connect(this.sourceBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);

    const startMs = performance.now();
    this.sweepTimer = setInterval(() => {
      const elapsed = (performance.now() - startMs) * 0.001;
      if (elapsed >= dur) {
        this.stopSweep();
        onFinished?.();
        return;
      }
      const fNow = 40.0 * Math.pow(220.0 / 40.0, elapsed / dur);
      onFreqStep?.(fNow);
    }, 50);

    this._sweepOsc = osc;
    this._sweepGain = g;
    return true;
  }

  stopSweep() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    if (this._sweepOsc) {
      try {
        this._sweepGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
        this._sweepOsc.stop(this.ctx.currentTime + 0.1);
      } catch (_) {}
      this._sweepOsc = null;
    }
  }

  async playClap(wavUrl) {
    await this._ensureCtx();
    if (!this.convolver.buffer) await this.loadIR(this.activeStation, wavUrl);
    const len = Math.floor(0.018 * this.ctx.sampleRate);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (0.003 * this.ctx.sampleRate));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.90;
    src.connect(g);
    g.connect(this.sourceBus);
    src.start();
  }

  async playDrum(wavUrl) {
    await this._ensureCtx();
    if (!this.convolver.buffer) await this.loadIR(this.activeStation, wavUrl);
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(125.0, t);
    osc.frequency.exponentialRampToValueAtTime(54.0, t + 0.14);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.65, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

    osc.connect(g);
    g.connect(this.sourceBus);
    osc.start(t);
    osc.stop(t + 0.30);
  }

  async toggleMic(wavUrl) {
    await this._ensureCtx();
    if (!this.convolver.buffer) await this.loadIR(this.activeStation, wavUrl);
    if (this.micStream) {
      this.stopMic();
      return false;
    }
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.micSource = this.ctx.createMediaStreamSource(this.micStream);
    this.micSource.connect(this.sourceBus);
    return true;
  }

  stopMic() {
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
  }

  stopAll() {
    this.stopTone();
    this.stopChant();
    this.stopSweep();
    this.stopMic();
  }
}
