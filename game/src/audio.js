'use strict';
/* Copper Coast Air Rally — audio.js
   All sound is synthesised live with WebAudio: engine drone, wind,
   ring chimes and impacts. No audio files, no network, nothing to load.
   Every call is guarded so a browser without audio (or a headless
   screenshot run) simply stays silent instead of throwing. */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.windGain = null;
    this.muted = false;
    this.started = false;
  }

  /* Must be called from a user gesture at least once. */
  unlock() {
    if (this.started) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);

      /* Engine: two detuned sawtooths through a low-pass, like a prop. */
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 62;
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'sawtooth';
      this.engineOsc2.frequency.value = 93;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engineOsc.connect(filter);
      this.engineOsc2.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc.start();
      this.engineOsc2.start();

      /* Wind: looped noise buffer through a band-pass. */
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.0;
      noise.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.master);
      noise.start();
      this.started = true;
    } catch (e) {
      this.ctx = null;
    }
  }

  /* Called every frame while flying: drone follows throttle, wind follows speed. */
  update(throttle, speedKts, flying) {
    if (!this.ctx || !this.started) return;
    try {
      const t = this.ctx.currentTime;
      const target = flying ? 0.05 + throttle * 0.075 : 0.0;
      this.engineGain.gain.setTargetAtTime(target, t, 0.1);
      const freq = 52 + throttle * 58 + speedKts * 0.12;
      this.engineOsc.frequency.setTargetAtTime(freq, t, 0.1);
      this.engineOsc2.frequency.setTargetAtTime(freq * 1.5, t, 0.1);
      const wind = flying ? Math.min(0.12, speedKts / 240 * 0.12) : 0;
      this.windGain.gain.setTargetAtTime(wind, t, 0.2);
    } catch (e) { /* audio is decoration, never fatal */ }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    return this.muted;
  }

  /* A short two-note chime, pitched up for a perfect centre pass. */
  ringChime(perfect) {
    if (!this.ctx || !this.started) return;
    try {
      const base = perfect ? 880 : 660;
      [0, 0.09].forEach((delay, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = base * (i === 0 ? 1 : 1.5);
        const g = this.ctx.createGain();
        const t0 = this.ctx.currentTime + delay;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.28, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t0);
        osc.stop(t0 + 0.5);
      });
    } catch (e) { /* ignore */ }
  }

  /* Low thud for a crash, soft double-tap for a good touchdown. */
  thud(hard) {
    if (!this.ctx || !this.started) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hard ? 90 : 140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(38, this.ctx.currentTime + (hard ? 0.5 : 0.25));
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(hard ? 0.6 : 0.3, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + (hard ? 0.6 : 0.3));
      osc.connect(g);
      g.connect(this.master);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.7);
    } catch (e) { /* ignore */ }
  }

  /* Short warning beep for low fuel / pull-up. */
  warn() {
    if (!this.ctx || !this.started) return;
    try {
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 520;
      const g = this.ctx.createGain();
      const t0 = this.ctx.currentTime;
      g.gain.setValueAtTime(0.12, t0);
      g.gain.setValueAtTime(0.0001, t0 + 0.12);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + 0.14);
    } catch (e) { /* ignore */ }
  }
}
