/*
 * Родительский раздел: проверка «вы взрослый?», прогресс, итоги проверки, настройки, советы.
 */
(function () {
  'use strict';

  var App = window.App;
  var S = App.S;
  var Speech = App.Speech;
  var Sfx = App.Sfx;
  var esc = App.esc;
  var $ = App.$;
  var data = App.data;

  /* ---------- вход для взрослых ---------- */

  App.SCREENS.gate = {
    html: function (params) {
      var entered = params.entered || [];
      return '<main class="screen screen--gate">' + App.topbar('Для взрослых', 'profiles') +
        '<p class="lead">Нажмите по порядку: <b>' + params.code.map(function (d) { return App.NUMBER_WORDS[d]; }).join(', ') + '</b></p>' +
        '<div class="gate-dots">' + params.code.map(function (d, i) { return '<span class="dot' + (i < entered.length ? ' is-done' : '') + '"></span>'; }).join('') + '</div>' +
        (params.wrong ? '<p class="note">Не та цифра. Попробуйте ещё раз.</p>' : '') +
        '<div class="keypad">' + params.keys.map(function (k) { return '<button class="key" data-act="key" data-k="' + k + '">' + k + '</button>'; }).join('') + '</div>' +
        '</main>';
    }
  };

  App.ACTIONS.gate = function () {
    var digits = App.Lv.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], Math.random).slice(0, 3);
    App.go('gate', { code: digits, entered: [], keys: App.Lv.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], Math.random) });
  };

  App.ACTIONS.key = function (el) {
    var params = App.ui.params;
    var k = Number(el.getAttribute('data-k'));
    var entered = params.entered.concat([k]);
    Sfx.tap();
    if (params.code[entered.length - 1] !== k) {
      App.go('gate', { code: params.code, entered: [], wrong: true, keys: params.keys });
      return;
    }
    if (entered.length === params.code.length) App.go('parents', { tab: 'progress' });
    else App.go('gate', { code: params.code, entered: entered, keys: params.keys });
  };

  /* ---------- прогресс ---------- */

  function topList(obj, n) {
    return Object.keys(obj).map(function (k) { return [k, obj[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, n);
  }

  function chips(list, render) {
    if (!list.length) return '<span class="muted">пока нет</span>';
    return list.map(function (x) { return '<span class="chip">' + render(x) + '</span>'; }).join('');
  }

  function checkReport(p) {
    var ch = p.check;
    if (!ch.done) return '<p class="muted">Проверка ещё не пройдена.</p>';
    var out = '<p class="muted">Пройдена ' + ch.date.split('-').reverse().join('.') + '</p>';
    var letters = Object.keys(ch.letters || {});
    if (ch.type === 'letters' || letters.length) {
      out += '<div class="mini-letters">' + 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя'.split('').map(function (l) {
        return '<span class="mini-letter' + (ch.letters[l] ? ' is-on' : '') + '">' + esc(App.lettered(l)) + '</span>';
      }).join('') + '</div><p>Знает букв: ' + letters.length + '</p>';
    }
    if (ch.type === 'reading') {
      var skl = Object.keys(ch.sklady || {});
      out += '<p>Склады: ' + skl.map(function (s) { return (ch.sklady[s] ? '✓ ' : '✗ ') + esc(App.lettered(s)); }).join(', ') + '</p>';
      out += '<ul class="form-report">' + S.FORMS.map(function (f) {
        var st = ch.forms[f.id];
        var mark = st === 'yes' ? '✓ читает' : st === 'partial' ? '½ иногда' : st === 'no' ? '✗ пока нет' : '— не дошли';
        return '<li><span>' + esc(f.example.map(App.lettered).join('‑')) + '</span><span>' + mark + '</span></li>';
      }).join('') + '</ul>';
    }
    return out;
  }

  function progressCard(p) {
    var st = p.stats;
    var days = '';
    var totalWeek = 0;
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * 86400000);
      var key = App.Store.dayKey(d);
      var secs = st.days[key] || 0;
      if (i < 7) totalWeek += secs;
      days += '<span class="day' + (secs ? ' is-on' : '') + '" title="' + d.getDate() + '.' + (d.getMonth() + 1) + ': ' + Math.round(secs / 60) + ' мин"></span>';
    }
    var all = Object.keys(st.days).reduce(function (s, k) { return s + st.days[k]; }, 0);
    var acc = st.total ? Math.round(st.firstTry * 100 / st.total) + '%' : '—';
    var sections = ['listen', 'syllables', 'forms', 'build'].map(function (sec) {
      var list = App.sectionLevels(sec);
      return '<div><dt>' + App.SECTIONS[sec].icon + ' ' + App.SECTIONS[sec].title + '</dt><dd>' + App.doneCount(p, list) + ' из ' + list.length + '</dd></div>';
    }).join('');
    return '<article class="panel">' +
      '<div class="panel-head">' + App.critterHTML(p) + '<div><h2>' + esc(p.name) + '</h2><p class="muted">⭐ ' + App.totalStars(p) + ' · ☀️ дней подряд: ' + App.streak(p) +
        ' · наклеек: ' + Object.keys(p.stickers).length + '</p></div></div>' +
      '<dl class="facts">' + sections +
        '<div><dt>🗂️ Уровни тем</dt><dd>' + App.doneCount(p, App.THEME_LEVELS) + ' из ' + App.THEME_LEVELS.length + '</dd></div>' +
        '<div><dt>С первой попытки</dt><dd>' + acc + '</dd></div>' +
        '<div><dt>За 7 дней</dt><dd>' + Math.round(totalWeek / 60) + ' мин</dd></div>' +
        '<div><dt>Всего</dt><dd>' + Math.round(all / 60) + ' мин</dd></div>' +
        '<div><dt>Лучшая серия</dt><dd>' + (st.bestStreak || 0) + '</dd></div>' +
      '</dl>' +
      '<h3>Занятия за 2 недели</h3><div class="days">' + days + '</div>' +
      '<h3>Проверка «Что я умею»</h3>' + checkReport(p) +
      '<div class="row-actions"><button class="btn btn--small" data-act="check-for" data-pid="' + p.id + '" data-type="letters">Проверить буквы</button>' +
        '<button class="btn btn--small" data-act="check-for" data-pid="' + p.id + '" data-type="reading">Проверить чтение</button></div>' +
      '<h3>Трудные склады</h3><div class="chips">' + chips(topList(st.skladErrors, 8), function (x) { return esc(App.lettered(x[0])) + ' ×' + x[1]; }) + '</div>' +
      '<h3>Трудные слова</h3><div class="chips">' + chips(topList(st.wordErrors, 8), function (x) {
        var w = App.W.byText[x[0]];
        return (w ? w.emoji + ' ' : '') + esc(App.lettered(x[0])) + ' ×' + x[1];
      }) + '</div>' +
      '<h3>Чаще всего нажимала, чтобы послушать</h3><div class="chips">' + chips(topList(st.taps, 8), function (x) { return esc(App.lettered(x[0])) + ' ×' + x[1]; }) + '</div>' +
      '</article>';
  }

  App.ACTIONS['check-for'] = function (el) {
    App.ui.profileId = el.getAttribute('data-pid');
    App.ui.sessionStart = Date.now();
    App.go('check-intro', { type: el.getAttribute('data-type') });
  };

  /* ---------- настройки ---------- */

  function option(value, current, label) {
    return '<option value="' + value + '"' + (String(value) === String(current) ? ' selected' : '') + '>' + label + '</option>';
  }

  var STATE_LABELS = [['normal', 'Обычный (обязательно)'], ['eat', 'Ест'], ['yuck', 'Фу, таракан'], ['happy', 'Радуется']];

  function photoFields(p) {
    var imgs = p.character.images || {};
    return '<div class="photo-states">' + STATE_LABELS.map(function (st) {
      var has = imgs[st[0]];
      return '<div class="photo-state">' +
        (has ? '<img class="photo-thumb" src="' + has + '" alt="">' : '<span class="photo-thumb photo-thumb--empty" aria-hidden="true">＋</span>') +
        '<label class="field"><span>' + st[1] + '</span><input type="file" accept="image/*" id="photo-' + p.id + '-' + st[0] + '" data-field="photo" data-pid="' + p.id + '" data-state="' + st[0] + '"></label>' +
        (has ? '<button class="btn btn--small" data-act="photo-clear" data-pid="' + p.id + '" data-state="' + st[0] + '">Убрать</button>' : '') +
        '</div>';
    }).join('') + '</div>' +
      (imgs.normal ? '' : '<p class="muted">Пока обычной картинки нет, в игре будет хомячок.</p>') +
      '<p class="muted">Картинки можно сделать в ChatGPT — готовые запросы лежат в файле docs/kartinki-chatgpt.md в репозитории.</p>';
  }

  function childSettings(p) {
    var id = p.id;
    var ch = p.character;
    return '<fieldset class="panel">' +
      '<legend>' + esc(p.name) + '</legend>' +
      '<div class="panel-head">' + App.critterHTML(p) + '<p class="muted">Кого кормит: ' + esc(ch.name) + '</p></div>' +
      '<label class="field"><span>Имя</span><input id="name-' + id + '" data-field="name" data-pid="' + id + '" value="' + esc(p.name) + '" maxlength="20"></label>' +
      '<label class="field"><span>Как читает сейчас</span><select id="reading-' + id + '" data-field="reading" data-pid="' + id + '">' +
        option('prereader', p.reading, App.READING_LABELS.prereader) + option('beginner', p.reading, App.READING_LABELS.beginner) +
        option('reader', p.reading, App.READING_LABELS.reader) + '</select></label>' +
      '<label class="field"><span>Картинок и шариков в задании</span><select id="options-' + id + '" data-field="options" data-pid="' + id + '">' +
        option('auto', p.options, 'Сама подстраивается (сейчас ' + p.autoOptions + ')') + option(2, p.options, '2') + option(3, p.options, '3') + option(4, p.options, '4') + '</select></label>' +
      '<label class="field"><span>Заданий в уровне</span><select id="tasks-' + id + '" data-field="tasks" data-pid="' + id + '">' +
        option(5, p.tasks, '5') + option(8, p.tasks, '8') + option(10, p.tasks, '10') + '</select></label>' +
      '<label class="field"><span>Предложить отдых через</span><select id="rest-' + id + '" data-field="restMinutes" data-pid="' + id + '">' +
        option(0, p.restMinutes, 'не предлагать') + option(10, p.restMinutes, '10 минут') + option(15, p.restMinutes, '15 минут') +
        option(20, p.restMinutes, '20 минут') + option(30, p.restMinutes, '30 минут') + '</select></label>' +
      '<label class="check"><input type="checkbox" id="auto-' + id + '" data-field="autoVoice" data-pid="' + id + '"' + (p.autoVoice ? ' checked' : '') + '>' +
        '<span>Сразу озвучивать склад или слово в «Картинках»</span></label>' +
      '<label class="check"><input type="checkbox" id="bug-' + id + '" data-field="cockroach" data-pid="' + id + '"' + (p.cockroach ? ' checked' : '') + '>' +
        '<span>Таракан за ошибку (если выключить — просто пустая тарелка)</span></label>' +
      '<h3>Персонаж</h3>' +
      '<label class="field"><span>Кто это</span><select id="look-' + id + '" data-field="look" data-pid="' + id + '">' +
        App.Characters.LOOKS.map(function (l) { return option(l.id, ch.look, l.title); }).join('') + '</select></label>' +
      '<label class="field"><span>Как зовут</span><input id="cname-' + id + '" data-field="cname" data-pid="' + id + '" value="' + esc(ch.name) + '" maxlength="20"></label>' +
      (ch.look === 'photo' ? photoFields(p) : '') +
      '<div class="row-actions">' +
        '<button class="btn btn--small" data-act="tutorial-again" data-pid="' + id + '">Показать подсказки снова</button>' +
        (App.ui.params.confirmReset === id
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
    return '<fieldset class="panel"><legend>Звук и вид</legend>' + voiceBlock +
      '<label class="field"><span>Скорость речи</span><input type="range" id="rate" data-field="rate" min="0.6" max="1.2" step="0.05" value="' + data.settings.rate + '"></label>' +
      '<div class="row-actions"><button class="btn btn--small" data-act="voice-test">Послушать: ма, ша, кошка</button>' +
        '<button class="btn btn--small" data-act="sfx-test">Послушать звуки</button></div>' +
      '<label class="check"><input type="checkbox" id="sounds" data-field="sounds"' + (data.settings.sounds ? ' checked' : '') + '><span>Звуковые эффекты</span></label>' +
      '<label class="check"><input type="checkbox" id="music" data-field="music"' + (data.settings.music ? ' checked' : '') + '><span>Музыкальная шкатулка в меню</span></label>' +
      '<label class="field"><span>Буквы</span><select id="case" data-field="letterCase">' +
        option('upper', data.settings.letterCase, 'ЗАГЛАВНЫЕ') + option('lower', data.settings.letterCase, 'строчные') + '</select></label>' +
      '</fieldset>';
  }

  var HELP = [
    ['Каждый день понемногу', 'Лучше всего 10–15 минут каждый день. Игра сама предложит отдохнуть. Солнышки на карте показывают, сколько дней подряд вы занимаетесь.'],
    ['Склады, а не буквы', 'Не называйте отдельные буквы («эм», «а»). Сразу говорите склад: «ма», «ба», «ва». Иначе ЖАБА превращается в «жэ-а-бэ-а».'],
    ['Зоя: с «Шариков»', 'Игра называет склад, Зоя лопает шарик с ним. Так склады запоминаются целиком, без заучивания букв. Потом — «Слоги»: прочитать склад и найти картинку.'],
    ['Оля: «Формы слов» и «Паровозик»', 'Слова идут от КА‑ША к длинным. В «Паровозике» Оля сама собирает слово из складов — это главное упражнение складового чтения.'],
    ['Пусть ошибается', 'Не останавливайте неверное нажатие. Друг получит таракана, а игра скажет, что было на картинке, и подскажет склад. Это тоже обучение.'],
    ['Награды', 'Угощения — за каждый ответ, звёзды — за уровень, наклейка — в подарке после уровня, новые наряды — за звёзды. Хвалите за старание, а не только за звёзды.'],
    ['Сложность', 'Игра сама меняет число картинок и шариков: 2, 3 или 4. Всё получается — вариантов больше; трудно — меньше. Можно закрепить число в настройках.'],
    ['Проверка', 'В разделе «Прогресс» можно пройти проверку снова, например раз в месяц, и посмотреть, что изменилось.'],
    ['Про голос', 'Склады читает синтез речи устройства. Одиночную согласную он называет как букву («бэ»), поэтому согласная звучит вместе с соседним складом: в КО‑Ш‑КА нажали Ш — прозвучит «кош».'],
    ['Где хранится прогресс', 'Только на этом устройстве и в этом браузере.']
  ];

  /* ---------- резервная копия ---------- */

  var BACKUP_APP = 'olya-zoya-reading';

  function backupPanel() {
    var pending = App.ui.params.pendingImport;
    return '<fieldset class="panel"><legend>Резервная копия</legend>' +
      '<p>Весь прогресс обеих девочек в одном файле. Сохраните его на компьютер или в облачный диск — потом его можно загрузить обратно на любом устройстве.</p>' +
      '<div class="row-actions"><button class="btn btn--small" data-act="backup-save">Сохранить копию в файл</button></div>' +
      (pending
        ? '<p class="note">Заменить весь прогресс на копию от ' + esc(pending.date) + '? ' +
          '<button class="btn btn--small btn--danger" data-act="backup-apply">Да, заменить</button> ' +
          '<button class="btn btn--small" data-act="backup-cancel">Нет</button></p>'
        : '<label class="field"><span>Загрузить копию из файла</span><input type="file" accept=".json,application/json" id="backup-file" data-field="backup"></label>') +
      '</fieldset>';
  }

  App.ACTIONS['backup-save'] = function (el) {
    var payload = JSON.stringify({ app: BACKUP_APP, savedAt: new Date().toISOString(), data: App.data });
    var name = 'chtenie-progress-' + App.Store.today() + '.json';
    var report = function (ok) { el.textContent = ok ? 'Копия сохранена ✓' : 'Не получилось сохранить копию'; };
    function plainDownload() {
      var url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
      report(true);
    }
    var c = window.claude;
    if (!c || typeof c.use !== 'function') { plainDownload(); return; }
    c.use('downloads').then(function (dl) {
      if (!dl) { report(false); return; }
      dl.save({ filename: name, data: payload }).then(function () { report(true); }, function (e) {
        if (!e || e.code !== 'declined') report(false);
      });
    });
  };

  App.ACTIONS['backup-cancel'] = function () {
    App.ui.params.pendingImport = null;
    App.render();
  };

  App.ACTIONS['backup-apply'] = function () {
    var imp = App.ui.params.pendingImport;
    if (!imp) return;
    var src = imp.data;
    var now = Date.now();
    if (src.settings) Object.assign(data.settings, src.settings);
    var order = Array.isArray(src.order) ? src.order.filter(function (id) { return src.profiles[id]; }) : [];
    if (order.length) data.order = order;
    var profiles = {};
    data.order.forEach(function (id) {
      profiles[id] = App.Store.normalizeProfile(id, src.profiles[id] || data.profiles[id]);
      profiles[id].updatedAt = now;
    });
    data.profiles = profiles;
    data.updatedAt = now;
    Sfx.enabled = data.settings.sounds;
    Sfx.music.on = data.settings.music;
    Speech.rate = data.settings.rate;
    App.save();
    App.ui.params.pendingImport = null;
    App.render();
    note('Прогресс загружен из копии.');
  };

  App.SCREENS.parents = {
    html: function (params) {
      var tab = params.tab || 'progress';
      var body;
      if (tab === 'settings') {
        body = '<fieldset class="panel"><legend>Сохранение прогресса</legend>' + (App.Cloud ? App.Cloud.statusHTML() : '') + '</fieldset>' +
          backupPanel() +
          voiceSettings() + data.order.map(function (id) { return childSettings(data.profiles[id]); }).join('');
      } else if (tab === 'help') {
        body = '<div class="help">' + HELP.map(function (h) { return '<article class="panel"><h2>' + h[0] + '</h2><p>' + h[1] + '</p></article>'; }).join('') + '</div>';
      } else {
        body = data.order.map(function (id) { return progressCard(data.profiles[id]); }).join('');
      }
      var tabBtn = function (id, label) {
        return '<button class="tab' + (tab === id ? ' is-on' : '') + '" role="tab" aria-selected="' + (tab === id) + '" data-act="go" data-to="parents" data-tab="' + id + '">' + label + '</button>';
      };
      return '<main class="screen screen--parents">' + App.topbar('Для родителей', 'profiles') +
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
        if (url.length > 180000) {
          // слишком тяжёлая для облака — JPEG на белом фоне
          var ctx = canvas.getContext('2d');
          ctx.globalCompositeOperation = 'destination-over';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          url = canvas.toDataURL('image/jpeg', 0.85);
        }
        done(url);
      };
      img.onerror = function () { done(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { done(null); };
    reader.readAsDataURL(file);
  }

  function note(text) {
    var body = $('.parents-body');
    if (!body) return;
    var n = document.createElement('p');
    n.className = 'note';
    n.textContent = text;
    body.insertBefore(n, body.firstChild);
  }

  App.onField = function (el) {
    var field = el.getAttribute('data-field');
    var pid = el.getAttribute('data-pid');
    var p = pid ? data.profiles[pid] : null;
    var rerender = false;
    switch (field) {
      case 'name': p.name = el.value.trim() || p.name; break;
      case 'reading': p.reading = el.value; break;
      case 'options': p.options = el.value === 'auto' ? 'auto' : Number(el.value); break;
      case 'tasks': p.tasks = Number(el.value); break;
      case 'restMinutes': p.restMinutes = Number(el.value); break;
      case 'autoVoice': p.autoVoice = el.checked; break;
      case 'cockroach': p.cockroach = el.checked; break;
      case 'look': p.character.look = el.value; rerender = true; break;
      case 'cname': p.character.name = el.value.trim() || p.character.name; rerender = true; break;
      case 'photo':
        if (el.files && el.files[0]) {
          var state = el.getAttribute('data-state') || 'normal';
          resizeImage(el.files[0], function (url) {
            if (!url) return;
            p.character.images = p.character.images || {};
            var before = p.character.images[state];
            p.character.images[state] = url;
            if (!App.save()) {
              p.character.images[state] = before;
              setTimeout(function () { note('Картинка не поместилась в память браузера. Попробуйте картинку поменьше.'); }, 0);
            }
            App.render();
          });
        }
        return;
      case 'backup':
        if (el.files && el.files[0]) {
          var reader = new FileReader();
          reader.onload = function () {
            var obj = null;
            try { obj = JSON.parse(reader.result); } catch (e) { obj = null; }
            if (!obj || obj.app !== BACKUP_APP || !obj.data || !obj.data.profiles) {
              note('Это не файл копии игры. Выберите файл chtenie-progress-….json.');
              return;
            }
            App.ui.params.pendingImport = { date: String(obj.savedAt || '').slice(0, 10).split('-').reverse().join('.'), data: obj.data };
            App.render();
          };
          reader.readAsText(el.files[0]);
        }
        return;
      case 'voice': data.settings.voiceURI = el.value; Speech.choose(el.value); break;
      case 'rate': data.settings.rate = Number(el.value); Speech.rate = data.settings.rate; break;
      case 'letterCase': data.settings.letterCase = el.value; break;
      case 'sounds': data.settings.sounds = el.checked; Sfx.enabled = el.checked; break;
      case 'music': data.settings.music = el.checked; Sfx.music.on = el.checked; break;
      default: return;
    }
    App.save();
    if (rerender) App.render();
  };

  App.ACTIONS['voice-test'] = function () {
    Speech.say('ма', { rateMul: 0.9 });
    Speech.say('ша', { interrupt: false, rateMul: 0.9 });
    Speech.say('кошка', { interrupt: false });
  };

  App.ACTIONS['sfx-test'] = function () {
    var list = ['pop', 'right', 'chomp', 'yuck', 'sparkle', 'train', 'gift', 'fanfare'];
    list.forEach(function (name, i) { setTimeout(function () { Sfx[name](); }, i * 900); });
  };

  App.ACTIONS['photo-clear'] = function (el) {
    var p = data.profiles[el.getAttribute('data-pid')];
    var state = el.getAttribute('data-state') || 'normal';
    if (p.character.images) delete p.character.images[state];
    App.save();
    App.render();
  };

  App.ACTIONS['tutorial-again'] = function (el) {
    var p = data.profiles[el.getAttribute('data-pid')];
    p.tutorialDone = false;
    p.tutorials = {};
    App.save();
    el.textContent = 'Подсказки покажем в следующем уровне';
  };

  App.ACTIONS.reset = function (el) { App.go('parents', { tab: 'settings', confirmReset: el.getAttribute('data-pid') }); };
  App.ACTIONS['reset-no'] = function () { App.go('parents', { tab: 'settings' }); };
  App.ACTIONS['reset-yes'] = function (el) {
    App.Store.resetProfile(data, el.getAttribute('data-pid'));
    App.save();
    App.go('parents', { tab: 'settings' });
  };
})();
