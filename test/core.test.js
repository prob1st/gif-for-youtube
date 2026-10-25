/* GIF for YouTube — çekirdek mantık testleri (node test/core.test.js) */
const assert = require('assert');
const Core = require('../lib/core.js');
global.window = global;
require('../lib/i18n.js');
const I18N = global.GFYI18N;

let pass = 0;
function ok(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}

console.log('\nparseGifInput');
ok('giphy sayfa linki', () => {
  const r = Core.parseGifInput('https://giphy.com/gifs/spongebob-squarepants-yes-3o7abKhOpu0NwenH3O');
  assert.equal(r.ok, true); assert.equal(r.type, 'giphy'); assert.equal(r.id, '3o7abKhOpu0NwenH3O');
});
ok('giphy media linki', () => {
  const r = Core.parseGifInput('https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif');
  assert.equal(r.type, 'giphy'); assert.equal(r.id, '3o7abKhOpu0NwenH3O');
});
ok('media4 alt alan adı', () => {
  const r = Core.parseGifInput('https://media4.giphy.com/media/fHoqSTQTsgSbfUoiTw/giphy.gif?cid=x');
  assert.equal(r.id, 'fHoqSTQTsgSbfUoiTw');
});
ok('çıplak ID', () => {
  const r = Core.parseGifInput('3o7abKhOpu0NwenH3O');
  assert.equal(r.type, 'giphy'); assert.equal(r.id, '3o7abKhOpu0NwenH3O');
});
ok('doğrudan gif', () => {
  const r = Core.parseGifInput('https://example.com/anim.gif');
  assert.equal(r.type, 'direct'); assert.equal(r.media, 'https://example.com/anim.gif');
});
ok('tenor view', () => {
  const r = Core.parseGifInput('https://tenor.com/view/happy-dog-gif-12345678');
  assert.equal(r.type, 'tenor'); assert.ok(r.page.includes('tenor.com'));
});
ok('boş girdi reddedilir', () => assert.equal(Core.parseGifInput('   ').ok, false));
ok('javascript: şeması reddedilir', () => assert.equal(Core.parseGifInput('javascript:alert(1)').ok, false));
ok('desteklenmeyen host', () => assert.equal(Core.parseGifInput('https://evil.example/page').ok, false));
ok('aşırı uzun girdi', () => assert.equal(Core.parseGifInput('https://a.co/' + 'x'.repeat(3000)).ok, false));

console.log('\nmediaCandidates');
ok('giphy için yedek alan adları', () => {
  const list = Core.mediaCandidates(Core.giphyById('abc123456789'));
  assert.ok(list.length >= 2);
  assert.ok(list.every((u) => u.startsWith('https://')));
});
ok('dataUrl öncelikli', () => {
  const list = Core.mediaCandidates({ dataUrl: 'data:image/gif;base64,AAA', media: 'https://x/y.gif' });
  assert.equal(list[0], 'data:image/gif;base64,AAA');
});

console.log('\npillGeometry');
ok('yüzde + maks sınır', () => {
  const g = Core.pillGeometry(Core.mergeSettings({}, { sizePct: 42, maxWidthPx: 480 }), 900);
  assert.equal(g.widthPx, 378);
});
ok('maxWidthPx tavanı', () => {
  const g = Core.pillGeometry(Core.mergeSettings({}, { sizePct: 100, maxWidthPx: 300 }), 900);
  assert.equal(g.widthPx, 300);
});
ok('varsayılan boyutta küçük gif şişirilmez', () => {
  const g = Core.pillGeometry(Core.mergeSettings({}, { sizePct: 40, maxWidthPx: 600 }), 600, 120);
  assert.equal(g.widthPx, 120);
});
ok('bilinçli büyütmede doğal genişlik aşılır', () => {
  const g = Core.pillGeometry(Core.mergeSettings({}, { sizePct: 80, maxWidthPx: 600 }), 600, 120);
  assert.ok(g.widthPx > 300, 'genişlik: ' + g.widthPx);
});
ok('dar konteyner alt sınırı', () => {
  const g = Core.pillGeometry(Core.mergeSettings({}, { sizePct: 10 }), 100);
  assert.ok(g.widthPx >= 19);
});

console.log('\nfiltre ve stiller');
ok('varsayılan filtre yok', () => assert.equal(Core.filterString(Core.mergeSettings({}, {})), 'none'));
ok('filtre zinciri', () => {
  const s = Core.mergeSettings({}, { grayscale: 50, brightness: 120, blur: 2, hue: -30 });
  assert.equal(Core.filterString(s), 'grayscale(50%) brightness(120%) hue-rotate(-30deg) blur(2px)');
});
ok('sınır dışı değerler kırpılır', () => {
  const s = Core.mergeSettings({}, { saturate: 900, blur: 40 });
  assert.equal(Core.filterString(s), 'saturate(200%) blur(6px)');
});
ok('gölge varyantları', () => {
  assert.equal(Core.shadowCss('none'), 'none');
  assert.ok(Core.shadowCss('hard').includes('6px'));
  assert.ok(Core.shadowCss('neon', '#00ff00').includes('#00ff00'));
});
ok('hizalama bloklaşır', () => {
  const s = Core.mergeSettings({}, { align: 'center' });
  const st = Core.pillStyleObjects(s, Core.pillGeometry(s, 400));
  assert.equal(st.wrapper.display, 'block');
  assert.ok(String(st.wrapper.margin).includes('auto'));
});
ok('kenarlık hesaplanır', () => {
  const s = Core.mergeSettings({}, { border: 'solid', borderWidth: 3, borderColor: '#123456' });
  const st = Core.pillStyleObjects(s, Core.pillGeometry(s, 400));
  assert.equal(st.wrapper.borderWidth, '3px');
  assert.equal(st.wrapper.borderColor, '#123456');
});

console.log('\ngüvenlik / metin');
ok('HTML kaçışı', () => assert.equal(Core.esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;'));
ok('yazı temizliği', () => {
  assert.equal(Core.sanitizeCaption('<b>selam</b>   dünya\n!'), 'bselam/b dünya !');
  assert.ok(Core.sanitizeCaption('x'.repeat(200)).length <= 90);
});
ok('sadece https medya', () => {
  assert.equal(Core.isAllowedMediaUrl('http://x/y.gif'), false);
  assert.equal(Core.isAllowedMediaUrl('javascript:alert(1)'), false);
  assert.equal(Core.isAllowedMediaUrl('https://x/y.gif'), true);
});

console.log('\nayarlar');
ok('bilinmeyen anahtar yok sayılır', () => {
  const s = Core.mergeSettings({}, { hacker: 'x', sizePct: 55 });
  assert.equal(s.hacker, undefined);
  assert.equal(s.sizePct, 55);
});
ok('varsayılanlar korunur', () => {
  const s = Core.mergeSettings({ sizePct: 30 }, {});
  assert.equal(s.radius, Core.DEFAULTS.radius);
});
ok('formatBytes', () => {
  assert.equal(Core.formatBytes(900), '900 B');
  assert.equal(Core.formatBytes(2048), '2 KB');
  assert.equal(Core.formatBytes(5 * 1024 * 1024), '5.0 MB');
});
ok('gifSignature kararlı', () => {
  assert.equal(Core.gifSignature({ id: 'abc' }), 'abc');
  assert.equal(Core.gifSignature({ media: 'https://m' }), 'https://m');
});
ok('uid benzersiz', () => {
  const set = new Set();
  for (let i = 0; i < 500; i++) set.add(Core.uid('t'));
  assert.equal(set.size, 500);
});

console.log('\ni18n');
ok('tr/en anahtarları eşleşir', () => {
  const tr = Object.keys(I18N.STR.tr).sort();
  const en = Object.keys(I18N.STR.en).sort();
  const missing = tr.filter((k) => !en.includes(k));
  assert.deepEqual(missing, []);
});
ok('çeviri çalışır', () => {
  assert.equal(I18N.makeT('en')('insert'), 'Add to comment');
  assert.equal(I18N.makeT('tr')('insert'), 'Yoruma ekle');
  assert.equal(I18N.makeT('xx')('insert'), 'Yoruma ekle');
});
ok('kategori isimleri', () => {
  assert.equal(I18N.tCategory('tr', 'komik'), 'Komik');
  assert.equal(I18N.tCategory('en', 'komik'), 'Funny');
});

console.log('\nkalıcı GIF kodu');
ok('token üret/çöz', () => {
  const t = Core.encodeToken('3o7abKhOpu0NwenH3O');
  assert.equal(t, ':gfy:3o7abKhOpu0NwenH3O:');
  assert.equal(Core.decodeToken(t), '3o7abKhOpu0NwenH3O');
});
ok('geçersiz token reddedilir', () => {
  assert.equal(Core.decodeToken(':gfy:abc:'), null);
  assert.equal(Core.decodeToken(':gfy:<script>:'), null);
  assert.equal(Core.encodeToken('kisa'), '');
  assert.equal(Core.encodeToken('<img src=x>'), '');
});
ok('metinde birden çok kodu bulur', () => {
  const found = Core.findTokens('a :gfy:3o7abKhOpu0NwenH3O: b :gfy:fHoqSTQTsgSbfUoiTw:');
  assert.equal(found.length, 2);
  assert.equal(found[1].id, 'fHoqSTQTsgSbfUoiTw');
});
ok('yayın metni: kod + link', () => {
  const gif = { id: '3o7abKhOpu0NwenH3O', page: 'https://giphy.com/gifs/x-3o7abKhOpu0NwenH3O' };
  const txt = Core.publishText(gif, Core.mergeSettings({}, { insertMode: 'code', autoLink: true }));
  assert.ok(txt.indexOf(':gfy:3o7abKhOpu0NwenH3O:') === 0);
  assert.ok(txt.includes('https://giphy.com/gifs/x-3o7abKhOpu0NwenH3O'));
});
ok('yayın metni: link modunda kod yok', () => {
  const gif = { id: '3o7abKhOpu0NwenH3O', page: 'https://giphy.com/gifs/x' };
  const txt = Core.publishText(gif, Core.mergeSettings({}, { insertMode: 'link' }));
  assert.equal(txt, 'https://giphy.com/gifs/x');
});
ok('yerel GIF: kod yok, açıklama var', () => {
  const gif = { src: 'local', dataUrl: 'data:image/gif;base64,AAA', title: 'x' };
  const txt = Core.publishText(gif, Core.mergeSettings({}, { insertMode: 'code', captionOn: true, captionText: 'tepki' }));
  assert.equal(txt, 'tepki');
});
ok('publishText asla boş <img> üretmez', () => {
  const txt = Core.publishText({ id: '3o7abKhOpu0NwenH3O', page: 'https://giphy.com/gifs/x' }, Core.mergeSettings({}, {}));
  assert.ok(txt.indexOf('<') === -1);
});
ok('giphyMediaFromId', () => {
  assert.equal(Core.giphyMediaFromId('3o7abKhOpu0NwenH3O'), 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif');
});

console.log('\nhazır paket');
const pack = require('../lib/pack.js') || {};
ok('paket 300+ GIF ve 14 kategori', () => {
  const items = global.GFYPack.items;
  assert.ok(items.length >= 300, 'adet: ' + items.length);
  const cats = new Set(items.map((i) => i.cat));
  assert.ok(cats.size >= 14, 'kategori: ' + cats.size);
});
ok('tüm medya https ve id benzersiz', () => {
  const items = global.GFYPack.items;
  const ids = new Set(items.map((i) => i.id));
  assert.equal(ids.size, items.length);
  assert.ok(items.every((i) => i.media.startsWith('https://')));
});

console.log('\n' + pass + ' test geçti\n');
