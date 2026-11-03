/*
 * Экраны: таблица складов, кладовая, альбом наклеек, гардероб.
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

  /* ---------- таблица складов ---------- */

  function exampleFor(sklad) {
    var any = null;
    for (var i = 0; i < App.W.all.length; i++) {
      var w = App.W.all[i];
      if (w.sklady[0] !== sklad) continue;
      if (w.firstClear) return w;
      if (!any) any = w;
    }
    return any;
  }
  App.exampleFor = exampleFor;

  App.SCREENS.table = {
    html: function (params) {
      var half = params.half === 'soft' ? 'soft' : 'hard';
      var vowels = half === 'soft' ? S.SOFT : S.HARD;
      var L = App.lettered;
      var head = '<tr><th scope="col"></th>' + vowels.map(function (v) {
        return '<th scope="col"><button class="cell cell--vowel" data-act="cell" data-s="' + v + '">' + esc(L(v)) + '</button></th>';
      }).join('') + '</tr>';
      var rows = S.CONSONANTS.map(function (c) {
        return '<tr><th scope="row">' + esc(L(c)) + '</th>' + vowels.map(function (v) {
          if (!S.possible(c, v)) return '<td></td>';
          return '<td><button class="cell" data-act="cell" data-s="' + c + v + '">' + esc(L(c + v)) + '</button></td>';
        }).join('') + '</tr>';
      }).join('');
      var tab = function (id, label) {
        return '<button class="tab' + (half === id ? ' is-on' : '') + '" role="tab" aria-selected="' + (half === id) + '" data-act="go" data-to="table" data-half="' + id + '">' + esc(L(label)) + '</button>';
      };
      return '<main class="screen screen--table">' + App.topbar('Таблица складов', 'map') +
        '<div class="tabs" role="tablist">' + tab('hard', 'а о у ы э') + tab('soft', 'я ё ю и е') + '</div>' +
        '<div class="table-hint" id="table-hint" aria-live="polite">Нажми на склад — услышишь, как он читается.</div>' +
        '<div class="table-wrap"><table class="sklad-table">' + head + rows + '</table></div></main>';
    }
  };

  App.ACTIONS.cell = function (el) {
    var s = el.getAttribute('data-s');
    $$('.cell.is-speaking').forEach(function (c) { c.classList.remove('is-speaking'); });
    el.classList.add('is-speaking');
    Sfx.tap();
    var hint = $('#table-hint');
    var w = exampleFor(s);
    Speech.say(s, { rateMul: 0.9 }).then(function () { el.classList.remove('is-speaking'); });
    if (w) {
      Speech.say(w.text, { interrupt: false });
      hint.innerHTML = '<span class="hint-emoji" aria-hidden="true">' + w.emoji + '</span> <b>' + esc(App.lettered(w.sklady[0])) + '</b>' + esc(App.lettered(w.sklady.slice(1).join('')));
    } else {
      hint.innerHTML = '<b>' + esc(App.lettered(s)) + '</b>';
    }
  };

  /* ---------- кладовая ---------- */

  App.SCREENS.pantry = {
    html: function () {
      var p = App.profile();
      var all = App.FOODS.concat(App.RARE_FOODS);
      var got = all.filter(function (f) { return p.pantry[f[0]]; }).length;
      var items = all.map(function (f) {
        var n = p.pantry[f[0]] || 0;
        return '<div class="pantry-item' + (n ? '' : ' is-empty') + '">' +
          '<span class="pantry-emoji" aria-hidden="true">' + f[0] + '</span>' +
          '<span class="pantry-name">' + (n ? esc(App.cap(f[1])) : '???') + '</span>' +
          (n ? '<span class="pantry-count">×' + n + '</span>' : '') + '</div>';
      }).join('');
      return '<main class="screen screen--pantry">' + App.topbar('Кладовая', 'map') +
        '<p class="lead">Чем ты угощала ' + esc(p.character.name) + ': ' + got + ' из ' + all.length + '. Тёмные — угощения, которые ещё впереди.</p>' +
        '<div class="pantry-grid">' + items + '</div></main>';
    }
  };

  /* ---------- альбом наклеек ---------- */

  App.SCREENS.album = {
    html: function () {
      var p = App.profile();
      var all = App.STICKERS.concat(App.RARE_STICKERS);
      var got = all.filter(function (s) { return p.stickers[s[0]]; }).length;
      var cell = function (s) {
        var n = p.stickers[s[0]] || 0;
        var rare = App.RARE_STICKER_SET[s[0]];
        return '<button class="album-item' + (n ? '' : ' is-empty') + (rare ? ' is-rare' : '') + '" data-act="sticker" data-e="' + s[0] + '" data-name="' + esc(s[1]) + '"' + (n ? '' : ' disabled') + '>' +
          '<span class="sticker' + (rare && n ? ' sticker--rare' : '') + '" aria-hidden="true">' + s[0] + '</span>' +
          (n > 1 ? '<span class="album-count">×' + n + '</span>' : '') +
          '<span class="visually-hidden">' + (n ? esc(s[1]) : 'ещё не найдена') + '</span></button>';
      };
      return '<main class="screen screen--album">' + App.topbar('Альбом наклеек', 'map') +
        '<div class="album-progress"><span class="album-bar"><span style="width:' + Math.round(got * 100 / all.length) + '%"></span></span>' +
          '<span class="album-num">' + got + ' из ' + all.length + '</span></div>' +
        '<p class="lead">Наклейки лежат в подарках после каждого уровня. Блестящие попадаются редко!</p>' +
        '<h2 class="album-title">✨ Блестящие</h2><div class="album-grid">' + App.RARE_STICKERS.map(cell).join('') + '</div>' +
        '<h2 class="album-title">Наклейки</h2><div class="album-grid">' + App.STICKERS.map(cell).join('') + '</div></main>';
    }
  };

  App.ACTIONS.sticker = function (el) {
    Sfx.pop();
    App.burstAt(el, ['✨', '⭐', '✨']);
    Speech.say(el.getAttribute('data-name'));
  };

  /* ---------- гардероб ---------- */

  App.SCREENS.wardrobe = {
    html: function () {
      var p = App.profile();
      var stars = App.totalStars(p);
      var items = App.Characters.ACCESSORIES.map(function (a) {
        var open = stars >= a.stars;
        var on = p.outfit[a.slot] === a.id;
        return '<button class="wear' + (open ? '' : ' is-locked') + (on ? ' is-on' : '') + '" data-act="wear" data-id="' + a.id + '"' + (open ? '' : ' disabled') + ' aria-pressed="' + on + '">' +
          '<span class="wear-emoji" aria-hidden="true">' + a.e + '</span>' +
          '<span class="wear-name">' + esc(App.cap(a.name)) + '</span>' +
          '<span class="wear-meta">' + (open ? (on ? 'надето' : 'примерить') : '🔒 ⭐ ' + a.stars) + '</span></button>';
      }).join('');
      return '<main class="screen screen--wardrobe">' + App.topbar('Гардероб', 'map', '<span class="badges"><span class="badge">⭐ ' + stars + '</span></span>') +
        '<div class="wardrobe">' +
          '<div class="critter-zone critter-zone--result" id="wardrobe-critter">' + App.critterHTML(p) + '<div class="bubble" role="status"></div></div>' +
          '<div class="wear-grid">' + items + '</div>' +
        '</div>' +
        '<p class="lead">Новые наряды открываются за звёзды. Нажми, чтобы надеть или снять.</p></main>';
    }
  };

  App.ACTIONS.wear = function (el) {
    var p = App.profile();
    var a = App.Characters.ACC_BY_ID[el.getAttribute('data-id')];
    if (!a) return;
    if (p.outfit[a.slot] === a.id) {
      p.outfit[a.slot] = null;
    } else {
      p.outfit[a.slot] = a.id;
      Sfx.sparkle();
    }
    App.save();
    App.render();
    App.critterState('is-party', 1200);
    if (p.outfit[a.slot]) App.critterSay('Ой, ' + a.name + '! Мне нравится!');
  };
})();
