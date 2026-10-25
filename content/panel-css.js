/** GIF for YouTube — panel stilleri (shadow DOM içinde izole çalışır) */
(function (g) {
  'use strict';
  g.GFY_CSS = `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
.gfy-root{
  --accent:#ff2d55;
  --bg:#141418;
  --bg2:#1b1b21;
  --bg3:#23232b;
  --line:#2e2e37;
  --fg:#f4f4f7;
  --mut:#9b9baa;
  --ok:#22c55e;
  --radius:16px;
  --shadow:0 24px 64px -12px rgba(0,0,0,.72), 0 2px 8px rgba(0,0,0,.4);
  font-family:"YouTube Sans","Roboto","Segoe UI",system-ui,-apple-system,Arial,sans-serif;
  font-size:13px;
  color:var(--fg);
  -webkit-font-smoothing:antialiased;
}
.gfy-root[data-theme="light"]{
  --bg:#ffffff;--bg2:#f6f6f9;--bg3:#eeeef3;--line:#e2e2ea;--fg:#16161a;--mut:#6b6b7a;
  --shadow:0 24px 64px -16px rgba(20,20,40,.28), 0 2px 8px rgba(20,20,40,.12);
}
@media (prefers-color-scheme:light){
  .gfy-root[data-theme="auto"]{
    --bg:#ffffff;--bg2:#f6f6f9;--bg3:#eeeef3;--line:#e2e2ea;--fg:#16161a;--mut:#6b6b7a;
    --shadow:0 24px 64px -16px rgba(20,20,40,.28), 0 2px 8px rgba(20,20,40,.12);
  }
}

/* ---------- panel ---------- */
.gfy-panel{
  position:fixed;
  z-index:2147483000;
  width:404px;
  max-width:calc(100vw - 24px);
  height:min(660px,calc(100vh - 40px));
  display:flex;
  flex-direction:column;
  background:var(--bg);
  border:1px solid var(--line);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  overflow:hidden;
  animation:gfy-in .18s cubic-bezier(.2,.8,.3,1);
  contain:layout paint;
}
.gfy-root[data-motion="reduce"] .gfy-panel,
.gfy-root[data-motion="reduce"] *{animation:none!important;transition:none!important}
@keyframes gfy-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}
.gfy-panel[hidden]{display:none}

.gfy-head{
  display:flex;align-items:center;gap:10px;
  padding:12px 12px 10px 14px;
  border-bottom:1px solid var(--line);
  background:linear-gradient(180deg,rgba(255,255,255,.045),transparent);
  cursor:grab;user-select:none;
}
.gfy-head:active{cursor:grabbing}
.gfy-logo{
  width:26px;height:26px;border-radius:8px;flex:0 0 auto;
  background:linear-gradient(135deg,var(--accent),#ff7a3d);
  display:grid;place-items:center;font-weight:800;font-size:10px;letter-spacing:-.4px;color:#fff;
  box-shadow:0 4px 12px rgba(255,45,85,.35);
}
.gfy-title{font-weight:700;font-size:13.5px;letter-spacing:-.01em;line-height:1.1}
.gfy-sub{font-size:10.5px;color:var(--mut);margin-top:1px}
.gfy-head .gfy-spacer{flex:1}
.gfy-iconbtn{
  width:28px;height:28px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--mut);
  display:grid;place-items:center;cursor:pointer;padding:0;transition:background .14s,color .14s,border-color .14s;
}
.gfy-iconbtn:hover{background:var(--bg3);color:var(--fg);border-color:var(--line)}
.gfy-iconbtn:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.gfy-iconbtn svg{width:15px;height:15px;display:block}

.gfy-tabs{display:flex;gap:2px;padding:8px 10px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--line)}
.gfy-tabs::-webkit-scrollbar{display:none}
.gfy-tab{
  flex:0 0 auto;border:0;background:transparent;color:var(--mut);
  padding:6px 11px;border-radius:999px;font:600 12px/1.4 inherit;cursor:pointer;
  transition:background .14s,color .14s;white-space:nowrap;
}
.gfy-tab:hover{color:var(--fg);background:var(--bg3)}
.gfy-tab[aria-selected="true"]{background:var(--accent);color:#fff;box-shadow:0 4px 14px -4px var(--accent)}
.gfy-tab:focus-visible{outline:2px solid var(--accent);outline-offset:1px}

.gfy-body{flex:1;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:thin}
.gfy-body::-webkit-scrollbar{width:9px}
.gfy-body::-webkit-scrollbar-thumb{background:#3a3a45;border-radius:9px;border:2px solid var(--bg)}
.gfy-body::-webkit-scrollbar-track{background:transparent}
.gfy-view{padding:12px}
.gfy-view[hidden]{display:none}

/* ---------- chips ---------- */
.gfy-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
.gfy-chip{
  border:1px solid var(--line);background:var(--bg2);color:var(--mut);
  border-radius:999px;padding:5px 11px;font:600 11.5px/1.4 inherit;cursor:pointer;
  transition:all .14s;
}
.gfy-chip:hover{color:var(--fg);border-color:var(--accent);transform:translateY(-1px)}
.gfy-chip[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 18%,transparent);border-color:var(--accent);color:var(--fg)}

/* ---------- grid ---------- */
.gfy-grid{columns:3;column-gap:8px}
.gfy-root[data-width="narrow"] .gfy-grid{columns:2}
.gfy-card{
  break-inside:avoid;margin:0 0 8px;position:relative;border-radius:10px;overflow:hidden;
  background:var(--bg3);cursor:pointer;transition:transform .16s cubic-bezier(.2,.8,.3,1),box-shadow .16s;
  border:1px solid transparent;
}
.gfy-card:hover{transform:translateY(-2px);box-shadow:0 8px 20px -6px rgba(0,0,0,.6);border-color:var(--line)}
.gfy-card:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.gfy-card.selected{border-color:var(--accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent) 45%,transparent)}
.gfy-card img{display:block;width:100%;height:auto;background:var(--bg3);min-height:52px}
.gfy-card .gfy-skel{width:100%;aspect-ratio:1;background:linear-gradient(100deg,var(--bg3) 30%,#2d2d36 50%,var(--bg3) 70%);background-size:200% 100%;animation:gfy-sh 1.1s infinite}
@keyframes gfy-sh{to{background-position:-200% 0}}
.gfy-card .gfy-meta{
  position:absolute;left:0;right:0;bottom:0;padding:14px 6px 5px;font-size:9.5px;color:#fff;
  background:linear-gradient(transparent,rgba(0,0,0,.75));opacity:0;transition:opacity .14s;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;
}
.gfy-card:hover .gfy-meta,.gfy-card:focus-within .gfy-meta{opacity:1}
.gfy-card .gfy-fav{
  position:absolute;top:4px;right:4px;width:24px;height:24px;border-radius:7px;border:0;
  background:rgba(10,10,14,.62);color:#fff;backdrop-filter:blur(4px);display:grid;place-items:center;
  cursor:pointer;opacity:0;transition:opacity .14s,transform .14s;padding:0;
}
.gfy-card:hover .gfy-fav,.gfy-card .gfy-fav[aria-pressed="true"]{opacity:1}
.gfy-card .gfy-fav:hover{transform:scale(1.08)}
.gfy-card .gfy-fav svg{width:13px;height:13px}
.gfy-card .gfy-fav[aria-pressed="true"] svg{fill:var(--accent);stroke:var(--accent)}

/* ---------- inputs ---------- */
.gfy-field{display:flex;gap:8px;margin-bottom:10px}
.gfy-input{
  flex:1;min-width:0;background:var(--bg2);border:1px solid var(--line);color:var(--fg);
  border-radius:10px;padding:9px 11px;font:500 12.5px/1.4 inherit;outline:none;transition:border-color .14s,box-shadow .14s;
}
.gfy-input::placeholder{color:var(--mut)}
.gfy-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 22%,transparent)}
.gfy-btn{
  border:1px solid var(--line);background:var(--bg3);color:var(--fg);border-radius:10px;
  padding:9px 13px;font:600 12.5px/1.4 inherit;cursor:pointer;transition:all .14s;white-space:nowrap;
}
.gfy-btn:hover{background:#2c2c36;border-color:#3d3d49}
.gfy-btn:active{transform:scale(.98)}
.gfy-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.gfy-btn.primary{background:var(--accent);border-color:transparent;color:#fff;box-shadow:0 6px 18px -6px var(--accent)}
.gfy-btn.primary:hover{filter:brightness(1.08)}
.gfy-btn.ghost{background:transparent}
.gfy-btn.sm{padding:6px 9px;font-size:11.5px;border-radius:8px}
.gfy-btn.block{width:100%;justify-content:center}
.gfy-hint{font-size:11px;color:var(--mut);line-height:1.5;margin:2px 0 10px}
.gfy-note{
  font-size:11px;color:var(--mut);line-height:1.5;background:var(--bg2);border:1px solid var(--line);
  border-left:3px solid var(--accent);border-radius:8px;padding:8px 10px;margin:0 0 10px;
}

/* ---------- dropzone ---------- */
.gfy-drop{
  border:2px dashed var(--line);border-radius:14px;padding:26px 16px;text-align:center;
  color:var(--mut);transition:all .16s;background:var(--bg2);
}
.gfy-drop.over{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,var(--bg2));color:var(--fg);transform:scale(1.01)}
.gfy-drop svg{width:26px;height:26px;margin-bottom:8px;opacity:.75}
.gfy-drop p{margin:0 0 10px;font-size:12px;line-height:1.5}

/* ---------- lists ---------- */
.gfy-row{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;transition:background .14s}
.gfy-row:hover{background:var(--bg2)}
.gfy-row img{width:52px;height:52px;object-fit:cover;border-radius:8px;background:var(--bg3);flex:0 0 auto}
.gfy-row .gfy-col{flex:1;min-width:0}
.gfy-row .gfy-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gfy-row .gfy-when{font-size:10.5px;color:var(--mut);margin-top:2px}
.gfy-empty{text-align:center;color:var(--mut);padding:26px 12px;font-size:12px;line-height:1.6}
.gfy-empty svg{width:30px;height:30px;opacity:.5;margin-bottom:8px}
.gfy-sec-title{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin:14px 0 8px}
.gfy-sec-title:first-child{margin-top:0}

/* ---------- studio ---------- */
.gfy-studio{border-top:1px solid var(--line);background:var(--bg2);flex:0 0 auto}
.gfy-studio[hidden]{display:none}
.gfy-studio-head{display:flex;align-items:center;gap:8px;padding:8px 12px}
.gfy-thumb{
  width:44px;height:44px;border-radius:8px;object-fit:cover;background:var(--bg3);flex:0 0 auto;
  border:1px solid var(--line);
}
.gfy-studio-title{font-size:11.5px;font-weight:700}
.gfy-studio-sub{font-size:10.5px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}
.gfy-live{color:var(--ok);font-weight:700}
.gfy-studio-body{padding:0 12px 10px;max-height:230px;overflow-y:auto;scrollbar-width:thin}
.gfy-studio.collapsed .gfy-studio-body{display:none}
.gfy-ctrl{margin:8px 0}
.gfy-ctrl-head{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;color:var(--mut);margin-bottom:4px}
.gfy-ctrl-val{color:var(--fg);font-weight:600;font-variant-numeric:tabular-nums}
.gfy-range{
  -webkit-appearance:none;appearance:none;width:100%;height:16px;background:transparent;cursor:pointer;margin:0;
}
.gfy-range::-webkit-slider-runnable-track{height:3px;border-radius:3px;background:var(--line)}
.gfy-range::-webkit-slider-thumb{
  -webkit-appearance:none;width:13px;height:13px;border-radius:50%;background:var(--fg);
  border:2px solid var(--bg2);margin-top:-5px;box-shadow:0 0 0 1px var(--line);transition:transform .12s;
}
.gfy-range:hover::-webkit-slider-thumb{transform:scale(1.15);background:var(--accent)}
.gfy-range:focus-visible::-webkit-slider-thumb{outline:2px solid var(--accent);outline-offset:2px}
.gfy-seg{display:flex;gap:3px;background:var(--bg3);border-radius:9px;padding:3px}
.gfy-seg button{
  flex:1;border:0;background:transparent;color:var(--mut);border-radius:7px;padding:5px 2px;
  font:600 10.5px/1.3 inherit;cursor:pointer;transition:all .14s;white-space:nowrap;
}
.gfy-seg button:hover{color:var(--fg)}
.gfy-seg button[aria-pressed="true"]{background:var(--bg);color:var(--fg);box-shadow:0 1px 4px rgba(0,0,0,.3)}
.gfy-presets{display:flex;gap:5px;flex-wrap:wrap;margin:8px 0 2px}
.gfy-presets button{
  border:1px solid var(--line);background:var(--bg);color:var(--mut);border-radius:999px;
  padding:4px 10px;font:600 10.5px/1.5 inherit;cursor:pointer;transition:all .14s;
}
.gfy-presets button:hover{color:var(--fg);border-color:var(--accent)}
.gfy-studio-foot{display:flex;gap:6px;padding:8px 12px 11px;border-top:1px solid var(--line);align-items:center}
.gfy-studio-foot .gfy-btn.primary{flex:1}
.gfy-swatches{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
.gfy-swatch{width:20px;height:20px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}
.gfy-swatch[aria-pressed="true"]{border-color:var(--fg);transform:scale(1.1)}
.gfy-swatch:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

/* ---------- toggle ---------- */
.gfy-toggle{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;font-size:12px}
.gfy-switch{
  position:relative;width:34px;height:19px;border-radius:999px;background:var(--line);border:0;cursor:pointer;
  transition:background .16s;flex:0 0 auto;padding:0;
}
.gfy-switch::after{
  content:"";position:absolute;top:2px;left:2px;width:15px;height:15px;border-radius:50%;background:#fff;
  transition:transform .18s cubic-bezier(.2,.8,.3,1);
}
.gfy-switch[aria-checked="true"]{background:var(--accent)}
.gfy-switch[aria-checked="true"]::after{transform:translateX(15px)}
.gfy-switch:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.gfy-select{
  background:var(--bg3);border:1px solid var(--line);color:var(--fg);border-radius:8px;
  padding:6px 8px;font:600 11.5px/1.4 inherit;cursor:pointer;max-width:170px;
}
.gfy-select:focus{outline:2px solid var(--accent);outline-offset:1px}
.gfy-kbd{
  display:inline-block;font:600 10px/1.6 ui-monospace,Menlo,Consolas,monospace;
  background:var(--bg3);border:1px solid var(--line);border-bottom-width:2px;border-radius:5px;
  padding:0 5px;color:var(--fg)
}

/* ---------- banner ---------- */
.gfy-banner{
  display:flex;gap:9px;align-items:flex-start;margin:10px 12px 0;padding:9px 11px;
  background:color-mix(in srgb,var(--accent) 12%,var(--bg2));
  border:1px solid color-mix(in srgb,var(--accent) 38%,var(--line));
  border-radius:10px;font-size:11.5px;line-height:1.55;color:var(--fg);flex:0 0 auto;
}
.gfy-banner[hidden]{display:none}
.gfy-banner .gfy-banner-txt{flex:1;min-width:0}
.gfy-banner .gfy-iconbtn{width:20px;height:20px;margin:-2px -3px 0 0}
.gfy-banner .gfy-iconbtn svg{width:11px;height:11px}

/* ---------- toast ---------- */
.gfy-toast{
  position:absolute;left:12px;right:12px;bottom:64px;transform:translateY(12px);
  background:#0b0b10;color:#fff;border:1px solid #3a3a46;border-radius:11px;
  padding:9px 13px;font:650 11.5px/1.45 inherit;
  box-shadow:0 14px 34px rgba(0,0,0,.62),0 0 0 1px rgba(255,255,255,.04) inset;
  opacity:0;pointer-events:none;transition:all .22s cubic-bezier(.2,.8,.3,1);z-index:9;
  display:flex;align-items:center;gap:8px;text-align:left;
}
.gfy-toast.show{opacity:1;transform:translateY(0)}
.gfy-toast svg{width:13px;height:13px;color:var(--ok);flex:0 0 auto}

/* ---------- FAB ---------- */
.gfy-fab{
  position:fixed;right:18px;bottom:88px;z-index:2147482000;width:46px;height:46px;border-radius:14px;
  border:1px solid rgba(255,255,255,.14);cursor:pointer;padding:0;
  background:linear-gradient(135deg,var(--accent,#ff2d55),#ff7a3d);color:#fff;
  box-shadow:0 10px 26px -8px rgba(255,45,85,.7),0 2px 8px rgba(0,0,0,.35);
  display:grid;place-items:center;transition:transform .18s cubic-bezier(.2,.8,.3,1),box-shadow .18s;
  font:800 11px/1 "YouTube Sans",Roboto,Arial,sans-serif;letter-spacing:-.3px;
}
.gfy-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 14px 32px -8px rgba(255,45,85,.85)}
.gfy-fab:active{transform:scale(.96)}
.gfy-fab:focus-visible{outline:2px solid #fff;outline-offset:2px}
.gfy-fab[hidden]{display:none}

.gfy-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.gfy-spin{animation:gfy-rot .9s linear infinite}
@keyframes gfy-rot{to{transform:rotate(360deg)}}
`;
})(typeof globalThis !== 'undefined' ? globalThis : this);
