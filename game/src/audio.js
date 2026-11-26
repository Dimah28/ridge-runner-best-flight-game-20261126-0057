// audio.js — engine hum and wind, synthesized with WebAudio oscillators.
// No audio files: everything is built after the player's first gesture.
export function makeAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windGain = null;
  let started = false;

  function start() {
    if (started) return;
    started = true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Engine: two detuned saws through a lowpass, pitch follows throttle.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 52;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 104;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      engineOsc2.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      engineOsc2.start();
      // Wind: looped noise through a bandpass, level follows airspeed.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      noise.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 700;
      band.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(band);
      band.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();
    } catch (e) {
      ctx = null;
    }
  }

  function update(throttle, speed, flying) {
    if (!ctx || !started) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const on = flying ? 1 : 0;
    engineGain.gain.setTargetAtTime(on * (0.02 + throttle * 0.075), t, 0.1);
    engineOsc.frequency.setTargetAtTime(48 + throttle * 62, t, 0.1);
    engineOsc2.frequency.setTargetAtTime(96 + throttle * 124, t, 0.1);
    windGain.gain.setTargetAtTime(on * Math.min(0.09, speed * 0.00032), t, 0.15);
  }

  return { start, update };
}
