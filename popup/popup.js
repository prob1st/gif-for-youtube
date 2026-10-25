/* GIF for YouTube — popup mantığı */
(async function () {
  const $ = (id) => document.getElementById(id);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isYouTube = /^https:\/\/(www\.|m\.)?youtube\.com\//.test((tab && tab.url) || '');
  const dot = $('dot');
  const statusText = $('statusText');

  if (isYouTube) {
    dot.classList.add('ok');
    statusText.textContent = 'YouTube sekmesi hazır — panel açılabilir';
  } else {
    statusText.textContent = 'YouTube sekmesinde değilsin. Bir video/yorum sayfası aç.';
  }
  $('openPanel').disabled = !isYouTube;
  $('quickInsert').disabled = !isYouTube;

  const { recents = [], stats = {}, settings = {} } = await chrome.storage.local.get(['recents', 'stats', 'settings']);

  // Paket boyutu
  try {
    const core = await chrome.runtime.getURL('lib/pack.js');
    // pack.js content script listesinde; boyutu settings üzerinden göstermiyoruz,
    // burada sabit bir okuma yerine storage'daki sayaç yeterli.
  } catch (e) {}

  const total = (stats.inserted || 0);
  $('stats').textContent = total + ' GIF eklendi · ' + (recents.length || 0) + ' son kullanılan';

  const grid = $('recents');
  const empty = $('recentEmpty');
  if (!recents.length) {
    empty.hidden = false;
  } else {
    recents.slice(0, 8).forEach((r) => {
      const gif = r.gif || r;
      const b = document.createElement('button');
      b.className = 'thumb';
      b.title = gif.title || 'GIF';
      const img = document.createElement('img');
      img.src = gif.dataUrl || gif.preview || gif.media || '';
      img.alt = gif.title || 'GIF';
      img.loading = 'lazy';
      b.appendChild(img);
      b.addEventListener('click', async () => {
        await chrome.tabs.sendMessage(tab.id, { type: 'gfy:insert-gif', gif }).catch(() => {});
        window.close();
      });
      grid.appendChild(b);
    });
  }

  $('openPanel').addEventListener('click', async () => {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'gfy:open-panel' });
    } catch (e) {
      // içerik betiği hazır değilse enjekte et
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/main.js'] }).catch(() => {});
    }
    window.close();
  });

  $('quickInsert').addEventListener('click', async () => {
    const last = recents[0];
    if (!last) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'gfy:quick-insert' }).catch(() => {});
    window.close();
  });

  $('openSettings').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
    window.close();
  });

  $('help').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html#help') });
    window.close();
  });

  const lang = (settings.lang || 'tr');
  if (lang === 'en') {
    document.documentElement.lang = 'en';
    statusText.textContent = isYouTube ? 'YouTube tab ready — panel can open' : 'Not a YouTube tab. Open a video or comment page.';
    document.querySelector('#openPanel span').textContent = 'Open panel';
    document.querySelector('#quickInsert span').textContent = 'Insert last GIF';
    document.querySelector('.tip').innerHTML = 'Tip: click a comment box, <b>open the panel</b>, click a GIF → <b>Add to comment</b>. You can also drag GIFs into the comment box.';
    document.querySelector('.sec a').textContent = 'Settings →';
    document.querySelector('.sec b').textContent = 'Recently used';
  }
})();
