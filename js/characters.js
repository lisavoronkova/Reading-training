/*
 * Персонажи, которых кормят девочки: котик-единорог, хомячок или своя картинка.
 * Состояния (едим, фу, праздник) включаются классами на .critter.
 */
(function (root) {
  'use strict';

  var LOOKS = [
    { id: 'unicat', title: 'Радужный котик-единорог' },
    { id: 'hamster', title: 'Хомячок' },
    { id: 'photo', title: 'Своя картинка' }
  ];

  var uid = 0;

  // Глаза и рот одинаковые у всех нарисованных персонажей; dy сдвигает их по вертикали.
  function face(dy) {
    function y(v) { return v + dy; }
    return '' +
      '<g class="eyes-open">' +
        '<ellipse cx="82" cy="' + y(92) + '" rx="8" ry="11" fill="#2b2340"/>' +
        '<ellipse cx="118" cy="' + y(92) + '" rx="8" ry="11" fill="#2b2340"/>' +
        '<circle cx="85" cy="' + y(87) + '" r="3" fill="#fff"/>' +
        '<circle cx="121" cy="' + y(87) + '" r="3" fill="#fff"/>' +
      '</g>' +
      '<g class="eyes-happy" fill="none" stroke="#2b2340" stroke-width="4" stroke-linecap="round">' +
        '<path d="M73 ' + y(95) + ' Q82 ' + y(83) + ' 91 ' + y(95) + '"/>' +
        '<path d="M109 ' + y(95) + ' Q118 ' + y(83) + ' 127 ' + y(95) + '"/>' +
      '</g>' +
      '<g class="eyes-squint" fill="none" stroke="#2b2340" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M74 ' + y(85) + ' L89 ' + y(92) + ' L74 ' + y(99) + '"/>' +
        '<path d="M126 ' + y(85) + ' L111 ' + y(92) + ' L126 ' + y(99) + '"/>' +
      '</g>' +
      '<path class="mouth-smile" d="M89 ' + y(113) + ' Q94.5 ' + y(120) + ' 100 ' + y(113) + ' Q105.5 ' + y(120) + ' 111 ' + y(113) + '" fill="none" stroke="#2b2340" stroke-width="3" stroke-linecap="round"/>' +
      '<g class="mouth-open">' +
        '<ellipse cx="100" cy="' + y(119) + '" rx="10" ry="9" fill="#8c2f4f"/>' +
        '<ellipse cx="100" cy="' + y(124) + '" rx="6" ry="3" fill="#ff8fb8"/>' +
      '</g>' +
      '<g class="mouth-yuck">' +
        '<path d="M86 ' + y(117) + ' Q92 ' + y(111) + ' 98 ' + y(117) + ' Q104 ' + y(123) + ' 110 ' + y(117) + ' Q113 ' + y(114) + ' 116 ' + y(117) + '" fill="none" stroke="#2b2340" stroke-width="3" stroke-linecap="round"/>' +
        '<ellipse cx="104" cy="' + y(125) + '" rx="6" ry="8" fill="#ff8fb8"/>' +
      '</g>';
  }

  function unicat() {
    var id = 'rb' + (++uid);
    return '<svg class="critter-svg" viewBox="0 0 200 200" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="#ff6b8b"/><stop offset=".25" stop-color="#ffb347"/>' +
        '<stop offset=".5" stop-color="#ffe066"/><stop offset=".72" stop-color="#6fdc8c"/>' +
        '<stop offset="1" stop-color="#7aa7ff"/></linearGradient></defs>' +
      '<path class="c-tail" d="M146 168 C186 166 196 128 176 108 C166 98 152 104 158 116" fill="none" stroke="url(#' + id + ')" stroke-width="14" stroke-linecap="round"/>' +
      '<ellipse cx="100" cy="150" rx="52" ry="40" fill="#fff7fd" stroke="#efcde6" stroke-width="3"/>' +
      '<ellipse cx="80" cy="186" rx="15" ry="9" fill="#fff7fd" stroke="#efcde6" stroke-width="3"/>' +
      '<ellipse cx="120" cy="186" rx="15" ry="9" fill="#fff7fd" stroke="#efcde6" stroke-width="3"/>' +
      '<circle cx="58" cy="72" r="11" fill="#ff6b8b"/><circle cx="51" cy="90" r="11" fill="#ffb347"/>' +
      '<circle cx="52" cy="108" r="11" fill="#ffe066"/><circle cx="59" cy="124" r="10" fill="#6fdc8c"/>' +
      '<circle cx="71" cy="136" r="9" fill="#7aa7ff"/>' +
      '<polygon points="58,64 66,20 94,48" fill="#fff7fd" stroke="#efcde6" stroke-width="3" stroke-linejoin="round"/>' +
      '<polygon points="142,64 134,20 106,48" fill="#fff7fd" stroke="#efcde6" stroke-width="3" stroke-linejoin="round"/>' +
      '<polygon points="67,52 70,33 84,46" fill="#ffc2e0"/><polygon points="133,52 130,33 116,46" fill="#ffc2e0"/>' +
      '<circle cx="100" cy="92" r="50" fill="#fff7fd" stroke="#efcde6" stroke-width="3"/>' +
      '<polygon points="91,47 100,4 109,47" fill="#ffd54a" stroke="#e8a900" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M94 36 L106 30 M93 26 L104 20" stroke="#e8a900" stroke-width="2.5" stroke-linecap="round"/>' +
      '<circle cx="86" cy="50" r="8" fill="#b98cff"/><circle cx="114" cy="50" r="8" fill="#7aa7ff"/>' +
      '<circle cx="69" cy="108" r="8" fill="#ffb3cf" opacity=".85"/><circle cx="131" cy="108" r="8" fill="#ffb3cf" opacity=".85"/>' +
      '<polygon points="95,103 105,103 100,109" fill="#ff8fb8"/>' +
      '<g stroke="#d9b8cf" stroke-width="2" stroke-linecap="round"><path d="M64 104 L40 98"/><path d="M64 111 L39 114"/><path d="M136 104 L160 98"/><path d="M136 111 L161 114"/></g>' +
      face(0) +
      '</svg>';
  }

  function hamster() {
    return '<svg class="critter-svg" viewBox="0 0 200 200" aria-hidden="true">' +
      '<ellipse cx="100" cy="150" rx="58" ry="42" fill="#f2b45a" stroke="#c4852a" stroke-width="3"/>' +
      '<ellipse cx="100" cy="158" rx="35" ry="28" fill="#fff1dc"/>' +
      '<ellipse cx="78" cy="188" rx="14" ry="8" fill="#ffc9a8" stroke="#c4852a" stroke-width="2.5"/>' +
      '<ellipse cx="122" cy="188" rx="14" ry="8" fill="#ffc9a8" stroke="#c4852a" stroke-width="2.5"/>' +
      '<circle cx="60" cy="50" r="17" fill="#f2b45a" stroke="#c4852a" stroke-width="3"/>' +
      '<circle cx="140" cy="50" r="17" fill="#f2b45a" stroke="#c4852a" stroke-width="3"/>' +
      '<circle cx="60" cy="50" r="9" fill="#ffb3a7"/><circle cx="140" cy="50" r="9" fill="#ffb3a7"/>' +
      '<circle cx="100" cy="92" r="50" fill="#f2b45a" stroke="#c4852a" stroke-width="3"/>' +
      '<path d="M88 46 Q100 38 112 46" fill="none" stroke="#c4852a" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="100" cy="108" rx="34" ry="25" fill="#fff1dc"/>' +
      '<circle cx="66" cy="110" r="14" fill="#fff1dc"/><circle cx="134" cy="110" r="14" fill="#fff1dc"/>' +
      '<circle cx="66" cy="110" r="7" fill="#ffb3a7" opacity=".8"/><circle cx="134" cy="110" r="7" fill="#ffb3a7" opacity=".8"/>' +
      '<ellipse cx="100" cy="103" rx="5.5" ry="4" fill="#8a4b2a"/>' +
      '<ellipse cx="88" cy="140" rx="9" ry="7" fill="#ffc9a8" stroke="#c4852a" stroke-width="2"/>' +
      '<ellipse cx="112" cy="140" rx="9" ry="7" fill="#ffc9a8" stroke="#c4852a" stroke-width="2"/>' +
      face(0) +
      '</svg>';
  }

  function html(character) {
    var look = character && character.look;
    if (look === 'photo' && character.image) {
      return '<div class="critter critter--photo" data-critter>' +
        '<img class="critter-photo" src="' + character.image + '" alt="">' +
        '<span class="critter-mood" aria-hidden="true"></span></div>';
    }
    if (look === 'photo' || look === 'hamster') {
      return '<div class="critter critter--hamster" data-critter>' + hamster() + '<span class="critter-mood" aria-hidden="true"></span></div>';
    }
    return '<div class="critter critter--unicat" data-critter>' + unicat() + '<span class="critter-mood" aria-hidden="true"></span></div>';
  }

  root.Characters = { LOOKS: LOOKS, html: html };
})(typeof self !== 'undefined' ? self : this);
