/*
 * Прогресс и настройки хранятся только на этом устройстве (localStorage).
 */
(function (root) {
  'use strict';

  var KEY = 'olya-zoya-reading.v1';
  var VERSION = 2;

  function defaultProfile(id, name, character, reading) {
    return {
      id: id,
      name: name,
      // 'prereader' — не знает букв, 'beginner' — знает буквы, начинает читать склады, 'reader' — читает по слогам
      reading: reading,
      options: 'auto',           // 'auto' или 2 / 3 / 4
      autoOptions: reading === 'prereader' ? 2 : 3,
      tasks: 8,
      restMinutes: 15,
      autoVoice: false,
      cockroach: true,
      character: character,
      outfit: { head: null, face: null, neck: null },
      tutorialDone: false,
      check: { done: false, skipped: false, date: null, letters: {}, sklady: {}, forms: {} },
      progress: {},              // levelId -> { stars, plays, known }
      pantry: {},                // эмодзи угощения -> сколько раз
      stickers: {},              // эмодзи наклейки -> сколько раз
      stats: { days: {}, total: 0, firstTry: 0, skladErrors: {}, wordErrors: {}, taps: {}, bestStreak: 0 }
    };
  }

  function defaults() {
    return {
      version: VERSION,
      settings: { voiceURI: null, rate: 0.85, sounds: true, music: true, letterCase: 'upper' },
      order: ['olya', 'zoya'],
      profiles: {
        olya: defaultProfile('olya', 'Оля', { look: 'hamster', name: 'Хомка', images: {} }, 'reader'),
        zoya: defaultProfile('zoya', 'Зоя', { look: 'unicat', name: 'Радужка', images: {} }, 'prereader')
      }
    };
  }

  function merge(base, saved) {
    if (!saved || typeof saved !== 'object') return base;
    Object.keys(saved).forEach(function (k) {
      var v = saved[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        base[k] = merge(base[k], v);
      } else {
        base[k] = v;
      }
    });
    return base;
  }

  function migrate(data, savedVersion) {
    if ((savedVersion || 1) < 2) {
      // Родители рассказали: Зоя пока не знает букв, Оля читает по слогам.
      data.profiles.zoya.reading = 'prereader';
      data.profiles.olya.reading = 'reader';
      ['olya', 'zoya'].forEach(function (id) {
        var p = data.profiles[id];
        p.options = 'auto';
        p.autoOptions = p.reading === 'prereader' ? 2 : 3;
        if (p.character.image && !(p.character.images && p.character.images.normal)) {
          p.character.images = p.character.images || {};
          p.character.images.normal = p.character.image;
        }
        delete p.character.image;
      });
    }
    data.version = VERSION;
    return data;
  }

  var Store = {
    /* Профиль из облака или старой версии, дополненный недостающими полями. */
    normalizeProfile: function (id, obj) {
      var base = defaults().profiles[id] || defaultProfile(id, (obj && obj.name) || id, { look: 'hamster', name: 'Хомка', images: {} }, 'beginner');
      return merge(base, JSON.parse(JSON.stringify(obj || {})));
    },
    load: function () {
      var data = defaults();
      try {
        var raw = root.localStorage.getItem(KEY);
        if (raw) {
          var saved = JSON.parse(raw);
          data = migrate(merge(data, saved), saved.version);
        }
      } catch (e) { /* хранилище недоступно — играем без сохранения */ }
      return data;
    },
    save: function (data) {
      try {
        root.localStorage.setItem(KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    },
    resetProfile: function (data, id) {
      var p = data.profiles[id];
      var fresh = defaultProfile(id, p.name, p.character, p.reading);
      ['options', 'tasks', 'restMinutes', 'autoVoice', 'cockroach'].forEach(function (k) { fresh[k] = p[k]; });
      fresh.tutorialDone = true;
      data.profiles[id] = fresh;
    },
    dayKey: function (d) {
      var m = d.getMonth() + 1;
      var day = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    },
    today: function () { return Store.dayKey(new Date()); }
  };

  root.Store = Store;
})(typeof self !== 'undefined' ? self : this);
