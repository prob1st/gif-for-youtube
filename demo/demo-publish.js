/**
 * Demo — YouTube'un yayınlama davranışını taklit eder.
 * Gerçek YouTube, gönderilen yorumdaki <img> etiketlerini siler ve yalnızca
 * metni saklar. Uzantı bu yüzden yayın anında GIF'i ":gfy:<id>:" koduna çevirir;
 * bu kod yorum metni olarak yaşar ve okuyucu betiği onu tekrar GIF'e dönüştürür.
 */
(function () {
  'use strict';
  const submit = document.getElementById('submit-button');
  const cancel = document.getElementById('cancel-button');
  const editor = document.getElementById('contenteditable-root');
  const slot = document.getElementById('published-slot');
  if (!submit || !editor || !slot) return;

  function publish() {
    const clone = editor.cloneNode(true);
    // YouTube'un sunucu tarafı temizliği: görsel etiketleri atılır
    clone.querySelectorAll('img, .gfy-pill').forEach(function (n) {
      n.remove();
    });
    const text = (clone.textContent || '')
      .replace(/\u200B/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) {
      editor.focus();
      return;
    }
    const wrap = document.createElement('div');
    wrap.className = 'c-item';
    wrap.innerHTML =
      '<div class="av" style="background:linear-gradient(135deg,#f97316,#ef4444)"></div>' +
      '<div style="flex:1;min-width:0"><div class="who">sen <span>az önce</span></div>' +
      '<ytd-comment-view-model><div id="content-text"></div></ytd-comment-view-model></div>';
    slot.insertBefore(wrap, slot.firstChild);
    wrap.querySelector('#content-text').textContent = text;
    editor.textContent = '';
    editor.focus();
  }

  submit.addEventListener('click', publish);
  if (cancel) {
    cancel.addEventListener('click', function () {
      editor.textContent = '';
      editor.focus();
    });
  }
})();
