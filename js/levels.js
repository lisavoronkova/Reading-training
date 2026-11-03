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

  var THEME_CHUNK = 10;

  function uniq(arr) {
    var seen = {};
    return arr.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true; });
  }

  function build(words) {
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

    return { syllables: syllables, forms: forms, themes: themes, byId: byId };
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

  /*
   * Задания уровня. opts: { count, options, rng, errorWords }
   * Возвращает [{ target, options: [word], answer: index }]
   */
  function makeTasks(level, words, opts) {
    var rng = opts.rng || Math.random;
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
      return { target: target, sklad: level.kind === 'syllable' ? target.sklady[0] : null, options: options, answer: answer };
    });
  }

  function stars(errors) {
    if (errors <= 1) return 3;
    if (errors <= 3) return 2;
    return 1;
  }

  return { SYLLABLE_DEFS: SYLLABLE_DEFS, build: build, makeTasks: makeTasks, stars: stars, shuffle: shuffle };
});
