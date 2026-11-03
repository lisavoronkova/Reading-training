/*
 * Прогресс и настройки хранятся только на этом устройстве (localStorage).
 */
(function (root) {
  'use strict';

  var KEY = 'olya-zoya-reading.v1';

  function defaultProfile(id, name, character, reading) {
    return {
      id: id,
      name: name,
      reading: reading,          // 'beginner' — только начинает, 'reader' — уже читает
      options: reading === 'reader' ? 4 : 3,
      tasks: 8,
      restMinutes: 15,
      autoVoice: false,
      cockroach: true,
      character: character,
      tutorialDone: false,
      progress: {},              // levelId -> { stars, plays }
      pantry: {},                // эмодзи -> сколько раз съедено
      stats: { days: {}, total: 0, firstTry: 0, skladErrors: {}, wordErrors: {}, taps: {} }
    };
  }

  function defaults() {
    return {
      version: 1,
      settings: { voiceURI: null, rate: 0.85, sounds: true, letterCase: 'upper' },
      order: ['olya', 'zoya'],
      profiles: {
        olya: defaultProfile('olya', 'Оля', { look: 'hamster', name: 'Хомка', image: null }, 'beginner'),
        zoya: defaultProfile('zoya', 'Зоя', { look: 'unicat', name: 'Радужка', image: null }, 'beginner')
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

  var Store = {
    load: function () {
      var data = defaults();
      try {
        var raw = root.localStorage.getItem(KEY);
        if (raw) data = merge(data, JSON.parse(raw));
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
      fresh.options = p.options; fresh.tasks = p.tasks; fresh.restMinutes = p.restMinutes;
      fresh.autoVoice = p.autoVoice; fresh.cockroach = p.cockroach; fresh.tutorialDone = true;
      data.profiles[id] = fresh;
    },
    today: function () {
      var d = new Date();
      var m = d.getMonth() + 1;
      var day = d.getDate();
      return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }
  };

  root.Store = Store;
})(typeof self !== 'undefined' ? self : this);
