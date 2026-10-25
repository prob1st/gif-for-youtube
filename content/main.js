/**
 * GIF for YouTube — giriş noktası
 * Ayarları yükler, paneli kurar, mesajları ve sürükle-bırakı yerelleştirir.
 */
(function (g) {
  'use strict';
  if (g.__gfyLoaded) return;
  g.__gfyLoaded = true;

  const Core = g.GFYCore;
  const Ins = g.GFYInsert;

  /** Promise tabanlı mesajlaşma (arka plan uyanmamışsa da hata vermez). */
  function send(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => {
          const err = chrome.runtime.lastError;
          if (err) resolve({ ok: false, error: err.message });
          else resolve(res || { ok: false, error: 'no_response' });
        });
      } catch (e) {
        resolve({ ok: false, error: String(e && e.message) });
      }
    });
  }
  g.cGFY = { send };

  let panel = null;
  let settings = null;

  async function init() {
    const store = await chrome.storage.local.get('settings');
    settings = Core.mergeSettings(store.settings, {});
    if (!store.settings) await chrome.storage.local.set({ settings });

    panel = new g.GFYPanel(settings);
    panel.mount();

    // YouTube SPA geçişleri: panel documentElement'e bağlı kaldığı için
    // yeniden bağlanmaya gerek yok; yalnızca koptuysa geri ekle.
    const guard = window.setInterval(() => {
      if (panel && !panel.host.isConnected) panel.mount();
    }, 4000);
    window.addEventListener('pagehide', () => window.clearInterval(guard), { once: true });

    maybeWelcome();
  }

  async function maybeWelcome() {
    if (settings.onboardingDone) return;
    const keys = await chrome.storage.local.get('welcomeShownAt');
    if (keys.welcomeShownAt) return;
    await chrome.storage.local.set({ welcomeShownAt: Date.now() });
    window.setTimeout(() => {
      if (!panel) return;
      panel.open();
      panel.showBanner(panel.t('welcomeBody'));
    }, 1800);
  }

  /* ------------------------------------------------------------------ */
  /* Mesajlar                                                            */
  /* ------------------------------------------------------------------ */
  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'gfy:open-panel') {
      if (!panel) return;
      panel.open();
      respond({ ok: true, open: true });
    } else if (msg.type === 'gfy:quick-insert') {
      if (!panel) return;
      const last = panel.recent && panel.recent[0];
      if (!last) {
        panel.open();
        panel.toast(panel.t('recentEmpty'), false);
        respond({ ok: false });
        return;
      }
      const gif = last.gif || last;
      const res = Ins.insertGif(gif, panel.settings);
      panel.toast(res.ok ? panel.t('inserted') : panel.t('noEditor'), res.ok);
      if (res.ok) {
        panel.insertedEl = res.el || null;
        panel.selection = gif;
        panel.refreshStudio();
      }
      respond({ ok: res.ok });
    } else if (msg.type === 'gfy:insert-gif' && msg.gif) {
      if (!panel) return;
      panel.selectGif(msg.gif, { insert: true });
      respond({ ok: true });
    } else if (msg.type === 'gfy:status') {
      respond({ ok: true, mounted: !!panel, panelOpen: panel ? panel.open_ : false });
    }
  });

  /* ------------------------------------------------------------------ */
  /* Panelden yorum alanına sürükle-bırak                                */
  /* ------------------------------------------------------------------ */
  document.addEventListener(
    'dragover',
    (e) => {
      if (!g.__gfyDrag) return;
      const editor = Ins.resolveEditor();
      if (editor && (editor === e.target || editor.contains(e.target))) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    },
    true
  );

  document.addEventListener(
    'drop',
    (e) => {
      const dragged = g.__gfyDrag;
      if (!dragged) return;
      const editor = Ins.resolveEditor();
      if (!editor) return;
      e.preventDefault();
      e.stopPropagation();
      // Bırakılan noktaya imleci taşı
      try {
        editor.focus({ preventScroll: true });
        let range = null;
        if (document.caretRangeFromPoint) {
          range = document.caretRangeFromPoint(e.clientX, e.clientY);
        } else if (document.caretPositionFromPoint) {
          const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
          if (pos) {
            range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
          }
        }
        if (range && editor.contains(range.startContainer)) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch (err) {
        /* yoksay */
      }
      const res = Ins.insertGif(dragged, panel ? panel.settings : settings);
      if (panel) {
        panel.insertedEl = res.el || null;
        panel.selection = dragged;
        panel.refreshStudio();
        panel.pushRecent(dragged);
        panel.toast(panel.t('inserted'), res.ok);
      }
      g.__gfyDrag = null;
    },
    true
  );


  /* ------------------------------------------------------------------ */
  /* Yayınlama kancaları                                                 */
  /* YouTube, "Yorum yap"a basınca editörün DOM'unu okuyup <img>'leri     */
  /* atar. Biz kendi dinleyicimizi capture fazında, YouTube'un          */
  /* dinleyicisinden ÖNCE çalıştırıp GIF'i kalıcı metne çeviriyoruz.     */
  /* ------------------------------------------------------------------ */
  const SUBMIT_SELECTOR = [
    '#submit-button',
    'ytd-button-renderer#submit-button',
    'tp-yt-paper-button#submit-button',
    'ytd-commentbox #submit-button',
    'ytd-comment-dialog #submit-button',
    'button[aria-label*="Comment" i]',
    'button[aria-label*="Yorum" i]',
    'tp-yt-paper-button[aria-label*="Comment" i]',
    'tp-yt-paper-button[aria-label*="Yorum" i]',
    'ytd-button-renderer[aria-label*="Comment" i]',
    'ytd-button-renderer[aria-label*="Yorum" i]'
  ].join(',');

  function isSubmitTarget(el) {
    if (!el || el.nodeType !== 1) return false;
    let hit = null;
    try {
      hit = el.closest(SUBMIT_SELECTOR);
    } catch (e) {
      return false;
    }
    if (!hit) return false;
    // Normalde gönder düğmesi bir yorum bileşeninin içindedir
    if (hit.closest('ytd-commentbox, ytd-comment-dialog, ytd-comment-simplebox-renderer')) return true;
    // Yedek: editörde bizim GIF'imiz varsa, "Yorum/Comment" adlı düğme gönder düğmesidir
    // (yanlış tahmin olursa publishFallback geri alma zamanlayıcısı GIF'i geri koyar)
    return Ins.hasPills();
  }

  function maybePublishFallback() {
    if (!Ins.hasPills()) return;
    const s = (panel && panel.settings) || settings;
    const n = Ins.publishFallback(s);
    if (n && panel) panel.showBanner(panel.t('publishSafe'));
  }

  // Yalnızca 'click' capture: pointerdown/mousedown'da DOM'u değiştirirsek
  // editör kısalır, gönder düğmesi kayar ve tıklama hiç kaydedilmez.
  document.addEventListener(
    'click',
    (e) => {
      if (isSubmitTarget(e.target)) maybePublishFallback();
    },
    true
  );

  document.addEventListener(
    'keydown',
    (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Enter' && mod) {
        const t = e.target;
        if (t && t.isContentEditable && document.querySelector('.gfy-pill')) maybePublishFallback();
      }
    },
    true
  );

  /* ------------------------------------------------------------------ */
  /* Klavye: Ctrl/Cmd + Shift + G (içerik betiği tarafı yedek)           */
  /* ------------------------------------------------------------------ */
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape' && panel && panel.open_) {
        panel.close();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault();
        if (panel) panel.toggle();
      }
      if (mod && e.shiftKey && (e.key === 'Y' || e.key === 'y')) {
        e.preventDefault();
        chrome.runtime.sendMessage({ type: 'gfy:stats', kind: 'quick' });
        const last = panel && panel.recent && panel.recent[0];
        if (last) {
          const gif = last.gif || last;
          const res = Ins.insertGif(gif, panel.settings);
          if (panel) panel.toast(res.ok ? panel.t('inserted') : panel.t('noEditor'), res.ok);
        }
      }
    },
    true
  );

  /* ------------------------------------------------------------------ */
  init().catch((err) => console.warn('[GIF for YouTube] init hatası:', err));
})(typeof globalThis !== 'undefined' ? globalThis : window);
