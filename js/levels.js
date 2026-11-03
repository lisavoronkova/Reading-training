/*
 * Уровни и задания: «Слоги», «Формы слов», «Слова по темам».
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./sklady.js'), require('./words.js'));
  } else {
    root.Levels = factory(root.Sklady, root.Words);
  }
})(typeof self !== 'undefined' ? self : this, function (Sklady, Words) {
  'use strict';

  function firstVowel(s) { return s[s.length - 1]; }
  function firstCons(w) { return w.parts[0].kind === 'open' ? w.sklady[0][0] : ''; }

  /* Уровни раздела «Слоги»: какие первые склады берём и насколько похожи варианты. */
  var SYLLABLE_DEFS = [
    { id: 's1', title: 'Склады с А', mode: 'easy',
      match: function (w) { return w.parts[0].kind === 'open' && firstVowel(w.sklady[0]) === 'а' && 'чщй'.indexOf(firstCons(w)) < 0; } },
    { id: 's2', title: 'Склады с О, У, Ы', mode: 'easy',
      match: function (w) { return w.parts[0].kind === 'open' && 'оуы'.indexOf(firstVowel(w.sklady[0])) >= 0; } },
    { id: 's3', title: 'А, О, У, Ы — похожие', mode: 'similar',
      match: function (w) { return w.parts[0].kind === 'open' && 'аоуы'.indexOf(firstVowel(w.sklady[0])) >= 0 && 'чщй'.indexOf(firstCons(w)) < 0; } },
    { id: 's4', title: 'Склады с Я, Ё, Ю', mode: 'easy',
      match: function (w) { return w.parts[0].kind === 'open' && 'яёю'.indexOf(firstVowel(w.sklady[0])) >= 0; } },
    { id: 's5', title: 'Склады с И и Е', mode: 'easy',
      match: function (w) { return w.parts[0].kind === 'open' && 'ие'.indexOf(firstVowel(w.sklady[0])) >= 0; } },
    { id: 's6', title: 'Мягкие — похожие', mode: 'similar',
      match: function (w) { return w.parts[0].kind === 'open' && 'яёюие'.indexOf(firstVowel(w.sklady[0])) >= 0; } },
    { id: 's7', title: 'ЖИ, ШИ, ЧА, ЩУ, ЦА', mode: 'easy',
      match: function (w) { return w.parts[0].kind === 'open' && 'жшчщц'.indexOf(firstCons(w)) >= 0; } },
    { id: 's8', title: 'Гласные в начале', mode: 'easy',
      match: function (w) { return w.parts[0].kind === 'vowel'; } },
    { id: 's9', title: 'Все склады', mode: 'easy',
      match: function () { return true; } },
    { id: 's10', title: 'Все склады — похожие', mode: 'similar',
      match: function () { return true; } }
  ];

  /* «Шарики»: игра называет склад или гласную, ребёнок лопает нужный шарик. */
  var COMMON = 'мпбдтнлрсквгзжш'.split('');
  var LISTEN_DEFS = [
    { id: 'l1', title: 'Гласные А, О, У, Ы, Э', mode: 'easy', items: function () { return Sklady.HARD.slice(); } },
    { id: 'l2', title: 'Гласные Я, Ё, Ю, И, Е', mode: 'easy', items: function () { return Sklady.SOFT.slice(); } },
    { id: 'l3', title: 'Все гласные: А или Я?', mode: 'similar', items: function () { return Sklady.HARD.concat(Sklady.SOFT); } },
    { id: 'l4', title: 'Склады с А', mode: 'easy', items: function () { return Sklady.openSklady(['а'], COMMON); } },
    { id: 'l5', title: 'Склады с О и У', mode: 'easy', items: function () { return Sklady.openSklady(['о', 'у'], COMMON); } },
    { id: 'l6', title: 'Склады с Ы', mode: 'easy', items: function () { return Sklady.openSklady(['ы'], COMMON); } },
    { id: 'l7', title: 'Склады с Я, Ё, Ю', mode: 'easy', items: function () { return Sklady.openSklady(['я', 'ё', 'ю'], COMMON); } },
    { id: 'l8', title: 'Склады с И и Е', mode: 'easy', items: function () { return Sklady.openSklady(['и', 'е'], COMMON); } },
    { id: 'l9', title: 'Все склады', mode: 'easy', items: function () { return Sklady.openSklady(Sklady.HARD.concat(Sklady.SOFT)); } },
    { id: 'l10', title: 'Похожие склады', mode: 'similar', items: function () { return Sklady.openSklady(Sklady.HARD.concat(Sklady.SOFT), COMMON); } }
  ];

  /* «Паровозик»: собрать слово из складов-вагончиков. */
  var BUILD_DEFS = [
    { id: 'b1', title: 'Два склада', forms: ['open2'], max: 2 },
    { id: 'b2', title: 'Склад и согласная', forms: ['cvc', 'openC'], max: 3 },
    { id: 'b3', title: 'Три склада', forms: ['open3'], max: 3 },
    { id: 'b4', title: 'Согласные рядом', forms: ['startCluster', 'midCluster'], max: 4 },
    { id: 'b5', title: 'С Й и мягким знаком', forms: ['yot', 'soft'], max: 4 },
    { id: 'b6', title: 'Длинные слова', forms: ['open4', 'long', 'separator'], max: 6 }
  ];

  var THEME_CHUNK = 10;

  function uniq(arr) {
    var seen = {};
    return arr.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true; });
  }

  function buildAll(words) {
    var all = words.all;
    var byId = {};
    var syllables = SYLLABLE_DEFS.map(function (def) {
      var pool = all.filter(function (w) { return w.firstClear && def.match(w); });
      var examples = uniq(pool.map(function (w) { return w.sklady[0]; })).slice(0, 3);
      var lvl = { id: def.id, section: 'syllables', kind: 'syllable', title: def.title, mode: def.mode, pool: pool, examples: examples };
      byId[lvl.id] = lvl;
      return lvl;
    });

    var forms = [];
    Sklady.FORMS.forEach(function (f, i) {
      var pool = all.filter(function (w) { return w.form === f.id; });
      if (pool.length < 3) return;
      var lvl = { id: 'f-' + f.id, section: 'forms', kind: 'word', title: f.title, mode: i <= 5 ? 'easy' : 'similar', form: f.id, pool: pool, exampleSklady: f.example };
      byId[lvl.id] = lvl;
      forms.push(lvl);
    });

    var themes = words.THEMES.map(function (t) {
      var sorted = t.list.slice().sort(function (a, b) {
        return (Sklady.FORM_ORDER[a.form] - Sklady.FORM_ORDER[b.form]) ||
          (a.sklady.length - b.sklady.length) || a.text.localeCompare(b.text, 'ru');
      });
      var count = Math.max(1, Math.ceil(sorted.length / THEME_CHUNK));
      var size = Math.ceil(sorted.length / count);
      var levels = [];
      for (var i = 0; i < count; i++) {
        var pool = sorted.slice(i * size, (i + 1) * size);
        if (!pool.length) continue;
        var lvl = { id: 't-' + t.id + '-' + (i + 1), section: 'themes', kind: 'word', theme: t.id, title: t.title + ' · ' + (i + 1), mode: 'theme', pool: pool };
        byId[lvl.id] = lvl;
        levels.push(lvl);
      }
      return { theme: t, levels: levels };
    });

    var listen = LISTEN_DEFS.map(function (def) {
      var items = def.items();
      var lvl = { id: def.id, section: 'listen', kind: 'listen', title: def.title, mode: def.mode, items: items, examples: items.slice(0, 3) };
      byId[lvl.id] = lvl;
      return lvl;
    });

    var build = BUILD_DEFS.map(function (def) {
      var pool = all.filter(function (w) { return def.forms.indexOf(w.form) >= 0 && w.sklady.length <= def.max; });
      var lvl = { id: def.id, section: 'build', kind: 'build', title: def.title, pool: pool };
      byId[lvl.id] = lvl;
      return lvl;
    });

    return { listen: listen, syllables: syllables, forms: forms, build: build, themes: themes, byId: byId };
  }

  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Отбираем отвлекающие картинки по «ярусам»: сначала лучшие, потом остальные. */
  function pickFromTiers(tiers, n, target, rng, conflict) {
    var chosen = [];
    for (var t = 0; t < tiers.length && chosen.length < n; t++) {
      var list = shuffle(tiers[t], rng);
      for (var i = 0; i < list.length && chosen.length < n; i++) {
        var c = list[i];
        if (conflict(c, target)) continue;
        var ok = true;
        for (var k = 0; k < chosen.length; k++) {
          if (conflict(c, chosen[k]) || chosen[k].sklady[0] === c.sklady[0]) { ok = false; break; }
        }
        if (ok) chosen.push(c);
      }
    }
    return chosen;
  }

  function syllableDistractors(target, all, n, mode, rng, conflict) {
    var s = target.sklady[0];
    var c = firstCons(target);
    var v = firstVowel(s);
    var base = all.filter(function (d) {
      if (d === target || d.sklady[0] === s) return false;
      // тот же звук в начале, но склад читается иначе (МО в МОЛОКО звучит как «ма»)
      if (c && d.parts[0].kind === 'open' && d.sklady[0][0] === c && !d.firstClear) return false;
      if (!c && d.parts[0].kind === 'vowel' && !d.firstClear) return false;
      return true;
    });
    var tiers;
    if (mode === 'similar') {
      var sameCons = base.filter(function (d) { return c && firstCons(d) === c; });
      var sameVowel = base.filter(function (d) { return Sklady.isOpenKind(d.parts[0].kind) && firstVowel(d.sklady[0]) === v && firstCons(d) !== c; });
      tiers = [sameCons, sameVowel, base];
    } else {
      var different = base.filter(function (d) {
        return Sklady.isOpenKind(d.parts[0].kind) && firstCons(d) !== c && firstVowel(d.sklady[0]) !== v;
      });
      tiers = [different, base];
    }
    return pickFromTiers(tiers, n, target, rng, conflict);
  }

  function wordDistractors(target, level, all, n, rng, conflict) {
    var s = target.sklady[0];
    var differentStart = all.filter(function (d) { return d !== target && d.sklady[0] !== s; });
    var tiers;
    if (level.mode === 'similar') {
      var sameStart = all.filter(function (d) { return d !== target && d.sklady[0] === s; });
      var sameLetter = all.filter(function (d) { return d !== target && d.text[0] === target.text[0] && d.sklady[0] !== s; });
      var sameForm = differentStart.filter(function (d) { return d.form === target.form; });
      tiers = [sameStart, sameLetter, sameForm, differentStart];
    } else if (level.mode === 'theme') {
      var sameTheme = differentStart.filter(function (d) { return d.theme === target.theme; });
      tiers = [sameTheme, differentStart];
    } else {
      var sameForm2 = differentStart.filter(function (d) { return d.form === target.form; });
      tiers = [sameForm2, differentStart];
    }
    return pickFromTiers(tiers, n, target, rng, conflict);
  }

  /* Цели уровня: сначала слова, в которых ребёнок ошибался, потом случайные. */
  function pickTargets(level, count, rng, errorWords) {
    var pool = shuffle(level.pool, rng);
    if (level.kind === 'syllable') {
      var bySklad = {};
      var keys = [];
      pool.forEach(function (w) {
        var k = w.sklady[0];
        if (!bySklad[k]) { bySklad[k] = []; keys.push(k); }
        bySklad[k].push(w);
      });
      var out = [];
      var round = 0;
      while (out.length < count) {
        var added = false;
        for (var i = 0; i < keys.length && out.length < count; i++) {
          var w = bySklad[keys[i]][round];
          if (w) { out.push(w); added = true; }
        }
        if (!added) break;
        round++;
      }
      return out;
    }
    var errors = errorWords || {};
    var withErrors = pool.filter(function (w) { return errors[w.text]; }).slice(0, 2);
    var rest = pool.filter(function (w) { return withErrors.indexOf(w) < 0; });
    return shuffle(withErrors.concat(rest).slice(0, count), rng);
  }

  function skladCons(s) { return s.length === 2 ? s[0] : ''; }
  function skladVowel(s) { return s[s.length - 1]; }

  function listenTasks(level, opts, rng) {
    var count = opts.count || 8;
    var n = Math.max(2, Math.min(4, opts.options || 2));
    var known = opts.knownLetters || {};
    var items = shuffle(level.items, rng);
    // склады со знакомыми буквами — вперёд
    items.sort(function (a, b) {
      var ka = known[skladCons(a) || a] ? 0 : 1;
      var kb = known[skladCons(b) || b] ? 0 : 1;
      return ka - kb;
    });
    var targets = [];
    for (var i = 0; targets.length < count && i < count * 3; i++) targets.push(items[i % items.length]);
    var all = level.items;
    var last = [];
    return targets.map(function (t) {
      var c = skladCons(t);
      var v = skladVowel(t);
      var key = Sklady.soundKey(t);
      var others = all.filter(function (x) { return Sklady.soundKey(x) !== key; });
      var tiers;
      if (level.mode === 'similar') {
        var pair = c ? c + Sklady.PAIRS[v] : Sklady.PAIRS[v];
        var sameCons = others.filter(function (x) { return c && skladCons(x) === c; });
        tiers = [others.filter(function (x) { return x === pair; }), sameCons, others];
      } else {
        tiers = [others.filter(function (x) { return skladCons(x) !== c && skladVowel(x) !== v; }), others];
      }
      var chosen = [];
      tiers.forEach(function (tier) {
        shuffle(tier, rng).forEach(function (x) {
          var dup = chosen.some(function (y) { return Sklady.soundKey(y) === Sklady.soundKey(x); });
          if (chosen.length < n - 1 && !dup) chosen.push(x);
        });
      });
      var answer = Math.floor(rng() * (chosen.length + 1));
      if (last.length === 2 && last[0] === answer && last[1] === answer) answer = (answer + 1) % (chosen.length + 1);
      last.push(answer);
      if (last.length > 2) last.shift();
      var options = chosen.slice();
      options.splice(answer, 0, t);
      return { kind: 'listen', sklad: t, options: options, answer: answer };
    });
  }

  function buildTasks(level, opts, rng) {
    var count = Math.min(opts.count || 6, 6);
    var errors = opts.errorWords || {};
    var pool = shuffle(level.pool, rng);
    var withErrors = pool.filter(function (w) { return errors[w.text]; }).slice(0, 2);
    var targets = withErrors.concat(pool.filter(function (w) { return withErrors.indexOf(w) < 0; })).slice(0, count);
    return shuffle(targets, rng).map(function (w) {
      var first = w.sklady[0];
      var c = first.length === 2 ? first[0] : '';
      var keys = w.sklady.map(Sklady.soundKey);
      var candidates = Sklady.openSklady(Sklady.HARD.concat(Sklady.SOFT)).filter(function (s) { return keys.indexOf(Sklady.soundKey(s)) < 0; });
      var similar = candidates.filter(function (s) { return c && s[0] === c; });
      var extra = (similar.length ? similar : candidates)[Math.floor(rng() * (similar.length || candidates.length))];
      var tray = shuffle(w.sklady.concat([extra]), rng);
      return { kind: 'build', target: w, tray: tray };
    });
  }

  /*
   * Задания уровня. opts: { count, options, rng, errorWords, knownLetters }
   * Возвращает [{ target, options: [word], answer: index }]
   */
  function makeTasks(level, words, opts) {
    var rng = opts.rng || Math.random;
    if (level.kind === 'listen') return listenTasks(level, opts, rng);
    if (level.kind === 'build') return buildTasks(level, opts, rng);
    var count = opts.count || 8;
    var nOptions = Math.max(2, Math.min(4, opts.options || 3));
    var conflict = words.conflict;
    var targets = pickTargets(level, count, rng, opts.errorWords);
    var lastAnswers = [];
    return targets.map(function (target) {
      var distractors = level.kind === 'syllable'
        ? syllableDistractors(target, words.all, nOptions - 1, level.mode, rng, conflict)
        : wordDistractors(target, level, words.all, nOptions - 1, rng, conflict);
      var answer = Math.floor(rng() * (distractors.length + 1));
      // правильная картинка не стоит на одном месте три раза подряд
      if (lastAnswers.length === 2 && lastAnswers[0] === answer && lastAnswers[1] === answer) {
        answer = (answer + 1) % (distractors.length + 1);
      }
      lastAnswers.push(answer);
      if (lastAnswers.length > 2) lastAnswers.shift();
      var options = distractors.slice();
      options.splice(answer, 0, target);
      return { kind: level.kind, target: target, sklad: level.kind === 'syllable' ? target.sklady[0] : null, options: options, answer: answer };
    });
  }

  function stars(errors) {
    if (errors <= 1) return 3;
    if (errors <= 3) return 2;
    return 1;
  }

  return { SYLLABLE_DEFS: SYLLABLE_DEFS, LISTEN_DEFS: LISTEN_DEFS, BUILD_DEFS: BUILD_DEFS, build: buildAll, makeTasks: makeTasks, stars: stars, shuffle: shuffle };
});
