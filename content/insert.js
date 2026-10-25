/**
 * GIF for YouTube — ekleme motoru
 * YouTube yorum editörünü bulur, GIF "pill"ini imlece yerleştirir ve
 * stüdyodan gelen canlı stil değişikliklerini uygular.
 */
(function (g) {
  'use strict';
  const Core = g.GFYCore;

  const EDITOR_SELECTORS = [
    'ytd-commentbox #contenteditable-root',
    'ytd-comment-simplebox-renderer #contenteditable-root',
    'ytd-comment-dialog #contenteditable-root',
    'ytd-commentbox div[contenteditable="true"]',
    'ytd-comment-dialog div[contenteditable="true"]',
    'div#contenteditable-root[contenteditable="true"]',
    'tp-yt-paper-dialog div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][aria-label*="comment" i]',
    'div[contenteditable="true"][aria-label*="yorum" i]',
    'div[contenteditable="true"][aria-label*="reply" i]',
    'div[contenteditable="true"][aria-label*="yanıt" i]'
  ];

  const TEXTAREA_SELECTORS = [
    'ytd-comment-simplebox-renderer textarea#textarea',
    'ytd-commentbox textarea',
    'textarea[aria-label*="comment" i]',
    'textarea[aria-label*="yorum" i]'
  ];

  let lastEditor = null;
  let lastInserted = null;
  let docCssInjected = false;

  /* ---------------------------------------------------------------- */
  /* Belge düzeyi stiller (pill YouTube DOM'una girer, shadow dışında) */
  /* ---------------------------------------------------------------- */
  function ensureDocStyles() {
    if (docCssInjected) return;
    docCssInjected = true;
    const style = document.createElement('style');
    style.id = 'gfy-pill-css';
    style.textContent = `
      .gfy-pill{
        position:relative!important;display:inline-block!important;overflow:hidden!important;
        line-height:0!important;vertical-align:bottom!important;margin:6px 0!important;
        transition:transform .18s cubic-bezier(.2,.8,.3,1),box-shadow .18s ease,filter .18s ease;
        will-change:transform;max-width:100%!important;box-sizing:border-box!important;
        cursor:pointer;-webkit-user-drag:element;
      }
      .gfy-pill:hover{transform:translateY(-2px)}
      .gfy-pill img{display:block!important;width:100%!important;height:auto!important;
        background:transparent!important;pointer-events:none}
      .gfy-pill[data-badge="1"]::after{
        content:"GIF";position:absolute;right:6px;bottom:6px;padding:2px 6px;border-radius:5px;
        background:rgba(0,0,0,.66);color:#fff;font:800 9px/1.5 "YouTube Sans",Roboto,Arial,sans-serif;
        letter-spacing:.06em;pointer-events:none;backdrop-filter:blur(3px);z-index:2;
      }
      .gfy-pill .gfy-pill-cap{
        position:absolute;left:0;right:0;padding:7px 10px;text-align:center;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;z-index:2;
        font-family:"YouTube Sans",Roboto,Arial,sans-serif;
      }
      .gfy-pill.gfy-enter{animation:gfy-pill-in .32s cubic-bezier(.2,.9,.3,1)}
      @keyframes gfy-pill-in{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
      .gfy-pill.gfy-dragging{opacity:.55}
      .gfy-pill.gfy-selected{outline:2px solid #ff2d55;outline-offset:2px}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ---------------------------------------------------------------- */
  /* Editör bulma                                                      */
  /* ---------------------------------------------------------------- */
  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 8 && r.bottom > -200 && r.top < window.innerHeight + 400;
  }

  function findEditor() {
    for (const sel of EDITOR_SELECTORS) {
      let nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch (e) {
        continue;
      }
      for (const node of nodes) {
        if (isVisible(node)) return node;
      }
    }
    // Görünür herhangi bir contenteditable
    const all = document.querySelectorAll('div[contenteditable="true"], [contenteditable=""]');
    for (const node of all) {
      if (!isVisible(node)) continue;
      if (node.closest('ytd-commentbox,ytd-comment-dialog,ytd-comment-simplebox-renderer,tp-yt-paper-dialog')) {
        return node;
      }
    }
    return null;
  }

  function findTextarea() {
    for (const sel of TEXTAREA_SELECTORS) {
      for (const node of document.querySelectorAll(sel)) if (isVisible(node)) return node;
    }
    return null;
  }

  /** Yorum kutusuna tıklanmışsa onu hatırla (panel açılınca odak kayboluyor). */
  function rememberEditor(el) {
    if (el && el.isContentEditable) lastEditor = el;
  }

  document.addEventListener(
    'focusin',
    (e) => {
      const t = e.target;
      if (t && t.nodeType === 1 && t.isContentEditable) rememberEditor(t);
    },
    true
  );

  function resolveEditor() {
    if (lastEditor && lastEditor.isConnected && lastEditor.isContentEditable) {
      const r = lastEditor.getBoundingClientRect();
      if (r.width > 40) return lastEditor;
    }
    return findEditor();
  }

  function measureContainer(editor) {
    if (!editor) return 360;
    const box =
      editor.closest('ytd-commentbox,ytd-comment-dialog,ytd-comment-simplebox-renderer') || editor;
    const w = box.getBoundingClientRect().width;
    return w > 120 ? w - 24 : 360;
  }

  /* ---------------------------------------------------------------- */
  /* Pill oluşturma                                                    */
  /* ---------------------------------------------------------------- */
  function buildPill(gif, settings, containerWidth) {
    ensureDocStyles();
    const id = Core.uid('pill');
    const naturalW = Number(gif.w) || 0;
    const geom = Core.pillGeometry(settings, containerWidth || 380, naturalW);
    const styles = Core.pillStyleObjects(settings, geom);

    const pill = document.createElement('span');
    pill.className = 'gfy-pill gfy-enter';
    pill.contentEditable = 'false';
    pill.dataset.gfyId = id;
    pill.dataset.gfySrc = Core.gifSignature(gif);
    pill.setAttribute('role', 'img');
    pill.setAttribute('aria-label', gif.title ? 'GIF: ' + gif.title : 'GIF');
    pill.title = gif.title || 'GIF';
    Object.assign(pill.style, styles.wrapper);

    const img = document.createElement('img');
    img.alt = gif.title || 'GIF';
    img.decoding = 'async';
    img.loading = 'eager';
    Object.assign(img.style, styles.img);

    const candidates = Core.mediaCandidates(gif);
    let idx = 0;
    img.addEventListener('error', () => {
      idx += 1;
      if (idx < candidates.length) {
        img.src = candidates[idx];
      } else if (!gif._dataUrlTried) {
        gif._dataUrlTried = true;
        // Son çare: arka planda baytları çekip data URL olarak göm
        g.cGFY
          .send({ type: 'gfy:to-dataurl', url: candidates[0], maxBytes: 24 * 1024 * 1024 })
          .then((res) => {
            if (res && res.ok && res.data) img.src = res.data;
            else pill.dataset.error = '1';
          })
          .catch(() => {
            pill.dataset.error = '1';
          });
      }
    });
    if (candidates[idx]) img.src = candidates[idx];
    pill.appendChild(img);

    pill.dataset.badge = settings.badge ? '1' : '0';

    if (settings.captionOn && Core.sanitizeCaption(settings.captionText)) {
      const cap = document.createElement('span');
      cap.className = 'gfy-pill-cap';
      Object.assign(cap.style, styles.caption);
      cap.textContent = Core.sanitizeCaption(settings.captionText);
      pill.appendChild(cap);
    }

    // Sürükle-bırak: GIF'i yorum alanına taşıyabilmek için
    pill.draggable = true;
    pill.addEventListener('dragstart', (e) => {
      pill.classList.add('gfy-dragging');
      const url = (gif.page && gif.src === 'giphy' ? gif.page : img.src) || img.src;
      try {
        e.dataTransfer.setData('text/uri-list', url);
        e.dataTransfer.setData('text/plain', url);
        e.dataTransfer.setData('text/html', pill.outerHTML);
        e.dataTransfer.effectAllowed = 'copy';
      } catch (err) {
        /* yoksay */
      }
    });
    pill.addEventListener('dragend', () => pill.classList.remove('gfy-dragging'));

    pill.__gfy = { gif, img, capEl: null, geom };
    return pill;
  }

  /** Stüdyo değişikliklerini mevcut pill'e uygular. */
  function applyStyles(pill, settings, naturalW, containerWidth) {
    if (!pill) return;
    const geom = Core.pillGeometry(settings, containerWidth || 380, naturalW || 0);
    const styles = Core.pillStyleObjects(settings, geom);
    const keepShadow = styles.wrapper.boxShadow;
    Object.assign(pill.style, styles.wrapper);
    if (keepShadow) pill.style.boxShadow = keepShadow;
    const img = pill.querySelector('img');
    if (img) Object.assign(img.style, styles.img);

    pill.dataset.badge = settings.badge ? '1' : '0';

    let cap = pill.querySelector('.gfy-pill-cap');
    const text = settings.captionOn ? Core.sanitizeCaption(settings.captionText) : '';
    if (text) {
      if (!cap) {
        cap = document.createElement('span');
        cap.className = 'gfy-pill-cap';
        pill.appendChild(cap);
      }
      cap.textContent = text;
      Object.assign(cap.style, styles.caption);
    } else if (cap) {
      cap.remove();
    }
    pill.__gfy = pill.__gfy || {};
    pill.__gfy.geom = geom;
  }

  /* ---------------------------------------------------------------- */
  /* Ekleme                                                            */
  /* ---------------------------------------------------------------- */
  function caretRangeIn(editor) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (editor.contains(r.startContainer)) return r.cloneRange();
    }
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.collapse(false);
    return r;
  }

  function insertPillIntoEditor(editor, pill) {
    editor.focus({ preventScroll: true });
    const range = caretRangeIn(editor);
    range.collapse(true);
    range.deleteContents();

    const frag = document.createDocumentFragment();
    if (editor.textContent && editor.textContent.trim().length > 0) {
      frag.appendChild(document.createElement('br'));
    }
    frag.appendChild(pill);
    frag.appendChild(document.createElement('br'));
    frag.appendChild(document.createTextNode('\u200B'));

    range.insertNode(frag);

    // İmleci pill'den sonra bırak
    try {
      const sel = window.getSelection();
      const r2 = document.createRange();
      r2.setStartAfter(pill);
      r2.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r2);
    } catch (e) {
      /* yoksay */
    }

    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertContent' }));
    editor.dispatchEvent(new Event('change', { bubbles: true }));
    return pill;
  }

  function insertLinkText(editor, url) {
    editor.focus();
    const range = caretRangeIn(editor);
    range.collapse(false);
    const a = document.createElement('a');
    a.href = url;
    a.textContent = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer nofollow';
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createTextNode(' '));
    frag.appendChild(a);
    range.insertNode(frag);
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertContent' }));
    return a;
  }

  /**
   * GIF'i mevcut yorum alanına ekler.
   * @returns {{ok:boolean, mode:string, el?:Element, reason?:string}}
   */
  function insertGif(gif, settings) {
    ensureDocStyles();
    const editor = resolveEditor();
    const mode = settings.insertMode || 'rich';

    if (!editor) {
      const ta = findTextarea();
      if (ta) {
        const url = (gif.page && gif.src === 'giphy') || gif.media || gif.url || '';
        const sep = ta.value && !/\s$/.test(ta.value) ? ' ' : '';
        ta.value = ta.value + sep + url;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        return { ok: true, mode: 'textarea-text', url };
      }
      return { ok: false, reason: 'no_editor' };
    }

    if (mode === 'link') {
      const el = insertLinkText(editor, gif.page || gif.media || '');
      lastInserted = { el, gif, settings };
      return { ok: true, mode: 'link', el };
    }
    // 'code' ve 'rich' modlarında editörde gerçek GIF (önizleme) gösterilir;
    // fark yayın anında ortaya çıkar: code → kalıcı GIF kodu, rich → yok.

    const cw = measureContainer(editor);
    const pill = buildPill(gif, settings, cw);
    insertPillIntoEditor(editor, pill);

    // YouTube editörü DOM'u sadeleştirirse diye kontrol et
    window.setTimeout(() => {
      if (!pill.isConnected) {
        try {
          const again = insertPillIntoEditor(editor, buildPill(gif, settings, measureContainer(editor)));
          lastInserted = { el: again, gif, settings };
        } catch (e) {
          /* yoksay */
        }
      }
    }, 350);


    lastInserted = { el: pill, gif, settings };
    return { ok: true, mode: 'rich', el: pill };
  }

  function updateLive(settings) {
    if (!lastInserted || !lastInserted.el || !lastInserted.el.isConnected) return false;
    applyStyles(lastInserted.el, settings, lastInserted.gif && lastInserted.gif.w);
    return true;
  }

  function getLastInserted() {
    return lastInserted;
  }

  function removeLastInserted() {
    if (lastInserted && lastInserted.el && lastInserted.el.isConnected) {
      const el = lastInserted.el;
      el.remove();
      lastInserted = null;
      return true;
    }
    lastInserted = null;
    return false;
  }


  /* ------------------------------------------------------------------ */
  /* Yayınlama köprüsü                                                   */
  /* YouTube, gönderilen yorumlarda satır içi <img> saklamaz. Bu yüzden  */
  /* "Yorum yap" tıklandığı ANDA (YouTube DOM'u okumadan önce) pill'leri */
  /* kalıcı metne çeviriyoruz: ":gfy:<id>: <link>"                       */
  /* ------------------------------------------------------------------ */
  let published = [];

  function publishFallback(settings) {
    const pills = Array.prototype.slice.call(document.querySelectorAll('.gfy-pill'));
    if (!pills.length) return 0;
    const s = settings || (published[0] && published[0].settings) || {};
    let count = 0;
    published = [];
    pills.forEach((pill) => {
      const info = pill.__gfy || {};
      const gif = info.gif || {};
      let text = '';
      try {
        text = Core.publishText(gif, s);
      } catch (e) {
        text = '';
      }
      if (!text) return;
      const node = document.createTextNode(text + ' ');
      pill.replaceWith(node);
      published.push({ node, gif, settings: s });
      count += 1;
    });
    if (count) scheduleRestore();
    return count;
  }

  /** Yorum gönderilemezse (doğrulama hatası vb.) GIF'i geri koy. */
  function scheduleRestore() {
    window.setTimeout(() => {
      const alive = published.filter((p) => p.node && p.node.isConnected);
      published = [];
      if (!alive.length) return; // yorum gönderildi, editör temizlendi
      alive.forEach((p) => {
        try {
          const pill = buildPill(p.gif, p.settings, 380);
          p.node.replaceWith(pill);
        } catch (e) {
          /* yoksay */
        }
      });
    }, 3200);
  }

  function hasPills() {
    return !!document.querySelector('.gfy-pill');
  }

  /* ---------------------------------------------------------------- */
  /* Panodan görsel yapıştırma (yerel GIF)                             */
  /* ---------------------------------------------------------------- */
  async function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }

  async function pickImageSize(dataUrl) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = () => resolve({ w: 0, h: 0 });
      im.src = dataUrl;
    });
  }

  g.GFYInsert = {
    ensureDocStyles,
    findEditor,
    findTextarea,
    resolveEditor,
    rememberEditor,
    measureContainer,
    buildPill,
    applyStyles,
    insertGif,
    insertLinkText,
    publishFallback,
    hasPills,
    updateLive,
    getLastInserted,
    removeLastInserted,
    fileToDataUrl,
    pickImageSize
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
