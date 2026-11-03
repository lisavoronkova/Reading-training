const test = require('node:test');
const assert = require('node:assert/strict');
const Sklady = require('../js/sklady.js');
const Words = require('../js/words.js');
const Levels = require('../js/levels.js');

function sk(marked) {
  const w = Sklady.makeWord(marked, '·', 'x');
  return w.sklady.map((s, i) => (i === w.stress ? s.toUpperCase() : s)).join('-');
}

test('разбивка на склады и ударный склад', () => {
  assert.equal(sk('к+аша'), 'КА-ша');
  assert.equal(sk('ж+аба'), 'ЖА-ба');
  assert.equal(sk('кот'), 'КО-т');
  assert.equal(sk('бан+ан'), 'ба-НА-н');
  assert.equal(sk('маш+ина'), 'ма-ШИ-на');
  assert.equal(sk('стол'), 'с-ТО-л');
  assert.equal(sk('к+ошка'), 'КО-ш-ка');
  assert.equal(sk('ч+айник'), 'ЧА-й-ни-к');
  assert.equal(sk('л+ошадь'), 'ЛО-ша-дь');
  assert.equal(sk('+яблоко'), 'Я-б-ло-ко');
  assert.equal(sk('череп+аха'), 'че-ре-ПА-ха');
  assert.equal(sk('холод+ильник'), 'хо-ло-ДИ-ль-ни-к');
  assert.equal(sk('пл+атье'), 'п-ЛА-ть-е');
  assert.equal(sk('+аист'), 'А-и-с-т');
  assert.equal(sk('ёж'), 'Ё-ж');
});

test('без ударения в многосложном слове — ошибка', () => {
  assert.throws(() => Sklady.makeWord('машина', '·', 'x'));
});

test('формы слов', () => {
  const form = (m) => Sklady.makeWord(m, '·', 'x').form;
  assert.equal(form('к+аша'), 'open2');
  assert.equal(form('кот'), 'cvc');
  assert.equal(form('бан+ан'), 'openC');
  assert.equal(form('маш+ина'), 'open3');
  assert.equal(form('стол'), 'startCluster');
  assert.equal(form('к+ошка'), 'midCluster');
  assert.equal(form('ч+айник'), 'yot');
  assert.equal(form('л+ошадь'), 'soft');
  assert.equal(form('череп+аха'), 'open4');
  assert.equal(form('крокод+ил'), 'long');
  assert.equal(form('пл+атье'), 'separator');
});

test('первый склад читается как пишется', () => {
  const clear = (m) => Sklady.makeWord(m, '·', 'x').firstClear;
  assert.equal(clear('м+оре'), true);
  assert.equal(clear('молок+о'), false); // МО звучит как «ма»
  assert.equal(clear('маш+ина'), true);
  assert.equal(clear('арб+уз'), true);
  assert.equal(clear('час+ы'), false); // ЧА звучит как «чи»
  assert.equal(clear('стол'), false); // первый склад — согласная
  assert.equal(clear('огур+ец'), false);
});

test('согласная озвучивается вместе с открытым складом', () => {
  const say = (m, i) => {
    const w = Sklady.makeWord(m, '·', 'x');
    return Sklady.rangeText(w, Sklady.speakRange(w, i));
  };
  assert.equal(say('к+ошка', 1), 'кош');
  assert.equal(say('к+ошка', 2), 'ка');
  assert.equal(say('стол', 0), 'сто');
  assert.equal(say('волк', 2), 'волк');
  assert.equal(say('ч+айник', 1), 'чай');
});

test('цвета складов: один ударный, соседние не совпадают', () => {
  for (const w of Words.all) {
    const c = Sklady.colors(w);
    assert.equal(c.filter((x) => x === 'stress').length, 1, w.text);
    for (let i = 1; i < c.length; i++) assert.notEqual(c[i], c[i - 1], w.text);
  }
});

test('словарь: склады складываются в слово, эмодзи не повторяются', () => {
  const emoji = new Set();
  for (const w of Words.all) {
    assert.equal(w.sklady.join(''), w.text);
    assert.ok(w.stress >= 0, w.text);
    assert.ok(!emoji.has(w.emoji), 'повтор эмодзи ' + w.emoji + ' ' + w.text);
    emoji.add(w.emoji);
  }
  assert.ok(Words.all.length >= 300);
});

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

test('задания всех уровней корректны', () => {
  const L = Levels.build(Words);
  const levels = [...L.syllables, ...L.forms, ...L.themes.flatMap((t) => t.levels)];
  assert.ok(L.syllables.length === 10);
  for (const level of levels) {
    assert.ok(level.pool.length >= 3, level.id + ' мало слов: ' + level.pool.length);
    for (let seed = 1; seed <= 30; seed++) {
      for (const options of [2, 3, 4]) {
        const tasks = Levels.makeTasks(level, Words, { count: 8, options, rng: seeded(seed * 7 + options) });
        assert.ok(tasks.length >= Math.min(3, level.pool.length), level.id);
        const seen = new Set();
        for (const t of tasks) {
          assert.equal(t.options.length, options, level.id + ' ' + t.target.text);
          assert.equal(t.options[t.answer], t.target);
          assert.ok(!seen.has(t.target.text), 'слово повторилось в уровне ' + level.id);
          seen.add(t.target.text);
          for (let i = 0; i < t.options.length; i++) {
            for (let j = i + 1; j < t.options.length; j++) {
              assert.ok(!Words.conflict(t.options[i], t.options[j]),
                level.id + ': ' + t.options[i].text + ' / ' + t.options[j].text);
            }
          }
          if (level.kind === 'syllable') {
            assert.ok(t.target.firstClear);
            for (const o of t.options) {
              if (o !== t.target) assert.notEqual(o.sklady[0], t.sklad, level.id + ' ' + o.text);
            }
          }
        }
      }
    }
  }
});
