// Шабыт: the streamer's panel on shabytkzdon.com.
// The panel page and its files come from the Shabyt API (the same cabinet as in the Windows program); every request
// it makes (/api/..., /media/...) goes to the streamer's own data in the cloud with the site's session.
// OBS widgets live on the API's address, so the previews inside the panel load from there too.
const API = 'https://shabyt-api.timabektimabekk.workers.dev';
const SHELL = new Set(['/cab/', '/cab/index.html', '/cab/sw.js']);
const C = 'shb-relay';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const token = async () => { try { const r = await (await caches.open(C)).match('/cab/__token'); return r ? await r.text() : ''; } catch (e) { return ''; } };
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const btn = 'color:#e8f6fa;text-decoration:none;padding:6px 10px;border:1px solid #1d4352;border-radius:10px';
const BAR = `<div id="shb-bar" style="display:flex;gap:6px;justify-content:flex-end;align-items:center;flex-wrap:wrap;padding:6px 12px;background:#061820;font:600 13px/1.4 system-ui,sans-serif"><a href="/account/?stay=1" style="${btn}">Тариф · Төлем / Оплата</a><a href="/account/" onclick="try{localStorage.removeItem('shabyt-token');caches.delete('shb-relay')}catch(e){}" style="${btn}">Шығу / Выйти</a></div>`;
const page = (title, text, status) => new Response(`<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Шабыт</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#061820;color:#e8f6fa;font:16px/1.5 system-ui,sans-serif;padding:20px;text-align:center}div{max-width:460px}h1{font-size:22px}a{display:inline-block;margin:6px;padding:12px 18px;border-radius:12px;background:#fec50c;color:#3a2a00;font-weight:700;text-decoration:none}a.g{background:transparent;color:#e8f6fa;border:2px solid #1d4352}</style></head>
<body><div><h1>${title}</h1><p>${text}</p><a href="/cab/">Қайталау · Повторить</a><a class="g" href="/account/">Кабинет</a></div></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

async function handle(req) {
  const u = new URL(req.url), p = u.pathname, nav = req.mode === 'navigate', tok = await token();
  if (!tok) return nav ? Response.redirect('/account/', 302) : J({ error: 'auth' }, 401);
  const auth = { Authorization: 'Bearer ' + tok };
  try {
    if (p === '/cab/app' || p.startsWith('/cab/app/')) { // the panel itself
      const r = await fetch(API + '/ui/cabinet.html', { cache: 'no-cache' });
      if (!r.ok) throw new Error('ui');
      let html = await r.text();
      // the owner also gets a link to the admin panel (the API says who is the admin)
      let bar = BAR;
      try { const m = await (await fetch(API + '/me', { headers: auth, cache: 'no-store' })).json(); if (m && m.user && m.user.admin) bar = BAR.replace('<a href="/account/?stay=1"', `<a href="/admin/" style="${btn};background:#fec50c;color:#3a2a00;border-color:#fec50c">★ Админ панель</a><a href="/account/?stay=1"`); } catch (e) { }
      html = html.replace(/(src|href)="\/w\//g, `$1="${API}/w/`).replace(/<body([^>]*)>/i, '<body$1>' + bar);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (p.startsWith('/static/')) return fetch(API + p);
    if (p === '/favicon.ico') return fetch(API + '/static/logo.svg');
    if (p.startsWith('/api/') || p.startsWith('/media/')) {
      const init = { method: req.method, headers: { ...auth } };
      if (!['GET', 'HEAD'].includes(req.method)) { init.body = await req.arrayBuffer(); const ct = req.headers.get('Content-Type'); if (ct) init.headers['Content-Type'] = ct; }
      const r = await fetch(API + '/c' + p + u.search, init);
      return new Response(r.body, { status: r.status, headers: { 'Content-Type': r.headers.get('Content-Type') || 'application/octet-stream', 'Cache-Control': 'no-store' } });
    }
  } catch (e) {
    return nav ? page('Интернет жоқ · Нет интернета', 'Серверге қосылу мүмкін болмады. · Не удалось связаться с сервером.', 502) : J({ error: 'net' }, 502);
  }
  return fetch(req);
}

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || SHELL.has(u.pathname)) return;
  e.respondWith(handle(e.request));
});
