// Шабыт: the full cabinet of the program on shabytkzdon.com.
// Pages under /cab/ are served by this service worker: every request they make goes through the accounts
// server to the streamer's own Shabyt program (it keeps a connection open), and the answer comes back here.
const API = 'https://shabyt-api.timabektimabekk.workers.dev';
const SHELL = new Set(['/cab/', '/cab/index.html', '/cab/sw.js']);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const token = async () => { try { const r = await (await caches.open('shb-relay')).match('/cab/__token'); return r ? await r.text() : ''; } catch (e) { return ''; } };

// the program's own path: /cab/app/... is its cabinet, /cab/w/... its widgets, other paths are its files and API
const target = u => {
  let p = u.pathname;
  if (p === '/cab/app' || p.startsWith('/cab/app/')) p = p.slice(8) || '/';
  else if (p.startsWith('/cab/')) p = p.slice(4);
  return p + u.search;
};

const BAR = `<div id="shb-bar" style="display:flex;gap:6px;justify-content:flex-end;align-items:center;flex-wrap:wrap;padding:6px 12px;background:#061820;font:600 13px/1.4 system-ui,sans-serif"><a href="/account/?stay=1" style="color:#e8f6fa;text-decoration:none;padding:6px 10px;border:1px solid #1d4352;border-radius:10px">Тариф · Төлем / Оплата</a><a href="/account/" onclick="try{localStorage.removeItem('shabyt-token');caches.delete('shb-relay')}catch(e){}" style="color:#e8f6fa;text-decoration:none;padding:6px 10px;border:1px solid #1d4352;border-radius:10px">Шығу / Выйти</a></div>`;
const page = (title, text, status) => new Response(`<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Шабыт</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#061820;color:#e8f6fa;font:16px/1.5 system-ui,sans-serif;padding:20px;text-align:center}div{max-width:460px}h1{font-size:22px}a{display:inline-block;margin:6px;padding:12px 18px;border-radius:12px;background:#fec50c;color:#3a2a00;font-weight:700;text-decoration:none}a.g{background:transparent;color:#e8f6fa;border:2px solid #1d4352}</style></head>
<body><div><h1>${title}</h1><p>${text}</p><a href="/cab/">Қайталау · Повторить</a><a class="g" href="/account/">Кабинет</a></div></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

async function relay(req) {
  const u = new URL(req.url), nav = req.mode === 'navigate', tok = await token();
  if (!tok) return nav ? Response.redirect('/account/', 302) : new Response('{"error":"auth"}', { status: 401, headers: { 'Content-Type': 'application/json' } });
  const init = { method: req.method, headers: { Authorization: 'Bearer ' + tok } };
  if (!['GET', 'HEAD'].includes(req.method)) { init.body = await req.arrayBuffer(); const ct = req.headers.get('Content-Type'); if (ct) init.headers['Content-Type'] = ct; }
  let r;
  try { r = await fetch(API + '/relay' + target(u), init); }
  catch (e) { return nav ? page('Интернет жоқ · Нет интернета', 'Серверге қосылу мүмкін болмады. · Не удалось связаться с сервером.', 502) : new Response('{"error":"net"}', { status: 502, headers: { 'Content-Type': 'application/json' } }); }
  if (nav && r.status === 401) return Response.redirect('/account/', 302);
  if (nav && (r.status === 503 || r.status === 504)) return page('Бағдарлама қосулы емес · Программа не на связи', 'Компьютерде Шабытты (v1.5 немесе жаңасын) ашып, «Тариф» бетінде аккаунтпен кіріңіз. · Откройте Шабыт (v1.5 или новее) на компьютере и войдите с аккаунтом на странице «Тариф».', r.status);
  const ct = r.headers.get('Content-Type') || '';
  if (/text\/html/.test(ct)) {
    let html = await r.text();
    html = html.replace(/(src|href)="\/w\//g, '$1="/cab/w/'); // widget previews stay inside /cab/
    if (!u.pathname.startsWith('/cab/w/')) html = html.replace(/<body([^>]*)>/i, '<body$1>' + BAR); // the site's own links above the program's cabinet
    if (u.pathname.startsWith('/cab/w/')) html = html.replace(/<head>/i, '<head><style>#err{display:none!important}</style><script>history.replaceState(null,"",location.pathname.replace(/^\\/cab/,"")+location.search+location.hash)</script>');
    return new Response(html, { status: r.status, headers: { 'Content-Type': ct, 'Cache-Control': 'no-store' } });
  }
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': ct || 'application/octet-stream', 'Cache-Control': 'no-store' } });
}

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || SHELL.has(u.pathname)) return;
  e.respondWith(relay(e.request));
});
