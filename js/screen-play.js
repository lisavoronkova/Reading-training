/*
 * Игра: «Картинки» (прочитай и найди), «Шарики» (послушай и лопни), «Паровозик» (собери слово).
 * После уровня — звёзды, подарок-наклейка и новые наряды.
 */
(function () {
  'use strict';

  var App = window.App;
  var S = App.S;
  var Speech = App.Speech;
  var Sfx = App.Sfx;
  var esc = App.esc;
  var $ = App.$;
  var $$ = App.$$;
  var ui = App.ui;

  /* ---------- запуск уровня ---------- */

  App.startLevel = function (id) {
    var p = App.profile();
    var level = App.LV.byId[id];
    if (!level) return;
    var tasks = App.Lv.makeTasks(level, App.W, {
      count: p.tasks,
      options: level.kind === 'listen' ? App.optionsCount(p) : App.optionsCount(p),
      errorWords: p.stats.wordErrors,
      knownLetters: p.check.letters
    });
    if (!tasks.length) return;
    p.tutorials = p.tutorials || {};
    var tut = level.kind === 'syllable' || level.kind === 'word' ? 'picture' : level.kind;
    if (tut === 'picture' && p.tutorialDone) p.tutorials.picture = true;
    ui.game = {
      level: level, tasks: tasks, i: 0, errors: 0, taskErrors: 0, locked: false,
      startedAt: Date.now(), streak: 0, eaten: [], correct: 0,
      tutorial: p.tutorials[tut] ? 0 : 1, tutKey: tut,
      starsBefore: App.totalStars(p)
    };
    App.go('play');
  };
  App.ACTIONS.start = function (el) { App.startLevel(el.getAttribute('data-id')); };

  App.SCREENS.play = {
    html: function () {
      var p = App.profile();
      var g = ui.game;
      var slots = g.tasks.map(function () { return '<span class="slot"></span>'; }).join('');
      var area;
      if (g.level.kind === 'listen') {
        area = '<div class="listen">' +
          '<button class="ear" data-act="repeat" aria-label="Послушать ещё раз"><span class="ear-icon" aria-hidden="true">👂</span><span>Послушай</span></button>' +
          '<div class="balloons" id="balloons"></div></div>';
      } else if (g.level.kind === 'build') {
        area = '<div class="build">' +
          '<button class="build-picture" id="build-picture" data-act="repeat" aria-label="Послушать слово"></button>' +
          '<div class="train" id="train"></div>' +
          '<div class="tray" id="tray"></div></div>';
      } else {
        area = '<div class="reading"><div class="frame" id="frame"></div><div class="options" id="options"></div></div>';
      }
      return '<main class="screen screen--game">' +
        '<header class="game-top">' +
          '<button class="icon-btn icon-btn--small" data-act="quit" aria-label="Выйти из уровня">✕</button>' +
          '<div class="slots" aria-label="Угощения за уровень">' + slots + '</div>' +
          '<button class="icon-btn icon-btn--small" data-act="repeat" aria-label="Послушать ещё раз">🔊</button>' +
        '</header>' +
        '<section class="stage stage--' + g.level.kind + '">' +
          '<div class="critter-zone critter-zone--game"><div class="critter-wrap">' + App.critterHTML(p) +
            '<div class="plate" aria-hidden="true"></div><span class="combo" aria-hidden="true"></span></div>' +
            '<div class="bubble" role="status"></div></div>' + area +
        '</section>' +
        '<div class="confirm" id="confirm" hidden><div class="confirm-box">' +
          '<p>Выйти из уровня?</p>' +
          '<div class="confirm-actions"><button class="btn" data-act="quit-yes">Да, выйти</button>' +
          '<button class="btn btn--primary" data-act="quit-no">Нет, играем</button></div></div></div>' +
        '</main>';
    },
    mount: function () { renderTask(); }
  };

  function current() { return ui.game.tasks[ui.game.i]; }

  function renderSlots() {
    var g = ui.game;
    $$('.slots .slot').forEach(function (s, i) {
      s.classList.toggle('is-now', i === g.i);
      if (g.eaten[i]) { s.textContent = g.eaten[i]; s.classList.add('is-full'); }
    });
  }

  function showHand(container, where) {
    $$('.hand').forEach(function (h) { h.remove(); });
    if (!container) return;
    var h = document.createElement('span');
    h.className = 'hand hand--' + (where || 'below');
    h.setAttribute('aria-hidden', 'true');
    h.textContent = '👆';
    container.appendChild(h);
  }

  function enter(el) { if (el && !App.reduceMotion) { el.classList.remove('is-enter'); void el.offsetWidth; el.classList.add('is-enter'); } }

  function renderTask() {
    var g = ui.game;
    g.taskErrors = 0;
    g.locked = false;
    renderSlots();
    var kind = g.level.kind;
    if (kind === 'listen') renderListen();
    else if (kind === 'build') renderBuild();
    else renderPicture();
  }

  /* ---------- «Картинки» ---------- */

  function captionHTML(task) {
    var w = task.target;
    if (task.sklad) return '<b>' + esc(App.lettered(w.sklady[0])) + '</b>' + esc(App.lettered(w.sklady.slice(1).join('')));
    return esc(App.lettered(w.text));
  }

  function renderPicture() {
    var g = ui.game;
    var p = App.profile();
    var t = current();
    var frame = $('#frame');
    var options = $('#options');
    if (t.sklad) {
      frame.className = 'frame frame--syllable';
      frame.innerHTML = '<button class="cube cube--stress cube--solo" data-act="cube" data-i="0">' + esc(App.lettered(t.sklad)) + '</button>';
    } else {
      var colors = S.colors(t.target);
      frame.className = 'frame frame--word';
      frame.innerHTML = t.target.sklady.map(function (s, i) {
        return '<button class="cube cube--' + colors[i] + '" data-act="cube" data-i="' + i + '">' + esc(App.lettered(s)) + '</button>';
      }).join('');
    }
    frame.style.setProperty('--count', t.sklad ? 1 : t.target.sklady.length);
    options.className = 'options options--' + t.options.length;
    options.innerHTML = t.options.map(function (w, i) {
      return '<button class="card" data-act="answer" data-i="' + i + '" aria-label="Картинка ' + (i + 1) + '">' +
        '<span class="card-emoji">' + w.emoji + '</span>' +
        '<span class="card-caption">' + (i === t.answer ? captionHTML(t) : '') + '</span></button>';
    }).join('');
    enter(frame); enter(options);
    if (g.tutorial === 1) {
      showHand(frame, 'below');
      App.critterSay(App.LINES.tutorCube);
    } else if (p.autoVoice) {
      speakTask();
    }
  }

  function speakTask() {
    var t = current();
    if (t.kind === 'listen') return Speech.say(t.sklad, { rateMul: 0.85 });
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

  App.ACTIONS.cube = function (el) {
    var g = ui.game;
    if (!g) return;
    var t = current();
    var i = Number(el.getAttribute('data-i'));
    var p = App.profile();
    var range = t.sklad ? { from: 0, to: 0 } : S.speakRange(t.target, i);
    var text = t.sklad ? t.sklad : S.rangeText(t.target, range);
    App.bump(p.stats.taps, t.sklad || t.target.sklady[i]);
    Sfx.tap();
    var cubes = $$('#frame .cube');
    cubes.forEach(function (c) { c.classList.remove('is-speaking'); });
    for (var k = range.from; k <= range.to; k++) if (cubes[k]) cubes[k].classList.add('is-speaking');
    clearTimeout(ui.timers.cube);
    Speech.say(text, { rateMul: 0.9 }).then(function () { cubes.forEach(function (c) { c.classList.remove('is-speaking'); }); });
    ui.timers.cube = setTimeout(function () { cubes.forEach(function (c) { c.classList.remove('is-speaking'); }); }, 1600);
    if (g.tutorial === 1) {
      g.tutorial = 2;
      showHand($('#options'), 'above');
      setTimeout(function () { if (ui.game === g && g.tutorial === 2) App.critterSay(App.LINES.tutorPick, { interrupt: false }); }, 50);
    }
  };

  App.ACTIONS.answer = function (el) {
    var g = ui.game;
    if (!g || g.locked || el.disabled) return;
    var t = current();
    var i = Number(el.getAttribute('data-i'));
    showHand(null);
    if (i === t.answer) {
      el.classList.add('is-right');
      $('#options').classList.add('is-solved');
      success(el, Speech.say(t.target.text, { rateMul: 0.95 }));
      return;
    }
    var chosen = t.options[i];
    el.classList.add('is-wrong');
    el.disabled = true;
    var p = App.profile();
    if (t.sklad) App.bump(p.stats.skladErrors, t.sklad);
    else App.bump(p.stats.wordErrors, t.target.text);
    mistake(el, 'Это ' + chosen.text + '.');
    var frame = $('#frame');
    frame.classList.remove('is-hint'); void frame.offsetWidth; frame.classList.add('is-hint');
    if (g.taskErrors >= 2) {
      (t.sklad ? [t.sklad] : chunks(t.target)).forEach(function (c) { Speech.say(c, { interrupt: false, rateMul: 0.8 }); });
    }
    if (g.taskErrors >= 3) {
      var right = $$('#options .card')[t.answer];
      if (right) right.classList.add('is-glow');
    }
  };

  /* ---------- «Шарики» ---------- */

  function renderListen() {
    var g = ui.game;
    var t = current();
    var box = $('#balloons');
    box.className = 'balloons balloons--' + t.options.length;
    box.innerHTML = t.options.map(function (s, i) {
      return '<button class="balloon balloon--c' + ((i + g.i) % 5) + '" style="--delay:' + (i * -0.7) + 's" data-act="balloon" data-i="' + i + '">' +
        '<span class="balloon-text">' + esc(App.lettered(s)) + '</span></button>';
    }).join('');
    enter(box);
    if (g.tutorial === 1) {
      showHand(box, 'above');
      App.critterSay(App.LINES.tutorListen).then(function () { if (ui.game === g) speakTask(); });
    } else {
      setTimeout(function () { if (ui.game === g && current() === t) speakTask(); }, 350);
    }
  }

  App.ACTIONS.balloon = function (el) {
    var g = ui.game;
    if (!g || g.locked || el.disabled) return;
    var t = current();
    var i = Number(el.getAttribute('data-i'));
    showHand(null);
    if (i === t.answer) {
      Sfx.pop();
      App.burstAt(el, ['✨', '🎉', '✨', '⭐', '✨', '🎊']);
      el.classList.add('is-popped');
      $('#balloons').classList.add('is-solved');
      success(el, Speech.say(t.sklad, { rateMul: 0.9 }));
      return;
    }
    el.classList.add('is-wrong');
    el.disabled = true;
    App.bump(App.profile().stats.skladErrors, t.sklad);
    mistake(el, null);
    Speech.say('это ' + t.options[i], { interrupt: false, rateMul: 0.9 });
    Speech.say('а нужно', { interrupt: false });
    Speech.say(t.sklad, { interrupt: false, rateMul: 0.8 });
    if (g.taskErrors >= 2) {
      var right = $$('#balloons .balloon')[t.answer];
      if (right) right.classList.add('is-glow');
    }
  };

  /* ---------- «Паровозик» ---------- */

  var WAGON_COLORS = 5;

  function renderBuild() {
    var g = ui.game;
    var t = current();
    var w = t.target;
    g.buildPos = 0;
    $('#build-picture').innerHTML = '<span class="build-emoji">' + w.emoji + '</span><span class="build-ear" aria-hidden="true">🔊</span>';
    $('#train').className = 'train';
    $('#train').innerHTML = '<span class="loco" aria-hidden="true">🚂</span>' + w.sklady.map(function (s, i) {
      return '<span class="wagon wagon--c' + (i % WAGON_COLORS) + '"><span class="wagon-slot" data-slot="' + i + '"></span></span>';
    }).join('');
    $('#tray').innerHTML = t.tray.map(function (s, i) {
      return '<button class="cube cube--tray" data-act="tray" data-i="' + i + '" data-s="' + s + '">' + esc(App.lettered(s)) + '</button>';
    }).join('');
    $('#tray').style.setProperty('--count', t.tray.length);
    enter($('#train')); enter($('#tray'));
    if (g.tutorial === 1) {
      showHand($('#tray'), 'above');
      App.critterSay(App.LINES.tutorBuild).then(function () { if (ui.game === g) speakTask(); });
    } else {
      setTimeout(function () { if (ui.game === g && current() === t) speakTask(); }, 350);
    }
  }

  App.ACTIONS.tray = function (el) {
    var g = ui.game;
    if (!g || g.locked || el.classList.contains('is-used')) return;
    var t = current();
    var w = t.target;
    var s = el.getAttribute('data-s');
    var need = w.sklady[g.buildPos];
    showHand(null);
    if (s === need) {
      var pos = g.buildPos;
      var slot = $('.wagon-slot[data-slot="' + pos + '"]');
      var colors = S.colors(w);
      el.classList.add('is-used');
      el.disabled = true;
      Sfx.clack();
      slot.innerHTML = '<span class="cube cube--wagon cube--' + colors[pos] + '">' + esc(App.lettered(s)) + '</span>';
      slot.parentNode.classList.add('is-full');
      Speech.say(S.rangeText(w, S.speakRange(w, pos)), { rateMul: 0.9 });
      g.buildPos++;
      $$('#tray .cube').forEach(function (c) { c.classList.remove('is-glow'); });
      if (g.buildPos === w.sklady.length) {
        g.locked = true;
        var train = $('#train');
        setTimeout(function () {
          Sfx.train();
          train.classList.add('is-go');
          success($('#build-picture'), Speech.say(w.text));
        }, 450);
      }
      return;
    }
    g.taskErrors++;
    g.errors++;
    g.streak = 0;
    Sfx.wrong();
    el.classList.remove('is-wrong'); void el.offsetWidth; el.classList.add('is-wrong');
    App.bump(App.profile().stats.wordErrors, w.text);
    App.critterState('is-oops', 900);
    Speech.say(S.rangeText(w, S.speakRange(w, g.buildPos)), { rateMul: 0.8 });
    if (g.taskErrors >= 2) {
      var match = $$('#tray .cube').filter(function (c) { return !c.classList.contains('is-used') && c.getAttribute('data-s') === need; })[0];
      if (match) match.classList.add('is-glow');
    }
  };

  /* ---------- общая награда и ошибка ---------- */

  function nextFood(rare) {
    var pool = rare || Math.random() < 0.08 ? App.RARE_FOODS : App.FOODS;
    var f;
    do { f = App.pick(pool); } while (ui.lastFood && f[0] === ui.lastFood[0] && pool.length > 1);
    ui.lastFood = f;
    return f;
  }

  function success(fromEl, wordSpeech) {
    var g = ui.game;
    var p = App.profile();
    g.locked = true;
    if (g.tutorial) {
      g.tutorial = 0;
      p.tutorials[g.tutKey] = true;
      if (g.tutKey === 'picture') p.tutorialDone = true;
    }
    if (g.level.kind !== 'listen') Sfx.right();
    App.bump(p.stats, 'total');
    if (g.taskErrors === 0) {
      App.bump(p.stats, 'firstTry');
      g.streak++;
      p.stats.bestStreak = Math.max(p.stats.bestStreak || 0, g.streak);
    } else {
      g.streak = 0;
    }
    g.correct++;
    var combo = g.streak > 0 && g.streak % 3 === 0;
    var food = nextFood(combo);
    App.bump(p.pantry, food[0]);
    g.eaten[g.i] = food[0];
    App.save();
    var plate = $('.plate');
    Sfx.whoosh();
    App.fly(fromEl, food[0], function () {
      Sfx.chomp();
      App.critterState('is-eat', 1300);
      if (plate) { plate.textContent = food[0]; plate.classList.add('is-on'); setTimeout(function () { plate.classList.remove('is-on'); }, 900); }
      renderSlots();
      var slot = $$('.slots .slot')[g.i - 1] || $$('.slots .slot')[g.i];
      if (slot) { slot.classList.add('is-pop'); }
    });
    if (combo) {
      var badge = $('.combo');
      if (badge) {
        badge.textContent = '🔥 ' + g.streak;
        badge.classList.remove('is-on'); void badge.offsetWidth; badge.classList.add('is-on');
      }
      setTimeout(function () { Sfx.sparkle(); App.burst(App.mouthPoint().x, App.mouthPoint().y - 40); }, 700);
    }
    var line = combo ? App.pick(App.LINES.combo) : (g.correct % 2 === 1 ? App.fill(App.pick(App.LINES.praise), p, food[1]) : null);
    var talk = (wordSpeech || Promise.resolve()).then(function () {
      return line ? App.critterSay(line, { interrupt: false }) : null;
    });
    Promise.all([talk, App.wait(g.level.kind === 'build' ? 2300 : 1800)]).then(function () { return App.wait(150); }).then(function () {
      if (ui.game !== g) return;
      g.i++;
      if (g.i >= g.tasks.length) finishLevel();
      else renderTask();
    });
  }

  function mistake(el, explain) {
    var g = ui.game;
    var p = App.profile();
    g.errors++;
    g.taskErrors++;
    g.streak = 0;
    Sfx.wrong();
    if (p.cockroach) {
      App.fly(el, '🪳', function () {
        Sfx.yuck();
        App.critterState('is-yuck', 1300);
        bugRunsAway();
      });
      App.critterSay(App.pick(App.LINES.bug));
    } else {
      App.critterState('is-oops', 1000);
      App.critterSay(App.pick(App.LINES.oops));
    }
    if (explain) Speech.say(explain, { interrupt: false });
    App.save();
  }

  function bugRunsAway() {
    if (App.reduceMotion || !document.body.animate) return;
    Sfx.scuttle();
    var to = App.mouthPoint();
    var el = document.createElement('span');
    el.className = 'flyer flyer--bug';
    el.textContent = '🪳';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    var anim = el.animate([
      { transform: 'translate(' + to.x + 'px,' + (to.y + 40) + 'px) translate(-50%,-50%) rotate(90deg)' },
      { transform: 'translate(-80px,' + (to.y + 90) + 'px) translate(-50%,-50%) rotate(100deg)' }
    ], { duration: 900, easing: 'ease-in' });
    anim.onfinish = function () { el.remove(); };
  }

  App.ACTIONS.repeat = function () { if (ui.game) speakTask(); };
  App.ACTIONS.quit = function () { $('#confirm').hidden = false; };
  App.ACTIONS['quit-no'] = function () { $('#confirm').hidden = true; };
  App.ACTIONS['quit-yes'] = function () { App.go('map'); };

  /* ---------- конец уровня ---------- */

  function finishLevel() {
    var g = ui.game;
    var p = App.profile();
    var stars = App.Lv.stars(g.errors);
    var rec = p.progress[g.level.id] || { stars: 0, plays: 0 };
    var firstTime = !rec.stars;
    rec.stars = Math.max(rec.stars || 0, stars);
    rec.plays = (rec.plays || 0) + 1;
    p.progress[g.level.id] = rec;
    if (p.options === 'auto' && g.level.kind !== 'build') {
      if (g.errors <= 1) p.autoOptions = Math.min(4, p.autoOptions + 1);
      else if (g.errors >= Math.ceil(g.tasks.length / 2)) p.autoOptions = Math.max(2, p.autoOptions - 1);
    }
    App.addPlayTime();
    var after = App.totalStars(p);
    var newAcc = App.Characters.ACCESSORIES.filter(function (a) { return g.starsBefore < a.stars && after >= a.stars; });
    App.save();
    var timeUp = p.restMinutes > 0 && Date.now() - ui.sessionStart >= p.restMinutes * 60000;
    App.go('result', { levelId: g.level.id, stars: stars, timeUp: timeUp, newAcc: newAcc.map(function (a) { return a.id; }), firstTime: firstTime, eaten: g.eaten.slice() });
  }

  App.SCREENS.result = {
    html: function (params) {
      var p = App.profile();
      var level = App.LV.byId[params.levelId];
      var next = App.levelAfter(level);
      var title = params.timeUp ? 'Пора отдохнуть!' : 'Уровень пройден!';
      var buttons = params.timeUp
        ? '<button class="btn btn--primary" data-act="go" data-to="profiles">Закончить</button>' +
          '<button class="btn" data-act="go" data-to="map">На карту</button>'
        : (next ? '<button class="btn btn--primary" data-act="start" data-id="' + next.id + '">Дальше ▶</button>' : '') +
          '<button class="btn" data-act="start" data-id="' + level.id + '">Ещё раз</button>' +
          '<button class="btn" data-act="go" data-to="map">На карту</button>';
      var acc = (params.newAcc || []).map(function (id) {
        var a = App.Characters.ACC_BY_ID[id];
        return '<button class="unlock" data-act="go" data-to="wardrobe"><span class="unlock-emoji" aria-hidden="true">' + a.e + '</span>' +
          '<span>Новый наряд: ' + esc(a.name) + '! Примерить</span></button>';
      }).join('');
      var gifts = [0, 1, 2].map(function (i) {
        return '<button class="gift gift--c' + i + '" data-act="gift" data-i="' + i + '" aria-label="Подарок ' + (i + 1) + '"><span class="gift-box" aria-hidden="true">🎁</span></button>';
      }).join('');
      return '<main class="screen screen--result">' +
        '<div class="result-top">' +
          '<div class="critter-zone critter-zone--result">' + App.critterHTML(p) + '<div class="bubble" role="status"></div></div>' +
          '<div class="result-info">' +
            '<h1 class="screen-title">' + title + '</h1>' +
            '<p class="lead">' + esc(App.levelLabel(level)) + '</p>' +
            '<div class="result-stars">' + App.starsHTML(params.stars) + '</div>' +
            '<div class="eaten" aria-label="Съедено за уровень">' + (params.eaten || []).join('') + '</div>' +
          '</div>' +
        '</div>' +
        '<section class="gifts-box">' +
          '<h2 class="gifts-title" id="gifts-title">Выбери подарок!</h2>' +
          '<div class="gifts" id="gifts">' + gifts + '</div>' +
        '</section>' + acc +
        '<div class="result-actions">' + buttons + '</div></main>';
    },
    mount: function (params) {
      var p = App.profile();
      Sfx.fanfare();
      App.critterState('is-party', 2400);
      $$('.result-stars .star.is-on').forEach(function (s, i) { setTimeout(function () { Sfx.star(i); }, 500 + i * 260); });
      if (params.newAcc && params.newAcc.length) setTimeout(function () { Sfx.unlock2(); }, 1400);
      App.critterSay(App.fill(App.pick(params.timeUp ? App.LINES.rest : App.LINES.end), p)).then(function () {
        if (App.ui.screen === 'result' && !App.ui.params.opened) App.critterSay(App.LINES.gift, { interrupt: false });
      });
    }
  };

  function pickSticker(p) {
    var rare = Math.random() < 0.15;
    var pool = rare ? App.RARE_STICKERS : App.STICKERS;
    var fresh = pool.filter(function (s) { return !p.stickers[s[0]]; });
    if (fresh.length && Math.random() < 0.75) pool = fresh;
    return App.pick(pool);
  }

  App.ACTIONS.gift = function (el) {
    if (App.ui.params.opened) return;
    App.ui.params.opened = true;
    var p = App.profile();
    var st = pickSticker(p);
    var rare = !!App.RARE_STICKER_SET[st[0]];
    App.bump(p.stickers, st[0]);
    App.save();
    Sfx.gift();
    $$('.gift').forEach(function (g) { if (g !== el) g.classList.add('is-other'); });
    el.classList.add('is-opening');
    setTimeout(function () {
      el.classList.remove('is-opening');
      el.classList.add('is-open');
      if (rare) el.classList.add('is-rare');
      el.innerHTML = '<span class="sticker' + (rare ? ' sticker--rare' : '') + '">' + st[0] + '</span>';
      $('#gifts-title').textContent = (rare ? 'Блестящая наклейка: ' : 'Наклейка: ') + st[1] + '!';
      App.burstAt(el, rare ? ['🌟', '💎', '✨', '🌟', '✨', '💫', '🌈', '✨'] : null);
      if (rare) Sfx.sparkle();
      App.critterSay((rare ? 'Блестящая! ' : 'Наклейка: ') + st[1] + '!');
    }, 650);
  };
})();
