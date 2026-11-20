/* ЗВУК: синтез через WebAudio */
(function () {
  const Audio = { ctx: null, muted: false, master: null };

  Audio.init = function () {
    if (Audio.ctx) return;
    try {
      Audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      Audio.master = Audio.ctx.createGain();
      Audio.master.gain.value = 0.5;
      Audio.master.connect(Audio.ctx.destination);
    } catch (e) { console.warn('audio off', e); }
  };

  Audio.resume = function () {
    if (!Audio.ctx) Audio.init();
    if (Audio.ctx && Audio.ctx.state === 'suspended') Audio.ctx.resume();
  };

  function noiseBuffer(dur) {
    const c = Audio.ctx, len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    return buf;
  }

  function noise(dur, freq, q, gain, type) {
    const c = Audio.ctx;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(dur);
    const f = c.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = freq;
    f.Q.value = q || 1;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(Audio.master);
    src.start();
    src.stop(c.currentTime + dur);
  }

  function tone(freq, dur, type, gain, slide) {
    const c = Audio.ctx;
    const o = c.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), c.currentTime + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain || 0.12, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(Audio.master);
    o.start(); o.stop(c.currentTime + dur);
  }

  Audio.play = function (name, v) {
    if (Audio.muted) return;
    if (!Audio.ctx) Audio.init();
    if (!Audio.ctx) return;
    v = v == null ? 1 : v;
    try {
      switch (name) {
        case 'boom': noise(0.55, 220 + v * 200, 1, 0.5 * v); tone(90, 0.35, 'sine', 0.25 * v, 40); break;
        case 'nuke': noise(2.4, 160, 1, 0.7); tone(60, 1.6, 'sine', 0.4, 25); tone(120, 1.2, 'triangle', 0.2, 30); break;
        case 'click': tone(660, 0.05, 'square', 0.05); break;
        case 'deploy': tone(420, 0.1, 'triangle', 0.1, 660); break;
        case 'artillery': noise(0.3, 500, 1, 0.35); tone(120, 0.2, 'sine', 0.18, 60); break;
        case 'jet': noise(0.9, 1600, 2, 0.16, 'bandpass'); break;
        case 'launch': tone(200, 0.6, 'sawtooth', 0.1, 900); noise(0.6, 900, 1, 0.12); break;
        case 'alarm': tone(440, 0.5, 'square', 0.07, 660); setTimeout(() => tone(440, 0.5, 'square', 0.07, 660), 550); break;
        case 'chime': tone(880, 0.3, 'sine', 0.08); setTimeout(() => tone(1320, 0.4, 'sine', 0.06), 90); break;
        case 'horn': tone(180, 0.7, 'sawtooth', 0.09, 120); break;
        case 'rumble': noise(1.6, 120, 1, 0.5); break;
        case 'wave': noise(1.2, 700, 1, 0.3, 'bandpass'); break;
        case 'fire': noise(0.8, 900, 1, 0.2, 'bandpass'); break;
        case 'wind': noise(1.8, 500, 2, 0.18, 'bandpass'); break;
        default: tone(520, 0.06, 'sine', 0.05);
      }
    } catch (e) { /* ignore */ }
  };

  Audio.toggle = function () {
    Audio.muted = !Audio.muted;
    if (Audio.master) Audio.master.gain.value = Audio.muted ? 0 : 0.5;
    return Audio.muted;
  };

  window.Audio = Audio;
  window.App = window.App || {};
  window.App.audio = Audio;
})();
