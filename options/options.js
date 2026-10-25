/* GIF for YouTube — ayarlar sayfası */
(function () {
  'use strict';
  const Core = window.GFYCore;
  const PACK = (window.GFYPack && window.GFYPack.items) || [];
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  let settings = Core.mergeSettings({}, {});

  const ACCENTS = ['#ff2d55', '#ff7a3d', '#a855f7', '#3b82f6', '#06b6d4', '#22c55e', '#eab308', '#ec4899'];

  /* ---------------- yardımcılar ---------------- */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'className') node.className = v;
      else if (k === 'style') Object.assign(node.style, v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach((c) => {
      if (c == null || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg || 'Kaydedildi';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
  }

  async function save(patch, silent) {
    settings = Core.mergeSettings(settings, patch);
    await chrome.storage.local.set({ settings });
    renderPreview();
    if (!silent) toast('Kaydedildi');
  }

  function row(label, help, control) {
    return el('div', { className: 'row' }, [
      el('div', {}, [el('div', { className: 'label', text: label }), help ? el('span', { className: 'help', text: help }) : null]),
      control
    ]);
  }

  function toggle(key, onChange) {
    const sw = el('button', {
      className: 'switch',
      'aria-checked': String(!!settings[key]),
      'aria-label': key,
      onclick: () => {
        const v = !settings[key];
        sw.setAttribute('aria-checked', String(v));
        save({ [key]: v });
        if (onChange) onChange(v);
      }
    });
    return sw;
  }

  function slider(key, min, max, step, unit) {
    const valEl = el('span', { className: 'val', text: String(settings[key]) + unit });
    const inp = el('input', {
      type: 'range',
      min: String(min),
      max: String(max),
      step: String(step),
      value: String(settings[key]),
      'aria-label': key,
      oninput: () => {
        valEl.textContent = inp.value + unit;
        save({ [key]: Number(inp.value) }, true);
      }
    });
    return el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [inp, valEl]);
  }

  function select(key, options, onChange) {
    const s = el('select', {
      'aria-label': key,
      onchange: () => {
        save({ [key]: s.value });
        if (onChange) onChange(s.value);
      }
    });
    options.forEach(([v, t]) => {
      const o = el('option', { value: v, text: t });
      if (v === settings[key]) o.selected = true;
      s.appendChild(o);
    });
    return s;
  }

  function segmented(key, options) {
    const wrap = el('div', { className: 'seg' });
    options.forEach(([v, t]) => {
      const b = el('button', {
        text: t,
        'aria-pressed': String(settings[key] === v),
        onclick: () => {
          save({ [key]: v });
          wrap.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.textContent === t)));
        }
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function swatches(key) {
    const wrap = el('div', { className: 'swatches' });
    ACCENTS.concat(['#ffffff']).forEach((c) => {
      const b = el('button', {
        className: 'swatch',
        title: c,
        'aria-label': c,
        'aria-pressed': String(settings[key] === c),
        style: { background: c },
        onclick: () => {
          save({ [key]: c });
          wrap.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-pressed', String(x.getAttribute('aria-label') === c)));
        }
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* ---------------- bölümler ---------------- */
  function buildStudio() {
    const host = $('#studioControls');
    host.appendChild(row('Boyut', 'Yorum alanı genişliğine göre yüzde.', slider('sizePct', 12, 100, 1, '%')));
    host.appendChild(row('Köşe yuvarlaklığı', null, slider('radius', 0, 40, 1, 'px')));
    host.appendChild(row('Hizalama', null, segmented('align', [['left', 'Sol'], ['center', 'Orta'], ['right', 'Sağ']])));
    host.appendChild(row('Kenar', null, segmented('border', [['none', 'Yok'], ['solid', 'Düz'], ['dashed', 'Kesik'], ['glow', 'Işıltı']])));
    host.appendChild(row('Kenar kalınlığı', null, slider('borderWidth', 0, 8, 1, 'px')));
    host.appendChild(row('Kenar rengi', null, swatches('borderColor')));
    host.appendChild(row('Gölge', null, segmented('shadow', [['none', 'Yok'], ['soft', 'Yumuşak'], ['hard', 'Sert'], ['neon', 'Neon']])));
    host.appendChild(row('“GIF” etiketi', 'GIF’in köşesinde küçük bir etiket gösterir.', toggle('badge')));

    const capInput = el('input', {
      type: 'text',
      maxlength: '90',
      value: settings.captionText || '',
      placeholder: 'Alt yazı',
      oninput: () => save({ captionText: capInput.value, captionOn: capInput.value.trim().length > 0 }, true)
    });
    host.appendChild(row('Alt yazı', 'GIF üzerine yazı ekler (maks. 90 karakter).', capInput));
    host.appendChild(row('Yazı konumu', null, segmented('captionPos', [['top', 'Üst'], ['bottom', 'Alt']])));
    host.appendChild(row('Yazı rengi', null, swatches('captionColor')));
    host.appendChild(row('BÜYÜK harf', null, toggle('captionUpper')));

    host.appendChild(row('Gri ton', null, slider('grayscale', 0, 100, 1, '%')));
    host.appendChild(row('Doygunluk', null, slider('saturate', 0, 200, 1, '%')));
    host.appendChild(row('Kontrast', null, slider('contrast', 50, 150, 1, '%')));
    host.appendChild(row('Parlaklık', null, slider('brightness', 50, 150, 1, '%')));
    host.appendChild(row('Renk tonu', null, slider('hue', -180, 180, 1, '°')));
    host.appendChild(row('Bulanıklık', null, slider('blur', 0, 6, 0.5, 'px')));
  }

  function buildInsert() {
    const host = $('#insertControls');
    host.appendChild(
      row(
        'Ekleme modu',
        '“GIF + link”, GIF’in yanına kaynak linki ekler; gönderi sonrası içerik kaybolmaz.',
        select('insertMode', [['rich', 'GIF (zengin)'], ['rich+link', 'GIF + link'], ['link', 'Sadece link']])
      )
    );
    host.appendChild(row('Sayfada GIF düğmesi', 'YouTube sayfasının sağ altında yüzen düğme.', toggle('showFab')));
    host.appendChild(row('Hareketi azalt', 'Animasyonları ve geçişleri kapatır.', toggle('reduceMotion')));
    host.appendChild(row('Maks. dosya boyutu', 'Yerel GIF yüklemeleri için sınır.', slider('maxFileMb', 2, 40, 1, ' MB')));
  }

  function buildSearch() {
    const host = $('#searchControls');
    host.appendChild(
      row(
        'Sağlayıcı',
        'Otomatik: API anahtarı varsa Giphy API, yoksa web araması, son çare hazır paket.',
        select('searchProvider', [
          ['auto', 'Otomatik'],
          ['giphy-api', 'Giphy API'],
          ['giphy-web', 'Giphy web'],
          ['pack', 'Sadece hazır paket']
        ])
      )
    );
    const keyInput = el('input', {
      type: 'password',
      value: settings.giphyApiKey || '',
      placeholder: 'Giphy API anahtarı (isteğe bağlı)',
      style: { minWidth: '240px' },
      onchange: () => save({ giphyApiKey: keyInput.value.trim() })
    });
    host.appendChild(row('Giphy API anahtarı', 'Ücretsiz — developers.giphy.com. Anahtar yalnızca bu cihazda saklanır.', keyInput));
    host.appendChild(row('Güvenli arama', 'Yetişkin içeriğini filtreler (API modunda).', toggle('safeSearch')));
    host.appendChild(
      row('Hazır paket', PACK.length + ' doğrulanmış tepki GIF’i, 14 kategori.', el('span', { className: 'val', text: '✓ hazır' }))
    );
  }

  function buildAppearance() {
    const host = $('#appearanceControls');
    host.appendChild(row('Dil', null, select('lang', [['tr', 'Türkçe'], ['en', 'English']], () => location.reload())));
    host.appendChild(row('Tema', null, select('theme', [['dark', 'Koyu'], ['light', 'Açık'], ['auto', 'Otomatik']])));
    host.appendChild(row('Vurgu rengi', null, swatches('accent')));
  }

  /* ---------------- önizleme ---------------- */
  let previewGif = null;
  function renderPreview() {
    const host = $('#pillHost');
    host.textContent = '';
    if (!previewGif) {
      previewGif = PACK.find((p) => p.cat === 'komik') || PACK[0] || { id: '3o7abKhOpu0NwenH3O', media: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', title: 'GIF' };
    }
    const geom = Core.pillGeometry(settings, 250, settings.sizePct >= 96 ? 0 : previewGif.w || 0);
    const styles = Core.pillStyleObjects(settings, geom);
    const wrap = el('span', { style: Object.assign({ display: 'block' }, styles.wrapper, { margin: '4px auto' }) });
    const img = el('img', { src: previewGif.media, alt: previewGif.title || 'GIF', style: styles.img });
    wrap.appendChild(img);
    if (settings.badge) {
      wrap.appendChild(
        el('span', {
          text: 'GIF',
          style: {
            position: 'absolute', right: '6px', bottom: '6px', padding: '2px 6px', borderRadius: '5px',
            background: 'rgba(0,0,0,.66)', color: '#fff', font: '800 9px/1.5 "YouTube Sans",Roboto,Arial,sans-serif',
            letterSpacing: '.06em'
          }
        })
      );
    }
    if (settings.captionOn && Core.sanitizeCaption(settings.captionText)) {
      wrap.appendChild(el('span', { text: Core.sanitizeCaption(settings.captionText), style: styles.caption }));
    }
    host.appendChild(wrap);

    const foot = $('#previewFoot');
    foot.textContent = '';
    const chips = [
      geom.widthPx + 'px',
      settings.radius + 'px köşe',
      settings.captionOn ? 'yazı açık' : 'yazı kapalı',
      settings.sizePct + '% genişlik'
    ];
    chips.forEach((c) => foot.appendChild(el('span', { text: c, style: { background: 'var(--bg3)', border: '1px solid var(--line)', borderRadius: '999px', padding: '2px 9px' } })));
    $('#previewInfo').textContent = settings.insertMode === 'link' ? 'link modu' : 'zengin mod';
  }

  /* ---------------- veri işlemleri ---------------- */
  function bindData() {
    $('#exportBtn').addEventListener('click', async () => {
      const data = await chrome.storage.local.get(null);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: 'gif-for-youtube-ayarlar.json' });
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast('Dışa aktarıldı');
    });

    $('#importBtn').addEventListener('click', () => $('#importFile').click());
    $('#importFile').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (data && typeof data === 'object') {
          await chrome.storage.local.set(data);
          toast('İçe aktarıldı — yeniden yükleniyor');
          setTimeout(() => location.reload(), 700);
        }
      } catch (err) {
        toast('Geçersiz dosya');
      }
    });

    $('#clearRecent').addEventListener('click', async () => {
      await chrome.storage.local.set({ recents: [] });
      toast('Geçmiş temizlendi');
      refreshStats();
    });

    $('#resetAll').addEventListener('click', async () => {
      if (!confirm('Tüm ayarlar, favoriler ve geçmiş silinecek. Emin misin?')) return;
      await chrome.storage.local.clear();
      await chrome.storage.local.set({ settings: Core.mergeSettings({}, {}) });
      toast('Sıfırlandı');
      setTimeout(() => location.reload(), 600);
    });
  }

  async function refreshStats() {
    const data = await chrome.storage.local.get(['stats', 'recents', 'favorites', 'custom']);
    const st = data.stats || {};
    $('#statsLine').textContent =
      (st.inserted || 0) + ' GIF eklendi · ' +
      (data.favorites || []).length + ' favori · ' +
      (data.custom || []).length + ' özel tepki · ' +
      (data.recents || []).length + ' geçmiş kaydı · ' +
      PACK.length + ' hazır GIF';
  }

  /* ---------------- başlat ---------------- */
  (async function init() {
    const store = await chrome.storage.local.get('settings');
    settings = Core.mergeSettings(store.settings, {});
    if (!store.settings) await chrome.storage.local.set({ settings });

    $('#packBadge').textContent = PACK.length + ' GIF';
    buildStudio();
    buildInsert();
    buildSearch();
    buildAppearance();
    bindData();
    renderPreview();
    refreshStats();

    if (new URLSearchParams(location.search).get('welcome') === '1') {
      $('#welcome').classList.add('show');
    }
    document.documentElement.lang = settings.lang || 'tr';
  })();
})();
