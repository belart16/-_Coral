
'use strict';

const COPY_SVG = '<svg class="copy-ico" viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M7 2.5h7A1.5 1.5 0 0 1 15.5 4v9A1.5 1.5 0 0 1 14 14.5H7A1.5 1.5 0 0 1 5.5 13V4A1.5 1.5 0 0 1 7 2.5Zm0 1.2A.3.3 0 0 0 6.7 4v9c0 .17.13.3.3.3h7a.3.3 0 0 0 .3-.3V4a.3.3 0 0 0-.3-.3H7ZM3.5 6.2v8.3A1.5 1.5 0 0 0 5 16h6.3v1.2H5A2.7 2.7 0 0 1 2.3 14.5V6.2H3.5Z"/></svg>';
const INFO_SVG = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 1.3a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4Zm-.9 5.7h1.8v5.2H9.1V8.5Zm.9-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"/></svg>';
const FS_SVG = '<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7.5V4h3.5M16 7.5V4h-3.5M4 12.5V16h3.5M16 12.5V16h-3.5"/></svg>';
// окно кода: тянется по высоте (resize) + кнопка «на весь экран»
function codeBox(vslug) {
  return '<div class="code-box"><button class="code-fs" type="button" data-fscode="' + vslug + '" title="Открыть код на весь экран" aria-label="На весь экран">' + FS_SVG + '</button>' +
    '<pre class="code" tabindex="0"><code id="code-' + vslug + '"></code></pre></div>';
}
const LABEL_RE = /^(css|html|js|javascript)(\s+expand\s+source)?$/i;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* короткий значок-чип для пункта (видно в свёрнутом меню как «структуру») */
function chipAbbr(name) {
  const parts = String(name).replace(/[«»().,]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  if (parts.length >= 2) return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  const base = parts[0] || String(name).trim();
  return base.charAt(0).toUpperCase() + (base.charAt(1) || '').toLowerCase();
}

function imgTag(folder, file, alt, cls) {
  const base = file.replace(/\.[^.]+$/, '');
  const mm = file.match(/\.([^.]+)$/);
  const stored = mm ? mm[1].toLowerCase() : 'png';
  const exts = [stored, 'png', 'jpg', 'jpeg', 'webp'].filter((v, i, a) => a.indexOf(v) === i);
  const list = exts.map((e) => folder + '/' + base + '.' + e);
  return '<img' + (cls ? ' class="' + cls + '"' : '') + ' loading="lazy" alt="' + esc(alt) +
    '" src="' + list[0] + '" data-exts=\'' + JSON.stringify(list) + '\' data-i="0" onerror="imgFallback(this)">';
}
window.imgFallback = function (img) {
  let list; try { list = JSON.parse(img.dataset.exts); } catch (e) { img.onerror = null; return; }
  const i = (+img.dataset.i || 0) + 1;
  if (i < list.length) { img.dataset.i = i; img.src = list[i]; }
  else { img.onerror = null; img.style.visibility = 'hidden'; }
};

let INSTR_IMAGES = {};   
let DESCRIPTIONS = {};   

/* рендер инструкции */
function imgRow(spec) {
  const parts = spec.split('|').map((s) => s.trim());
  const cells = [];
  for (let i = 0; i < parts.length - 1; i += 2) {
    const key = parts[i], alt = parts[i + 1];
    const file = INSTR_IMAGES[key];
    if (!file) continue;
    cells.push(
      '<figure class="help-cell">' + imgTag('img/instruction', file, alt, 'help-img') +
      '<figcaption>' + esc(alt) + '</figcaption></figure>');
  }
  return cells.length ? '<div class="help-img-row">' + cells.join('') + '</div>' : '';
}

function renderHelp(raw) {
  if (!raw) return '<p>Подробной инструкции для этого блока пока нет — смотрите спецификацию.</p>';
  let paras = raw.split('\n\n').map((s) => s.trim()).filter(Boolean);
  paras = paras.filter((p) => !(LABEL_RE.test(p.replace(/\u00a0/g, ' ').trim()) || p.toLowerCase().includes('expand source')));
  const p0 = paras[0];
  if (p0 && p0.length < 55 && !p0.includes('.') && !p0.includes('\n') && !p0.startsWith('#') && !p0.startsWith('[['))
    paras = paras.slice(1);
  if (!paras.length) return '<p>Подробной инструкции для этого блока пока нет — смотрите спецификацию.</p>';
  const out = [];
  for (const p of paras) {
    if (p.trim() === '[[WIP]]') { out.push('<p class="help-wip">Инструкция в разработке</p>'); continue; }
    const m = p.match(/^\[\[IMGROW:([\s\S]+?)\]\]\s*$/);
    if (m) { out.push(imgRow(m[1])); continue; }
    if (p.startsWith('## ')) {
      const head = p.slice(3).trim();
      const mn = head.match(/^(\d+\.)\s+([\s\S]*)$/);
      if (mn) out.push('<p class="help-h"><span class="help-hn">' + esc(mn[1]) + '</span> <strong>' + esc(mn[2]) + '</strong></p>');
      else out.push('<p class="help-h"><strong>' + esc(head) + '</strong></p>');
      continue;
    }
    if (p.startsWith('# ')) { out.push('<p class="help-h2"><strong>' + esc(p.slice(2).trim()) + '</strong></p>'); continue; }
    const e = esc(p).replace(/\n/g, '<br>').replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
    out.push('<p>' + e + '</p>');
  }
  return out.join('');
}

/* построение блоков и навигации */
function copyBtn(vslug, name, small) {
  const cls = small ? 'copy-btn sm' : 'copy-btn';
  return '<button class="' + cls + '" data-code="' + vslug + '" type="button" aria-label="Копировать код «' + esc(name) + '»">' +
    COPY_SVG + '<span class="copy-txt">Копировать</span></button>';
}
function helpBtn(slug, name) {
  return '<button class="help-btn" data-help="' + slug + '" data-title="' + esc(name) + '" type="button" ' +
    'aria-label="Инструкция к блоку «' + esc(name) + '»">' + INFO_SVG + '<span>Инструкция</span></button>';
}
function previewDiv(file, alt) {
  if (!file) return '';
  return '<div class="preview">' + imgTag('img/blocks', file, alt, '') + '</div>';
}

function build(data) {
  const total = data.groups.reduce((n, g) => n + g.blocks.length, 0);
  const heroT = document.getElementById('hero-title'); if (heroT) heroT.textContent = data.title;
  const heroS = document.getElementById('hero-subtitle'); if (heroS) heroS.innerHTML = (data.subtitle_html || '').replace('{TOTAL}', total);

  const nav = document.getElementById('nav');
  const root = document.getElementById('blocks-root');
  const navParts = [], mainParts = [], codeJobs = [];

  for (const group of data.groups) {
    navParts.push('<div class="nav-group"><div class="nav-grp-title"><span class="grp-ab">' + esc(chipAbbr(group.title)) + '</span><span class="grp-full">' + esc(group.title) + '</span></div>');
    mainParts.push('<h2 class="grp-head">' + esc(group.title) + '</h2>');
    for (const b of group.blocks) {
      navParts.push('<a class="nav-link" href="#' + b.slug + '" data-target="' + b.slug + '"><span class="nav-ico">' + esc(chipAbbr(b.name)) + '</span><span class="nav-txt">' + esc(b.name) + '</span></a>');
      const single = (b.variants.length === 1 && b.variants[0].label == null);
      const actions = helpBtn(b.slug, b.name) + (single ? copyBtn(b.variants[0].vslug, b.name, false) : '');
      let body =
        '  <div class="block-head">\n' +
        '    <div class="block-meta"><h3 class="block-title">' + esc(b.name) + '</h3>' +
        '<p class="block-purpose">' + esc(b.purpose) + '</p></div>\n' +
        '    <div class="head-actions">' + actions + '</div>\n' +
        '  </div>';
      if (single) {
        const v = b.variants[0];
        body += '\n  ' + previewDiv(v.preview, b.name) + codeBox(v.vslug);
        codeJobs.push(v);
      } else {
        for (const v of b.variants) {
          body += '\n  <div class="variant">\n    ' + previewDiv(v.preview, v.label) +
            '<div class="variant-head"><span class="variant-label">' + esc(v.label || '') + '</span>' +
            copyBtn(v.vslug, v.label || b.name, true) + '</div>\n' +
            '    ' + codeBox(v.vslug) + '\n  </div>';
          codeJobs.push(v);
        }
      }
      mainParts.push('<section class="block" id="' + b.slug + '" data-name="' + esc(b.name.toLowerCase()) + '">\n' + body + '\n</section>');
    }
    navParts.push('</div>');
  }
  nav.innerHTML = navParts.join('\n');
  root.innerHTML = mainParts.join('\n');
  return codeJobs;
}

/* загрузка кода блоков в <code> */
async function loadCode(v) {
  const el = document.getElementById('code-' + v.vslug);
  if (!el) return;
  try {
    const res = await fetch('data/' + v.code);
    let txt = res.ok ? await res.text() : '/* не удалось загрузить ' + v.code + ' */';
    // Страховка: убрать скрипт авто-перезагрузки, если сервер (напр. Live Server) его вставил
    txt = txt.replace(/\s*<!-- Code injected by live-server -->[\s\S]*?<\/script>/g, '');
    el.textContent = txt;
  } catch (e) {
    el.textContent = '/* ошибка загрузки ' + v.code + ' */';
  }
}

/* копирование, модалка, поиск, scroll-spy */
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch (e) {
    const ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta); return ok;
  }
}

function wire() {
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = document.getElementById('code-' + btn.dataset.code);
      const ok = await copyText(code ? code.textContent : '');
      const txt = btn.querySelector('.copy-txt');
      if (ok) {
        btn.classList.add('done'); txt.textContent = 'Скопировано';
        clearTimeout(btn._t);
        btn._t = setTimeout(() => { btn.classList.remove('done'); txt.textContent = 'Копировать'; }, 1600);
      } else { txt.textContent = 'Не удалось'; }
    });
  });

  /* открыть код на весь экран */
  var fsOv = document.getElementById('code-fs-overlay');
  if (!fsOv) {
    fsOv = document.createElement('div');
    fsOv.id = 'code-fs-overlay';
    fsOv.className = 'code-fs-overlay';
    fsOv.innerHTML =
      '<div class="code-fs-panel">' +
      '<div class="code-fs-head">' +
      '<button class="copy-btn code-fs-copy" type="button">' + COPY_SVG + '<span class="copy-txt">Копировать</span></button>' +
      '<button class="code-fs-close" type="button" title="Закрыть" aria-label="Закрыть">&times;</button>' +
      '</div>' +
      '<pre class="code-fs-pre"><code class="code-fs-code"></code></pre>' +
      '</div>';
    document.body.appendChild(fsOv);
  }
  var fsCode = fsOv.querySelector('.code-fs-code');
  var fsCopy = fsOv.querySelector('.code-fs-copy');
  var closeFs = function () { fsOv.classList.remove('open'); document.body.classList.remove('code-fs-on'); };
  document.querySelectorAll('.code-fs').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var code = document.getElementById('code-' + btn.dataset.fscode);
      fsCode.textContent = code ? code.textContent : '';
      fsOv.classList.add('open'); document.body.classList.add('code-fs-on');
    });
  });
  fsCopy.addEventListener('click', async function () {
    var ok = await copyText(fsCode.textContent);
    var txt = fsCopy.querySelector('.copy-txt');
    if (ok) {
      fsCopy.classList.add('done'); txt.textContent = 'Скопировано';
      clearTimeout(fsCopy._t);
      fsCopy._t = setTimeout(function () { fsCopy.classList.remove('done'); txt.textContent = 'Копировать'; }, 1600);
    } else { txt.textContent = 'Не удалось'; }
  });
  fsOv.querySelector('.code-fs-close').addEventListener('click', closeFs);
  fsOv.addEventListener('click', function (e) { if (e.target === fsOv) closeFs(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && fsOv.classList.contains('open')) closeFs(); });

  const modal = document.getElementById('modal');
  const mTitle = document.getElementById('modal-title');
  const mBody = document.getElementById('modal-body');
  const openHelp = (slug, title) => { mTitle.textContent = title; mBody.innerHTML = renderHelp(DESCRIPTIONS[slug]); modal.classList.add('open'); };
  const closeHelp = () => modal.classList.remove('open');
  document.querySelectorAll('.help-btn').forEach((b) => b.addEventListener('click', () => openHelp(b.dataset.help, b.dataset.title)));
  document.getElementById('modal-close').addEventListener('click', closeHelp);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeHelp(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeHelp(); });

  const search = document.getElementById('search');
  const blocks = [...document.querySelectorAll('.block')];
  const navlinks = [...document.querySelectorAll('.nav-link')];
  const grpHeads = [...document.querySelectorAll('.grp-head')];
  const empty = document.getElementById('empty');
  const blocksRoot = document.getElementById('blocks-root');
  const counter = document.getElementById('pager-counter');
  const isPhone = () => window.matchMedia('(max-width:880px)').matches; // пейджер — на всём мобильном диапазоне
  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase(); let any = false;
    blocks.forEach((b) => { const hit = !q || b.dataset.name.includes(q); b.classList.toggle('hide', !hit); if (hit) any = true; });
    navlinks.forEach((a) => { a.classList.toggle('hide', !!q && !a.textContent.toLowerCase().includes(q)); });
    grpHeads.forEach((h) => {
      let n = h.nextElementSibling, vis = false;
      while (n && !n.matches('.grp-head')) { if (n.classList.contains('block') && !n.classList.contains('hide')) { vis = true; break; } n = n.nextElementSibling; }
      h.classList.toggle('hide', !vis);
    });
    empty.classList.toggle('show', !any);
    if (isPhone()) { blocksRoot.style.display = any ? '' : 'none'; blocksRoot.scrollLeft = 0; updatePager(); }
  });

  const byId = Object.fromEntries(navlinks.map((a) => [a.dataset.target, a]));

  /* мобильная выезжающая панель навигации */
  const sidebar = document.getElementById('sidebar');
  const fab = document.getElementById('nav-toggle');
  const navClose = document.getElementById('nav-close');
  const backdrop = document.getElementById('nav-backdrop');
  const isMobile = () => window.matchMedia('(max-width:880px)').matches;
  const openNav = () => { sidebar.classList.add('open'); document.body.classList.add('nav-open'); if (fab) fab.setAttribute('aria-expanded', 'true'); };
  const closeNav = () => { sidebar.classList.remove('open'); document.body.classList.remove('nav-open'); if (fab) fab.setAttribute('aria-expanded', 'false'); };
  if (fab) fab.addEventListener('click', openNav);
  if (navClose) navClose.addEventListener('click', closeNav);
  if (backdrop) backdrop.addEventListener('click', closeNav);

  /* закрепление рельса открытым */
  const pin = document.getElementById('rail-pin');
  pin.addEventListener('click', () => {
    const on = document.body.classList.toggle('rail-pinned');
    pin.setAttribute('aria-pressed', on ? 'true' : 'false');
    pin.classList.toggle('is-active', on);
  });
  document.querySelector('.rail-brand').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  // при клике по пункту меню блокируем scroll-spy, чтобы подсветка не «пробегала»
  // по промежуточным блокам во время плавной прокрутки к цели
  let spyLocked = false, spyUnlockT = null;
  function lockSpy() {
    spyLocked = true;
    clearTimeout(spyUnlockT);
    spyUnlockT = setTimeout(() => { spyLocked = false; }, 1000);
  }
  window.addEventListener('scrollend', () => { spyLocked = false; });

  // при скролле страницы держим активный пункт видимым внутри самого левого меню (без прокрутки всей страницы)
  function revealNav(a) {
    if (!a) return;
    var cont = a.closest('.rail-inner'); if (!cont) return;
    var cr = cont.getBoundingClientRect(), ar = a.getBoundingClientRect(), pad = 10;
    if (ar.top < cr.top + pad) cont.scrollTop -= (cr.top + pad - ar.top);
    else if (ar.bottom > cr.bottom - pad) cont.scrollTop += (ar.bottom - (cr.bottom - pad));
  }
  function goToBlock(el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  navlinks.forEach((a) => a.addEventListener('click', (e) => {
    const el = document.getElementById(a.dataset.target);
    if (!el) return;
    e.preventDefault();
    navlinks.forEach((x) => x.classList.remove('active'));
    a.classList.add('active');
    revealNav(a);
    lockSpy();
    if (isPhone()) el.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    else goToBlock(el);
    if (isMobile()) closeNav();
  }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
  window.addEventListener('resize', () => { if (!isMobile()) closeNav(); if (!isPhone()) blocksRoot.style.display = ''; setupSpy(); });

  /* scroll-spy: десктоп — IntersectionObserver (вертикаль); телефон — горизонтальный пейджер */
  let io = null, rafPending = false;
  function updatePager() {
    if (!isPhone()) { if (counter) counter.textContent = ''; return; }
    const vis = blocks.filter((b) => !b.classList.contains('hide'));
    if (!vis.length) { if (counter) counter.textContent = ''; return; }
    const w = blocksRoot.clientWidth || 1;
    let idx = Math.round(blocksRoot.scrollLeft / w);
    idx = Math.max(0, Math.min(idx, vis.length - 1));
    navlinks.forEach((a) => a.classList.remove('active'));
    const a = byId[vis[idx].id]; if (a) a.classList.add('active');
    if (counter) counter.textContent = (idx + 1) + ' / ' + vis.length;
  }
  const onPagerScroll = () => { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; updatePager(); }); };
  function setActiveById(id) {
    navlinks.forEach((a) => a.classList.remove('active'));
    const a = byId[id]; if (a) { a.classList.add('active'); revealNav(a); }
  }
  // у самого верха/низа страницы IntersectionObserver-полоса не ловит крайние блоки — подсвечиваем их явно, чтобы меню возвращалось в начало/конец
  let edgePending = false;
  function edgeSpy() {
    if (isPhone() || spyLocked) return;
    const vis = blocks.filter((b) => !b.classList.contains('hide'));
    if (!vis.length) return;
    const cont = document.querySelector('.rail-inner');
    if (window.scrollY <= 4) { setActiveById(vis[0].id); if (cont) cont.scrollTop = 0; } // у верха — меню в самое начало (видны иконки «все блоки» и поиск)
    else if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) { setActiveById(vis[vis.length - 1].id); if (cont) cont.scrollTop = cont.scrollHeight; } // у низа — меню в самый конец
  }
  const onWinScroll = () => { if (edgePending) return; edgePending = true; requestAnimationFrame(() => { edgePending = false; edgeSpy(); }); };
  function setupSpy() {
    if (io) { io.disconnect(); io = null; }
    blocksRoot.removeEventListener('scroll', onPagerScroll);
    window.removeEventListener('scroll', onWinScroll);
    if (isPhone()) {
      blocksRoot.addEventListener('scroll', onPagerScroll, { passive: true });
      updatePager();
    } else {
      navlinks.forEach((a) => a.classList.remove('active'));
      io = new IntersectionObserver((ents) => {
        if (spyLocked) return;
        ents.forEach((e) => { if (e.isIntersecting) { navlinks.forEach((a) => a.classList.remove('active')); const a = byId[e.target.id]; if (a) { a.classList.add('active'); revealNav(a); } } });
      }, { rootMargin: '-18% 0px -72% 0px', threshold: 0 });
      blocks.forEach((b) => io.observe(b));
      window.addEventListener('scroll', onWinScroll, { passive: true });
      edgeSpy();
    }
  }
  setupSpy();
}

/* старт */
(async function init() {
  try {
    const [blocksData, descData] = await Promise.all([
      fetch('data/blocks.json').then((r) => r.json()),
      fetch('data/descriptions.json').then((r) => r.json()),
    ]);
    INSTR_IMAGES = blocksData.instruction_images || {};
    DESCRIPTIONS = descData;
    const jobs = build(blocksData);
    wire();
    await Promise.all(jobs.map(loadCode));
  } catch (e) {
    document.getElementById('blocks-root').innerHTML =
      '<p style="padding:24px;color:#b00">Не удалось загрузить данные. Открой страницу через локальный сервер (Live Server в VS Code) или с сервера — по протоколу file:// браузер блокирует загрузку JSON.</p>';
    console.error(e);
  }
})();

/* Лайтбокс: клик по картинке-превью блока открывает её на весь экран */
(function () {
  var ov = null;
  function ensure() {
    if (ov) return ov;
    ov = document.createElement('div');
    ov.className = 'img-lightbox';
    ov.innerHTML = '<img alt=""><button class="img-lightbox-close" type="button" aria-label="Закрыть">×</button>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (e.target === ov || e.target.classList.contains('img-lightbox-close')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    return ov;
  }
  function open(src) { var o = ensure(); o.querySelector('img').src = src; o.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function close() { if (ov) { ov.classList.remove('open'); document.body.style.overflow = ''; } }
  document.addEventListener('click', function (e) {
    var img = e.target.closest ? e.target.closest('.block .preview img') : null;
    if (img && img.src && img.style.visibility !== 'hidden') open(img.src);
  });
})();

/* Код в блоках Справочника фокусируется по клику → включается свой скролл (как в превью) */
(function () {
  function setup() {
    document.querySelectorAll('main.canvas .block pre.code').forEach(function (pre) {
      if (!pre.hasAttribute('tabindex')) pre.setAttribute('tabindex', '0');
    });
  }
  window.addEventListener('load', setup);
  [400, 1000, 2000].forEach(function (t) { setTimeout(setup, t); });
})();
