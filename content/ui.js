/**
 * GIF for YouTube — panel arayüzü (shadow DOM)
 * Tamamı createElement ile kurulur: sayfanın CSP / Trusted Types
 * politikalarından ve YouTube CSS'inden etkilenmez.
 */
(function (g) {
  'use strict';
  const Core = g.GFYCore;
  const I18N = g.GFYI18N;
  const Ins = g.GFYInsert;

  /* ------------------------------------------------------------------ */
  /* DOM yardımcıları                                                    */
  /* ------------------------------------------------------------------ */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'className') node.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'attrs') for (const a in v) if (v[a] != null) node.setAttribute(a, v[a]);
        else if (k === 'props') Object.assign(node, v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    (children || []).forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = {
    close: ['M18 6L6 18', 'M6 6l12 12'],
    star: ['M12 3.2l2.7 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.7 6.4 20.7l1.2-6.4L2.9 9.9l6.4-.8z'],
    search: ['M10.8 3.5a7.3 7.3 0 100 14.6 7.3 7.3 0 000-14.6z', 'M16.2 16.2L21 21'],
    upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3'],
    link: ['M9.5 14.5l5-5', 'M11 6.5l1.4-1.4a4 4 0 015.6 5.6L16.5 12.2', 'M12.6 17.5l-1.4 1.4a4 4 0 01-5.6-5.6L7 11.8'],
    check: ['M20 6.5L9.2 17.3 4 12.1'],
    copy: ['M9 9h9a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1v-9a1 1 0 011-1z', 'M5 15H4a1 1 0 01-1-1V5a1 1 0 011-1h9a1 1 0 011 1v1'],
    download: ['M12 4v11', 'M7.5 10.5L12 15l4.5-4.5', 'M5 20h14'],
    trash: ['M4 7h16', 'M9.5 7V4.5h5V7', 'M6.5 7l1 13h9l1-13'],
    chevron: ['M6 9.5l6 6 6-6'],
    sparkle: ['M12 3.5l1.7 4.4 4.4 1.7-4.4 1.7L12 15.7l-1.7-4.4L5.9 9.6l4.4-1.7z', 'M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z'],
    image: ['M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z', 'M8.5 10.2a1.4 1.4 0 100-2.8 1.4 1.4 0 000 2.8z', 'M21 16l-5-5-4 4-2.5-2.5L3 19'],
    sliders: ['M4 8h9', 'M17 8h3', 'M4 16h3', 'M11 16h9', 'M15 5.5v5', 'M9 13.5v5'],
    refresh: ['M20.5 12a8.5 8.5 0 11-2.6-6.1', 'M20.8 4.2v4.4h-4.4'],
    external: ['M14 4h6v6', 'M20 4l-9 9', 'M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5'],
    undo: ['M4 10h10a4.5 4.5 0 010 9H8', 'M4 10l4-4', 'M4 10l4 4'],
    grid: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z']
  };

  function icon(name, size) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.9');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    if (size) {
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
    }
    (ICONS[name] || []).forEach((d) => {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', d);
      svg.appendChild(p);
    });
    return svg;
  }

  /* ------------------------------------------------------------------ */
  /* Depolama                                                            */
  /* ------------------------------------------------------------------ */
  const Store = {
    async get(key, fallback) {
      const o = await chrome.storage.local.get(key);
      return o && o[key] !== undefined ? o[key] : fallback;
    },
    async set(key, val) {
      await chrome.storage.local.set({ [key]: val });
      return val;
    }
  };

  const PRESETS = {
    clean: { sizePct: 40, radius: 14, border: 'none', borderWidth: 0, shadow: 'soft', badge: true, captionOn: false, grayscale: 0, brightness: 100, contrast: 100, saturate: 100, hue: 0, blur: 0 },
    meme: { sizePct: 52, radius: 4, border: 'solid', borderWidth: 3, borderColor: '#ffffff', shadow: 'hard', badge: false, captionOn: true, captionPos: 'bottom', captionBg: '#ffffff', captionColor: '#000000', captionUpper: true, captionSize: 15, grayscale: 0, brightness: 102, contrast: 112, saturate: 108, hue: 0, blur: 0 },
    neon: { sizePct: 46, radius: 18, border: 'glow', borderWidth: 2, borderColor: '#ff2d55', shadow: 'neon', badge: true, captionOn: false, grayscale: 0, brightness: 106, contrast: 108, saturate: 132, hue: 0, blur: 0 },
    retro: { sizePct: 44, radius: 2, border: 'dashed', borderWidth: 2, borderColor: '#ffd166', shadow: 'hard', badge: true, captionOn: true, captionBg: 'rgba(0,0,0,.8)', captionColor: '#ffd166', captionUpper: true, captionSize: 12, grayscale: 0, brightness: 100, contrast: 104, saturate: 86, hue: -12, blur: 0 },
    cinema: { sizePct: 60, radius: 6, border: 'none', borderWidth: 0, shadow: 'soft', badge: false, captionOn: true, captionPos: 'bottom', captionBg: 'rgba(0,0,0,.85)', captionColor: '#f5f5f5', captionSize: 12, captionUpper: false, grayscale: 18, brightness: 96, contrast: 116, saturate: 92, hue: 0, blur: 0 }
  };

  const ACCENTS = ['#ff2d55', '#ff7a3d', '#a855f7', '#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#ec4899'];

  /* ------------------------------------------------------------------ */
  /* Panel                                                               */
  /* ------------------------------------------------------------------ */
  class GfyPanel {
    constructor(settings) {
      this.settings = settings;
      this.lang = settings.lang || 'tr';
      this.t = I18N.makeT(this.lang);
      this.tab = 'explore';
      this.category = 'all';
      this.selection = null;
      this.insertedEl = null;
      this.items = [];
      this.refs = {};
      this.open_ = false;
      this.searchSeq = 0;
      this.recent = [];
      this.favorites = [];
      this.custom = [];
      this.observer = null;
      this.toastTimer = null;
      this.build();
      this.loadUserData();
    }

    /* ---------------- iskelet ---------------- */
    build() {
      const host = document.createElement('div');
      host.id = 'gfy-host';
      host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483000';
      const shadow = host.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = g.GFY_CSS;
      shadow.appendChild(style);

      const root = el('div', { className: 'gfy-root', attrs: { 'data-theme': this.settings.theme, 'data-motion': this.settings.reduceMotion ? 'reduce' : '' } });
      root.style.setProperty('--accent', this.settings.accent || '#ff2d55');

      // FAB
      const fab = el('button', {
        className: 'gfy-fab',
        attrs: { type: 'button', title: this.t('appName') + ' · Ctrl+Shift+G', 'aria-label': this.t('appName') },
        style: { pointerEvents: 'auto' },
        text: 'GIF',
        onclick: (e) => {
          e.stopPropagation();
          this.toggle();
        }
      });
      fab.hidden = !this.settings.showFab;

      const panel = el('div', {
        className: 'gfy-panel',
        attrs: { role: 'dialog', 'aria-label': 'GIF Studio', 'aria-modal': 'false' },
        style: { pointerEvents: 'auto' }
      });
      panel.hidden = true;

      /* başlık */
      const titleBox = el('div', {}, [
        el('div', { className: 'gfy-title', text: this.t('appName') }),
        el('div', { className: 'gfy-sub', text: this.t('tagline') + ' · ' + (g.GFYPack ? g.GFYPack.size : 0) + ' GIF' })
      ]);
      const head = el('div', { className: 'gfy-head' }, [
        el('div', { className: 'gfy-logo', text: 'GIF' }),
        titleBox,
        el('div', { className: 'gfy-spacer' }),
        el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('undo'), 'aria-label': this.t('undo') }, onclick: () => this.undo(), text: '' }, [icon('undo')]),
        el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('tabSettings'), 'aria-label': this.t('tabSettings') }, onclick: () => this.setTab('settings') }, [icon('sliders')]),
        el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('close') + ' (Esc)', 'aria-label': this.t('close') }, onclick: () => this.close() }, [icon('close')])
      ]);
      this.refs.head = head;

      /* sekmeler */
      const tabs = el('div', { className: 'gfy-tabs', attrs: { role: 'tablist' } });
      this.tabDefs = [
        ['explore', 'tabExplore'],
        ['search', 'tabSearch'],
        ['link', 'tabLink'],
        ['local', 'tabLocal'],
        ['mine', 'tabMine'],
        ['settings', 'tabSettings']
      ];
      this.tabDefs.forEach(([id, key]) => {
        const b = el('button', {
          className: 'gfy-tab',
          attrs: { type: 'button', role: 'tab', 'aria-selected': 'false', 'data-tab': id },
          text: this.t(key),
          onclick: () => this.setTab(id)
        });
        tabs.appendChild(b);
      });
      this.refs.tabs = tabs;

      const body = el('div', { className: 'gfy-body' });
      this.refs.body = body;

      const views = {};
      ['explore', 'search', 'link', 'local', 'mine', 'settings'].forEach((id) => {
        const v = el('div', { className: 'gfy-view', attrs: { 'data-view': id, role: 'tabpanel' } });
        v.hidden = id !== this.tab;
        views[id] = v;
        body.appendChild(v);
      });
      this.views = views;

      /* stüdyo */
      const studio = this.buildStudio();

      const banner = el('div', { className: 'gfy-banner' });
      banner.hidden = true;
      banner.appendChild(el('span', { className: 'gfy-banner-txt' }));
      banner.appendChild(
        el('button', {
          className: 'gfy-iconbtn',
          attrs: { type: 'button', 'aria-label': this.t('close') },
          onclick: () => this.hideBanner()
        }, [icon('close')])
      );

      panel.appendChild(head);
      panel.appendChild(tabs);
      panel.appendChild(banner);
      panel.appendChild(body);
      panel.appendChild(studio.node);
      panel.appendChild(el('div', { className: 'gfy-toast', attrs: { role: 'status', 'aria-live': 'polite' } }));

      this.refs.panel = panel;
      this.refs.fab = fab;
      this.refs.root = root;
      this.refs.toast = panel.querySelector('.gfy-toast');
      this.refs.banner = banner;
      this.refs.studio = studio;

      root.appendChild(panel);
      root.appendChild(fab);
      shadow.appendChild(root);
      this.host = host;
      this.shadow = shadow;

      this.buildExplore();
      this.buildSearch();
      this.buildLink();
      this.buildLocal();
      this.buildMine();
      this.buildSettings();
      this.makeDraggable(panel, head);
      this.positionPanel();

      panel.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    mount() {
      if (!this.host.isConnected) document.documentElement.appendChild(this.host);
    }

    /* ---------------- sürüklenebilir ---------------- */
    makeDraggable(panel, handle) {
      let dragging = false;
      let sx = 0;
      let sy = 0;
      let ox = 0;
      let oy = 0;
      handle.addEventListener('pointerdown', (e) => {
        if (e.target.closest('button')) return;
        dragging = true;
        const r = panel.getBoundingClientRect();
        sx = e.clientX;
        sy = e.clientY;
        ox = r.left;
        oy = r.top;
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const r = panel.getBoundingClientRect();
        let nx = Core.clamp(ox + (e.clientX - sx), 8, window.innerWidth - r.width - 8);
        let ny = Core.clamp(oy + (e.clientY - sy), 8, window.innerHeight - 60);
        panel.style.left = nx + 'px';
        panel.style.top = ny + 'px';
        panel.style.right = 'auto';
      });
      handle.addEventListener('pointerup', (e) => {
        if (!dragging) return;
        dragging = false;
        try {
          handle.releasePointerCapture(e.pointerId);
        } catch (err) {}
        Store.set('panelPos', { left: panel.style.left, top: panel.style.top });
      });
    }

    async positionPanel() {
      const pos = await Store.get('panelPos', null);
      const p = this.refs.panel;
      // Dar ekranda panel alt-sheet olarak tam genişlikte açılır; konum hatırlanmaz.
      if (window.innerWidth <= 520) {
        p.style.left = '';
        p.style.top = '';
        p.style.right = '';
        return;
      }
      if (pos && pos.left) {
        p.style.left = pos.left;
        p.style.top = pos.top;
      } else {
        p.style.right = '20px';
        p.style.top = '72px';
      }
    }

    /* ---------------- aç / kapat ---------------- */
    open() {
      this.mount();
      this.refs.panel.hidden = false;
      this.open_ = true;
      this.refreshMine();
      window.setTimeout(() => this.loadActiveView(), 40);
      const editor = Ins.resolveEditor();
      if (editor) {
        this.lastEditorAtOpen = editor;
      }
      window.setTimeout(() => {
        const inp = this.views.search.querySelector('input');
        if (inp && this.tab === 'search') inp.focus();
      }, 60);
    }

    close() {
      this.refs.panel.hidden = true;
      this.open_ = false;
      // Seçim korunur: paneli kapatıp açtığında GIF ve stüdyo ayarları yerinde kalır.
      // (Stüdyodaki ✕ düğmesi seçimi temizler.)
    }

    toggle() {
      if (this.open_) this.close();
      else this.open();
    }

    toast(msg, ok) {
      const t = this.refs.toast;
      t.textContent = '';
      t.appendChild(icon(ok === false ? 'close' : 'check'));
      t.appendChild(document.createTextNode(msg));
      t.classList.add('show');
      window.clearTimeout(this.toastTimer);
      this.toastTimer = window.setTimeout(() => t.classList.remove('show'), 2400);
    }

    showBanner(msg) {
      const b = this.refs.banner;
      if (!b) return;
      b.querySelector('.gfy-banner-txt').textContent = msg;
      b.hidden = false;
      window.clearTimeout(this.bannerTimer);
      this.bannerTimer = window.setTimeout(() => this.hideBanner(), 14000);
    }

    hideBanner() {
      if (this.refs.banner) this.refs.banner.hidden = true;
      window.clearTimeout(this.bannerTimer);
    }

    onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        this.close();
      }
      if (e.key === '/' && this.tab !== 'search') {
        const active = this.shadow.activeElement;
        if (active && /input|textarea/i.test(active.tagName)) return;
        e.preventDefault();
        this.setTab('search');
        const inp = this.views.search.querySelector('input');
        if (inp) inp.focus();
      }
    }

    /* ---------------- sekmeler ---------------- */
    setTab(id) {
      this.tab = id;
      this.refs.tabs.querySelectorAll('.gfy-tab').forEach((b) => {
        b.setAttribute('aria-selected', String(b.dataset.tab === id));
      });
      Object.keys(this.views).forEach((k) => {
        this.views[k].hidden = k !== id;
      });
      if (id === 'mine') this.refreshMine();
      if (id === 'settings') this.syncSettingsUI();
      window.setTimeout(() => this.loadActiveView(), 40);
      this.refs.body.scrollTop = 0;
    }

    /* ---------------- keşfet ---------------- */
    buildExplore() {
      const v = this.views.explore;
      const chips = el('div', { className: 'gfy-chips', attrs: { role: 'group', 'aria-label': 'Kategoriler' } });
      const cats = ['all'].concat(Object.keys(I18N.CATEGORIES.tr).filter((c) => c !== 'all' && c !== 'havzali'));
      cats.forEach((c) => {
        const b = el('button', {
          className: 'gfy-chip',
          attrs: { type: 'button', 'aria-pressed': String(c === this.category), 'data-cat': c },
          text: I18N.tCategory(this.lang, c),
          onclick: () => {
            this.category = c;
            chips.querySelectorAll('.gfy-chip').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.cat === c)));
            this.renderPack();
          }
        });
        chips.appendChild(b);
      });
      const grid = el('div', { className: 'gfy-grid' });
      this.refs.exploreGrid = grid;

      v.appendChild(chips);
      v.appendChild(
        el('div', { className: 'gfy-field', style: { marginBottom: '8px' } }, [
          el('button', {
            className: 'gfy-btn sm',
            attrs: { type: 'button' },
            onclick: () => this.surprise()
          }, [icon('sparkle', 13), document.createTextNode(' ' + (this.lang === 'tr' ? 'Şaşırt beni' : 'Surprise me'))]),
          el('button', {
            className: 'gfy-btn sm ghost',
            attrs: { type: 'button' },
            onclick: () => this.setTab('search')
          }, [icon('search', 13), document.createTextNode(' ' + this.t('tabSearch'))])
        ])
      );
      v.appendChild(grid);
      this.renderPack();
    }

    surprise() {
      const pool = this.filteredPack();
      const pick = pool[Math.floor(Math.random() * pool.length)];
      if (pick) this.selectGif(pick, { scrollStudio: true });
    }

    filteredPack() {
      const pack = (g.GFYPack && g.GFYPack.items) || [];
      if (this.category === 'all') return pack;
      return pack.filter((i) => i.cat === this.category);
    }

    renderPack() {
      const grid = this.refs.exploreGrid;
      grid.textContent = '';
      const items = this.filteredPack();
      this.renderGrid(grid, items.slice(0, 120));
    }

    /* ---------------- kart ızgarası ---------------- */
    renderGrid(container, items) {
      container.textContent = '';
      if (this.observer) this.observer.disconnect();
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            this.loadCard(en.target);
            this.observer.unobserve(en.target);
          });
        },
        { root: this.refs.body, rootMargin: '320px' }
      );

      items.forEach((item) => {
        const card = this.makeCard(item);
        container.appendChild(card);
        this.observer.observe(card);
      });
      if (!items.length) {
        container.appendChild(
          el('div', { className: 'gfy-empty', style: { columns: '1', width: '100%' } }, [
            icon('image'),
            el('div', { text: this.t('searchEmpty') })
          ])
        );
      }
    }

    /** Tek kartın görselini yükler (tembel yükleme birimi). */
    loadCard(card) {
      if (!card) return;
      const url = card.dataset.img;
      const img = card.querySelector('img');
      if (!img || !url || img.getAttribute('src')) return;
      img.addEventListener('load', () => {
        const sk = card.querySelector('.gfy-skel');
        if (sk) sk.remove();
      });
      img.addEventListener('error', () => {
        if (!card.dataset.retried && card.dataset.fallback) {
          card.dataset.retried = '1';
          img.src = card.dataset.fallback;
        }
      });
      img.src = url;
    }

    /** Panel görünür olduğunda açık sekmedeki kartları hemen yükle. */
    loadActiveView() {
      const view = this.views[this.tab];
      if (!view) return;
      view.querySelectorAll('.gfy-card').forEach((card) => this.loadCard(card));
    }

    makeCard(item) {
      const src = item.preview || item.media || item.url || item.dataUrl;
      const fallback = item.media || src;
      const card = el('div', {
        className: 'gfy-card',
        attrs: { tabindex: '0', role: 'button', 'aria-label': item.title || 'GIF' },
        dataset: { img: src || '', fallback: fallback || '', id: item.id || '' }
      });
      card.appendChild(el('div', { className: 'gfy-skel' }));
      // Görsel, IntersectionObserver görünür olduğunda yüklenir (tembel yükleme)
      card.appendChild(el('img', { attrs: { alt: item.title || 'GIF' } }));

      const isFav = this.isFavorite(item);
      const fav = el('button', {
        className: 'gfy-fav',
        attrs: { type: 'button', 'aria-pressed': String(isFav), 'aria-label': this.t('favorites'), title: this.t('favorites') },
        onclick: (e) => {
          e.stopPropagation();
          const now = this.toggleFavorite(item);
          fav.setAttribute('aria-pressed', String(now));
        }
      }, [icon('star', 13)]);
      card.appendChild(fav);

      card.appendChild(el('div', { className: 'gfy-meta', text: item.title || '' }));

      card.addEventListener('click', () => this.selectGif(item));
      card.addEventListener('dblclick', () => this.selectGif(item, { insert: true }));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectGif(item, { insert: e.key === 'Enter' });
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const cards = Array.from(card.parentElement.children);
          const i = cards.indexOf(card);
          const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
          const next = cards[(i + step + cards.length) % cards.length];
          if (next && next.focus) {
            e.preventDefault();
            next.focus();
          }
        }
      });
      card.addEventListener('dragstart', (e) => {
        g.__gfyDrag = item;
        try {
          e.dataTransfer.setData('text/plain', item.page || item.media || '');
          e.dataTransfer.setData('text/uri-list', item.page || item.media || '');
          e.dataTransfer.effectAllowed = 'copy';
        } catch (err) {}
      });
      card.addEventListener('dragend', () => {
        window.setTimeout(() => {
          g.__gfyDrag = null;
        }, 120);
      });
      card.draggable = true;
      return card;
    }

    /* ---------------- seçim ---------------- */
    selectGif(item, opts) {
      this.selection = item;
      this.refreshStudio();
      this.views.explore.querySelectorAll('.gfy-card.selected').forEach((c) => c.classList.remove('selected'));
      if (opts && opts.insert) this.insertSelection();
    }

    clearSelection() {
      this.selection = null;
      this.insertedEl = null;
      this.refs.studio.node.hidden = true;
    }

    /* ---------------- arama ---------------- */
    buildSearch() {
      const v = this.views.search;
      const input = el('input', {
        className: 'gfy-input',
        attrs: { type: 'search', placeholder: this.t('searchPlaceholder'), 'aria-label': this.t('searchPlaceholder'), autocomplete: 'off', spellcheck: 'false' }
      });
      const grid = el('div', { className: 'gfy-grid' });
      const status = el('div', { className: 'gfy-hint' });
      const seq = { n: 0 };

      const run = async (q) => {
        const query = String(q || '').trim();
        if (query.length < 2) {
          grid.textContent = '';
          status.textContent = this.t('searchHint');
          return;
        }
        const my = ++this.searchSeq;
        status.textContent = this.t('searching');
        grid.textContent = '';
        grid.appendChild(el('div', { className: 'gfy-skel', style: { columns: '3' } }));
        try {
          const res = await g.cGFY.send({ type: 'gfy:search', query, limit: 27 });
          if (my !== this.searchSeq) return;
          const items = (res && res.ok && res.data && res.data.items) || [];
          const provider = (res && res.data && res.data.provider) || '';
          this.renderGrid(grid, items);
          status.textContent =
            items.length + ' ' + this.t('resultsFor') + ' “' + query + '” · ' + (provider === 'pack' ? this.t('providerPack') : this.t('poweredBy'));
          if (provider === 'giphy-web') status.textContent += ' · ' + this.t('noApiKey');
          if (provider === 'pack') status.textContent = this.t('searchEmpty');
        } catch (err) {
          if (my !== this.searchSeq) return;
          grid.textContent = '';
          status.textContent = this.t('searchEmpty');
        }
      };

      let timer = null;
      input.addEventListener('input', () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => run(input.value), 420);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.clearTimeout(timer);
          run(input.value);
        }
      });

      v.appendChild(el('div', { className: 'gfy-field' }, [input, el('button', { className: 'gfy-btn primary', attrs: { type: 'button' }, text: this.t('tabSearch'), onclick: () => run(input.value) })]));
      v.appendChild(
        el('div', { className: 'gfy-field', style: { marginBottom: '6px' } }, [
          el('button', {
            className: 'gfy-btn sm ghost',
            attrs: { type: 'button', title: this.t('tenorHint') },
            onclick: () => {
              const q = (input.value || '').trim();
              window.open('https://tenor.com/search/' + encodeURIComponent(q || 'reaction') + '-gifs', '_blank', 'noopener');
            }
          }, [icon('external', 13), document.createTextNode(' ' + this.t('tenorSearch'))])
        ])
      );
      v.appendChild(status);
      v.appendChild(grid);
      status.textContent = this.t('searchHint');
      this.refs.searchInput = input;
      this.refs.searchGrid = grid;
      this.refs.searchStatus = status;
    }

    /* ---------------- link ---------------- */
    buildLink() {
      const v = this.views.link;
      const input = el('input', { className: 'gfy-input', attrs: { type: 'text', placeholder: this.t('linkPlaceholder'), 'aria-label': this.t('linkPlaceholder'), spellcheck: 'false' } });
      const out = el('div');
      const status = el('div', { className: 'gfy-hint', text: this.t('linkHint') });

      const resolve = async () => {
        const raw = input.value.trim();
        if (!raw) return;
        const parsed = Core.parseGifInput(raw);
        if (!parsed.ok) {
          status.textContent = this.t('linkError');
          return;
        }
        status.textContent = this.t('resolving');
        out.textContent = '';
        const res = await g.cGFY.send({ type: 'gfy:resolve', url: raw });
        const gif = res && res.ok ? res.data : null;
        if (!gif) {
          status.textContent = this.t('linkError');
          return;
        }
        status.textContent = '';
        this.renderResolved(out, gif);
        this.selectGif(gif);
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') resolve();
      });

      v.appendChild(el('div', { className: 'gfy-field' }, [input, el('button', { className: 'gfy-btn primary', attrs: { type: 'button' }, text: this.t('resolve'), onclick: resolve })]));
      v.appendChild(status);
      v.appendChild(out);
      this.refs.linkInput = input;
      this.refs.linkOut = out;
      this.refs.linkStatus = status;
    }

    renderResolved(container, gif) {
      container.textContent = '';
      const img = el('img', { attrs: { src: gif.media || gif.url, alt: gif.title || 'GIF', referrerpolicy: 'no-referrer' }, style: { width: '100%', borderRadius: '12px', display: 'block', marginBottom: '10px', background: 'var(--bg3)' } });
      container.appendChild(img);
      container.appendChild(el('div', { className: 'gfy-hint', text: gif.title || '' }));
      container.appendChild(
        el('div', { className: 'gfy-field' }, [
          el('button', { className: 'gfy-btn primary', attrs: { type: 'button' }, text: this.t('insert'), onclick: () => this.selectGif(gif, { insert: true }) }),
          el('button', { className: 'gfy-btn', attrs: { type: 'button' }, text: this.t('addToReactions'), onclick: () => this.addCustom(gif) })
        ])
      );
    }

    /* ---------------- yerel ---------------- */
    buildLocal() {
      const v = this.views.local;
      const drop = el('div', { className: 'gfy-drop' }, [
        icon('upload'),
        el('p', { text: this.t('localHint') }),
        el('button', { className: 'gfy-btn sm', attrs: { type: 'button' }, text: this.t('localPick') })
      ]);
      const fileInput = el('input', { attrs: { type: 'file', accept: 'image/gif,image/webp,image/png,image/jpeg,video/mp4', multiple: 'true' }, style: { display: 'none' } });
      const out = el('div');

      const handleFiles = async (files) => {
        for (const file of Array.from(files)) {
          const isImage = /^image\//.test(file.type);
          const isVideo = /^video\//.test(file.type);
          if (!isImage && !isVideo) {
            this.toast(this.lang === 'tr' ? 'Sadece görsel/GIF dosyaları' : 'Images only', false);
            continue;
          }
          if (file.size > this.settings.maxFileMb * 1024 * 1024) {
            this.toast(this.t('tooBig') + ' (' + Core.formatBytes(file.size) + ')', false);
            continue;
          }
          if (isVideo) {
            this.toast(this.lang === 'tr' ? 'Video yerine GIF seç' : 'Choose a GIF instead of video', false);
            continue;
          }
          const dataUrl = await Ins.fileToDataUrl(file);
          const size = await Ins.pickImageSize(dataUrl);
          const gif = {
            id: 'local-' + Math.random().toString(36).slice(2, 10),
            title: file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60),
            src: 'local',
            dataUrl,
            media: dataUrl,
            w: size.w,
            h: size.h,
            bytes: file.size,
            addedAt: Date.now()
          };
          out.textContent = '';
          const img = el('img', { attrs: { src: dataUrl, alt: gif.title }, style: { width: '100%', borderRadius: '12px', display: 'block', marginBottom: '8px' } });
          out.appendChild(img);
          out.appendChild(el('div', { className: 'gfy-hint', text: gif.title + ' · ' + Core.formatBytes(file.size) + ' · ' + size.w + '×' + size.h }));
          out.appendChild(
            el('div', { className: 'gfy-field' }, [
              el('button', { className: 'gfy-btn primary', attrs: { type: 'button' }, text: this.t('insert'), onclick: () => this.selectGif(gif, { insert: true }) }),
              el('button', { className: 'gfy-btn', attrs: { type: 'button' }, text: this.t('addToReactions'), onclick: () => this.addCustom(gif) })
            ])
          );
          this.selectGif(gif);
        }
      };

      drop.querySelector('button').addEventListener('click', () => fileInput.click());
      drop.addEventListener('click', (e) => {
        if (e.target === drop) fileInput.click();
      });
      fileInput.addEventListener('change', () => handleFiles(fileInput.files));
      ['dragenter', 'dragover'].forEach((ev) =>
        drop.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          drop.classList.add('over');
        })
      );
      ['dragleave', 'drop'].forEach((ev) =>
        drop.addEventListener(ev, (e) => {
          e.preventDefault();
          e.stopPropagation();
          drop.classList.remove('over');
          if (ev === 'drop' && e.dataTransfer && e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        })
      );
      // Pano yapıştırma
      const pasteHandler = (e) => {
        if (!this.open_ || this.tab !== 'local') return;
        const items = (e.clipboardData && e.clipboardData.items) || [];
        const files = [];
        for (const it of items) {
          if (it.kind === 'file') {
            const f = it.getAsFile();
            if (f) files.push(f);
          }
        }
        if (files.length) {
          e.preventDefault();
          handleFiles(files);
        }
      };
      document.addEventListener('paste', pasteHandler, true);

      v.appendChild(drop);
      v.appendChild(fileInput);
      v.appendChild(out);
      v.appendChild(el('div', { className: 'gfy-note', style: { marginTop: '10px' }, text: this.t('localNote') }));
    }

    /* ---------------- benim ---------------- */
    buildMine() {
      const v = this.views.mine;
      const recentBox = el('div');
      const favBox = el('div');
      const customBox = el('div');
      v.appendChild(el('div', { className: 'gfy-sec-title', text: this.t('mineRecent') }));
      v.appendChild(recentBox);
      v.appendChild(el('div', { className: 'gfy-sec-title', text: this.t('mineFav') }));
      v.appendChild(favBox);
      v.appendChild(el('div', { className: 'gfy-sec-title', text: this.t('mineCustom') }));
      v.appendChild(customBox);
      this.refs.recentBox = recentBox;
      this.refs.favBox = favBox;
      this.refs.customBox = customBox;
    }

    listRow(item, opts) {
      const src = item.dataUrl || item.preview || item.media || '';
      const row = el('div', { className: 'gfy-row' }, [
        el('img', { attrs: { src, alt: item.title || 'GIF', loading: 'lazy' } }),
        el('div', { className: 'gfy-col' }, [
          el('div', { className: 'gfy-name', text: item.title || 'GIF' }),
          el('div', { className: 'gfy-when', text: opts && opts.when ? opts.when : item.src === 'local' ? this.t('tabLocal') : 'Giphy' })
        ]),
        el('button', { className: 'gfy-btn sm primary', attrs: { type: 'button' }, text: this.t('insert'), onclick: (e) => { e.stopPropagation(); this.selectGif(item, { insert: true }); } })
      ]);
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => this.selectGif(item));
      if (opts && opts.onDelete) {
        row.appendChild(el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('remove'), 'aria-label': this.t('remove') }, onclick: (e) => { e.stopPropagation(); opts.onDelete(); } }, [icon('trash')]));
      }
      return row;
    }

    async loadUserData() {
      this.recent = await Store.get('recents', []);
      this.favorites = await Store.get('favorites', []);
      this.custom = await Store.get('custom', []);
      this.refreshMine();
    }

    refreshMine() {
      if (!this.refs.recentBox) return;
      const empty = (txt) => el('div', { className: 'gfy-empty' }, [icon('image'), el('div', { text: txt })]);

      this.refs.recentBox.textContent = '';
      if (!this.recent.length) this.refs.recentBox.appendChild(empty(this.t('recentEmpty')));
      this.recent.slice(0, 8).forEach((r) =>
        this.refs.recentBox.appendChild(this.listRow(r.gif || r, { when: Core.relativeTime(r.ts, this.lang) }))
      );

      this.refs.favBox.textContent = '';
      if (!this.favorites.length) this.refs.favBox.appendChild(empty(this.t('favoritesEmpty')));
      this.favorites.slice(0, 12).forEach((f) =>
        this.refs.favBox.appendChild(
          this.listRow(f, {
            onDelete: async () => {
              this.favorites = this.favorites.filter((x) => Core.gifSignature(x) !== Core.gifSignature(f));
              await Store.set('favorites', this.favorites);
              this.refreshMine();
            }
          })
        )
      );

      this.refs.customBox.textContent = '';
      if (!this.custom.length) this.refs.customBox.appendChild(empty(this.t('mineCustomEmpty')));
      this.custom.forEach((c, i) =>
        this.refs.customBox.appendChild(
          this.listRow(c, {
            onDelete: async () => {
              this.custom.splice(i, 1);
              await Store.set('custom', this.custom);
              this.refreshMine();
            }
          })
        )
      );
    }

    isFavorite(gif) {
      const sig = Core.gifSignature(gif);
      return this.favorites.some((f) => Core.gifSignature(f) === sig);
    }

    toggleFavorite(gif) {
      const sig = Core.gifSignature(gif);
      const idx = this.favorites.findIndex((f) => Core.gifSignature(f) === sig);
      if (idx >= 0) {
        this.favorites.splice(idx, 1);
        Store.set('favorites', this.favorites);
        this.refreshMine();
        return false;
      }
      this.favorites.unshift({
        id: gif.id, title: gif.title, media: gif.media, preview: gif.preview,
        page: gif.page, src: gif.src, w: gif.w, h: gif.h, dataUrl: gif.dataUrl, savedAt: Date.now()
      });
      this.favorites = this.favorites.slice(0, 120);
      Store.set('favorites', this.favorites);
      this.refreshMine();
      return true;
    }

    async addCustom(gif) {
      this.custom.unshift({
        id: gif.id || 'custom-' + Date.now(),
        title: gif.title || 'GIF',
        src: 'local',
        dataUrl: gif.dataUrl || gif.media,
        media: gif.dataUrl || gif.media,
        w: gif.w,
        h: gif.h,
        addedAt: Date.now()
      });
      this.custom = this.custom.slice(0, 20);
      try {
        await Store.set('custom', this.custom);
        this.toast(this.t('saved'));
      } catch (e) {
        this.toast(this.lang === 'tr' ? 'Depolama dolu' : 'Storage full', false);
      }
      this.refreshMine();
    }

    async pushRecent(gif) {
      const sig = Core.gifSignature(gif);
      this.recent = this.recent.filter((r) => Core.gifSignature(r.gif || r) !== sig);
      this.recent.unshift({
        ts: Date.now(),
        gif: {
          id: gif.id, title: gif.title, media: gif.media, preview: gif.preview, page: gif.page,
          src: gif.src, w: gif.w, h: gif.h, dataUrl: gif.dataUrl && gif.dataUrl.length < 900000 ? gif.dataUrl : undefined
        }
      });
      this.recent = this.recent.slice(0, 40);
      await Store.set('recents', this.recent);
      this.refreshMine();
    }

    /* ---------------- stüdyo ---------------- */
    buildStudio() {
      const node = el('div', { className: 'gfy-studio' });
      node.hidden = true;

      const thumb = el('img', { className: 'gfy-thumb', attrs: { alt: '' } });
      const title = el('div', { className: 'gfy-studio-title', text: this.t('studio') });
      const sub = el('div', { className: 'gfy-studio-sub', text: '' });
      const liveBadge = el('span', { className: 'gfy-live', text: '', style: { display: 'none' } });
      const expandBtn = el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('advanced'), 'aria-label': this.t('advanced') }, onclick: () => {
        node.classList.toggle('collapsed');
        expandBtn.style.transform = node.classList.contains('collapsed') ? 'rotate(-90deg)' : '';
      } }, [icon('chevron')]);
      const head = el('div', { className: 'gfy-studio-head' }, [
        thumb,
        el('div', { style: { flex: '1', minWidth: '0' } }, [title, sub, liveBadge]),
        expandBtn,
        el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('close'), 'aria-label': this.t('close') }, onclick: () => this.clearSelection() }, [icon('close')])
      ]);

      const body = el('div', { className: 'gfy-studio-body' });
      const foot = el('div', { className: 'gfy-studio-foot' });

      /* --- presetler --- */
      const presets = el('div', { className: 'gfy-presets' });
      [
        ['presetClean', 'clean'],
        ['presetMeme', 'meme'],
        ['presetNeon', 'neon'],
        ['presetRetro', 'retro'],
        ['presetCinema', 'cinema']
      ].forEach(([key, id]) => {
        presets.appendChild(
          el('button', { attrs: { type: 'button' }, text: this.t(key), onclick: () => this.applyPreset(id) })
        );
      });
      body.appendChild(presets);

      /* --- boyut --- */
      body.appendChild(this.range('sizePct', 'size', 12, 100, 1, '%'));
      body.appendChild(this.range('radius', 'radius', 0, 40, 1, 'px'));

      /* --- hizalama --- */
      body.appendChild(
        this.segmented('align', 'align', [
          ['left', this.t('alignLeft')],
          ['center', this.t('alignCenter')],
          ['right', this.t('alignRight')]
        ])
      );

      /* --- kenar + gölge --- */
      body.appendChild(
        this.segmented('border', 'border', [
          ['none', this.t('borderNone')],
          ['solid', this.t('borderSolid')],
          ['dashed', this.t('borderDashed')],
          ['glow', this.t('borderGlow')]
        ])
      );
      body.appendChild(this.range('borderWidth', 'border', 0, 8, 1, 'px'));
      const swatches = el('div', { className: 'gfy-swatches' });
      ACCENTS.forEach((c) => {
        swatches.appendChild(
          el('button', {
            className: 'gfy-swatch',
            attrs: { type: 'button', 'aria-pressed': String(c === this.settings.borderColor), 'aria-label': c, style: 'background:' + c },
            onclick: () => {
              this.update({ borderColor: c });
              swatches.querySelectorAll('.gfy-swatch').forEach((s) => s.setAttribute('aria-pressed', String(s.getAttribute('aria-label') === c)));
            }
          })
        );
      });
      body.appendChild(swatches);
      body.appendChild(
        this.segmented('shadow', 'shadow', [
          ['none', this.t('shadowNone')],
          ['soft', this.t('shadowSoft')],
          ['hard', this.t('shadowHard')],
          ['neon', this.t('shadowNeon')]
        ])
      );

      /* --- yazı --- */
      const capInput = el('input', { className: 'gfy-input', attrs: { type: 'text', maxlength: '90', placeholder: this.t('captionPlaceholder'), 'aria-label': this.t('caption') }, style: { width: '100%' } });
      capInput.value = this.settings.captionText || '';
      capInput.addEventListener('input', () => {
        this.update({ captionText: capInput.value, captionOn: capInput.value.trim().length > 0 });
      });
      body.appendChild(el('div', { className: 'gfy-ctrl' }, [el('div', { className: 'gfy-ctrl-head' }, [el('span', { text: this.t('caption') })]), capInput]));
      body.appendChild(
        this.segmented('captionPos', 'caption', [
          ['top', this.t('captionTop')],
          ['bottom', this.t('captionBottom')]
        ])
      );
      body.appendChild(this.toggleRow('captionUpper', this.t('captionUpper')));
      body.appendChild(this.toggleRow('badge', this.t('badge')));

      /* --- filtreler --- */
      const advTitle = el('div', { className: 'gfy-sec-title', text: this.t('filters') });
      body.appendChild(advTitle);
      body.appendChild(this.range('grayscale', 'grayscale', 0, 100, 1, '%'));
      body.appendChild(this.range('saturate', 'saturate', 0, 200, 1, '%'));
      body.appendChild(this.range('contrast', 'contrast', 50, 150, 1, '%'));
      body.appendChild(this.range('brightness', 'brightness', 50, 150, 1, '%'));
      body.appendChild(this.range('hue', 'hue', -180, 180, 1, '°'));
      body.appendChild(this.range('blur', 'blur', 0, 6, 0.5, 'px'));

      const publishPreview = el('div', { className: 'gfy-note', style: { marginTop: '8px' }, text: '' });
      body.appendChild(publishPreview);

      body.appendChild(
        el('div', { className: 'gfy-ctrl' }, [
          el('button', {
            className: 'gfy-btn sm block',
            attrs: { type: 'button' },
            text: this.t('reset'),
            onclick: () => this.applyPreset('clean')
          })
        ])
      );

      /* --- alt butonlar --- */
      const insertBtn = el('button', { className: 'gfy-btn primary', attrs: { type: 'button' }, text: this.t('insert'), onclick: () => this.insertSelection() });
      const copyBtn = el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('copyGif'), 'aria-label': this.t('copyGif') }, onclick: () => this.copyGif() }, [icon('copy')]);
      const downBtn = el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('download'), 'aria-label': this.t('download') }, onclick: () => this.downloadGif() }, [icon('download')]);
      const removeBtn = el('button', { className: 'gfy-iconbtn', attrs: { type: 'button', title: this.t('remove'), 'aria-label': this.t('remove') }, onclick: () => this.removeInserted() }, [icon('trash')]);
      foot.appendChild(insertBtn);
      foot.appendChild(copyBtn);
      foot.appendChild(downBtn);
      foot.appendChild(removeBtn);

      node.appendChild(head);
      node.appendChild(body);
      node.appendChild(foot);

      return { node, thumb, title, sub, liveBadge, insertBtn, capInput, publishPreview };
    }

    range(key, labelKey, min, max, step, unit) {
      const valEl = el('span', { className: 'gfy-ctrl-val', text: String(this.settings[key]) + unit });
      const input = el('input', {
        className: 'gfy-range',
        attrs: { type: 'range', min: String(min), max: String(max), step: String(step), 'aria-label': this.t(labelKey) },
        props: { value: this.settings[key] }
      });
      input.addEventListener('input', () => {
        const v = Number(input.value);
        valEl.textContent = v + unit;
        this.update({ [key]: v });
      });
      const row = el('div', { className: 'gfy-ctrl' }, [
        el('div', { className: 'gfy-ctrl-head' }, [el('span', { text: this.t(labelKey) }), valEl]),
        input
      ]);
      row.dataset.key = key;
      return row;
    }

    segmented(key, labelKey, options) {
      const wrap = el('div', { className: 'gfy-ctrl' });
      const seg = el('div', { className: 'gfy-seg', attrs: { role: 'group', 'aria-label': this.t(labelKey) } });
      options.forEach(([val, label]) => {
        const b = el('button', {
          attrs: { type: 'button', 'aria-pressed': String(this.settings[key] === val), 'data-val': val },
          text: label,
          onclick: () => {
            this.update({ [key]: val });
            seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.val === val)));
          }
        });
        seg.appendChild(b);
      });
      wrap.appendChild(el('div', { className: 'gfy-ctrl-head' }, [el('span', { text: this.t(labelKey) })]));
      wrap.appendChild(seg);
      wrap.dataset.key = key;
      return wrap;
    }

    toggleRow(key, label) {
      const sw = el('button', {
        className: 'gfy-switch',
        attrs: { type: 'button', role: 'switch', 'aria-checked': String(!!this.settings[key]), 'aria-label': label },
        onclick: () => {
          const v = !this.settings[key];
          sw.setAttribute('aria-checked', String(v));
          this.update({ [key]: v });
        }
      });
      return el('div', { className: 'gfy-toggle' }, [el('span', { text: label }), sw]);
    }

    applyPreset(id) {
      const p = PRESETS[id] || PRESETS.clean;
      this.update(p, true);
      this.syncStudioControls();
    }

    syncStudioControls() {
      const st = this.refs.studio;
      if (!st) return;
      const body = st.node.querySelector('.gfy-studio-body');
      body.querySelectorAll('.gfy-ctrl').forEach((row) => {
        const key = row.dataset.key;
        if (!key) return;
        const val = this.settings[key];
        if (typeof val === 'number') {
          const inp = row.querySelector('input[type="range"]');
          const lbl = row.querySelector('.gfy-ctrl-val');
          if (inp) inp.value = val;
          if (lbl) lbl.textContent = val + (lbl.textContent.match(/[^\d.-]+$/) || [''])[0];
        } else {
          row.querySelectorAll('button[data-val]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.val === val)));
        }
      });
    }

    refreshStudio() {
      const st = this.refs.studio;
      const gif = this.selection;
      if (!gif) {
        st.node.hidden = true;
        return;
      }
      st.node.hidden = false;
      st.node.classList.remove('collapsed');
      st.thumb.src = gif.dataUrl || gif.preview || gif.media || '';
      st.sub.textContent = Core.sanitizeCaption(gif.title || 'GIF') || 'GIF';
      if (st.publishPreview) {
        const preview = Core.publishText(gif, this.settings);
        st.publishPreview.textContent = (this.t('publishSafe') + ' ' + preview).slice(0, 160);
      }
      this.refs.studio.capInput.value = this.settings.captionText || '';
      this.syncStudioControls();
    }

    update(patch, immediate) {
      this.settings = Core.mergeSettings(this.settings, patch);
      if (patch.accent) this.refs.root.style.setProperty('--accent', patch.accent);
      if (patch.theme) this.refs.root.setAttribute('data-theme', patch.theme);
      if (patch.reduceMotion !== undefined) this.refs.root.setAttribute('data-motion', patch.reduceMotion ? 'reduce' : '');
      if (patch.showFab !== undefined) this.refs.fab.hidden = !patch.showFab;
      Store.set('settings', this.settings);
      // canlı düzenleme
      if (this.insertedEl) {
        const ed = Ins.resolveEditor();
        Ins.applyStyles(
          this.insertedEl,
          this.settings,
          this.selection && this.selection.w,
          ed ? Ins.measureContainer(ed) : 380
        );
        this.refs.studio.liveBadge.style.display = '';
        this.refs.studio.liveBadge.textContent = '●';
        this.refs.studio.liveBadge.title = this.t('editLive');
      }
      if (immediate) this.syncStudioControls();
    }

    insertSelection() {
      if (!this.selection) return;
      const res = Ins.insertGif(this.selection, this.settings);
      if (!res.ok) {
        this.toast(this.t('noEditor'), false);
        return;
      }
      this.insertedEl = res.el || null;
      this.refs.studio.liveBadge.style.display = '';
      this.refs.studio.liveBadge.textContent = '●';
      this.pushRecent(this.selection);
      g.cGFY.send({ type: 'gfy:stats', kind: 'insert' });
      if (res.mode === 'textarea-text') this.toast(this.lang === 'tr' ? 'Link yorum alanına yazıldı' : 'Link written into the box');
      else this.toast(this.t('inserted'));
      // Mobilde panel ekranı kapladığı için ekleme sonrası kapanır:
      // böylece yorum kutusu ve "Yorum yap" görünür olur.
      if (window.innerWidth <= 520) {
        window.setTimeout(() => this.close(), 650);
      }
    }

    removeInserted() {
      if (Ins.removeLastInserted()) {
        this.insertedEl = null;
        this.refs.studio.liveBadge.style.display = 'none';
        this.toast(this.t('cleared'));
      } else {
        this.toast(this.t('undoEmpty'), false);
      }
    }

    undo() {
      if (Ins.removeLastInserted()) this.toast(this.t('cleared'));
      else this.toast(this.t('undoEmpty'), false);
      this.insertedEl = null;
    }

    async copyGif() {
      const gif = this.selection;
      if (!gif) return;
      const url = gif.dataUrl || gif.media;
      try {
        const res = await g.cGFY.send({ type: 'gfy:to-dataurl', url, maxBytes: 12 * 1024 * 1024 });
        if (!res || !res.ok) throw new Error('fetch');
        const blob = await (await fetch(res.data)).blob();
        let copied = false;
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': await this.toPng(blob) })]);
          copied = true;
        } catch (e) {
          copied = false;
        }
        if (!copied) {
          await navigator.clipboard.writeText(gif.page || url);
          this.toast(this.t('copyLink'));
          return;
        }
        this.toast(this.t('copyGif'));
      } catch (err) {
        try {
          await navigator.clipboard.writeText(gif.page || url);
          this.toast(this.t('copyLink'));
        } catch (e2) {
          this.toast(this.t('loadError'), false);
        }
      }
    }

    async toPng(blob) {
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement('canvas');
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext('2d').drawImage(bmp, 0, 0);
      const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      return out;
    }

    async downloadGif() {
      const gif = this.selection;
      if (!gif) return;
      const url = gif.dataUrl || gif.media;
      const a = document.createElement('a');
      a.href = url;
      a.download = (Core.sanitizeCaption(gif.title || 'gif').replace(/[^\w\-]+/g, '_') || 'gif') + '.gif';
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    /* ---------------- ayarlar sekmesi ---------------- */
    buildSettings() {
      const v = this.views.settings;
      const mk = (title) => el('div', { className: 'gfy-sec-title', text: title });

      /* dil + tema */
      v.appendChild(mk(this.t('preferences')));
      v.appendChild(
        this.selectRow(this.t('language'), [
          ['tr', 'Türkçe'],
          ['en', 'English']
        ], this.settings.lang, (val) => {
          this.settings.lang = val;
          Store.set('settings', this.settings);
          this.relocalize();
        })
      );
      v.appendChild(
        this.selectRow(this.t('theme'), [
          ['dark', this.t('themeDark')],
          ['light', this.t('themeLight')],
          ['auto', this.t('themeAuto')]
        ], this.settings.theme, (val) => this.update({ theme: val }))
      );

      const accentRow = el('div', { className: 'gfy-ctrl' }, [el('div', { className: 'gfy-ctrl-head' }, [el('span', { text: this.t('accent') })])]);
      const sw = el('div', { className: 'gfy-swatches' });
      ACCENTS.concat(['#ffffff']).forEach((c) => {
        sw.appendChild(
          el('button', {
            className: 'gfy-swatch',
            attrs: { type: 'button', 'aria-label': c, 'aria-pressed': String(c === this.settings.accent), style: 'background:' + c },
            onclick: () => {
              this.update({ accent: c });
              sw.querySelectorAll('.gfy-swatch').forEach((s) => s.setAttribute('aria-pressed', String(s.getAttribute('aria-label') === c)));
            }
          })
        );
      });
      accentRow.appendChild(sw);
      v.appendChild(accentRow);

      v.appendChild(
        this.selectRow(this.t('insertMode'), [
          ['code', this.t('modeCode')],
          ['rich', this.t('modeRich')],
          ['link', this.t('modeLink')]
        ], this.settings.insertMode === 'rich+link' ? 'code' : this.settings.insertMode, (val) => this.update({ insertMode: val }))
      );
      v.appendChild(el('div', { className: 'gfy-hint', text: this.t('modeCodeHelp') }));
      v.appendChild(el('div', { className: 'gfy-note', text: this.t('publishNote') }));
      v.appendChild(this.toggleSettingRow('autoLink', this.t('autoLink')));
      v.appendChild(el('div', { className: 'gfy-hint', text: this.t('autoLinkHelp') }));
      v.appendChild(this.toggleSettingRow('renderCodes', this.t('renderCodes')));
      v.appendChild(el('div', { className: 'gfy-hint', text: this.t('renderCodesHelp') }));
      v.appendChild(this.toggleSettingRow('showFab', this.lang === 'tr' ? 'Sayfada GIF düğmesi' : 'Floating GIF button'));
      v.appendChild(this.toggleSettingRow('safeSearch', this.t('safeSearch')));
      v.appendChild(this.toggleSettingRow('reduceMotion', this.t('reduceMotion')));
      v.appendChild(this.toggleSettingRow('badge', this.t('badge')));

      v.appendChild(mk(this.t('provider')));
      v.appendChild(
        this.selectRow(this.t('provider'), [
          ['auto', this.t('providerAuto')],
          ['giphy-api', this.t('providerApi')],
          ['giphy-web', this.t('providerWeb')],
          ['pack', this.t('providerPack')]
        ], this.settings.searchProvider, (val) => this.update({ searchProvider: val }))
      );
      const keyInput = el('input', { className: 'gfy-input', attrs: { type: 'password', placeholder: 'Giphy API key', 'aria-label': this.t('apiKey') }, style: { width: '100%' } });
      keyInput.value = this.settings.giphyApiKey || '';
      keyInput.addEventListener('change', () => this.update({ giphyApiKey: keyInput.value.trim() }));
      v.appendChild(el('div', { className: 'gfy-ctrl' }, [el('div', { className: 'gfy-ctrl-head' }, [el('span', { text: this.t('apiKey') })]), keyInput]));
      v.appendChild(
        el('div', { className: 'gfy-hint' }, [
          document.createTextNode(this.t('apiKeyHint') + ' '),
          el('a', { attrs: { href: 'https://developers.giphy.com/dashboard/', target: '_blank', rel: 'noopener noreferrer', style: 'color:var(--accent)' }, text: this.t('getKey') })
        ])
      );

      v.appendChild(mk(this.t('stats')));
      const statsBox = el('div', { className: 'gfy-hint', text: '…' });
      v.appendChild(statsBox);
      chrome.storage.local.get('stats').then(({ stats }) => {
        const s = stats || { inserted: 0 };
        statsBox.textContent =
          (s.inserted || 0) + ' ' + this.t('statsInserted') + ' · ' +
          this.favorites.length + ' ' + this.t('statsFav') + ' · ' +
          this.custom.length + ' ' + this.t('statsCustom') + ' · ' +
          (g.GFYPack ? g.GFYPack.size : 0) + ' GIF';
      });

      v.appendChild(mk(this.t('shortcuts')));
      v.appendChild(
        el('div', { className: 'gfy-hint' }, [
          el('span', { className: 'gfy-kbd', text: 'Ctrl+Shift+G' }), document.createTextNode(' ' + this.t('scPanel') + ' · '),
          el('span', { className: 'gfy-kbd', text: 'Ctrl+Shift+Y' }), document.createTextNode(' ' + this.t('scQuick') + ' · '),
          el('span', { className: 'gfy-kbd', text: '/' }), document.createTextNode(' ' + this.t('tabSearch') + ' · '),
          el('span', { className: 'gfy-kbd', text: 'Esc' }), document.createTextNode(' ' + this.t('close'))
        ])
      );

      v.appendChild(mk(this.t('dataTitle')));
      v.appendChild(
        el('div', { className: 'gfy-field' }, [
          el('button', { className: 'gfy-btn sm', attrs: { type: 'button' }, text: this.t('exportData'), onclick: () => this.exportData() }),
          el('button', { className: 'gfy-btn sm', attrs: { type: 'button' }, text: this.t('clearRecent'), onclick: async () => { this.recent = []; await Store.set('recents', []); this.refreshMine(); this.toast(this.t('cleared')); } }),
          el('button', { className: 'gfy-btn sm', attrs: { type: 'button' }, text: this.t('tabSettings') , onclick: () => g.cGFY.send({ type: 'gfy:open-options' }) })
        ])
      );
      v.appendChild(
        el('div', { style: { marginTop: '12px', color: 'var(--mut)', fontSize: '10.5px', lineHeight: '1.6' } }, [
          document.createTextNode('GIF for YouTube v1.0.0 · Giphy içeriği Giphy lisansıyla sunulur. Yerel dosyalar hiçbir sunucuya gönderilmez.')
        ])
      );
    }

    toggleSettingRow(key, label) {
      const sw = el('button', {
        className: 'gfy-switch',
        attrs: { type: 'button', role: 'switch', 'aria-checked': String(!!this.settings[key]), 'aria-label': label },
        onclick: () => {
          const v = !this.settings[key];
          sw.setAttribute('aria-checked', String(v));
          this.update({ [key]: v });
        }
      });
      return el('div', { className: 'gfy-toggle' }, [el('span', { text: label }), sw]);
    }

    selectRow(label, options, value, onChange) {
      const sel = el('select', { className: 'gfy-select', attrs: { 'aria-label': label } });
      options.forEach(([val, text]) => {
        const o = el('option', { attrs: { value: val }, text });
        if (val === value) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', () => onChange(sel.value));
      return el('div', { className: 'gfy-toggle' }, [el('span', { text: label }), sel]);
    }

    async exportData() {
      const data = await chrome.storage.local.get(null);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gif-for-youtube-ayarlar.json';
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 3000);
      this.toast(this.t('saved'));
    }

    syncSettingsUI() {
      // dil/tema gibi alanlar yeniden kurulumda zaten güncel; stats tazelenir
      chrome.storage.local.get('stats').then(({ stats }) => {
        const s = stats || { inserted: 0 };
        const box = this.views.settings.querySelector('.gfy-hint');
        if (box && s.inserted != null) {
          box.textContent = s.inserted + ' ' + this.t('statsInserted');
        }
      });
    }

    /** Dil değişince metinleri tazele (panel yeniden kurulur). */
    relocalize() {
      const wasOpen = this.open_;
      const pos = { left: this.refs.panel.style.left, top: this.refs.panel.style.top };
      this.t = I18N.makeT(this.settings.lang);
      this.lang = this.settings.lang;
      const old = this.host;
      this.selection = null;
      this.build();
      this.mount();
      if (old && old.parentNode) old.parentNode.removeChild(old);
      this.refs.panel.style.left = pos.left;
      this.refs.panel.style.top = pos.top;
      if (!pos.left) this.positionPanel();
      if (wasOpen) this.open();
      this.setTab('settings');
    }
  }

  g.GFYPanel = GfyPanel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
