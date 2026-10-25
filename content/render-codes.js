/**
 * GIF for YouTube — yorum okuyucu
 * Yorumlardaki ":gfy:<giphy-id>:" kodlarını gerçek GIF'e çevirir.
 * Böylece gönderilmiş bir yorumda GIF, uzantıya sahip herkeste tekrar görünür.
 */
(function (g) {
  'use strict';
  const Core = g.GFYCore;
  if (!Core) return;
  if (g.__gfyReaderLoaded) return;
  g.__gfyReaderLoaded = true;

  const TOKEN = /:gfy:([A-Za-z0-9]{8,24}):/g;
  const TARGETS = [
    'ytd-comment-view-model #content-text',
    'ytd-comment-renderer #content-text',
    '#content-text.ytd-comment-renderer',
    'yt-attributed-string#content-text',
    'ytd-comment-thread-renderer #content-text',
    '.yt-live-chat-text-message-renderer #message',
    '#message.ytd-live-chat-text-message-renderer',
    'yt-live-chat-paid-message-renderer #message'
  ].join(',');

  let cssReady = false;
  let enabled = true;
  let busy = false;

  function ensureCss() {
    if (cssReady) return;
    cssReady = true;
    const style = document.createElement('style');
    style.id = 'gfy-reader-css';
    style.textContent = `
      .gfy-inline{
        display:inline-block;vertical-align:middle;max-height:170px;max-width:100%;
        border-radius:10px;margin:4px 2px;background:#0f0f0f;
        box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;
        transition:transform .16s ease,box-shadow .16s ease;
      }
      .gfy-inline:hover{transform:translateY(-2px) scale(1.01);box-shadow:0 8px 22px rgba(0,0,0,.5)}
      .gfy-inline-wrap{display:inline-block;position:relative;line-height:0}
      .gfy-inline-badge{
        position:absolute;right:5px;bottom:5px;padding:1px 5px;border-radius:4px;
        background:rgba(0,0,0,.66);color:#fff;font:800 8px/1.6 Roboto,Arial,sans-serif;
        letter-spacing:.06em;pointer-events:none;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function makeGif(id) {
    ensureCss();
    const wrap = document.createElement('span');
    wrap.className = 'gfy-inline-wrap';
    const img = document.createElement('img');
    img.className = 'gfy-inline';
    img.setAttribute('data-gfy-id', id);
    img.alt = 'GIF';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.src = 'https://media.giphy.com/media/' + id + '/giphy.gif';
    img.addEventListener('error', () => {
      // yedek alan adları
      const alts = [
        'https://i.giphy.com/' + id + '.gif',
        'https://media1.giphy.com/media/' + id + '/giphy.gif',
        'https://media0.giphy.com/media/' + id + '/giphy.gif'
      ];
      const next = Number(img.dataset.alt || 0);
      if (next < alts.length) {
        img.dataset.alt = String(next + 1);
        img.src = alts[next];
      }
    });
    img.addEventListener('click', (e) => {
      e.stopPropagation();
      try {
        window.open('https://giphy.com/gifs/' + id, '_blank', 'noopener');
      } catch (err) {}
    });
    const badge = document.createElement('span');
    badge.className = 'gfy-inline-badge';
    badge.textContent = 'GIF';
    wrap.appendChild(img);
    wrap.appendChild(badge);
    return wrap;
  }

  /** Tek bir metin düğümündeki tüm kodları GIF'e çevirir. */
  function renderTextNode(node) {
    const value = node.nodeValue || '';
    if (value.indexOf(':gfy:') === -1) return false;
    TOKEN.lastIndex = 0;
    if (!TOKEN.test(value)) return false;
    TOKEN.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    let changed = false;
    while ((m = TOKEN.exec(value))) {
      const before = value.slice(last, m.index);
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(makeGif(m[1]));
      last = m.index + m[0].length;
      changed = true;
    }
    if (!changed) return false;
    const rest = value.slice(last);
    if (rest.trim()) frag.appendChild(document.createTextNode(rest));
    if (node.parentNode) node.parentNode.replaceChild(frag, node);
    return true;
  }

  function scan(root) {
    if (!enabled) return;
    const scope = root && root.querySelectorAll ? root : document;
    let elements = [];
    try {
      elements = Array.prototype.slice.call(scope.querySelectorAll(TARGETS));
    } catch (e) {
      return;
    }
    if (scope !== document && scope.matches && scope.matches(TARGETS)) elements.push(scope);
    elements.forEach((el) => {
      if (el.dataset.gfyDone === '1') return;
      if (el.closest('[contenteditable="true"]')) return; // editörde karışma
      if (el.textContent.indexOf(':gfy:') === -1) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
      const nodes = [];
      let n;
      while ((n = walker.nextNode())) {
        if (n.nodeValue && n.nodeValue.indexOf(':gfy:') !== -1) nodes.push(n);
      }
      let changed = false;
      nodes.forEach((node) => {
        if (renderTextNode(node)) changed = true;
      });
      if (changed) el.dataset.gfyDone = '1';
    });
  }

  let timer = null;
  function schedule(root) {
    if (timer) return;
    timer = window.setTimeout(() => {
      timer = null;
      if (busy) return;
      busy = true;
      try {
        scan(root);
      } finally {
        busy = false;
      }
    }, 220);
  }

  function boot() {
    const store = chrome.storage && chrome.storage.local;
    if (!store) return;
    store.get('settings').then(({ settings }) => {
      enabled = !settings || settings.renderCodes !== false;
      if (!enabled) return;
      scan(document);
      const mo = new MutationObserver((records) => {
        for (const rec of records) {
          for (const node of rec.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (node.classList && node.classList.contains('gfy-inline')) continue;
            schedule(document);
            return;
          }
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    });

    // Ayarlar değişirse anında uygula
    if (!chrome.storage.onChanged) return;
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes.settings) return;
      const next = changes.settings.newValue || {};
      enabled = next.renderCodes !== false;
      if (enabled) scan(document);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
