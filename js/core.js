/*
 * Ядро игры: данные, помощники, персонаж, навигация, награды.
 * Экраны подключаются отдельными файлами и регистрируются в App.SCREENS / App.ACTIONS.
 */
(function () {
  'use strict';

  var App = window.App = {};
  var S = App.S = window.Sklady;
  var W = App.W = window.Words;
  var Lv = App.Lv = window.Levels;
  var Speech = App.Speech = window.Speech;
  var Sfx = App.Sfx = window.Sfx;
  var Store = App.Store = window.Store;
  var Characters = App.Characters = window.Characters;

  var LV = App.LV = Lv.build(W);
  App.THEME_LEVELS = [];
  LV.themes.forEach(function (t) { App.THEME_LEVELS = App.THEME_LEVELS.concat(t.levels); });

  var data = App.data = Store.load();
  var root = App.root = document.getElementById('app');
  App.reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  App.SCREENS = {};
  App.ACTIONS = {};
  var ui = App.ui = { screen: null, params: {}, profileId: null, sessionStart: 0, greeted: {}, game: null, lastFood: null, timers: {} };

  /* ---------- разделы и маршруты ---------- */

  App.SECTIONS = {
    listen: { title: 'Шарики', icon: '🎈', hint: 'Послушай склад и лопни нужный шарик.' },
    syllables: { title: 'Слоги', icon: '🔤', hint: 'Прочитай склад и найди картинку, которая с него начинается.' },
    forms: { title: 'Формы слов', icon: '📖', hint: 'Читай слово по складам. Забыла склад — нажми на него.' },
    build: { title: 'Паровозик', icon: '🚂', hint: 'Посмотри на картинку и собери слово из складов-вагончиков.' },
    themes: { title: 'Слова по темам', icon: '🗂️', hint: 'Выбери, о чём хочешь читать.' }
  };

  App.TRACKS = {
    prereader: ['listen', 'syllables', 'build', 'forms'],
    beginner: ['syllables', 'listen', 'forms', 'build'],
    reader: ['forms', 'build', 'syllables', 'listen']
  };

  App.READING_LABELS = {
    prereader: 'Не знает букв — начинаем с «Шариков»',
    beginner: 'Знает буквы — начинаем со «Слогов»',
    reader: 'Читает по слогам — начинаем с «Форм слов»'
  };

  App.sectionLevels = function (section) {
    if (section === 'themes') return App.THEME_LEVELS;
    return LV[section] || [];
  };

  /* ---------- угощения, наклейки, реплики ---------- */

  App.FOODS = [
    ['🍦', 'мороженое'], ['🍞', 'хлеб с маслом'], ['🍎', 'яблоко'], ['🍌', 'банан'], ['🍐', 'груша'],
    ['🍇', 'виноград'], ['🍓', 'клубника'], ['🍒', 'вишня'], ['🍉', 'арбуз'], ['🍊', 'апельсин'],
    ['🥕', 'морковка'], ['🌽', 'кукуруза'], ['🥜', 'орешки'], ['🍪', 'печенье'], ['🥞', 'блинчики'],
    ['🧀', 'сыр'], ['🥣', 'каша'], ['🍬', 'конфета'], ['🫐', 'черника'], ['🥐', 'булочка'],
    ['🍑', 'персик'], ['🍯', 'мёд'], ['🥨', 'крендель'], ['🍭', 'леденец']
  ];
  App.RARE_FOODS = [['🎂', 'торт'], ['🍕', 'пицца'], ['🥧', 'пирог'], ['🌈', 'кусочек радуги']];

  App.STICKERS = [
    ['🐶', 'щенок'], ['🐱', 'котёнок'], ['🐰', 'зайчик'], ['🦊', 'лисичка'], ['🐻', 'медвежонок'],
    ['🐼', 'панда'], ['🐨', 'коала'], ['🐯', 'тигрёнок'], ['🦁', 'львёнок'], ['🐸', 'лягушонок'],
    ['🐵', 'обезьянка'], ['🐧', 'пингвин'], ['🐤', 'цыплёнок'], ['🦉', 'совёнок'], ['🐢', 'черепашка'],
    ['🐠', 'рыбка'], ['🐳', 'кит'], ['🐬', 'дельфин'], ['🦋', 'бабочка'], ['🐞', 'божья коровка'],
    ['🐝', 'пчёлка'], ['🐌', 'улитка'], ['🦔', 'ёжик'], ['🐿️', 'белочка'], ['🌸', 'цветочек'],
    ['🌻', 'подсолнух'], ['🍄', 'грибок'], ['☀️', 'солнышко'], ['🌙', 'месяц'], ['⭐', 'звёздочка'],
    ['☁️', 'облачко'], ['🎈', 'шарик'], ['🪁', 'воздушный змей'], ['🧸', 'мишка'], ['🎨', 'краски'],
    ['🚂', 'паровозик'], ['🚀', 'ракета'], ['⛵', 'кораблик'], ['🚗', 'машинка'], ['🎠', 'карусель'],
    ['🏰', 'дворец'], ['🍭', 'леденец'], ['🧁', 'кекс'], ['🍓', 'клубничка'], ['🍉', 'арбуз'],
    ['🎀', 'бантик'], ['🐙', 'осьминожка'], ['🦒', 'жирафик']
  ];
  App.RARE_STICKERS = [
    ['🦄', 'единорог'], ['🐉', 'дракончик'], ['🧚', 'фея'], ['🧜', 'русалочка'], ['👑', 'корона'],
    ['💎', 'алмаз'], ['🌟', 'волшебная звезда'], ['🦚', 'павлин'], ['🦩', 'фламинго'], ['🪐', 'планета'],
    ['🌈', 'радуга'], ['🎆', 'салют']
  ];
  App.RARE_STICKER_SET = {};
  App.RARE_STICKERS.forEach(function (s) { App.RARE_STICKER_SET[s[0]] = true; });

  App.LINES = {
    greet: [
      'Привет, {child}! Я {critter}. Я очень хочу кушать! Пойдём играть?',
      '{child}, привет! Это я, {critter}. Покорми меня — нажми «Играть»!'
    ],
    praise: ['Ням-ням, {food}!', 'Ура, {food}!', 'Вкуснятина!', 'Молодец, {child}!', 'Ты здорово читаешь!', 'Умница!', 'Ещё!', 'Отлично!'],
    combo: ['Ого, серия! Вот тебе особое угощение!', 'Три подряд! Ты настоящий читатель!', 'Ух ты, без ошибок! Держи сюрприз!'],
    bug: ['Фу, таракан!', 'Ой-ой, таракан!', 'Тьфу! Такое я не ем!', 'Кхе-кхе! Фу!'],
    oops: ['Ой, тарелка пустая!', 'Почти!', 'Давай ещё разок!'],
    end: ['Ух, как вкусно было! Спасибо, {child}!', 'Вот это пир! Ты отлично читаешь, {child}!', 'Ура, животик полный! Спасибо, {child}!'],
    rest: ['Мы сегодня здорово позанимались! Давай отдохнём и поиграем завтра?'],
    gift: 'Выбери подарок!',
    tutorCube: 'Нажми на склад — услышишь, как он читается!',
    tutorPick: 'А теперь найди картинку!',
    tutorListen: 'Послушай и лопни нужный шарик!',
    tutorBuild: 'Нажимай на склады по порядку и собери слово!'
  };

  App.NUMBER_WORDS = ['ноль', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];

  /* ---------- помощники ---------- */

  App.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  App.save = function () { return Store.save(data); };
  App.profile = function () { return data.profiles[ui.profileId]; };
  App.lettered = function (t) { return data.settings.letterCase === 'lower' ? t.toLowerCase() : t.toUpperCase(); };
  App.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  App.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  App.cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  App.fill = function (tpl, p, food) {
    return tpl.replace(/\{child\}/g, p.name).replace(/\{critter\}/g, p.character.name || 'твой друг')
      .replace(/\{food\}/g, food || '').replace(/^(.)/, function (m) { return m.toUpperCase(); });
  };
  App.$ = function (sel) { return root.querySelector(sel); };
  App.$$ = function (sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  App.bump = function (obj, key, n) { obj[key] = (obj[key] || 0) + (n || 1); };

  App.miniCubes = function (sklady, colors) {
    return '<span class="mini-cubes">' + sklady.map(function (s, i) {
      return '<span class="mini-cube mini-cube--' + (colors ? colors[i] : 'stress') + '">' + App.esc(App.lettered(s)) + '</span>';
    }).join('') + '</span>';
  };

  App.starsHTML = function (n) {
    var out = '';
    for (var i = 1; i <= 3; i++) out += '<span class="star' + (i <= n ? ' is-on' : '') + '">★</span>';
    return '<span class="stars" aria-label="Звёзд: ' + n + ' из 3">' + out + '</span>';
  };

  App.topbar = function (title, backTo, extra) {
    return '<header class="topbar">' +
      (backTo ? '<button class="icon-btn" data-act="go" data-to="' + backTo + '" aria-label="Назад">←</button>' : '<span class="topbar-gap"></span>') +
      '<span class="brand">' + title + '</span>' + (extra || '<span class="topbar-gap"></span>') + '</header>';
  };

  /* ---------- прогресс ---------- */

  App.levelRec = function (p, id) { return p.progress[id] || null; };
  App.levelStars = function (p, id) { var r = p.progress[id]; return r ? r.stars || 0 : 0; };
  App.isDone = function (p, id) { var r = p.progress[id]; return !!(r && (r.stars > 0 || r.known)); };
  App.doneCount = function (p, list) { return list.filter(function (l) { return App.isDone(p, l.id); }).length; };
  App.firstUndone = function (p, list) {
    for (var i = 0; i < list.length; i++) if (!App.isDone(p, list[i].id)) return list[i];
    return null;
  };
  App.track = function (p) { return App.TRACKS[p.reading] || App.TRACKS.beginner; };
  App.recommended = function (p) {
    var track = App.track(p);
    for (var i = 0; i < track.length; i++) {
      var l = App.firstUndone(p, App.sectionLevels(track[i]));
      if (l) return l;
    }
    var t = App.firstUndone(p, App.THEME_LEVELS);
    return t || App.sectionLevels(track[0])[0];
  };
  App.levelAfter = function (level) {
    var list = App.sectionLevels(level.section);
    return list[list.indexOf(level) + 1] || null;
  };
  App.levelLabel = function (level) {
    if (level.section === 'themes') return level.title;
    return App.SECTIONS[level.section].title + ' · ' + level.title;
  };
  App.totalStars = function (p) {
    return Object.keys(p.progress).reduce(function (s, k) { return s + (p.progress[k].stars || 0); }, 0);
  };
  App.streak = function (p) {
    var n = 0;
    var d = new Date();
    if (!p.stats.days[Store.dayKey(d)]) d = new Date(d.getTime() - 86400000);
    while (p.stats.days[Store.dayKey(d)]) { n++; d = new Date(d.getTime() - 86400000); }
    return n;
  };
  App.unlockedAccessories = function (p) {
    var stars = App.totalStars(p);
    return Characters.ACCESSORIES.filter(function (a) { return stars >= a.stars; });
  };
  App.optionsCount = function (p) { return p.options === 'auto' ? p.autoOptions : Number(p.options); };

  App.addPlayTime = function () {
    var g = ui.game;
    if (!g || !g.startedAt) return;
    var secs = Math.min(1800, Math.round((Date.now() - g.startedAt) / 1000));
    g.startedAt = 0;
    App.bump(App.profile().stats.days, Store.today(), Math.max(1, secs));
  };

  /* ---------- персонаж ---------- */

  App.critterHTML = function (p) { return Characters.html(p.character, p.outfit); };

  App.critterSay = function (text, opts) {
    var b = App.$('.bubble');
    if (b) {
      b.textContent = text;
      b.classList.add('is-on');
      clearTimeout(ui.timers.bubble);
      ui.timers.bubble = setTimeout(function () { b.classList.remove('is-on'); }, 3800);
    }
    var o = { pitch: 1.3, rateMul: 1.1 };
    if (opts) Object.keys(opts).forEach(function (k) { o[k] = opts[k]; });
    Sfx.duckMusic(true);
    return Speech.say(text, o).then(function () { Sfx.duckMusic(false); });
  };

  App.critterState = function (cls, ms) {
    var c = App.$('[data-critter]');
    if (!c) return;
    c.classList.remove('is-eat', 'is-yuck', 'is-party', 'is-oops');
    void c.offsetWidth;
    c.classList.add(cls);
    var mood = c.querySelector('.critter-mood');
    if (mood) mood.textContent = { 'is-eat': '😋', 'is-yuck': '🤢', 'is-party': '🥳', 'is-oops': '🙈' }[cls] || '';
    clearTimeout(ui.timers.critter);
    if (ms) ui.timers.critter = setTimeout(function () { c.classList.remove(cls); if (mood) mood.textContent = ''; }, ms);
  };

  App.mouthPoint = function () {
    var c = App.$('[data-critter]');
    if (!c) return { x: window.innerWidth / 4, y: window.innerHeight / 2 };
    var r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.58 };
  };

  /* Летит эмодзи от элемента к цели (по умолчанию — ко рту персонажа). */
  App.fly = function (fromEl, emoji, done, to) {
    var r = fromEl.getBoundingClientRect();
    to = to || App.mouthPoint();
    var x0 = r.left + r.width / 2;
    var y0 = r.top + r.height / 2;
    var el = document.createElement('span');
    el.className = 'flyer';
    el.textContent = emoji;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    if (App.reduceMotion || !el.animate) { el.remove(); if (done) done(); return; }
    var anim = el.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) translate(-50%,-50%) scale(1)' },
      { transform: 'translate(' + ((x0 + to.x) / 2) + 'px,' + (Math.min(y0, to.y) - 90) + 'px) translate(-50%,-50%) scale(1.15)', offset: 0.45 },
      { transform: 'translate(' + to.x + 'px,' + to.y + 'px) translate(-50%,-50%) scale(.35)' }
    ], { duration: 700, easing: 'ease-in-out' });
    anim.onfinish = function () { el.remove(); if (done) done(); };
  };

  /* Разлетаются искорки в точке. */
  App.burst = function (x, y, chars) {
    if (App.reduceMotion || !document.body.animate) return;
    var list = chars || ['✨', '⭐', '✨', '💫', '✨', '⭐'];
    list.forEach(function (ch, i) {
      var el = document.createElement('span');
      el.className = 'spark';
      el.textContent = ch;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
      var ang = (Math.PI * 2 * i) / list.length + Math.random() * 0.5;
      var dist = 60 + Math.random() * 50;
      var anim = el.animate([
        { transform: 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) scale(.4)', opacity: 1 },
        { transform: 'translate(' + (x + Math.cos(ang) * dist) + 'px,' + (y + Math.sin(ang) * dist) + 'px) translate(-50%,-50%) scale(1)', opacity: 0 }
      ], { duration: 650, easing: 'ease-out' });
      anim.onfinish = function () { el.remove(); };
    });
  };

  App.burstAt = function (el, chars) {
    var r = el.getBoundingClientRect();
    App.burst(r.left + r.width / 2, r.top + r.height / 2, chars);
  };

  /* ---------- навигация ---------- */

  var MUSIC_SCREENS = { profiles: 1, map: 1, levels: 1, themes: 1, theme: 1, album: 1, wardrobe: 1, pantry: 1 };

  App.go = function (screen, params) {
    if (ui.screen === 'play' && screen !== 'play') App.addPlayTime();
    if (screen !== 'play' && screen !== 'result') ui.game = null;
    Speech.stop();
    ui.screen = screen;
    ui.params = params || {};
    if (MUSIC_SCREENS[screen] && data.settings.music) Sfx.startMusic();
    else Sfx.stopMusic();
    App.render();
  };

  App.render = function () {
    var s = App.SCREENS[ui.screen];
    root.innerHTML = s.html(ui.params);
    window.scrollTo(0, 0);
    if (s.mount) s.mount(ui.params);
  };

  var QUIET = { answer: 1, cube: 1, balloon: 1, tray: 1, key: 1, gift: 1, cell: 1, 'check-mark': 1, letter: 1 };

  App.start = function () {
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (!el || !root.contains(el)) return;
      var act = el.getAttribute('data-act');
      var fn = App.ACTIONS[act];
      if (!fn) return;
      if (!QUIET[act]) Sfx.tap();
      fn(el, e);
    });
    root.addEventListener('change', function (e) {
      if (e.target.hasAttribute('data-field') && App.onField) App.onField(e.target);
    });
    document.addEventListener('pointerdown', function () {
      Sfx.unlock();
      if (MUSIC_SCREENS[ui.screen] && data.settings.music) Sfx.startMusic();
    }, true);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        Speech.stop();
        Sfx.stopMusic();
        App.addPlayTime();
        App.save();
      } else if (ui.game && !ui.game.startedAt) {
        ui.game.startedAt = Date.now();
      }
    });
    Sfx.enabled = data.settings.sounds;
    Sfx.music.on = data.settings.music;
    Speech.init(data.settings.voiceURI, data.settings.rate);
    Speech.onVoices(function () {
      if (ui.screen === 'profiles' || (ui.screen === 'parents' && ui.params.tab === 'settings')) App.render();
    });
    App.go('profiles');
  };

  /* ---------- общие действия ---------- */

  App.ACTIONS.go = function (el) {
    var params = {};
    ['section', 'half', 'tab', 'id'].forEach(function (k) {
      var v = el.getAttribute('data-' + k);
      if (v) params[k] = v;
    });
    App.go(el.getAttribute('data-to'), params);
  };
})();
