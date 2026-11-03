/*
 * Экраны: выбор девочки, карта-дорожка, темы.
 */
(function () {
  'use strict';

  var App = window.App;
  var esc = App.esc;

  /* ---------- кто сегодня читает ---------- */

  App.SCREENS.profiles = {
    html: function () {
      var data = App.data;
      var cards = data.order.map(function (id) {
        var p = data.profiles[id];
        var stars = App.totalStars(p);
        var streak = App.streak(p);
        var meta = stars ? '⭐ ' + stars + (streak ? ' · ☀️ ' + streak : '') : 'Ещё не играла';
        return '<button class="profile-card" data-act="pick-profile" data-id="' + id + '">' +
          '<span class="profile-critter">' + App.critterHTML(p) + '</span>' +
          '<span class="profile-name">' + esc(p.name) + '</span>' +
          '<span class="profile-meta">' + meta + '</span>' +
          '</button>';
      }).join('');
      var noVoice = App.Speech.supported && App.Speech.voices().length ? '' :
        '<p class="note">Голос пока не найден. Если склады не звучат, загляните в настройки для родителей (⚙️).</p>';
      return '<main class="screen screen--profiles">' +
        '<header class="topbar"><span class="topbar-gap"></span><span class="brand">Оля и Зоя читают</span>' +
        '<button class="icon-btn" data-act="gate" aria-label="Для родителей">⚙️</button></header>' +
        '<h1 class="screen-title">Кто сегодня читает?</h1>' +
        '<div class="profiles">' + cards + '</div>' + noVoice + '</main>';
    }
  };

  App.ACTIONS['pick-profile'] = function (el) {
    App.ui.profileId = el.getAttribute('data-id');
    App.ui.sessionStart = Date.now();
    var p = App.profile();
    if (!p.check.done && !p.check.skipped) App.go('check-intro');
    else App.go('map');
  };

  /* ---------- карта-дорожка ---------- */

  var STEP = 112;

  function stopPos(i) {
    return { x: 50 + 30 * Math.sin(i * 1.15), y: 104 + i * STEP };
  }

  function roadPath(n) {
    var d = '';
    for (var i = 0; i < n; i++) {
      var a = stopPos(i);
      if (i === 0) { d += 'M' + a.x + ' ' + a.y; continue; }
      var b = stopPos(i - 1);
      d += ' C' + b.x + ' ' + (b.y + STEP / 2) + ' ' + a.x + ' ' + (a.y - STEP / 2) + ' ' + a.x + ' ' + a.y;
    }
    return d;
  }

  function stopHTML(p, level, i, next) {
    var rec = App.levelRec(p, level.id);
    var stars = rec ? rec.stars || 0 : 0;
    var known = rec && rec.known && !stars;
    var pos = stopPos(i);
    var cls = 'stop' + (stars ? ' is-done' : '') + (known ? ' is-known' : '') + (next ? ' is-next' : '');
    return '<button class="' + cls + '" style="left:' + pos.x + '%;top:' + pos.y + 'px" data-act="start" data-id="' + level.id + '">' +
      (next ? '<span class="stop-avatar" aria-hidden="true">' + App.critterHTML(p) + '</span>' : '') +
      '<span class="stop-dot">' + (known ? '✓' : (i + 1)) + '</span>' +
      '<span class="stop-label">' + esc(level.title) + '</span>' +
      (stars ? App.starsHTML(stars) : '') +
      '</button>';
  }

  function chapterChips(p, current) {
    return App.track(p).map(function (section) {
      var list = App.sectionLevels(section);
      var info = App.SECTIONS[section];
      var done = App.doneCount(p, list);
      return '<button class="chapter' + (section === current ? ' is-on' : '') + (done === list.length ? ' is-complete' : '') + '" role="tab" aria-selected="' + (section === current) + '" ' +
        'data-act="go" data-to="map" data-section="' + section + '">' +
        '<span class="chapter-icon" aria-hidden="true">' + info.icon + '</span>' +
        '<span class="chapter-title">' + info.title + '</span>' +
        '<span class="chapter-count">' + done + '/' + list.length + '</span></button>';
    }).join('');
  }

  App.SCREENS.map = {
    html: function (params) {
      var p = App.profile();
      var rec = App.recommended(p);
      var track = App.track(p);
      var section = params.section || (track.indexOf(rec.section) >= 0 ? rec.section : track[0]);
      var list = App.sectionLevels(section);
      var next = App.firstUndone(p, list);
      var height = 104 + (list.length - 1) * STEP + 100;
      var stops = list.map(function (l, i) { return stopHTML(p, l, i, l === next); }).join('');
      var stars = App.totalStars(p);
      var streak = App.streak(p);
      var unlocked = App.unlockedAccessories(p).length;
      var stickers = Object.keys(p.stickers).length;
      var badges = '<span class="badges"><span class="badge" title="Звёзды">⭐ ' + stars + '</span>' +
        (streak ? '<span class="badge badge--sun" title="Дней подряд">☀️ ' + streak + '</span>' : '') + '</span>';
      return '<main class="screen screen--map">' +
        App.topbar(esc(p.name), 'profiles', badges) +
        '<div class="map-layout">' +
          '<section class="map-side">' +
            '<div class="critter-zone critter-zone--menu">' + App.critterHTML(p) + '<div class="bubble" role="status"></div></div>' +
            '<button class="play-btn" data-act="start" data-id="' + rec.id + '">' +
              '<span class="play-icon" aria-hidden="true">▶</span><span><span class="play-label">Играть</span>' +
              '<span class="play-sub">' + esc(App.levelLabel(rec)) + '</span></span></button>' +
            '<nav class="extras">' +
              '<button class="extra" data-act="go" data-to="themes"><span class="extra-icon" aria-hidden="true">🗂️</span><span>Темы</span></button>' +
              '<button class="extra" data-act="go" data-to="album"><span class="extra-icon" aria-hidden="true">📒</span><span>Альбом</span>' + (stickers ? '<span class="extra-count">' + stickers + '</span>' : '') + '</button>' +
              '<button class="extra" data-act="go" data-to="wardrobe"><span class="extra-icon" aria-hidden="true">👗</span><span>Гардероб</span>' + (unlocked ? '<span class="extra-count">' + unlocked + '</span>' : '') + '</button>' +
              '<button class="extra" data-act="go" data-to="pantry"><span class="extra-icon" aria-hidden="true">🍯</span><span>Кладовая</span></button>' +
              '<button class="extra" data-act="go" data-to="table"><span class="extra-icon" aria-hidden="true">🔤</span><span>Таблица</span></button>' +
            '</nav>' +
          '</section>' +
          '<section class="map-main">' +
            '<div class="chapters" role="tablist">' + chapterChips(p, section) + '</div>' +
            '<p class="lead">' + App.SECTIONS[section].hint + '</p>' +
            '<div class="path-scroll"><div class="path" style="height:' + height + 'px">' +
              '<svg class="road" viewBox="0 0 100 ' + height + '" preserveAspectRatio="none" aria-hidden="true">' +
                '<path class="road-base" d="' + roadPath(list.length) + '" vector-effect="non-scaling-stroke"/>' +
                '<path class="road-dash" d="' + roadPath(list.length) + '" vector-effect="non-scaling-stroke"/>' +
              '</svg>' + stops +
              '<span class="path-goal" style="left:' + stopPos(list.length).x + '%;top:' + (stopPos(list.length - 1).y + 70) + 'px" aria-hidden="true">🏁</span>' +
            '</div></div>' +
          '</section>' +
        '</div></main>';
    },
    mount: function () {
      var p = App.profile();
      var scroller = App.$('.path-scroll');
      var next = App.$('.stop.is-next');
      if (scroller && next && scroller.scrollHeight > scroller.clientHeight + 4) {
        scroller.scrollTop = Math.max(0, next.offsetTop - scroller.clientHeight / 2);
      }
      if (!App.ui.greeted[p.id]) {
        App.ui.greeted[p.id] = true;
        App.critterState('is-party', 1600);
        App.critterSay(App.fill(App.pick(App.LINES.greet), p));
      }
    }
  };

  /* ---------- темы ---------- */

  function levelTile(p, level, index, next) {
    var stars = App.levelStars(p, level.id);
    var example = '<span class="tile-emoji" aria-hidden="true">' + level.pool.slice(0, 3).map(function (x) { return x.emoji; }).join('') + '</span>';
    return '<button class="level-tile' + (next ? ' is-next' : '') + '" data-act="start" data-id="' + level.id + '">' +
      '<span class="level-num">' + (index + 1) + '</span>' + example +
      '<span class="tile-title">Уровень ' + (index + 1) + '</span>' + App.starsHTML(stars) + '</button>';
  }

  App.SCREENS.themes = {
    html: function () {
      var p = App.profile();
      var tiles = App.LV.themes.map(function (t) {
        var done = App.doneCount(p, t.levels);
        var full = done === t.levels.length;
        return '<button class="theme-tile' + (full ? ' is-done' : '') + '" data-act="theme" data-id="' + t.theme.id + '">' +
          '<span class="theme-emoji" aria-hidden="true">' + t.theme.emoji + '</span>' +
          '<span class="tile-title">' + esc(t.theme.title) + '</span>' +
          '<span class="tile-meta">' + (full ? '✓ пройдено' : done + ' из ' + t.levels.length) + '</span></button>';
      }).join('');
      return '<main class="screen screen--themes">' + App.topbar('Слова по темам', 'map') +
        '<p class="lead">Выбери, о чём хочешь читать.</p>' +
        '<div class="theme-grid">' + tiles + '</div></main>';
    }
  };

  App.SCREENS.theme = {
    html: function (params) {
      var p = App.profile();
      var t = App.LV.themes.filter(function (x) { return x.theme.id === params.id; })[0];
      var next = App.firstUndone(p, t.levels);
      return '<main class="screen screen--levels">' + App.topbar(t.theme.emoji + ' ' + esc(t.theme.title), 'themes') +
        '<div class="level-grid">' + t.levels.map(function (l, i) { return levelTile(p, l, i, l === next); }).join('') + '</div></main>';
    }
  };

  App.ACTIONS.theme = function (el) {
    var id = el.getAttribute('data-id');
    var t = App.LV.themes.filter(function (x) { return x.theme.id === id; })[0];
    if (t.levels.length === 1) App.startLevel(t.levels[0].id);
    else App.go('theme', { id: id });
  };
})();
