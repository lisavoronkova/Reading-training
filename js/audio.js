/*
 * Озвучка через синтез речи браузера и короткие звуки «дзынь» / «бум».
 */
(function (root) {
  'use strict';

  var synth = root.speechSynthesis;
  var supported = !!(synth && root.SpeechSynthesisUtterance);
  var PREFERRED = ['Milena', 'Google русский', 'Svetlana', 'Dariya', 'Alena', 'Irina', 'Yuri', 'Pavel'];

  var Speech = {
    supported: supported,
    voice: null,
    voiceURI: null,
    rate: 0.85,
    listeners: [],

    voices: function () {
      if (!supported) return [];
      try {
        return synth.getVoices().filter(function (v) { return /^ru/i.test(v.lang); });
      } catch (e) { return []; }
    },

    choose: function (uri) {
      var list = this.voices();
      var v = null;
      var i;
      for (i = 0; i < list.length && !v; i++) if (list[i].voiceURI === uri) v = list[i];
      for (var p = 0; p < PREFERRED.length && !v; p++) {
        for (i = 0; i < list.length; i++) {
          if (list[i].name.indexOf(PREFERRED[p]) >= 0) { v = list[i]; break; }
        }
      }
      this.voice = v || list[0] || null;
      this.voiceURI = this.voice ? this.voice.voiceURI : null;
      return this.voice;
    },

    init: function (uri, rate) {
      var self = this;
      if (typeof rate === 'number') this.rate = rate;
      if (!supported) return;
      this.choose(uri);
      var refresh = function () {
        self.choose(uri || self.voiceURI);
        self.listeners.forEach(function (fn) { fn(); });
      };
      if (synth.addEventListener) synth.addEventListener('voiceschanged', refresh);
      else synth.onvoiceschanged = refresh;
    },

    onVoices: function (fn) { this.listeners.push(fn); },

    stop: function () { if (supported) { try { synth.cancel(); } catch (e) { /* нет звука — не страшно */ } } },

    /* Возвращает обещание, которое выполняется, когда фраза договорена (или по таймауту). */
    say: function (text, opts) {
      opts = opts || {};
      if (!supported || !text) return Promise.resolve();
      var self = this;
      return new Promise(function (resolve) {
        var done = false;
        var finish = function () { if (!done) { done = true; resolve(); } };
        try {
          if (opts.interrupt !== false) synth.cancel();
          if (synth.paused) synth.resume();
          var u = new root.SpeechSynthesisUtterance(text);
          u.lang = 'ru-RU';
          if (self.voice) u.voice = self.voice;
          u.rate = Math.max(0.4, Math.min(1.6, self.rate * (opts.rateMul || 1)));
          u.pitch = opts.pitch || 1;
          u.onend = finish;
          u.onerror = finish;
          synth.speak(u);
          setTimeout(finish, Math.min(9000, 1200 + text.length * 140 / u.rate));
        } catch (e) {
          finish();
        }
      });
    }
  };

  /* ---------- звуковые эффекты: всё синтезируется, файлов нет ---------- */

  var ctx = null;
  var master = null;
  var noiseBuf = null;

  function now() { return ctx.currentTime; }

  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function osc(type, f0, f1, t, dur, peak, attack, dest) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, attack || 0.01, dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + (attack || 0.01) + dur + 0.05);
    return o;
  }

  function noise(t, dur, peak, filterType, f0, f1, q) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var f = ctx.createBiquadFilter();
    f.type = filterType || 'bandpass';
    f.frequency.setValueAtTime(f0 || 1200, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    f.Q.value = q || 1;
    var g = ctx.createGain();
    env(g, t, peak, 0.005, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  function bell(f, t, peak, dur) {
    osc('sine', f, f, t, dur || 0.6, peak, 0.005);
    osc('sine', f * 2.01, f * 2.01, t, (dur || 0.6) * 0.5, peak * 0.35, 0.005);
  }

  var NOTE = function (n) { return 440 * Math.pow(2, (n - 69) / 12); };

  var Sfx = {
    enabled: true,
    unlock: function () {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      try {
        ctx = new AC();
        var comp = ctx.createDynamicsCompressor();
        master = ctx.createGain();
        master.gain.value = 0.9;
        master.connect(comp); comp.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        var d = noiseBuf.getChannelData(0);
        for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; }
    },
    ready: function () { return this.enabled && ctx && ctx.state === 'running'; },

    tap: function () { if (!this.ready()) return; osc('sine', 700, 500, now(), 0.06, 0.12); },
    pop: function () {
      if (!this.ready()) return;
      var t = now();
      noise(t, 0.08, 0.5, 'highpass', 900, 3000);
      osc('sine', 900, 180, t, 0.09, 0.3);
    },
    whoosh: function () { if (!this.ready()) return; noise(now(), 0.38, 0.22, 'bandpass', 350, 2400, 0.8); },
    chomp: function () {
      if (!this.ready()) return;
      var t = now();
      [0, 0.16, 0.32].forEach(function (d) {
        noise(t + d, 0.07, 0.35, 'lowpass', 900, 300);
        osc('sine', 160, 90, t + d, 0.07, 0.25);
      });
    },
    yuck: function () {
      if (!this.ready()) return;
      var t = now();
      var o = ctx.createOscillator();
      var lfo = ctx.createOscillator();
      var lfoGain = ctx.createGain();
      var f = ctx.createBiquadFilter();
      var g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.5);
      lfo.frequency.value = 18; lfoGain.gain.value = 25;
      lfo.connect(lfoGain); lfoGain.connect(o.frequency);
      f.type = 'lowpass'; f.frequency.value = 1100;
      env(g, t, 0.18, 0.02, 0.5);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); lfo.start(t); o.stop(t + 0.6); lfo.stop(t + 0.6);
    },
    scuttle: function () {
      if (!this.ready()) return;
      var t = now();
      for (var i = 0; i < 9; i++) noise(t + i * 0.045, 0.02, 0.18, 'highpass', 2500);
    },
    right: function () {
      if (!this.ready()) return;
      var t = now();
      bell(NOTE(84), t, 0.22, 0.5);
      bell(NOTE(88), t + 0.09, 0.2, 0.6);
    },
    wrong: function () {
      if (!this.ready()) return;
      var t = now();
      osc('triangle', 330, 300, t, 0.14, 0.2);
      osc('triangle', 247, 220, t + 0.16, 0.22, 0.2);
    },
    sparkle: function () {
      if (!this.ready()) return;
      var t = now();
      [91, 95, 98, 103, 107].forEach(function (n, i) { bell(NOTE(n), t + i * 0.055, 0.1, 0.35); });
    },
    star: function (i) {
      if (!this.ready()) return;
      bell(NOTE([84, 88, 91][Math.min(2, i || 0)]), now(), 0.25, 0.8);
    },
    fanfare: function () {
      if (!this.ready()) return;
      var t = now();
      [72, 76, 79].forEach(function (n, i) { osc('triangle', NOTE(n), NOTE(n), t + i * 0.12, 0.16, 0.18); });
      [72, 76, 79, 84].forEach(function (n) { osc('triangle', NOTE(n), NOTE(n), t + 0.4, 0.7, 0.12, 0.02); });
      bell(NOTE(96), t + 0.42, 0.12, 0.9);
    },
    gift: function () {
      if (!this.ready()) return;
      var t = now();
      for (var i = 0; i < 10; i++) noise(t + i * 0.05 * (1 - i * 0.05), 0.04, 0.2, 'bandpass', 220, 0, 2);
      [79, 84, 88, 91].forEach(function (n, k) { bell(NOTE(n), t + 0.5 + k * 0.06, 0.16, 0.7); });
    },
    clack: function () {
      if (!this.ready()) return;
      var t = now();
      noise(t, 0.04, 0.4, 'bandpass', 1800, 0, 3);
      osc('sine', 220, 160, t, 0.05, 0.25);
    },
    train: function () {
      if (!this.ready()) return;
      var t = now();
      [0, 0.22, 0.44, 0.6].forEach(function (d) { noise(t + d, 0.12, 0.3, 'bandpass', 500, 300, 0.7); });
      osc('sine', NOTE(81), NOTE(81), t + 0.8, 0.45, 0.12, 0.03);
      osc('sine', NOTE(85), NOTE(85), t + 0.8, 0.45, 0.12, 0.03);
    },
    unlock2: function () {
      if (!this.ready()) return;
      var t = now();
      osc('sine', 400, 1400, t, 0.35, 0.15);
      this.sparkle();
    },

    /* ---------- музыкальная шкатулка для меню ---------- */
    music: { on: true, playing: false, timer: null, step: 0, nextTime: 0, gain: null, duck: 1 },
    MELODY: [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 81, 84, 81, 79, 76, 0,
             74, 76, 79, 76, 74, 72, 74, 76, 79, 76, 74, 72, 72, 0, 0, 0],
    BASS: [48, 45, 41, 43, 48, 45, 43, 48],
    startMusic: function () {
      var m = this.music;
      if (!m.on || m.playing || !this.ready()) return;
      m.playing = true;
      m.gain = ctx.createGain();
      m.gain.gain.value = 0.0001;
      m.gain.gain.exponentialRampToValueAtTime(0.5 * m.duck, now() + 1);
      m.gain.connect(master);
      m.step = 0;
      m.nextTime = now() + 0.1;
      var self = this;
      var beat = 60 / 104;
      m.timer = setInterval(function () {
        while (m.nextTime < now() + 0.25) {
          var n = self.MELODY[m.step % self.MELODY.length];
          if (n) {
            osc('sine', NOTE(n), NOTE(n), m.nextTime, 1.1, 0.09, 0.004, m.gain);
            osc('sine', NOTE(n + 12), NOTE(n + 12), m.nextTime, 0.4, 0.025, 0.004, m.gain);
          }
          if (m.step % 4 === 0) {
            var b = self.BASS[Math.floor(m.step / 4) % self.BASS.length];
            osc('sine', NOTE(b), NOTE(b), m.nextTime, 1.6, 0.06, 0.02, m.gain);
          }
          m.step++;
          m.nextTime += beat;
        }
      }, 80);
    },
    stopMusic: function () {
      var m = this.music;
      if (!m.playing) return;
      m.playing = false;
      clearInterval(m.timer);
      var g = m.gain;
      try {
        g.gain.cancelScheduledValues(now());
        g.gain.setValueAtTime(g.gain.value, now());
        g.gain.exponentialRampToValueAtTime(0.0001, now() + 0.4);
      } catch (e) { /* ничего страшного */ }
      setTimeout(function () { try { g.disconnect(); } catch (e) { /* уже отключено */ } }, 600);
    },
    duckMusic: function (on) {
      var m = this.music;
      m.duck = on ? 0.25 : 1;
      if (m.playing && m.gain) {
        m.gain.gain.cancelScheduledValues(now());
        m.gain.gain.setTargetAtTime(0.5 * m.duck, now(), 0.15);
      }
    }
  };

  root.Speech = Speech;
  root.Sfx = Sfx;
})(typeof self !== 'undefined' ? self : this);
