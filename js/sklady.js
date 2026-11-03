/*
 * Склады по методике складового чтения: разбивка слова, ударение, форма слова.
 * Работает в браузере (window.Sklady) и в Node (require) для тестов.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Sklady = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VOWELS = 'аеёиоуыэюя';
  var SIGNS = 'ьъ';

  function isVowel(ch) { return VOWELS.indexOf(ch) >= 0; }
  function isSign(ch) { return SIGNS.indexOf(ch) >= 0; }
  function isLetter(ch) { return /^[а-яё]$/.test(ch); }
  function isConsonant(ch) { return isLetter(ch) && !isVowel(ch) && !isSign(ch); }

  /*
   * Слово с ударением записывается так: "маш+ина" (плюс перед ударной гласной).
   * Если гласная одна или есть буква ё, плюс можно не ставить.
   */
  function parseStress(marked) {
    var s = String(marked).toLowerCase().trim();
    var plus = s.indexOf('+');
    var text = s.replace(/\+/g, '');
    var stressPos = -1;
    if (plus >= 0) {
      stressPos = plus;
    } else if (text.indexOf('ё') >= 0) {
      stressPos = text.indexOf('ё');
    } else {
      var vowels = [];
      for (var i = 0; i < text.length; i++) if (isVowel(text[i])) vowels.push(i);
      if (vowels.length === 1) stressPos = vowels[0];
    }
    if (stressPos < 0 || !isVowel(text[stressPos])) {
      throw new Error('Не указано ударение: ' + marked);
    }
    return { text: text, stressPos: stressPos };
  }

  /*
   * Разбивка на склады, слева направо:
   *  согласная + гласная  -> склад (ма)        kind: 'open'
   *  согласная + ь/ъ      -> склад (ть)        kind: 'soft'
   *  одиночная согласная  -> склад (ш в ко-ш-ка) kind: 'cons'
   *  гласная без согласной -> склад (а в а-и-с-т) kind: 'vowel'
   */
  function split(text) {
    var parts = [];
    var i = 0;
    while (i < text.length) {
      var c = text[i];
      var n = text[i + 1];
      if (isConsonant(c)) {
        if (n && isVowel(n)) { parts.push({ t: c + n, kind: 'open', start: i }); i += 2; }
        else if (n && isSign(n)) { parts.push({ t: c + n, kind: 'soft', start: i }); i += 2; }
        else { parts.push({ t: c, kind: 'cons', start: i }); i += 1; }
      } else if (isVowel(c)) {
        parts.push({ t: c, kind: 'vowel', start: i });
        i += 1;
      } else {
        throw new Error('Неожиданный символ «' + c + '» в слове ' + text);
      }
    }
    return parts;
  }

  function isOpenKind(kind) { return kind === 'open' || kind === 'vowel'; }

  var FORMS = [
    { id: 'open2', title: 'Два открытых склада', example: ['ка', 'ша'] },
    { id: 'cvc', title: 'Склад и согласная', example: ['ко', 'т'] },
    { id: 'openC', title: 'Согласная в конце', example: ['ба', 'на', 'н'] },
    { id: 'open3', title: 'Три открытых склада', example: ['ма', 'ши', 'на'] },
    { id: 'startCluster', title: 'Две согласные в начале', example: ['с', 'то', 'л'] },
    { id: 'midCluster', title: 'Согласная в середине', example: ['ко', 'ш', 'ка'] },
    { id: 'yot', title: 'Слова с Й', example: ['ча', 'й', 'ни', 'к'] },
    { id: 'soft', title: 'Слова с мягким знаком', example: ['ло', 'ша', 'дь'] },
    { id: 'open4', title: 'Четыре открытых склада', example: ['че', 'ре', 'па', 'ха'] },
    { id: 'long', title: 'Длинные слова', example: ['к', 'ро', 'ко', 'ди', 'л'] },
    { id: 'separator', title: 'Разделительный Ь', example: ['п', 'ла', 'ть', 'е'] }
  ];

  var FORM_ORDER = {};
  FORMS.forEach(function (f, i) { FORM_ORDER[f.id] = i; });

  function formOf(parts) {
    var kinds = parts.map(function (p) { return p.kind; });
    var n = kinds.length;
    var i;
    if (kinds.indexOf('soft') >= 0) {
      for (i = 0; i < n - 1; i++) {
        if (kinds[i] === 'soft' && kinds[i + 1] === 'vowel') return 'separator';
      }
      return 'soft';
    }
    for (i = 0; i < n; i++) if (parts[i].t === 'й') return 'yot';
    if (kinds.every(isOpenKind)) return n <= 2 ? 'open2' : n === 3 ? 'open3' : 'open4';
    if (n >= 5) return 'long';
    if (kinds[0] === 'cons') return 'startCluster';
    var cons = [];
    for (i = 0; i < n; i++) if (kinds[i] === 'cons') cons.push(i);
    if (cons.length === 1 && cons[0] === n - 1) return n === 2 ? 'cvc' : 'openC';
    return 'midCluster';
  }

  /*
   * Можно ли брать слово для задания «найди слово на этот склад»:
   * первый склад открытый и звучит так, как пишется
   * (ударный, или безударная гласная, которая почти не меняется).
   */
  function firstSkladClear(word) {
    var first = word.parts[0];
    if (!isOpenKind(first.kind)) return false;
    if (word.stress === 0) return true;
    var v = first.t[first.t.length - 1];
    var c = first.kind === 'open' ? first.t[0] : '';
    if ('уыюи'.indexOf(v) >= 0) return true;
    if (v === 'а' && !(c && 'чщ'.indexOf(c) >= 0)) return true;
    return false;
  }

  function makeWord(marked, emoji, theme) {
    var p = parseStress(marked);
    var parts = split(p.text);
    var stress = -1;
    for (var i = 0; i < parts.length; i++) {
      var start = parts[i].start;
      if (p.stressPos >= start && p.stressPos < start + parts[i].t.length) { stress = i; break; }
    }
    var word = {
      text: p.text,
      parts: parts,
      sklady: parts.map(function (x) { return x.t; }),
      stress: stress,
      emoji: emoji,
      theme: theme,
      form: formOf(parts)
    };
    word.firstClear = firstSkladClear(word);
    return word;
  }

  /*
   * Цвета складов: ударный — 'stress', безударные по порядку чередуют 'g1' и 'g2'.
   */
  function colors(word) {
    var out = [];
    var k = 0;
    for (var i = 0; i < word.parts.length; i++) {
      if (i === word.stress) out.push('stress');
      else { out.push(k % 2 === 0 ? 'g1' : 'g2'); k++; }
    }
    return out;
  }

  /*
   * Что произнести при нажатии на склад. Синтез речи читает одиночную согласную
   * как название буквы («бэ»), поэтому согласную озвучиваем вместе с ближайшим
   * открытым складом: КО-Ш-КА, нажали Ш -> «кош».
   */
  function speakRange(word, index) {
    var parts = word.parts;
    var kind = parts[index].kind;
    if (isOpenKind(kind)) return { from: index, to: index };
    var j = index - 1;
    while (j >= 0 && !isOpenKind(parts[j].kind)) j--;
    if (j >= 0) return { from: j, to: index };
    var k = index + 1;
    while (k < parts.length && !isOpenKind(parts[k].kind)) k++;
    if (k < parts.length) return { from: index, to: k };
    return { from: index, to: index };
  }

  function rangeText(word, range) {
    return word.sklady.slice(range.from, range.to + 1).join('');
  }

  return {
    VOWELS: VOWELS,
    FORMS: FORMS,
    FORM_ORDER: FORM_ORDER,
    isVowel: isVowel,
    isConsonant: isConsonant,
    isOpenKind: isOpenKind,
    parseStress: parseStress,
    split: split,
    formOf: formOf,
    firstSkladClear: firstSkladClear,
    makeWord: makeWord,
    colors: colors,
    speakRange: speakRange,
    rangeText: rangeText
  };
});
