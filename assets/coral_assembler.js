/* Coral Builder — движок сборки (UMD: window.CoralAssembler + Node).
   Эталон — .txt из справочника: CSS блока берётся из файла вербатим, HTML генерируется здесь.
   При значениях по умолчанию (level, anchor, subtitle не заданы) вывод совпадает с телом файла байт-в-байт.
   Дедуп CSS по содержимому, порядок CSS→HTML. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CoralAssembler = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function splitTemplate(raw) {
    var end = raw.indexOf('</style>');
    if (raw.trimStart().startsWith('<style>') && end !== -1) {
      var cssEnd = end + '</style>'.length;
      return { css: raw.slice(0, cssEnd), html: raw.slice(cssEnd).replace(/^\r?\n\r?\n/, '') };
    }
    return { css: null, html: raw };
  }

  // <section class="coral"> с необязательным якорем-id
  function secOpen(anchor) { return '<section class="coral"' + (anchor ? ' id="' + anchor + '"' : '') + '>'; }
  // класс обёртки: обычно «wrapper mt-1» (≈80px от соседа, на мобильном 60px), но у частей разделённой секции — просто «wrapper» (24px, вплотную)
  // класс обёртки: явный отступ s.margin ('' = вплотную, 'mt-1'/'mt-24'/… = класс) имеет приоритет; иначе — tight-логика
  function wrapCls(s) {
    if (s && s.margin != null) return s.margin ? 'wrapper ' + s.margin : 'wrapper';
    return (s && s.tight) ? 'wrapper' : 'wrapper mt-1';
  }

  // Кнопка «Выбрать тур» в конце блока. Правило одно: ссылка, стоявшая в текстовке ОТДЕЛЬНОЙ СТРОКОЙ
  // среди абзацев — уходит в кнопку (адрес кладётся в поле btnHref при импорте).
  // Ссылка в ЗАГОЛОВКЕ (H2/H3, название отеля) остаётся в заголовке и кнопки не даёт.
  var CTA_TEXT = 'Выбрать тур';
  // → { text: строка без тега <a>, href: адрес первой ссылки }. Используется при импорте, чтобы вынуть
  // адрес из такой строки-ссылки. Если ссылки нет — строка возвращается как есть.
  function splitHeadingLink(txt) {
    var s = String(txt == null ? '' : txt);
    var m = s.match(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!m) return { text: s, href: '' };
    return { text: s.slice(0, m.index) + m[2] + s.slice(m.index + m[0].length), href: m[1] };
  }
  // строка кнопки в конце блока (с переводом строки). Пустой href → пустая строка: вывод блока не меняется.
  function ctaLine(href, indent, text) {
    return href
      ? indent + '<a href="' + href + '" class="coral-button mt-16" target="_blank" rel="noopener noreferrer"> ' + (text || CTA_TEXT) + ' </a>\n'
      : '';
  }

  var BANNER_PIN = '                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="20" viewBox="0 0 16 20" fill="none">\n' +
    '                        <path fill-rule="evenodd" clip-rule="evenodd" d="M8 19C7.46792 19.8467 7.46763 19.8465 7.46731 19.8463L7.46654 19.8458L7.46451 19.8445L7.45854 19.8408L7.43913 19.8283C7.42292 19.8179 7.40023 19.8032 7.3715 19.7843C7.31404 19.7465 7.23234 19.6918 7.12985 19.6208C6.925 19.4789 6.63647 19.2716 6.29213 19.0036C5.60499 18.4689 4.68742 17.6865 3.76699 16.6947C1.94835 14.7349 0 11.8279 0 8.3125C0 3.76324 3.54101 0 8 0C12.459 0 16 3.76324 16 8.3125C16 11.8279 14.0517 14.7349 12.233 16.6947C11.3126 17.6865 10.395 18.4689 9.70787 19.0036C9.36353 19.2716 9.075 19.4789 8.87015 19.6208C8.76767 19.6918 8.68596 19.7465 8.6285 19.7843C8.59977 19.8032 8.57708 19.8179 8.56087 19.8283L8.54146 19.8408L8.53549 19.8445L8.53347 19.8458L8.53269 19.8463C8.53237 19.8465 8.53208 19.8467 8 19ZM8 19L8.53208 19.8467C8.20681 20.0511 7.79319 20.0511 7.46792 19.8467L8 19ZM7.91421 4.35335C6.77916 3.74631 5.33594 3.92142 4.37868 4.87868C3.20711 6.05025 3.20711 7.94975 4.37868 9.12132L7.20711 11.9497C7.39464 12.1373 7.649 12.2426 7.91421 12.2426C8.17943 12.2426 8.43378 12.1373 8.62132 11.9497L11.4497 9.12132C12.6213 7.94975 12.6213 6.05025 11.4497 4.87868C10.4925 3.92142 9.04927 3.74631 7.91421 4.35335Z" fill="black" fill-opacity="0.85"></path>\n' +
    '                    </svg>\n';
  // b01 — Баннер. CSS фиксирован в файле. Подзаголовок — только если задан текст.
  function renderBanner(s) {
    var title = s.title != null ? s.title : '';
    var href = s.href != null ? s.href : '#';
    var button = s.button != null ? s.button : '';
    var lvl = s.level || 1;
    var sub = s.subtitle
      ? '                    <p class="banner__subtitle"> ' + s.subtitle + ' </p>'
      : '                    <!--p class="banner__subtitle"> Подзаголовок </p-->';
    var btn = button ? '                    <a href="' + href + '" class="banner__button"> ' + button + ' </a>\n' : '';
    // плашка-локация в правом нижнем углу (шаблон баннера Coral) — только если заполнена вручную
    var label = s.location ? '                <div class="banner__label">\n' + BANNER_PIN +
      '                    <span> ' + s.location + ' </span>\n                </div>\n' : '';
    return secOpen(s.anchor) + '\n' +
      '    <article>\n' +
      '        <div class="wrapper">\n' +
      '            <div class="banner">\n' +
      '                <div class="banner__content">\n' +
      '                    <h' + lvl + ' class="banner__title"> ' + title + ' </h' + lvl + '>\n' +
      sub + '\n' +
      btn +
      '                </div>\n' +
      label +
      '            </div>\n' +
      '        </div>\n' +
      '    </article>\n' +
      '</section>\n';
  }

  function paras(list) {
    return list.map(function (p) { return '                        <p class="text"> ' + p + ' </p>'; }).join('\n');
  }
  // Вводный абзац: несколько абзацев (introParas) либо один (intro). При одном — байт-в-байт с эталоном.
  function introFrag(s) {
    var list = (s.introParas && s.introParas.length) ? s.introParas : (s.intro ? [s.intro] : []);
    return list.map(function (p, i) {
      var cls = (i === list.length - 1) ? 'text mb-24' : 'text ';
      return '\n            <p class="' + cls + '"> ' + p + ' </p>';
    }).join('');
  }
  function normParas(s) {
    if (s.paragraphs && s.paragraphs.length) return s.paragraphs;
    return s.text ? [s.text] : [];
  }
  // Верх секции: заголовок (если задан) + вводный. Пустой заголовок НЕ выводим — иначе пустой <h2 mb-24> даёт лишний отступ.
  // intro уже начинается с '\n' на каждый абзац; при пустом заголовке убираем первый перенос.
  function headIntro(title, lvl, size, intro) {
    if (title) return '            <h' + lvl + ' class="title-' + size + ' mb-24"> ' + title + ' </h' + lvl + '>' + intro + '\n';
    return intro ? intro.replace(/^\n/, '') + '\n' : '';
  }

  // b12 «Текст с картинкой» и b13 «Текстовый блок» генерирует builder.js (renderPanels) — здесь только шапка-панель для карточек/плашек/слайдера.
  function cardHtml(c) {
    var img = c.img != null ? c.img : '';
    var title = c.title != null ? c.title : ''; // ссылка в заголовке карточки остаётся в заголовке
    var text = c.text != null ? c.text : '';
    var alt = String(title).replace(/<[^>]+>/g, '').replace(/"/g, '&quot;').trim(); // подпись картинки — название карточки (поиск по картинкам, экранный доступ)
    // заголовок карточки: по умолчанию <p>, при заданном уровне — <hN>
    var titleTag = c.level
      ? '<h' + c.level + ' class="reason-card__title"> ' + title + ' </h' + c.level + '>'
      : '<p class="reason-card__title"> ' + title + ' </p>';
    // заголовка нет в документе → убираем его из шаблона (не оставляем пустым)
    var titleLine = String(title).trim() ? ('                        ' + titleTag + '\n') : '';
    // текст карточки: несколько абзацев (c.paras) либо один (c.text). При одном — байт-в-байт с эталоном.
    var list = (c.paras && c.paras.length) ? c.paras : [text];
    var body = list.map(function (p) { return '                        <p class="text"> ' + p + ' </p>'; }).join('\n');
    return '                <!-- Карточка -->\n' +
      '                <div class="reason-card">\n' +
      '                    <img class="reason-card__img" src="' + img + '" alt="' + alt + '">\n' +
      '                    <div class="reason-card__body">\n' +
      titleLine +
      body + '\n' +
      '                    </div>\n' +
      '                </div>';
  }

  // b05_0 — Карточки (без шапки-картинки). level — заголовок H2 по умолчанию.
  function renderCards(s) {
    var title = s.title != null ? s.title : '';
    var cards = s.cards || [];
    var n = cards.length;
    var lvl = s.level || 2;
    var intro = introFrag(s);
    var cardsHtml = cards.map(cardHtml).join('\n\n');
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
      headIntro(title, lvl, (s.titleSize || 1), intro) +
      '            <div class="grid-auto grid-auto--' + n + '">\n\n' + cardsHtml + '\n' +
      '            </div>\n        </div>\n    </article>\n</section>';
  }

  // b05_1 / b05_2 — Карточки с шапкой-панелью
  function panelWrapper(s, headingInside) {
    var heading = s.heading != null ? s.heading : '';
    var img = s.img != null ? s.img : '';
    var lvl = s.level || 2;
    var panelCls = s.reverse ? 'panel panel--reverse' : 'panel';
    var body = paras(normParas(s));
    if (headingInside) {
      var hi = heading ? '                        <h' + lvl + ' class="title-' + (s.titleSize || 2) + ' mb-16"> ' + heading + ' </h' + lvl + '>\n' : '';
      return '        <div class="' + wrapCls(s) + '">\n            <div class="' + panelCls + '">\n' +
        '                <div class="panel__col">\n                    <div class="panel__info">\n' +
        hi + body + '\n                    </div>\n                </div>\n' +
        '                <div class="panel__img" style="background-image: url(' + img + ');">\n' +
        '                </div>\n            </div>\n        </div>';
    }
    var ho = heading ? '\n            <h' + lvl + ' class="title-' + (s.titleSize || 1) + ' mb-24"> ' + heading + ' </h' + lvl + '>' : '';
    var intro = introFrag(s);
    return '        <div class="' + wrapCls(s) + '">' + ho + intro + '\n            <div class="' + panelCls + '">\n' +
      '                <div class="panel__col">\n                    <div class="panel__info">\n' +
      body + '\n                    </div>\n                </div>\n' +
      '                <div class="panel__img" style="background-image: url(' + img + ');">\n' +
      '                </div>\n            </div>\n        </div>';
  }
  function gridWrapper(cards) {
    var n = cards.length;
    var cardsHtml = cards.map(cardHtml).join('\n\n');
    return '        <div class="wrapper">\n            <div class="grid-auto grid-auto--' + n + '">\n\n' +
      cardsHtml + '\n            </div>\n        </div>';
  }
  function renderCardsHeader(s, headingInside) {
    return secOpen(s.anchor) + '\n    <article>\n' +
      panelWrapper(s, headingInside) + '\n\n' +
      gridWrapper(s.cards || []) + '\n    </article>\n</section>';
  }

  // b03 — Подводка (свободный текст): абзацы <p class="text"> в wrapper mt-1
  function renderText(s) {
    var list = (s.paragraphs && s.paragraphs.length) ? s.paragraphs : (s.text ? [s.text] : ['']);
    var body = list.map(function (p) { return '            <p class="text"> ' + p + ' </p>'; }).join('\n');
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' + body + '\n        </div>\n    </article>\n</section>';
  }

// b04 — Контакты. Иконки и каркас фиксированы; правятся заголовок, телефоны и подписи.
  var C_ICON1 = "<div class=\"contacts__icon\"> <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"20\" viewBox=\"0 0 16 20\" fill=\"none\">\n                            <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M7.46731 19.8463C7.46763 19.8465 7.46792 19.8467 8 19L7.46792 19.8467C7.79319 20.0511 8.20681 20.0511 8.53208 19.8467L8 19C8.53208 19.8467 8.53237 19.8465 8.53269 19.8463L8.53347 19.8458L8.53549 19.8445L8.54146 19.8408L8.56087 19.8283C8.57708 19.8179 8.59977 19.8032 8.6285 19.7843C8.68596 19.7465 8.76767 19.6918 8.87015 19.6208C9.075 19.4789 9.36353 19.2716 9.70787 19.0036C10.395 18.4689 11.3126 17.6865 12.233 16.6947C14.0517 14.7349 16 11.8279 16 8.3125C16 3.76324 12.459 0 8 0C3.54101 0 0 3.76324 0 8.3125C0 11.8279 1.94835 14.7349 3.76699 16.6947C4.68742 17.6865 5.60499 18.4689 6.29213 19.0036C6.63647 19.2716 6.925 19.4789 7.12985 19.6208C7.23234 19.6918 7.31404 19.7465 7.3715 19.7843C7.40023 19.8032 7.42292 19.8179 7.43913 19.8283L7.45854 19.8408L7.46451 19.8445L7.46654 19.8458L7.46731 19.8463ZM8 5C7.72386 5 7.5 5.22386 7.5 5.5V6H5.5V5.5C5.5 4.11929 6.61929 3 8 3C9.38071 3 10.5 4.11929 10.5 5.5V6.19722C10.5 7.03311 10.0822 7.81369 9.38675 8.27735L9.22265 8.38675C9.08355 8.47948 9 8.6356 9 8.80278V9.5H7V8.80278C7 7.96689 7.41775 7.18631 8.11325 6.72265L8.27735 6.61325C8.41645 6.52052 8.5 6.3644 8.5 6.19722V5.5C8.5 5.22386 8.27614 5 8 5ZM7 11.5V12.5H9V11.5H7Z\" fill=\"#0092D0\"></path>\n                        </svg> </div>";
  var C_ICON2 = "<div class=\"contacts__icon\"> <svg xmlns=\"http://www.w3.org/2000/svg\" width=\"18\" height=\"18\" viewBox=\"0 0 18 18\" fill=\"none\">\n                            <path d=\"M3 7.5C1.34315 7.5 0 8.84315 0 10.5V15C0 16.6569 1.34315 18 3 18H3.5C5.15685 18 6.5 16.6569 6.5 15V10.5C6.5 8.84315 5.15685 7.5 3.5 7.5H3Z\" fill=\"#0092D0\"></path>\n                            <path d=\"M14.5 7.5C12.8431 7.5 11.5 8.84315 11.5 10.5V15C11.5 16.6569 12.8431 18 14.5 18H15C16.6569 18 18 16.6569 18 15L18 10.5C18 8.84315 16.6569 7.5 15 7.5H14.5Z\" fill=\"#0092D0\"></path>\n                            <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M8 2C4.68629 2 2 4.68629 2 8V12.5H0V8C0 3.58172 3.58173 -2.6226e-06 8 0L10 1.19209e-06C14.4183 3.8147e-06 18 3.58173 18 8V12.5H16V8C16 4.68629 13.3137 2 10 2L8 2Z\" fill=\"#0092D0\"></path>\n                        </svg> </div>";
  function telHref(t){ return 'tel:' + String(t == null ? '' : t).replace(/[^\d+]/g, ''); }
  function contactBlock(icon, tel, text){
    return '                <div class="contacts__block">\n' +
      '                    ' + icon + '\n' +
      '                    <div class="contacts__info"> <span class="contacts__tel">' + (tel||'') + '</span>\n' +
      '                        <p class="contacts__text">' + (text||'') + '</p>\n' +
      '                    </div> <a class="contacts__link" href="' + telHref(tel) + '">Позвонить</a>\n' +
      '                </div>';
  }
  function renderContacts(s){
    var title = s.title != null ? s.title : '';
    var lvl = s.level || 2;
    var b = s.blocks || [];
    var b0 = b[0] || {}, b1 = b[1] || {};
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
      '            <h' + lvl + ' class="title-' + (s.titleSize || 1) + ' mb-24">' + title + '</h' + lvl + '>\n' +
      '            <div class="contacts">\n' +
      contactBlock(C_ICON1, b0.tel, b0.text) + '\n' +
      contactBlock(C_ICON2, b1.tel, b1.text) + '\n' +
      '            </div>\n        </div>\n    </article>\n</section>';
  }

  // b15 — Аккордеон (FAQ) с микроразметкой schema.org/FAQPage
  var FAQ_CHEVRON = '                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="7" viewBox="0 0 12 7" fill="none">\n' +
    '                                <path d="M1 1L6 6L11 1" stroke="#0E2855" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>\n' +
    '                            </svg>';
  function faqItem(it){
    var q = it.q != null ? it.q : '', a = it.a != null ? it.a : '';
    // ответ: каждый абзац — отдельный <p itemprop="acceptedAnswer">; один абзац — байт-в-байт с эталоном
    var aParas = (it.aParas && it.aParas.length) ? it.aParas : [a];
    var answer = aParas.map(function(p){
      return '                            <p class="text" itemprop="acceptedAnswer" itemscope="" itemtype="http://schema.org/Answer">\n' +
             '                                <span itemprop="text">' + p + '</span>\n' +
             '                            </p>';
    }).join('\n');
    return '                <!-- Раскрывашка -->\n' +
      '                <div itemprop="mainEntity" itemscope="" itemtype="http://schema.org/Question">\n' +
      '                    <div class="coral-toggle js-toggle">\n' +
      '                        <div class="coral-toggle__header js-toggle-header">\n' +
      '                            <h3 class="title-5" itemprop="name">' + q + '</h3>\n' +
      FAQ_CHEVRON + '\n' +
      '                        </div>\n' +
      '                        <div class="coral-toggle__body js-toggle-body">\n' +
      answer + '\n' +
      '                        </div>\n' +
      '                    </div>\n' +
      '                </div>';
  }
  function renderFaq(s){
    var title = s.title != null ? s.title : '';
    var lvl = s.level || 2;
    var items = s.items || [];
    var intro = introFrag(s);
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
      '            <h' + lvl + ' class="title-' + (s.titleSize || 1) + ' mb-24">\n                ' + title + '\n            </h' + lvl + '>' + intro + '\n\n' +
      '            <div itemscope="" itemtype="http://schema.org/FAQPage">\n\n' +
      items.map(faqItem).join('\n\n') + '\n\n' +
      '            </div>\n        </div>\n    </article>\n</section>';
  }

// ==================== Сеточные плашки b06–b11 ====================
  var GRID_CLASS = { b06: 'price-cards', b07: '', b08: '', b09: '', b10: 'point', b11: 'pad' };
  // текст плашки: несколько абзацев (c.paras) → отдельные <p class="text">; один — байт-в-байт с эталоном
  function cardTextP(c, indent) {
    var list = (c.paras && c.paras.length) ? c.paras : [c.text != null ? c.text : ''];
    return list.map(function (p) { return indent + '<p class="text"> ' + p + ' </p>'; }).join('\n');
  }
  function gridCardHtml(family, c, i) {
    var title = c.title != null ? c.title : ''; // ссылка в заголовке плашки остаётся в заголовке
    var has = String(title).trim() !== ''; // заголовка нет в документе → убираем его из шаблона плашки
    if (family === 'b06') return '                <!-- Карточка -->\n' +
      '                <div class="price-card">\n' +
      '                    <div class="price-card__badge"> ' + (c.badge != null ? c.badge : '') + ' </div>\n' +
      '                    <p class="price-card__price"> ' + (c.price != null ? c.price : '') + ' </p>\n' +
      (has ? '                    <p class="price-card__title"> ' + title + ' </p>\n' : '') +
      cardTextP(c, '                    ') + '\n' +
      '                </div>';
    if (family === 'b07') return '                <!-- Плашка -->\n' +
      '                <div class="feature-card">\n' +
      '                    <div class="feature-card__icon"> ' + (c.icon != null && c.icon !== '' ? c.icon : '✓') + ' </div>\n' +
      '                    <div class="feature-card__body">\n' +
      (has ? '                        <p class="feature-card__title"> ' + title + ' </p>\n' : '') +
      cardTextP(c, '                        ') + '\n' +
      '                    </div>\n' +
      '                </div>';
    if (family === 'b08') return '                <!-- Плашка -->\n' +
      '                <div class="accent-card">\n' +
      (has ? '                    <p class="accent-card__title"> ' + title + ' </p>\n' : '') +
      cardTextP(c, '                    ') + '\n' +
      '                </div>';
    if (family === 'b09') return '                <!-- Плашка -->\n' +
      '                <div class="choose-card">\n' +
      '                    <div class="choose-card__num"> ' + (i + 1) + ' </div>\n' +
      (has ? '                    <p class="choose-card__title"> ' + title + ' </p>\n' : '') +
      cardTextP(c, '                    ') + '\n' +
      '                </div>';
    if (family === 'b10') return '                <!-- Плашка -->\n' +
      '                <div class="point__block">\n' +
      '                    <div class="point__header">\n' +
      '                        <div class="point__icon"> ' + (c.icon != null ? c.icon : '') + ' </div>\n' +
      (has ? '                        <h4 class="point__title"> ' + title + ' </h4>\n' : '') +
      '                    </div>\n' +
      cardTextP(c, '                    ') + '\n' +
      '                </div>';
    return '                <!-- Плашка -->\n' +
      '                <div class="pad__block">\n' +
      cardTextP(c, '                    ') + '\n' +
      '                </div>';
  }
  function gridClassOf(family, n) { var gc = GRID_CLASS[family]; return (gc ? gc + ' ' : '') + 'grid-auto grid-auto--' + n; }
  function renderGrid0(s, family) {
    var title = s.title != null ? s.title : '';
    var lvl = s.level || 2;
    var cards = s.cards || [];
    var intro;
    if (family === 'b10') {
      var il = (s.introParas && s.introParas.length) ? s.introParas : (s.intro ? [s.intro] : []);
      intro = il.length
        ? il.map(function (p) { return '\n            <p class="text"> ' + p + ' </p>'; }).join('')
        : '\n            <!--p class="text mb-24"> Текст </p-->';
    } else {
      intro = introFrag(s); if (!intro) intro = '\n            <!--p class="text mb-24"> Текст </p-->';
    }
    var cardsHtml = cards.map(function (c, i) { return gridCardHtml(family, c, i); }).join('\n\n');
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
      headIntro(title, lvl, (s.titleSize || 1), intro) +
      '            <div class="' + gridClassOf(family, cards.length) + '">\n\n' + cardsHtml + '\n' +
      '            </div>\n        </div>\n    </article>\n</section>';
  }
  var GRID_WRAP_COMMENT = { b07: true, b08: true, b09: true };
  function gridWrapperG(cards, family) {
    var lead = GRID_WRAP_COMMENT[family] ? '            <!--p class="text mb-24"> Текст </p-->\n' : '';
    var cardsHtml = cards.map(function (c, i) { return gridCardHtml(family, c, i); }).join('\n\n');
    return '        <div class="wrapper">\n' + lead + '            <div class="' + gridClassOf(family, cards.length) + '">\n\n' + cardsHtml + '\n            </div>\n        </div>';
  }
  function renderGridHeader(s, headingInside, family) {
    return secOpen(s.anchor) + '\n    <article>\n' + panelWrapper(s, headingInside) + '\n\n' + gridWrapperG(s.cards || [], family) + '\n    </article>\n</section>';
  }

  // b14 — Слайдер (Swiper). Секция генерируется здесь; <link>/<style>/<script> подключаются отдельно один раз на страницу.
  var SLIDER_ARROWS =
    '                <div class="slider__next"> <svg xmlns="http://www.w3.org/2000/svg" width="8" height="14" viewBox="0 0 8 14" fill="none">\n' +
    '                        <path d="M1 1L7 7L1 13" stroke="#0E2855" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>\n' +
    '                    </svg> </div>\n' +
    '                <div class="slider__prev"> <svg xmlns="http://www.w3.org/2000/svg" width="8" height="14" viewBox="0 0 8 14" fill="none">\n' +
    '                        <path d="M7 1L1 7L7 13" stroke="#0E2855" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>\n' +
    '                    </svg> </div>';
  function sliderSlide(sl) {
    var img = sl.img != null ? sl.img : '';
    var title = sl.title != null ? sl.title : ''; // ссылка в заголовке слайда остаётся в заголовке
    var titleLine = String(title).trim() ? ('                                <h3 class="slider__title"> ' + title + ' </h3>\n') : '';
    return '                        <!-- Карточка -->\n' +
      '                        <div class="swiper-slide slider__slide">\n' +
      '                            <img class="slider__img" src="' + img + '">\n' +
      '                            <div class="slider__info">\n' +
      titleLine +
      cardTextP(sl, '                                ') + '\n' +
      '                            </div>\n' +
      '                        </div>';
  }
  function sliderBlock(s) {
    var per = s.perView != null ? s.perView : 3;
    var slides = (s.slides || []).map(sliderSlide).join('\n\n');
    return '            <div class="slider-block" data-per-view="' + per + '">\n' +
      '                <div class="swiper slider">\n' +
      '                    <div class="swiper-wrapper">\n\n' +
      slides + '\n' +
      '                    </div>\n' +
      '                    <div class="slider__pagination swiper-pagination"></div>\n' +
      '                </div>\n\n' +
      SLIDER_ARROWS + '\n' +
      '            </div>';
  }
  function renderSlider(s, variant) {
    if (variant === 0) {
      var lvl = s.level || 2, title = s.title != null ? s.title : '';
      return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
        headIntro(title, lvl, (s.titleSize || 1), introFrag(s)) +
        sliderBlock(s) + '\n        </div>\n    </article>\n</section>';
    }
    return secOpen(s.anchor) + '\n    <article>\n' + panelWrapper(s, variant === 2) + '\n\n' +
      '        <div class="wrapper">\n' + sliderBlock(s) + '\n        </div>\n    </article>\n</section>';
  }

  // b19 — Таблица (airline-table). Шапка th, строки td; обёртка со скроллом. Заголовок/вводный через headIntro.
  function renderTable(s) {
    var lvl = s.level || 2, title = s.title != null ? s.title : '';
    var header = s.header || [], rows = s.rows || [];
    var il = (s.introParas && s.introParas.length) ? s.introParas : (s.intro ? [s.intro] : []);
    var intro = il.length
      ? il.map(function (p) { return '\n            <p class="text mb-24"> ' + p + ' </p>'; }).join('')
      : '\n            <!--p class="text mb-24"> Текст </p-->';
    var thead = '                    <thead>\n                        <tr>\n' +
      header.map(function (h) { return '                            <th>' + (h != null ? h : '') + '</th>'; }).join('\n') +
      '\n                        </tr>\n                    </thead>';
    var tbody = '                    <tbody>\n' +
      rows.map(function (r) {
        return '                        <tr>\n' +
          (r || []).map(function (c) { return '                            <td>' + (c != null ? c : '') + '</td>'; }).join('\n') +
          '\n                        </tr>';
      }).join('\n') +
      '\n                    </tbody>';
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
      headIntro(title, lvl, (s.titleSize || 1), intro) +
      '            <div class="airline-table__wrap">\n' +
      '                <table class="airline-table">\n' +
      thead + '\n' + tbody + '\n' +
      '                </table>\n            </div>\n        </div>\n    </article>\n</section>';
  }

  // b17 — Текст на большой картинке (big-card). Фоновая картинка (--bg/--bg-m) + «стеклянная» плашка: заголовок + текст + кнопка.
  // Нет деления на лево/право. Заголовок секции и вводный над карточкой — опциональны (по умолчанию закомментированы, как в эталоне).
  function renderBigCard(s) {
    var lvl = s.level || 2;
    var title = s.title != null ? s.title : '';
    var href = s.href != null ? s.href : '';
    var button = s.button != null ? s.button : '';
    var bg = s.bg != null ? s.bg : '';
    var bgM = s.bgMobile != null ? s.bgMobile : '';
    var secHead = s.secTitle
      ? '            <h2 class="title-1 mb-24"> ' + s.secTitle + ' </h2>'
      : '            <!--h2 class="title-1 mb-24"> Заголовок секции </h2-->';
    var secIntro = s.secIntro
      ? '            <p class="text mb-24"> ' + s.secIntro + ' </p>'
      : '            <!--p class="text mb-24"> Текст </p-->';
    var body = normParas(s).map(function (p) { return '                    <p class="text"> ' + p + '</p>'; }).join('\n');
    var btn = button ? '\n                    <a href="' + href + '" class="coral-button"> ' + button + ' </a>' : '';
    return secOpen(s.anchor) + '\n' +
      '    <article>\n' +
      '        <div class="' + wrapCls(s) + '">\n' +
      secHead + '\n' +
      secIntro + '\n' +
      '            <div class="big-card" style="--bg: url(' + bg + '); --bg-m: url(' + bgM + ');">\n' +
      '                <div class="big-card__block">\n' +
      '                    <h' + lvl + ' class="big-card__title title-3"> ' + title + ' </h' + lvl + '>\n' +
      body + btn + '\n' +
      '                </div>\n' +
      '            </div>\n' +
      '        </div>\n' +
      '    </article>\n' +
      '</section>';
  }


  // ==================== b16 Табы / b18 Климат / b20 SEO-ссылки ====================
  // Только Сборщик (в импорте не участвуют). CSS и <script> подключаются один раз на страницу (как у слайдера).
  var CLIMATE_SUN_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\">\n                                <g clip-path=\"url(#clip0_157_1381)\">\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12 6.75C9.10051 6.75 6.75 9.10051 6.75 12C6.75 14.8995 9.10051 17.25 12 17.25C14.8995 17.25 17.25 14.8995 17.25 12C17.25 9.10051 14.8995 6.75 12 6.75ZM5.25 12C5.25 8.27208 8.27208 5.25 12 5.25C15.7279 5.25 18.75 8.27208 18.75 12C18.75 15.7279 15.7279 18.75 12 18.75C8.27208 18.75 5.25 15.7279 5.25 12Z\" fill=\"#535353\"></path>\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M21.25 12C21.25 11.5858 21.5858 11.25 22 11.25L23 11.25C23.4142 11.25 23.75 11.5858 23.75 12C23.75 12.4142 23.4142 12.75 23 12.75L22 12.75C21.5858 12.75 21.25 12.4142 21.25 12Z\" fill=\"#535353\"></path>\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12 2.75C11.5858 2.75 11.25 2.41421 11.25 2V1C11.25 0.585786 11.5858 0.25 12 0.25C12.4142 0.25 12.75 0.585786 12.75 1V2C12.75 2.41421 12.4142 2.75 12 2.75Z\" fill=\"#535353\"></path>\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12 23.75C11.5858 23.75 11.25 23.4142 11.25 23V22C11.25 21.5858 11.5858 21.25 12 21.25C12.4142 21.25 12.75 21.5858 12.75 22V23C12.75 23.4142 12.4142 23.75 12 23.75Z\" fill=\"#535353\"></path>\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M20.5303 20.5303C20.2374 20.8232 19.7626 20.8232 19.4697 20.5303L18.4697 19.5303C18.1768 19.2374 18.1768 18.7626 18.4697 18.4697C18.7626 18.1768 19.2374 18.1768 19.5303 18.4697L20.5303 19.4697C20.8232 19.7626 20.8232 20.2374 20.5303 20.5303Z\" fill=\"#535353\"></path>\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M20.5303 3.46967C20.2374 3.17678 19.7626 3.17678 19.4697 3.46967L18.4697 4.46967C18.1768 4.76256 18.1768 5.23744 18.4697 5.53033C18.7626 5.82322 19.2374 5.82322 19.5303 5.53033L20.5303 4.53033C20.8232 4.23744 20.8232 3.76256 20.5303 3.46967Z\" fill=\"#535353\"></path>\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M3.46967 20.5303C3.76256 20.8232 4.23744 20.8232 4.53033 20.5303L5.53033 19.5303C5.82322 19.2374 5.82322 18.7626 5.53033 18.4697C5.23744 18.1768 4.76256 18.1768 4.46967 18.4697L3.46967 19.4697C3.17678 19.7626 3.17678 20.2374 3.46967 20.5303Z\" fill=\"#535353\"></path>\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M3.46967 3.46967C3.76256 3.17678 4.23744 3.17678 4.53033 3.46967L5.53033 4.46967C5.82322 4.76256 5.82322 5.23744 5.53033 5.53033C5.23744 5.82322 4.76256 5.82322 4.46967 5.53033L3.46967 4.53033C3.17678 4.23744 3.17678 3.76256 3.46967 3.46967Z\" fill=\"#535353\"></path>\n                                    <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M0.25 12C0.25 11.5858 0.585786 11.25 1 11.25L2 11.25C2.41421 11.25 2.75 11.5858 2.75 12C2.75 12.4142 2.41421 12.75 2 12.75L1 12.75C0.585786 12.75 0.25 12.4142 0.25 12Z\" fill=\"#535353\"></path>\n                                </g>\n                                <defs>\n                                    <clipPath id=\"clip0_157_1381\">\n                                        <rect width=\"24\" height=\"24\" fill=\"white\"></rect>\n                                    </clipPath>\n                                </defs>\n                            </svg>";
  var CLIMATE_WAVES_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\">\n                                <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M7.98185 6.60414C7.84493 6.38433 7.60385 6.25 7.34483 6.25C7.08554 6.25 6.84465 6.38393 6.70781 6.60414L6.706 6.607L6.69398 6.62571C6.68255 6.64335 6.66436 6.67101 6.63972 6.70726C6.59038 6.77984 6.51551 6.88636 6.41757 7.01546C6.22075 7.27491 5.93563 7.6191 5.58218 7.96076C4.8508 8.66776 3.94566 9.25 3 9.25C2.58579 9.25 2.25 9.58579 2.25 10C2.25 10.4142 2.58579 10.75 3 10.75C4.53709 10.75 5.80437 9.83224 6.62471 9.03924C6.90475 8.76854 7.14661 8.49895 7.34483 8.25968C7.54304 8.49895 7.78491 8.76854 8.06494 9.03924C8.88529 9.83224 10.1526 10.75 11.6897 10.75C13.2013 10.75 14.6157 9.85601 15.5739 9.08407C16.0044 8.73728 16.371 8.3919 16.648 8.11234C16.9092 8.3867 17.2482 8.72418 17.6342 9.06337C18.0824 9.45719 18.6098 9.86762 19.1648 10.1832C19.7088 10.4925 20.347 10.75 21 10.75C21.4142 10.75 21.75 10.4142 21.75 10C21.75 9.58579 21.4142 9.25 21 9.25C20.722 9.25 20.3515 9.13246 19.9063 8.87928C19.4721 8.63238 19.0297 8.29281 18.6244 7.93663C18.2217 7.58275 17.8714 7.22653 17.6211 6.95769C17.4964 6.82375 17.3976 6.71269 17.3308 6.63601C17.2974 6.5977 17.272 6.56806 17.2555 6.54853L17.2373 6.52702L17.2334 6.52232C17.2333 6.52226 17.2334 6.52237 17.2334 6.52232L17.2327 6.52154C17.0903 6.34955 16.8785 6.25 16.6552 6.25C16.4318 6.25 16.2201 6.34956 16.0776 6.52158L16.074 6.5259L16.0567 6.54625C16.0407 6.565 16.0157 6.59383 15.9825 6.63132C15.9159 6.70635 15.8165 6.81566 15.6889 6.9478C15.4328 7.21301 15.0681 7.56541 14.633 7.91593C13.7292 8.64399 12.6608 9.25 11.6897 9.25C10.744 9.25 9.83885 8.66776 9.10747 7.96076C8.75403 7.6191 8.46891 7.27491 8.27209 7.01546C8.17415 6.88636 8.09928 6.77984 8.04994 6.70726C8.0253 6.67101 8.00711 6.64335 7.99567 6.62571L7.98366 6.607L7.98185 6.60414Z\" fill=\"#535353\"></path>\n                                <path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M7.98185 13.6041C7.84493 13.3843 7.60385 13.25 7.34483 13.25C7.08554 13.25 6.84465 13.3839 6.70781 13.6041L6.706 13.607L6.69398 13.6257C6.68255 13.6433 6.66436 13.671 6.63972 13.7073C6.59038 13.7798 6.51551 13.8864 6.41757 14.0155C6.22075 14.2749 5.93563 14.6191 5.58218 14.9608C4.8508 15.6678 3.94566 16.25 3 16.25C2.58579 16.25 2.25 16.5858 2.25 17C2.25 17.4142 2.58579 17.75 3 17.75C4.53709 17.75 5.80437 16.8322 6.62471 16.0392C6.90475 15.7685 7.14661 15.499 7.34483 15.2597C7.54304 15.499 7.78491 15.7685 8.06494 16.0392C8.88529 16.8322 10.1526 17.75 11.6897 17.75C13.2013 17.75 14.6157 16.856 15.5739 16.0841C16.0044 15.7373 16.371 15.3919 16.648 15.1123C16.9092 15.3867 17.2482 15.7242 17.6342 16.0634C18.0824 16.4572 18.6098 16.8676 19.1648 17.1832C19.7088 17.4925 20.347 17.75 21 17.75C21.4142 17.75 21.75 17.4142 21.75 17C21.75 16.5858 21.4142 16.25 21 16.25C20.722 16.25 20.3515 16.1325 19.9063 15.8793C19.4721 15.6324 19.0297 15.2928 18.6244 14.9366C18.2217 14.5827 17.8714 14.2265 17.6211 13.9577C17.4964 13.8237 17.3976 13.7127 17.3308 13.636C17.2974 13.5977 17.272 13.5681 17.2555 13.5485L17.2373 13.527L17.2334 13.5223C17.2333 13.5223 17.2334 13.5224 17.2334 13.5223L17.2327 13.5215C17.0903 13.3496 16.8785 13.25 16.6552 13.25C16.4318 13.25 16.2201 13.3496 16.0776 13.5216L16.074 13.5259L16.0567 13.5462C16.0407 13.565 16.0157 13.5938 15.9825 13.6313C15.9159 13.7064 15.8165 13.8157 15.6889 13.9478C15.4328 14.213 15.0681 14.5654 14.633 14.9159C13.7292 15.644 12.6608 16.25 11.6897 16.25C10.744 16.25 9.83885 15.6678 9.10747 14.9608C8.75403 14.6191 8.46891 14.2749 8.27209 14.0155C8.17415 13.8864 8.09928 13.7798 8.04994 13.7073C8.0253 13.671 8.00711 13.6433 7.99567 13.6257L7.98366 13.607L7.98185 13.6041Z\" fill=\"#535353\"></path>\n                            </svg>";
  var SEO_CHEVRON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"12\" height=\"7\" viewBox=\"0 0 12 7\" fill=\"none\">\n                            <path d=\"M1 1L6 6L11 1\" stroke=\"#0E2855\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"></path>\n                        </svg>";

  // b16 — Табы. Заголовок (title-2, по центру) + ряд вкладок, под ними панель активной вкладки.
  // вложенный в таб блок «Текст с картинкой» / «Текстовый блок»: только контейнер .panel (без wrapper), с отступом вкладки.
  // withImg=false → без panel__img (аналог «Текстового блока»). Заголовок (если есть) — внутри panel__info.
  function tabPanelBody(t, withImg) {
    var ind = '                        ';            // 24 пробела — уровень .panel внутри вкладки
    var i4 = ind + '    ', i8 = ind + '        ', i12 = ind + '            ';
    var reverse = (withImg && (t.reverse === true || t.reverse === '1' || t.reverse === 1)) ? ' panel--reverse' : '';
    var heading = t.heading != null ? String(t.heading) : '';
    var lvl = t.level || 2, ts = t.titleSize || 2;
    var hi = heading.trim() ? i12 + '<h' + lvl + ' class="title-' + ts + ' mb-16"> ' + heading + ' </h' + lvl + '>\n' : '';
    var list = (t.content != null ? String(t.content) : '').trim();
    var paras = list ? list.split(/\n+/).map(function (p) { return i12 + '<p class="text"> ' + p + ' </p>'; }).join('\n')
                     : i12 + '<p class="text"> </p>';
    var img = t.img != null ? t.img : '';
    var imgDiv = withImg ? (i4 + '<div class="panel__img" style="background-image: url(' + img + ');">\n' + i4 + '</div>\n') : '';
    return ind + '<div class="panel' + reverse + '">\n' +
      i4 + '<div class="panel__col">\n' +
      i8 + '<div class="panel__info">\n' +
      hi + paras + '\n' +
      i8 + '</div>\n' +
      i4 + '</div>\n' +
      imgDiv +
      ind + '</div>';
  }
  function tabPaneBody(t) {
    var type = t.type || 'text';
    if (type === 'panel') return tabPanelBody(t, true);
    if (type === 'textpanel') return tabPanelBody(t, false);
    var c = (t.content != null ? String(t.content) : '').trim();
    return c ? c.split(/\n+/).map(function (p) { return '                        <p class="text"> ' + p + ' </p>'; }).join('\n')
             : '                        <!--Содержимое-->';
  }
  function renderTabs(s) {
    var lvl = s.level || 2, title = s.title != null ? s.title : '';
    var tabs = s.tabs || [];
    var head = String(title).trim() ? '            <h' + lvl + ' class="title-2 mb-24 text-center"> ' + title + ' </h' + lvl + '>\n' : '';
    var nav = tabs.map(function (t, i) {
      return '                    <button class="tabs__tab' + (i === 0 ? ' tabs__tab--active' : '') + '" data-tab="' + (i + 1) + '">' + (t.label != null ? t.label : '') + '</button>';
    }).join('\n');
    var panes = tabs.map(function (t, i) {
      return '                    <div class="tabs__pane' + (i === 0 ? ' tabs__pane--active' : '') + '" data-tab="' + (i + 1) + '">\n' + tabPaneBody(t) + '\n                    </div>';
    }).join('\n');
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
      head +
      '            <div class="tabs" data-tabs="">\n' +
      '                <div class="tabs__nav">\n' + nav + '\n                </div>\n' +
      '                <div class="tabs__content">\n' + panes + '\n                </div>\n' +
      '            </div>\n        </div>\n    </article>\n</section>';
  }

  // b18 — Климат. Заголовок + вводный текст, рядом карточки-сезоны (день/вечер + вода, иконки-погода).
  function climateBlock(b) {
    var title = b.title != null ? b.title : '', day = b.day != null ? b.day : '', water = b.water != null ? b.water : '';
    return '                    <div class="weather__block">\n' +
      '                        <h4 class="weather__title mb-4"> ' + title + ' </h4>\n' +
      '                        <div class="weather__content"> ' + CLIMATE_SUN_SVG + '\n' +
      '                            <p class="weather__text"> ' + day + ' </p>\n' +
      '                        </div>\n' +
      '                        <div class="weather__content"> ' + CLIMATE_WAVES_SVG + '\n' +
      '                            <p class="weather__text"> ' + water + ' </p>\n' +
      '                        </div>\n' +
      '                    </div>';
  }
  function renderClimate(s) {
    var lvl = s.level || 2, heading = s.heading != null ? s.heading : '', intro = s.intro != null ? s.intro : '';
    var seasons = s.seasons || [];
    var headLine = String(heading).trim() ? '                    <h' + lvl + ' class="title-1 mb-16"> ' + heading + ' </h' + lvl + '>\n' : '';
    var introLine = String(intro).trim() ? '                    <p class="text"> ' + intro + ' </p>\n' : '';
    var blocks = seasons.map(climateBlock).join('\n');
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
      '            <div class="weather">\n' +
      '                <div class="weather__info">\n' + headLine + introLine +
      '                </div>\n' +
      '                <div class="weather__inner">\n' + blocks + '\n                </div>\n' +
      '            </div>\n        </div>\n    </article>\n</section>';
  }

  // b20 — SEO-ссылки. Заголовок + 3 колонки-аккордеона со списками ссылок перелинковки.
  function seoColumn(c) {
    var title = c.title != null ? c.title : '';
    var links = (c.links || []).map(function (l) {
      return '                        <li><a href="' + (l.href != null ? l.href : '') + '" target="_blank">' + (l.text != null ? l.text : '') + '</a></li>';
    }).join('\n');
    return '                <div class="coral-toggle js-toggle">\n' +
      '                    <div class="coral-toggle__header js-toggle-header">\n' +
      '                        <h3 class="title-5">' + title + '</h3> ' + SEO_CHEVRON_SVG + '\n' +
      '                    </div>\n' +
      '                    <ul class="coral-toggle__body js-toggle-body">\n' + links + '\n                    </ul>\n' +
      '                </div>';
  }
  function renderSeoLinks(s) {
    var lvl = s.level || 2, title = s.title != null ? s.title : '';
    var cols = s.columns || [];
    var head = String(title).trim() ? '            <h' + lvl + ' class="title-1 mb-24"> ' + title + ' </h' + lvl + '>\n' : '';
    var colsHtml = cols.map(seoColumn).join('\n');
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' +
      head +
      '            <div class="seo-links">\n' + colsHtml + '\n            </div>\n        </div>\n    </article>\n</section>';
  }

  // b21 — Рейтинг отелей. Серия панелей «Текст с картинкой» в одной секции, чередуя стороны картинки.
  // Заголовок каждого отеля: «<ранг>. <ссылка на отель>», класс title-4 mb-8. CSS — тот же, что у «Текст с картинкой» (panel).
  // Названия отелей здесь всегда приходят из заголовков текстовки, а ссылка в заголовке остаётся в заголовке — кнопки нет.
  function renderHotelRating(s) {
    var hotels = s.hotels || [];
    var lvl = s.level || 2, ts = s.titleSize || 4;
    var startRev = !!s.reverse;
    var body = hotels.map(function (h, i) {
      var rev = (i % 2 === 0) ? startRev : !startRev;
      var cls = rev ? 'panel panel--reverse' : 'panel';
      var rank = h.rank ? h.rank + ' ' : '';
      var nameHtml = h.href // название отеля — ссылка в заголовке; та же ссылка — у кнопки «Выбрать тур» в конце карточки
        ? rank + '<a href="' + h.href + '" target="_blank" rel="noopener noreferrer">' + (h.name || '') + '</a>'
        : rank + (h.name || '');
      var hh = '                        <h' + lvl + ' class="title-' + ts + ' mb-8"> ' + nameHtml + ' </h' + lvl + '>';
      var pr = (h.bodyHtml != null) ? h.bodyHtml : (h.paras || []).map(function (p) { return '                        <p class="text"> ' + p + ' </p>'; }).join('\n');
      return '            <div class="' + cls + '">\n' +
        '                <div class="panel__col">\n' +
        '                    <div class="panel__info">\n' +
        hh + '\n' + (pr ? pr + '\n' : '') + ctaLine(h.href, '                        ') +
        '                    </div>\n' +
        '                </div>\n' +
        '                <div class="panel__img" style="background-image: url(' + (h.img || '') + ');">\n' +
        '                </div>\n' +
        '            </div>';
    }).join('\n\n');
    // необязательные заголовок секции + вводный абзац над списком отелей (тот же headIntro, что и у карточек/панелей).
    // Пусто → строка пустая, и блок байт-в-байт совпадает с эталоном b21.
    var head = headIntro(s.secTitle || '', s.secLevel || 2, s.secSize || 1, introFrag({ introParas: s.introParas, intro: s.secIntro }));
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">\n' + head + body + '\n\n        </div>\n    </article>\n</section>';
  }

  var RENDERERS = {
    b21_0: renderHotelRating,
    b17_0: renderBigCard,
    b16_0: renderTabs,
    b18_0: renderClimate,
    b20_0: renderSeoLinks,
    b04_0: renderContacts,
    b19_0: renderTable,
    b14_0: function (s) { return renderSlider(s, 0); },
    b14_1: function (s) { return renderSlider(s, 1); },
    b14_2: function (s) { return renderSlider(s, 2); },
    b15_0: renderFaq,
    b06_0: function(s){ return renderGrid0(s, 'b06'); },
    b06_1: function(s){ return renderGridHeader(s, false, 'b06'); },
    b06_2: function(s){ return renderGridHeader(s, true, 'b06'); },
    b07_0: function(s){ return renderGrid0(s, 'b07'); },
    b07_1: function(s){ return renderGridHeader(s, false, 'b07'); },
    b07_2: function(s){ return renderGridHeader(s, true, 'b07'); },
    b08_0: function(s){ return renderGrid0(s, 'b08'); },
    b08_1: function(s){ return renderGridHeader(s, false, 'b08'); },
    b08_2: function(s){ return renderGridHeader(s, true, 'b08'); },
    b09_0: function(s){ return renderGrid0(s, 'b09'); },
    b09_1: function(s){ return renderGridHeader(s, false, 'b09'); },
    b09_2: function(s){ return renderGridHeader(s, true, 'b09'); },
    b10_0: function(s){ return renderGrid0(s, 'b10'); },
    b10_1: function(s){ return renderGridHeader(s, false, 'b10'); },
    b10_2: function(s){ return renderGridHeader(s, true, 'b10'); },
    b11_0: function(s){ return renderGrid0(s, 'b11'); },
    b01_0: renderBanner,
    b03_0: renderText,
    b05_0: renderCards,
    b05_1: function (s) { return renderCardsHeader(s, false); },
    b05_2: function (s) { return renderCardsHeader(s, true); }
  };

  return { splitTemplate: splitTemplate, RENDERERS: RENDERERS, splitHeadingLink: splitHeadingLink, ctaLine: ctaLine, CTA_TEXT: CTA_TEXT, secOpen: secOpen, wrapCls: wrapCls };
});
