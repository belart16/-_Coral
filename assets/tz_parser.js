/* Coral Builder — парсер текстовки (UMD: window.TZParser + Node).
   Разбирает текстовку на смысловые секции по заголовкам (<h2>), внутри — подзаголовки,
   абзацы, списки, картинки. Мета-шапку (Title/Description/ссылки/antiplagiat) и раздел
   Comments со сносками пропускает. Работает и на вставленном тексте, и на тексте из .docx.
   Ничего не «додумывает»: только то, что есть в документе. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TZParser = api;
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // <h2>… (с необязательным markdown-префиксом «## ») — самый надёжный сигнал заголовка.
  // Допускаем и кириллическую «Н» в маркере (<Н1>) — так его иногда пишут в текстовках.
  var HEAD_RE = /^\s*(?:#{1,6}\s*)?<[hн]([1-6])>\s*/i;
  // markdown-заголовок без литерала <hN>: уровень по числу «#»
  var MD_RE = /^\s*(#{1,6})\s+/;
  var CLOSE_RE = /\s*<\/[hн][1-6]>\s*$/i;
  // маркеры списка: -, –, —, •, *, ·
  var BULLET_RE = /^\s*[-–—•*·]\s+(.*)$/;
  // реплика прямой речи («— Было здорово, — говорит турист»): после запятой/!/?/… идёт тире — это не пункт списка
  var DIALOG_RE = /^\s*[-–—]\s+.*[,!?…]\s+[–—]\s/;
  // реплика без ремарки («— Вернёмся ещё!») сама неотличима от пункта, поэтому смотрим на соседей:
  // если в подряд идущих строках на тире есть хоть одна с ремаркой — это диалог, и все они абзацы
  var DASH_RE = /^\s*[-–—]\s+/;
  function dialogLines(lines) {
    var mark = [], i = 0;
    while (i < lines.length) {
      if (!DASH_RE.test(lines[i])) { i++; continue; }
      var j = i, hit = false;
      while (j < lines.length && DASH_RE.test(lines[j])) { if (DIALOG_RE.test(lines[j])) hit = true; j++; }
      if (hit) for (var k = i; k < j; k++) mark[k] = true;
      i = j;
    }
    return mark;
  }
  // номер пункта — до двух цифр: «1938. В этом году…» — абзац, а не список с 1938-го пункта
  var NUM_RE = /^\s*(\d{1,2})[.)]\s+(.*)$/;
  // строка целиком — ссылка (в т.ч. markdown [url](url))
  var URLONLY_RE = /^\s*\[?\s*(https?:\/\/[^\s\]]+)\s*\]?(?:\(([^)]*)\))?\s*$/i;
  // строка таблицы: начинается и заканчивается «|»
  var TABLE_ROW_RE = /^\|.*\|$/;
  function splitRow(line) { return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); }
  function isSepRow(cells) { return cells.length > 0 && cells.every(function (c) { return /^:?-{2,}:?$/.test(c.replace(/\s/g, '')); }); }

  function isMeta(line) {
    var l = line.trim();
    if (!l) return true;
    if (/^title\s*:/i.test(l)) return true;
    if (/^description\s*:/i.test(l)) return true;
    if (/text\.ru\/antiplagiat/i.test(l)) return true;
    if (/^\[\^/.test(l)) return true; // сноска [^c0]
    return false;
  }

  // метка уровня в самом тексте: «H2: …», «H2. …», «H2 – …», «(H2) …», «[H3] …», «Н2 …» (H латинская или Н кириллическая).
  // Рядом с <hN>/стилем Word — служебный дубль, вырезаем. Без них — сама метка и есть заголовок (уровень в Word не проставили).
  var HLABEL_RE = /^\s*[(\[{]?\s*[hн]\s?([1-6])(?![0-9a-zа-яё])\s*[)\]}]?\s*[:.)\-–—]?\s*/i;
  var HEAD_MAX = 120; // заголовки короткие: длинная строка с меткой — скорее абзац
  // {level, text} | null
  function asHeading(line) {
    line = line.replace(/<\/?b>/g, ''); // жирный пункт из .docx («<b>H2: …</b>») заголовку не мешает
    var m = line.match(HEAD_RE);
    if (m) return { level: +m[1], text: line.replace(HEAD_RE, '').replace(CLOSE_RE, '').replace(HLABEL_RE, '').trim() };
    var mm = line.match(MD_RE);
    if (mm) return { level: mm[1].length, text: line.replace(MD_RE, '').replace(CLOSE_RE, '').replace(HLABEL_RE, '').trim() };
    var lm = line.match(HLABEL_RE);
    if (lm) { var t = line.replace(HLABEL_RE, '').replace(CLOSE_RE, '').trim(); if (t && t.length <= HEAD_MAX) return { level: +lm[1], text: t }; }
    return null;
  }

  function urlOf(line) { var m = line.match(URLONLY_RE); return m ? m[1] : null; }
  // Классификация ссылок текстовки на три типа:
  //  1) гиперссылка со словом-меткой «image» → настоящая картинка (её URL финальный, идёт прямо в шаблон);
  //  2) сток-фото (shutterstock и т.п.) → картинка-заглушка (меняется вручную, в шаблоне — плейсхолдер);
  //  3) прочая «голая» ссылка (coral.ru/hotels/… и пр.) → информационная ссылка, НЕ картинка.
  var STOCK_RE = /shutterstock|istockphoto|gettyimages|depositphotos|unsplash\.com|pexels\.com|freepik|123rf|dreamstime|stock\.adobe|adobestock|fotolia|lori\.ru|vecteezy|envato/i;
  var IMG_EXT_RE = /\.(jpe?g|png|webp|gif|svg|avif|bmp|tiff?)(?:[?#]|$)/i;
  var IMG_CDN_RE = /_next\/image|content\.coral\.ru|\/resize[_/]|images?\.|cdn\.[^/]+\/.*\.(?:jpe?g|png|webp)/i;
  var IMG_LABEL_RE = /^\s*<a\s+[^>]*?href="([^"]+)"[^>]*>\s*(?:image|img|изображени[ея]|картинк[аи]|фото|photo|foto|рисун\w*)\s*<\/a>\s*$/i;
  function imageLinkOf(line) { var m = line.match(IMG_LABEL_RE); return m ? m[1] : null; }
  function classifyUrl(u) {
    if (STOCK_RE.test(u)) return { type: 'image', url: u };          // заглушка из шаблона
    if (IMG_EXT_RE.test(u) || IMG_CDN_RE.test(u)) return { type: 'image', url: u, src: u }; // прямая картинка → в шаблон
    return { type: 'link', url: u };                                 // информационная ссылка
  }
  // заголовок, который по сути только ссылка (редактор ошибочно выделил её в заголовок,
  // возможно кусками и с чужим href) → путь страницы без домена, иначе null
  function headingUrl(t) {
    var vis = String(t).replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    var compact = vis.replace(/\s+/g, '');
    if (!/https?:\/\//i.test(compact)) return null;
    // если после удаления всех URL-символов что-то осталось (обычные слова/кириллица) — это настоящий заголовок
    if (compact.replace(/[A-Za-z0-9:\/?#\[\]@!$&'()*+,;=._~%-]/g, '') !== '') return null;
    var m = vis.match(/https?:\/\/[^\/\s]+\/([\s\S]+)$/i);
    var pathPart = m ? m[1] : compact;
    return pathPart.replace(/\s+/g, '').replace(/[?#].*$/, '').replace(/^\/+|\/+$/g, '');
  }

  // короткая строка-подсказка автора о типе блока («Блок с отелями», «Карточки») — не абзац
  function looksLikeLabel(line) {
    var l = line.trim();
    if (l.length > 42) return false;
    return /^(блок|карточк|слайдер|таблиц|аккордеон|плашк|галере)/i.test(l);
  }

  function parse(raw, opts) {
    opts = opts || {};
    var lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n'), dialog = dialogLines(lines);
    var out = { title: null, sections: [], meta: {} };
    // contentFromStart: разбираем содержимое с самого начала, даже без заголовка (для вставки отдельного документа —
    // таблицы/абзацы без шапки не должны теряться). Обычный импорт оставляет мета-шапку до первого заголовка.
    var cur = null, list = null, seenHeading = !!opts.contentFromStart, stop = false, afterTitle = false, titleSec = null;

    function closeList() { if (list) { ensure(); cur.items.push(list); list = null; } }
    function ensure() { if (!cur) cur = { heading: null, items: [], isLead: afterTitle }; }
    function pushCur() { closeList(); if (cur && (cur.heading || cur.items.length)) out.sections.push(cur); cur = null; }
    function openSection(heading) { pushCur(); afterTitle = false; cur = { heading: heading || null, items: [] }; }
    // значение мета-поля (Title/Description) со следующей непустой строки, если после «:» на текущей строке пусто
    function metaValueBelow(idx) {
      var j = idx + 1; while (j < lines.length && !lines[j].trim()) j++;
      if (j >= lines.length) return null;
      var nxt = lines[j].trim();
      if (/^(title|description)\s*:/i.test(nxt) || asHeading(lines[j]) || /^https?:\/\//i.test(nxt)) return null; // не метка/заголовок/ссылка
      return { text: nxt, at: j };
    }

    for (var i = 0; i < lines.length && !stop; i++) {
      var rawLine = lines[i], line = rawLine.trim();
      // мета-шапка страницы: Title / Description / URL страницы — вынимаем отдельно, до основного разбора
      // мета-шапка: Title / Description. Значение может стоять на той же строке ИЛИ на следующей (частый случай из .docx)
      var tm = line.match(/^title\s*:\s*(.*)$/i);
      if (tm) { var tv = tm[1].trim(); if (!tv) { var mb = metaValueBelow(i); if (mb) { tv = mb.text; i = mb.at; } } if (tv) out.meta.title = tv; continue; }
      var dm = line.match(/^description\s*:\s*(.*)$/i);
      if (dm) { var dv = dm[1].trim(); if (!dv) { var mb2 = metaValueBelow(i); if (mb2) { dv = mb2.text; i = mb2.at; } } if (dv) out.meta.description = dv; continue; }
      // URL страницы в шапке: либо голая ссылка, либо с меткой «URL:» перед ней (как Title:/Description:)
      if (!seenHeading && !/text\.ru\/antiplagiat/i.test(line) && !imageLinkOf(line) && classifyUrl(line.replace(/^url\s*[:—-]\s*/i, '').trim()).type !== 'image') { /* сток/картинка до H1 — не адрес страницы */ var um = line.match(/^(?:url\s*[:—-]\s*)?https?:\/\/[^\/\s]+\/([^\s?#]+)/i); if (um) { out.meta.url = um[1].replace(/\/+$/, ''); continue; } }
      // «url: …» — адрес страницы, где бы ни стоял (в «Расширении структуры» он идёт после H1).
      // Word рвёт такую ссылку на куски с чужим href, поэтому берём видимый текст, а не адрес ссылки.
      var ul = line.match(/^url\s*[:—-]\s*(.+)$/i);
      if (ul) { var up = ul[1].replace(/<[^>]+>/g, '').replace(/\s+/g, '').match(/^https?:\/\/[^\/]+\/([^?#]+)/i); if (up) { if (!out.meta.url) out.meta.url = up[1].replace(/\/+$/, ''); continue; } }
      var h = asHeading(rawLine);

      if (h) {
        if (/^comments$/i.test(h.text)) { stop = true; break; }
        // редактор мог по ошибке выделить ссылку страницы в заголовок — это URL страницы, не секция и не баннер
        var hu = headingUrl(h.text);
        if (hu) { if (!out.meta.url && !/text\.ru\/antiplagiat/i.test(h.text)) out.meta.url = hu; continue; }
        seenHeading = true;
        if (h.level === 1) { pushCur(); out.title = h.text; titleSec = { heading: { level: 1, text: h.text, isTitle: true }, items: [] }; out.sections.push(titleSec); afterTitle = true; cur = null; continue; }
        if (h.level === 2) { openSection({ level: 2, text: h.text }); continue; }
        closeList(); ensure(); cur.items.push({ type: 'sub', level: h.level, text: h.text }); continue;
      }

      if (!line) { continue; } // пустая строка не рвёт список (в текстовке пункты часто разделены пустыми строками)
      if (!seenHeading) { continue; } // мета-шапка до первого заголовка — пропускаем
      if (isMeta(rawLine)) continue;

      // таблица: подряд идущие строки вида «| a | b | c |» (из .docx или markdown) → отдельная секция «где стоит по тексту»
      if (TABLE_ROW_RE.test(line)) {
        closeList();
        var trows = [], jj = i;
        while (jj < lines.length && TABLE_ROW_RE.test(lines[jj].trim())) { trows.push(splitRow(lines[jj].trim())); jj++; }
        trows = trows.filter(function (cells) { return !isSepRow(cells); }); // строку-разделитель «| --- | --- |» убираем
        // таблица-шапка «| title | description |» + строка значений — это мета страницы, а не блок «Таблица»
        var hdr = trows.length === 2 ? trows[0].map(function (c) { return c.replace(/<[^>]+>/g, '').trim().toLowerCase(); }) : [];
        if (hdr.length && hdr.every(function (c) { return c === 'title' || c === 'description'; })) {
          hdr.forEach(function (c, k) { var v = String(trows[1][k] || '').replace(/<[^>]+>/g, '').trim(); if (v && !out.meta[c]) out.meta[c] = v; });
          i = jj - 1; continue;
        }
        if (trows.length) {
          var tblItem = { type: 'table', header: trows[0], rows: trows.slice(1) };
          // Таблица остаётся В ТЕКУЩЕЙ секции, если до неё там были только абзацы (заголовок + вводный текст):
          // тогда блок «Таблица» получит свой заголовок и вводный абзац, а текст после таблицы — станет текстом под блоком.
          // Если в секции уже есть другое содержимое (картинки, списки, подзаголовки) — таблица идёт отдельной секцией, как раньше.
          // Подводка таблицу не забирает никогда: таблица под подводкой — всегда свой блок «Таблица».
          var inPlace = !!cur && !cur.isLead && (cur.items || []).every(function (it) { return it.type === 'p'; });
          if (inPlace) { cur.items.push(tblItem); }
          else {
            pushCur();
            out.sections.push({ heading: null, items: [tblItem] });
            afterTitle = false; cur = { heading: null, items: [] };
          }
        }
        i = jj - 1; continue;
      }

      var b = !dialog[i] && line.match(BULLET_RE), n = line.match(NUM_RE);
      if (b || n) {
        ensure();
        if (list && !!n !== list.ordered) closeList();
        if (!list) list = { type: 'list', ordered: !!n, items: [], start: n ? +n[1] : 1 };
        list.items.push((b ? b[1] : n[2]).trim());
        continue;
      }
      closeList();

      var il = imageLinkOf(line);
      if (il) {
        if (afterTitle && titleSec && !cur) { titleSec.items.push({ type: 'image', url: il, src: il }); continue; } // картинка сразу после H1 → баннер, не подводка
        ensure(); cur.items.push({ type: 'image', url: il, src: il }); continue; // «image» — настоящая картинка (финальная ссылка)
      }

      var u = urlOf(line);
      if (u) {
        var atom = classifyUrl(u); // сток → заглушка, прямая картинка → в шаблон, прочее → инфо-ссылка
        if (atom.type === 'image' && afterTitle && titleSec && !cur) { titleSec.items.push(atom); continue; } // ведущая картинка → баннер, не подводка
        ensure(); cur.items.push(atom); continue;
      }

      if (looksLikeLabel(line)) { ensure(); cur.items.push({ type: 'label', text: line }); continue; }

      ensure(); cur.items.push({ type: 'p', text: line });
    }
    pushCur();
    out.sections = splitAfterTable(out.sections);
    return out;
  }

  // Секция с таблицей: блок «Таблица» забирает заголовок, вводный текст и примечания-абзацы сразу под таблицей.
  // Если дальше в секции идёт другое содержимое (подзаголовки, картинки, списки) — оно уходит в свою секцию,
  // иначе блок «Таблица» поглотил бы его и структура текстовки потерялась бы.
  function splitAfterTable(sections) {
    var out = [];
    (sections || []).forEach(function (sec) {
      var queue = [sec];
      while (queue.length) {
        var s = queue.shift(), items = s.items || [], ti = -1;
        for (var i = 0; i < items.length; i++) if (items[i].type === 'table') { ti = i; break; }
        if (ti < 0) { out.push(s); continue; }
        var cut = ti + 1;
        while (cut < items.length && items[cut].type === 'p') cut++; // абзацы сразу под таблицей остаются с ней
        if (cut >= items.length) { out.push(s); continue; }
        out.push({ heading: s.heading, items: items.slice(0, cut), isLead: s.isLead });
        queue.unshift({ heading: null, items: items.slice(cut) });
      }
    });
    return out;
  }

  // Короткая сводка по секции для UI: сколько абзацев, списков, картинок, подзаголовков
  function summarize(section) {
    var s = { paras: 0, subs: 0, lists: 0, listItems: 0, images: 0, labels: 0, tables: 0 };
    section.items.forEach(function (it) {
      if (it.type === 'p') s.paras++;
      else if (it.type === 'sub') s.subs++;
      else if (it.type === 'list') { s.lists++; s.listItems += it.items.length; }
      else if (it.type === 'image') s.images++;
      else if (it.type === 'label') s.labels++;
      else if (it.type === 'table') s.tables++;
    });
    return s;
  }

  return { parse: parse, summarize: summarize, asHeading: asHeading };
});
