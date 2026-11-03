/*
 * Проверка в начале: какие буквы знает ребёнок и что уже может прочитать.
 * Проверку проводит взрослый: ребёнок показывает или читает вслух, взрослый нажимает кнопки.
 */
(function () {
  'use strict';

  var App = window.App;
  var S = App.S;
  var Speech = App.Speech;
  var Sfx = App.Sfx;
  var esc = App.esc;
  var $ = App.$;

  var LETTERS = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
  var CHECK_SKLADY = ['ма', 'ло', 'пу', 'сы', 'ни', 'ке', 'тя', 'жу', 'ши', 'ча'];

  function checkType(p, forced) {
    if (forced) return forced;
    return p.reading === 'prereader' ? 'letters' : 'reading';
  }

  /* ---------- вступление ---------- */

  App.SCREENS['check-intro'] = {
    html: function (params) {
      var p = App.profile();
      var type = checkType(p, params.type);
      var kid = type === 'letters' ? esc(p.name) + ', покажи, какие буквы ты знаешь!' : esc(p.name) + ', почитай мне, а я послушаю!';
      var adult = type === 'letters'
        ? 'Для взрослого: на экране все буквы. Ребёнок показывает и называет знакомые, а вы нажимаете на них. Не страшно, если знакомых букв нет совсем — игра начнёт с самого начала.'
        : 'Для взрослого: ребёнок читает вслух склады, потом слова — от простых к сложным. Вы нажимаете «Прочитала» или «Пока нет». Слова усложняются, пока не станет трудно. Это 2–3 минуты.';
      return '<main class="screen screen--check">' + App.topbar('Что я уже умею', 'map') +
        '<div class="check-intro">' +
          '<div class="critter-zone critter-zone--result">' + App.critterHTML(p) + '<div class="bubble" role="status"></div></div>' +
          '<h1 class="screen-title">' + kid + '</h1>' +
          '<p class="note">' + adult + '</p>' +
          '<div class="result-actions">' +
            '<button class="btn btn--primary btn--big" data-act="check-start" data-type="' + type + '">Начать проверку</button>' +
            '<button class="btn" data-act="check-skip">Потом</button>' +
          '</div></div></main>';
    },
    mount: function (params) {
      var p = App.profile();
      App.critterState('is-party', 1500);
      App.critterSay(checkType(p, params.type) === 'letters' ? 'Покажи, какие буквы ты знаешь!' : 'Почитай мне, а я послушаю!');
    }
  };

  App.ACTIONS['check-skip'] = function () {
    App.profile().check.skipped = true;
    App.save();
    App.go('map');
  };

  App.ACTIONS['check-start'] = function (el) {
    var type = el.getAttribute('data-type');
    if (type === 'letters') {
      App.ui.check = { type: 'letters', known: {} };
      App.go('check-letters');
    } else {
      App.ui.check = startReading();
      App.go('check-read');
    }
  };

  /* ---------- буквы ---------- */

  App.SCREENS['check-letters'] = {
    html: function () {
      var p = App.profile();
      var c = App.ui.check;
      var count = Object.keys(c.known).length;
      var tiles = LETTERS.map(function (l) {
        var on = c.known[l.toLowerCase()];
        var shown = App.data.settings.letterCase === 'lower' ? l.toLowerCase() : l;
        return '<button class="letter' + (on ? ' is-on' : '') + '" data-act="letter" data-l="' + l.toLowerCase() + '" aria-pressed="' + !!on + '">' + shown + '</button>';
      }).join('');
      return '<main class="screen screen--check">' + App.topbar('Какие буквы знает ' + esc(p.name), 'map') +
        '<div class="check-side"><div class="critter-zone critter-zone--check">' + App.critterHTML(p) + '<div class="bubble" role="status"></div></div>' +
          '<p class="lead">Покажи букву, которую знаешь, и назови её!</p></div>' +
        '<div class="letters">' + tiles + '</div>' +
        '<div class="check-footer"><span class="check-count">Знает букв: <b id="letter-count">' + count + '</b></span>' +
          '<button class="btn btn--primary btn--big" data-act="letters-done">Готово</button></div></main>';
    }
  };

  App.ACTIONS.letter = function (el) {
    var c = App.ui.check;
    var l = el.getAttribute('data-l');
    if (c.known[l]) {
      delete c.known[l];
      el.classList.remove('is-on');
      el.setAttribute('aria-pressed', 'false');
      Sfx.tap();
    } else {
      c.known[l] = true;
      el.classList.add('is-on');
      el.setAttribute('aria-pressed', 'true');
      Sfx.right();
      App.burstAt(el, ['✨', '⭐', '✨', '⭐']);
      App.critterState('is-party', 900);
      if (S.isVowel(l)) Speech.say(l, { rateMul: 0.85 });
    }
    $('#letter-count').textContent = Object.keys(c.known).length;
  };

  App.ACTIONS['letters-done'] = function () {
    var p = App.profile();
    var c = App.ui.check;
    p.check = { done: true, skipped: false, date: App.Store.today(), type: 'letters', letters: c.known, sklady: p.check.sklady || {}, forms: p.check.forms || {} };
    App.save();
    App.go('check-result', { type: 'letters' });
  };

  /* ---------- чтение ---------- */

  function startReading() {
    return { type: 'reading', phase: 'sklady', idx: 0, sklady: {}, forms: {}, formIdx: 0, wordIdx: 0, failStreak: 0, words: pickWords(), marked: false };
  }

  function pickWords() {
    var out = {};
    S.FORMS.forEach(function (f) {
      var pool = App.W.all.filter(function (w) { return w.form === f.id; });
      out[f.id] = App.Lv.shuffle(pool, Math.random).slice(0, 2);
    });
    return out;
  }

  function currentItem(c) {
    if (c.phase === 'sklady') return { kind: 'sklad', text: CHECK_SKLADY[c.idx] };
    var form = S.FORMS[c.formIdx];
    return { kind: 'word', form: form, word: c.words[form.id][c.wordIdx] };
  }

  function stepInfo(c) {
    if (c.phase === 'sklady') return 'Склады: ' + (c.idx + 1) + ' из ' + CHECK_SKLADY.length;
    return 'Слова: ' + S.FORMS[c.formIdx].title.toLowerCase();
  }

  App.SCREENS['check-read'] = {
    html: function () {
      var p = App.profile();
      var c = App.ui.check;
      var item = currentItem(c);
      var big;
      if (item.kind === 'sklad') {
        big = '<div class="frame frame--syllable"><span class="cube cube--stress cube--solo">' + esc(App.lettered(item.text)) + '</span></div>';
      } else {
        var colors = S.colors(item.word);
        big = '<div class="frame frame--word" style="--count:' + item.word.sklady.length + '">' + item.word.sklady.map(function (s, i) {
          return '<span class="cube cube--' + colors[i] + '">' + esc(App.lettered(s)) + '</span>';
        }).join('') + '</div>';
      }
      return '<main class="screen screen--check">' + App.topbar('Почитай мне', 'map') +
        '<p class="check-step">' + stepInfo(c) + '</p>' +
        '<section class="check-stage">' +
          '<div class="critter-zone critter-zone--check">' + App.critterHTML(p) + '<div class="bubble" role="status"></div></div>' +
          '<div class="check-item"><div class="reading">' + big + '</div><div class="check-reveal" id="check-reveal" aria-live="polite"></div></div>' +
        '</section>' +
        '<div class="check-buttons">' +
          '<button class="btn btn--yes btn--big" data-act="check-mark" data-ok="1">✓ Прочитала</button>' +
          '<button class="btn btn--no btn--big" data-act="check-mark" data-ok="0">Пока нет</button>' +
        '</div>' +
        '<p class="muted check-hint">Нажимает взрослый, когда ребёнок прочитал вслух.</p></main>';
    }
  };

  App.ACTIONS['check-mark'] = function (el) {
    var c = App.ui.check;
    if (c.marked) return;
    c.marked = true;
    var ok = el.getAttribute('data-ok') === '1';
    var item = currentItem(c);
    var reveal = $('#check-reveal');
    if (ok) {
      Sfx.right();
      App.critterState('is-party', 1000);
    } else {
      Sfx.tap();
      App.critterState('is-oops', 800);
    }
    var say;
    if (item.kind === 'sklad') {
      c.sklady[item.text] = ok;
      say = Speech.say(item.text, { rateMul: 0.9 });
    } else {
      (c.forms[item.form.id] = c.forms[item.form.id] || []).push(ok);
      reveal.innerHTML = '<span class="check-emoji">' + item.word.emoji + '</span>';
      say = Speech.say(item.word.text);
    }
    var line = ok ? App.pick(['Здорово!', 'Молодец!', 'Отлично!', 'Ура!']) : App.pick(['Ничего, научимся!', 'Это мы выучим!', 'Скоро получится!']);
    say.then(function () { return App.critterSay(line, { interrupt: false }); });
    Promise.all([say, App.wait(1300)]).then(function () {
      if (App.ui.screen !== 'check-read' || App.ui.check !== c) return;
      advance(c);
    });
  };

  function advance(c) {
    c.marked = false;
    if (c.phase === 'sklady') {
      c.idx++;
      if (c.idx < CHECK_SKLADY.length) return App.render();
      var read = Object.keys(c.sklady).filter(function (k) { return c.sklady[k]; }).length;
      if (read < 3) return finishReading(c);
      c.phase = 'words';
      c.formIdx = 0;
      c.wordIdx = 0;
      return App.render();
    }
    var form = S.FORMS[c.formIdx];
    c.wordIdx++;
    if (c.wordIdx < c.words[form.id].length) return App.render();
    var res = c.forms[form.id] || [];
    if (res.every(function (x) { return !x; })) c.failStreak++;
    else c.failStreak = 0;
    c.formIdx++;
    c.wordIdx = 0;
    if (c.failStreak >= 2 || c.formIdx >= S.FORMS.length) return finishReading(c);
    App.render();
  }

  function finishReading(c) {
    var p = App.profile();
    var formsStatus = {};
    Object.keys(c.forms).forEach(function (id) {
      var r = c.forms[id];
      var yes = r.filter(function (x) { return x; }).length;
      formsStatus[id] = yes === r.length ? 'yes' : yes ? 'partial' : 'no';
    });
    p.check = { done: true, skipped: false, date: App.Store.today(), type: 'reading', letters: p.check.letters || {}, sklady: c.sklady, forms: formsStatus };
    // Формы, которые читает уверенно, отмечаем пройденными: дорожка начнётся с первой трудной.
    S.FORMS.forEach(function (f) {
      if (formsStatus[f.id] !== 'yes') return;
      var id = 'f-' + f.id;
      var rec = p.progress[id] || { stars: 0, plays: 0 };
      rec.known = true;
      p.progress[id] = rec;
    });
    Object.keys(c.sklady).forEach(function (s) { if (!c.sklady[s]) App.bump(p.stats.skladErrors, s); });
    App.save();
    App.go('check-result', { type: 'reading' });
  }

  /* ---------- итог ---------- */

  App.SCREENS['check-result'] = {
    html: function () {
      var p = App.profile();
      var ch = p.check;
      var body;
      if (ch.type === 'letters') {
        var known = Object.keys(ch.letters);
        body = '<h1 class="screen-title">' + (known.length ? esc(p.name) + ' знает букв: ' + known.length : 'Начинаем с самого начала!') + '</h1>' +
          (known.length ? '<div class="chips chips--big">' + known.map(function (l) { return '<span class="chip">' + esc(App.lettered(l)) + '</span>'; }).join('') + '</div>' : '') +
          '<p class="lead">Сначала играем в «Шарики»: слушаем склады и находим их. Так буквы запоминаются сразу в складах.</p>';
      } else {
        var yesS = Object.keys(ch.sklady).filter(function (s) { return ch.sklady[s]; });
        var noS = Object.keys(ch.sklady).filter(function (s) { return !ch.sklady[s]; });
        var yesF = S.FORMS.filter(function (f) { return ch.forms[f.id] === 'yes'; });
        var learnF = S.FORMS.filter(function (f) { return ch.forms[f.id] === 'partial' || ch.forms[f.id] === 'no'; });
        var formChip = function (f) { return '<span class="chip">' + esc(f.example.map(App.lettered).join('‑')) + '</span>'; };
        body = '<h1 class="screen-title">Вот что ' + esc(p.name) + ' уже читает!</h1>' +
          '<div class="report">' +
            '<div class="report-col"><h2>✓ Читает</h2>' +
              '<div class="chips">' + (yesS.map(function (s) { return '<span class="chip">' + esc(App.lettered(s)) + '</span>'; }).join('') || '<span class="muted">пока нет</span>') + '</div>' +
              (yesF.length ? '<div class="chips">' + yesF.map(formChip).join('') + '</div>' : '') + '</div>' +
            '<div class="report-col"><h2>Будем учиться</h2>' +
              '<div class="chips">' + (noS.map(function (s) { return '<span class="chip chip--soft">' + esc(App.lettered(s)) + '</span>'; }).join('') || '') + '</div>' +
              (learnF.length ? '<div class="chips">' + learnF.map(formChip).join('') + '</div>' : '<span class="muted">дальше — длинные слова и темы</span>') + '</div>' +
          '</div>' +
          '<p class="lead">Дорожка начнётся с того, что пока трудно. Всё, что уже получается, отмечено галочкой.</p>';
      }
      return '<main class="screen screen--check">' + App.topbar('Что я уже умею', 'map') +
        '<div class="check-intro"><div class="critter-zone critter-zone--result">' + App.critterHTML(p) + '<div class="bubble" role="status"></div></div>' +
        body + '<div class="result-actions"><button class="btn btn--primary btn--big" data-act="go" data-to="map">Играть! ▶</button></div></div></main>';
    },
    mount: function () {
      var p = App.profile();
      Sfx.fanfare();
      App.critterState('is-party', 2000);
      App.burst(window.innerWidth / 2, 160, ['🎉', '✨', '⭐', '🎊', '✨', '🌟']);
      App.critterSay('Ты молодец, ' + p.name + '! Пойдём играть!');
    }
  };
})();
