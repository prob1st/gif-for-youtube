/**
 * GIF for YouTube — core
 * Saf (pure) yardımcılar. DOM'a dokunmaz, bu yüzden hem content script'te
 * hem Node testlerinde aynı kod çalışır.
 */
(function (global) {
  'use strict';

  const GIF_HOSTS = /(^|\.)(giphy\.com|tenor\.com|gfycat\.com)$/i;

  const DEFAULTS = {
    lang: 'tr',                 // 'tr' | 'en'
    theme: 'dark',              // 'dark' | 'light' | 'auto'
    reduceMotion: false,
    accent: '#ff2d55',
    // --- Yerleşim ---
    sizePct: 42,                // yorum alanı genişliğinin %'si
    maxWidthPx: 480,
    align: 'left',              // left | center | right
    radius: 14,                 // px
    border: 'none',             // none | solid | glow | dashed
    borderColor: '#ff2d55',
    borderWidth: 0,
    shadow: 'soft',             // none | soft | hard | neon
    badge: true,                // köşede "GIF" etiketi
    captionOn: false,
    captionText: '',
    captionPos: 'bottom',       // top | bottom
    captionBg: 'rgba(0,0,0,.72)',
    captionColor: '#ffffff',
    captionSize: 13,
    captionUpper: false,
    // --- Filtreler ---
    grayscale: 0,               // 0-100
    brightness: 100,            // 50-150
    contrast: 100,              // 50-150
    saturate: 100,              // 0-200
    hue: 0,                     // -180..180
    blur: 0,                    // 0-6 (px)
    // --- Davranış ---
    insertMode: 'code',         // code | rich | link  (code = kalıcı GIF kodu + link)
    autoLink: true,             // kaynak linkini de ekle
    confirmLargeFile: true,
    maxFileMb: 15,
    soundFeedback: false,
    searchProvider: 'auto',     // auto | giphy-api | giphy-web | pack
    giphyApiKey: '',
    safeSearch: true,
    renderCodes: true,          // yorumlarda :gfy: kodlarını GIF'e çevir
    showFab: true,
    onboardingDone: false
  };

  let counter = 0;
  function uid(prefix) {
    counter = (counter + 1) % 100000;
    return (prefix || 'gfy') + '-' + Date.now().toString(36) + '-' + counter.toString(36);
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (!Number.isFinite(n)) n = min;
    return Math.min(max, Math.max(min, n));
  }

  function clampInt(n, min, max) {
    return Math.round(clamp(n, min, max));
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sanitizeCaption(txt) {
    return String(txt == null ? '' : txt)
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 90)
      .trim();
  }

  /** Sadece https veya gömülü data:image (yerel GIF) kabul et. */
  function isAllowedMediaUrl(url) {
    const value = String(url || '');
    if (/^data:image\/(gif|webp|png|jpe?g);base64,/i.test(value)) return true;
    try {
      const u = new URL(value, 'https://www.youtube.com');
      return u.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  function isImageUrl(url) {
    return /\.(gif|webp|png|jpe?g|avif)(\?|#|$)/i.test(String(url || ''));
  }

  /**
   * Kullanıcının yapıştırdığı her şeyi anlaşılır bir GIF kaynağına çevirir.
   * @returns {{ok:boolean, type?:string, id?:string, page?:string, media?:string, reason?:string}}
   */
  function parseGifInput(raw) {
    const input = String(raw || '').trim();
    if (!input) return { ok: false, reason: 'empty' };
    if (input.length > 2048) return { ok: false, reason: 'too_long' };

    // 1) Çıplak Giphy ID (16-20 karakter alfanümerik)
    if (/^[A-Za-z0-9]{12,24}$/.test(input) && !/^https?:/i.test(input)) {
      return giphyById(input);
    }

    let url;
    try {
      url = new URL(input.startsWith('http') ? input : 'https://' + input);
    } catch (e) {
      return { ok: false, reason: 'not_a_url' };
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return { ok: false, reason: 'bad_scheme' };
    }
    url.protocol = 'https:';
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const path = url.pathname;

    // 2) Giphy
    if (/(^|\.)giphy\.com$/.test(host)) {
      if (host === 'media.giphy.com' || /^media\d*\.giphy\.com$/.test(host) || host === 'i.giphy.com') {
        const m = path.match(/\/media\/([A-Za-z0-9]+)\//) || path.match(/^\/([A-Za-z0-9]+)\.(gif|webp|mp4)$/);
        if (m) return giphyById(m[1], url.href);
      }
      const idm = path.match(/-([A-Za-z0-9]{10,24})\/?$/) || path.match(/\/(?:gifs|stickers|clips)\/([A-Za-z0-9]+)\/?$/);
      if (idm) return giphyById(idm[1], url.href);
      return { ok: false, reason: 'giphy_unknown' };
    }

    // 3) Tenor
    if (/(^|\.)tenor\.com$/.test(host)) {
      const m = path.match(/-(\d{5,})\/?$/) || path.match(/\/([A-Za-z0-9]{8,})\/(?:.*\.gif)?$/);
      if (m) {
        return {
          ok: true,
          type: 'tenor',
          id: m[1],
          page: url.href,
          media: /\.gif$/i.test(path) ? url.href : ''
        };
      }
      if (/\.gif$/i.test(path)) return { ok: true, type: 'direct', media: url.href, page: url.href };
    }

    // 4) Doğrudan görsel
    if (isImageUrl(url.href)) {
      return { ok: true, type: 'direct', media: url.href, page: url.href };
    }

    // 5) Bilinmeyen ama https link → resolve denenebilir
    if (GIF_HOSTS.test(host) || /\.(gif|webp)$/i.test(path)) {
      return { ok: true, type: 'unknown', page: url.href };
    }
    return { ok: false, reason: 'unsupported_host' };
  }

  function giphyById(id, page) {
    return {
      ok: true,
      type: 'giphy',
      id: id,
      page: page && /giphy\.com\/gifs\//.test(page) ? page : 'https://giphy.com/gifs/' + id,
      media: 'https://media.giphy.com/media/' + id + '/giphy.gif'
    };
  }

  /** Kaliteye göre aday URL listesi (ilk çalışan kullanılır). */
  function mediaCandidates(source) {
    const out = [];
    if (!source) return out;
    if (source.dataUrl) out.push(source.dataUrl);
    if (source.type === 'giphy' && source.id) {
      out.push('https://media.giphy.com/media/' + source.id + '/giphy.gif');
      out.push('https://i.giphy.com/' + source.id + '.gif');
    }
    if (source.media) out.push(source.media);
    if (source.url) out.push(source.url);
    return out.filter((v, i) => v && isAllowedMediaUrl(v) && out.indexOf(v) === i);
  }

  function filterString(s) {
    const parts = [];
    if (Number(s.grayscale) > 0) parts.push('grayscale(' + clamp(s.grayscale, 0, 100) + '%)');
    if (Number(s.brightness) !== 100) parts.push('brightness(' + clamp(s.brightness, 50, 150) + '%)');
    if (Number(s.contrast) !== 100) parts.push('contrast(' + clamp(s.contrast, 50, 150) + '%)');
    if (Number(s.saturate) !== 100) parts.push('saturate(' + clamp(s.saturate, 0, 200) + '%)');
    if (Number(s.hue) !== 0) parts.push('hue-rotate(' + clamp(s.hue, -180, 180) + 'deg)');
    if (Number(s.blur) > 0) parts.push('blur(' + clamp(s.blur, 0, 6) + 'px)');
    return parts.length ? parts.join(' ') : 'none';
  }

  function shadowCss(kind, accent) {
    switch (kind) {
      case 'soft':
        return '0 8px 24px rgba(0,0,0,.35)';
      case 'hard':
        return '6px 6px 0 rgba(0,0,0,.75)';
      case 'neon':
        return '0 0 0 1px ' + (accent || '#ff2d55') + ', 0 0 18px ' + (accent || '#ff2d55') + 'aa';
      default:
        return 'none';
    }
  }

  /**
   * GIF kutusunun ölçü ve stil geometrisi.
   * @param {object} s ayarlar
   * @param {number} containerWidth yorum alanının px genişliği
   * @param {number} [naturalW] gif doğal genişliği (küçük gifleri şişirmemek için)
   */
  function pillGeometry(s, containerWidth, naturalW) {
    const cw = Math.max(160, Number(containerWidth) || 320);
    let target = cw * (clamp(s.sizePct, 12, 100) / 100);
    target = Math.min(target, clamp(s.maxWidthPx, 80, 720));
    // Varsayılan boyutlarda küçük GIF'ler bulanıklaşmasın diye büyütülmez;
    // kullanıcı boyutu bilerek artırdıysa (%45 üzeri) büyütmeye izin verilir.
    const allowUpscale = Number(s.sizePct) > 45;
    if (!allowUpscale && naturalW && naturalW > 0 && naturalW < target) target = naturalW;
    return {
      widthPx: Math.round(target),
      radius: clampInt(s.radius, 0, 40),
      align: ['left', 'center', 'right'].indexOf(s.align) >= 0 ? s.align : 'left'
    };
  }

  function pillStyleObjects(s, geom) {
    const borderCss =
      s.border === 'none' || !Number(s.borderWidth)
        ? {}
        : {
            borderStyle: s.border === 'dashed' ? 'dashed' : 'solid',
            borderWidth: clampInt(s.borderWidth, 1, 8) + 'px',
            borderColor: s.borderColor || s.accent || '#ff2d55'
          };
    if (s.border === 'glow') {
      borderCss.boxShadow =
        '0 0 0 ' + clampInt(s.borderWidth || 2, 1, 8) + 'px ' + (s.borderColor || '#ff2d55');
    }
    const wrapperBase = {
      width: geom.widthPx + 'px',
      maxWidth: '100%',
      borderRadius: geom.radius + 'px',
      overflow: 'hidden',
      display: 'inline-block',
      verticalAlign: 'bottom',
      lineHeight: '0',
      position: 'relative',
      margin:
        geom.align === 'center'
          ? '6px auto'
          : geom.align === 'right'
          ? '6px 0 6px auto'
          : '6px 0',
      cursor: 'pointer',
      boxShadow: shadowCss(s.shadow, s.borderColor || s.accent),
      ...borderCss
    };
    if (geom.align !== 'left') wrapperBase.display = 'block';
    return {
      wrapper: wrapperBase,
      img: {
        display: 'block',
        width: '100%',
        height: 'auto',
        filter: filterString(s),
        borderRadius: (geom.radius - 2 > 0 ? geom.radius - 2 : 0) + 'px'
      },
      caption: {
        position: 'absolute',
        left: '0',
        right: '0',
        [s.captionPos === 'top' ? 'top' : 'bottom']: '0',
        padding: '7px 10px',
        font: '600 ' + clampInt(s.captionSize, 9, 28) + 'px/1.25 "YouTube Sans", Roboto, Arial, sans-serif',
        color: s.captionColor || '#fff',
        background: s.captionBg || 'rgba(0,0,0,.72)',
        textAlign: 'center',
        textTransform: s.captionUpper ? 'uppercase' : 'none',
        letterSpacing: s.captionUpper ? '.04em' : '0',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        pointerEvents: 'none'
      }
    };
  }

  /** Panelde kart üstünde kullanılan küçük stil özeti. */
  function styleSignature(s) {
    return [
      s.sizePct, s.radius, s.shadow, s.border, s.borderColor, s.grayscale,
      s.brightness, s.contrast, s.saturate, s.hue, s.blur, s.captionOn,
      s.captionText, s.captionPos, s.captionUpper, s.badge, s.align
    ].join('|');
  }

  function formatBytes(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function relativeTime(ts, lang) {
    const diff = Date.now() - Number(ts || 0);
    const m = Math.floor(diff / 60000);
    const tr = lang !== 'en';
    if (m < 1) return tr ? 'az önce' : 'just now';
    if (m < 60) return tr ? m + ' dk önce' : m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return tr ? h + ' sa önce' : h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 30) return tr ? d + ' gün önce' : d + 'd ago';
    return new Date(Number(ts)).toLocaleDateString(tr ? 'tr-TR' : 'en-US');
  }

  function mergeSettings(base, patch) {
    const out = Object.assign({}, DEFAULTS, base || {});
    Object.keys(patch || {}).forEach((k) => {
      if (k in DEFAULTS) out[k] = patch[k];
    });
    return out;
  }

  /** Aynı GIF'i tekrar tekrar eklemeyi engellemek için imza. */
  function gifSignature(g) {
    if (!g) return '';
    return g.id || g.media || g.url || g.dataUrl || '';
  }


  /* ------------------------------------------------------------------ */
  /* Kalıcı GIF kodu                                                     */
  /* YouTube yorumlarında satır içi görsel saklanmaz; ama düz metin      */
  /* saklanır. Bu yüzden GIF'i ":gfy:<id>:" metnine çeviriyoruz:         */
  /*  - yorum gönderildikten sonra da yaşar                             */
  /*  - bu uzantıya sahip herkes onu tekrar GIF olarak görür            */
  /* ------------------------------------------------------------------ */
  const TOKEN_PREFIX = ':gfy:';
  const TOKEN_RE = /:gfy:([A-Za-z0-9]{8,24}):/g;

  function encodeToken(id) {
    const clean = String(id || '').replace(/[^A-Za-z0-9]/g, '');
    if (clean.length < 8 || clean.length > 24) return '';
    return TOKEN_PREFIX + clean + ':';
  }

  function decodeToken(token) {
    const m = /^:gfy:([A-Za-z0-9]{8,24}):$/.exec(String(token || '').trim());
    return m ? m[1] : null;
  }

  /** Metin içindeki tüm GIF kodlarını bulur. */
  function findTokens(text) {
    const out = [];
    const src = String(text || '');
    TOKEN_RE.lastIndex = 0;
    let m;
    while ((m = TOKEN_RE.exec(src))) {
      out.push({ token: m[0], id: m[1], index: m.index });
    }
    return out;
  }

  /**
   * Yayınlanacak yorumda GIF'in yerine geçecek metni üretir.
   * Sıra: GIF kodu (kalıcı, uzantıda görsel olur) + kaynak linki.
   */
  function publishText(gif, s) {
    if (!gif) return '';
    const settings = s || DEFAULTS;
    const id = /^[A-Za-z0-9]{8,24}$/.test(String(gif.id || '')) ? String(gif.id) : '';
    const link =
      gif.page && /^https:\/\//.test(gif.page)
        ? gif.page
        : gif.media && /^https:\/\//.test(gif.media)
        ? gif.media
        : '';
    const mode = settings.insertMode === 'rich+link' ? 'code' : settings.insertMode;
    const parts = [];
    if (mode !== 'link' && id) {
      const token = encodeToken(id);
      if (token) parts.push(token);
    }
    if (settings.autoLink !== false && link) parts.push(link);
    if (!parts.length) {
      const cap = sanitizeCaption(settings.captionOn ? settings.captionText : '');
      if (cap) parts.push(cap);
      else if (link) parts.push(link);
    }
    return parts.join(' ');
  }

  function giphyMediaFromId(id) {
    return 'https://media.giphy.com/media/' + String(id || '').replace(/[^A-Za-z0-9]/g, '') + '/giphy.gif';
  }

  const api = {
    DEFAULTS,
    uid,
    clamp,
    clampInt,
    esc,
    sanitizeCaption,
    isAllowedMediaUrl,
    isImageUrl,
    parseGifInput,
    giphyById,
    mediaCandidates,
    filterString,
    shadowCss,
    pillGeometry,
    pillStyleObjects,
    styleSignature,
    formatBytes,
    relativeTime,
    mergeSettings,
    gifSignature,
    TOKEN_PREFIX,
    encodeToken,
    decodeToken,
    findTokens,
    publishText,
    giphyMediaFromId
  };

  global.GFYCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
