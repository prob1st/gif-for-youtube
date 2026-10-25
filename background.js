/**
 * GIF for YouTube — service worker
 * Ağ istekleri, arama sağlayıcı zinciri, kısayollar ve context menu burada.
 */
import './lib/core.js';
import './lib/pack.js';

const Core = globalThis.GFYCore;

const CACHE = new Map(); // url -> {t, data}
const CACHE_TTL = 1000 * 60 * 30;
const CACHE_MAX = 120;

function cacheGet(url) {
  const hit = CACHE.get(url);
  if (!hit) return null;
  if (Date.now() - hit.t > CACHE_TTL) {
    CACHE.delete(url);
    return null;
  }
  return hit.data;
}
function cacheSet(url, data) {
  if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(url, { t: Date.now(), data });
}

/* ------------------------------------------------------------------ */
/* Ayarlar                                                             */
/* ------------------------------------------------------------------ */
async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return Core.mergeSettings(settings, {});
}

chrome.runtime.onInstalled.addListener(async (details) => {
  const { settings, stats } = await chrome.storage.local.get(['settings', 'stats']);
  if (!settings) {
    await chrome.storage.local.set({ settings: Core.mergeSettings({}, {}) });
  }
  if (!stats) {
    await chrome.storage.local.set({ stats: { inserted: 0, since: Date.now() } });
  }
  const n = globalThis.GFYPack ? globalThis.GFYPack.size : 335;
  chrome.action.setBadgeBackgroundColor({ color: '#ff2d55' });
  chrome.action.setBadgeText({ text: String(n) });
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html?welcome=1') });
  }
  buildMenus();
});

function buildMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'gfy-open',
      title: 'GIF Studio panelini aç',
      contexts: ['all']
    });
    chrome.contextMenus.create({
      id: 'gfy-resolve-selection',
      title: 'Seçili GIF linkini yoruma ekle',
      contexts: ['selection']
    });
  });
}
buildMenus();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;
  if (info.menuItemId === 'gfy-open') {
    send(tab.id, { type: 'gfy:open-panel' });
  } else if (info.menuItemId === 'gfy-resolve-selection' && info.selectionText) {
    const parsed = Core.parseGifInput(info.selectionText);
    if (!parsed.ok) return;
    const gif = await resolveSource(parsed);
    if (gif) send(tab.id, { type: 'gfy:insert-gif', gif });
  }
});

/* ------------------------------------------------------------------ */
/* Mesaj yönlendirici                                                  */
/* ------------------------------------------------------------------ */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg && msg.type) {
        case 'gfy:search':
          sendResponse({ ok: true, data: await search(msg.query, msg.limit, msg.provider) });
          break;
        case 'gfy:resolve':
          sendResponse({ ok: true, data: await resolveSource(Core.parseGifInput(msg.url)) });
          break;
        case 'gfy:to-dataurl':
          sendResponse({ ok: true, data: await toDataUrl(msg.url, msg.maxBytes) });
          break;
        case 'gfy:fetch-json':
          sendResponse({ ok: true, data: await fetchJson(msg.url) });
          break;
        case 'gfy:probe':
          sendResponse({ ok: true, data: await probeImage(msg.url) });
          break;
        case 'gfy:stats':
          sendResponse({ ok: true, data: await bumpStats(msg.kind) });
          break;
        case 'gfy:open-options':
          chrome.runtime.openOptionsPage();
          sendResponse({ ok: true });
          break;
        case 'gfy:open-panel':
          if (sender.tab && sender.tab.id) send(sender.tab.id, { type: 'gfy:open-panel' });
          sendResponse({ ok: true });
          break;
        default:
          sendResponse({ ok: false, error: 'unknown_message' });
      }
    } catch (err) {
      sendResponse({ ok: false, error: String((err && err.message) || err) });
    }
  })();
  return true; // async
});

function send(tabId, msg) {
  chrome.tabs.sendMessage(tabId, msg).catch(() => {});
}

async function bumpStats(kind) {
  const { stats } = await chrome.storage.local.get('stats');
  const s = stats || { inserted: 0, since: Date.now() };
  if (kind === 'insert') s.inserted = (s.inserted || 0) + 1;
  s.lastInsert = Date.now();
  await chrome.storage.local.set({ stats: s });
  return s;
}

/* ------------------------------------------------------------------ */
/* Ağ yardımcıları                                                     */
/* ------------------------------------------------------------------ */
async function fetchText(url) {
  const cached = cacheGet(url);
  if (cached) return cached;
  const res = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const text = await res.text();
  cacheSet(url, text);
  return text;
}

async function fetchJson(url) {
  const cached = cacheGet(url);
  if (cached) return cached;
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  cacheSet(url, json);
  return json;
}

function abToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function toDataUrl(url, maxBytes) {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const type = res.headers.get('content-type') || 'image/gif';
  const buf = await res.arrayBuffer();
  if (maxBytes && buf.byteLength > maxBytes) {
    throw new Error('too_large:' + buf.byteLength);
  }
  return 'data:' + type.split(';')[0] + ';base64,' + abToBase64(buf);
}

async function probeImage(url) {
  try {
    const res = await fetch(url, { credentials: 'omit', method: 'GET' });
    if (!res.ok) return { ok: false, status: res.status };
    const type = res.headers.get('content-type') || '';
    const len = Number(res.headers.get('content-length') || 0);
    return { ok: /image|octet-stream/i.test(type), type, bytes: len };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

/* ------------------------------------------------------------------ */
/* Arama                                                               */
/* ------------------------------------------------------------------ */
async function search(query, limit, providerOverride) {
  const s = await getSettings();
  const q = String(query || '').trim();
  const lim = Core.clampInt(limit || 24, 4, 50);
  const provider = providerOverride || s.searchProvider || 'auto';

  if (!q) return { items: [], provider: 'none' };

  if (provider === 'pack') return { items: searchPack(q, lim), provider: 'pack' };

  if (provider === 'giphy-api' || (provider === 'auto' && s.giphyApiKey)) {
    if (s.giphyApiKey) {
      try {
        const items = await giphyApiSearch(q, lim, s);
        if (items.length) return { items, provider: 'giphy-api' };
      } catch (e) {
        /* düş */
      }
    }
  }

  if (provider === 'auto' || provider === 'giphy-web' || provider === 'giphy-api') {
    try {
      const items = await giphyWebSearch(q, lim, s);
      if (items.length) return { items, provider: 'giphy-web' };
    } catch (e) {
      /* düş */
    }
  }

  return { items: searchPack(q, lim), provider: 'pack' };
}

async function giphyApiSearch(q, lim, s) {
  const url =
    'https://api.giphy.com/v1/gifs/search?api_key=' +
    encodeURIComponent(s.giphyApiKey) +
    '&q=' + encodeURIComponent(q) +
    '&limit=' + lim +
    '&rating=' + (s.safeSearch ? 'pg-13' : 'r') +
    '&lang=' + (s.lang === 'tr' ? 'tr' : 'en') +
    '&bundle=messaging_non_clips';
  const json = await fetchJson(url);
  const data = (json && json.data) || [];
  return data
    .map((g) => {
      const img = (g.images && (g.images.original || g.images.downsized_medium)) || {};
      if (!img.url) return null;
      return {
        id: g.id,
        title: g.title || q,
        src: 'giphy',
        media: img.url,
        preview: (g.images.fixed_width && g.images.fixed_width.url) || img.url,
        page: g.url || 'https://giphy.com/gifs/' + g.id,
        w: Number(img.width) || 0,
        h: Number(img.height) || 0
      };
    })
    .filter(Boolean);
}

/** Anahtar gerektirmeyen yedek: Giphy web arama sayfasını ayrıştırır. */
async function giphyWebSearch(q, lim, s) {
  const url = 'https://giphy.com/search/' + encodeURIComponent(q);
  const html = await fetchText(url);
  const out = [];
  const seen = new Set();

  const hrefRe = /href="(?:https:\/\/giphy\.com)?\/gifs\/([^"#?]+)"/g;
  let m;
  while ((m = hrefRe.exec(html)) && out.length < lim) {
    const slug = m[1];
    const idm = slug.match(/-([A-Za-z0-9]{10,24})$/);
    if (!idm) continue;
    const id = idm[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: slug.replace(/-[A-Za-z0-9]{10,24}$/, '').replace(/-/g, ' ') || q,
      src: 'giphy',
      media: 'https://media.giphy.com/media/' + id + '/giphy.gif',
      preview: 'https://media.giphy.com/media/' + id + '/200w.gif',
      page: 'https://giphy.com/gifs/' + slug,
      w: 0,
      h: 0
    });
  }

  // HTML'de media URL'leri varsa onları da yakala (daha güvenilir poster)
  const mediaRe = /media\d?\.giphy\.com\/media\/([A-Za-z0-9]+)\/(?:200w|giphy)\.(?:gif|webp)/g;
  while ((m = mediaRe.exec(html)) && out.length < lim) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: q,
      src: 'giphy',
      media: 'https://media.giphy.com/media/' + id + '/giphy.gif',
      preview: 'https://media.giphy.com/media/' + id + '/200w.gif',
      page: 'https://giphy.com/gifs/' + id,
      w: 0,
      h: 0
    });
  }
  return out;
}

function searchPack(q, lim) {
  const pack = globalThis.GFYPack ? globalThis.GFYPack.items : [];
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = pack
    .map((item) => {
      const hay = (item.title + ' ' + item.cat).toLowerCase();
      let score = 0;
      words.forEach((w) => {
        if (hay.includes(w)) score += 2;
      });
      return { item, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.item);
  return (scored.length ? scored : pack).slice(0, lim);
}

/* ------------------------------------------------------------------ */
/* Link çözümleme                                                      */
/* ------------------------------------------------------------------ */
async function resolveSource(parsed) {
  if (!parsed || !parsed.ok) return null;

  if (parsed.type === 'giphy') {
    const gif = {
      id: parsed.id,
      title: 'GIF',
      src: 'giphy',
      media: parsed.media,
      page: parsed.page
    };
    try {
      const o = await fetchJson(
        'https://giphy.com/services/oembed?url=' + encodeURIComponent(parsed.page)
      );
      if (o) {
        if (o.url) gif.media = o.url;
        if (o.title) gif.title = String(o.title).replace(/\s*-\s*Find & Share on GIPHY.*$/i, '');
        gif.w = Number(o.width) || 0;
        gif.h = Number(o.height) || 0;
      }
    } catch (e) {
      /* oembed yoksa media adayıyla devam */
    }
    return gif;
  }

  if (parsed.type === 'direct' || parsed.type === 'tenor' || parsed.type === 'unknown') {
    if (parsed.media) {
      return { id: 'url-' + Math.random().toString(36).slice(2, 9), title: 'GIF', src: 'url', media: parsed.media, page: parsed.page };
    }
    // Tenor / bilinmeyen sayfa: og:image + gömülü JSON'dan .gif ara
    try {
      const html = await fetchText(parsed.page);
      let media = '';
      const gifJson = html.match(/"gif"\s*:\s*\{[^}]*"url"\s*:\s*"(https:[^"]+\.gif[^"]*)"/i);
      if (gifJson) media = gifJson[1].replace(/\\u002F/g, '/');
      if (!media) {
        const og = html.match(/property="og:image"\s+content="([^"]+)"/i) ||
                   html.match(/content="([^"]+)"\s+property="og:image"/i);
        if (og) media = og[1].replace(/\\u002F/g, '/');
      }
      if (!media) {
        const direct = html.match(/https:\/\/media\d?\.tenor\.com\/[^"'\s]+\.gif/i) ||
                       html.match(/https:\/\/media\d?\.giphy\.com\/media\/[^"'\s]+\.gif/i);
        if (direct) media = direct[0];
      }
      if (!media) return null;
      const titleM = html.match(/property="og:title"\s+content="([^"]*)"/i);
      return {
        id: 'url-' + Math.random().toString(36).slice(2, 9),
        title: titleM ? Core.sanitizeCaption(titleM[1]) : 'GIF',
        src: 'url',
        media,
        page: parsed.page
      };
    } catch (e) {
      return null;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Komutlar (kısayollar)                                               */
/* ------------------------------------------------------------------ */
chrome.commands.onCommand.addListener(async (cmd) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (cmd === 'open-gif-panel') send(tab.id, { type: 'gfy:open-panel' });
  if (cmd === 'quick-gif') send(tab.id, { type: 'gfy:quick-insert' });
});
