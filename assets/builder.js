/* Coral Builder — режим «Сборщик». Аддитивный модуль поверх справочника.
   Один блок = один тип (Баннер / Навигация / Карточки / Текст с картинкой);
   варианты и последовательности — внутри блока. Навигация собирается автоматически. */
(function () {
  'use strict';
  var CA = window.CoralAssembler;
  if (!CA) { console.error('CoralAssembler не загружен'); return; }
  var TZ = window.TZParser;      // парсер текстовки (assets/tz_parser.js)
  var FF = window.fflate;        // распаковка .docx (assets/fflate.min.js)

  var PALETTE = [
    { group: 'Каркас страницы', items: [{ kind: 'banner', name: 'Баннер' }, { kind: 'nav', name: 'Навигация' }, { kind: 'text', name: 'Подводка' }, { kind: 'contacts', name: 'Контакты' }] },
    { group: 'Сеточные карточки', items: [{ kind: 'cards', name: 'Карточки' }, { kind: 'grid', name: 'Плашки' }] },
    { group: 'Панельные', items: [{ kind: 'panel', name: 'Текст с картинкой' }, { kind: 'textpanel', name: 'Текстовый блок' }] },
    { group: 'Интерактивные', items: [{ kind: 'slider', name: 'Слайдер' }, { kind: 'faq', name: 'Раскрывашка (аккордеон)' }, { kind: 'tabs', name: 'Табы' }] },
    { group: 'Специальные', items: [{ kind: 'bigimage', name: 'Текст на большой картинке' }, { kind: 'climate', name: 'Климат' }, { kind: 'table', name: 'Таблица' }, { kind: 'seolinks', name: 'SEO ссылки' }] }
  ];
  var KIND_NAME = { banner: 'Баннер', nav: 'Навигация', cards: 'Карточки', grid: 'Плашки', panel: 'Текст с картинкой', textpanel: 'Текстовый блок', slider: 'Слайдер', table: 'Таблица', text: 'Подводка', faq: 'Раскрывашка (аккордеон)', contacts: 'Контакты', bigimage: 'Текст на большой картинке', tabs: 'Табы', climate: 'Климат', seolinks: 'SEO ссылки', hotels: 'Рейтинг отелей', tplraw: 'Блок шаблона', after: 'Текст под блоком' };
  function blockName(b) { return (b.kind === 'tplraw' && b.slots && b.slots.label) ? b.slots.label : (KIND_NAME[b.kind] || b.kind); }
  // смысловой заголовок блока (H2/H3 из текстовки) — для комментариев-разделителей при «Скопировать всё»
  function stripTags(x) { return String(x == null ? '' : x).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
  function blockHeadingText(b) {
    // баннер, подводка, раскрывашка и контакты всегда подписываются по типу (не по заголовку из текстовки)
    if (b.kind === 'banner' || b.kind === 'text' || b.kind === 'faq' || b.kind === 'contacts') return '';
    var s = b.slots || {};
    // заголовок секции хранится в title (карточки/плашки/слайдер/таблица) либо heading (текст с картинкой/текстовый) либо secTitle (большая картинка)
    return stripTags(s.title) || stripTags(s.heading) || stripTags(s.secTitle);
  }
  // семейства сеточных плашек: [код, название]
  var GRID_FAMILIES = [['b07', 'Галочки'], ['b06', 'Цены'], ['b08', 'Синяя линия'], ['b09', 'Цифры'], ['b10', 'Иконки'], ['b11', 'Текст']];

  var IC = {
    up: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M5 12.5l5-5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M5 7.5l5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    del: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M4.5 6h11M8 6V4.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6M6.3 6l.6 9a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.6-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    fs: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 8V5.5A1.5 1.5 0 0 0 14.5 4H12M4 12v2.5A1.5 1.5 0 0 0 5.5 16H8M16 12v2.5A1.5 1.5 0 0 1 14.5 16H12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    detach: '<svg viewBox="0 0 20 20" width="15" height="15" fill="none"><path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16h9a1.5 1.5 0 0 0 1.5-1.5V11M11.5 4H16v4.5M16 4l-6.5 6.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    menu: '<svg viewBox="0 0 20 20" width="17" height="17" fill="none"><path d="M4 6h12M4 10h12M4 14h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    chevL: '<svg viewBox="0 0 20 20" width="16" height="16" fill="none"><path d="M12 5l-5 5 5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none"><rect x="4.5" y="9" width="11" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" stroke-width="1.5"/></svg>',
    unlock: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none"><rect x="4.5" y="9" width="11" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 6.9-.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    copy: '<svg viewBox="0 0 20 20" width="13" height="13" fill="none"><rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4 13V5.5A1.5 1.5 0 0 1 5.5 4H13" stroke="currentColor" stroke-width="1.5"/></svg>'
  };
  var sizeUnlocked = {}; // «замки» размера заголовка (title-N) — по ключу строки: каждый открывает только свою строку
  var uidSeq = 0;
  function blockUid(b) { return b._uid || (b._uid = 'u' + (++uidSeq)); }

  var IMG_PANEL = 'https://b2ccdn.coral.ru/content/img/turkey/main_banner_windalan.webp';
  var IMG_CARD = 'https://b2ccdn.coral.ru/content/img/turkey/frame_9.webp'; // заглушка из справочника (не shutterstock)
  var BAN_D = 'https://b2ccdn.coral.ru/content/img/turkey/main_banner_stambdesc.webp';
  var BAN_M = 'https://b2ccdn.coral.ru/content/img/turkey/main_banner_stambmob.webp';
  // баннер рейтингов отелей — свой стиль (тень на заголовке/подзаголовке, свои картинки «Гид по отдыху»)
  var BAN_D_R = 'https://b2ccdn.coral.ru/content/img/Gid_po_otdihu/content_main_banner_desktop_433.webp';
  var BAN_M_R = 'https://b2ccdn.coral.ru/content/img/Gid_po_otdihu/content_main_banner_mobile_433.webp';
  var BIG_BG = '//b2ccdn.coral.ru/content/landing-pages/turkey/stambul/bg.webp';       // фон big-card (десктоп) — плейсхолдер из справочника
  var BIG_BG_M = '//b2ccdn.coral.ru/content/landing-pages/turkey/stambul/bg_m.webp';   // фон big-card (мобайл)

  // иконка по умолчанию для плашек «Иконки» (b10) — как в шаблоне справочника
  var ICON_B10 = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="22" viewBox="0 0 16 22" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M3 5.5C3 2.73858 5.23858 0.5 8 0.5C10.7614 0.5 13 2.73858 13 5.5V6.5C13 7.05228 12.5523 7.5 12 7.5H4C3.44772 7.5 3 7.05228 3 6.5V5.5ZM8 2.5C6.34315 2.5 5 3.84315 5 5.5H11C11 3.84315 9.65685 2.5 8 2.5Z" fill="#0092D0"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M1.00254 6.42875C1.03992 5.90545 1.47536 5.5 2 5.5H14C14.5246 5.5 14.9601 5.90545 14.9975 6.42875L15.9975 20.4288C16.0172 20.7056 15.921 20.9783 15.7319 21.1815C15.5427 21.3846 15.2776 21.5 15 21.5H1C0.722409 21.5 0.457306 21.3846 0.26814 21.1815C0.0789728 20.9783 -0.0172339 20.7056 0.00254385 20.4288L1.00254 6.42875ZM8 15C5.51472 15 3.5 12.9853 3.5 10.5V10H5.5V10.5C5.5 11.8807 6.61929 13 8 13C9.38071 13 10.5 11.8807 10.5 10.5V10H12.5V10.5C12.5 12.9853 10.4853 15 8 15Z" fill="#0092D0"></path></svg>';
  function newCard() { return { title: '', text: '', img: IMG_CARD, level: '' }; }
  function newGridCard(fam) { var c = { title: '', text: '' }; if (fam === 'b06') { c.badge = ''; c.price = ''; } if (fam === 'b07') c.icon = ''; if (fam === 'b10') c.icon = ICON_B10; return c; }
  function newPanel() { return { heading: '', level: 3, paragraphs: [''], img: IMG_PANEL, btnText: '', btnHref: '' }; } // btnText/btnHref — кнопка в конце блока (как у баннера)
  function newSlide() { return { img: IMG_CARD, title: '', text: '' }; }
  function newFaq() { return { q: '', a: '' }; }
  function newTab(label) { return { label: label || '', type: 'text', content: '', heading: '', img: IMG_PANEL, reverse: false }; } // b16 Табы
  function newSeason(title) { return { title: title || '', day: '', water: '' }; }                 // b18 Климат
  function newSeoLink() { return { text: '', href: '' }; }                                         // b20 SEO-ссылки
  function newSeoCol(title) { return { title: title || '', links: [newSeoLink()] }; }
  function newHotel() { return { rank: '', name: '', href: '', paragraphs: [''], img: IMG_PANEL }; } // b21 Рейтинг отелей — один отель
  function defaults(kind) {
    if (kind === 'banner') return { level: 1, title: '', subtitle: '', button: 'Выбрать тур', href: '#hotels', location: '', imgDesktop: BAN_D, imgMobile: BAN_M, afterText: '', navLabel: '', anchor: '' };
    if (kind === 'nav') return {};
    if (kind === 'text') return { paragraphs: [''], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'faq') return { level: 2, title: 'Часто задаваемые вопросы', intro: '', items: [newFaq(), newFaq()], afterText: '', navLabel: 'Вопросы', anchor: '' };
    if (kind === 'contacts') return { level: 2, title: 'Всегда на связи с вами', blocks: [{ tel: '+7 495 502 12 06', text: 'Отдел по работе с частными клиентами, вопросы по заказу' }, { tel: '+7 495 258 67 08', text: 'Горячая линия для туристов 24/7, экстренные ситуации' }], afterText: '', anchor: '' };
    if (kind === 'cards') return { level: 2, cardsVariant: 'b05_0', reverse: false, title: '', intro: '', heading: '', paragraphs: [''], img: IMG_PANEL, cards: [newCard(), newCard()], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'grid') return { family: 'b07', gridVariant: '0', level: 2, reverse: false, title: '', intro: '', heading: '', paragraphs: [''], img: IMG_PANEL, cards: [newGridCard('b07'), newGridCard('b07'), newGridCard('b07')], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'textpanel') return { level: 2, heading: '', intro: '', panels: [newPanel()], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'slider') return { level: 2, sliderVariant: '0', reverse: false, title: '', intro: '', heading: '', paragraphs: [''], img: IMG_PANEL, perView: 3, slides: [newSlide(), newSlide(), newSlide()], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'table') return { level: 2, title: '', intro: '', header: ['Колонка 1', 'Колонка 2', 'Колонка 3'], rows: [['', '', ''], ['', '', '']], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'bigimage') return { level: 2, secTitle: '', secIntro: '', title: '', paragraphs: [''], button: 'Забронировать тур', href: '', bg: BIG_BG, bgMobile: BIG_BG_M, afterText: '', navLabel: '', anchor: '' };
    if (kind === 'tabs') return { level: 2, title: '', tabs: [newTab('Таб 1'), newTab('Таб 2'), newTab('Таб 3')], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'climate') return { level: 2, heading: 'Климат', intro: '', seasons: [newSeason('Лето'), newSeason('Осень'), newSeason('Зима'), newSeason('Весна')], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'seolinks') return { level: 2, title: '', columns: [newSeoCol(), newSeoCol(), newSeoCol()], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'hotels') return { level: 2, titleSize: 4, reverse: false, title: '', secLevel: 2, secSize: 1, intro: '', hotels: [newHotel(), newHotel()], afterText: '', navLabel: '', anchor: '' };
    if (kind === 'tplraw') return { html: '', label: 'Блок шаблона', file: '' }; // сырой HTML из файла шаблона (фикс-блок)
    return { reverse: false, level: 2, heading: '', intro: '', panels: [newPanel()], afterText: '', navLabel: '', anchor: '' }; // panel (multi)
  }
  function variantOf(b) {
    if (b.kind === 'banner') return 'b01_0';
    if (b.kind === 'cards') return b.slots.cardsVariant || 'b05_0';
    if (b.kind === 'grid') return (b.slots.family || 'b07') + '_' + (b.slots.gridVariant || '0');
    if (b.kind === 'slider') return 'b14_' + (b.slots.sliderVariant || '0');
    return '';
  }
  // при смене шаблона с «без картинки» ↔ «с картинкой» переносим заголовок и вводный абзац между полями
  // без картинки: title + intro; с картинкой (панель-шапка): heading + paragraphs
  function migrateHeaderFields(s, toImage) {
    function empty(v) { return !v || !String(v).trim(); }
    function emptyArr(a) { return !a || !a.join('').trim(); }
    if (toImage) { // title/intro → heading/paragraphs
      if (empty(s.heading) && !empty(s.title)) s.heading = s.title;
      if (emptyArr(s.paragraphs) && !empty(s.intro)) s.paragraphs = [s.intro];
      s.title = ''; s.intro = '';
    } else { // heading/paragraphs → title/intro
      if (empty(s.title) && !empty(s.heading)) s.title = s.heading;
      if (empty(s.intro) && !emptyArr(s.paragraphs)) s.intro = s.paragraphs.join('\n\n');
      s.heading = ''; s.paragraphs = [''];
    }
  }

  var state = { blocks: [] };
  var FRAG = {}; var NAV_JS = ''; var FAQ_JS = ''; var SLIDER_LINK = ''; var SLIDER_JS = ''; var TABS_JS = ''; var SEO_JS = ''; var globalCss = '';
  var pageTemplates = []; var tplFixed = {}; var importTemplate = 'article'; // шаблоны страниц импорта (манифест + фикс-блоки)

  function fetchText(p) { return fetch(p).then(function (r) { if (!r.ok) throw new Error(p); return r.text(); }); }
  function loadTemplates() {
    var map = { banner: 'b01_0', card: 'b05_0', panel: 'b12_0' };
    var jobs = Object.keys(map).map(function (k) {
      return fetchText('data/codes/' + map[k] + '.txt').then(function (raw) { FRAG[k] = CA.splitTemplate(raw.replace(/\r\n/g, '\n')).css; });
    });
    jobs.push(fetchText('data/codes/b02_0.txt').then(function (raw) {
      raw = raw.replace(/\r\n/g, '\n'); var st = CA.splitTemplate(raw); FRAG.nav = st.css;
      var m = st.html.match(/<script>[\s\S]*<\/script>/); NAV_JS = m ? m[0] : '';
    }));
    jobs.push(fetchText('data/codes/b15_0.txt').then(function (raw) {
      raw = raw.replace(/\r\n/g, '\n'); FRAG.faq = CA.splitTemplate(raw).css;
      var m = raw.match(/<script>[\s\S]*<\/script>/); FAQ_JS = m ? m[0] : '';
    }));
    jobs.push(fetchText('data/codes/b04_0.txt').then(function (raw) { FRAG.contacts = CA.splitTemplate(raw.replace(/\r\n/g, '\n')).css; }));
    jobs.push(fetchText('data/codes/b19_0.txt').then(function (raw) { FRAG.table = CA.splitTemplate(raw.replace(/\r\n/g, '\n')).css; }));
    jobs.push(fetchText('data/codes/b17_0.txt').then(function (raw) { FRAG.bigcard = CA.splitTemplate(raw.replace(/\r\n/g, '\n')).css; }));
    jobs.push(fetchText('data/codes/b16_0.txt').then(function (raw) {
      raw = raw.replace(/\r\n/g, '\n'); FRAG.tabs = CA.splitTemplate(raw).css;
      var m = raw.match(/<script>[\s\S]*<\/script>/); TABS_JS = m ? m[0] : '';
    }));
    jobs.push(fetchText('data/codes/b18_0.txt').then(function (raw) { FRAG.climate = CA.splitTemplate(raw.replace(/\r\n/g, '\n')).css; }));
    jobs.push(fetchText('data/codes/b20_0.txt').then(function (raw) {
      raw = raw.replace(/\r\n/g, '\n'); FRAG.seo = CA.splitTemplate(raw).css;
      var m = raw.match(/<script>[\s\S]*<\/script>/); SEO_JS = m ? m[0] : '';
    }));
    jobs.push(fetchText('data/codes/b14_0.txt').then(function (raw) {
      raw = raw.replace(/\r\n/g, '\n'); FRAG.slider = CA.splitTemplate(raw).css;
      var lm = raw.match(/<div>\s*<link[^>]*swiper[^>]*>\s*<\/div>/i); SLIDER_LINK = lm ? lm[0] : '';
      var sm = raw.match(/<script src="[^"]*swiper[^"]*"><\/script>\s*<script>[\s\S]*<\/script>/i); SLIDER_JS = sm ? sm[0] : '';
    }));
    ['b06', 'b07', 'b08', 'b09', 'b10', 'b11'].forEach(function (fam) {
      jobs.push(fetchText('data/codes/' + fam + '_0.txt').then(function (raw) { FRAG[fam] = CA.splitTemplate(raw.replace(/\r\n/g, '\n')).css; }));
    });
    jobs.push(fetchText('data/codes/b00_0.txt').then(function (raw) { globalCss = raw.replace(/\r\n/g, '\n'); }));
    // Шаблоны страниц (Статья/Каталог, Расширение структуры, …) — манифест + фикс-блоки из data/templates (редактируются в папке проекта)
    jobs.push(fetchText('data/templates/templates.json').then(function (raw) {
      var m = JSON.parse(raw); pageTemplates = m.templates || []; importTemplate = m['default'] || 'article';
      var fjobs = [];
      pageTemplates.forEach(function (t) { (t.steps || []).forEach(function (st) {
        if (st.type === 'raw' && st.file && !(st.file in tplFixed)) fjobs.push(fetchText('data/' + st.file).then(function (h) { tplFixed[st.file] = h.replace(/\r\n/g, '\n'); }));
      }); });
      return Promise.all(fjobs);
    }).catch(function () { pageTemplates = [{ id: 'article', name: 'Статья / Каталог' }]; importTemplate = 'article'; }));
    return Promise.all(jobs);
  }

  // --- сверка со справочником ---
  // CSS и JS сборщик берёт из файлов справочника, а HTML генерирует сам. Если в справочнике у блока
  // появился элемент или класс, которого генератор не делает, — у блока в справочнике выводится предупреждение.
  // Сравниваем структуру (пары «родитель > ребёнок» по тегу и классам), без текста и количества повторов.
  // Ловит только добавленное/переименованное в справочнике: удалённое из справочника не отличить от необязательного.
  var DRIFT_CASES = { // вариант справочника → [тип блока сборщика, поля поверх defaults]
    b01_0: ['banner'], b02_0: ['nav'], b03_0: ['text'], b04_0: ['contacts'],
    b05_0: ['cards', { cardsVariant: 'b05_0' }], b05_1: ['cards', { cardsVariant: 'b05_1' }], b05_2: ['cards', { cardsVariant: 'b05_2' }],
    b11_0: ['grid', { family: 'b11', gridVariant: '0' }],
    b12_0: ['panel'], b12_1: ['panel', { reverse: true }], b12_2: ['panel', { headingInside: true }], b12_3: ['panel', { reverse: true, headingInside: true }],
    b13_0: ['textpanel'], b14_0: ['slider', { sliderVariant: '0' }], b14_1: ['slider', { sliderVariant: '1' }], b14_2: ['slider', { sliderVariant: '2' }],
    b15_0: ['faq'], b16_0: ['tabs'], b17_0: ['bigimage'], b18_0: ['climate'], b19_0: ['table'], b20_0: ['seolinks']
  };
  ['b06', 'b07', 'b08', 'b09', 'b10'].forEach(function (fam) {
    ['0', '1', '2'].forEach(function (v) { DRIFT_CASES[fam + '_' + v] = ['grid', { family: fam, gridVariant: v, cards: [newGridCard(fam), newGridCard(fam), newGridCard(fam)] }]; });
  });
  // пустые текстовые поля заполняем, чтобы генератор выдал всю свою структуру (кнопки, подзаголовки и т.п.)
  var DRIFT_KEEP = /^(level|secLevel|titleSize|secSize|family|\w+Variant|type|anchor|navLabel|afterText)$/;
  function driftFill(v, key) {
    if (typeof v === 'string') return (v || DRIFT_KEEP.test(key)) ? v : 'Пример';
    if (Array.isArray(v)) return v.map(function (x) { return driftFill(x, key); });
    if (v && typeof v === 'object') { var o = {}; for (var k in v) o[k] = driftFill(v[k], k); return o; }
    return v;
  }
  // классы, которые зависят от настроек/содержимого, а не от шаблона
  var DRIFT_SKIP_CLS = /^(m[tb]-\d+|title-\d|grid-auto--\d+|panel--reverse|active|.+--active)$/;
  var DRIFT_INLINE = /^(br|a|b|strong|i|em|u|s|sub|sup|span|nobr)$/, DRIFT_TEXT = /^(p|li|td|th|h)(\.|$)/;
  function driftPairs(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html'), set = Object.create(null);
    function sig(el) {
      var t = el.tagName.toLowerCase(); if (/^h[1-6]$/.test(t)) t = 'h'; // уровень заголовка — настройка
      var c = [].slice.call(el.classList).filter(function (x) { return !DRIFT_SKIP_CLS.test(x); }).sort();
      return t + (c.length ? '.' + c.join('.') : '');
    }
    (function walk(el, ps) {
      [].forEach.call(el.children, function (ch) {
        var t = ch.tagName.toLowerCase(); if (t === 'script' || t === 'style' || t === 'link') return;
        if (DRIFT_INLINE.test(t) && DRIFT_TEXT.test(ps)) return; // переносы, ссылки, выделение внутри текста — это содержимое, не шаблон
        var s = sig(ch); set[ps + ' > ' + s] = [ps, s];
        if (t !== 'svg') walk(ch, s); // иконки — одним элементом, без внутренностей
      });
    })(doc.body, '');
    return set;
  }
  function driftGenerate(vslug) {
    var c = DRIFT_CASES[vslug];
    if (c[0] === 'nav') return renderNav([{ label: 'Пример', anchor: 'a1' }]);
    var slots = defaults(c[0]), over = c[1] || {};
    for (var k in over) slots[k] = over[k];
    slots = driftFill(slots, '');
    (slots.panels || []).forEach(function (p) { p.paragraphs.push({ ordered: false, items: ['Пример'] }, { ordered: true, items: ['Пример'] }, 'Пример'); });
    if (slots.tabs) { slots.tabs[1].type = 'panel'; slots.tabs[2].type = 'textpanel'; }
    return renderBlockHtml({ kind: c[0], slots: slots }, '');
  }
  function checkDrift() {
    var report = Object.create(null);
    function add(vslug, msg) { (report[vslug] = report[vslug] || []).push(msg); }
    function code(s) { return '<code>' + esc(s) + '</code>'; }
    // тихие поломки CSS/JS: сборщик ищет эти куски в файлах по точному тексту
    if (FRAG.banner && (FRAG.banner.indexOf(BAN_D) < 0 || FRAG.banner.indexOf(BAN_M) < 0))
      add('b01_0', 'В CSS баннера нет адресов картинок по умолчанию ' + code(BAN_D) + ' и ' + code(BAN_M) + ' — сборщик не сможет подставить свои картинки. Верните адреса в файл или поменяйте BAN_D/BAN_M в builder.js.');
    if (!SLIDER_JS) add('b14_0', 'Не найден скрипт слайдера — в сборщике слайдер уйдёт без скрипта. Ожидается ' + code('<script src="…swiper…"></script>') + ' и сразу за ним ' + code('<script>…</script>') + '.');
    if (!SLIDER_LINK) add('b14_0', 'Не найдено подключение стилей Swiper ' + code('<div><link …swiper…></div>') + '.');
    [['b02_0', NAV_JS], ['b15_0', FAQ_JS], ['b16_0', TABS_JS], ['b20_0', SEO_JS]].forEach(function (p) {
      if (!p[1]) add(p[0], 'Не найден скрипт блока ' + code('<script>…</script>') + ' — в сборщике блок уйдёт без скрипта.');
    });
    var jobs = Object.keys(DRIFT_CASES).map(function (vslug) {
      return fetchText('data/codes/' + vslug + '.txt').then(function (raw) {
        var fileHtml = CA.splitTemplate(raw.replace(/\r\n/g, '\n')).html.replace(/<div>\s*<link[^>]*>\s*<\/div>/gi, '');
        var want = driftPairs(fileHtml), have = driftPairs(driftGenerate(vslug)), missing = Object.create(null);
        Object.keys(want).forEach(function (k) { if (!have[k]) missing[want[k][1]] = want[k][0]; });
        // вложенное в уже отсутствующий элемент не перечисляем отдельно
        Object.keys(missing).forEach(function (s) {
          if (missing[missing[s]] == null) add(vslug, 'Есть в справочнике, сборщик не генерирует: ' + code(s) + (missing[s] ? ' внутри ' + code(missing[s]) : ''));
        });
      }).catch(function (e) { add(vslug, 'Не удалось сверить: ' + esc(e && e.message || e)); });
    });
    return Promise.all(jobs).then(function () {
      var keys = Object.keys(report);
      if (keys.length) console.warn('[сверка со справочником] расхождения:', report);
      showDrift(keys.map(function (k) { return { vslug: k, msgs: report[k] }; }));
    });
  }
  // предупреждения в справочнике (он строится отдельно, app.js) — ждём, пока появятся блоки
  function showDrift(list) {
    var tries = 0;
    (function place() {
      list.forEach(function (d) {
        if (d.done) return;
        var codeEl = document.getElementById('code-' + d.vslug), box = codeEl && codeEl.closest('.code-box');
        if (!box) return;
        var w = document.createElement('div'); w.className = 'drift-warn';
        w.innerHTML = '<strong>Сборщик расходится со справочником</strong><ul><li>' + d.msgs.join('</li><li>') + '</li></ul>';
        box.parentNode.insertBefore(w, box); d.done = true;
        var sec = box.closest('section.block'), link = sec && document.querySelector('.nav-link[data-target="' + sec.id + '"]');
        if (link) link.classList.add('has-drift');
      });
      if (list.some(function (d) { return !d.done; }) && ++tries < 50) setTimeout(place, 200);
    })();
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function br(s) { return String(s == null ? '' : s).replace(/\r/g, '').replace(/\n/g, '<br>'); }
  // Экранирование &, <, > в тексте с сохранением уже готовых ссылок <a …>…</a> (для рейтинга отелей)
  function escKeepLinks(s) {
    return String(s == null ? '' : s).split(/(<a\s[^>]*>[\s\S]*?<\/a>)/gi).map(function (seg) {
      if (/^<a\s/i.test(seg)) return seg;
      return seg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&lt;(\/?)b&gt;/g, '<$1b>'); // жирный пункт из .docx
    }).join('');
  }
  function splitParas(str) { return String(str || '').split(/\n[ \t]*\n/).map(function (x) { return x.replace(/^\n+|\n+$/g, ''); }).filter(function (x) { return x.trim(); }); }
  // Заголовок баннера: длинный текст разбиваем переносами на сбалансированные строки (короткий — без переноса)
  function wrapBanner(text) {
    var t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= 24) return t;              // короткие заголовки не переносим
    var words = t.split(' ');
    var n = Math.min(3, Math.max(2, Math.ceil(t.length / 24)));  // целевое число строк
    function greedyLines(W) { var ln = 1, len = 0; for (var i = 0; i < words.length; i++) { var w = words[i].length; if (!len) len = w; else if (len + 1 + w <= W) len += 1 + w; else { ln++; len = w; } } return ln; }
    var W = 0; words.forEach(function (w) { if (w.length > W) W = w.length; });
    while (greedyLines(W) > n) W++;            // минимальная ширина, укладывающаяся в n строк → сбалансированные строки
    var lines = [], cur = '';
    words.forEach(function (w) { if (!cur) cur = w; else if (cur.length + 1 + w.length <= W) cur += ' ' + w; else { lines.push(cur); cur = w; } });
    if (cur) lines.push(cur);
    return lines.join(' \n');  // пробел перед переносом — как в примерах: «что <br>посмотреть»
  }
  // Превратить «голые» ссылки (http/https) в тексте в <a class="text">…</a>, не трогая уже готовые <a>…</a>
  function autolink(text) {
    if (!text) return text;
    return String(text).split(/(<a\s[^>]*>[\s\S]*?<\/a>)/gi).map(function (seg) {
      if (/^<a\s/i.test(seg)) return seg;
      return seg.replace(/(https?:\/\/[^\s<>"'()]+[^\s<>"'().,;:!?])/g, function (u) { return '<a href="' + u + '" class="text">' + u + '</a>'; });
    }).join('');
  }
  // Экранирование текста для превью с сохранением кликабельных ссылок (и «голых», и готовых <a>)
  function escLinks(s) {
    return String(s == null ? '' : s).split(/(<a\s[^>]*>[\s\S]*?<\/a>)/gi).map(function (seg) {
      if (/^<a\s/i.test(seg)) { var m = seg.match(/href="([^"]*)"[\s\S]*?>([\s\S]*?)<\/a>/i); return m ? '<a href="' + esc(m[1]) + '" target="_blank" rel="noopener" class="tz-link">' + esc(m[2]) + '</a>' : ''; }
      return esc(seg).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/(https?:\/\/[^\s<>"'()]+[^\s<>"'().,;:!?])/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener" class="tz-link">' + u + '</a>'; });
    }).join('');
  }
  // текст панели → смесь абзацев (строки) и списков ({ordered, items}); строки-пункты «- »/«· » становятся списком
  function parsePanelText(str) {
    var lines = String(str || '').replace(/\r/g, '').split('\n'), out = [], list = null, para = [];
    function flushPara() { if (para.length) { out.push(para.join('\n')); para = []; } }
    function flushList() { if (list) { out.push(list); list = null; } }
    lines.forEach(function (line) {
      var l = line.trim(), bm = l.match(/^[-–—•*·]\s+(.*)$/), nm = l.match(/^\d+[.)]\s+(.*)$/);
      if (bm || nm) { flushPara(); if (list && !!nm !== list.ordered) flushList(); if (!list) list = { ordered: !!nm, items: [] }; list.items.push((bm ? bm[1] : nm[1]).trim()); return; }
      flushList();
      if (!l) { flushPara(); return; }
      para.push(l);
    });
    flushPara(); flushList();
    return out;
  }
  // обратно в текст для поля редактора: абзацы как есть, списки как строки «- »/«1. »
  function serializePanelBlocks(arr) {
    return (arr || []).map(function (b) {
      if (isPanelList(b)) return b.items.map(function (x, i) { return (b.ordered ? (i + 1) + '. ' : '- ') + x; }).join('\n');
      return b;
    }).join('\n\n');
  }
  var secOpen = CA.secOpen, wrapCls = CA.wrapCls; // общие с генератором блоков: <section> с якорем и класс обёртки

  // --- навигация: пункты и якоря из блоков ---
  function navData() {
    var items = [], anchors = {};
    state.blocks.forEach(function (b, i) {
      // навигация никогда не ссылается на баннер, подводку и контакты — они не пункты меню
      if (b.kind === 'nav' || b.kind === 'banner' || b.kind === 'text' || b.kind === 'contacts') { anchors[i] = ''; return; }
      var a = b.slots.anchor || (b.slots.navLabel ? 'section-' + (i + 1) : '');
      anchors[i] = a;
      if (b.slots.navLabel && a) items.push({ label: b.slots.navLabel, anchor: a });
    });
    return { items: items, anchors: anchors };
  }
  function renderNav(items) {
    var links = items.map(function (it) { return '<a class="anchors__link" href="#' + it.anchor + '"> ' + it.label + ' </a>'; }).join(' ');
    return '<div>\n    <section class="coral js-anchor">\n        <article>\n            <div class="wrapper mt-24">\n' +
      '                <div class="anchors"> ' + links + ' </div>\n            </div>\n        </article>\n    </section>\n</div>';
  }

  // --- многопанельный «текст с картинкой» ---
  function isPanelList(b) { return b && typeof b === 'object' && b.items; }
  // содержимое панели: смесь абзацев (строки) и списков ({ordered, items}); у абзацев рядом со списком — отступы
  function panelBodyHtml(blocks) {
    var arr = (blocks && blocks.length) ? blocks : [];
    return arr.map(function (b, i) {
      if (isPanelList(b)) {
        var tag = b.ordered ? 'ol' : 'ul';
        var lis = b.items.map(function (x) { return '                            <li class="text" style="margin-left: 30px;"> ' + br(x) + '</li>'; }).join('\n');
        return '                        <' + tag + '>\n' + lis + '\n                        </' + tag + '>';
      }
      var prevL = i > 0 && isPanelList(arr[i - 1]), nextL = i < arr.length - 1 && isPanelList(arr[i + 1]);
      var st = prevL && nextL ? ' style="margin-top: 10px; margin-bottom: 10px"' : prevL ? ' style="margin-top: 10px"' : nextL ? ' style="margin-bottom: 10px"' : '';
      return '                        <p class="text"' + st + '> ' + br(b) + ' </p>';
    }).join('\n');
  }
  // textOnly: блок без картинок (textpanel) ИЛИ у этой конкретной части картинки нет (пустой URL) → просто текст, без panel__img
  function panelIsTextOnly(it, noImg) { return !!noImg || !String(it && it.img == null ? '' : it.img).trim(); }
  function panelItemHtml(it, reverse, noImg) {
    var textOnly = panelIsTextOnly(it, noImg);
    var cls = (reverse && !textOnly) ? 'panel panel--reverse' : 'panel';
    var hcls = 'title-' + (it.titleSize || 5) + ' mb-16';
    // ссылка в заголовке остаётся в заголовке (как в рейтинге отелей)
    var h = '';
    if (it.heading) {
      if (it.level === '' || it.level === 'p') h = '                        <p class="' + hcls + '"> ' + br(it.heading) + ' </p>\n'; // «П» — заголовок как абзац <p>
      else { var lvl = it.level || 3; h = '                        <h' + lvl + ' class="' + hcls + '"> ' + br(it.heading) + ' </h' + lvl + '>\n'; }
    }
    var pr = panelBodyHtml(it.paragraphs);
    // кнопка в конце блока — только из своего поля ссылки (при импорте оно заполняется из строки-ссылки среди абзацев)
    var cta = CA.ctaLine(it.btnHref, '                        ', br(it.btnText || ''));
    return '            <div class="' + cls + '">\n                <div class="panel__col">\n                    <div class="panel__info">\n' +
      h + pr + '\n' + cta + '                    </div>\n                </div>\n' +
      (textOnly ? '' : '                <div class="panel__img" style="background-image: url(' + (it.img || '') + ');">\n                </div>\n') +
      '            </div>';
  }
  function renderPanels(s, noImg) {
    var items = s.panels || [];
    // «заголовок внутри блока» (b12_2) — только для «Текст с картинкой»: заголовок уходит в .panel__info первого блока, а над блоком его нет
    var inside = !noImg && !!s.headingInside && !!s.heading;
    var over = (s.heading && !inside) ? '\n            <h' + (s.level || 2) + ' class="title-' + effTitleSize(s.level, s.titleSize) + ' mb-24"> ' + br(s.heading) + ' </h' + (s.level || 2) + '>' : '';
    var introList = (s.introParas && s.introParas.length) ? s.introParas : (s.intro ? [br(s.intro)] : []);
    // при «заголовок внутри блока» вводный абзац-подводка тоже уходит внутрь первого блока, а не остаётся над ним
    var introAbove = inside ? '' : introList.map(function (p, i) {
      var cls = (i === introList.length - 1) ? 'text mb-24' : 'text ';
      return '\n            <p class="' + cls + '"> ' + p + ' </p>';
    }).join('');
    var first = !!s.reverse;
    var imgSeen = 0; // чередуем стороны только у частей с картинкой (части-«просто текст» стороны не занимают)
    var body = items.map(function (it, i) {
      var textOnly = panelIsTextOnly(it, noImg);
      var rev = textOnly ? false : ((imgSeen % 2 === 0) ? first : !first);
      if (!textOnly) imgSeen++;
      var html = panelItemHtml(it, rev, noImg);
      if (i === 0 && inside) {
        var hIn = '                        <h' + (s.level || 2) + ' class="title-2 mb-16"> ' + br(s.heading) + ' </h' + (s.level || 2) + '>\n';
        var introIn = introList.map(function (p) { return '                        <p class="text mb-16"> ' + p + ' </p>\n'; }).join('');
        html = html.replace('<div class="panel__info">\n', '<div class="panel__info">\n' + hIn + introIn);
      }
      return html;
    }).join('\n\n');
    return secOpen(s.anchor) + '\n    <article>\n        <div class="' + wrapCls(s) + '">' + over + introAbove + '\n' + body + '\n        </div>\n    </article>\n</section>';
  }

  function slotsForRender(b) {
    var s = b.slots, o = {};
    for (var k in s) o[k] = s[k];
    if (o.title != null) o.title = br(o.title);
    if (o.subtitle != null) o.subtitle = br(o.subtitle);
    if (o.secTitle != null) o.secTitle = br(o.secTitle);   // big-card: заголовок секции над карточкой
    if (o.secIntro != null) o.secIntro = br(o.secIntro);   // big-card: вводный над карточкой
    if (o.button != null) o.button = br(o.button);         // текст кнопки (баннер/big-card)
    if (o.heading != null) o.heading = br(o.heading);
    if (o.intro != null) { o.introParas = splitParas(o.intro).map(br); o.intro = br(o.intro); }
    if (o.paragraphs) o.paragraphs = o.paragraphs.map(br);
    if (o.cards) o.cards = o.cards.map(function (c) {
      if (o.family) { var gps = splitParas(c.text || ''); return { title: br(c.title), text: br(c.text), paras: gps.length ? gps.map(br) : [br(c.text)], badge: br(c.badge), price: br(c.price), icon: c.icon }; }
      var ps = splitParas(c.text || '');
      return { title: br(c.title), text: br(c.text), img: c.img, level: c.level, paras: ps.length ? ps.map(br) : [br(c.text)] };
    });
    if (o.slides) o.slides = o.slides.map(function (sl) { var sps = splitParas(sl.text || ''); return { img: sl.img, title: br(sl.title), text: br(sl.text), paras: sps.length ? sps.map(br) : [br(sl.text)] }; });
    if (o.header) o.header = o.header.map(br);
    if (o.rows) o.rows = o.rows.map(function (r) { return (r || []).map(br); });
    if (o.items) o.items = o.items.map(function (it) { var ps = splitParas(it.a || ''); return { q: br(it.q), a: br(it.a), aParas: ps.length ? ps.map(br) : [br(it.a)] }; });
    if (o.blocks) o.blocks = o.blocks.map(function (bl) { return { tel: br(bl.tel), text: br(bl.text) }; });
    if (o.tabs) o.tabs = o.tabs.map(function (t) { return { label: br(t.label), type: t.type || 'text', content: t.content, heading: br(t.heading), img: t.img, reverse: t.reverse, level: t.level, titleSize: t.titleSize }; }); // content: переносы = разделитель абзацев (br не применяем)
    if (o.seasons) o.seasons = o.seasons.map(function (sn) { return { title: br(sn.title), day: br(sn.day), water: br(sn.water) }; });
    if (o.columns) o.columns = o.columns.map(function (cl) { return { title: br(cl.title), links: (cl.links || []).map(function (l) { return { text: br(l.text), href: l.href }; }) }; });
    return o;
  }

  function renderBlockHtml(b, eff) {
    if (b.kind === 'tplraw') return b.slots.html || ''; // фикс-блок шаблона: сырой HTML из файла, как есть
    var s = slotsForRender(b); s.anchor = eff; s.tight = !!b._tight; // часть разделённой секции — компактный wrapper
    if (b._margin != null) s.margin = b._margin; // явный отступ сверху (из импорта) имеет приоритет над tight
    if (b.kind === 'banner') return CA.RENDERERS.b01_0(s);
    if (b.kind === 'text') return CA.RENDERERS.b03_0(s);
    if (b.kind === 'contacts') return CA.RENDERERS.b04_0(s);
    if (b.kind === 'faq') return CA.RENDERERS.b15_0(s);
    if (b.kind === 'cards') return CA.RENDERERS[variantOf(b)](s);
    if (b.kind === 'grid') { if ((b.slots.gridVariant || '0') !== '0') { s.intro = ''; s.introParas = []; } return CA.RENDERERS[variantOf(b)](s); }
    if (b.kind === 'panel') return renderPanels(s);
    if (b.kind === 'textpanel') return renderPanels(s, true);
    if (b.kind === 'slider') { if ((b.slots.sliderVariant || '0') !== '0') { s.intro = ''; s.introParas = []; } return CA.RENDERERS[variantOf(b)](s); }
    if (b.kind === 'table') return CA.RENDERERS.b19_0(s);
    if (b.kind === 'bigimage') return CA.RENDERERS.b17_0(s);
    if (b.kind === 'tabs') return CA.RENDERERS.b16_0(s);
    if (b.kind === 'climate') return CA.RENDERERS.b18_0(s);
    if (b.kind === 'seolinks') return CA.RENDERERS.b20_0(s);
    if (b.kind === 'hotels') {
      var ho = { anchor: eff, tight: !!b._tight, margin: (b._margin != null ? b._margin : undefined), level: b.slots.level || 3, titleSize: b.slots.titleSize || 4, reverse: !!b.slots.reverse,
        secTitle: escKeepLinks(b.slots.title || ''), secLevel: b.slots.secLevel || 2, secSize: b.slots.secSize || 1,
        introParas: splitParas(b.slots.intro || '').map(function (p) { return br(escKeepLinks(p)); }) };
      ho.hotels = (b.slots.hotels || []).map(function (h) {
        var pl = (h.paragraphs && h.paragraphs.length ? h.paragraphs : ['']).map(function (p) {
          return isPanelList(p) ? { ordered: p.ordered, items: (p.items || []).map(function (x) { return escKeepLinks(x); }) } : escKeepLinks(p);
        });
        return { rank: escKeepLinks(h.rank || ''), name: escKeepLinks(h.name || ''), href: h.href || '', img: h.img || '', bodyHtml: panelBodyHtml(pl) };
      });
      return CA.RENDERERS.b21_0(ho);
    }
    return '';
  }

  // CSS-фрагменты блока (баннер — с подстановкой картинок)
  function blockFrags(b) {
    if (b.kind === 'banner') {
      // CSS баннера всегда стандартный (b01_0) — у рейтингов отличаются только картинки, они подставляются ниже
      var css = FRAG.banner;
      if (b.slots.imgDesktop && b.slots.imgDesktop !== BAN_D) css = css.split(BAN_D).join(b.slots.imgDesktop);
      if (b.slots.imgMobile && b.slots.imgMobile !== BAN_M) css = css.split(BAN_M).join(b.slots.imgMobile);
      return [css];
    }
    if (b.kind === 'cards') { var v = variantOf(b); return v === 'b05_0' ? [FRAG.card] : [FRAG.panel, FRAG.card]; }
    if (b.kind === 'grid') { var fam = b.slots.family || 'b07'; return (b.slots.gridVariant || '0') === '0' ? [FRAG[fam]] : [FRAG.panel, FRAG[fam]]; }
    if (b.kind === 'panel' || b.kind === 'textpanel') return [FRAG.panel];
    if (b.kind === 'slider') { var sv = b.slots.sliderVariant || '0'; var base = sv === '0' ? [FRAG.slider] : [FRAG.panel, FRAG.slider]; if (SLIDER_LINK) base.push(SLIDER_LINK); return base; }
    if (b.kind === 'faq') return [FRAG.faq];
    if (b.kind === 'table') return [FRAG.table];
    if (b.kind === 'bigimage') return [FRAG.bigcard];
    if (b.kind === 'contacts') return [FRAG.contacts];
    if (b.kind === 'tabs') { var tf = [FRAG.tabs]; if ((b.slots.tabs || []).some(function (t) { return t.type === 'panel' || t.type === 'textpanel'; })) tf.push(FRAG.panel); return tf; }
    if (b.kind === 'climate') return [FRAG.climate];
    if (b.kind === 'seolinks') return [FRAG.seo];
    if (b.kind === 'hotels') return [FRAG.panel];
    return [];
  }
  // JS-сниппет блока, который добавляется на страницу один раз (аккордеон, слайдер, табы, SEO-ссылки)
  function blockJs(b) {
    if (b.kind === 'faq') return FAQ_JS;
    if (b.kind === 'slider') return SLIDER_JS;
    if (b.kind === 'tabs') return TABS_JS;
    if (b.kind === 'seolinks') return SEO_JS;
    return '';
  }

  function injectAfterText(html, text) {
    var ps = splitParas(text).map(function (p) { return '            <p class="text"> ' + br(p) + ' </p>'; }).join('\n');
    if (!ps) return html;
    var wrap = '        <div class="wrapper">\n' + ps + '\n        </div>\n';
    var marker = '    </article>';
    var idx = html.lastIndexOf(marker);
    return idx < 0 ? html : html.slice(0, idx) + wrap + html.slice(idx);
  }

  function pieces() {
    var seenCss = Object.create(null), seenJs = Object.create(null), arr = [];
    var nd = navData();
    // id блока → индекс его секции: части одной секции (смыслового блока) делят один ключ, чтобы не разбиваться комментариями
    var blockSec = Object.create(null);
    Object.keys(importMap).forEach(function (k) { ((importMap[k] && importMap[k].ids) || []).forEach(function (id) { if (id) blockSec[id] = k; }); });
    function secKeyOf(b, i) { return (b._id != null && blockSec[b._id] != null) ? 'sec' + blockSec[b._id] : 'b' + i; }
    state.blocks.forEach(function (b, i) {
      if (b.override != null) { arr.push({ label: blockName(b) + ' · ручная правка', secName: blockHeadingText(b) || blockName(b), secKey: secKeyOf(b, i), code: b.override }); return; }
      if (b.kind === 'nav') {
        var parts = [];
        if (FRAG.nav && !seenCss[FRAG.nav]) { parts.push(FRAG.nav); seenCss[FRAG.nav] = 1; }
        parts.push(renderNav(nd.items));
        if (NAV_JS && !seenJs[NAV_JS]) { parts.push(NAV_JS); seenJs[NAV_JS] = 1; }
        arr.push({ label: 'Навигация', secName: 'Навигация', secKey: 'b' + i, code: parts.join('\n\n') });
        return;
      }
      var html = renderBlockHtml(b, nd.anchors[i]);
      if (b.slots.afterText) html = injectAfterText(html, b.slots.afterText);
      var need = blockFrags(b);
      var fresh = need.filter(function (c) { return c && !seenCss[c]; });
      fresh.forEach(function (c) { seenCss[c] = 1; });
      var cssPart = fresh.join('\n\n');
      var js = blockJs(b), jsPart = (js && !seenJs[js]) ? js : '';
      if (jsPart) seenJs[js] = 1;
      var label = blockName(b) + ((!cssPart && need.length) ? ' · CSS уже выше' : '');
      arr.push({ label: label, secName: blockHeadingText(b) || blockName(b), secKey: secKeyOf(b, i), code: (cssPart ? cssPart + '\n\n' : '') + html + (jsPart ? '\n\n' + jsPart : '') });
    });
    return arr;
  }
  function fullCode() {
    var n = 0, prevKey = null;
    // комментарий-заголовок ставим один раз на смысловой блок (секцию); его части-продолжения идут без своего комментария
    return pieces().map(function (p) {
      if (p.secKey !== prevKey) {
        prevKey = p.secKey; n++;
        var name = p.secName || String(p.label || '').split(' · ')[0];
        return '<!-- ===================== ' + n + '. ' + name + ' ===================== -->\n' + p.code;
      }
      return p.code; // продолжение того же смыслового блока — без комментария
    }).join('\n\n\n\n');
  }

  // --- превью без мигания ---
  function shellDoc() {
    var BASE = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, ''); // абсолютный путь к каталогу страницы (надёжно и в откреплённом окне)
    return '<!doctype html><html lang="ru"><head><meta charset="utf-8">' +
      '<link rel="stylesheet" href="' + BASE + 'assets/vendor/swiper-bundle.min.css">' +
      '<style>' + globalCss.split('</style>')[0].replace('<style>', '') + '</style>' +
      '<style>body{margin:0;background:#f5f5f8;font-family:Manrope,system-ui,-apple-system,sans-serif}' +
      '::-webkit-scrollbar{width:0;height:0}html{scrollbar-width:none}' +
      '[data-cb-block]{cursor:pointer}[data-cb-block]:hover{outline:2px solid rgba(0,146,208,.45);outline-offset:-3px;border-radius:6px}' +
      '.coral-toggle__header{cursor:pointer}.tabs__tab{cursor:pointer}' + // раскрывашка и табы кликабельны
      '@media screen and (max-width:768px){.slider__prev,.slider__next{display:flex!important}}' + // стрелки видимы и в узком превью (превью — десктопный инструмент)
      '.cb-live-empty{display:flex;align-items:center;justify-content:center;height:100vh;color:#6b7785;font:500 15px Manrope,system-ui,sans-serif}</style>' +
      '<script src="' + BASE + 'assets/vendor/swiper-bundle.min.js"><\/script>' +
      '</head><body><div class="layout-container-limit" id="cb-live"></div><div id="cb-live-empty" class="cb-live-empty">Добавьте блок из меню слева</div>' +
      '<script>(function(){' +
      // Слайдер: настоящий Swiper — ровно та же инициализация, что и в CMS (нативные слайды, стрелки, пагинация)
      'function initSliders(){if(typeof Swiper==="undefined"){return setTimeout(initSliders,60);}' +
        'document.querySelectorAll(".slider-block").forEach(function(block){' +
          'var swiperEl=block.querySelector(".swiper");if(!swiperEl||swiperEl.classList.contains("swiper-initialized"))return;' +
          'var perView=parseInt(block.dataset.perView||"3",10);' +
          'var slidesCount=swiperEl.querySelectorAll(".swiper-slide").length;' +
          'var sw=new Swiper(swiperEl,{slidesPerView:1,spaceBetween:24,loop:slidesCount>=perView*2,watchOverflow:true,' +
            'breakpoints:{768:{slidesPerView:Math.min(2,perView),spaceBetween:24},1024:{slidesPerView:perView,spaceBetween:24}},' +
            'pagination:{el:block.querySelector(".swiper-pagination"),clickable:true},' +
            'navigation:{nextEl:block.querySelector(".slider__next"),prevEl:block.querySelector(".slider__prev")},' +
            'on:{lock:function(){block.classList.add("slider-block--locked");},unlock:function(){block.classList.remove("slider-block--locked");}}});' +
          'block.classList.toggle("slider-block--locked",sw.isLocked);});}' +
      // Раскрывашка: как в CMS — контент открывается через max-height по scrollHeight
      'function setToggle(t,open){var b=t.querySelector(".coral-toggle__body");t.classList.toggle("active",open);if(b)b.style.maxHeight=open?(b.scrollHeight+"px"):"0px";}' +
      'document.addEventListener("click",function(e){' +
        'var h=e.target.closest&&e.target.closest(".coral-toggle__header");' +
        'if(h){var t=h.closest(".coral-toggle");if(t)setToggle(t,!t.classList.contains("active"));return;}' +
        // Табы: переключаем активную вкладку и её панель внутри своего [data-tabs]
        'var tb=e.target.closest&&e.target.closest(".tabs__tab");' +
        'if(tb){var blk=tb.closest("[data-tabs]");if(blk){var id=tb.getAttribute("data-tab");' +
          'blk.querySelectorAll(".tabs__tab").forEach(function(x){x.classList.remove("tabs__tab--active");});' +
          'blk.querySelectorAll(".tabs__pane").forEach(function(x){x.classList.remove("tabs__pane--active");if(x.getAttribute("data-tab")===id)x.classList.add("tabs__pane--active");});' +
          'tb.classList.add("tabs__tab--active");}}' +
      '});' +
      'window.__cbInit=function(){initSliders();};window.__cbInit();' +
      '})();<\/script>' +
      globalCss.split('</style>').slice(1).join('</style>') + // скрипты общих стилей (неразрывные пробелы) — как на сайте
      '</body></html>';
  }
  function wrappedCode() {
    // хвостовой отступ: можно прокрутить чуть ниже последнего блока (в пустоту), чтобы он не липнул к низу
    return pieces().map(function (p, i) { return '<div data-cb-block="' + i + '">' + p.code + '</div>'; }).join('\n') +
      '\n<div aria-hidden="true" style="height:260px"></div>';
  }
  function onPreviewClick(e) {
    var doc = e.target.ownerDocument;
    var a = e.target.closest ? e.target.closest('a') : null;
    if (a) { // ссылки в превью не уводят со страницы; якорь — плавно мотаем внутри превью
      e.preventDefault();
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) === '#' && href.length > 1) { var tgt = doc.getElementById(href.slice(1)); if (tgt) { var w = doc.defaultView; var top = (w.scrollY || 0) + tgt.getBoundingClientRect().top - 12; w.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); } }
      return;
    }
    var el = e.target.closest ? e.target.closest('[data-cb-block]') : null;
    if (el) focusBlock(+el.getAttribute('data-cb-block'));
  }
  function focusBlock(i) {
    var el = document.querySelector('.cb-block[data-i="' + i + '"]'); if (!el) return;
    syncFocusBlock(i, 'preview');
    el.classList.add('cb-flash'); setTimeout(function () { el.classList.remove('cb-flash'); }, 1300);
  }
  // фокус на блоке в панели управления или в окне «Код» — доводим остальные виды к нему
  function onBuilderFocusIn(e) {
    var t = e.target;
    if (t.classList && t.classList.contains('cb-codearea')) return syncFocusBlock(+t.dataset.piece, 'code');
    var bi = blockIndexOf(t); if (bi >= 0) syncFocusBlock(bi, 'panel');
  }
  function paintPreview(f) {
    if (!f) return; var d;
    try { d = f.contentDocument; } catch (e) { return; }
    if (!f._ready || !d.getElementById('cb-live')) { d.open(); d.write(shellDoc()); d.close(); f._ready = true; d = f.contentDocument; d.addEventListener('click', onPreviewClick); }
    var live = d.getElementById('cb-live'), empty = d.getElementById('cb-live-empty');
    if (!live) return;
    var win = d.defaultView, keepY = win ? (win.scrollY || d.documentElement.scrollTop || 0) : 0; // прокрутку превью сохраняем, чтобы правка блока не отматывала страницу
    if (state.blocks.length) { live.innerHTML = wrappedCode(); live.style.display = ''; if (empty) empty.style.display = 'none'; var w = d.defaultView; if (w && w.__cbInit) w.__cbInit(); }
    else { live.innerHTML = ''; live.style.display = 'none'; if (empty) empty.style.display = 'flex'; }
    if (win && keepY) { try { win.scrollTo(0, keepY); } catch (e) {} } // возвращаем прокрутку после перерисовки
  }
  function updatePreview() { paintPreview(document.getElementById('cb-preview')); saveSoon(); }

  // --- автосохранение: блоки сборщика и разбор импорта живут в этом браузере (localStorage), пока их не заменит
  // новый импорт или «Очистить». Сохраняем после каждой перерисовки превью — она идёт после любой правки.
  var SAVE_KEY = 'coral-builder-v1', saveTimer = 0, restored = false;
  function saveSoon() {
    if (!restored) return; // до восстановления не затираем сохранённое пустым состоянием
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ blocks: state.blocks, tz: tzState, importMap: importMap, importSeq: importSeq,
          importTemplate: importTemplate, tzUnlocked: tzUnlocked, gapUnlocked: gapUnlocked }));
      } catch (e) { console.warn('[автосохранение] не удалось сохранить', e); }
    }, 400);
  }
  function restoreSaved() {
    restored = true;
    try {
      var d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!d || !Array.isArray(d.blocks)) return false;
      state.blocks = d.blocks; tzState = d.tz || { result: null, fileName: '' }; importMap = d.importMap || {}; importSeq = d.importSeq || 0;
      tzUnlocked = d.tzUnlocked || {}; gapUnlocked = d.gapUnlocked || {};
      if (pageTemplates.some(function (t) { return t.id === d.importTemplate; })) importTemplate = d.importTemplate;
      return true;
    } catch (e) { console.warn('[автосохранение] сохранённая работа не прочиталась', e); return false; }
  }
  function scrollPreviewToEnd() {
    setTimeout(function () {
      [document.getElementById('cb-preview'), (detached && !detached.closed) ? detached.document.getElementById('dw-preview') : null].forEach(function (f) {
        if (!f) return; try { f.contentWindow.scrollTo({ top: f.contentDocument.body.scrollHeight, behavior: 'smooth' }); } catch (e) {}
      });
    }, 50);
  }
  // прокрутить превью к конкретному блоку (pos: 'end' — к нижнему краю, 'start' — к верхнему)
  // важно: скроллим ТОЛЬКО внутри iframe (contentWindow.scrollTo), а не через el.scrollIntoView —
  // иначе прокрутка «всплывает» на родительскую страницу и панель управления съезжает вниз.
  function scrollPreviewToBlock(i, pos) {
    setTimeout(function () {
      [document.getElementById('cb-preview'), (detached && !detached.closed) ? detached.document.getElementById('dw-preview') : null].forEach(function (f) {
        if (!f) return;
        try {
          var win = f.contentWindow, doc = f.contentDocument;
          var el = doc.querySelector('[data-cb-block="' + i + '"]'); if (!el) return;
          var cur = win.scrollY || doc.documentElement.scrollTop || 0;
          var r = el.getBoundingClientRect();
          var top = (pos === 'end')
            ? cur + r.bottom - win.innerHeight + 40
            : cur + r.top - 12;
          win.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        } catch (e) {}
      });
    }, 50);
  }
  // прокрутить окно «Код» к коду конкретного блока (внутри самого окна, без прокрутки страницы)
  function scrollCodeToBlock(i) {
    setTimeout(function () {
      // основное окно: контейнер #cb-export прокручивается сам
      var main = document.getElementById('cb-export');
      if (main) { var p = main.querySelectorAll('.cb-piece')[i]; if (p) { try { var er = main.getBoundingClientRect(), pr = p.getBoundingClientRect(); main.scrollTo({ top: main.scrollTop + (pr.top - er.top) - 8, behavior: 'smooth' }); } catch (e) {} } }
      // открепленное окно: прокручивается само окно, а не #dw-export
      if (detached && !detached.closed) {
        var ex = detached.document.getElementById('dw-export');
        if (ex) { var pc = ex.querySelectorAll('.cb-piece')[i]; if (pc) { try {
          var win = detached, doc = detached.document;
          var cur = win.scrollY || doc.documentElement.scrollTop || 0;
          var top = cur + pc.getBoundingClientRect().top - 12;
          win.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        } catch (e) {} } }
      }
    }, 30);
  }
  // прокрутить панель управления к блоку (мягко, без резких скачков)
  function scrollPanelToBlock(i) {
    var el = document.querySelector('.cb-block[data-i="' + i + '"]'); if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  // --- связь блок ↔ смысловая секция в Импорте ---
  function sectionOfBlock(i) {
    var b = state.blocks[i]; if (!b || !b._id) return -1;
    for (var s in importMap) { var m = importMap[s]; if (m && m.ids && m.ids.indexOf(b._id) >= 0) return +s; }
    return -1;
  }
  function firstBlockOfSection(secIdx) {
    var m = importMap[secIdx]; if (!m || !m.ids) return -1;
    for (var k = 0; k < m.ids.length; k++) { var idx = impIdx(m.ids[k]); if (idx >= 0) return idx; }
    return -1;
  }
  // подпись смысловой секции (для группировки блоков в сборщике и коде)
  function sectionHeadLabel(si) {
    var secs = tzState.result && tzState.result.sections;
    var sec = secs && secs[si];
    if (sec && typeof tzSecLabel === 'function') { var L = tzSecLabel(sec); if (L && L.title) return L.title; }
    return 'Смысловой блок ' + (si + 1);
  }
  // смысловой блок не обводим для баннера, подводки и раскрывашки (они самодостаточны)
  var NO_GROUP_KIND = { banner: 1, text: 1, faq: 1 };
  // группы подряд идущих блоков одной смысловой секции (из импорта). grouped=true для всех секций, кроме баннера/подводки/раскрывашки
  function blockGroups() {
    var groups = [], i = 0, n = state.blocks.length;
    while (i < n) {
      var si = sectionOfBlock(i);
      if (si >= 0) {
        var j = i; while (j < n && sectionOfBlock(j) === si) j++;
        groups.push({ si: si, start: i, count: j - i, grouped: !NO_GROUP_KIND[state.blocks[i].kind] });
        i = j;
      } else { groups.push({ si: -1, start: i, count: 1, grouped: false }); i++; }
    }
    return groups;
  }
  // индекс части (pj) внутри смысловой секции для блока i (или -1)
  function partOfBlock(i) {
    var b = state.blocks[i]; if (!b || !b._id) return -1;
    var secIdx = sectionOfBlock(i); if (secIdx < 0) return -1;
    var m = importMap[secIdx]; return (m && m.ids) ? m.ids.indexOf(b._id) : -1;
  }
  // прокрутить панель разметки к конкретной части блока (а не ко всей секции) и подсветить её
  function scrollImportToBlock(i, instant) {
    var secIdx = sectionOfBlock(i); if (secIdx < 0) return;
    var host = document.getElementById('tz-result'); if (!host) return;
    var pj = partOfBlock(i);
    var part = pj >= 0 ? host.querySelector('.tz-mk-group[data-sec="' + secIdx + '"][data-part="' + pj + '"]') : null;
    var sec = host.querySelector('.tz-sec[data-sec="' + secIdx + '"]');
    var target = part || sec; if (!target) return;
    // скролл к НАЧАЛУ блока (а не к центру) с поправкой на липкую верхнюю панель
    var tb = document.getElementById('topbar');
    var off = (tb ? tb.getBoundingClientRect().bottom : 70) + 16;
    var top = window.pageYOffset + target.getBoundingClientRect().top - off;
    window.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' });
    [].forEach.call(host.querySelectorAll('.tz-sec-focus, .tz-mk-focus'), function (x) { x.classList.remove('tz-sec-focus'); x.classList.remove('tz-mk-focus'); });
    target.classList.add(part ? 'tz-mk-focus' : 'tz-sec-focus');
    clearTimeout(scrollImportToBlock._t);
    scrollImportToBlock._t = setTimeout(function () { target.classList.remove('tz-mk-focus'); target.classList.remove('tz-sec-focus'); }, 1700);
  }

  // связать три вида: при фокусе на блоке в одном виде — доводим два других к этому же блоку
  function syncFocusBlock(i, origin) {
    if (i < 0) return;
    if (document.body.classList.contains('mode-import')) {
      if (origin !== 'panel') scrollImportToBlock(i); // «panel» в импорте = клик по конкретной части в разметке
      if (origin !== 'preview') scrollPreviewToBlock(i, 'start');
      if (origin !== 'code') scrollCodeToBlock(i);
      return;
    }
    if (origin !== 'panel') scrollPanelToBlock(i);
    if (origin !== 'preview') scrollPreviewToBlock(i, 'start');
    if (origin !== 'code') scrollCodeToBlock(i);
  }

  function pieceHtml(p, i, editable, tint) {
    var cls = 'cb-piece' + (tint != null ? ' c' + tint : '');
    var head = '<div class="cb-piece-head"><span>' + (i + 1) + '. ' + esc(p.label) + '</span><button class="cb-copy" data-piece="' + i + '">Копировать</button></div>';
    if (editable) {
      var rows = Math.min(Math.max(p.code.split('\n').length, 6), 26);
      return '<div class="' + cls + '">' + head + '<textarea class="cb-code cb-codearea" data-piece="' + i + '" rows="' + rows + '" spellcheck="false">' + esc(p.code) + '</textarea></div>';
    }
    return '<div class="' + cls + '">' + head + '<pre class="cb-code"><code>' + esc(p.code) + '</code></pre></div>';
  }
  function exportHtml(editable) {
    if (!state.blocks.length) return '<div class="cb-export-empty">Код появится после добавления блоков</div>';
    var hint = '<div class="cb-code-hint">Код можно править вручную — правки сохранятся, пока вы не измените поля этого блока.</div>';
    var ps = pieces();
    return hint + blockGroups().map(function (g) {
      var items = '';
      // в смысловом блоке части подкрашиваем радужными метками по индексу части; вне группы — без метки
      for (var k = 0; k < g.count; k++) { var i = g.start + k; items += pieceHtml(ps[i], i, editable, g.grouped ? (k % SPLIT_TINTS) : null); }
      if (!g.grouped) return items;
      // смысловой блок выделяем всегда (как в панели управления блоками); кнопка «целиком» — только если частей больше одной
      var copyBtn = g.count > 1 ? '<button class="cb-copygroup" data-copygroup="' + g.si + '">Скопировать блок целиком</button>' : '';
      return '<div class="cb-codegroup">' +
        '<div class="cb-codegroup-head"><span class="cb-codegroup-title">Смысловой блок: ' + esc(sectionHeadLabel(g.si)) + '</span>' + copyBtn + '</div>' +
        items + '</div>';
    }).join('');
  }
  function renderExport() { var h = document.getElementById('cb-export'); if (h) h.innerHTML = exportHtml(true); }
  function refreshOutputs() { updatePreview(); renderExport(); syncDetached(); }
  function refreshAll() { renderBlocks(); refreshOutputs(); }

  // --- поля ---
  function field(label, inner) { return '<label class="cb-field"><span class="cb-lbl">' + esc(label) + '</span>' + inner + '</label>'; }
  function ta(f, val, ph) { return '<textarea data-f="' + f + '" rows="3" placeholder="' + esc(ph || '') + '">' + esc(val) + '</textarea>'; }
  function inp(f, val, ph) { return '<input data-f="' + f + '" value="' + esc(val) + '" placeholder="' + esc(ph || '') + '">'; }
  function levelSel(cur) { var o = ''; for (var i = 1; i <= 5; i++) o += '<option value="' + i + '"' + (i == cur ? ' selected' : '') + '>H' + i + '</option>'; return '<select data-f="level" class="cb-lvl" title="Уровень заголовка">' + o + '</select>'; }
  function headField(label, inner, level, extra) { return '<div class="cb-field"><div class="cb-lbl-row"><span class="cb-lbl">' + esc(label) + '</span><span class="cb-head-ctrls">' + levelSel(level) + (extra || '') + '</span></div>' + inner + '</div>'; }
  // эффективный размер заголовка: h2 → по умолчанию title-1, h3 и ниже (заголовок вне блока) → не крупнее title-2
  function effTitleSize(level, ts) { var lvl = +level || 2, def = lvl >= 3 ? 2 : 1, v = +ts || def; return (lvl >= 3 && v < 2) ? 2 : v; }
  // выпадающий выбор размера заголовка title-min…6; выбран текущий, либо уровень шаблона (def). min — наименьший доступный размер.
  function sizeSelHtml(cur, def, dataAttr, min) {
    min = min || 1; var v = +(cur || def || min); if (v < min) v = min; var o = '';
    for (var k = min; k <= 6; k++) o += '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>title-' + k + '</option>';
    return '<select ' + dataAttr + ' class="cb-sel cb-size-sel" title="Размер заголовка">' + o + '</select>';
  }
  // «замок» + выбор размера заголовка (title-N) — под замком, для опытных. Замок открывает ТОЛЬКО свою строку (по key).
  // cur — текущий размер, def — уровень из шаблона, key — уникальный ключ строки, dataAttr — атрибут select'а, min — минимальный размер (h3+ → 2)
  function titleSizeCtrl(cur, def, key, dataAttr, min) {
    var open = !!sizeUnlocked[key];
    var lock = '<button type="button" class="cb-lock' + (open ? ' is-open' : '') + '" data-act="toggle-size" data-sizekey="' + key + '" title="Размер заголовка (title-1…6) — для опытных">' + (open ? IC.unlock : IC.lock) + '</button>';
    return open ? lock + sizeSelHtml(cur, def, dataAttr || 'data-f="titleSize"', min) : lock;
  }
  function sel(f, cur, opts) { return '<select data-f="' + f + '" class="cb-sel">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  var BODY_HINT = '<div class="cb-fieldhint">Enter — новый абзац, Shift+Enter — перенос строки</div>';
  var BODY_HINT_LIST = '<div class="cb-fieldhint">Enter — новый абзац, Shift+Enter — перенос строки. Строка с «- » в начале — пункт списка.</div>';
  function richField(label, f, val, ph) {
    return '<div class="cb-field"><span class="cb-lbl">' + esc(label) + '</span>' +
      '<div class="cb-textwrap"><textarea data-f="' + f + '" rows="3" placeholder="' + esc(ph || '') + '">' + esc(val) + '</textarea>' +
      '<button type="button" class="cb-linkbtn" title="Обернуть выделенный текст в ссылку">🔗 Ссылка</button></div>' + BODY_HINT + '</div>';
  }
  function cardLevelSel(cur, ci) { var o = '<option value="">П</option>'; for (var i = 1; i <= 5; i++) o += '<option value="' + i + '"' + (String(i) === String(cur) ? ' selected' : '') + '>H' + i + '</option>'; return '<select data-cf="level" data-ci="' + ci + '" class="cb-lvl" title="Тег заголовка карточки">' + o + '</select>'; }
  function panelLevelSel(cur, pi) { var sel = (cur === '') ? '' : (cur || 3); var o = '<option value=""' + (sel === '' ? ' selected' : '') + '>П</option>'; for (var i = 1; i <= 5; i++) o += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>H' + i + '</option>'; return '<select data-pf="level" data-pi="' + pi + '" class="cb-lvl" title="Тег заголовка (П — абзац &lt;p&gt;)">' + o + '</select>'; }
  function insertLink(t) {
    if (!t) return;
    var url = window.prompt('Адрес ссылки (URL):', 'https://'); if (!url) return;
    var s = t.selectionStart || 0, e = t.selectionEnd || 0, v = t.value;
    var selText = v.slice(s, e) || 'текст ссылки';
    var link = '<a href="' + url + '" class="text">' + selText + '</a>';
    t.value = v.slice(0, s) + link + v.slice(e);
    t.dispatchEvent(new Event('input', { bubbles: true }));
    t.focus(); t.selectionStart = t.selectionEnd = s + link.length;
  }

  // стрелки порядка + удаление для под-элементов блока (карточка/плашка/панель/слайд/…), как у смысловых блоков
  function cardTools(arr, idx, delAct, idxAttr) {
    return '<span class="cb-card-tools">' +
      '<button class="cb-icobtn cb-sm" data-mv="' + arr + '" data-mvi="' + idx + '" data-mvd="-1" title="Выше">' + IC.up + '</button>' +
      '<button class="cb-icobtn cb-sm" data-mv="' + arr + '" data-mvi="' + idx + '" data-mvd="1" title="Ниже">' + IC.down + '</button>' +
      '<button class="cb-icobtn cb-sm cb-danger" data-act="' + delAct + '" ' + idxAttr + '="' + idx + '" title="Удалить">' + IC.close + '</button></span>';
  }
  function cardEditor(c, ci) {
    return '<div class="cb-card" data-ci="' + ci + '">' +
      '<div class="cb-card-head"><span>Карточка ' + (ci + 1) + '</span>' + cardTools('cards', ci, 'del-card', 'data-ci') + '</div>' +
      '<div class="cb-field"><div class="cb-lbl-row"><span class="cb-lbl">Заголовок</span>' + cardLevelSel(c.level, ci) + '</div><input data-cf="title" data-ci="' + ci + '" value="' + esc(c.title) + '"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Текст</span><div class="cb-textwrap"><textarea data-cf="text" data-ci="' + ci + '" rows="2">' + esc(c.text) + '</textarea><button type="button" class="cb-linkbtn">🔗 Ссылка</button></div>' + BODY_HINT + '</div>' +
      field('Картинка (URL)', '<input data-cf="img" data-ci="' + ci + '" value="' + esc(c.img) + '">') + '</div>';
  }
  // редактор одной плашки — поля зависят от семейства
  function gridCardEditor(fam) {
    return function (c, ci) {
      var head = '<div class="cb-card-head"><span>Плашка ' + (ci + 1) + '</span>' + cardTools('cards', ci, 'del-card', 'data-ci') + '</div>';
      var fields = '';
      if (fam === 'b06') fields += '<div class="cb-field"><span class="cb-lbl">Плашка (бейдж)</span><input data-cf="badge" data-ci="' + ci + '" value="' + esc(c.badge) + '"></div>' +
        '<div class="cb-field"><span class="cb-lbl">Цена</span><input data-cf="price" data-ci="' + ci + '" value="' + esc(c.price) + '"></div>';
      if (fam === 'b07') fields += '<div class="cb-field"><span class="cb-lbl">Иконка (по умолчанию ✓)</span><input data-cf="icon" data-ci="' + ci + '" value="' + esc(c.icon) + '" placeholder="✓"></div>';
      if (fam === 'b10') {
        var isImg = /^<(svg|img)\b/i.test((c.icon || '').trim());
        var prev = isImg ? '<span class="cb-icon-prev" title="Текущая иконка">' + c.icon + '</span>' : '';
        var resetBtn = isImg ? '<button type="button" class="cb-icon-reset" data-act="reset-icon" data-ci="' + ci + '" title="Вернуть иконку из шаблона">Очистить</button>' : '';
        fields += '<div class="cb-field"><span class="cb-lbl">Иконка</span>' +
          '<div class="cb-icon-row">' + prev +
          '<label class="cb-upload-btn">' + (isImg ? 'Заменить файл' : 'Загрузить SVG/картинку') + '<input type="file" accept=".svg,image/*" class="cb-icon-file" data-ci="' + ci + '" hidden></label>' + resetBtn + '</div>' +
          '<textarea data-cf="icon" data-ci="' + ci + '" rows="2" placeholder="📍 эмодзи, или вставьте SVG-код, или загрузите файл выше">' + esc(c.icon) + '</textarea>' +
          '<div class="cb-fieldhint">Проще всего: нажмите «Загрузить SVG/картинку» и выберите файл. Или впишите эмодзи. Поле выше — для тонкой правки кода иконки.</div></div>';
      }
      if (fam !== 'b11') fields += '<div class="cb-field"><span class="cb-lbl">Заголовок</span><input data-cf="title" data-ci="' + ci + '" value="' + esc(c.title) + '"></div>';
      fields += '<div class="cb-field"><span class="cb-lbl">Текст</span><div class="cb-textwrap"><textarea data-cf="text" data-ci="' + ci + '" rows="2">' + esc(c.text) + '</textarea><button type="button" class="cb-linkbtn">🔗 Ссылка</button></div>' + BODY_HINT + '</div>';
      return '<div class="cb-card" data-ci="' + ci + '">' + head + fields + '</div>';
    };
  }
  function panelEditor(it, pi, uid, noImg) {
    return '<div class="cb-card" data-pi="' + pi + '">' +
      '<div class="cb-card-head"><span>' + (noImg ? 'Блок' : 'Текст с картинкой') + ' ' + (pi + 1) + '</span>' + cardTools('panels', pi, 'del-panel', 'data-pi') + '</div>' +
      '<div class="cb-field"><div class="cb-lbl-row"><span class="cb-lbl">Заголовок (необязательно)</span><span class="cb-head-ctrls">' + panelLevelSel(it.level, pi) + titleSizeCtrl(it.titleSize, 5, uid + ':p' + pi, 'data-pf="titleSize" data-pi="' + pi + '"') + '</span></div><input data-pf="heading" data-pi="' + pi + '" value="' + esc(it.heading) + '"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Текст</span><div class="cb-textwrap"><textarea data-pf="paragraphs" data-pi="' + pi + '" rows="3">' + esc(serializePanelBlocks(it.paragraphs)) + '</textarea><button type="button" class="cb-linkbtn">🔗 Ссылка</button></div>' + BODY_HINT_LIST + '</div>' +
      '<div class="cb-grid2">' +
        field('Текст кнопки', '<input data-pf="btnText" data-pi="' + pi + '" value="' + esc(it.btnText || '') + '" placeholder="' + esc(CA.CTA_TEXT) + '">') +
        field('Ссылка кнопки', '<input data-pf="btnHref" data-pi="' + pi + '" value="' + esc(it.btnHref || '') + '" placeholder="https://www.coral.ru/hotels/">') +
      '</div>' +
      (noImg ? '' : field('Картинка (URL)', '<input data-pf="img" data-pi="' + pi + '" value="' + esc(it.img) + '">')) + '</div>';
  }
  function slideEditor(sl, si) {
    return '<div class="cb-card" data-si="' + si + '">' +
      '<div class="cb-card-head"><span>Слайд ' + (si + 1) + '</span>' + cardTools('slides', si, 'del-slide', 'data-si') + '</div>' +
      '<div class="cb-field"><span class="cb-lbl">Заголовок слайда</span><input data-sf="title" data-si="' + si + '" value="' + esc(sl.title) + '"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Текст</span><div class="cb-textwrap"><textarea data-sf="text" data-si="' + si + '" rows="3">' + esc(sl.text) + '</textarea><button type="button" class="cb-linkbtn">🔗 Ссылка</button></div>' + BODY_HINT + '</div>' +
      field('Картинка (URL)', '<input data-sf="img" data-si="' + si + '" value="' + esc(sl.img) + '">') + '</div>';
  }
  function tableEditor(s) {
    var header = s.header || [], rows = s.rows || [], nc = header.length;
    var thRow = '<tr>' + header.map(function (h, ci) {
      return '<th><input data-th data-ci="' + ci + '" value="' + esc(h) + '" placeholder="Заголовок"><button type="button" class="cb-tbl-x" data-act="del-col" data-ci="' + ci + '" title="Удалить столбец">' + IC.close + '</button></th>';
    }).join('') + '<th class="cb-tbl-addcol"><button type="button" class="cb-tbl-add" data-act="add-col" title="Добавить столбец">＋</button></th></tr>';
    var body = rows.map(function (r, ri) {
      var cells = header.map(function (_, ci) { return '<td><textarea data-td data-ri="' + ri + '" data-ci="' + ci + '" rows="2">' + esc((r && r[ci]) || '') + '</textarea></td>'; }).join('');
      return '<tr>' + cells + '<td class="cb-tbl-rowx"><button type="button" class="cb-tbl-x" data-act="del-row" data-ri="' + ri + '" title="Удалить строку">' + IC.close + '</button></td></tr>';
    }).join('');
    var addRow = '<tr><td class="cb-tbl-addrow" colspan="' + (nc + 1) + '"><button type="button" class="cb-tbl-add" data-act="add-row">＋ строка</button></td></tr>';
    return '<div class="cb-field"><span class="cb-lbl">Таблица</span>' +
      '<div class="cb-tbl-wrap"><table class="cb-tbl-grid"><thead>' + thRow + '</thead><tbody>' + body + addRow + '</tbody></table></div>' +
      '<div class="cb-fieldhint">Верхняя строка — шапка таблицы. Enter в ячейке — перенос строки (&lt;br&gt;).</div></div>';
  }
  function faqEditor(it, qi) {
    return '<div class="cb-card" data-qi="' + qi + '">' +
      '<div class="cb-card-head"><span>Вопрос ' + (qi + 1) + '</span>' + cardTools('items', qi, 'del-faq', 'data-qi') + '</div>' +
      '<div class="cb-field"><span class="cb-lbl">Вопрос</span><input data-qf="q" data-qi="' + qi + '" value="' + esc(it.q) + '"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Ответ</span><div class="cb-textwrap"><textarea data-qf="a" data-qi="' + qi + '" rows="3">' + esc(it.a) + '</textarea><button type="button" class="cb-linkbtn">🔗 Ссылка</button></div>' + BODY_HINT + '</div></div>';
  }
  function contactEditor(bl, bi) {
    return '<div class="cb-card" data-coni="' + bi + '">' +
      '<div class="cb-card-head"><span>Контакт ' + (bi + 1) + '</span></div>' +
      '<div class="cb-field"><span class="cb-lbl">Телефон</span><input data-conf="tel" data-coni="' + bi + '" value="' + esc(bl.tel) + '"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Подпись</span><textarea data-conf="text" data-coni="' + bi + '" rows="2">' + esc(bl.text) + '</textarea></div></div>';
  }
  // b16 Табы — редактор одной вкладки. Содержимое: текст / «Текст с картинкой» / «Текстовый блок».
  function tabEditor(t, ti) {
    var type = t.type || 'text';
    function opt(v, l) { return '<option value="' + v + '"' + (v === type ? ' selected' : '') + '>' + l + '</option>'; }
    var typeSel = '<div class="cb-field"><span class="cb-lbl">Содержимое вкладки</span>' +
      '<select data-tf="type" data-ti="' + ti + '" class="cb-sel">' + opt('text', 'Текст') + opt('panel', 'Текст с картинкой') + opt('textpanel', 'Текстовый блок') + '</select></div>';
    var tlvl = t.level || 2, lvlSel = '<select data-tf="level" data-ti="' + ti + '" class="cb-lvl" title="Уровень заголовка">';
    for (var L = 2; L <= 5; L++) lvlSel += '<option value="' + L + '"' + (String(L) === String(tlvl) ? ' selected' : '') + '>H' + L + '</option>';
    lvlSel += '</select>';
    var headRow = '<div class="cb-field"><div class="cb-lbl-row"><span class="cb-lbl">Заголовок (необязательно)</span><span class="cb-head-ctrls">' + lvlSel + '</span></div><input data-tf="heading" data-ti="' + ti + '" value="' + esc(t.heading || '') + '" placeholder="Обычно пусто"></div>';
    var textRow = '<div class="cb-field"><span class="cb-lbl">Текст</span><div class="cb-textwrap"><textarea data-tf="content" data-ti="' + ti + '" rows="4">' + esc(t.content) + '</textarea><button type="button" class="cb-linkbtn">🔗 Ссылка</button></div>' + BODY_HINT + '</div>';
    var body;
    if (type === 'panel') {
      var rev = '<select data-tf="reverse" data-ti="' + ti + '" class="cb-sel"><option value="0"' + (t.reverse ? '' : ' selected') + '>Справа</option><option value="1"' + (t.reverse ? ' selected' : '') + '>Слева</option></select>';
      body = '<div class="cb-field"><span class="cb-lbl">Картинка</span>' + rev + '</div>' + headRow + textRow +
        field('Картинка (URL)', '<input data-tf="img" data-ti="' + ti + '" value="' + esc(t.img || '') + '">');
    } else if (type === 'textpanel') {
      body = headRow + textRow;
    } else {
      body = '<div class="cb-field"><span class="cb-lbl">Содержимое</span><div class="cb-textwrap"><textarea data-tf="content" data-ti="' + ti + '" rows="4" placeholder="Текст вкладки…">' + esc(t.content) + '</textarea><button type="button" class="cb-linkbtn">🔗 Ссылка</button></div>' + BODY_HINT + '</div>';
    }
    return '<div class="cb-card" data-ti="' + ti + '">' +
      '<div class="cb-card-head"><span>Вкладка ' + (ti + 1) + '</span>' + cardTools('tabs', ti, 'del-tab', 'data-ti') + '</div>' +
      '<div class="cb-field"><span class="cb-lbl">Название вкладки</span><input data-tf="label" data-ti="' + ti + '" value="' + esc(t.label) + '" placeholder="Напр., Пляжи"></div>' +
      typeSel + body + '</div>';
  }
  // b18 Климат — редактор одного сезона (название + температуры день/вечер и вода)
  function seasonEditor(sn, wi) {
    return '<div class="cb-card" data-wi="' + wi + '">' +
      '<div class="cb-card-head"><span>Сезон ' + (wi + 1) + '</span>' + cardTools('seasons', wi, 'del-season', 'data-wi') + '</div>' +
      '<div class="cb-field"><span class="cb-lbl">Название сезона</span><input data-wf="title" data-wi="' + wi + '" value="' + esc(sn.title) + '" placeholder="Напр., Лето"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Температура воздуха (☀)</span><input data-wf="day" data-wi="' + wi + '" value="' + esc(sn.day) + '" placeholder="Днём до +33°C, вечером до +29°C"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Температура воды (🌊)</span><input data-wf="water" data-wi="' + wi + '" value="' + esc(sn.water) + '" placeholder="До +25°C"></div></div>';
  }
  // b20 SEO-ссылки — редактор одной колонки (заголовок + список ссылок)
  function seoColEditor(cl, oci) {
    var links = (cl.links || []).map(function (l, oli) {
      return '<div class="cb-card cb-seo-link" data-oli="' + oli + '">' +
        '<div class="cb-card-head"><span>Ссылка ' + (oli + 1) + '</span><button class="cb-icobtn cb-sm cb-danger" data-act="del-seolink" data-oci="' + oci + '" data-oli="' + oli + '" title="Удалить">' + IC.close + '</button></div>' +
        '<div class="cb-field"><span class="cb-lbl">Текст ссылки</span><input data-olf="text" data-oci="' + oci + '" data-oli="' + oli + '" value="' + esc(l.text) + '" placeholder="Напр., Анталья"></div>' +
        '<div class="cb-field"><span class="cb-lbl">Адрес (URL)</span><input data-olf="href" data-oci="' + oci + '" data-oli="' + oli + '" value="' + esc(l.href) + '" placeholder="/main/turkey/antalya/"></div></div>';
    }).join('');
    return '<div class="cb-card" data-oci="' + oci + '">' +
      '<div class="cb-card-head"><span>Колонка ' + (oci + 1) + '</span>' + cardTools('columns', oci, 'del-seocol', 'data-oci') + '</div>' +
      '<div class="cb-field"><span class="cb-lbl">Заголовок колонки</span><input data-ocf="title" data-oci="' + oci + '" value="' + esc(cl.title) + '" placeholder="Напр., Курорты Турции"></div>' +
      '<div class="cb-cards cb-seo-links">' + links + '<button class="cb-add-card" data-act="add-seolink" data-oci="' + oci + '">+ ссылка</button></div></div>';
  }
  // b21 Рейтинг отелей — редактор одного отеля (номер + название + ссылка + описание + картинка)
  function hotelEditor(h, hi) {
    return '<div class="cb-card" data-hi="' + hi + '">' +
      '<div class="cb-card-head"><span>Отель ' + (hi + 1) + '</span>' + cardTools('hotels', hi, 'del-hotel', 'data-hi') + '</div>' +
      '<div class="cb-field"><span class="cb-lbl">Номер в рейтинге</span><input data-hf="rank" data-hi="' + hi + '" value="' + esc(h.rank) + '" placeholder="Напр., 7."></div>' +
      '<div class="cb-field"><span class="cb-lbl">Название отеля</span><input data-hf="name" data-hi="' + hi + '" value="' + esc(h.name) + '" placeholder="Напр., AROMA BEACH RESORT"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Ссылка на отель (URL)</span><input data-hf="href" data-hi="' + hi + '" value="' + esc(h.href) + '" placeholder="https://www.coral.ru/hotels/…"></div>' +
      '<div class="cb-field"><span class="cb-lbl">Описание</span><div class="cb-textwrap"><textarea data-hf="paragraphs" data-hi="' + hi + '" rows="4">' + esc((h.paragraphs || []).join('\n\n')) + '</textarea><button type="button" class="cb-linkbtn">🔗 Ссылка</button></div>' + BODY_HINT + '</div>' +
      field('Картинка (URL)', '<input data-hf="img" data-hi="' + hi + '" value="' + esc(h.img) + '">') + '</div>';
  }
  function listBlock(title, itemsHtml, addAct, addLabel) {
    return '<div class="cb-cards"><div class="cb-lbl cb-cards-h">' + esc(title) + '</div>' + itemsHtml + '<button class="cb-add-card" data-act="' + addAct + '">' + esc(addLabel) + '</button></div>';
  }
  function tailFields(s, kind) {
    // у баннера, подводки и контактов навигационных полей нет — меню на них не ссылается
    var noNav = kind === 'banner' || kind === 'text' || kind === 'contacts';
    var noAfter = kind === 'banner' || kind === 'text'; // баннеру и подводке «текст под блоком» ни к чему
    return '<div class="cb-tail">' +
      (noAfter ? '' : richField('Текст под блоком (необязательно)', 'afterText', s.afterText, 'Абзац текста под блоком…')) +
      (noNav ? '' :
        field('Название в навигации (необязательно)', inp('navLabel', s.navLabel, 'Напр., Отели'))) +
      '</div>';
  }

  function blockShell(b, i, inner, tint) {
    return '<div class="cb-block' + (tint != null ? ' c' + tint : '') + '" data-i="' + i + '">' +
      '<div class="cb-block-head"><span class="cb-block-num">' + (i + 1) + '</span>' +
        '<span class="cb-block-name">' + esc(blockName(b)) + '</span>' +
        '<span class="cb-block-tools"><button class="cb-icobtn" data-act="up" title="Выше">' + IC.up + '</button>' +
        '<button class="cb-icobtn" data-act="down" title="Ниже">' + IC.down + '</button>' +
        '<button class="cb-icobtn cb-danger" data-act="del" title="Удалить блок">' + IC.del + '</button></span></div>' +
      '<div class="cb-block-body">' + inner + '</div></div>';
  }

  function blockEditor(b, i, tint) {
    var s = b.slots, inner = '', uid = blockUid(b);
    function tsc(def) { return titleSizeCtrl(s.titleSize, def, uid + ':main', 'data-f="titleSize"', (+s.level >= 3 ? 2 : 1)); }
    if (b.kind === 'nav') {
      var items = navData().items;
      var list = items.length ? items.map(function (it) { return '<span class="cb-navchip">' + esc(it.label) + '</span>'; }).join('') : '<span class="cb-navempty">Пока пусто — заполните «Название в навигации» в других блоках.</span>';
      inner = '<div class="cb-navinfo">Навигация собирается автоматически из блоков, где заполнено «Название в навигации», по порядку их расположения. Обычно ставится вверху страницы.</div><div class="cb-navlist">' + list + '</div>';
      return blockShell(b, i, inner, tint);
    }
    if (b.kind === 'banner') {
      inner = headField('Заголовок (Shift+Enter — перенос строки)', ta('title', s.title, '7 причин провести день…'), s.level) +
        field('Подзаголовок (необязательно)', ta('subtitle', s.subtitle, 'Текст подзаголовка')) +
        field('Текст кнопки (пусто — без кнопки)', inp('button', s.button, 'Выбрать тур')) +
        field('Ссылка кнопки (якорь)', inp('href', s.href, '#hotels')) +
        field('Локация — плашка в углу баннера (пусто — без плашки)', inp('location', s.location, 'Бодрум, Мугла, Турция')) +
        field('Картинка для компьютера (URL)', inp('imgDesktop', s.imgDesktop)) +
        field('Картинка для телефона (URL)', inp('imgMobile', s.imgMobile));
    } else if (b.kind === 'cards') {
      var cv = s.cardsVariant || 'b05_0';
      inner = '<div class="cb-field"><span class="cb-lbl">Шаблон</span>' + sel('cardsVariant', cv, [['b05_0', 'Без картинки'], ['b05_1', 'С картинкой · заголовок над блоком'], ['b05_2', 'С картинкой · заголовок внутри блока']]) + '</div>';
      if (cv === 'b05_0') inner += headField('Заголовок', inp('title', s.title), s.level, tsc(1)) + richField('Вводный абзац (необязательно)', 'intro', s.intro);
      else inner += '<div class="cb-field"><span class="cb-lbl">Картинка</span>' + sel('reverse', s.reverse ? 1 : 0, [[0, 'Справа'], [1, 'Слева']]) + '</div>' +
        headField('Заголовок панели', inp('heading', s.heading), s.level, tsc(cv === 'b05_2' ? 2 : 1)) +
        (cv === 'b05_1' ? richField('Вводный абзац (необязательно)', 'intro', s.intro) : '') +
        richField('Текст панели', 'paragraphs', (s.paragraphs || []).join('\n\n')) +
        field('Картинка панели (URL)', inp('img', s.img));
      inner += listBlock('Карточки', s.cards.map(cardEditor).join(''), 'add-card', '+ карточка');
    } else if (b.kind === 'grid') {
      var fam = s.family || 'b07', gv = s.gridVariant || '0';
      inner = '<div class="cb-field"><span class="cb-lbl">Тип плашки</span>' + sel('family', fam, GRID_FAMILIES) + '</div>';
      if (fam !== 'b11') inner += '<div class="cb-field"><span class="cb-lbl">Шаблон</span>' + sel('gridVariant', gv, [['0', 'Без картинки'], ['1', 'С картинкой · заголовок над блоком'], ['2', 'С картинкой · заголовок внутри блока']]) + '</div>';
      else gv = '0';
      if (gv === '0') inner += headField('Заголовок', inp('title', s.title), s.level, tsc(1)) + richField('Вводный абзац (необязательно)', 'intro', s.intro);
      else inner += '<div class="cb-field"><span class="cb-lbl">Картинка</span>' + sel('reverse', s.reverse ? 1 : 0, [[0, 'Справа'], [1, 'Слева']]) + '</div>' +
        headField('Заголовок панели', inp('heading', s.heading), s.level, tsc(gv === '2' ? 2 : 1)) +
        richField('Текст панели', 'paragraphs', (s.paragraphs || []).join('\n\n')) +
        field('Картинка панели (URL)', inp('img', s.img));
      inner += listBlock('Плашки', s.cards.map(gridCardEditor(fam)).join(''), 'add-gcard', '+ плашка');
    } else if (b.kind === 'slider') {
      var slv = s.sliderVariant || '0';
      inner = '<div class="cb-field"><span class="cb-lbl">Шаблон</span>' + sel('sliderVariant', slv, [['0', 'Без картинки'], ['1', 'С картинкой · заголовок над блоком'], ['2', 'С картинкой · заголовок внутри блока']]) + '</div>';
      if (slv === '0') inner += headField('Заголовок', inp('title', s.title), s.level, tsc(1)) + richField('Вводный абзац (необязательно)', 'intro', s.intro);
      else inner += '<div class="cb-field"><span class="cb-lbl">Картинка</span>' + sel('reverse', s.reverse ? 1 : 0, [[0, 'Справа'], [1, 'Слева']]) + '</div>' +
        headField('Заголовок панели', inp('heading', s.heading), s.level, tsc(slv === '2' ? 2 : 1)) +
        richField('Текст панели', 'paragraphs', (s.paragraphs || []).join('\n\n')) +
        field('Картинка панели (URL)', inp('img', s.img));
      inner += '<div class="cb-field"><span class="cb-lbl">Сколько карточек видно за раз</span><input type="number" min="1" max="6" data-f="perView" value="' + esc(s.perView || 3) + '" class="cb-num"></div>';
      inner += listBlock('Слайды', s.slides.map(slideEditor).join(''), 'add-slide', '+ слайд');
    } else if (b.kind === 'textpanel') {
      inner = headField('Заголовок над блоком (необязательно)', inp('heading', s.heading), s.level, tsc(1)) +
        richField('Вводный абзац (необязательно)', 'intro', s.intro) +
        listBlock('Тексты (каждый со своим заголовком)', s.panels.map(function (it, pi) { return panelEditor(it, pi, uid, true); }).join(''), 'add-panel', '+ блок текста');
    } else if (b.kind === 'text') {
      inner = richField('Текст (абзацы)', 'paragraphs', (s.paragraphs || []).join('\n\n'));
    } else if (b.kind === 'faq') {
      inner = headField('Заголовок', inp('title', s.title), s.level, tsc(1)) +
        richField('Вводный абзац (необязательно)', 'intro', s.intro) +
        listBlock('Вопросы и ответы', s.items.map(faqEditor).join(''), 'add-faq', '+ вопрос');
    } else if (b.kind === 'table') {
      inner = headField('Заголовок (необязательно)', inp('title', s.title), s.level, tsc(1)) +
        richField('Вводный абзац (необязательно)', 'intro', s.intro) +
        tableEditor(s);
    } else if (b.kind === 'contacts') {
      inner = headField('Заголовок', inp('title', s.title), s.level) +
        '<div class="cb-cards"><div class="cb-lbl cb-cards-h">Контакты (телефоны)</div>' + s.blocks.map(contactEditor).join('') + '</div>';
    } else if (b.kind === 'bigimage') {
      inner = field('Заголовок секции над карточкой (необязательно)', inp('secTitle', s.secTitle, 'Обычно пусто')) +
        richField('Вводный абзац над карточкой (необязательно)', 'secIntro', s.secIntro) +
        headField('Заголовок (Shift+Enter — перенос строки)', ta('title', s.title, 'Заголовок'), s.level) +
        richField('Текст', 'paragraphs', (s.paragraphs || []).join('\n\n')) +
        field('Текст кнопки (пусто — без кнопки)', inp('button', s.button, 'Забронировать тур')) +
        field('Ссылка кнопки', inp('href', s.href, '#hotels')) +
        field('Фон для компьютера (URL)', inp('bg', s.bg)) +
        field('Фон для телефона (URL)', inp('bgMobile', s.bgMobile));
    } else if (b.kind === 'tabs') {
      inner = headField('Заголовок (необязательно)', inp('title', s.title, 'Напр., Интересные места'), s.level) +
        listBlock('Вкладки', s.tabs.map(tabEditor).join(''), 'add-tab', '+ вкладка');
    } else if (b.kind === 'climate') {
      inner = headField('Заголовок', inp('heading', s.heading, 'Климат'), s.level) +
        richField('Вводный текст (необязательно)', 'intro', s.intro, 'Описание климата региона…') +
        listBlock('Сезоны', s.seasons.map(seasonEditor).join(''), 'add-season', '+ сезон');
    } else if (b.kind === 'seolinks') {
      inner = headField('Заголовок (необязательно)', inp('title', s.title, 'Напр., Полезные ссылки'), s.level) +
        listBlock('Колонки ссылок', s.columns.map(seoColEditor).join(''), 'add-seocol', '+ колонка');
    } else if (b.kind === 'hotels') {
      inner = field('Заголовок секции (необязательно)', inp('title', s.title, 'Напр., Популярные отели')) +
        richField('Вводный абзац (необязательно)', 'intro', s.intro) +
        '<div class="cb-field"><span class="cb-lbl">Картинка первого отеля</span>' + sel('reverse', s.reverse ? 1 : 0, [[0, 'Справа'], [1, 'Слева']]) + '</div>' +
        listBlock('Отели (по убыванию рейтинга)', (s.hotels || []).map(hotelEditor).join(''), 'add-hotel', '+ отель');
    } else if (b.kind === 'tplraw') {
      inner = '<div class="cb-tplinfo">Фикс-блок шаблона — вставляется как есть. Чтобы изменить его код, отредактируйте файл шаблона в папке проекта:' +
        '<code class="cb-tplfile">data/' + esc(s.file || '') + '</code></div>';
      return blockShell(b, i, inner, tint); // без «хвоста» (отступ/навигация/текст под блоком) — блок цельный
    } else { // panel (multi)
      inner = '<div class="cb-field"><span class="cb-lbl">Картинка первого блока</span>' + sel('reverse', s.reverse ? 1 : 0, [[0, 'Справа'], [1, 'Слева']]) + '</div>' +
        headField('Заголовок над блоком (необязательно)', inp('heading', s.heading), s.level, tsc(1)) +
        richField('Вводный абзац (необязательно)', 'intro', s.intro) +
        listBlock('Тексты с картинкой (чередуются сторонами)', s.panels.map(function (it, pi) { return panelEditor(it, pi, uid); }).join(''), 'add-panel', '+ текст с картинкой');
    }
    inner += tailFields(s, b.kind);
    return blockShell(b, i, inner, tint);
  }

  function renderBlocks() {
    var host = document.getElementById('cb-blocks');
    if (!state.blocks.length) { host.innerHTML = '<div class="cb-empty">Пока пусто. Добавьте блок из меню слева.</div>'; return; }
    host.innerHTML = blockGroups().map(function (g) {
      var inner = '';
      // части смыслового блока — радужными метками по индексу части; вне группы — без метки
      for (var k = 0; k < g.count; k++) inner += blockEditor(state.blocks[g.start + k], g.start + k, g.grouped ? (k % SPLIT_TINTS) : null);
      if (!g.grouped) return inner;
      return '<div class="cb-group">' +
        '<div class="cb-group-head"><span class="cb-group-tag">Смысловой блок</span>' +
        '<span class="cb-group-title">' + esc(sectionHeadLabel(g.si)) + '</span>' +
        (g.count > 1 ? '<span class="cb-group-count">' + g.count + ' ч.</span>' : '') + '</div>' +
        inner + '</div>';
    }).join('');
  }
  // обновить список пунктов в карточке «Навигация» без перерисовки полей (сохраняет фокус)
  function updateNavCard() {
    var idx = -1; state.blocks.forEach(function (b, i) { if (b.kind === 'nav') idx = i; });
    if (idx < 0) return;
    var el = document.querySelector('.cb-block[data-i="' + idx + '"] .cb-navlist');
    if (!el) return;
    var items = navData().items;
    el.innerHTML = items.length ? items.map(function (it) { return '<span class="cb-navchip">' + esc(it.label) + '</span>'; }).join('') : '<span class="cb-navempty">Пока пусто — заполните «Название в навигации» в других блоках.</span>';
  }

  // сторона картинки последней панели блока «Текст с картинкой» (панели внутри чередуются)
  function lastPanelSide(b) { var n = (b.slots.panels || []).length || 1; var first = !!b.slots.reverse; return ((n - 1) % 2 === 0) ? first : !first; }
  // сторона картинки блока (true — слева/reverse); null — у блока нет картинки
  function blockImageSide(b) {
    if (b.kind === 'panel') return lastPanelSide(b);
    if (b.kind === 'cards') { var v = b.slots.cardsVariant; return (v === 'b05_1' || v === 'b05_2') ? !!b.slots.reverse : null; }
    if (b.kind === 'grid') { var gv = b.slots.gridVariant; return (gv === '1' || gv === '2') ? !!b.slots.reverse : null; }
    return null;
  }
  // сторона картинки для нового/переключаемого блока на позиции pos — противоположная ближайшему выше блоку с картинкой (любого типа)
  function nextReverse(pos) {
    for (var i = Math.min(pos, state.blocks.length) - 1; i >= 0; i--) {
      var side = blockImageSide(state.blocks[i]);
      if (side !== null) return !side;
    }
    return false; // первая картинка на странице — справа
  }
  function nextPanelReverse(pos) { return nextReverse(pos); }
  // задать сторону картинки блоку (для панели — сторона первого внутреннего блока)
  function setBlockImageSide(b, side) { if (blockImageSide(b) !== null) b.slots.reverse = !!side; }
  // пересчитать стороны картинок всех блоков НИЖЕ anchorIdx: строгое чередование, продолжая от последней картинки на/до anchorIdx (сам anchor не трогаем)
  function alternateFrom(anchorIdx) {
    var prevEnd = null;
    for (var i = 0; i < state.blocks.length; i++) {
      var b = state.blocks[i], side = blockImageSide(b);
      if (side === null) continue;
      if (i <= anchorIdx) { prevEnd = side; continue; }
      setBlockImageSide(b, prevEnd === null ? false : !prevEnd);
      prevEnd = blockImageSide(b);
    }
  }
  // полный пересчёт «шахматного» чередования по всей странице; сторона первого блока с картинкой сохраняется как якорь
  function relayoutImages() {
    for (var i = 0; i < state.blocks.length; i++) if (blockImageSide(state.blocks[i]) !== null) { alternateFrom(i); return; }
  }

  function addBlock(kind) {
    var blk = { kind: kind, slots: defaults(kind) };
    if (kind === 'nav') {
      // навигация всегда встаёт сразу после баннера (или в самый верх, если баннера нет)
      var pos = 0;
      for (var i = 0; i < state.blocks.length; i++) if (state.blocks[i].kind === 'banner') pos = i + 1;
      state.blocks.splice(pos, 0, blk); relayoutImages(); refreshAll(); scrollPreviewToBlock(pos, 'start');
    } else {
      state.blocks.push(blk); relayoutImages(); refreshAll(); scrollPreviewToEnd();
    }
  }
  // ближайший прокручиваемый родитель элемента
  function scrollParent(el) {
    for (var p = el && el.parentElement; p; p = p.parentElement) {
      var ov = getComputedStyle(p).overflowY;
      if ((ov === 'auto' || ov === 'scroll') && p.scrollHeight > p.clientHeight) return p;
    }
    return document.scrollingElement || document.documentElement;
  }
  function move(i, d) {
    var j = i + d; if (j < 0 || j >= state.blocks.length) return;
    // запоминаем экранную позицию перемещаемого блока, чтобы он остался под курсором
    var card = document.querySelector('.cb-block[data-i="' + i + '"]');
    var sc = card ? scrollParent(card) : null;
    var prevTop = card ? card.getBoundingClientRect().top : 0;
    var t = state.blocks[i]; state.blocks[i] = state.blocks[j]; state.blocks[j] = t;
    relayoutImages();
    refreshAll();
    var nc = document.querySelector('.cb-block[data-i="' + j + '"]');
    if (nc && sc) { var delta = nc.getBoundingClientRect().top - prevTop; if (delta) sc.scrollTop += delta; }
    // фокус остаётся на той же стрелке — повторные клики продолжают двигать блок
    if (nc) { var btn = nc.querySelector('[data-act="' + (d > 0 ? 'down' : 'up') + '"]'); if (btn) try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }
    // подсветка в превью/коде следует за блоком
    scrollPreviewToBlock(j, 'start');
  }
  function del(i) { state.blocks.splice(i, 1); relayoutImages(); refreshAll(); }
  function blockIndexOf(node) { var b = node.closest('.cb-block'); return b ? +b.dataset.i : -1; }

  function applyCodeEdit(pi, val, fromPopup) {
    if (!state.blocks[pi]) return;
    state.blocks[pi].override = val;
    updatePreview();
    if (detached && !detached.closed) paintPreview(detached.document.getElementById('dw-preview'));
    if (fromPopup) renderExport();
    else if (detached && !detached.closed) { var ex = detached.document.getElementById('dw-export'); if (ex) ex.innerHTML = exportHtml(true); }
  }

  // текстовые поля с абзацами: Enter — новый абзац, Shift+Enter — перенос строки (<br>)
  function isBodyArea(t) {
    return t && t.tagName === 'TEXTAREA' && (
      t.dataset.cf === 'text' || t.dataset.pf === 'paragraphs' || t.dataset.qf === 'a' || t.dataset.sf === 'text' ||
      t.dataset.tf === 'content' ||
      t.dataset.f === 'intro' || t.dataset.f === 'afterText' || t.dataset.f === 'paragraphs');
  }
  // код в окнах Превью/Код редактируется как в редакторе: Tab — отступ, Shift+Tab — убрать отступ (в т.ч. по выделению)
  function isCodeArea(t) { return !!(t && t.tagName === 'TEXTAREA' && (t.classList.contains('cb-codearea') || t.classList.contains('cb-code'))); }
  function handleCodeTab(t, shift) {
    var UNIT = '\t', v = t.value, s = t.selectionStart, en = t.selectionEnd;
    if (s === en && !shift) { // простая вставка табуляции по курсору
      t.value = v.slice(0, s) + UNIT + v.slice(en);
      t.selectionStart = t.selectionEnd = s + UNIT.length;
    } else { // отступ/вычет отступа по строкам выделения (или по текущей строке)
      var ls = v.lastIndexOf('\n', s - 1) + 1;
      var seg = v.slice(ls, en), lines = seg.split('\n');
      var firstDelta = 0, total = 0;
      var out = lines.map(function (line, i) {
        if (shift) {
          var m = line.match(/^(\t| {1,4})/);
          var cut = m ? m[0].length : 0;
          if (i === 0) firstDelta = -cut; total -= cut;
          return cut ? line.slice(cut) : line;
        }
        if (line === '' && lines.length > 1 && i === lines.length - 1) return line; // пустую хвостовую строку не трогаем
        if (i === 0) firstDelta = UNIT.length; total += UNIT.length;
        return UNIT + line;
      });
      t.value = v.slice(0, ls) + out.join('\n') + v.slice(en);
      t.selectionStart = Math.max(ls, s + firstDelta);
      t.selectionEnd = en + total;
    }
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function onBodyKeydown(e) {
    var tt = e.target;
    if (e.key === 'Tab' && isCodeArea(tt)) { e.preventDefault(); handleCodeTab(tt, e.shiftKey); return; }
    if (e.key !== 'Enter') return;
    var t = e.target;
    // Баннер (заголовок): перенос строки — только по Shift+Enter, как во всех остальных блоках; обычный Enter ничего не вставляет
    if (t.tagName === 'TEXTAREA' && t.dataset.f === 'title') {
      e.preventDefault();
      if (!e.shiftKey) return;
      var ba = t.selectionStart, bb = t.selectionEnd, bv = t.value;
      t.value = bv.slice(0, ba) + '\n' + bv.slice(bb);
      t.selectionStart = t.selectionEnd = ba + 1;
      t.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    if (!isBodyArea(t)) return;
    e.preventDefault();
    var ins = e.shiftKey ? '\n' : '\n\n';
    var a = t.selectionStart, b = t.selectionEnd, v = t.value;
    t.value = v.slice(0, a) + ins + v.slice(b);
    t.selectionStart = t.selectionEnd = a + ins.length;
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // загрузка файла иконки для плашки «Иконки»: SVG вставляем как есть, растровую картинку — как <img>
  function onIconFile(t) {
    var i = blockIndexOf(t); if (i < 0) return;
    var ci = +t.dataset.ci, file = t.files && t.files[0]; if (!file) return;
    var bb = state.blocks[i], isSvg = /\.svg$/i.test(file.name) || /svg/i.test(file.type || '');
    var rd = new FileReader();
    rd.onload = function () {
      var val;
      if (isSvg) { var m = String(rd.result).match(/<svg[\s\S]*<\/svg>/i); val = m ? m[0].replace(/\s+/g, ' ').replace(/> </g, '><') : String(rd.result); }
      else val = '<img src="' + rd.result + '" alt="" style="width:100%;height:100%;object-fit:contain">';
      bb.slots.cards[ci].icon = val; bb.override = undefined; refreshAll();
    };
    if (isSvg) rd.readAsText(file); else rd.readAsDataURL(file);
  }

  function onInput(e) {
    var t = e.target;
    if (t.classList && t.classList.contains('cb-codearea')) { return applyCodeEdit(+t.dataset.piece, t.value, false); }
    if (t.classList && t.classList.contains('cb-icon-file')) { return onIconFile(t); }
    var i = blockIndexOf(t); if (i < 0) return;
    var b = state.blocks[i], s = b.slots;
    if (t.dataset.f) {
      var f = t.dataset.f;
      if (f === 'cardsVariant') { var wi = (s.cardsVariant || 'b05_0') !== 'b05_0', ni = t.value !== 'b05_0'; s.cardsVariant = t.value; if (wi !== ni) migrateHeaderFields(s, ni); relayoutImages(); b.override = undefined; return refreshAll(); }
      if (f === 'family') { s.family = t.value; if (s.family === 'b11') s.gridVariant = '0'; if (s.family === 'b10') (s.cards || []).forEach(function (c) { if (!c.icon) c.icon = ICON_B10; }); relayoutImages(); b.override = undefined; return refreshAll(); }
      if (f === 'gridVariant') { var wg = (s.gridVariant || '0') !== '0', ng = t.value !== '0'; s.gridVariant = t.value; if (wg !== ng) migrateHeaderFields(s, ng); relayoutImages(); b.override = undefined; return refreshAll(); }
      if (f === 'sliderVariant') { var ws = (s.sliderVariant || '0') !== '0', ns = t.value !== '0'; s.sliderVariant = t.value; if (ws !== ns) migrateHeaderFields(s, ns); relayoutImages(); b.override = undefined; return refreshAll(); }
      if (f === 'perView') { s.perView = Math.max(1, +t.value || 1); b.override = undefined; return refreshOutputs(); }
      if (f === 'reverse') { s.reverse = (t.value === '1'); alternateFrom(i); b.override = undefined; return refreshAll(); }
      if (f === 'level') s.level = +t.value;
      else if (f === 'titleSize') { s.titleSize = t.value ? +t.value : undefined; b.override = undefined; return refreshOutputs(); }
      else if (f === 'headingInside') s.headingInside = (t.value === '1');
      else if (f === 'paragraphs') s.paragraphs = splitParas(t.value);
      else s[f] = t.value;
      b.override = undefined; refreshOutputs();
      if (f === 'navLabel' || f === 'anchor') updateNavCard(); // обновить только чипы навигации
    } else if (t.dataset.cf) {
      s.cards[+t.dataset.ci][t.dataset.cf] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.pf) {
      var pi = +t.dataset.pi, pf = t.dataset.pf;
      if (pf === 'paragraphs') s.panels[pi].paragraphs = parsePanelText(t.value);
      else if (pf === 'level') s.panels[pi].level = (t.value === '' ? '' : +t.value);
      else if (pf === 'titleSize') s.panels[pi].titleSize = +t.value;
      else s.panels[pi][pf] = t.value;
      b.override = undefined; refreshOutputs();
    } else if (t.dataset.sf) {
      s.slides[+t.dataset.si][t.dataset.sf] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.th != null) {
      s.header[+t.dataset.ci] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.td != null) {
      var tri = +t.dataset.ri, tci = +t.dataset.ci; if (!s.rows[tri]) s.rows[tri] = []; s.rows[tri][tci] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.qf) {
      s.items[+t.dataset.qi][t.dataset.qf] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.conf) {
      s.blocks[+t.dataset.coni][t.dataset.conf] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.tf) {
      var tbi = +t.dataset.ti, tbf = t.dataset.tf;
      if (tbf === 'type') { s.tabs[tbi].type = t.value; b.override = undefined; return refreshAll(); } // смена типа — перерисовать поля вкладки
      if (tbf === 'reverse') { s.tabs[tbi].reverse = (t.value === '1'); b.override = undefined; return refreshOutputs(); }
      if (tbf === 'level') { s.tabs[tbi].level = +t.value; b.override = undefined; return refreshOutputs(); }
      s.tabs[tbi][tbf] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.wf) {
      s.seasons[+t.dataset.wi][t.dataset.wf] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.ocf) {
      s.columns[+t.dataset.oci][t.dataset.ocf] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.olf) {
      s.columns[+t.dataset.oci].links[+t.dataset.oli][t.dataset.olf] = t.value; b.override = undefined; refreshOutputs();
    } else if (t.dataset.hf) {
      var hhi = +t.dataset.hi, hhf = t.dataset.hf;
      if (hhf === 'paragraphs') s.hotels[hhi].paragraphs = splitParas(t.value);
      else s.hotels[hhi][hhf] = t.value;
      b.override = undefined; refreshOutputs();
    }
  }

  function palAbbr(name) {
    if (/большой картинке/i.test(name)) return 'БК'; // отличаем от «Текстовый блок»/«Текст с картинкой»
    var parts = String(name).replace(/[«»().,]/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2; });
    if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    var base = parts[0] || String(name).trim();
    return base.charAt(0).toUpperCase() + (base.charAt(1) || '').toLowerCase();
  }
  function buildPalette() {
    var pal = document.getElementById('cb-palette');
    pal.innerHTML = '<div class="rail-cap rail-cap--build">Сборщик</div><input class="search cb-search" type="search" placeholder="Поиск блока…" autocomplete="off">' +
      PALETTE.map(function (g) {
        return '<div class="cb-pal-group"><div class="cb-pal-title"><span class="grp-ab">' + esc(palAbbr(g.group)) + '</span><span class="grp-full">' + esc(g.group) + '</span></div>' +
          g.items.map(function (it) { return '<button class="cb-pal-item" data-add="' + it.kind + '" data-name="' + esc(it.name.toLowerCase()) + '"><span class="cb-pal-ico">' + esc(palAbbr(it.name)) + '</span><span class="cb-pal-txt">' + esc(it.name) + '</span></button>'; }).join('') + '</div>';
      }).join('');
    pal.addEventListener('click', function (e) { var t = e.target.closest('.cb-pal-item'); if (t) addBlock(t.dataset.add); });
    var search = pal.querySelector('.cb-search');
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      pal.querySelectorAll('.cb-pal-item').forEach(function (it) { it.style.display = (!q || it.dataset.name.indexOf(q) !== -1) ? '' : 'none'; });
      pal.querySelectorAll('.cb-pal-group').forEach(function (g) { g.style.display = [].some.call(g.querySelectorAll('.cb-pal-item'), function (it) { return it.style.display !== 'none'; }) ? '' : 'none'; });
    });
  }

  function buildUI() {
    buildPalette();
    var root = document.getElementById('builder-root');
    root.innerHTML =
      '<div class="cb-wrap">' +
        '<section class="cb-main"><div class="cb-colhead"><span class="cb-h">Блоки страницы</span></div><div id="cb-blocks"></div></section>' +
      '</div>';

    // Превью/код — общая персистентная панель (живёт в Сборщике и Импорте)
    var side = document.getElementById('cb-side');
    if (side) {
      side.innerHTML =
        '<div class="cb-detach-bar" id="cb-detach-bar"><span>Превью и код открыты в отдельном окне — перенесите его на второй монитор.</span><button id="cb-reattach">Вернуть сюда</button></div>' +
        '<section class="cb-right">' +
          '<div class="cb-colhead cb-tabs"><button class="cb-tab is-active" data-tab="preview">Превью</button><button class="cb-tab" data-tab="export">Код</button>' +
          '<span class="cb-tabs-sp"></span><button class="cb-copy-all" id="cb-copy-all">Скопировать всё</button>' +
          '<button class="cb-icobtn cb-tool" id="cb-detach-btn" title="Открепить в отдельное окно">' + IC.detach + '</button>' +
          '<button class="cb-icobtn cb-tool" id="cb-fs-btn" title="Во весь экран">' + IC.fs + '</button></div>' +
          '<div class="cb-pane" data-pane="preview"><iframe id="cb-preview" title="Превью"></iframe></div>' +
          '<div class="cb-pane cb-hidden" data-pane="export"><div id="cb-export"></div></div>' +
        '</section>';
      side.addEventListener('click', function (e) {
        var t = e.target.closest('button') || e.target;
        if (t.classList && t.classList.contains('cb-copygroup')) return copyGroup(+t.dataset.copygroup, t);
        if (t.classList && t.classList.contains('cb-copy')) return copyPiece(+t.dataset.piece, t);
        if (t.id === 'cb-copy-all') return copyAll(t);
        if (t.id === 'cb-fs-btn') return toggleFs();
        if (t.id === 'cb-detach-btn') return detach();
        if (t.id === 'cb-reattach') return reattach();
        if (t.classList && t.classList.contains('cb-tab')) return switchTab(t.dataset.tab);
        var ca = e.target.closest ? e.target.closest('.cb-codearea, .cb-piece') : null;
        if (ca) { var pc = ca.classList.contains('cb-codearea') ? ca : ca.querySelector('.cb-codearea'); if (pc) syncFocusBlock(+pc.dataset.piece, 'code'); }
      });
      side.addEventListener('input', onInput);
      side.addEventListener('keydown', function (e) { if (e.key === 'Tab' && isCodeArea(e.target)) { e.preventDefault(); handleCodeTab(e.target, e.shiftKey); } });
      side.addEventListener('focusin', onBuilderFocusIn);
    }

    root.addEventListener('click', function (e) {
      var t = e.target.closest('button') || e.target, act = t.dataset ? t.dataset.act : null;
      if (t.classList && t.classList.contains('cb-linkbtn')) { var w = t.closest('.cb-textwrap'); return insertLink(w && w.querySelector('textarea')); }
      if (act === 'toggle-size') { var sk = t.dataset.sizekey; if (sk) sizeUnlocked[sk] = !sizeUnlocked[sk]; return renderBlocks(); }
      if (t.dataset && t.dataset.mv) { // стрелки порядка под-элементов (карточка/панель/слайд/…)
        var mi = blockIndexOf(t); if (mi < 0) return;
        var arr = state.blocks[mi].slots[t.dataset.mv], fr = +t.dataset.mvi, to = fr + (+t.dataset.mvd);
        if (arr && to >= 0 && to < arr.length) {
          var tmp = arr[fr]; arr[fr] = arr[to]; arr[to] = tmp;
          state.blocks[mi].override = undefined;
          if (t.dataset.mv === 'panels' || t.dataset.mv === 'cards' || t.dataset.mv === 'slides') relayoutImages();
          refreshAll(); scrollPreviewToBlock(mi);
        }
        return;
      }
      if (act) {
        var i = blockIndexOf(t);
        if (act === 'up') return move(i, -1);
        if (act === 'down') return move(i, 1);
        if (act === 'del') return del(i);
        if (act === 'add-card') { state.blocks[i].slots.cards.push(newCard()); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'add-gcard') { var gb = state.blocks[i]; gb.slots.cards.push(newGridCard(gb.slots.family)); gb.override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'reset-icon') { var rb = state.blocks[i]; rb.slots.cards[+t.dataset.ci].icon = ICON_B10; rb.override = undefined; return refreshAll(); }
        if (act === 'del-card') { state.blocks[i].slots.cards.splice(+t.dataset.ci, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-panel') { state.blocks[i].slots.panels.push(newPanel()); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-panel') { state.blocks[i].slots.panels.splice(+t.dataset.pi, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-slide') { state.blocks[i].slots.slides.push(newSlide()); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-slide') { state.blocks[i].slots.slides.splice(+t.dataset.si, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-col') { var tac = state.blocks[i].slots; tac.header.push('Колонка ' + (tac.header.length + 1)); tac.rows.forEach(function (r) { r.push(''); }); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'del-col') { var tdc = state.blocks[i].slots, dci = +t.dataset.ci; if (tdc.header.length > 1) { tdc.header.splice(dci, 1); tdc.rows.forEach(function (r) { r.splice(dci, 1); }); } state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-row') { var tar = state.blocks[i].slots; tar.rows.push(tar.header.map(function () { return ''; })); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-row') { state.blocks[i].slots.rows.splice(+t.dataset.ri, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-faq') { state.blocks[i].slots.items.push(newFaq()); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-faq') { state.blocks[i].slots.items.splice(+t.dataset.qi, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-tab') { var atb = state.blocks[i].slots; atb.tabs.push(newTab('Таб ' + (atb.tabs.length + 1))); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-tab') { if (state.blocks[i].slots.tabs.length > 1) state.blocks[i].slots.tabs.splice(+t.dataset.ti, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-season') { state.blocks[i].slots.seasons.push(newSeason('')); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-season') { if (state.blocks[i].slots.seasons.length > 1) state.blocks[i].slots.seasons.splice(+t.dataset.wi, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-seocol') { state.blocks[i].slots.columns.push(newSeoCol()); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-seocol') { if (state.blocks[i].slots.columns.length > 1) state.blocks[i].slots.columns.splice(+t.dataset.oci, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-seolink') { state.blocks[i].slots.columns[+t.dataset.oci].links.push(newSeoLink()); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-seolink') { var dl = state.blocks[i].slots.columns[+t.dataset.oci].links; if (dl.length > 1) dl.splice(+t.dataset.oli, 1); state.blocks[i].override = undefined; return refreshAll(); }
        if (act === 'add-hotel') { state.blocks[i].slots.hotels.push(newHotel()); state.blocks[i].override = undefined; refreshAll(); return scrollPreviewToBlock(i); }
        if (act === 'del-hotel') { if (state.blocks[i].slots.hotels.length > 1) state.blocks[i].slots.hotels.splice(+t.dataset.hi, 1); state.blocks[i].override = undefined; return refreshAll(); }
      }
      if (t.classList && t.classList.contains('cb-copy')) return copyPiece(+t.dataset.piece, t);
      if (t.id === 'cb-copy-all') return copyAll(t);
      if (t.id === 'cb-fs-btn') return toggleFs();
      if (t.id === 'cb-detach-btn') return detach();
      if (t.id === 'cb-reattach') return reattach();
      if (t.classList && t.classList.contains('cb-tab')) return switchTab(t.dataset.tab);
      // клик по шапке/телу блока в панели (не по полю) — синхронизируем превью и код
      var blk = t.closest && t.closest('.cb-block');
      if (blk && !/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(t.tagName)) syncFocusBlock(+blk.dataset.i, 'panel');
    });
    root.addEventListener('input', onInput);
    root.addEventListener('change', onInput);
    root.addEventListener('keydown', onBodyKeydown);
    root.addEventListener('focusin', onBuilderFocusIn);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var r = document.querySelector('.cb-right.cb-fs'); if (r) toggleFs(); } });

    renderBlocks(); refreshOutputs();
    buildImportUI();
  }

  function switchTab(tab) {
    document.querySelectorAll('.cb-tab').forEach(function (b) { b.classList.toggle('is-active', b.dataset.tab === tab); });
    document.querySelectorAll('.cb-pane').forEach(function (p) { p.classList.toggle('cb-hidden', p.dataset.pane !== tab); });
    if (tab === 'preview') updatePreview();
  }
  function toggleFs() { var r = document.querySelector('.cb-right'); var btn = document.getElementById('cb-fs-btn'); var on = r.classList.toggle('cb-fs'); document.body.classList.toggle('cb-fs-lock', on); if (btn) btn.classList.toggle('is-active', on); }

  function copy(text, btn, win) {
    win = win || window;
    var done = function () { if (!btn.dataset.label) btn.dataset.label = btn.textContent; btn.classList.add('cb-done'); btn.textContent = 'Скопировано'; clearTimeout(btn._t); btn._t = setTimeout(function () { btn.classList.remove('cb-done'); btn.textContent = btn.dataset.label; }, 1500); };
    var nav = win.navigator && win.navigator.clipboard;
    if (nav) nav.writeText(text).then(done, function () { fallbackCopy(text, win); done(); }); else { fallbackCopy(text, win); done(); }
  }
  function fallbackCopy(text, win) { var d = (win || window).document; var x = d.createElement('textarea'); x.value = text; d.body.appendChild(x); x.select(); try { d.execCommand('copy'); } catch (e) {} d.body.removeChild(x); }
  function copyPiece(i, btn, win) { copy(pieces()[i].code, btn, win); }
  function copyAll(btn, win) { copy(fullCode(), btn, win); }
  // скопировать весь код одной смысловой секции (все её части подряд)
  function copyGroup(si, btn, win) {
    var ps = pieces(), parts = [];
    state.blocks.forEach(function (b, i) { if (sectionOfBlock(i) === si) parts.push(ps[i].code); });
    copy(parts.join('\n\n\n\n'), btn, win);
  }

  // --- открепление ---
  var detached = null, detachedPoll = null;
  // подстраховка от «залипшего» замка прокрутки (полноэкранный режим правой панели блокирует скролл body)
  function clearScrollLock() {
    document.body.classList.remove('cb-fs-lock');
    var r = document.querySelector('.cb-right.cb-fs'); if (r) r.classList.remove('cb-fs');
    var btn = document.getElementById('cb-fs-btn'); if (btn) btn.classList.remove('is-active');
  }
  function detach() {
    if (detached && !detached.closed) { detached.focus(); return; }
    clearScrollLock(); // открепляем правую панель — полноэкранный режим с блокировкой скролла тут не нужен
    detached = window.open('', 'coral-preview', 'width=1100,height=860');
    if (!detached) { alert('Разрешите всплывающие окна, чтобы открепить панель.'); return; }
    var css = '*{scrollbar-width:none}*::-webkit-scrollbar{width:0;height:0;display:none}' +
      'body{margin:0;font-family:Manrope,system-ui,sans-serif;background:#fff;color:#15212b}.dw{padding:12px 16px}' +
      '.bar{display:flex;align-items:center;gap:6px;height:44px;margin-bottom:10px}' +
      '.cb-tab{padding:8px 16px;border:1px solid #e6ebf0;background:#fff;border-radius:10px;cursor:pointer;font:600 13px Manrope,sans-serif;color:#6b7785}' +
      '.cb-tab:hover{border-color:#0092D0;color:#0092D0}.cb-tab.is-active{background:#0B3C5D;border-color:#0B3C5D;color:#fff}.sp{flex:1}' +
      '.cb-copy-all{padding:8px 16px;border:1px solid #0092D0;background:#0092D0;color:#fff;border-radius:10px;cursor:pointer;font:600 13px Manrope,sans-serif}' +
      '.cb-copy-all:hover{background:#077dad}.cb-copy-all.cb-done{background:#1f9d6b;border-color:#1f9d6b}' +
      '.cb-pane{border:1px solid #e6ebf0;border-radius:14px;overflow:hidden;background:#fff}.cb-hidden{display:none}' +
      '#dw-preview{width:100%;height:calc(100vh - 78px);border:0;background:#f5f5f8}' +
      '#dw-export{padding:14px}' +
      '#dw-export:has(.cb-export-empty){padding:0}.cb-export-empty{display:flex;align-items:center;justify-content:center;height:calc(100vh - 78px);background:#f5f5f8;color:#6b7785;font:500 15px Manrope,system-ui,sans-serif;text-align:center}' + // пусто — как «Добавьте блок из меню слева» в превью
      '.cb-code-hint{font:500 12px Manrope,sans-serif;color:#0B3C5D;background:#E5F7FF;border:1px solid #d4ecf7;border-radius:10px;padding:8px 12px;margin-bottom:12px}' +
      '.cb-piece{margin-bottom:12px}.cb-piece-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}.cb-piece-head span{font:600 12.5px Manrope,sans-serif;color:#111}' +
      '.cb-copy{padding:6px 14px;border:1.5px solid #0092D0;background:#fff;color:#0092D0;border-radius:999px;cursor:pointer;font:600 12.5px Manrope,sans-serif}' +
      '.cb-copy:hover{background:#0092D0;color:#fff}.cb-copy.cb-done{background:#1f9d6b;border-color:#1f9d6b;color:#fff}' +
      'textarea.cb-code{display:block;width:100%;box-sizing:border-box;resize:vertical;white-space:pre;overflow:hidden;tab-size:4;-moz-tab-size:4;background:#f7f9fb;color:#1d2b38;border:1px solid #e4eaef;border-radius:12px;padding:12px 14px;font:12.5px/1.7 ui-monospace,Menlo,Consolas,monospace}' +
      'textarea.cb-code:focus{overflow:auto;outline:none;border-color:#0092D0}' +
      '.cb-piece.c0{--pc:#0092d0;--pbg:#e9f6fc}.cb-piece.c1{--pc:#1f9d6b;--pbg:#e7f6ef}.cb-piece.c2{--pc:#d9920f;--pbg:#fbf3e1}.cb-piece.c3{--pc:#7c5cf0;--pbg:#f1ecfd}.cb-piece.c4{--pc:#dd4f86;--pbg:#fceaf1}.cb-piece.c5{--pc:#0ea5a5;--pbg:#e4f6f5}' +
      '.cb-codegroup{border:1px solid #0092D0;box-shadow:0 0 0 1px #0092D0;border-radius:14px;background:#fff;padding:10px;margin-bottom:14px}' +
      '.cb-codegroup-head{display:flex;align-items:center;gap:10px;margin-bottom:8px}.cb-codegroup-title{font:700 12.5px Manrope,sans-serif;color:#1c2b36;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.cb-copygroup{flex:none;padding:6px 14px;border:1.5px solid #0092D0;background:#0092D0;color:#fff;border-radius:999px;cursor:pointer;font:700 12px Manrope,sans-serif}.cb-copygroup:hover{filter:brightness(1.06)}.cb-copygroup.cb-done{background:#1f9d6b;border-color:#1f9d6b}' +
      '.cb-codegroup>.cb-piece{border:1px solid color-mix(in srgb,var(--pc) 30%,#e6ebf0);border-left:4px solid var(--pc);border-radius:12px;background:color-mix(in srgb,var(--pbg) 40%,#fff);padding:10px;margin-bottom:10px}' +
      '.cb-codegroup .cb-piece:last-child{margin-bottom:0}';
    var shell = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Coral — превью и код</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"><style>' + css + '</style></head><body><div class="dw">' +
      '<div class="bar"><button class="cb-tab is-active" data-tab="preview">Превью</button><button class="cb-tab" data-tab="export">Код</button><span class="sp"></span>' +
      '<button class="cb-copy-all" id="dw-copyall">Скопировать всё</button></div>' +
      '<div class="cb-pane" data-pane="preview"><iframe id="dw-preview" title="Превью"></iframe></div>' +
      '<div class="cb-pane cb-hidden" data-pane="export"><div id="dw-export"></div></div></div></body></html>';
    detached.document.open(); detached.document.write(shell); detached.document.close();
    var d = detached.document;
    d.addEventListener('click', function (e) {
      var t = e.target.closest('button') || e.target;
      if (t.classList && t.classList.contains('cb-tab')) { d.querySelectorAll('.cb-tab').forEach(function (b) { b.classList.toggle('is-active', b.dataset.tab === t.dataset.tab); }); d.querySelectorAll('.cb-pane').forEach(function (p) { p.classList.toggle('cb-hidden', p.dataset.pane !== t.dataset.tab); }); if (t.dataset.tab === 'preview') paintPreview(d.getElementById('dw-preview')); return; }
      if (t.id === 'dw-copyall') return copyAll(t, detached);
      if (t.classList && t.classList.contains('cb-copygroup')) return copyGroup(+t.dataset.copygroup, t, detached);
      if (t.classList && t.classList.contains('cb-copy')) return copyPiece(+t.dataset.piece, t, detached);
      // клик по коду блока в откреплённом окне — панель управления перелистывается к этому блоку
      var ca = e.target.closest ? e.target.closest('.cb-codearea, .cb-piece') : null;
      if (ca) { var pc = ca.classList.contains('cb-codearea') ? ca : ca.querySelector('.cb-codearea'); if (pc) syncFocusBlock(+pc.dataset.piece, 'code'); }
    });
    d.addEventListener('input', function (e) { var t = e.target; if (t.classList && t.classList.contains('cb-codearea')) applyCodeEdit(+t.dataset.piece, t.value, true); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Tab' && isCodeArea(e.target)) { e.preventDefault(); handleCodeTab(e.target, e.shiftKey); } });
    document.body.classList.add('pv-detached');
    var db = document.getElementById('cb-detach-btn'); if (db) db.classList.add('is-active');
    // свежий iframe в новом окне асинхронно догружает about:blank и стирает первую отрисовку —
    // перерисовываем по его событию load, чтобы превью не оставалось пустым до переключения вкладок
    var pf = d.getElementById('dw-preview');
    if (pf) pf.addEventListener('load', function () { pf._ready = false; syncDetached(); }, { once: true });
    setTimeout(syncDetached, 60);
    detachedPoll = setInterval(function () { if (!detached || detached.closed) { clearInterval(detachedPoll); detached = null; onReattached(); } }, 600);
  }
  function syncDetached() {
    if (!detached || detached.closed) return;
    var d = detached.document;
    paintPreview(d.getElementById('dw-preview'));
    var ex = d.getElementById('dw-export'); if (ex) ex.innerHTML = exportHtml(true);
  }
  function reattach() { if (detached && !detached.closed) detached.close(); detached = null; onReattached(); }
  function onReattached() {
    clearScrollLock(); // на всякий случай снимаем возможный залипший замок прокрутки
    document.body.classList.remove('pv-detached');
    var db = document.getElementById('cb-detach-btn'); if (db) db.classList.remove('is-active');
    var f = document.getElementById('cb-preview'); if (f) f._ready = false;
    refreshOutputs();
  }

  // --- хром нового каркаса: закрепление рельса + мобильные вкладки режимов ---
  function setupShellChrome() {
    // закрепить контекстный рельс открытым
    var pin = document.getElementById('rail-pin');
    if (pin) pin.addEventListener('click', function () {
      var on = document.body.classList.toggle('rail-pinned');
      pin.setAttribute('aria-pressed', on ? 'true' : 'false');
      pin.classList.toggle('is-active', on);
    });
    // верхняя панель сворачивается при прокрутке вниз; вверху страницы — развёрнута с вкладками.
    // Сворачиваем только когда странице реально есть куда прокручиваться — иначе на коротких
    // страницах свёрнутый кружок наезжает на рельс.
    var onScroll = function () {
      var room = (document.documentElement.scrollHeight - window.innerHeight) > 140;
      document.body.classList.toggle('scrolled', room && window.scrollY > 6);
    };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    // клик по логотипу прокручивает наверх (возвращает вкладки)
    var brand = document.querySelector('.topbar-brand');
    if (brand) brand.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    // флайаут выбора вкладки: при наведении на верхнюю панель (кружок Coral) показываем меню и освобождаем ему место — рельс съезжает вниз
    var topbarEl = document.getElementById('topbar'), flyEl = document.getElementById('tab-fly');
    if (topbarEl && flyEl) {
      topbarEl.addEventListener('mouseenter', function () { document.body.classList.add('tabfly-open'); });
      topbarEl.addEventListener('mouseleave', function () { document.body.classList.remove('tabfly-open'); });
      // измеряем высоту меню (две вкладки) → на эту высоту + зазор опускаем рельс
      // высота меню зависит от числа видимых вкладок (активная скрыта) и режима — измеряем КАЖДЫЙ раз при открытии,
      // иначе рельс съезжает на устаревшую высоту и флайаут наслаивается на него
      var measureFly = function () { var h = flyEl.offsetHeight; if (h) document.documentElement.style.setProperty('--fly-h', h + 'px'); };
      topbarEl.addEventListener('mouseenter', measureFly);
      measureFly(); window.addEventListener('resize', measureFly); setTimeout(measureFly, 300);
    }
    // наведение на незакреплённый рельс раскрывает и верхнюю панель в его ширину (Справочник/Сборщик)
    var railEl = document.getElementById('sidebar');
    if (railEl) {
      railEl.addEventListener('mouseenter', function () { document.body.classList.add('rail-hover'); });
      railEl.addEventListener('mouseleave', function () { document.body.classList.remove('rail-hover'); });
    }
    // на телефоне режимов нет вовсе — только Справочник (Сборщик/Импорт живут на компьютере)
  }

  // ==================== Импорт текстовки ====================
  var tzState = { result: null, fileName: '' };
  var importMap = {}, importSeq = 0;                    // секция → { id, kind }
  // Баннер и Подводка ставятся автоматически один раз — в ручном выборе их нет.
  // Есть картинка → блоки с картинкой (без «Текстового блока»); нет картинки → блоки без картинки (без «Текст с картинкой»).
  var KINDS_IMG = [['panel', 'Текст с картинкой'], ['cards', 'Карточки'], ['grid', 'Плашки'], ['slider', 'Слайдер'], ['bigimage', 'Текст на большой картинке']];
  var KINDS_NOIMG = [['textpanel', 'Текстовый блок'], ['cards', 'Карточки'], ['grid', 'Плашки'], ['slider', 'Слайдер']];
  var ALL_KINDS = [['panel', 'Текст с картинкой'], ['bigimage', 'Текст на большой картинке'], ['textpanel', 'Текстовый блок'], ['cards', 'Карточки'], ['grid', 'Плашки'], ['slider', 'Слайдер'], ['table', 'Таблица'], ['text', 'Подводка'], ['faq', 'Раскрывашка (аккордеон)'], ['banner', 'Баннер']];
  var tzUnlocked = {}; // секции со «100% шаблоном», где пользователь разблокировал другие варианты
  var gapUnlocked = {}; // секции, где раскрыта настройка отступов между блоками (под замком)
  var SPLIT_TINTS = 6; // число цветовых меток частей (циклически)
  function itemsImgCount(items) { var n = 0; (items || []).forEach(function (it) { if (it.type === 'image') n++; }); return n; }
  function secHasImg(sec) { return itemsImgCount(sec && sec.items) > 0; }
  function chunkKindsFor(atoms, isLead) {
    var base = itemsImgCount(atoms) > 0 ? KINDS_IMG : KINDS_NOIMG;
    return isLead ? [['text', 'Подводка']].concat(base) : base; // у подводки часть можно оставить/сделать «Подводкой»
  }
  // выбор типа части прямо в разметке — набор зависит от того, есть ли картинка в этой части
  function splitKindSel(cur, si, pj, opts, afterOpt) {
    var blockOpts = opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
    // «Текст под блоком» — отдельной группой, визуально отделён от блоков
    var inner = afterOpt
      ? '<optgroup label="Оформить блоком">' + blockOpts + '</optgroup>' +
        '<optgroup label="Прикрепить к предыдущему">' +
        '<option value="after"' + (cur === 'after' ? ' selected' : '') + '>↳ Текст под блоком</option></optgroup>'
      : blockOpts;
    return '<select class="tz-split-sel' + (cur === 'after' ? ' tz-split-sel--after' : '') + '" data-splitkind-sec="' + si + '" data-splitkind-part="' + pj + '">' + inner + '</select>';
  }
  // блоки с выбором вида шапки (0 — без картинки, 1 — с картинкой·заголовок над, 2 — с картинкой·заголовок внутри)
  var VARIANTABLE = { cards: 1, grid: 1, slider: 1, panel: 1 };
  var VARIANT_OPTS = [['0', 'Без картинки'], ['1', 'С картинкой · заголовок над'], ['2', 'С картинкой · заголовок внутри']];
  // текущий вариант части: явный (mp.variants) либо авто по наличию картинки
  function effVariant(mp, pj, atoms, kind) { var v = mp.variants && mp.variants[pj]; if (v != null) return v; if (kind === 'cards' || kind === 'slider') return '0'; return itemsImgCount(atoms) > 0 ? '1' : '0'; }
  function splitVariantSel(cur, si, pj) {
    return '<select class="tz-split-vsel" data-splitvar-sec="' + si + '" data-splitvar-part="' + pj + '">' +
      VARIANT_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  // варианты отступа сверху (класс обёртки): по убыванию. '' = вплотную (без mt-класса)
  // отступ сверху — два варианта: стандартный (wrapper mt-1) и уменьшенный (wrapper, вплотную)
  var MARGIN_OPTS = [['mt-1', 'стандартный'], ['', 'уменьшенный']];
  function splitMarginSel(cur, si, pj) {
    return '<select class="tz-split-gsel" data-splitmargin-sec="' + si + '" data-splitmargin-part="' + pj + '" title="Отступ сверху от предыдущего блока">' +
      MARGIN_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>Отступ: ' + o[1] + '</option>'; }).join('') + '</select>';
  }
  // фактический отступ части сверху: явный (mp.margins) либо дефолт шаблона (первый блок — mt-1, остальные части — вплотную)
  // отступ по умолчанию: части после первой — вплотную; первый блок — стандартный, но «Текст без заголовка» (секция без своего заголовка) — уменьшенный
  function effMargin(mp, pj, sec) {
    var m = mp && mp.margins && mp.margins[pj];
    if (m != null) return m;
    if (effTight(mp, pj)) return '';
    if (sec && !sec.heading && !sec.isLead) return ''; // текст без заголовка → примыкает к предыдущему блоку
    return 'mt-1';
  }
  // отступ под замком: по клику на замок раскрывается список — только для этой части/блока. Одинаково везде.
  function marginCtrlUI(si, pj, cur) {
    return gapUnlocked[si + '_' + pj]
      ? splitMarginSel(cur, si, pj) + '<button class="tz-gaplock is-open" data-gaplock="' + si + '" data-gappart="' + pj + '" title="Скрыть настройку отступа">' + IC.unlock + '</button>'
      : '<button class="tz-gaplock" data-gaplock="' + si + '" data-gappart="' + pj + '" title="Отступ сверху — настроить">' + IC.lock + '</button>';
  }
  // фактический отступ части: явный (mp.tights) либо авто (первая часть — с отступом, остальные — вплотную)
  function effTight(mp, pj) { var t = mp && mp.tights && mp.tights[pj]; return t != null ? t : (pj > 0); }
  // «Текст с картинкой»: положение заголовка — над блоком (b12_0/1) или внутри блока (b12_2)
  function effPanelHead(mp, pj) { return (mp && mp.variants && mp.variants[pj] === 'inside') ? 'inside' : 'over'; }
  function splitPanelHeadSel(cur, si, pj) {
    var opts = [['over', 'Заголовок над блоком'], ['inside', 'Заголовок внутри блока']];
    return '<select class="tz-split-vsel" data-splitvar-sec="' + si + '" data-splitvar-part="' + pj + '">' +
      opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  // «Текст с картинкой» (список-движимые панели): куда отнести абзац(ы) сразу после заголовка —
  // вводным над блоком (по умолчанию) или текстом внутрь первого блока
  function effLeadBlk(mp, pj) { return !!(mp && mp.leadBlk && mp.leadBlk[pj]); }
  function splitLeadSel(cur, si, pj) {
    var opts = [['intro', 'Текст после заголовка: вводный над блоком'], ['block', 'Текст после заголовка: внутри блока']];
    return '<select class="tz-split-vsel tz-split-lsel" data-splitlead-sec="' + si + '" data-splitlead-part="' + pj + '" title="Абзац сразу после заголовка — вводный над блоком или текст внутри первого блока">' +
      opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  // список-движимая разметка панели «Текст с картинкой» (много картинок + список):
  // ведущий подзаголовок → заголовок блока, абзацы до списка → вводный, пункты списка → панели
  // «Рейтинг отелей» (b21): секция, где подзаголовки-отели сами являются гиперссылками (H3 = ссылка на отель).
  // Опознаём по тому, что ВСЕ подзаголовки части — ссылки (их 2+). Текст из такой секции идёт в блок «Рейтинг отелей».
  function linkedSubCount(items) { return (items || []).filter(function (it) { return it.type === 'sub' && /<a\s+href=/i.test(it.text || ''); }).length; }
  function isHotelRatingItems(items) { var subs = (items || []).filter(function (it) { return it.type === 'sub'; }); return subs.length >= 2 && linkedSubCount(items) === subs.length; }
  function isHotelRatingSection(sec) { return !!(sec && !(sec.heading && sec.heading.isTitle) && !isFaqSection(sec) && (sec._hotelsMerged || isHotelRatingItems(sec.items))); }
  function panelHasList(items) { return (items || []).some(function (it) { return it.type === 'list'; }); }
  function panelParseList(items) {
    var lead = [], leadHead = '', leadLevel = 0, units = [], u = null, phase = 'pre';
    function nu() { u = { heading: '', level: 3, paragraphs: [], hasImg: false, imgSrc: '' }; units.push(u); return u; }
    (items || []).forEach(function (it) {
      if (it.type === 'image') { if (phase === 'body' && !u) nu(); if (u) { u.hasImg = true; if (it.src && !u.imgSrc) u.imgSrc = it.src; } return; }
      if (it.type === 'sub') {
        if (phase === 'pre' && !leadHead && !units.length) { leadHead = it.text; leadLevel = it.level || 0; }
        else { nu(); u.heading = it.text; u.level = it.level; phase = 'body'; }
      } else if (it.type === 'list') { it.items.forEach(function (x) { nu(); u.paragraphs.push(x); }); phase = 'body'; }
      else if (it.type === 'p') { if (phase === 'pre') lead.push(it.text); else { if (!u) nu(); u.paragraphs.push(it.text); } }
    });
    if (!units.length) nu();
    return { leadHead: leadHead, leadLevel: leadLevel, lead: lead, units: units };
  }
  // секция вопросов почти всегда безальтернативно оформляется аккордеоном
  function isFaqSection(sec) { return !!(sec.heading && !sec.heading.isTitle && /вопрос|часто задаваем|\bfaq\b/i.test(sec.heading.text)); }
  function hasTable(sec) { return (sec.items || []).some(function (it) { return it.type === 'table'; }); }
  // «100% шаблон»: баннер (H1), подводка (лид), раскрывашка (вопросы), таблица — остальные шаблоны под замком
  // подводка больше не «фиксированный» блок: она размечается как делимая секция (часть 1 — Подводка, остальные части — любой блок)
  function certainKind(sec) { if (sec.heading && sec.heading.isTitle) return 'banner'; if (isFaqSection(sec)) return 'faq'; if (hasTable(sec)) return 'table'; return null; }
  function kindLabel(k) { for (var i = 0; i < ALL_KINDS.length; i++) if (ALL_KINDS[i][0] === k) return ALL_KINDS[i][1]; return k; }

  // «<b>Атмосфера.</b> текст» → { title: 'Атмосфера', text: 'текст' }: жирный пункт абзаца — заголовок карточки/плашки
  function boldLead(t) { var m = String(t || '').match(/^\s*<b>([\s\S]*?)<\/b>\s*([\s\S]*)$/); return m ? { title: m[1].replace(/[.:]\s*$/, ''), text: m[2] } : null; }
  // лид-абзацы + единицы (пункты списка / подзаголовки / жирные пункты) с прилегающим текстом — общий разбор для карточек/плашек/слайдера
  function extractUnits(sec) {
    var items = sec.items || [];
    var hasList = items.some(function (it) { return it.type === 'list'; });
    var heading = '', headingLevel = 0, lead = [], units = [], trailing = [];
    // накопленные «хвостовые» абзацы сбрасываем в текст предыдущей карточки, если появилась ещё одна (чтобы не потерять)
    function flush() { if (trailing.length && units.length) { var u = units[units.length - 1]; u.text = (u.text ? u.text + '\n\n' : '') + trailing.join('\n\n'); } trailing = []; }
    if (hasList) {
      // карточки — из пунктов списка; ведущий подзаголовок (до списка) = ЗАГОЛОВОК блока, абзацы до списка = ВВОДНЫЙ
      var seenList = false;
      items.forEach(function (it) {
        if (it.type === 'sub') {
          if (!seenList && !units.length && !heading) { heading = it.text; headingLevel = it.level || 0; } // ведущий подзаголовок = заголовок блока
          else { flush(); units.push({ title: it.text, text: '', fromList: false }); }
        } else if (it.type === 'list') {
          flush(); seenList = true;
          var last = units[units.length - 1];
          if (last && last.bold && !last.text) { last.text = it.items.join('\n'); return; } // «Кому подходит:» + список → одна плашка, пункты строками
          it.items.forEach(function (x) { var bx = boldLead(x); units.push({ title: bx ? bx.title : '', text: bx ? bx.text : x, fromList: true }); });
        }
        else if (it.type === 'p') {
          var bl = boldLead(it.text);
          if (bl) { flush(); units.push({ title: bl.title, text: bl.text, fromList: false, bold: true }); return; }
          if (!seenList) lead.push(it.text); // абзац до списка → вводный абзац блока
          else { var u = units[units.length - 1]; if (u && !u.fromList) u.text = (u.text ? u.text + '\n\n' : '') + it.text; else trailing.push(it.text); }
        }
      });
    } else {
      // без списка: подзаголовки = карточки (заголовок + тело); абзацы до первого подзаголовка — вводный
      var mode = 'lead';
      items.forEach(function (it) {
        if (it.type === 'sub') { flush(); units.push({ title: it.text, text: '', fromList: false }); mode = 'units'; }
        else if (it.type === 'p') {
          var bl = boldLead(it.text);
          if (bl) { flush(); units.push({ title: bl.title, text: bl.text, fromList: false }); mode = 'units'; return; }
          if (mode === 'lead') { lead.push(it.text); return; }
          var u = units[units.length - 1];
          if (u && !u.fromList) u.text = (u.text ? u.text + '\n\n' : '') + it.text;
          else trailing.push(it.text);
        }
      });
    }
    // хвостовые абзацы ПОСЛЕДНЕЙ единицы — её же текст (как и у всех предыдущих): дописываем в неё, а не в «Текст под блоком».
    // Текст под блоком теперь задаётся только явно — отделением абзаца(ев) в отдельную часть.
    flush();
    return { heading: heading, headingLevel: headingLevel, lead: lead, units: units, trailing: trailing };
  }
  // тип плашки по маркерам списка: нумерованный → цифры (b09), обычный (точки) → синяя линия (b08, в приоритете)
  function gridFamilyFor(sec) {
    var items = sec.items || [];
    for (var i = 0; i < items.length; i++) if (items[i].type === 'list') return items[i].ordered ? 'b09' : 'b08';
    return 'b08';
  }
  // Универсально: если у части нет своего заголовка, но она начинается с подзаголовка более высокого уровня
  // (например h3 над карточками/панелями h4) — делаем его ЗАГОЛОВКОМ блока, а не первой карточкой/панелью.
  function promoteLeadingHeading(sec) {
    if (sec.heading) return sec;                 // часть 1 секции — заголовок уже есть
    var items = sec.items || [], first = -1;
    for (var i = 0; i < items.length; i++) {
      var t = items[i].type;
      if (t === 'sub') { first = i; break; }
      if (t !== 'label') return sec;             // до подзаголовка есть абзац/картинка/список → не трогаем
    }
    if (first < 0) return sec;
    var restMin = Infinity, restCount = 0;
    for (var j = first + 1; j < items.length; j++) if (items[j].type === 'sub') { restCount++; if ((items[j].level || 0) < restMin) restMin = items[j].level || 0; }
    if (restCount > 0 && (items[first].level || 0) < restMin) { // ведущий подзаголовок выше остальных → заголовок блока
      var copy = {}; for (var p in sec) copy[p] = sec[p];
      copy.heading = { level: items[first].level, text: items[first].text };
      copy.items = items.slice(0, first).concat(items.slice(first + 1));
      return copy;
    }
    return sec;
  }
  // Секция текстовки → блок Сборщика с заполненными полями (дословно из документа)
  // строка, состоящая ЦЕЛИКОМ из одной ссылки (напр. название отеля ссылкой отдельным абзацем)
  function isLoneLink(t) {
    var s = String(t == null ? '' : t).trim();
    if (!/^<a\s[^>]*>[\s\S]*?<\/a>$/i.test(s)) return false;
    return (s.match(/<a\s/gi) || []).length === 1;
  }
  // название со ссылкой (отель и т.п.), стоящее отдельной строкой — в начале блока или в его конце:
  // само название никуда не выводим — берём из него только адрес и ставим в кнопку в конце блока.
  // Старое поведение — название шло в заголовок панели — больше не применяется.
  function promoteLoneLinkHeadings(panels) {
    (panels || []).forEach(function (p) {
      if (!p) return;
      var arr = p.paragraphs || [];
      for (var i = 0; i < arr.length; i++) {           // строка-ссылка может стоять в любом месте блока: и в начале, и в конце
        if (typeof arr[i] !== 'string' || !isLoneLink(arr[i])) continue;
        var hl = CA.splitHeadingLink(arr[i]);
        if (!hl.href) continue;
        if (!p.btnHref) { p.btnHref = hl.href; if (!p.btnText) p.btnText = CA.CTA_TEXT; }
        arr.splice(i, 1);
        break;                                         // одна кнопка на блок
      }
      p.paragraphs = arr.length ? arr : [''];
    });
  }
  // заголовок-ссылка: внутри <hN> ссылка не должна нести class="text" (это класс размера обычного текста — заголовок «сжимается»).
  // Приводим к той же форме, что и ссылки на отели в справочнике: href + target/rel, без класса.
  function headingLinkHtml(txt) {
    return String(txt == null ? '' : txt).replace(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, function (m, href, inner) {
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + inner + '</a>';
    });
  }
  function blockFromSection(kind, sec, variant) {
    sec = promoteLeadingHeading(sec);
    var s = defaults(kind);
    var headText = sec.heading ? headingLinkHtml(sec.heading.text) : '';
    var firstPara = null; sec.items.forEach(function (it) { if (!firstPara && it.type === 'p') firstPara = it.text; });

    if (kind === 'banner') {
      s.title = wrapBanner(headText); s.level = (sec.heading && sec.heading.level) || 1; s.subtitle = '';
      var bimg = ''; (sec.items || []).forEach(function (it) { if (!bimg && it.type === 'image' && it.src) bimg = it.src; }); // настоящая картинка баннера из текстовки; сток-заглушка — плейсхолдер шаблона
      if (bimg) { s.imgDesktop = bimg; s.imgMobile = bimg; }
    } else if (kind === 'text') {
      var tp = [];
      sec.items.forEach(function (it) {
        if (it.type === 'p') tp.push(it.text);
        else if (it.type === 'list') it.items.forEach(function (x) { tp.push(x); });
      });
      s.paragraphs = tp.length ? tp : ['']; s.navLabel = '';
      return { kind: kind, slots: s };
    } else if (kind === 'faq') {
      var items = [], cur = null, lead = [];
      var isQ = function (t) { return /\?\s*$/.test(String(t || '').trim()); }; // вопрос обычно заканчивается на «?»
      sec.items.forEach(function (it) {
        if (it.type === 'sub') {
          // подзаголовок без «?» после открытого вопроса — это его ОТВЕТ (ответ криво оформлен стилем H3), а не новый вопрос
          if (cur && !isQ(it.text)) cur.a = (cur.a ? cur.a + '\n\n' : '') + it.text;
          else { cur = { q: it.text, a: '' }; items.push(cur); }
        }
        else if (it.type === 'p') {
          if (!items.length && !/\?\s*$/.test(it.text.trim())) lead.push(it.text); // до первого вопроса — вводный абзац
          else if (cur && !cur.a) cur.a = it.text;
          else if (/\?\s*$/.test(it.text.trim())) { cur = { q: it.text, a: '' }; items.push(cur); }
          else if (cur) cur.a += (cur.a ? '\n\n' : '') + it.text;
          else { cur = { q: it.text, a: '' }; items.push(cur); }
        }
      });
      s.title = headText; s.level = (sec.heading && sec.heading.level) || 2;
      s.intro = lead.join('\n\n');
      s.items = items.length ? items : [newFaq()];
      return { kind: kind, slots: s };
    } else if (kind === 'hotels') { // «Рейтинг отелей» (b21): каждый подзаголовок-ссылка → отдельный отель
      s.title = headText; s.secLevel = (sec.heading && sec.heading.level) || 2; s.secSize = 1; s.titleSize = 4;
      var hotels = [], cur = null, intro = [], hLvl = 0;
      sec.items.forEach(function (it) {
        if (it.type === 'sub') { cur = hotelUnitFromSub(it.text); if (!hLvl && it.level) hLvl = it.level; hotels.push(cur); }
        else if (it.type === 'image') { if (cur && it.src) { if (cur.img === IMG_PANEL) cur.img = it.src; } } // настоящая картинка отеля → в шаблон
        else if (it.type === 'link') { if (cur && !cur.href && it.url) cur.href = String(it.url).replace(/[?#].*$/, ''); } // запасная ссылка на отель
        else if (it.type === 'p') { var t = String(it.text || '').trim(); if (/^(image|img|фото|картинка|изображение)$/i.test(t)) return; if (cur) cur.paragraphs.push(it.text); else if (t) intro.push(it.text); }
        else if (it.type === 'list') { if (cur) cur.paragraphs.push({ ordered: !!it.ordered, items: it.items.slice() }); } // список удобств отеля → буллеты внутри панели
      });
      hotels.forEach(function (h) { if (!h.paragraphs.length) h.paragraphs = ['']; });
      s.level = hLvl || 3; // уровень заголовка-отеля — как в документе (обычно h3)
      s.hotels = hotels.length ? hotels : [newHotel()];
      s.intro = intro.join('\n\n');
      return { kind: kind, slots: s };
    } else if (kind === 'cards') {
      var cu = extractUnits(sec);
      var cards = cu.units.map(function (u) { return { title: u.title, text: u.text, img: IMG_CARD, level: '' }; });
      if (!cards.length) { cards = cu.lead.map(function (t) { return { title: '', text: t, img: IMG_CARD, level: '' }; }); cu.lead = []; }
      if (!cards.length) cards = [newCard(), newCard()];
      if (cu.trailing && cu.trailing.length) s.afterText = cu.trailing.join('\n\n'); // завершающий абзац → текст под блоком
      var cHead = headText || cu.heading; // заголовок блока: заголовок секции (часть 1) либо ведущий подзаголовок части
      s.level = (headText ? (sec.heading && sec.heading.level) : cu.headingLevel) || 2;
      if (!headText && cu.heading) s.titleSize = 2; // подзаголовок на вынос (h3) → title-2, не title-1
      s.cards = cards;
      var cv = variant != null ? variant : '0'; // в импорте карточки по умолчанию — без картинки
      s.cardsVariant = 'b05_' + cv;
      if (cv !== '0') { s.heading = cHead; s.paragraphs = cu.lead.length ? cu.lead : ['']; s.img = IMG_PANEL; s.intro = ''; }
      else { s.title = cHead; s.intro = cu.lead.join('\n\n'); }
    } else if (kind === 'slider') {
      var su = extractUnits(sec);
      var slides = su.units.map(function (u) { return { img: IMG_CARD, title: u.title, text: u.text }; });
      if (!slides.length) { slides = su.lead.map(function (t) { return { img: IMG_CARD, title: '', text: t }; }); su.lead = []; }
      if (!slides.length) slides = [newSlide(), newSlide(), newSlide()];
      if (su.trailing && su.trailing.length) s.afterText = su.trailing.join('\n\n'); // завершающий абзац → текст под блоком
      var sHead = headText || su.heading;
      s.level = (headText ? (sec.heading && sec.heading.level) : su.headingLevel) || 2; s.slides = slides; s.perView = 3;
      if (!headText && su.heading) s.titleSize = 2; // подзаголовок на вынос (h3) → title-2
      var slv = variant != null ? variant : '0'; // в импорте слайдер по умолчанию — без картинки
      s.sliderVariant = slv;
      if (slv !== '0') { s.heading = sHead; s.paragraphs = su.lead.length ? su.lead : ['']; s.img = IMG_PANEL; s.intro = ''; }
      else { s.title = sHead; s.intro = su.lead.join('\n\n'); }
    } else if (kind === 'table') { // Таблица — из табличного item + заголовок/вводный
      s.title = headText; s.level = (sec.heading && sec.heading.level) || 2; s.navLabel = '';
      var tbl = null, tlead = [], tafter = [];
      sec.items.forEach(function (it) {
        if (it.type === 'table' && !tbl) tbl = it;
        // абзацы до таблицы — вводный текст над ней; после таблицы (примечания, «Важно: …») — текст под блоком
        else if (it.type === 'p') { if (tbl) tafter.push(it.text); else tlead.push(it.text); }
        else if (it.type === 'list' && tbl) it.items.forEach(function (x) { tafter.push(x); });
      });
      s.intro = tlead.join('\n\n');
      if (tafter.length) s.afterText = tafter.join('\n\n');
      s.header = tbl && tbl.header && tbl.header.length ? tbl.header.slice() : ['Колонка 1', 'Колонка 2'];
      s.rows = tbl && tbl.rows && tbl.rows.length ? tbl.rows.map(function (r) { return r.slice(); }) : [s.header.map(function () { return ''; })];
      return { kind: kind, slots: s };
    } else if (kind === 'textpanel') { // «Текстовый блок» — многопанельный без картинки: подзаголовки → заголовки блоков
      s.heading = headText; s.level = (sec.heading && sec.heading.level) || 2; s.navLabel = '';
      var tpanels = [], tcur = null;
      function tnp() { var p = { heading: '', level: 3, paragraphs: [] }; tpanels.push(p); return p; }
      sec.items.forEach(function (it) {
        if (it.type === 'sub') { tcur = tnp(); tcur.heading = it.text; tcur.level = it.level; }
        else if (it.type === 'p') { if (!tcur) tcur = tnp(); tcur.paragraphs.push(it.text); }
        else if (it.type === 'list') { if (!tcur) tcur = tnp(); tcur.paragraphs.push({ ordered: !!it.ordered, items: it.items.slice() }); }
        // отдельно стоящая ссылка на отель → кнопка «Выбрать тур» у этого блока
        else if (it.type === 'link') { if (!tcur) tcur = tnp(); if (!tcur.btnHref && it.url) { tcur.btnHref = String(it.url).replace(/[?#].*$/, ''); tcur.btnText = CA.CTA_TEXT; } }
      });
      if (!tpanels.length) tnp();
      s.panels = tpanels.map(function (p) { return { heading: p.heading, level: p.level, paragraphs: p.paragraphs.length ? p.paragraphs : [''], btnText: p.btnText || '', btnHref: p.btnHref || '' }; });
      promoteLoneLinkHeadings(s.panels);
      return { kind: kind, slots: s };
    } else if (kind === 'grid') { // «Плашки» — тип по маркерам списка (цифры/синяя линия); пункты списка → плашки
      var fam = gridFamilyFor(sec), gu = extractUnits(sec);
      var gcards = gu.units.map(function (u) { var c = newGridCard(fam); c.title = u.title; c.text = u.text; return c; });
      if (!gcards.length) gcards = [newGridCard(fam), newGridCard(fam)];
      if (gu.trailing && gu.trailing.length) s.afterText = gu.trailing.join('\n\n'); // завершающий абзац → текст под блоком
      var gHead = headText || gu.heading;
      s.family = fam; s.level = (headText ? (sec.heading && sec.heading.level) : gu.headingLevel) || 2; s.cards = gcards;
      if (!headText && gu.heading) s.titleSize = 2; // подзаголовок на вынос (h3) → title-2
      var gv = variant != null ? variant : (secHasImg(sec) ? '1' : '0');
      s.gridVariant = gv;
      if (gv !== '0') { s.heading = gHead; s.paragraphs = gu.lead.length ? gu.lead : ['']; s.img = IMG_PANEL; s.intro = ''; }
      else { s.title = gHead; s.intro = gu.lead.join('\n\n'); }
    } else if (kind === 'bigimage') { // «Текст на большой картинке» — заголовок + текст поверх фоновой картинки (деления на лево/право нет)
      s.level = (sec.heading && sec.heading.level) || 2;
      var bigHead = headText, bigPs = [];
      sec.items.forEach(function (it) {
        if (it.type === 'sub') { if (!bigHead) bigHead = it.text; else bigPs.push(it.text); }
        else if (it.type === 'p') bigPs.push(it.text);
        else if (it.type === 'list') it.items.forEach(function (x) { bigPs.push(x); });
      });
      s.title = bigHead; s.paragraphs = bigPs.length ? bigPs : [''];
      s.bg = BIG_BG; s.bgMobile = BIG_BG_M; // фон — плейсхолдер из справочника, пользователь заменит
      s.button = ''; s.href = ''; s.secTitle = ''; s.secIntro = ''; s.navLabel = '';
      return { kind: kind, slots: s };
    } else { // panel — «Текст с картинкой»
      s.heading = headText; s.level = (sec.heading && sec.heading.level) || 2;
      var imgCount = 0; sec.items.forEach(function (it) { if (it.type === 'image') imgCount++; });
      var leadHandled = false;
      if (imgCount >= 2) {
        // много картинок → делим внутри на N панелей по подзаголовкам/картинкам, вводный текст (до первого подзаголовка) — в лид.
        // СПИСОК остаётся списком внутри своей панели: в «Текст с картинкой» пункты НЕ разносятся по отдельным блокам —
        // это делают только осознанно выбранные Карточки / Плашки / Слайдер.
        var plead = [], units = [], u = null, started = false;
        function nu() { var p = { heading: '', level: 3, paragraphs: [], hasImg: false, imgSrc: '' }; units.push(p); u = p; return p; }
        sec.items.forEach(function (it) {
          if (it.type === 'image') { if (!u) nu(); u.hasImg = true; if (it.src && !u.imgSrc) u.imgSrc = it.src; return; } // картинка = плейсхолдер текущей панели/граница
          else if (it.type === 'sub') { nu(); u.heading = it.text; u.level = it.level; started = true; }
          else if (it.type === 'list') { if (!u) nu(); u.paragraphs.push({ ordered: !!it.ordered, items: it.items.slice() }); started = true; } // список → буллеты внутри панели
          // отдельно стоящая ссылка на отель (видимый текст — сам URL) → кнопка «Выбрать тур» у этой панели
          else if (it.type === 'link') { if (!u) nu(); if (!u.btnHref && it.url) { u.btnHref = String(it.url).replace(/[?#].*$/, ''); u.btnText = CA.CTA_TEXT; } }
          else if (it.type === 'p') { if (!started) plead.push(it.text); else { if (!u) nu(); u.paragraphs.push(it.text); } }
        });
        if (!units.length) nu();
        var leadInBlk = !!sec.leadInBlock; // переключатель из импорта: вводный абзац — внутрь первого блока
        if (leadInBlk && plead.length && units.length) { units[0].paragraphs = plead.concat(units[0].paragraphs); plead = []; }
        s.intro = plead.join('\n\n');
        s.panels = units.map(function (p) { return { heading: p.heading, level: p.level, paragraphs: p.paragraphs.length ? p.paragraphs : [''], img: (imgCount > 0 && !p.hasImg) ? '' : (p.imgSrc || IMG_PANEL), btnText: p.btnText || '', btnHref: p.btnHref || '' }; });
      } else {
        // 0–1 картинки: части строим по подзаголовкам/абзацам; картинку привязываем к её части,
        // остальным частям картинку НЕ даём (панель без картинки → «просто текст»). Задача: текст с картинкой только там, где картинка есть.
        var panels = [], cur = null, pendImg = false, pendSrc = '';
        function np() { var p = { heading: '', level: 3, paragraphs: [], hasImg: false, imgSrc: '' }; panels.push(p); return p; }
        function take() { if (pendImg) { if (cur) { cur.hasImg = true; if (pendSrc && !cur.imgSrc) cur.imgSrc = pendSrc; } pendImg = false; pendSrc = ''; } }
        sec.items.forEach(function (it) {
          if (it.type === 'image') { if (cur && !cur.hasImg) { cur.hasImg = true; if (it.src) cur.imgSrc = it.src; } else { pendImg = true; pendSrc = it.src || ''; } }
          else if (it.type === 'sub') { cur = np(); cur.heading = it.text; cur.level = it.level; take(); }
          else if (it.type === 'p') { if (!cur) cur = np(); take(); cur.paragraphs.push(it.text); }
          else if (it.type === 'list') { if (!cur) cur = np(); take(); cur.paragraphs.push({ ordered: !!it.ordered, items: it.items.slice() }); }
          // отдельно стоящая ссылка на отель (видимый текст — сам URL) → кнопка «Выбрать тур» у этой части
          else if (it.type === 'link') { if (!cur) cur = np(); if (!cur.btnHref && it.url) { cur.btnHref = String(it.url).replace(/[?#].*$/, ''); cur.btnText = CA.CTA_TEXT; } }
        });
        if (!panels.length) np();
        s.panels = panels.map(function (p) { return { heading: p.heading, level: p.level, paragraphs: p.paragraphs.length ? p.paragraphs : [''], img: (imgCount > 0 && !p.hasImg) ? '' : (p.imgSrc || IMG_PANEL), btnText: p.btnText || '', btnHref: p.btnHref || '' }; });
      }
      // часть без собственного H2 секции, но начинающаяся с подзаголовка → он становится заголовком блока (над блоком / внутри — по переключателю)
      if (!leadHandled && !headText && s.panels && s.panels.length && s.panels[0].heading) {
        s.heading = s.panels[0].heading; s.level = s.panels[0].level || 3; s.titleSize = 2;
        s.panels[0].heading = ''; s.panels[0].level = 3;
      }
      promoteLoneLinkHeadings(s.panels); // строка-ссылка в начале панели → заголовок панели с уровнем «П»
      if (variant === 'inside') s.headingInside = true; // заголовок секции — внутри первого блока (b12_2)
    }
    // навигацию из заголовков не заполняем автоматически — не все блоки нужны в меню (заполняется вручную)
    return { kind: kind, slots: s };
  }

  function impIdx(id) { for (var i = 0; i < state.blocks.length; i++) if (state.blocks[i]._id === id) return i; return -1; }
  function secIds(secIdx) { return (importMap[secIdx] && importMap[secIdx].ids) || []; }
  function secLive(secIdx) { return secIds(secIdx).map(impIdx).filter(function (x) { return x >= 0; }); }
  function removeSectionBlocks(secIdx) {
    secLive(secIdx).sort(function (a, b) { return b - a; }).forEach(function (oi) { state.blocks.splice(oi, 1); });
    delete importMap[secIdx];
  }
  function importInsertPos(secIdx) {
    var prev = null, next = null;
    Object.keys(importMap).forEach(function (k) { var si = +k; if (!secLive(si).length) return; if (si < secIdx && (prev === null || si > prev)) prev = si; if (si > secIdx && (next === null || si < next)) next = si; });
    var pos;
    if (prev !== null) pos = Math.max.apply(null, secLive(prev)) + 1;
    else if (next !== null) pos = Math.min.apply(null, secLive(next));
    else pos = state.blocks.length;
    var ci = -1; state.blocks.forEach(function (b, i) { if (b._contacts) ci = i; });
    if (ci >= 0 && pos > ci) pos = ci; // контакты всегда последние
    return pos;
  }

  // ---- Разделение секции на части (единый режим разметки) ----
  // паттерн «пункт списка → картинка → пункт → картинка»: равнозначные единицы, у каждой своя картинка.
  // В вёрстке это сетка Карточек, а не серия панелей «Текст с картинкой» (там список остался бы одним блоком).
  // Подзаголовки в части — признак другой структуры, там работает обычная логика панелей.
  function looksLikeCardGrid(items) {
    var seq = (items || []).filter(function (it) { return it.type === 'list' || it.type === 'image' || it.type === 'sub'; })
                           .map(function (it) { return it.type; });
    if (seq.indexOf('sub') >= 0) return false;
    var lists = 0, pairs = 0;
    for (var i = 0; i < seq.length; i++) {
      if (seq[i] === 'list') lists++;
      if (seq[i] === 'list' && seq[i + 1] === 'image' && seq[i + 2] === 'list') pairs++; // картинка разделяет два пункта
    }
    return lists >= 2 && pairs >= 1;
  }
  // тип части по умолчанию: пункты с картинками → «Карточки»; есть картинка → «Текст с картинкой»; нет → «Текстовый блок»
  function defaultPartKind(items) {
    if (looksLikeCardGrid(items)) return 'cards';
    return itemsImgCount(items) > 0 ? 'panel' : 'textpanel';
  }
  // авто-разбивка повторяющегося паттерна «абзац(ы) + картинка»: новый абзац после картинки → новая часть (своя панель).
  // возвращает позиции разрывов (индексы атомов). Срабатывает только на чистом паттерне из абзацев и картинок (без подзаголовков/списков).
  function autoImageCuts(items) {
    items = items || [];
    if (itemsImgCount(items) < 2) return [];                                   // паттерн повторяется только при 2+ картинках
    if (items.some(function (it) { return it.type === 'sub' || it.type === 'list'; })) return []; // подзаголовки/списки — своя логика панелей
    var cuts = [], curHasImg = false;
    for (var i = 0; i < items.length; i++) {
      var t = items[i].type;
      if (t === 'p') { if (curHasImg) { cuts.push(i); curHasImg = false; } }     // абзац после картинки → граница части
      else if (t === 'image') curHasImg = true;
    }
    return cuts;
  }
  // после изменения границ выравниваем ТОЛЬКО дефолтные типы (panel↔textpanel) под содержимое части;
  // осознанный выбор (Карточки/Плашки/Слайдер) не трогаем
  function normalizeDefaultKinds(secIdx) {
    var mp = importMap[secIdx], sec = tzState.result.sections[secIdx];
    var bounds = [0].concat(mp.cuts).concat([sec.items.length]);
    for (var j = 0; j < mp.kinds.length; j++) {
      var atoms = sec.items.slice(bounds[j], bounds[j + 1]), hasImg = itemsImgCount(atoms) > 0;
      if (mp.kinds[j] === 'panel' && !hasImg) mp.kinds[j] = 'textpanel';
      else if (mp.kinds[j] === 'textpanel' && hasImg) mp.kinds[j] = 'panel';
      // «Текст под блоком» допустим только для части-абзацев не на первом месте; иначе возвращаем к обычному типу
      else if (mp.kinds[j] === 'after' && j === 0) mp.kinds[j] = hasImg ? 'panel' : 'textpanel'; // «Текст под блоком» нельзя для первой части
    }
  }
  function placeSection(secIdx, mode) { // одиночное оформление всей секции блоком mode
    removeSectionBlocks(secIdx);
    var sec = tzState.result.sections[secIdx];
    var blk = blockFromSection(mode, sec); blk._id = 'imp' + (++importSeq);
    var pos = importInsertPos(secIdx);
    state.blocks.splice(pos, 0, blk);
    importMap[secIdx] = { ids: [blk._id], mode: mode, kinds: [mode] };
    relayoutImages();
  }
  // границы частей (cuts) + типы (kinds) + варианты шапки (variants) → спецификации блоков
  function splitChunks(sec, cuts, kinds, variants, leadBlk) {
    var atoms = sec.items || [], bounds = [0].concat(cuts).concat([atoms.length]), specs = [];
    for (var j = 0; j < bounds.length - 1; j++) {
      specs.push({ kind: kinds[j], variant: variants ? variants[j] : undefined, sub: { heading: (j === 0 ? sec.heading : null), items: atoms.slice(bounds[j], bounds[j + 1]), leadInBlock: leadBlk ? !!leadBlk[j] : false } });
    }
    return specs;
  }
  // часть из одного абзаца (plain <p>)
  function isLonePara(items) { return items && items.length === 1 && items[0].type === 'p'; }
  // часть только из абзацев (без картинок, подзаголовков, списков) — её можно увести в «Текст под блоком»
  function isPlainParas(items) { return !!(items && items.length) && items.every(function (it) { return it.type === 'p'; }); }
  // «Текст под блоком» задаётся явно: тип части === 'after' (сворачивается в afterText предыдущего блока)
  function partIsAfter(kind) { return kind === 'after'; }
  // есть ли в секции части-«добавки» (kind==='after') — тогда число блоков ≠ числу частей
  function sectionHasFold(secIdx) {
    var mp = importMap[secIdx];
    if (!mp || mp.mode !== 'split') return false;
    for (var j = 1; j < mp.kinds.length; j++) { if (partIsAfter(mp.kinds[j])) return true; }
    return false;
  }
  // сигнатура части: тип + вариант шапки + заголовок + содержимое атомов. Меняется при смене типа/варианта/lead —
  // тогда блок пересобирается заново (а не восстанавливается из снимка), иначе переключатели шапки «залипают».
  function partSig(kind, sub, variant, leadInBlock) {
    var h = sub.heading ? (sub.heading.level + ':' + sub.heading.text) : '';
    var body = (sub.items || []).map(function (it) {
      return it.type + ':' + (it.type === 'list' ? (it.items || []).join('¦') : it.type === 'table' ? 'tbl' : (it.text || it.url || ''));
    }).join('|');
    return kind + '§v=' + (variant == null ? '' : variant) + '§L=' + (leadInBlock ? 1 : 0) + '§' + h + '§' + body;
  }
  // пересобрать блоки секции из cuts/kinds/variants (mp сохраняется)
  function rebuildSplit(secIdx) {
    var mp = importMap[secIdx], sec = tzState.result.sections[secIdx];
    // снимок ручных правок текущих блоков секции: сигнатура части → {slots, override}; + память размеров заголовков по тексту
    var keep = {}, headSizes = {};
    function recHead(txt, ts) { if (txt && ts != null) headSizes[String(txt).replace(/<[^>]+>/g, '').trim()] = ts; }
    (mp.ids || []).forEach(function (id) {
      if (!id) return; var idx = impIdx(id); if (idx < 0) return; var b = state.blocks[idx]; if (!b) return;
      if (b._sig) keep[b._sig] = { slots: b.slots, override: b.override, margin: b._margin };
      if (b.slots) { recHead(b.slots.heading || b.slots.title, b.slots.titleSize); (b.slots.panels || []).forEach(function (p) { recHead(p.heading, p.titleSize); }); }
    });
    secLive(secIdx).sort(function (a, b) { return b - a; }).forEach(function (oi) { state.blocks.splice(oi, 1); });
    var specs = splitChunks(sec, mp.cuts, mp.kinds, mp.variants, mp.leadBlk), pos = importInsertPos(secIdx), ids = [], ins = 0, lastBlk = null;
    specs.forEach(function (sp, t) {
      // часть-«добавка» (kind==='after', не первая): все её абзацы уходят в «Текст под блоком» предыдущего блока,
      // своим блоком не становится (держим null-дырку в ids, чтобы pj↔часть совпадали)
      if (t > 0 && partIsAfter(sp.kind) && lastBlk) {
        var addTxt = sp.sub.items.filter(function (it) { return it.type === 'p' || it.type === 'list'; }).map(function (it) { return it.type === 'list' ? it.items.join('\n') : it.text; }).join('\n\n');
        if (addTxt) lastBlk.slots.afterText = (lastBlk.slots.afterText ? lastBlk.slots.afterText + '\n\n' : '') + addTxt;
        ids.push(null); return;
      }
      // 'after' без предыдущего блока (крайний случай) — оформляем как обычный текстовый блок
      var sk = (partIsAfter(sp.kind)) ? 'textpanel' : sp.kind;
      var sig = partSig(sk, sp.sub, sp.variant, sp.sub && sp.sub.leadInBlock);
      var blk = blockFromSection(sk, sp.sub, sp.variant); blk._id = 'imp' + (++importSeq); blk._tight = effTight(mp, t); blk._margin = effMargin(mp, t, sec); blk._sig = sig;
      if (keep[sig]) {
        var baseAfter = blk.slots.afterText; // «Текст под блоком» из содержимого части (до сворачивания) — чтобы не копился при каждой пересборке
        blk.slots = keep[sig].slots; blk.slots.afterText = baseAfter;
        if (keep[sig].override != null) blk.override = keep[sig].override;
        if (keep[sig].margin != null) blk._margin = keep[sig].margin;
      }
      state.blocks.splice(pos + ins, 0, blk); ins++;
      ids.push(blk._id); lastBlk = blk;
    });
    mp.ids = ids; mp.chunks = specs;
    // вернуть сохранённые размеры заголовков на пересобранные блоки (правка размера переживает объединение/разделение)
    ids.forEach(function (id) {
      if (!id) return; var idx = impIdx(id); if (idx < 0) return; var bb = state.blocks[idx]; if (!bb.slots) return;
      var ht = String(bb.slots.heading || bb.slots.title || '').replace(/<[^>]+>/g, '').trim();
      if (ht && headSizes[ht] != null) bb.slots.titleSize = headSizes[ht];
      (bb.slots.panels || []).forEach(function (p) { var pt = String(p.heading || '').replace(/<[^>]+>/g, '').trim(); if (pt && headSizes[pt] != null) p.titleSize = headSizes[pt]; });
    });
    relayoutImages();
  }
  // разметить секцию как один блок по умолчанию (тип — по содержимому). Вызывается при импорте.
  function initSplit(secIdx) {
    var sec = tzState.result.sections[secIdx];
    var cuts = sec.isLead ? [] : autoImageCuts(sec.items); // «абзац + картинка ×N» → сразу N панелей (без ручного разделения)
    if (cuts.length) {
      var bounds = [0].concat(cuts).concat([sec.items.length]), kinds = [];
      for (var j = 0; j < bounds.length - 1; j++) kinds.push(itemsImgCount(sec.items.slice(bounds[j], bounds[j + 1])) > 0 ? 'panel' : 'textpanel');
      importMap[secIdx] = { mode: 'split', cuts: cuts, kinds: kinds, variants: kinds.map(function () { return undefined; }), ids: [], chunks: [] };
    } else {
      var k0 = sec.isLead ? 'text' : (isHotelRatingSection(sec) ? 'hotels' : defaultPartKind(sec.items)); // подводка → «Подводка»; секция с подзаголовками-ссылками → «Рейтинг отелей»; иначе по содержимому
      importMap[secIdx] = { mode: 'split', cuts: [], kinds: [k0], variants: [undefined], ids: [], chunks: [] };
    }
    rebuildSplit(secIdx);
  }
  // добавить разрыв перед атомом atomPos → делит текущую часть на две
  function splitAddCut(secIdx, atomPos) {
    var mp = importMap[secIdx]; if (!mp || mp.mode !== 'split') return;
    if (mp.cuts.indexOf(atomPos) >= 0) return;
    var sec = tzState.result.sections[secIdx], bounds = [0].concat(mp.cuts).concat([sec.items.length]), pj = 0;
    for (var j = 0; j < bounds.length - 1; j++) { if (atomPos > bounds[j] && atomPos < bounds[j + 1]) { pj = j; break; } }
    mp.cuts = mp.cuts.concat([atomPos]).sort(function (a, b) { return a - b; });
    mp.kinds.splice(pj + 1, 0, 'textpanel'); // временный, ниже выровняется по содержимому
    if (mp.variants) mp.variants.splice(pj + 1, 0, undefined);
    if (mp.tights) mp.tights.splice(pj + 1, 0, undefined); if (mp.margins) mp.margins.splice(pj + 1, 0, undefined);
    if (mp.leadBlk) mp.leadBlk.splice(pj + 1, 0, false);
    normalizeDefaultKinds(secIdx);
    // одиночный отделённый абзац по умолчанию уходит в «Текст под блоком» предыдущего (как раньше), но теперь это переключаемо
    var nb = [0].concat(mp.cuts).concat([sec.items.length]);
    if (isLonePara(sec.items.slice(nb[pj + 1], nb[pj + 2]))) mp.kinds[pj + 1] = 'after';
    rebuildSplit(secIdx); refreshAll(); renderParsed();
  }
  // убрать разрыв на позиции atomPos → объединить с предыдущей частью
  function splitRemoveCut(secIdx, atomPos) {
    var mp = importMap[secIdx]; if (!mp || mp.mode !== 'split') return;
    var k = mp.cuts.indexOf(atomPos); if (k < 0) return;
    mp.cuts.splice(k, 1); mp.kinds.splice(k + 1, 1); if (mp.variants) mp.variants.splice(k + 1, 1); if (mp.tights) mp.tights.splice(k + 1, 1); if (mp.margins) mp.margins.splice(k + 1, 1); if (mp.leadBlk) mp.leadBlk.splice(k + 1, 1);
    normalizeDefaultKinds(secIdx);
    rebuildSplit(secIdx); refreshAll(); renderParsed();
  }
  // пересобрать один блок части на месте (по текущим kind/variant)
  function rebuildPart(secIdx, pj) {
    var mp = importMap[secIdx];
    // при наличии «одиноких абзацев» число блоков ≠ числу частей → пересобираем секцию целиком
    if (sectionHasFold(secIdx)) return rebuildSplit(secIdx);
    var pos = impIdx(mp.ids[pj]);
    if (pos < 0) return rebuildSplit(secIdx);
    var sec = tzState.result.sections[secIdx], bounds = [0].concat(mp.cuts).concat([sec.items.length]);
    var sub = { heading: (pj === 0 ? sec.heading : null), items: sec.items.slice(bounds[pj], bounds[pj + 1]), leadInBlock: effLeadBlk(mp, pj) };
    var blk = blockFromSection(mp.kinds[pj], sub, mp.variants ? mp.variants[pj] : undefined); blk._id = 'imp' + (++importSeq); blk._tight = effTight(mp, pj); blk._margin = effMargin(mp, pj, sec); blk._sig = partSig(mp.kinds[pj], sub, mp.variants ? mp.variants[pj] : undefined, effLeadBlk(mp, pj));
    state.blocks.splice(pos, 1, blk); mp.ids[pj] = blk._id; if (mp.chunks[pj]) { mp.chunks[pj].kind = mp.kinds[pj]; mp.chunks[pj].variant = mp.variants ? mp.variants[pj] : undefined; }
    relayoutImages();
  }
  // сменить тип одной части (пересобрать только её блок на месте)
  function splitSetKind(secIdx, pj, kind) {
    var mp = importMap[secIdx]; if (!mp || mp.mode !== 'split' || pj >= mp.kinds.length) return;
    mp.kinds[pj] = kind;
    if (mp.variants) mp.variants[pj] = undefined; // сбрасываем вариант шапки — у нового типа своё авто-значение (в т.ч. panel над/внутри)
    rebuildPart(secIdx, pj);
    refreshAll(); renderParsed();
  }
  // сменить вариант шапки одной части (без картинки / с картинкой над / внутри)
  function splitSetVariant(secIdx, pj, variant) {
    var mp = importMap[secIdx]; if (!mp || mp.mode !== 'split' || pj >= mp.kinds.length) return;
    if (!mp.variants) mp.variants = mp.kinds.map(function () { return undefined; });
    mp.variants[pj] = variant;
    rebuildPart(secIdx, pj);
    refreshAll(); renderParsed();
  }
  // куда отнести абзац сразу после заголовка в «Текст с картинкой»: вводный над блоком / внутрь первого блока
  function splitSetLead(secIdx, pj, val) {
    var mp = importMap[secIdx]; if (!mp || mp.mode !== 'split' || pj >= mp.kinds.length) return;
    if (!mp.leadBlk) mp.leadBlk = mp.kinds.map(function () { return false; });
    mp.leadBlk[pj] = (val === 'block');
    rebuildPart(secIdx, pj);
    refreshAll(); renderParsed();
  }
  // сменить отступ блока/части сверху (класс обёртки) — меняем только модификатор, без пересборки блока.
  // работает и для разделённых секций (mp.ids[pj]), и для «цельных» блоков (таблица/вопросы/подводка — pj=0)
  function splitSetMargin(secIdx, pj, val) {
    var mp = importMap[secIdx]; if (!mp || !mp.ids || pj >= mp.ids.length) return;
    if (!mp.margins) mp.margins = mp.ids.map(function () { return undefined; });
    mp.margins[pj] = val;
    var idx = impIdx(mp.ids[pj]); if (idx >= 0) state.blocks[idx]._margin = val;
    refreshAll(); renderParsed();
  }
  function mapSection(secIdx, mode) { // одиночный выбор типа (кнопки «Оформить как»)
    var sec = tzState.result && tzState.result.sections[secIdx]; if (!sec) return;
    var prevMode = importMap[secIdx] ? importMap[secIdx].mode : null;
    if (prevMode === mode) { removeSectionBlocks(secIdx); relayoutImages(); } // повторный клик того же — снять
    else placeSection(secIdx, mode);
    refreshAll(); renderParsed();
  }
  function importedCount() { var n = 0; Object.keys(importMap).forEach(function (k) { n += secLive(+k).length; }); return n; }
  function addImportBlock(secIdx, kind, tweak) {
    var sec = tzState.result.sections[secIdx];
    var blk = blockFromSection(kind, sec); if (tweak) tweak(blk);
    blk._id = 'imp' + (++importSeq);
    importMap[secIdx] = { ids: [blk._id], mode: kind, kinds: [kind] };
    blk._margin = effMargin(importMap[secIdx], 0, sec); // отступ по умолчанию сразу, чтобы превью совпадало с выбором (в т.ч. «текст без заголовка» → уменьшенный)
    var pos = importInsertPos(secIdx);
    state.blocks.splice(pos, 0, blk);
    relayoutImages();
  }
  // авто: <h1> → баннер; подводка → подводка; вопросы → аккордеон; остальные секции → автосплит
  // заголовок секции (H2) сам является гиперссылкой — такую секцию оформляем как отель «Рейтинга отелей»
  function headingIsLink(sec) { return !!(sec && sec.heading && !sec.heading.isTitle && /<a\s+href=/i.test(sec.heading.text || '')); }
  // секция, которая ЦЕЛИКОМ является одним отелем: её заголовок — ссылка, и внутри нет своего списка отелей.
  // Если внутри уже есть подзаголовки-ссылки (отели), то заголовок-ссылка — это ЗАГОЛОВОК СЕКЦИИ, а не отель.
  function isWholeSectionHotel(sec) { return headingIsLink(sec) && !isFaqSection(sec) && !isHotelRatingItems(sec.items); }
  // подряд идущие секции-отели (каждый отель — своя H2-секция) → объединяем в одну секцию «Рейтинг отелей»:
  // заголовок-ссылка каждого становится подзаголовком-ссылкой, за ним — его картинка/текст. Дальше работает обычная логика hotels.
  function mergeLinkedHeadingSections(res) {
    var secs = res.sections || [], out = [], i = 0;
    while (i < secs.length) {
      if (isWholeSectionHotel(secs[i])) {
        var items = [];
        while (i < secs.length && isWholeSectionHotel(secs[i])) {
          var s = secs[i];
          items.push({ type: 'sub', level: (s.heading.level || 2), text: s.heading.text }); // заголовок-ссылка → подзаголовок-ссылка (отель)
          (s.items || []).forEach(function (it) { items.push(it); });
          i++;
        }
        out.push({ heading: null, items: items, isLead: false, _hotelsMerged: true });
      } else { out.push(secs[i]); i++; }
    }
    res.sections = out;
  }
  function autoMapAfterParse() {
    var secs = tzState.result.sections, titleIdx = -1, leadIdx = -1;
    secs.forEach(function (s, i) { if (s.heading && s.heading.isTitle) titleIdx = i; else if (s.isLead) leadIdx = i; });
    var leadPs = [], leadText = '', leadShort = false;
    if (leadIdx >= 0) {
      secs[leadIdx].items.forEach(function (it) { if (it.type === 'p') leadPs.push(it.text); });
      leadText = leadPs.join(' ').trim();
      leadShort = leadPs.length <= 1 && !!leadText && leadText.split(/\s+/).length <= 3;
    }
    if (titleIdx >= 0) addImportBlock(titleIdx, 'banner', leadShort ? function (blk) { blk.slots.subtitle = leadText; } : null);
    if (leadIdx >= 0 && !leadShort) initSplit(leadIdx); // подводка — делимая секция (часть 1 «Подводка»)
    secs.forEach(function (s, i) { if (isFaqSection(s) && !importMap[i]) addImportBlock(i, 'faq'); });
    secs.forEach(function (s, i) { if (hasTable(s) && !importMap[i]) addImportBlock(i, 'table'); });
    // содержательные секции сразу размечаем одним блоком (тип по содержимому); делить — вручную «＋ разделить здесь»
    secs.forEach(function (s, i) {
      if (importMap[i] || (s.heading && s.heading.isTitle) || s.isLead || isFaqSection(s) || hasTable(s)) return;
      initSplit(i);
    });
    // контакты в текстовке не бывают, но на странице почти всегда идут последними
    state.blocks.push({ kind: 'contacts', slots: defaults('contacts'), _id: 'imp' + (++importSeq), _contacts: true });
  }

  // определение выбранного шаблона страницы (из манифеста)
  function templateDef() { for (var i = 0; i < pageTemplates.length; i++) if (pageTemplates[i].id === importTemplate) return pageTemplates[i]; return null; }
  function templateHasSteps() { var d = templateDef(); return !!(d && d.steps && d.steps.length); }
  // Шаблон со стандартной последовательностью блоков («Расширение структуры» и т.п.):
  // динамику (баннер/подводка/вопросы) берём из текстовки дословно, фикс-блоки — из файлов шаблона.
  // секция-отель (для «Рейтинги отелей»): заголовок уровня ≥2, не баннер и не «Вопросы»
  function isHotelSection(s) { return !!(s.heading && !s.heading.isTitle && !isFaqSection(s)); }
  // один отель из подзаголовка-ссылки (H3 = ссылка): название = видимый текст ссылки, href = её адрес, ранг «N.» если есть
  function hotelUnitFromSub(txt) {
    var href = '', name = String(txt || '');
    var m = name.match(/<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (m) { href = m[1]; name = m[2]; }
    name = name.replace(/<[^>]+>/g, '').replace(/ /g, ' ').trim();
    var rm = name.match(/^\s*(\d+)\s*\.\s*([\s\S]+)$/); var rank = '';
    if (rm) { rank = rm[1] + '.'; name = rm[2].trim(); }
    href = href.replace(/[?#].*$/, ''); // чистый адрес отеля без трекинг-параметров (как в примерах справочника)
    return { rank: rank, name: name, href: href, paragraphs: [], img: IMG_PANEL };
  }
  // один отель из секции текстовки: ранг + название из заголовка, ссылка и картинка-плейсхолдер, абзацы — дословно
  function hotelFromSection(s) {
    var txt = (s.heading && s.heading.text) || '';
    var m = txt.match(/^\s*(\d+)\s*\.\s*([\s\S]+)$/);
    var rank = m ? m[1] + '.' : '';
    var name = m ? m[2].trim() : txt.trim();
    var href = '', himg = '';
    // ссылка на отель — информационная ссылка (coral.ru/hotels/…); картинка — отдельно (настоящая «image» → в шаблон)
    (s.items || []).forEach(function (it) { if (!href && it.type === 'link' && it.url) href = it.url; });
    (s.items || []).forEach(function (it) { if (!href && it.type === 'image' && it.url) href = it.url; }); // запас для старых текстовок
    (s.items || []).forEach(function (it) { if (!himg && it.type === 'image' && it.src) himg = it.src; });
    href = href.replace(/[?#].*$/, ''); // ссылка на отель — чистый адрес без трекинг-параметров (как в примерах)
    var paras = [];
    (s.items || []).forEach(function (it) {
      if (it.type !== 'p') return;
      var t = String(it.text || '').trim();
      if (!t) return;
      if (/^(image|img|фото|картинка|изображение)$/i.test(t)) return; // слово-плейсхолдер картинки — не текст
      if (/^url:\s/i.test(t)) return;
      paras.push(it.text);
    });
    return { rank: rank, name: name, href: href, paragraphs: paras.length ? paras : [''], img: himg || IMG_PANEL };
  }
  function applyTemplateSteps(def) {
    var secs = tzState.result.sections || [], res = tzState.result;
    var faqSec = null;
    secs.forEach(function (s) { if (!faqSec && !(s.heading && s.heading.isTitle) && isFaqSection(s)) faqSec = s; });
    var title = res.title || (function () { var t = secs.filter(function (s) { return s.heading && s.heading.isTitle; })[0]; return t ? t.heading.text : ''; })();
    // подводка — абзацы секций без собственного заголовка (кроме баннера/вопросов/секций-отелей), без строки url
    var leadParas = [];
    secs.forEach(function (s) {
      if (s.heading && s.heading.isTitle) return;
      if (isFaqSection(s)) return;
      if (isHotelSection(s)) return; // текст отелей уходит в блок «Рейтинг отелей», не в подводку
      (s.items || []).forEach(function (it) { if (it.type === 'p') { var t = String(it.text || '').trim(); if (t && !/^url:\s/i.test(t)) leadParas.push(it.text); } });
    });
    (def.steps || []).forEach(function (step) {
      var blk = null;
      if (step.type === 'banner') { var bs = defaults('banner'); bs.title = wrapBanner(title); bs.subtitle = ''; if (step.style === 'rating') { bs.imgDesktop = BAN_D_R; bs.imgMobile = BAN_M_R; bs.button = ''; } blk = { kind: 'banner', slots: bs }; } // у рейтингов — свои картинки и без кнопки (она у каждого отеля), CSS стандартный
      else if (step.type === 'lead') { var ls = defaults('text'); ls.paragraphs = leadParas.length ? leadParas.slice() : ['']; blk = { kind: 'text', slots: ls }; }
      else if (step.type === 'faq') { blk = faqSec ? blockFromSection('faq', faqSec) : { kind: 'faq', slots: defaults('faq') }; }
      else if (step.type === 'contacts') { blk = { kind: 'contacts', slots: defaults('contacts'), _contacts: true }; }
      else if (step.type === 'hotels') { var hl = defaults('hotels'); var hs = []; secs.forEach(function (s) { if (isHotelSection(s)) hs.push(hotelFromSection(s)); }); hl.hotels = hs.length ? hs : [newHotel()]; blk = { kind: 'hotels', slots: hl }; }
      else if (step.type === 'raw') { var rs = defaults('tplraw'); rs.html = tplFixed[step.file] || ''; rs.label = step.label || 'Блок шаблона'; rs.file = step.file; blk = { kind: 'tplraw', slots: rs }; }
      if (blk) { blk._id = 'imp' + (++importSeq); state.blocks.push(blk); }
    });
  }

  // .docx → нормализованный текст (заголовки как <hN>, пункты списка как «- »), затем общий парсер
  function docxToText(buf) {
    if (!FF) throw new Error('Библиотека распаковки не загружена');
    var files = FF.unzipSync(new Uint8Array(buf));
    var xml = files['word/document.xml'];
    if (!xml) throw new Error('это не похоже на .docx');
    // связи rId → URL (гиперссылки лежат в word/_rels/document.xml.rels)
    var rels = {}, relsF = files['word/_rels/document.xml.rels'];
    if (relsF) {
      var rd = new DOMParser().parseFromString(FF.strFromU8(relsF), 'application/xml'), rs = rd.getElementsByTagName('Relationship');
      for (var k = 0; k < rs.length; k++) { var id = rs[k].getAttribute('Id'), tgt = rs[k].getAttribute('Target'); if (id && tgt && /hyperlink/i.test(rs[k].getAttribute('Type') || '')) rels[id] = tgt; }
    }
    // текст узла по порядку: w:t → текст, w:br/w:cr → перенос строки, w:tab → пробел (мягкие переносы внутри абзаца сохраняем)
    function nodeText(node) {
      var s = '', k = node.childNodes;
      for (var i = 0; i < k.length; i++) {
        var n = k[i]; if (n.nodeType !== 1) continue;
        var tg = n.tagName;
        if (tg === 'w:t') s += n.textContent;
        else if (tg === 'w:br' || tg === 'w:cr') s += '\n';
        else if (tg === 'w:tab') s += ' ';
        else s += nodeText(n);
      }
      return s;
    }
    // Word нередко рвёт одну гиперссылку на несколько кусков (правки текста, проверка орфографии):
    // в абзаце подряд идут несколько <a> с одинаковым href. Склеиваем их обратно в одну ссылку —
    // иначе название отеля не опознаётся как строка-ссылка и не уходит в кнопку. Разные адреса не склеиваются.
    function mergeSplitLinks(s) {
      var prev;
      do {
        prev = s;
        s = s.replace(/<a href="([^"]+)" class="text">([\s\S]*?)<\/a>(\s*)<a href="\1" class="text">([\s\S]*?)<\/a>/g,
                      '<a href="$1" class="text">$2$3$4</a>');
      } while (s !== prev);
      return s;
    }
    // текст абзаца с сохранением гиперссылок как <a href="…" class="text">…</a>
    function isBoldRun(r) {
      var pr = r.getElementsByTagName('w:rPr')[0]; if (!pr) return false;
      var b = pr.getElementsByTagName('w:b')[0], rs = pr.getElementsByTagName('w:rStyle')[0];
      if (b) return !/^(0|false|none)$/i.test(b.getAttribute('w:val') || '');
      return !!rs && /strong|bold|полужир/i.test(rs.getAttribute('w:val') || '');
    }
    function paraText(p) {
      var out = '', kids = p.childNodes, lead = '', inLead = true;
      for (var q = 0; q < kids.length; q++) {
        var nd = kids[q]; if (nd.nodeType !== 1) continue;
        var tag = nd.tagName;
        if (tag === 'w:hyperlink') {
          var rid = nd.getAttribute('r:id') || nd.getAttribute('id'), url = rid && rels[rid], inner = nodeText(nd);
          out += (url && inner) ? '<a href="' + url + '" class="text">' + inner + '</a>' : inner; inLead = false;
        } else if (tag === 'w:r') {
          var rt = nodeText(nd); out += rt;
          if (inLead) { if (!rt.trim() || isBoldRun(nd)) lead += rt; else inLead = false; }
        }
        else if (tag === 'w:br' || tag === 'w:cr') { out += '\n'; inLead = false; }
      }
      // жирный пункт в начале абзаца («Атмосфера.», «Кому подходит:») переносим как <b>; жирное внутри текста — нет.
      // Пункт — короткий и кончается точкой/двоеточием (или это весь абзац), иначе это просто выделенное первое слово.
      var lt = lead.replace(/\s+$/, ''), lw = lt.match(/^\s*/)[0];
      if (lt.trim() && lt.length <= 80 && !/\n|https?:\/\//.test(lt) && (/[.:!?]$/.test(lt) || !out.slice(lt.length).trim()))
        out = lw + '<b>' + lt.slice(lw.length) + '</b>' + out.slice(lt.length);
      out = mergeSplitLinks(out) || nodeText(p);
      // абзац целиком из одной ссылки. Если видимый текст — сам URL (ссылка на сток-картинку/плейсхолдер) →
      // возвращаем «голый» URL, чтобы парсер отнёс его к картинкам. Если же текст осмысленный (подпись кнопки,
      // напр. «Подобрать туры во Вьетнам») → сохраняем <a>текст</a>: это кнопка-ссылка, а не картинка,
      // и блок из-за неё дробиться на части не должен.
      var whole = out.match(/^\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*$/i);
      if (whole) {
        var href = whole[1], label = whole[2].replace(/<[^>]+>/g, '').replace(/ /g, ' ').trim();
        if (!label || /^https?:\/\//i.test(label) || label === href) return href; // текст = URL → «голая» ссылка (картинка)
        return out; // подпись-кнопка → ссылка с текстом остаётся
      }
      return out;
    }
    function directKids(node, tag) { var out = [], k = node.childNodes; for (var i = 0; i < k.length; i++) if (k[i].nodeType === 1 && k[i].tagName === tag) out.push(k[i]); return out; }
    function cellText(tc) {
      var paras = tc.getElementsByTagName('w:p'), parts = [];
      for (var j = 0; j < paras.length; j++) { var t = paraText(paras[j]).replace(/\u00A0/g, ' ').replace(/<\/?b>/g, '').trim(); if (t) parts.push(t); } // \u0432\u0438\u0434 \u044F\u0447\u0435\u0435\u043A \u0437\u0430\u0434\u0430\u0451\u0442 \u0448\u0430\u0431\u043B\u043E\u043D \u0442\u0430\u0431\u043B\u0438\u0446\u044B
      return parts.join('<br>').replace(/\|/g, '/'); // разделитель таблицы не ломаем «|» из ячейки
    }
    function tblLines(tbl, lines) {
      var trs = directKids(tbl, 'w:tr'); if (!trs.length) return;
      lines.push('');
      trs.forEach(function (tr) { lines.push('| ' + directKids(tr, 'w:tc').map(cellText).join(' | ') + ' |'); });
      lines.push('');
    }
    // похож ли текст на заголовок: заголовки короткие. Длинный абзац со стилем «Заголовок» — ошибка редактора
    var HEAD_MAX = 120;
    function looksLikeHeading(t) {
      var s = String(t == null ? '' : t).replace(/<[^>]+>/g, '').replace(/ /g, ' ').trim();
      return !!s && s.length <= HEAD_MAX;
    }
    function pLine(p, lines) {
      var raw = paraText(p).replace(/ /g, ' ');
      var st = p.getElementsByTagName('w:pStyle')[0], sv = st ? (st.getAttribute('w:val') || '') : '';
      var lvl = 0, m = sv.match(/(?:heading|заголовок)\s*([1-6])/i) || sv.match(/^([1-6])$/); if (m) lvl = +m[1];
      var isList = p.getElementsByTagName('w:numPr').length > 0 || /^list/i.test(sv);
      var ordered = /number/i.test(sv);
      // абзац мог содержать мягкие переносы (w:br) — каждая строка обрабатывается отдельно
      var segs = raw.split('\n');
      for (var si = 0; si < segs.length; si++) {
        var txt = segs[si].trim();
        if (!txt) { lines.push(''); continue; }
        if (lvl) txt = txt.replace(/<\/?b>/g, ''); // заголовку жирный не нужен, а «<b><h1>…» мешал узнать уже проставленный <h1>
        // стиль «Заголовок N» в Word бывает проставлен по ошибке на обычном абзаце.
        // Явной пометки <hN> в тексте нет → берём за заголовок, только если текст похож на заголовок (короткий).
        if (lvl && si === 0 && !/^\s*(?:#{1,6}\s*)?<[hн][1-6]>/i.test(txt)) { if (looksLikeHeading(txt)) txt = '<h' + lvl + '>' + txt; }
        else if (isList && !/^\s*(?:[-–—•*·]|\d{1,2}[.)])\s/.test(txt)) txt = (ordered ? '1. ' : '- ') + txt;
        lines.push(txt);
      }
    }
    function walkBody(node, lines) {
      var k = node.childNodes;
      for (var i = 0; i < k.length; i++) {
        var nd = k[i]; if (nd.nodeType !== 1) continue;
        if (nd.tagName === 'w:p') pLine(nd, lines);
        else if (nd.tagName === 'w:tbl') tblLines(nd, lines);
        else if (nd.tagName === 'w:sdt' || nd.tagName === 'w:sdtContent') walkBody(nd, lines);
      }
    }
    var doc = new DOMParser().parseFromString(FF.strFromU8(xml), 'application/xml');
    var body = doc.getElementsByTagName('w:body')[0] || doc.documentElement, lines = [];
    walkBody(body, lines);
    return lines.join('\n');
  }

  // пройтись по разобранной текстовке и сделать «голые» ссылки кликабельными в тексте абзацев/пунктов
  function autolinkResult(res) {
    (res && res.sections || []).forEach(function (sec) {
      (sec.items || []).forEach(function (it) {
        if (it.type === 'p' || it.type === 'sub') it.text = autolink(it.text);
        else if (it.type === 'list' && it.items) it.items = it.items.map(autolink);
      });
    });
  }
  // ошибка разбора — в отдельный слот под полем ввода, НЕ затирая уже разобранный результат
  function importError(msg) {
    var e = document.getElementById('tz-err');
    if (e) { e.innerHTML = '<div class="tz-error">Не получилось разобрать: ' + esc(msg) + '</div>'; }
  }
  function clearImportError() { var e = document.getElementById('tz-err'); if (e) e.innerHTML = ''; }
  function importFromText(text, name, noAsk) {
    if (!TZ) return importError('парсер не загружен');
    if (!String(text || '').trim()) return importError('пустой текст'); // пустой ввод — только сообщение, результат и Сборщик не трогаем
    try {
      var res = TZ.parse(text);
      if (!res.sections.length) return importError('не найдено ни одного заголовка. Текст делится на блоки по заголовкам: стиль «Заголовок 1/2/3» в Word, <h2> или «H2: …» в начале строки');
      if (!noAsk && state.blocks.length && !confirm('Новый разбор заменит все блоки в Сборщике (' + state.blocks.length + ' шт.), включая ручные правки кода. Продолжить?')) return;
      tzState.result = res; tzState.fileName = name || ''; tzState.rawText = text;
      autolinkResult(tzState.result); // «голые» ссылки в тексте → <a class="text">
      state.blocks = []; // новая текстовка — Сборщик начинается с чистого листа (в т.ч. без ручных блоков)
      importMap = {}; tzUnlocked = {}; gapUnlocked = {}; clearImportError();
      var def = templateDef();
      if (def && def.steps && def.steps.length) applyTemplateSteps(def); // шаблон со стандартной структурой
      else { mergeLinkedHeadingSections(tzState.result); autoMapAfterParse(); } // Статья/Каталог: сначала склеиваем секции-отели (заголовок-ссылка)
      refreshAll(); renderParsed();
    }
    catch (e) { importError(e.message || String(e)); }
  }
  function importFromFile(file) {
    if (!file) return;
    var ta = document.getElementById('tz-text'); if (ta) ta.value = ''; // очищаем поле вставки при импорте файлом
    var name = file.name || '';
    if (/\.docx$/i.test(name)) {
      var r = new FileReader();
      r.onload = function () { try { importFromText(docxToText(r.result), name); } catch (e) { importError('не удалось прочитать .docx (' + (e.message || e) + ')'); } };
      r.onerror = function () { importError('не удалось открыть файл'); };
      r.readAsArrayBuffer(file);
    } else if (/\.(txt|md|markdown)$/i.test(name) || (file.type || '').indexOf('text') === 0) {
      var r2 = new FileReader(); r2.onload = function () { importFromText(String(r2.result || ''), name); }; r2.readAsText(file);
    } else importError('поддерживаются .docx и .txt/.md — для других форматов вставьте текст');
  }

  // ---- Редактирование импорта: удаление строк и вставка документа между блоками ----
  var insertAfterSec = -2; // позиция вставки документа: вставляем после секции с этим индексом (-1 — в начало)
  // пересборка индексов-ключей секций в importMap / tzUnlocked / gapUnlocked при сдвиге секций на delta (для секций >= fromIdx)
  function reindexImportMaps(fromIdx, delta) {
    var nm = {}; Object.keys(importMap).forEach(function (k) { var i = +k; nm[(i >= fromIdx ? i + delta : i)] = importMap[k]; }); importMap = nm;
    var nu = {}; Object.keys(tzUnlocked).forEach(function (k) { var i = +k; nu[(i >= fromIdx ? i + delta : i)] = tzUnlocked[k]; }); tzUnlocked = nu;
    var ng = {}; Object.keys(gapUnlocked).forEach(function (k) { var m = String(k).split('_'); var i = +m[0]; ng[((i >= fromIdx ? i + delta : i)) + '_' + m[1]] = gapUnlocked[k]; }); gapUnlocked = ng;
  }
  // разметить одну секцию по её содержимому (баннер/подводка/вопросы/таблица — иначе автосплит)
  function mapOneSection(i) {
    var s = tzState.result.sections[i]; if (!s) return;
    var ck = certainKind(s);
    if (ck) addImportBlock(i, ck); else initSplit(i);
  }
  // удалить одну строку (атом) секции из импорта; если секция без заголовка опустела — убрать её целиком
  function deleteImportAtom(secIdx, atomIdx) {
    var sec = tzState.result && tzState.result.sections[secIdx];
    if (!sec || !sec.items || atomIdx < 0 || atomIdx >= sec.items.length) return;
    sec.items.splice(atomIdx, 1);
    removeSectionBlocks(secIdx); // блоки этой секции и importMap[secIdx] сбрасываем, затем размечаем заново
    var hasHeading = !!(sec.heading && !sec.heading.isTitle);
    if (!sec.items.length && !hasHeading) {               // секция без заголовка опустела — удаляем секцию
      tzState.result.sections.splice(secIdx, 1);
      reindexImportMaps(secIdx + 1, -1);
    } else if (sec.items.length) {                        // остался контент — переразмечаем секцию
      mapOneSection(secIdx);
    }                                                      // остался только заголовок без контента — блок не нужен
    refreshAll(); renderParsed();
  }
  // прочитать файл-документ (.docx/.txt) в секции TZ и отдать их колбэку (без сброса текущего импорта)
  function parseDocToSections(file, cb) {
    if (!file || !TZ) { importError('парсер не загружен'); return; }
    var name = file.name || '', opt = { contentFromStart: true }; // вставляем весь документ — содержимое без шапки (таблицы/абзацы) не теряем
    if (/\.docx$/i.test(name)) {
      var r = new FileReader();
      r.onload = function () { try { var res = TZ.parse(docxToText(r.result), opt); autolinkResult(res); cb(res.sections || []); } catch (e) { importError('не удалось прочитать .docx (' + (e.message || e) + ')'); } };
      r.onerror = function () { importError('не удалось открыть файл'); };
      r.readAsArrayBuffer(file);
    } else if (/\.(txt|md|markdown)$/i.test(name) || (file.type || '').indexOf('text') === 0) {
      var r2 = new FileReader();
      r2.onload = function () { try { var res = TZ.parse(String(r2.result || ''), opt); autolinkResult(res); cb(res.sections || []); } catch (e) { importError(e.message || String(e)); } };
      r2.readAsText(file);
    } else importError('поддерживаются .docx и .txt/.md');
  }
  // секция-«мусор» для вставки: пустая или состоящая только из голых ссылок/картинок (служебная ссылка в начале дока — её пропускаем)
  function isNoiseSection(s) {
    if (s.heading && s.heading.text) return false;
    var items = s.items || [];
    if (!items.length) return true;
    return items.every(function (it) { return it.type === 'image' || it.type === 'link'; });
  }
  // вставить секции документа после секции afterSecIdx (-1 — в начало), разметить их блоками
  function insertDocSections(afterSecIdx, newSections) {
    newSections = (newSections || []).filter(function (s) { return s && ((s.items && s.items.length) || (s.heading && s.heading.text)); });
    newSections = newSections.filter(function (s) { return !isNoiseSection(s); }); // служебные ссылки/пустышки из начала дока отбрасываем
    if (!newSections.length) { importError('в документе не найдено содержимого для вставки'); return; }
    // вставленный документ — это содержимое страницы: снимаем метки «заголовок страницы»/«подводка», чтобы он не стал баннером/подводкой
    newSections.forEach(function (s) { if (s.heading && s.heading.isTitle) s.heading.isTitle = false; s.isLead = false; });
    clearImportError();
    var at = afterSecIdx + 1, ins = newSections.length;
    reindexImportMaps(at, ins); // освобождаем индексы под новые секции
    Array.prototype.splice.apply(tzState.result.sections, [at, 0].concat(newSections));
    for (var i = at; i < at + ins; i++) mapOneSection(i);
    refreshAll(); renderParsed();
  }

  function tzSecLabel(sec) {
    // в подписи секции — чистый текст заголовка: если заголовок сам является ссылкой, теги показывать не надо
    if (sec.heading && sec.heading.isTitle) return { badge: 'H1', title: stripTags(sec.heading.text), note: 'заголовок страницы → баннер (заполнено автоматически)' };
    if (sec.isLead) return { badge: '¶', title: 'Подводка', note: 'вводный текст под баннером → подводка (заполнено автоматически)' };
    if (sec.heading) return { badge: 'H' + sec.heading.level, title: stripTags(sec.heading.text), note: '' };
    return { badge: '¶', title: 'Текст без заголовка', note: '' };
  }
  function tzItemHtml(it) {
    if (it.type === 'p') return '<p class="tz-p">' + escLinks(it.text) + '</p>';
    if (it.type === 'sub') return '<div class="tz-sub"><span class="tz-badge tz-badge-sm">H' + it.level + '</span>' + escLinks(it.text) + '</div>';
    if (it.type === 'label') return '<div class="tz-label">' + esc(it.text) + '</div>';
    if (it.type === 'image') return '<div class="tz-img">🖼 <a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.url) + '</a>' + (it.src ? '' : '<span class="tz-atom-note">заглушка — заменить вручную</span>') + '</div>';
    if (it.type === 'link') return '<div class="tz-img tz-linkatom">🔗 <a href="' + esc(it.url) + '" target="_blank" rel="noopener">' + esc(it.url) + '</a><span class="tz-atom-note">информационная ссылка — в блок не идёт</span></div>';
    if (it.type === 'list') { var tag = it.ordered ? 'ol' : 'ul'; var st = (it.ordered && it.start && it.start !== 1) ? ' start="' + it.start + '"' : ''; return '<' + tag + ' class="tz-list"' + st + '>' + it.items.map(function (x) { return '<li>' + escLinks(x) + '</li>'; }).join('') + '</' + tag + '>'; }
    if (it.type === 'table') {
      var cell = function (c) { return escLinks(c).replace(/&lt;br\s*\/?&gt;/gi, '<br>'); };
      var th = (it.header || []).map(function (c) { return '<th>' + cell(c) + '</th>'; }).join('');
      var tb = (it.rows || []).map(function (r) { return '<tr>' + (r || []).map(function (c) { return '<td>' + cell(c) + '</td>'; }).join('') + '</tr>'; }).join('');
      return '<div class="tz-tblwrap"><table class="tz-tbl"><thead><tr>' + th + '</tr></thead><tbody>' + tb + '</tbody></table></div>';
    }
    return '';
  }
  function tzItemsHtml(items) { return items.map(tzItemHtml).join(''); }
  // Разметка секции в режиме разделения: части с цветовой меткой, выбор типа и разрывы между атомами
  function splitMarkHtml(sec, mp, si) {
    var atoms = sec.items || [], bounds = [0].concat(mp.cuts || []).concat([atoms.length]);
    var nParts = bounds.length - 1;
    var headHtml = sec.heading && !sec.heading.isTitle ? '<div class="tz-mk-secheading"><span class="tz-badge tz-badge-sm">H' + sec.heading.level + '</span>' + escLinks(sec.heading.text) + '</div>' : '';
    var out = '<div class="tz-mk">';
    for (var j = 0; j < bounds.length - 1; j++) {
      var c = j % SPLIT_TINTS, start = bounds[j], end = bounds[j + 1], partAtoms = atoms.slice(start, end);
      var partOpts = chunkKindsFor(partAtoms, sec.isLead);
      if (mp.kinds[j] === 'hotels' || isHotelRatingItems(partAtoms)) partOpts = [['hotels', 'Рейтинг отелей']].concat(partOpts); // подзаголовки-ссылки → доступен «Рейтинг отелей»
      var isAfter = j > 0 && partIsAfter(mp.kinds[j]); // «Текст под блоком» предыдущего блока
      var afterOpt = j > 0; // «Текст под блоком предыдущего» доступен всем частям, кроме первой
      var imgN = itemsImgCount(partAtoms); // счётчик картинок части (как у секции)
      var partChip = (!isAfter && imgN) ? '<span class="tz-chip tz-mk-chip">' + imgN + ' карт.</span>' : '';
      var vSel = mp.kinds[j] === 'panel'
        ? splitPanelHeadSel(effPanelHead(mp, j), si, j)
        : (VARIANTABLE[mp.kinds[j]] ? splitVariantSel(effVariant(mp, j, partAtoms, mp.kinds[j]), si, j) : '');
      // у части-«добавки» вариант шапки/отступ не нужны — вместо них подсказка, но сам выбор типа остаётся (можно вернуть обратно блоком)
      // подводка без разделения: выбор другого шаблона — под замком (как у «фиксированных» блоков); при разделении части меняются свободно
      var leadSingle = sec.isLead && nParts === 1, controls;
      if (leadSingle && !tzUnlocked[si]) {
        controls = '<span class="tz-split-sel tz-split-lockname">' + esc(KIND_NAME[mp.kinds[j]] || 'Подводка') + '</span>' +
          '<button class="cb-lock" data-lock="' + si + '" title="Разблокировать другие шаблоны">' + IC.lock + '</button>';
      } else {
        controls = splitKindSel(mp.kinds[j], si, j, partOpts, afterOpt) +
          (isAfter ? '<span class="tz-mk-fold">↳ в «Текст под блоком» предыдущего</span>' : vSel) +
          (leadSingle ? '<button class="cb-lock is-open" data-lock="' + si + '" title="Заблокировать выбор шаблона">' + IC.unlock + '</button>' : '');
      }
      // правый блок строки: замок отступа + «убрать разрыв» вплотную в правом углу (кнопка — у самого края)
      var marginLock = isAfter ? '' : marginCtrlUI(si, j, effMargin(mp, j, sec));
      var mergeBtn = (j > 0) ? '<button class="tz-mk-merge" data-mergecut="' + start + '" data-sec="' + si + '" title="Объединить с предыдущей частью">✕ убрать разрыв</button>' : '';
      var rightGroup = (marginLock || mergeBtn) ? '<span class="tz-mk-right">' + marginLock + mergeBtn + '</span>' : '';
      out += '<div class="tz-mk-group c' + c + (isAfter ? ' tz-mk-fold-group' : '') + '" data-sec="' + si + '" data-part="' + j + '">' +
        '<div class="tz-mk-part">' +
          '<span class="tz-mk-dot"></span>' + (nParts > 1 ? '<span class="tz-mk-pnum">Часть ' + (j + 1) + '</span>' : '<span class="tz-mk-pnum">Блок</span>') +
          partChip +
          controls +
          rightGroup +
        '</div>' +
        '<div class="tz-mk-atoms">' +
          (j === 0 && headHtml ? headHtml : '');
      for (var a = start; a < end; a++) {
        if (a > start) out += '<div class="tz-mk-split" data-addcut="' + a + '" data-sec="' + si + '"><span class="tz-mk-split-lbl">＋ разделить здесь</span></div>';
        out += '<div class="tz-mk-atom"><button class="tz-mk-atomdel" data-delatom="' + a + '" data-sec="' + si + '" title="Удалить эту строку из импорта">' + IC.close + '</button>' + tzItemHtml(atoms[a]) + '</div>';
      }
      out += '</div></div>';
    }
    return out + '</div>';
  }
  // мета-шапка страницы: H1, Title, Description, путь ссылки — каждое отдельной строкой с копированием
  function tzMetaHtml(res) {
    var m = res.meta || {};
    var rows = [['Заголовок H1', res.title || ''], ['Title', m.title || ''], ['Description', m.description || ''], ['Ссылка (путь)', m.url || '']]
      .filter(function (r) { return r[1]; });
    if (!rows.length) return '';
    return '<div class="tz-meta"><div class="tz-meta-h">Мета-данные страницы</div>' +
      rows.map(function (r) {
        return '<div class="tz-meta-row"><span class="tz-meta-lbl">' + esc(r[0]) + '</span>' +
          '<span class="tz-meta-val">' + esc(r[1]) + '</span>' +
          '<button class="tz-copy" data-copy="' + esc(r[1]) + '">' + IC.copy + '<span>Копировать</span></button></div>';
      }).join('') + '</div>';
  }
  // вид результата для шаблона со стандартной структурой (Расширение структуры и т.п.)
  function tplBlockPreview(b) {
    if (b.kind === 'banner') return String(b.slots.title || '').replace(/\s+/g, ' ').trim();
    if (b.kind === 'text') return (b.slots.paragraphs || []).join(' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (b.kind === 'faq') return (b.slots.items || []).length + ' вопрос(ов) из текстовки';
    if (b.kind === 'hotels') return (b.slots.hotels || []).length + ' отел(я/ей) из текстовки';
    if (b.kind === 'tplraw') return 'фикс-блок из файла data/' + (b.slots.file || '');
    if (b.kind === 'contacts') return 'стандартный блок';
    return '';
  }
  function renderTemplateParsed(host, res) {
    var def = templateDef();
    var head = '<div class="tz-result-head"><span class="tz-count">Шаблон: ' + esc(def.name) + '</span>' +
      (tzState.fileName ? '<span class="tz-file">' + esc(tzState.fileName) + '</span>' : '') +
      '<span class="tz-head-sp"></span><button class="tz-clear" id="tz-clear" title="Очистить и загрузить другой файл">Очистить</button></div>';
    var cnt = state.blocks.length;
    var bar = '<div class="tz-bar">' +
      '<span class="tz-bar-t">Собрано блоков: <b>' + cnt + '</b></span>' +
      '<span class="tz-bar-hint">Стандартная последовательность собрана автоматически — править вручную обычно не нужно. Код — в Сборщике.</span>' +
      '<button class="tz-open" id="tz-openbuilder"' + (cnt ? '' : ' disabled') + '>Открыть в Сборщике →</button></div>';
    var rows = state.blocks.map(function (b) {
      return '<div class="tz-tpl-row"><span class="tz-tpl-row-n">' + esc(blockName(b)) + '</span>' +
        '<span class="tz-tpl-row-s">' + esc(tplBlockPreview(b)) + '</span></div>';
    }).join('');
    var seq = '<div class="tz-tpl-seq"><div class="tz-tpl-seq-h">Блоки страницы (по шаблону)</div>' + rows + '</div>';
    host.innerHTML = head + tzMetaHtml(res) + bar + seq; // шапка страницы (H1, Title, Description, ссылка) — как у «Статьи»
  }
  // разрыв между секциями с кнопкой «вставить документ» (afterSi: -1 — в начало, иначе после секции afterSi)
  function tzInsertGap(afterSi) {
    return '<div class="tz-insert" data-insertdoc="' + afterSi + '" title="Вставить сюда содержимое другого документа (.docx, .txt, .md)">' +
      '<span class="tz-insert-line"></span><span class="tz-insert-btn">＋ вставить документ</span><span class="tz-insert-line"></span></div>';
  }
  function renderParsed() {
    var host = document.getElementById('tz-result'); if (!host) return;
    var res = tzState.result; if (!res) { host.innerHTML = ''; return; }
    if (templateHasSteps()) return renderTemplateParsed(host, res); // шаблон со стандартной структурой — свой вид
    var secs = res.sections || [];
    var cnt = importedCount();
    var head = '<div class="tz-result-head"><span class="tz-count">Разобрано секций: ' + secs.length + '</span>' +
      (tzState.fileName ? '<span class="tz-file">' + esc(tzState.fileName) + '</span>' : '') +
      '<span class="tz-head-sp"></span><button class="tz-clear" id="tz-clear" title="Очистить и загрузить другой файл">Очистить</button></div>';
    var bar = '<div class="tz-bar">' +
      '<span class="tz-bar-t">Собрано блоков: <b>' + cnt + '</b></span>' +
      '<span class="tz-bar-hint">Баннер, подводка, вопросы и контакты подставлены. Остальные секции размечены блоками — тип можно сменить, а секцию разбить на части через «＋ разделить здесь».</span>' +
      '<button class="tz-open" id="tz-openbuilder"' + (cnt ? '' : ' disabled') + '>Открыть в Сборщике →</button></div>';
    var body = secs.map(function (sec, si) {
      var L = tzSecLabel(sec), sum = TZ.summarize(sec);
      // показываем только счётчик картинок (абз./подзагол./сп. убраны для чистоты)
      var chips = [];
      if (sum.images) chips.push(sum.images + ' карт.');
      var chipsHtml = chips.length ? '<span class="tz-chips">' + chips.map(function (c) { return '<span class="tz-chip">' + esc(c) + '</span>'; }).join('') + '</span>' : '';
      var mp = importMap[si] || null, live = secLive(si), mapped = !!(mp && live.length);
      var certain = certainKind(sec), unlocked = !!tzUnlocked[si];
      var isSplit = !certain && !!mp; // содержательные секции — всегда единый режим разметки
      var mapFoot;
      if (certain) {
        // баннер / подводка / вопросы — фиксированный тип под замком (можно разблокировать альтернативы)
        var kinds = unlocked ? ALL_KINDS : [[certain, kindLabel(certain)]];
        var lockBtn = '<button class="cb-lock' + (unlocked ? ' is-open' : '') + '" data-lock="' + si + '" title="' + (unlocked ? 'Заблокировать выбор' : 'Разблокировать другие шаблоны') + '">' + (unlocked ? IC.unlock : IC.lock) + '</button>';
        var buttons = kinds.map(function (mk) {
          return '<button class="tz-map-btn' + (mp && mp.mode === mk[0] ? ' is-active' : '') + '" data-map="' + mk[0] + '" data-sec="' + si + '">' + esc(mk[1]) + '</button>';
        }).join('');
        mapFoot = '<div class="tz-map"><span class="tz-map-lbl">В Сборщике как:</span>' + buttons + lockBtn +
          (mapped ? '<span class="tz-map-ok">✓ добавлено</span>' : '') + '</div>';
      } else if (isSplit) {
        // единый режим: уравнение блоков (цветные чипы). Тип каждого блока меняется в разметке выше.
        var parts = mp.kinds.map(function (k, pj) {
          return '<span class="tz-split-chip c' + (pj % SPLIT_TINTS) + '">' + esc(KIND_NAME[k] || k) + '</span>';
        }).join('<span class="tz-split-plus">+</span>');
        mapFoot = '<div class="tz-foot tz-foot--split">' +
          '<div class="tz-split-info"><span class="tz-split-lbl">В сборщике как:</span>' + parts + '<span class="tz-map-ok">✓ добавлено</span></div>' +
          '</div>';
      } else {
        mapFoot = '';
      }
      var bodyHtml = isSplit ? splitMarkHtml(sec, mp, si) : tzItemsHtml(sec.items);
      // отступ сверху для «цельных» содержательных блоков (таблица/вопросы/подводка) — в шапке блока, как у частей разметки; баннер/контакты не трогаем
      var secMarginCtrl = (certain && mapped && (certain === 'table' || certain === 'faq' || certain === 'text'))
        ? '<span class="tz-sec-margin">' + marginCtrlUI(si, 0, effMargin(mp, 0, sec)) + '</span>' : '';
      var secHtml = '<div class="tz-sec' + (mapped ? ' tz-sec-done' : '') + (isSplit ? ' tz-sec-split' : '') + '" data-sec="' + si + '">' +
        '<div class="tz-sec-head"><span class="tz-badge">' + L.badge + '</span>' +
        '<span class="tz-sec-title">' + esc(L.title) + '</span>' + chipsHtml + secMarginCtrl + '</div>' +
        (L.note ? '<div class="tz-sec-note">' + esc(L.note) + '</div>' : '') +
        (isSplit ? '<div class="tz-mk-hint">Каждый блок — свой шаблон (по умолчанию с картинкой / без). Нужно разбить секцию на несколько блоков — жмите <b>＋ разделить здесь</b>; <b>✕ убрать разрыв</b> — объединить обратно.</div>' : '') +
        '<div class="tz-sec-body' + (isSplit ? ' tz-sec-body--mk' : '') + '">' + bodyHtml + '</div>' + mapFoot + '</div>';
      return (si === 0 ? tzInsertGap(-1) : '') + secHtml + tzInsertGap(si);
    }).join('');
    host.innerHTML = head + tzMetaHtml(res) + (secs.length ? bar + body : '<div class="tz-empty">Секции не найдены. Проверьте, что в документе есть заголовки (обычно h2).</div>');
  }

  function clearImport() {
    tzState.result = null; tzState.fileName = ''; importMap = {}; tzUnlocked = {}; gapUnlocked = {};
    state.blocks = state.blocks.filter(function (b) { return !b._id; }); refreshAll();
    var r = document.getElementById('tz-result'); if (r) r.innerHTML = '';
    var t = document.getElementById('tz-text'); if (t) t.value = '';
    var f = document.getElementById('tz-file'); if (f) f.value = '';
  }

  // панель выбора типа страницы (шаблона) в импорте
  function tzTemplateBar() {
    if (!pageTemplates.length) return '';
    var opts = pageTemplates.map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === importTemplate ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('');
    var cur = templateDef(), note = cur && cur.note ? '<div class="tz-tpl-note">' + esc(cur.note) + '</div>' : '';
    return '<div class="tz-tpl"><label class="tz-tpl-lbl">Тип страницы</label>' +
      '<select id="tz-tpl-sel" class="tz-tpl-sel">' + opts + '</select>' + note + '</div>';
  }
  function buildImportUI() {
    var root = document.getElementById('import-root'); if (!root) return;
    root.innerHTML =
      '<div class="tz-wrap">' +
        '<div class="cb-colhead"><span class="cb-h">Импорт текстовки</span></div>' +
        tzTemplateBar() +
        '<div class="tz-drop" id="tz-drop" tabindex="0">' +
          '<input type="file" id="tz-file" accept=".docx,.txt,.md,.markdown" hidden>' +
          '<div class="tz-drop-ico">' + IC.detach + '</div>' +
          '<div class="tz-drop-t">Перетащите .docx сюда или нажмите, чтобы выбрать</div>' +
          '<div class="tz-drop-s">Поддерживаются .docx и .txt/.md</div>' +
        '</div>' +
        '<div class="tz-or"><span>или вставьте текстовку</span></div>' +
        '<div class="tz-paste"><textarea id="tz-text" placeholder="Вставьте сюда текстовку…" spellcheck="false"></textarea>' +
          '<button class="cb-copy-all" id="tz-parse">Разобрать</button></div>' +
        '<div id="tz-err" class="tz-err-slot"></div>' +
        '<div id="tz-result"></div>' +
        '<input type="file" id="tz-insert-file" accept=".docx,.txt,.md,.markdown" hidden>' +
      '</div>';

    var insFile = document.getElementById('tz-insert-file');
    if (insFile) insFile.addEventListener('change', function () {
      if (insFile.files && insFile.files[0] && insertAfterSec > -2) {
        var at = insertAfterSec;
        parseDocToSections(insFile.files[0], function (secs) { insertDocSections(at, secs); });
      }
      insFile.value = ''; insertAfterSec = -2;
    });
    var drop = document.getElementById('tz-drop'), file = document.getElementById('tz-file');
    drop.addEventListener('click', function () { file.click(); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
    file.addEventListener('change', function () { if (file.files && file.files[0]) importFromFile(file.files[0]); file.value = ''; });
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('tz-drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); if (ev === 'dragleave' && drop.contains(e.relatedTarget)) return; drop.classList.remove('tz-drag'); }); });
    drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) importFromFile(f); });
    document.getElementById('tz-parse').addEventListener('click', function () { importFromText(document.getElementById('tz-text').value, 'вставленный текст'); });
    var tplSel = document.getElementById('tz-tpl-sel');
    if (tplSel) tplSel.addEventListener('change', function () {
      importTemplate = tplSel.value;
      var holder = tplSel.parentNode, old = holder.querySelector('.tz-tpl-note'); if (old) old.remove();
      var cur = templateDef(); if (cur && cur.note) { var dn = document.createElement('div'); dn.className = 'tz-tpl-note'; dn.textContent = cur.note; holder.appendChild(dn); }
      if (tzState.rawText) importFromText(tzState.rawText, tzState.fileName, true); // переразобрать текущую текстовку под новый шаблон
    });
    root.addEventListener('click', function (e) {
      var t = e.target; if (!t) return;
      if (t.id === 'tz-clear') return clearImport();
      if (t.id === 'tz-openbuilder') { if (!t.disabled) setMode('builder'); return; }
      var cp = t.closest ? t.closest('.tz-copy') : null;
      if (cp) {
        var txt = cp.dataset.copy || '';
        if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(function () { fallbackCopy(txt, window); }); else fallbackCopy(txt, window);
        cp.classList.add('cb-done'); var sp = cp.querySelector('span'); if (sp) { if (!sp.dataset.l) sp.dataset.l = sp.textContent; sp.textContent = 'Скопировано'; }
        clearTimeout(cp._t); cp._t = setTimeout(function () { cp.classList.remove('cb-done'); if (sp) sp.textContent = sp.dataset.l; }, 1500);
        return;
      }
      var del = t.closest ? t.closest('[data-delatom]') : null;
      if (del) return deleteImportAtom(+del.dataset.sec, +del.dataset.delatom);
      var ins = t.closest ? t.closest('[data-insertdoc]') : null;
      if (ins) { insertAfterSec = +ins.dataset.insertdoc; if (insFile) insFile.click(); return; }
      var ac = t.closest ? t.closest('[data-addcut]') : null;
      if (ac) return splitAddCut(+ac.dataset.sec, +ac.dataset.addcut);
      var mc = t.closest ? t.closest('[data-mergecut]') : null;
      if (mc) return splitRemoveCut(+mc.dataset.sec, +mc.dataset.mergecut);
      var gl = t.closest ? t.closest('[data-gaplock]') : null;
      if (gl) { var gkey = gl.dataset.gaplock + '_' + gl.dataset.gappart; gapUnlocked[gkey] = !gapUnlocked[gkey]; return renderParsed(); }
      var lk = t.closest ? t.closest('[data-lock]') : null;
      if (lk) {
        var si = +lk.dataset.lock, nowOpen = !tzUnlocked[si];
        tzUnlocked[si] = nowOpen;
        if (!nowOpen) { // замок закрыли → вернуть шаблон по умолчанию
          var sec0 = tzState.result.sections[si], ck = certainKind(sec0);
          if (ck) { placeSection(si, ck); refreshAll(); }
          else if (sec0 && sec0.isLead && importMap[si] && importMap[si].mode === 'split' && !(importMap[si].cuts || []).length) {
            // подводка без разделения: при закрытии замка возвращаем часть к «Подводке»
            var mp0 = importMap[si]; mp0.kinds[0] = 'text'; if (mp0.variants) mp0.variants[0] = undefined;
            rebuildSplit(si); refreshAll();
          }
        }
        return renderParsed();
      }
      var mb = t.closest ? t.closest('.tz-map-btn') : null;
      if (mb) return mapSection(+mb.dataset.sec, mb.dataset.map);
      // клик по конкретной части (или по секции) — доводим превью и код к её блоку
      if (!(t.closest && t.closest('button, select, input, textarea, a, [data-addcut], [data-mergecut], [data-delatom], [data-insertdoc], [data-lock], [data-gaplock], .tz-split-sel, .tz-split-vsel, .tz-split-gsel'))) {
        var partEl = t.closest ? t.closest('.tz-mk-group[data-part]') : null;
        if (partEl) {
          var psi = +partEl.dataset.sec, ppj = +partEl.dataset.part, pm = importMap[psi];
          var pid = pm && pm.ids ? pm.ids[ppj] : null, pbi = pid ? impIdx(pid) : -1;
          if (pbi >= 0) return syncFocusBlock(pbi, 'panel');
        }
        var secEl = t.closest ? t.closest('.tz-sec') : null;
        if (secEl && secEl.dataset.sec != null) { var fi = firstBlockOfSection(+secEl.dataset.sec); if (fi >= 0) syncFocusBlock(fi, 'panel'); }
      }
    });
    root.addEventListener('change', function (e) {
      var s = e.target;
      if (s && s.classList && s.classList.contains('tz-split-sel')) splitSetKind(+s.dataset.splitkindSec, +s.dataset.splitkindPart, s.value);
      else if (s && s.classList && s.classList.contains('tz-split-lsel')) splitSetLead(+s.dataset.splitleadSec, +s.dataset.splitleadPart, s.value);
      else if (s && s.classList && s.classList.contains('tz-split-vsel')) splitSetVariant(+s.dataset.splitvarSec, +s.dataset.splitvarPart, s.value);
      else if (s && s.classList && s.classList.contains('tz-split-gsel')) splitSetMargin(+s.dataset.splitmarginSec, +s.dataset.splitmarginPart, s.value);
    });
  }

  function isDesktop() { return window.matchMedia('(min-width: 881px)').matches; }
  var currentMode = 'reference';                       // активная вкладка
  var refScroll = 0;                                   // Справочник помнит свою (пиксельную) позицию

  // верхний видимый элемент вкладки (блок в Сборщике / секция в Импорте) — по положению относительно липкой шапки
  function topVisibleIndex(nodes, attr) {
    var tb = document.getElementById('topbar');
    var refY = (tb ? tb.getBoundingClientRect().bottom : 70) + 20;
    var chosen = -1, chosenTop = -Infinity, firstIdx = -1, firstTop = Infinity;
    [].forEach.call(nodes, function (el) {
      var idx = +el.getAttribute(attr), top = el.getBoundingClientRect().top;
      if (top < firstTop) { firstTop = top; firstIdx = idx; }
      if (top <= refY + 8 && top > chosenTop) { chosenTop = top; chosen = idx; }
    });
    return chosen >= 0 ? chosen : firstIdx;
  }
  function topBuilderBlock() { return topVisibleIndex(document.querySelectorAll('.cb-block[data-i]'), 'data-i'); }
  function topImportSection() { return topVisibleIndex(document.querySelectorAll('#tz-result .tz-sec[data-sec]'), 'data-sec'); }
  // прокрутить окно к блоку в Сборщике (с поправкой на липкую шапку) + мягкая подсветка
  function scrollBuilderToBlock(i) {
    var el = document.querySelector('.cb-block[data-i="' + i + '"]'); if (!el) return;
    var tb = document.getElementById('topbar'), off = (tb ? tb.getBoundingClientRect().bottom : 70) + 16;
    window.scrollTo({ top: Math.max(0, window.pageYOffset + el.getBoundingClientRect().top - off), behavior: 'instant' });
    el.classList.add('cb-flash'); clearTimeout(scrollBuilderToBlock._t);
    scrollBuilderToBlock._t = setTimeout(function () { el.classList.remove('cb-flash'); }, 1300);
  }

  // Сборщик↔Импорт: вместо общей позиции скролла переходим к элементам того же смыслового блока.
  // Сборщик и Импорт помнят последний блок, с которым работали (даже после захода в Справочник);
  // Справочник держит свою (пиксельную) позицию отдельно.
  var workBlock = -1;
  function setMode(mode) {
    if ((mode === 'builder' || mode === 'import') && !isDesktop()) mode = 'reference';
    var switching = mode !== currentMode, prev = currentMode;
    var curScroll = window.pageYOffset || document.documentElement.scrollTop || 0; // позиция на исходной вкладке в момент перехода
    if (switching) {
      if (currentMode === 'reference') refScroll = curScroll;
      else if (currentMode === 'builder') workBlock = topBuilderBlock();
      else if (currentMode === 'import') { var sc = topImportSection(); if (sc >= 0) workBlock = firstBlockOfSection(sc); }
    }
    document.body.classList.toggle('mode-builder', mode === 'builder');
    document.body.classList.toggle('mode-import', mode === 'import');
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.classList.toggle('is-active', b.dataset.mode === mode); });
    if (mode === 'builder' || mode === 'import') refreshOutputs();
    if (switching) {
      currentMode = mode;
      // блок-синхронизация — только при прямом переходе Сборщик↔Импорт и только если на исходной вкладке мы НЕ вверху;
      // если мы вверху (или переход не между соседними вкладками) — целевая вкладка тоже открывается с начала страницы.
      var syncBlocks = ((prev === 'builder' && mode === 'import') || (prev === 'import' && mode === 'builder')) && curScroll > 12;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (mode === 'reference') window.scrollTo({ top: refScroll || 0, behavior: 'instant' });
          else if (syncBlocks && workBlock >= 0) { if (mode === 'import') scrollImportToBlock(workBlock, true); else scrollBuilderToBlock(workBlock); }
          else window.scrollTo({ top: 0, behavior: 'instant' }); // переход на Сборщик/Импорт (не из соседней вкладки) — к началу
        });
      });
    }
  }
  function init() {
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode); }); });
    window.addEventListener('resize', function () { if (!isDesktop() && document.body.classList.contains('mode-builder')) setMode('reference'); });
    setupShellChrome();
    loadTemplates().then(function () {
      var had = restoreSaved(); buildUI(); setMode('reference');
      if (had) { refreshAll(); if (tzState.result) renderParsed(); } checkDrift().catch(function (e) { console.error('[сверка со справочником]', e); }); }).catch(function (e) {
      var root = document.getElementById('builder-root');
      if (root) root.innerHTML = '<p style="padding:24px;color:#b00">Не удалось загрузить шаблоны блоков. Откройте через локальный сервер.</p>';
      console.error(e);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
