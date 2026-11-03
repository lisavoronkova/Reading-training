/*
 * Облачное сохранение. Когда игра открыта по ссылке на claude.ai, прогресс
 * хранится в базе страницы, в личном разделе вашего аккаунта, и не пропадает
 * при очистке браузера. В других местах (свой хостинг, файл) игра работает
 * как раньше — только с памятью браузера.
 *
 * Документы в базе (data/users/<ваш id>/...):
 *   settings          — настройки и порядок профилей
 *   p-olya, p-zoya    — прогресс каждой девочки (без картинок)
 *   img-olya-normal…  — свои картинки персонажа, по одной в документе
 * У каждого документа своё время изменения; при встрече побеждает более новый.
 */
(function () {
  'use strict';

  var App = window.App;
  var STATES = ['normal', 'eat', 'yuck', 'happy'];

  var Cloud = App.Cloud = {
    state: 'local',          // local | connecting | cloud | error
    lastSync: 0,
    db: null,
    uid: null,
    localKeys: {},           // как выглядел каждый документ при прошлом сохранении
    syncedKeys: {},          // что уже лежит в облаке
    timer: null,
    flushing: false,
    again: false
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function imageKey(url) { return url ? url.length + ':' + url.slice(0, 48) + url.slice(-48) : 'none'; }

  /* Разбивает данные игры на документы. key — содержимое без времени изменения. */
  function docs() {
    var data = App.data;
    var out = {};
    var s = { settings: data.settings, order: data.order, version: data.version };
    out.settings = { key: JSON.stringify(s), body: function () { return { settings: clone(data.settings), order: data.order.slice(), version: data.version, updatedAt: data.updatedAt || 0 }; } };
    data.order.forEach(function (id) {
      var p = data.profiles[id];
      var images = (p.character && p.character.images) || {};
      var copy = {};
      Object.keys(p).forEach(function (k) { if (k !== 'updatedAt') copy[k] = p[k]; });
      var json = JSON.stringify(copy, function (k, v) { return k === 'images' ? undefined : v; });
      out['p-' + id] = { key: json, body: function () { var b = JSON.parse(json); b.updatedAt = p.updatedAt || 0; return { profile: b, updatedAt: p.updatedAt || 0 }; } };
      STATES.forEach(function (st) {
        var url = images[st] || null;
        out['img-' + id + '-' + st] = { key: imageKey(url), body: function () { return { url: url, updatedAt: p.updatedAt || 0 }; } };
      });
    });
    return out;
  }

  /* Отмечает время изменения у документов, которые поменялись с прошлого сохранения. */
  Cloud.stamp = function () {
    var now = Date.now();
    var data = App.data;
    var d = docs();
    Object.keys(d).forEach(function (id) {
      if (Cloud.localKeys[id] === d[id].key) return;
      if (Cloud.localKeys[id] !== undefined) {
        if (id === 'settings') data.updatedAt = now;
        else {
          var pid = id.replace(/^p-/, '').replace(/^img-/, '').replace(/-(normal|eat|yuck|happy)$/, '');
          if (data.profiles[pid]) data.profiles[pid].updatedAt = now;
        }
      }
      Cloud.localKeys[id] = d[id].key;
    });
  };

  Cloud.schedule = function () {
    if (Cloud.state !== 'cloud' && Cloud.state !== 'error') return;
    clearTimeout(Cloud.timer);
    Cloud.timer = setTimeout(Cloud.flush, 1500);
  };

  /* Записывает в облако документы, которые отличаются от облачных. По одной записи за раз. */
  Cloud.flush = function () {
    if (!Cloud.db || !Cloud.uid) return Promise.resolve();
    if (Cloud.flushing) { Cloud.again = true; return Promise.resolve(); }
    Cloud.flushing = true;
    var d = docs();
    var ids = Object.keys(d).filter(function (id) { return Cloud.syncedKeys[id] !== d[id].key; });
    var chain = Promise.resolve();
    var failed = false;
    ids.forEach(function (id) {
      chain = chain.then(function () {
        if (failed) return;
        var key = d[id].key;
        // у документа должно быть время, иначе другое устройство не поймёт, что новее
        if (id === 'settings' && !App.data.updatedAt) App.data.updatedAt = Date.now();
        var pid = id.indexOf('p-') === 0 ? id.slice(2) : null;
        if (pid && App.data.profiles[pid] && !App.data.profiles[pid].updatedAt) App.data.profiles[pid].updatedAt = Date.now();
        var body = d[id].body();
        if (body.url && body.url.length > 240000) { Cloud.syncedKeys[id] = key; return; }
        return Cloud.db.doc('data/users/' + Cloud.uid + '/' + id).set(body).then(function () {
          Cloud.syncedKeys[id] = key;
        }, function (e) {
          failed = true;
          Cloud.lastError = e && e.code;
        });
      });
    });
    return chain.then(function () {
      Cloud.flushing = false;
      setState(failed ? 'error' : 'cloud');
      if (!failed) Cloud.lastSync = Date.now();
      if (Cloud.again) { Cloud.again = false; Cloud.schedule(); }
    });
  };

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject({ code: 'timeout' }); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }

  function setState(s) {
    var changed = Cloud.state !== s;
    Cloud.state = s;
    if (changed && App.ui.screen === 'parents' && App.ui.params.tab === 'settings') App.render();
  }

  /* Сравнивает облако с тем, что в браузере, и берёт более новое. */
  function merge(snap) {
    var data = App.data;
    var remote = {};
    snap.docs.forEach(function (doc) { if (doc.exists) remote[doc.id] = doc.data(); });
    var changed = false;

    var rs = remote.settings;
    if (rs && (rs.updatedAt || 0) > (data.updatedAt || 0)) {
      if (rs.settings) Object.assign(data.settings, clone(rs.settings));
      data.updatedAt = rs.updatedAt;
      App.Sfx.enabled = data.settings.sounds;
      App.Sfx.music.on = data.settings.music;
      App.Speech.rate = data.settings.rate;
      changed = true;
    }
    data.order.forEach(function (id) {
      var rp = remote['p-' + id];
      var lp = data.profiles[id];
      var remoteNewer = false;
      if (rp && rp.profile) {
        // Первая встреча устройства с облаком: у локальной копии ещё нет времени — берём ту, где больше ответов.
        if (!lp.updatedAt) remoteNewer = ((rp.profile.stats && rp.profile.stats.total) || 0) >= ((lp.stats && lp.stats.total) || 0);
        else remoteNewer = (rp.updatedAt || 0) > lp.updatedAt;
      }
      if (remoteNewer) {
        var images = (lp.character && lp.character.images) || {};
        var np = App.Store.normalizeProfile(id, rp.profile);
        np.updatedAt = rp.updatedAt;
        np.character.images = images;
        data.profiles[id] = np;
        changed = true;
      }
      var target = data.profiles[id];
      target.character.images = target.character.images || {};
      STATES.forEach(function (st) {
        var ri = remote['img-' + id + '-' + st];
        if (!ri) return;
        var local = target.character.images[st] || null;
        if (ri.url === local) return;
        if (remoteNewer || !local) {
          if (ri.url) target.character.images[st] = ri.url;
          else delete target.character.images[st];
          changed = true;
        }
      });
    });

    // что уже лежит в облаке — чтобы не отправлять это обратно
    var d = docs();
    Object.keys(d).forEach(function (id) {
      var r = remote[id];
      if (!r) { Cloud.syncedKeys[id] = id.indexOf('img-') === 0 ? 'none' : ''; return; }
      if (id.indexOf('img-') === 0) Cloud.syncedKeys[id] = imageKey(r.url);
      else if (id === 'settings') Cloud.syncedKeys[id] = (r.updatedAt || 0) === (data.updatedAt || 0) ? d[id].key : '';
      else {
        var pid = id.slice(2);
        Cloud.syncedKeys[id] = (r.updatedAt || 0) === (data.profiles[pid].updatedAt || 0) ? d[id].key : '';
      }
      Cloud.localKeys[id] = d[id].key;
    });
    Object.keys(d).forEach(function (id) { Cloud.localKeys[id] = d[id].key; });
    if (changed) App.Store.save(data);
    return changed;
  }

  var BUSY = { play: 1, 'check-read': 1, 'check-letters': 1, gate: 1 };

  Cloud.pull = function () {
    if (!Cloud.db || !Cloud.uid || Cloud.flushing) return Promise.resolve();
    return withTimeout(Cloud.db.collection('data/users/' + Cloud.uid).get(), 10000).then(function (snap) {
      var changed = merge(snap);
      Cloud.lastSync = Date.now();
      setState('cloud');
      if (changed && !BUSY[App.ui.screen]) App.render();
      return Cloud.flush();
    }, function () { setState('error'); });
  };

  Cloud.init = function () {
    Cloud.stamp();
    var c = window.claude;
    if (!c || typeof c.use !== 'function') {
      // Свой хостинг: просим браузер не стирать сохранённое.
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) { /* не поддерживается */ }
      return;
    }
    setState('connecting');
    Promise.all([c.use('db'), c.use('user')]).then(function (r) {
      var db = r[0];
      var user = r[1];
      if (!db || !user) { setState('local'); return null; }
      return user.id().then(function (uid) {
        if (!uid) { setState('local'); return null; }
        Cloud.db = db;
        Cloud.uid = uid;
        return Cloud.pull();
      });
    }).catch(function () { setState('error'); });
  };

  /* Текст для родителей: где сейчас хранится прогресс. */
  Cloud.statusHTML = function () {
    var when = Cloud.lastSync ? new Date(Cloud.lastSync).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
    switch (Cloud.state) {
      case 'cloud':
        return '<p class="save-status save-status--ok">☁️ Прогресс сохраняется в вашем аккаунте claude.ai' + (when ? ' (последний раз в ' + when + ')' : '') +
          '. Он не пропадёт, даже если очистить браузер, и будет одинаковым на всех устройствах, где открыта эта ссылка под вашим аккаунтом.</p>';
      case 'connecting':
        return '<p class="save-status">Подключаемся к облачному сохранению…</p>';
      case 'error':
        return '<p class="save-status save-status--warn">Не получилось сохранить в облако. Прогресс пока лежит в этом браузере, игра попробует снова при следующем ответе.</p>';
      default:
        return '<p class="save-status save-status--warn">Прогресс хранится в этом браузере на этом устройстве. Чтобы он не пропал: установите игру на главный экран (в Safari: «Поделиться» → «На экран „Домой“») и время от времени сохраняйте резервную копию в файл — кнопка ниже.</p>';
    }
  };
})();
