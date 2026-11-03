/*
 * Игра «Оля и Зоя читают»: экраны, игровой процесс, родительский раздел.
 */
(function () {
  'use strict';

  var S = window.Sklady;
  var W = window.Words;
  var Lv = window.Levels;
  var Speech = window.Speech;
  var Sfx = window.Sfx;
  var Store = window.Store;
  var Characters = window.Characters;

  var LV = Lv.build(W);
  var THEME_LEVELS = [];
  LV.themes.forEach(function (t) { THEME_LEVELS = THEME_LEVELS.concat(t.levels); });

  var data = Store.load();
  var app = document.getElementById('app');
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var FOODS = [
    ['🍦', 'мороженое'], ['🍞', 'хлеб с маслом'], ['🍎', 'яблоко'], ['🍌', 'банан'], ['🍐', 'груша'],
    ['🍇', 'виноград'], ['🍓', 'клубника'], ['🍒', 'вишня'], ['🍉', 'арбуз'], ['🍊', 'апельсин'],
    ['🥕', 'морковка'], ['🌽', 'кукуруза'], ['🥜', 'орешки'], ['🍪', 'печенье'], ['🥞', 'блинчики'],
    ['🧀', 'сыр'], ['🥣', 'каша'], ['🍬', 'конфета'], ['🫐', 'черника'], ['🥐', 'булочка'],
    ['🍑', 'персик'], ['🍯', 'мёд'], ['🥨', 'крендель'], ['🍭', 'леденец']
  ];
  var RARE = [['🎂', 'торт'], ['🍕', 'пицца'], ['🥧', 'пирог'], ['🌈', 'кусочек радуги']];

  var LINES = {
    greet: [
      'Привет, {child}! Я {critter}. Я очень хочу кушать! Читай склады и слова, а я буду угощаться!',
      '{child}, привет! Это я, {critter}. Покорми меня: прочитай и найди картинку!'
    ],
    praise: [
      'Ням-ням, {food}!', 'Ура, {food}! Спасибо!', 'Вкуснятина!', 'Молодец, {child}!',
      'Ты здорово читаешь!', 'Ммм, {food}! Ещё!', 'Правильно! Я становлюсь сытее!',
      'Умница, {child}!', 'Отлично! А что будет в следующий раз?', 'Ты читаешь всё лучше и лучше!'
    ],
    bug: [
      'Фу! Таракан! Давай ещё раз!', 'Ой-ой, таракан! Нажми на склад и послушай.',
      'Тьфу! Чуть тараканом не накормили! У тебя получится!', 'Кхе-кхе! Такое я не ем. Попробуй другую картинку!',
      'Ой! Давай прочитаем ещё разок!'
    ],
    oops: ['Ой, тарелка пустая! Попробуй ещё раз!', 'Почти! Нажми на склад и послушай.', 'Давай прочитаем ещё разок!'],
    end: ['Ух, как вкусно было! Спасибо, {child}!', 'Вот это пир! Ты отлично читаешь, {child}!', 'Ура, животик полный! Спасибо, {child}!'],
    rest: ['Мы сегодня здорово позанимались! Давай отдохнём и поиграем завтра?'],
    tutorCube: 'Нажми на склад — услышишь, как он читается!',
    tutorPick: 'А теперь найди картинку!'
  };

  var SECTION_TITLES = { syllables: 'Слоги', forms: 'Формы слов', themes: 'Слова по темам' };
  var NUMBER_WORDS = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];

  var ui = { screen: null, params: {}, profileId: null, sessionStart: 0, greeted: {}, game: null, lastFood: null, timers: {} };

  /* ---------- помощники ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function save() { Store.save(data); }
  function profile() { return data.profiles[ui.profileId]; }
  function lettered(t) { return data.settings.letterCase === 'lower' ? t.toLowerCase() : t.toUpperCase(); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fill(tpl, p, food) {
    return tpl.replace(/\{child\}/g, p.name).replace(/\{critter\}/g, p.character.name || 'твой друг')
      .replace(/\{food\}/g, food || '').replace(/^(.)/, function (m) { return m.toUpperCase(); });
  }
  function $(sel) { return app.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(app.querySelectorAll(sel)); }

  function critterSay(text, opts) {
    var b = $('.bubble');
    if (b) {
      b.textContent = text;
      b.classList.add('is-on');
      clearTimeout(ui.timers.bubble);
      ui.timers.bubble = setTimeout(function () { b.classList.remove('is-on'); }, 3800);
    }
    var o = { pitch: 1.3, rateMul: 1.1 };
    if (opts) Object.keys(opts).forEach(function (k) { o[k] = opts[k]; });
    return Speech.say(text, o);
  }

  function critterState(cls, ms) {
    var c = $('[data-critter]');
    if (!c) return;
    c.classList.remove('is-eat', 'is-yuck', 'is-party', 'is-oops');
    void c.offsetWidth;
    c.classList.add(cls);
    var mood = c.querySelector('.critter-mood');
    if (mood) mood.textContent = { 'is-eat': '😋', 'is-yuck': '🤢', 'is-party': '🥳', 'is-oops': '🙈' }[cls] || '';
    clearTimeout(ui.timers.critter);
    if (ms) ui.timers.critter = setTimeout(function () { c.classList.remove(cls); if (mood) mood.textContent = ''; }, ms);
  }

  function miniCubes(sklady, colors) {
    return '<span class="mini-cubes">' + sklady.map(function (s, i) {
      return '<span class="mini-cube mini-cube--' + (colors ? colors[i] : 'stress') + '">' + esc(lettered(s)) + '</span>';
    }).join('') + '</span>';
  }

  function starsHTML(n, total) {
    var out = '';
    for (var i = 1; i <= (total || 3); i++) out += '<span class="star' + (i <= n ? ' is-on' : '') + '">★</span>';
    return '<span class="stars" aria-label="Звёзд: ' + n + ' из 3">' + out + '</span>';
  }

  function levelStars(p, id) { var r = p.progress[id]; return r ? r.stars : 0; }
  function doneCount(p, list) { return list.filter(function (l) { return levelStars(p, l.id) > 0; }).length; }
  function firstUndone(p, list) {
    for (var i = 0; i < list.length; i++) if (!levelStars(p, list[i].id)) return list[i];
    return null;
  }
  function recommended(p) {
    var order = p.reading === 'reader' ? [LV.forms, THEME_LEVELS, LV.syllables] : [LV.syllables, LV.forms, THEME_LEVELS];
    for (var i = 0; i < order.length; i++) {
      var l = firstUndone(p, order[i]);
      if (l) return l;
    }
    return p.reading === 'reader' ? LV.forms[LV.forms.length - 1] : LV.syllables[LV.syllables.length - 1];
  }
  function siblings(level) {
    if (level.section === 'syllables') return LV.syllables;
    if (level.section === 'forms') return LV.forms;
    return THEME_LEVELS;
  }
  function levelAfter(level) {
    var list = siblings(level);
    var i = list.indexOf(level);
    return list[i + 1] || null;
  }
  function levelLabel(level) {
    if (level.section === 'themes') return level.title;
    return SECTION_TITLES[level.section] + ' · ' + level.title;
  }

  function addPlayTime() {
    var g = ui.game;
    if (!g || !g.startedAt) return;
    var secs = Math.min(1800, Math.round((Date.now() - g.startedAt) / 1000));
    g.startedAt = 0;
    var days = profile().stats.days;
    var key = Store.today();
    days[key] = (days[key] || 0) + secs;
  }

  function bump(obj, key) { obj[key] = (obj[key] || 0) + 1; }

  /* ---------- экраны ---------- */

  var SCREENS = {};

  SCREENS.profiles = {
    html: function () {
      var cards = data.order.map(function (id) {
        var p = data.profiles[id];
        var done = doneCount(p, LV.syllables) + doneCount(p, LV.forms) + doneCount(p, THEME_LEVELS);
        return '<button class="profile-card" data-act="pick-profile" data-id="' + id + '">' +
          '<span class="profile-critter">' + Characters.html(p.character) + '</span>' +
          '<span class="profile-name">' + esc(p.name) + '</span>' +
          '<span class="profile-meta">' + (done ? 'Пройдено уровней: ' + done : 'Ещё не играла') + '</span>' +
          '</button>';
      }).join('');
      return '<main class="screen screen--profiles">' +
        '<header class="topbar"><span class="brand">Оля и Зоя читают</span>' +
        '<button class="icon-btn" data-act="gate" aria-label="Для родителей">⚙️</button></header>' +
        '<h1 class="screen-title">Кто сегодня читает?</h1>' +
        '<div class="profiles">' + cards + '</div>' +
        (Speech.supported && Speech.voices().length ? '' :
          '<p class="note">Голос пока не найден. Если склады не звучат, загляните в настройки для родителей (⚙️).</p>') +
        '</main>';
    }
  };

  SCREENS.menu = {
    html: function () {
      var p = profile();
      var rec = recommended(p);
      var pantryCount = Object.keys(p.pantry).length;
      var themesDone = LV.themes.filter(function (t) { return doneCount(p, t.levels) === t.levels.length; }).length;
      return '<main class="screen screen--menu">' +
        '<header class="topbar"><button class="icon-btn" data-act="go" data-to="profiles" aria-label="Назад">←</button>' +
        '<span class="brand">' + esc(p.name) + '</span><span class="topbar-gap"></span></header>' +
        '<section class="menu-hero">' +
          '<div class="critter-zone critter-zone--menu">' + Characters.html(p.character) + '<div class="bubble" role="status"></div></div>' +
          '<button class="play-btn" data-act="start" data-id="' + rec.id + '">' +
            '<span class="play-icon" aria-hidden="true">▶</span><span><span class="play-label">Играть</span>' +
            '<span class="play-sub">' + esc(levelLabel(rec)) + '</span></span></button>' +
        '</section>' +
        '<nav class="sections">' +
          '<button class="section-tile" data-act="go" data-to="levels" data-section="syllables">' +
            miniCubes(['ма', 'бу']) + '<span class="tile-title">Слоги</span>' +
            '<span class="tile-meta">' + doneCount(p, LV.syllables) + ' из ' + LV.syllables.length + '</span></button>' +
          '<button class="section-tile" data-act="go" data-to="levels" data-section="forms">' +
            miniCubes(['ка', 'ша'], ['stress', 'g1']) + '<span class="tile-title">Формы слов</span>' +
            '<span class="tile-meta">' + doneCount(p, LV.forms) + ' из ' + LV.forms.length + '</span></button>' +
          '<button class="section-tile" data-act="go" data-to="themes">' +
            '<span class="tile-emoji" aria-hidden="true">🐮🚗🍓</span><span class="tile-title">Слова по темам</span>' +
            '<span class="tile-meta">Тем пройдено: ' + themesDone + ' из ' + LV.themes.length + '</span></button>' +
          '<button class="section-tile" data-act="go" data-to="table">' +
            miniCubes(['мо', 'му']) + '<span class="tile-title">Таблица складов</span>' +
            '<span class="tile-meta">Нажимай и слушай</span></button>' +
          '<button class="section-tile" data-act="go" data-to="pantry">' +
            '<span class="tile-emoji" aria-hidden="true">🍦🍎🍪</span><span class="tile-title">Кладовая</span>' +
            '<span class="tile-meta">Угощений: ' + pantryCount + ' из ' + (FOODS.length + RARE.length) + '</span></button>' +
        '</nav></main>';
    },
    mount: function () {
      var p = profile();
      if (!ui.greeted[p.id]) {
        ui.greeted[p.id] = true;
        critterState('is-party', 1600);
        critterSay(fill(pick(LINES.greet), p));
      }
    }
  };

  function levelTile(p, level, index, next) {
    var example = '';
    if (level.kind === 'syllable') example = miniCubes(level.examples);
    else if (level.section === 'forms') {
      var w = level.pool[0];
      example = miniCubes(w.sklady, S.colors(w));
    } else {
      example = '<span class="tile-emoji" aria-hidden="true">' + level.pool.slice(0, 3).map(function (x) { return x.emoji; }).join('') + '</span>';
    }
    var stars = levelStars(p, level.id);
    return '<button class="level-tile' + (next ? ' is-next' : '') + '" data-act="start" data-id="' + level.id + '">' +
      '<span class="level-num">' + (index + 1) + '</span>' + example +
      '<span class="tile-title">' + esc(level.section === 'themes' ? 'Уровень ' + (index + 1) : level.title) + '</span>' +
      starsHTML(stars) + '</button>';
  }

  SCREENS.levels = {
    html: function (params) {
      var p = profile();
      var list = params.section === 'forms' ? LV.forms : LV.syllables;
      var next = firstUndone(p, list);
      var hint = params.section === 'forms'
        ? 'Читай слово по складам. Забыл склад — нажми на него.'
        : 'Прочитай склад и найди картинку, которая с него начинается.';
      return '<main class="screen screen--levels">' +
        '<header class="topbar"><button class="icon-btn" data-act="go" data-to="menu" aria-label="Назад">←</button>' +
        '<span class="brand">' + SECTION_TITLES[params.section] + '</span><span class="topbar-gap"></span></header>' +
        '<p class="lead">' + hint + '</p>' +
        '<div class="level-grid">' + list.map(function (l, i) { return levelTile(p, l, i, l === next); }).join('') + '</div>' +
        '</main>';
    }
  };

  SCREENS.themes = {
    html: function () {
      var p = profile();
      var tiles = LV.themes.map(function (t) {
        var done = doneCount(p, t.levels);
        var full = done === t.levels.length;
        return '<button class="theme-tile' + (full ? ' is-done' : '') + '" data-act="theme" data-id="' + t.theme.id + '">' +
          '<span class="theme-emoji" aria-hidden="true">' + t.theme.emoji + '</span>' +
          '<span class="tile-title">' + esc(t.theme.title) + '</span>' +
          '<span class="tile-meta">' + (full ? '✓ пройдено' : done + ' из ' + t.levels.length) + '</span></button>';
      }).join('');
      return '<main class="screen screen--themes">' +
        '<header class="topbar"><button class="icon-btn" data-act="go" data-to="menu" aria-label="Назад">←</button>' +
        '<span class="brand">Слова по темам</span><span class="topbar-gap"></span></header>' +
        '<p class="lead">Выбери, о чём хочешь читать.</p>' +
        '<div class="theme-grid">' + tiles + '</div></main>';
    }
  };

  SCREENS.theme = {
    html: function (params) {
      var p = profile();
      var t = LV.themes.filter(function (x) { return x.theme.id === params.id; })[0];
      var next = firstUndone(p, t.levels);
      return '<main class="screen screen--levels">' +
        '<header class="topbar"><button class="icon-btn" data-act="go" data-to="themes" aria-label="Назад">←</button>' +
        '<span class="brand">' + t.theme.emoji + ' ' + esc(t.theme.title) + '</span><span class="topbar-gap"></span></header>' +
        '<div class="level-grid">' + t.levels.map(function (l, i) { return levelTile(p, l, i, l === next); }).join('') + '</div></main>';
    }
  };

  /* ---------- игра ---------- */

  function startLevel(id) {
    var p = profile();
    var level = LV.byId[id];
    if (!level) return;
    var tasks = Lv.makeTasks(level, W, { count: p.tasks, options: p.options, errorWords: p.stats.wordErrors });
    if (!tasks.length) return;
    ui.game = { level: level, tasks: tasks, i: 0, errors: 0, taskErrors: 0, locked: false, startedAt: Date.now(), tutorial: p.tutorialDone ? 0 : 1 };
    go('game');
  }

  SCREENS.game = {
    html: function () {
      var p = profile();
      var g = ui.game;
      var dots = g.tasks.map(function () { return '<span class="dot"></span>'; }).join('');
      return '<main class="screen screen--game">' +
        '<header class="game-top">' +
          '<button class="icon-btn icon-btn--small" data-act="quit" aria-label="Выйти из уровня">✕</button>' +
          '<div class="progress" aria-label="Задания">' + dots + '</div>' +
          '<button class="icon-btn icon-btn--small" data-act="repeat" aria-label="Послушать ещё раз">🔊</button>' +
        '</header>' +
        '<section class="stage">' +
          '<div class="critter-zone critter-zone--game"><div class="critter-wrap">' + Characters.html(p.character) +
            '<div class="plate" aria-hidden="true"></div></div><div class="bubble" role="status"></div></div>' +
          '<div class="reading">' +
            '<div class="frame" id="frame"></div>' +
            '<div class="options" id="options"></div>' +
          '</div>' +
        '</section>' +
        '<div class="confirm" id="confirm" hidden><div class="confirm-box">' +
          '<p>Выйти из уровня?</p>' +
          '<div class="confirm-actions"><button class="btn" data-act="quit-yes">Да, выйти</button>' +
          '<button class="btn btn--primary" data-act="quit-no">Нет, играем</button></div></div></div>' +
        '</main>';
    },
    mount: function () { renderTask(); }
  };

  function captionHTML(task) {
    var w = task.target;
    if (task.sklad) {
      return '<b>' + esc(lettered(w.sklady[0])) + '</b>' + esc(lettered(w.sklady.slice(1).join('')));
    }
    return esc(lettered(w.text));
  }

  function renderTask() {
    var g = ui.game;
    var p = profile();
    var t = g.tasks[g.i];
    g.taskErrors = 0;
    g.locked = false;
    var frame = $('#frame');
    var options = $('#options');
    if (t.sklad) {
      frame.className = 'frame frame--syllable';
      frame.innerHTML = '<button class="cube cube--stress cube--solo" data-act="cube" data-i="0">' + esc(lettered(t.sklad)) + '</button>';
    } else {
      var colors = S.colors(t.target);
      frame.className = 'frame frame--word';
      frame.innerHTML = t.target.sklady.map(function (s, i) {
        return '<button class="cube cube--' + colors[i] + '" data-act="cube" data-i="' + i + '">' + esc(lettered(s)) + '</button>';
      }).join('');
    }
    frame.style.setProperty('--count', t.sklad ? 1 : t.target.sklady.length);
    options.className = 'options options--' + t.options.length;
    options.innerHTML = t.options.map(function (w, i) {
      return '<button class="card" data-act="answer" data-i="' + i + '" aria-label="Картинка ' + (i + 1) + '">' +
        '<span class="card-emoji">' + w.emoji + '</span>' +
        '<span class="card-caption">' + (i === t.answer ? captionHTML(t) : '') + '</span></button>';
    }).join('');
    $$('.progress .dot').forEach(function (d, i) {
      d.classList.toggle('is-done', i < g.i);
      d.classList.toggle('is-now', i === g.i);
    });
    if (!reduceMotion) {
      frame.classList.add('is-enter');
      options.classList.add('is-enter');
    }
    if (g.tutorial === 1) {
      showHand(frame);
      critterSay(LINES.tutorCube);
    } else if (p.autoVoice) {
      speakTask();
    }
  }

  function showHand(container) {
    $$('.hand').forEach(function (h) { h.remove(); });
    if (!container) return;
    var h = document.createElement('span');
    h.className = 'hand';
    h.setAttribute('aria-hidden', 'true');
    h.textContent = '👆';
    container.appendChild(h);
  }

  function speakTask() {
    var t = ui.game.tasks[ui.game.i];
    if (t.sklad) return Speech.say(t.sklad, { rateMul: 0.9 });
    return Speech.say(t.target.text, { rateMul: 0.9 });
  }

  // Слово по кускам для подсказки: КО-Ш-КА -> «кош», «ка».
  function chunks(word) {
    var out = [];
    word.parts.forEach(function (part) {
      if (S.isOpenKind(part.kind) || !out.length) out.push(part.t);
      else out[out.length - 1] += part.t;
    });
    return out;
  }

  function onCube(el) {
    var g = ui.game;
    if (!g) return;
    var t = g.tasks[g.i];
    var i = Number(el.getAttribute('data-i'));
    var p = profile();
    var range = t.sklad ? { from: 0, to: 0 } : S.speakRange(t.target, i);
    var text = t.sklad ? t.sklad : S.rangeText(t.target, range);
    bump(p.stats.taps, t.sklad || t.target.sklady[i]);
    var cubes = $$('#frame .cube');
    cubes.forEach(function (c) { c.classList.remove('is-speaking'); });
    for (var k = range.from; k <= range.to; k++) if (cubes[k]) cubes[k].classList.add('is-speaking');
    clearTimeout(ui.timers.cube);
    Speech.say(text, { rateMul: 0.9 }).then(function () {
      cubes.forEach(function (c) { c.classList.remove('is-speaking'); });
    });
    ui.timers.cube = setTimeout(function () { cubes.forEach(function (c) { c.classList.remove('is-speaking'); }); }, 1600);
    if (g.tutorial === 1) {
      g.tutorial = 2;
      showHand($('#options'));
      setTimeout(function () { if (ui.game === g && g.tutorial === 2) critterSay(LINES.tutorPick, { interrupt: false }); }, 50);
    }
  }

  function nextFood() {
    var pool = Math.random() < 0.1 ? RARE : FOODS;
    var f;
    do { f = pick(pool); } while (ui.lastFood && f[0] === ui.lastFood[0]);
    ui.lastFood = f;
    return f;
  }

  function mouthPoint() {
    var c = $('[data-critter]');
    if (!c) return { x: window.innerWidth / 4, y: window.innerHeight / 2 };
    var r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.58 };
  }

  function fly(fromEl, emoji, done) {
    var r = fromEl.getBoundingClientRect();
    var to = mouthPoint();
    var el = document.createElement('span');
    el.className = 'flyer';
    el.textContent = emoji;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    var x0 = r.left + r.width / 2;
    var y0 = r.top + r.height / 2;
    if (reduceMotion || !el.animate) {
      el.remove();
      done();
      return;
    }
    var anim = el.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) translate(-50%,-50%) scale(1)' },
      { transform: 'translate(' + ((x0 + to.x) / 2) + 'px,' + (Math.min(y0, to.y) - 90) + 'px) translate(-50%,-50%) scale(1.15)', offset: 0.45 },
      { transform: 'translate(' + to.x + 'px,' + to.y + 'px) translate(-50%,-50%) scale(.35)' }
    ], { duration: 700, easing: 'ease-in-out' });
    anim.onfinish = function () { el.remove(); done(); };
  }

  function bugRunsAway() {
    if (reduceMotion || !document.body.animate) return;
    var to = mouthPoint();
    var el = document.createElement('span');
    el.className = 'flyer flyer--bug';
    el.textContent = '🪳';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    var anim = el.animate([
      { transform: 'translate(' + to.x + 'px,' + (to.y + 40) + 'px) translate(-50%,-50%) rotate(90deg)' },
      { transform: 'translate(' + (-80) + 'px,' + (to.y + 90) + 'px) translate(-50%,-50%) rotate(100deg)' }
    ], { duration: 900, easing: 'ease-in' });
    anim.onfinish = function () { el.remove(); };
  }

  function onAnswer(el) {
    var g = ui.game;
    if (!g || g.locked || el.disabled) return;
    var p = profile();
    var t = g.tasks[g.i];
    var i = Number(el.getAttribute('data-i'));
    showHand(null);
    if (i === t.answer) {
      g.locked = true;
      if (g.tutorial) { g.tutorial = 0; p.tutorialDone = true; }
      Sfx.right();
      el.classList.add('is-right');
      $('#options').classList.add('is-solved');
      bump(p.stats, 'total');
      if (g.taskErrors === 0) bump(p.stats, 'firstTry');
      var food = nextFood();
      bump(p.pantry, food[0]);
      save();
      var plate = $('.plate');
      fly(el, food[0], function () {
        critterState('is-eat', 1300);
        if (plate) { plate.textContent = food[0]; plate.classList.add('is-on'); setTimeout(function () { plate.classList.remove('is-on'); }, 900); }
      });
      var line = fill(pick(LINES.praise), p, food[1]);
      var talk = Speech.say(t.target.text, { rateMul: 0.95 }).then(function () {
        return critterSay(line, { interrupt: false });
      });
      Promise.all([talk, wait(1900)]).then(function () { return wait(200); }).then(function () {
        if (ui.game !== g) return;
        g.i++;
        if (g.i >= g.tasks.length) finishLevel();
        else renderTask();
      });
      return;
    }
    g.errors++;
    g.taskErrors++;
    Sfx.wrong();
    el.classList.add('is-wrong');
    el.disabled = true;
    if (t.sklad) bump(p.stats.skladErrors, t.sklad);
    else bump(p.stats.wordErrors, t.target.text);
    save();
    if (p.cockroach) {
      fly(el, '🪳', function () { critterState('is-yuck', 1300); bugRunsAway(); });
      critterSay(pick(LINES.bug));
    } else {
      critterState('is-oops', 1000);
      critterSay(pick(LINES.oops));
    }
    var frame = $('#frame');
    frame.classList.remove('is-hint');
    void frame.offsetWidth;
    frame.classList.add('is-hint');
    if (g.taskErrors >= 2) {
      var parts = t.sklad ? [t.sklad] : chunks(t.target);
      parts.forEach(function (c) { Speech.say(c, { interrupt: false, rateMul: 0.8 }); });
    }
    if (g.taskErrors >= 3) {
      var right = $$('#options .card')[t.answer];
      if (right) right.classList.add('is-glow');
    }
  }

  function finishLevel() {
    var g = ui.game;
    var p = profile();
    var stars = Lv.stars(g.errors);
    var rec = p.progress[g.level.id] || { stars: 0, plays: 0 };
    rec.stars = Math.max(rec.stars, stars);
    rec.plays++;
    p.progress[g.level.id] = rec;
    addPlayTime();
    save();
    var timeUp = p.restMinutes > 0 && Date.now() - ui.sessionStart >= p.restMinutes * 60000;
    go('result', { levelId: g.level.id, stars: stars, timeUp: timeUp });
  }

  SCREENS.result = {
    html: function (params) {
      var p = profile();
      var level = LV.byId[params.levelId];
      var next = levelAfter(level);
      var title = params.timeUp ? 'Пора отдохнуть!' : 'Уровень пройден!';
      var buttons = params.timeUp
        ? '<button class="btn btn--primary" data-act="go" data-to="profiles">Закончить</button>' +
          '<button class="btn" data-act="start" data-id="' + (next ? next.id : level.id) + '">Ещё один уровень</button>'
        : (next ? '<button class="btn btn--primary" data-act="start" data-id="' + next.id + '">Дальше</button>' : '') +
          '<button class="btn" data-act="start" data-id="' + level.id + '">Ещё раз</button>' +
          '<button class="btn" data-act="go" data-to="menu">В меню</button>';
      return '<main class="screen screen--result">' +
        '<div class="critter-zone critter-zone--result">' + Characters.html(p.character) + '<div class="bubble" role="status"></div></div>' +
        '<h1 class="screen-title">' + title + '</h1>' +
        '<p class="lead">' + esc(levelLabel(level)) + '</p>' +
        '<div class="result-stars">' + starsHTML(params.stars) + '</div>' +
        '<div class="result-actions">' + buttons + '</div></main>';
    },
    mount: function (params) {
      var p = profile();
      Sfx.fanfare();
      critterState('is-party', 2400);
      critterSay(fill(pick(params.timeUp ? LINES.rest : LINES.end), p));
    }
  };

  /* ---------- таблица складов ---------- */

  var CONSONANTS = 'бвгджзклмнпрстфхцчшщ'.split('');
  var VOWEL_ROWS = { hard: 'аоуыэ'.split(''), soft: 'яёюие'.split('') };

  function possible(c, v) {
    if ('жшчщ'.indexOf(c) >= 0 && v === 'ы') return false;
    if ('чщц'.indexOf(c) >= 0 && 'яю'.indexOf(v) >= 0) return false;
    if ('жш'.indexOf(c) >= 0 && v === 'я') return false;
    if ('кгх'.indexOf(c) >= 0 && 'ыяюё'.indexOf(v) >= 0) return false;
    if ('чщ'.indexOf(c) >= 0 && v === 'э') return false;
    return true;
  }

  function exampleFor(sklad) {
    var clear = null;
    var any = null;
    for (var i = 0; i < W.all.length; i++) {
      var w = W.all[i];
      if (w.sklady[0] !== sklad) continue;
      if (w.firstClear) { clear = w; break; }
      if (!any) any = w;
    }
    return clear || any;
  }

  SCREENS.table = {
    html: function (params) {
      var half = params.half === 'soft' ? 'soft' : 'hard';
      var vowels = VOWEL_ROWS[half];
      var head = '<tr><th scope="col"></th>' + vowels.map(function (v) {
        return '<th scope="col"><button class="cell cell--vowel" data-act="cell" data-s="' + v + '">' + esc(lettered(v)) + '</button></th>';
      }).join('') + '</tr>';
      var rows = CONSONANTS.map(function (c) {
        return '<tr><th scope="row">' + esc(lettered(c)) + '</th>' + vowels.map(function (v) {
          if (!possible(c, v)) return '<td></td>';
          return '<td><button class="cell" data-act="cell" data-s="' + c + v + '">' + esc(lettered(c + v)) + '</button></td>';
        }).join('') + '</tr>';
      }).join('');
      return '<main class="screen screen--table">' +
        '<header class="topbar"><button class="icon-btn" data-act="go" data-to="menu" aria-label="Назад">←</button>' +
        '<span class="brand">Таблица складов</span><span class="topbar-gap"></span></header>' +
        '<div class="tabs" role="tablist">' +
          '<button class="tab' + (half === 'hard' ? ' is-on' : '') + '" role="tab" aria-selected="' + (half === 'hard') + '" data-act="go" data-to="table" data-half="hard">' + esc(lettered('а о у ы э')) + '</button>' +
          '<button class="tab' + (half === 'soft' ? ' is-on' : '') + '" role="tab" aria-selected="' + (half === 'soft') + '" data-act="go" data-to="table" data-half="soft">' + esc(lettered('я ё ю и е')) + '</button>' +
        '</div>' +
        '<div class="table-hint" id="table-hint" aria-live="polite">Нажми на склад — услышишь, как он читается.</div>' +
        '<div class="table-wrap"><table class="sklad-table">' + head + rows + '</table></div></main>';
    }
  };

  function onCell(el) {
    var s = el.getAttribute('data-s');
    $$('.cell.is-speaking').forEach(function (c) { c.classList.remove('is-speaking'); });
    el.classList.add('is-speaking');
    var hint = $('#table-hint');
    var w = exampleFor(s);
    Speech.say(s, { rateMul: 0.9 }).then(function () { el.classList.remove('is-speaking'); });
    if (w) {
      Speech.say(w.text, { interrupt: false });
      hint.innerHTML = '<span class="hint-emoji" aria-hidden="true">' + w.emoji + '</span> <b>' + esc(lettered(w.sklady[0])) + '</b>' + esc(lettered(w.sklady.slice(1).join('')));
    } else {
      hint.innerHTML = '<b>' + esc(lettered(s)) + '</b>';
    }
  }

  /* ---------- кладовая ---------- */

  SCREENS.pantry = {
    html: function () {
      var p = profile();
      var items = FOODS.concat(RARE).map(function (f) {
        var n = p.pantry[f[0]] || 0;
        return '<div class="pantry-item' + (n ? '' : ' is-empty') + '">' +
          '<span class="pantry-emoji" aria-hidden="true">' + (n ? f[0] : '❔') + '</span>' +
          '<span class="pantry-name">' + (n ? esc(cap(f[1])) : '???') + '</span>' +
          (n ? '<span class="pantry-count">×' + n + '</span>' : '') + '</div>';
      }).join('');
      return '<main class="screen screen--pantry">' +
        '<header class="topbar"><button class="icon-btn" data-act="go" data-to="menu" aria-label="Назад">←</button>' +
        '<span class="brand">Кладовая: ' + esc(p.character.name) + '</span><span class="topbar-gap"></span></header>' +
        '<p class="lead">Всё, чем ты угощала друга. Знаки вопроса — угощения, которые ещё впереди.</p>' +
        '<div class="pantry-grid">' + items + '</div></main>';
    }
  };

  /* ---------- родительский раздел ---------- */

  SCREENS.gate = {
    html: function (params) {
      var keys = params.keys;
      var entered = params.entered || [];
      return '<main class="screen screen--gate">' +
        '<header class="topbar"><button class="icon-btn" data-act="go" data-to="profiles" aria-label="Назад">←</button>' +
        '<span class="brand">Для взрослых</span><span class="topbar-gap"></span></header>' +
        '<p class="lead">Нажмите по порядку: <b>' + params.code.map(function (d) { return NUMBER_WORDS[d]; }).join(', ') + '</b></p>' +
        '<div class="gate-dots">' + params.code.map(function (d, i) { return '<span class="dot' + (i < entered.length ? ' is-done' : '') + '"></span>'; }).join('') + '</div>' +
        (params.wrong ? '<p class="note">Не та цифра. Попробуйте ещё раз.</p>' : '') +
        '<div class="keypad">' + keys.map(function (k) { return '<button class="key" data-act="key" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        '</main>';
    }
  };

  function openGate() {
    var digits = Lv.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], Math.random).slice(0, 3);
    go('gate', { code: digits, entered: [], keys: Lv.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], Math.random) });
  }

  function onKey(el) {
    var params = ui.params;
    var k = Number(el.getAttribute('data-k'));
    var entered = params.entered.concat([k]);
    if (params.code[entered.length - 1] !== k) {
      go('gate', { code: params.code, entered: [], wrong: true, keys: params.keys });
      return;
    }
    if (entered.length === params.code.length) go('parents', { tab: 'progress' });
    else go('gate', { code: params.code, entered: entered, keys: params.keys });
  }

  function topList(obj, n) {
    return Object.keys(obj).map(function (k) { return [k, obj[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, n);
  }

  function chips(list, render) {
    if (!list.length) return '<span class="muted">пока нет</span>';
    return list.map(function (x) { return '<span class="chip">' + render(x) + '</span>'; }).join('');
  }

  function progressCard(p) {
    var st = p.stats;
    var days = '';
    var totalWeek = 0;
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * 86400000);
      var m = d.getMonth() + 1;
      var day = d.getDate();
      var key = d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
      var secs = st.days[key] || 0;
      if (i < 7) totalWeek += secs;
      days += '<span class="day' + (secs ? ' is-on' : '') + '" title="' + day + '.' + m + ': ' + Math.round(secs / 60) + ' мин"></span>';
    }
    var all = Object.keys(st.days).reduce(function (s, k) { return s + st.days[k]; }, 0);
    var acc = st.total ? Math.round(st.firstTry * 100 / st.total) + '%' : '—';
    return '<article class="panel">' +
      '<div class="panel-head">' + Characters.html(p.character) + '<h2>' + esc(p.name) + '</h2></div>' +
      '<dl class="facts">' +
        '<div><dt>Слоги</dt><dd>' + doneCount(p, LV.syllables) + ' из ' + LV.syllables.length + '</dd></div>' +
        '<div><dt>Формы слов</dt><dd>' + doneCount(p, LV.forms) + ' из ' + LV.forms.length + '</dd></div>' +
        '<div><dt>Уровни тем</dt><dd>' + doneCount(p, THEME_LEVELS) + ' из ' + THEME_LEVELS.length + '</dd></div>' +
        '<div><dt>С первой попытки</dt><dd>' + acc + '</dd></div>' +
        '<div><dt>За 7 дней</dt><dd>' + Math.round(totalWeek / 60) + ' мин</dd></div>' +
        '<div><dt>Всего</dt><dd>' + Math.round(all / 60) + ' мин</dd></div>' +
      '</dl>' +
      '<h3>Занятия за 2 недели</h3><div class="days">' + days + '</div>' +
      '<h3>Ошибки в слогах</h3><div class="chips">' + chips(topList(st.skladErrors, 8), function (x) { return esc(lettered(x[0])) + ' ×' + x[1]; }) + '</div>' +
      '<h3>Трудные слова</h3><div class="chips">' + chips(topList(st.wordErrors, 8), function (x) {
        var w = W.byText[x[0]];
        return (w ? w.emoji + ' ' : '') + esc(lettered(x[0])) + ' ×' + x[1];
      }) + '</div>' +
      '<h3>Чаще всего нажимала, чтобы послушать</h3><div class="chips">' + chips(topList(st.taps, 8), function (x) { return esc(lettered(x[0])) + ' ×' + x[1]; }) + '</div>' +
      '</article>';
  }

  function option(value, current, label) {
    return '<option value="' + value + '"' + (String(value) === String(current) ? ' selected' : '') + '>' + label + '</option>';
  }

  function childSettings(p) {
    var id = p.id;
    var ch = p.character;
    return '<fieldset class="panel">' +
      '<legend>' + esc(p.name) + '</legend>' +
      '<div class="panel-head">' + Characters.html(ch) + '<p class="muted">Кого кормит: ' + esc(ch.name) + '</p></div>' +
      '<label class="field"><span>Имя</span><input id="name-' + id + '" data-field="name" data-pid="' + id + '" value="' + esc(p.name) + '" maxlength="20"></label>' +
      '<label class="field"><span>Как читает сейчас</span><select id="reading-' + id + '" data-field="reading" data-pid="' + id + '">' +
        option('beginner', p.reading, 'Только начинает — с «Слогов»') + option('reader', p.reading, 'Уже читает — с «Форм слов»') + '</select></label>' +
      '<label class="field"><span>Картинок в задании</span><select id="options-' + id + '" data-field="options" data-pid="' + id + '">' +
        option(2, p.options, '2') + option(3, p.options, '3') + option(4, p.options, '4') + '</select></label>' +
      '<label class="field"><span>Заданий в уровне</span><select id="tasks-' + id + '" data-field="tasks" data-pid="' + id + '">' +
        option(5, p.tasks, '5') + option(8, p.tasks, '8') + option(10, p.tasks, '10') + '</select></label>' +
      '<label class="field"><span>Предложить отдых через</span><select id="rest-' + id + '" data-field="restMinutes" data-pid="' + id + '">' +
        option(0, p.restMinutes, 'не предлагать') + option(10, p.restMinutes, '10 минут') + option(15, p.restMinutes, '15 минут') +
        option(20, p.restMinutes, '20 минут') + option(30, p.restMinutes, '30 минут') + '</select></label>' +
      '<label class="check"><input type="checkbox" id="auto-' + id + '" data-field="autoVoice" data-pid="' + id + '"' + (p.autoVoice ? ' checked' : '') + '>' +
        '<span>Сразу озвучивать задание (для самых маленьких)</span></label>' +
      '<label class="check"><input type="checkbox" id="bug-' + id + '" data-field="cockroach" data-pid="' + id + '"' + (p.cockroach ? ' checked' : '') + '>' +
        '<span>Таракан за ошибку (если выключить — просто пустая тарелка)</span></label>' +
      '<h3>Персонаж</h3>' +
      '<label class="field"><span>Кто это</span><select id="look-' + id + '" data-field="look" data-pid="' + id + '">' +
        Characters.LOOKS.map(function (l) { return option(l.id, ch.look, l.title); }).join('') + '</select></label>' +
      '<label class="field"><span>Как зовут</span><input id="cname-' + id + '" data-field="cname" data-pid="' + id + '" value="' + esc(ch.name) + '" maxlength="20"></label>' +
      (ch.look === 'photo'
        ? '<label class="field"><span>Картинка или фото игрушки</span><input type="file" accept="image/*" id="photo-' + id + '" data-field="photo" data-pid="' + id + '"></label>' +
          (ch.image ? '<button class="btn btn--small" data-act="photo-clear" data-pid="' + id + '">Убрать картинку</button>' : '<p class="muted">Пока картинки нет, в игре будет хомячок.</p>')
        : '') +
      '<div class="row-actions">' +
        '<button class="btn btn--small" data-act="tutorial-again" data-pid="' + id + '">Показать обучение снова</button>' +
        (ui.params.confirmReset === id
          ? '<span class="confirm-inline">Стереть весь прогресс? <button class="btn btn--small btn--danger" data-act="reset-yes" data-pid="' + id + '">Да, стереть</button>' +
            '<button class="btn btn--small" data-act="reset-no">Нет</button></span>'
          : '<button class="btn btn--small" data-act="reset" data-pid="' + id + '">Сбросить прогресс</button>') +
      '</div></fieldset>';
  }

  function voiceSettings() {
    var voices = Speech.voices();
    var voiceBlock;
    if (!Speech.supported) {
      voiceBlock = '<p class="note">Этот браузер не умеет озвучивать текст. Откройте игру в Safari, Chrome, Edge или Яндекс Браузере.</p>';
    } else if (!voices.length) {
      voiceBlock = '<p class="note">На устройстве не найден русский голос. На iPhone и iPad: Настройки → Универсальный доступ → Устно → Голоса → Русский. ' +
        'На Android: Настройки → Синтез речи → Google → установить русский язык. Потом перезапустите игру.</p>';
    } else {
      voiceBlock = '<label class="field"><span>Голос</span><select id="voice" data-field="voice">' +
        voices.map(function (v) { return option(esc(v.voiceURI), Speech.voiceURI, esc(v.name)); }).join('') + '</select></label>';
    }
    return '<fieldset class="panel"><legend>Голос и вид</legend>' + voiceBlock +
      '<label class="field"><span>Скорость речи</span><input type="range" id="rate" data-field="rate" min="0.6" max="1.2" step="0.05" value="' + data.settings.rate + '"></label>' +
      '<div class="row-actions"><button class="btn btn--small" data-act="voice-test">Послушать: ма, ша, кошка</button></div>' +
      '<label class="field"><span>Буквы</span><select id="case" data-field="letterCase">' +
        option('upper', data.settings.letterCase, 'ЗАГЛАВНЫЕ') + option('lower', data.settings.letterCase, 'строчные') + '</select></label>' +
      '<label class="check"><input type="checkbox" id="sounds" data-field="sounds"' + (data.settings.sounds ? ' checked' : '') + '><span>Звуки «дзынь» и «бум»</span></label>' +
      '</fieldset>';
  }

  var HELP = [
    ['Каждый день понемногу', 'Лучше всего 10–15 минут каждый день. Игра сама предложит отдохнуть — время меняется в настройках.'],
    ['Склады, а не буквы', 'Не называйте отдельные буквы («эм», «а»). Сразу говорите склад: «ма», «ба», «ва». Иначе ЖАБА превращается в «жэ-а-бэ-а».'],
    ['Мотивация', 'Перед игрой скажите, что друг очень голодный и ждёт помощи. Подбадривайте: «Ого, мороженое! А что будет в следующий раз?»'],
    ['Пусть ошибается', 'Не останавливайте неверное нажатие. Друг получит таракана, а вы улыбнитесь: «Чуть тараканом не накормили! Нажми на склад и послушай». Подсказка звучит сама после второй ошибки.'],
    ['С чего начать', '«Слоги»: ребёнок читает склад в рамке и ищет картинку, которая с него начинается. Параллельно можно открывать простые темы — склады легче запомнить в знакомых словах.'],
    ['Дальше', '«Формы слов» идут от простых двусложных слов (КАША) к длинным. После 5–7 уровней переходите к темам.'],
    ['Цвета', 'Чёрный склад — ударный. Остальные склады чередуют два зелёных цвета, чтобы их было легко различать.'],
    ['Самые маленькие', 'Если малыш смотрит только на картинки: «Сначала нажми на склад и послушай, потом найди картинку». Через 5–10 раз он запомнит порядок. Можно включить автоозвучку задания.'],
    ['Про голос', 'Склады читает синтез речи устройства. Одиночную согласную он называет как букву («бэ»), поэтому в игре согласная звучит вместе с соседним складом: в КО-Ш-КА нажали Ш — прозвучит «кош».'],
    ['Где хранится прогресс', 'Только на этом устройстве и в этом браузере. Если открыть игру на другом планшете, прогресс начнётся заново.']
  ];

  SCREENS.parents = {
    html: function (params) {
      var tab = params.tab || 'progress';
      var body;
      if (tab === 'settings') {
        body = voiceSettings() + data.order.map(function (id) { return childSettings(data.profiles[id]); }).join('');
      } else if (tab === 'help') {
        body = '<div class="help">' + HELP.map(function (h) { return '<article class="panel"><h2>' + h[0] + '</h2><p>' + h[1] + '</p></article>'; }).join('') + '</div>';
      } else {
        body = data.order.map(function (id) { return progressCard(data.profiles[id]); }).join('');
      }
      var tabBtn = function (id, label) {
        return '<button class="tab' + (tab === id ? ' is-on' : '') + '" role="tab" aria-selected="' + (tab === id) + '" data-act="go" data-to="parents" data-tab="' + id + '">' + label + '</button>';
      };
      return '<main class="screen screen--parents">' +
        '<header class="topbar"><button class="icon-btn" data-act="go" data-to="profiles" aria-label="Назад">←</button>' +
        '<span class="brand">Для родителей</span><span class="topbar-gap"></span></header>' +
        '<div class="tabs" role="tablist">' + tabBtn('progress', 'Прогресс') + tabBtn('settings', 'Настройки') + tabBtn('help', 'Как играть') + '</div>' +
        '<div class="parents-body">' + body + '</div></main>';
    }
  };

  function resizeImage(file, done) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 360;
        var k = Math.min(1, max / Math.max(img.width, img.height));
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * k);
        canvas.height = Math.round(img.height * k);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        var url = canvas.toDataURL('image/webp', 0.88);
        if (url.indexOf('data:image/webp') !== 0) url = canvas.toDataURL('image/png');
        done(url);
      };
      img.onerror = function () { done(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { done(null); };
    reader.readAsDataURL(file);
  }

  function onField(el) {
    var field = el.getAttribute('data-field');
    var pid = el.getAttribute('data-pid');
    var p = pid ? data.profiles[pid] : null;
    var rerender = false;
    switch (field) {
      case 'name': p.name = el.value.trim() || p.name; break;
      case 'reading': p.reading = el.value; break;
      case 'options': p.options = Number(el.value); break;
      case 'tasks': p.tasks = Number(el.value); break;
      case 'restMinutes': p.restMinutes = Number(el.value); break;
      case 'autoVoice': p.autoVoice = el.checked; break;
      case 'cockroach': p.cockroach = el.checked; break;
      case 'look': p.character.look = el.value; rerender = true; break;
      case 'cname': p.character.name = el.value.trim() || p.character.name; rerender = true; break;
      case 'photo':
        if (el.files && el.files[0]) {
          resizeImage(el.files[0], function (url) {
            if (!url) return;
            p.character.image = url;
            if (!Store.save(data)) {
              p.character.image = null;
              window.setTimeout(function () { alertNote('Картинка слишком большая для памяти браузера. Попробуйте другую.'); }, 0);
            }
            render();
          });
        }
        return;
      case 'voice': data.settings.voiceURI = el.value; Speech.choose(el.value); break;
      case 'rate': data.settings.rate = Number(el.value); Speech.rate = data.settings.rate; break;
      case 'letterCase': data.settings.letterCase = el.value; break;
      case 'sounds': data.settings.sounds = el.checked; Sfx.enabled = el.checked; break;
      default: return;
    }
    save();
    if (rerender) render();
  }

  function alertNote(text) {
    var body = $('.parents-body');
    if (!body) return;
    var n = document.createElement('p');
    n.className = 'note';
    n.textContent = text;
    body.insertBefore(n, body.firstChild);
  }

  /* ---------- навигация и события ---------- */

  function go(screen, params) {
    if (ui.screen === 'game' && screen !== 'game') addPlayTime();
    if (screen !== 'game') ui.game = screen === 'result' ? ui.game : null;
    Speech.stop();
    ui.screen = screen;
    ui.params = params || {};
    render();
  }

  function render() {
    var s = SCREENS[ui.screen];
    app.innerHTML = s.html(ui.params);
    window.scrollTo(0, 0);
    if (s.mount) s.mount(ui.params);
  }

  var ACTIONS = {
    'pick-profile': function (el) {
      ui.profileId = el.getAttribute('data-id');
      ui.sessionStart = Date.now();
      go('menu');
    },
    go: function (el) {
      var to = el.getAttribute('data-to');
      var params = {};
      ['section', 'half', 'tab', 'id'].forEach(function (k) {
        var v = el.getAttribute('data-' + k);
        if (v) params[k] = v;
      });
      if (to === 'menu' && ui.game) ui.game = null;
      go(to, params);
    },
    gate: openGate,
    key: onKey,
    start: function (el) { startLevel(el.getAttribute('data-id')); },
    theme: function (el) {
      var id = el.getAttribute('data-id');
      var t = LV.themes.filter(function (x) { return x.theme.id === id; })[0];
      if (t.levels.length === 1) startLevel(t.levels[0].id);
      else go('theme', { id: id });
    },
    cube: onCube,
    answer: onAnswer,
    repeat: function () { if (ui.game) speakTask(); },
    quit: function () { $('#confirm').hidden = false; },
    'quit-no': function () { $('#confirm').hidden = true; },
    'quit-yes': function () { go('menu'); },
    cell: onCell,
    'voice-test': function () {
      Speech.say('ма', { rateMul: 0.9 });
      Speech.say('ша', { interrupt: false, rateMul: 0.9 });
      Speech.say('кошка', { interrupt: false });
    },
    'photo-clear': function (el) {
      data.profiles[el.getAttribute('data-pid')].character.image = null;
      save();
      render();
    },
    'tutorial-again': function (el) {
      data.profiles[el.getAttribute('data-pid')].tutorialDone = false;
      save();
      el.textContent = 'Обучение покажем в следующем уровне';
    },
    reset: function (el) { go('parents', { tab: 'settings', confirmReset: el.getAttribute('data-pid') }); },
    'reset-no': function () { go('parents', { tab: 'settings' }); },
    'reset-yes': function (el) {
      Store.resetProfile(data, el.getAttribute('data-pid'));
      save();
      go('parents', { tab: 'settings' });
    }
  };

  app.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || !app.contains(el)) return;
    var fn = ACTIONS[el.getAttribute('data-act')];
    if (fn) fn(el, e);
  });
  app.addEventListener('change', function (e) {
    if (e.target.hasAttribute('data-field')) onField(e.target);
  });
  document.addEventListener('pointerdown', function () { Sfx.unlock(); }, true);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { Speech.stop(); addPlayTime(); save(); if (ui.game) ui.game.startedAt = 0; }
    else if (ui.game && !ui.game.startedAt) ui.game.startedAt = Date.now();
  });

  Sfx.enabled = data.settings.sounds;
  Speech.init(data.settings.voiceURI, data.settings.rate);
  Speech.onVoices(function () {
    if (ui.screen === 'profiles' || (ui.screen === 'parents' && ui.params.tab === 'settings')) render();
  });

  go('profiles');
})();
