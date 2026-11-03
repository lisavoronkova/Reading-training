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

  var ctx = null;
  var Sfx = {
    enabled: true,
    unlock: function () {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      try { ctx = new AC(); } catch (e) { ctx = null; }
    },
    tone: function (freqs, type, dur, gain) {
      if (!this.enabled || !ctx) return;
      var t = ctx.currentTime;
      freqs.forEach(function (f, i) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t + i * dur * 0.8);
        g.gain.setValueAtTime(0.0001, t + i * dur * 0.8);
        g.gain.exponentialRampToValueAtTime(gain, t + i * dur * 0.8 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * dur * 0.8 + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t + i * dur * 0.8);
        o.stop(t + i * dur * 0.8 + dur + 0.02);
      });
    },
    right: function () { this.tone([660, 880, 1175], 'sine', 0.16, 0.18); },
    wrong: function () { this.tone([240, 170], 'triangle', 0.2, 0.2); },
    pop: function () { this.tone([520], 'sine', 0.08, 0.12); },
    fanfare: function () { this.tone([523, 659, 784, 1047], 'sine', 0.2, 0.18); }
  };

  root.Speech = Speech;
  root.Sfx = Sfx;
})(typeof self !== 'undefined' ? self : this);
