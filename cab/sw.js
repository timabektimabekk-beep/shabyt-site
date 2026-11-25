// Шабыт: the full cabinet of the program on shabytkzdon.com.
// Live mode: every request the cabinet makes goes through the accounts server to the streamer's own Shabyt
// program (it keeps a connection open), and the answer comes back here.
// Demo mode (no program connected yet): the same cabinet, served from the site, with example data, so a new
// streamer can look at every panel, design and widget before connecting the program or buying a plan.
const API = 'https://shabyt-api.timabektimabekk.workers.dev';
const SHELL = new Set(['/cab/', '/cab/index.html', '/cab/sw.js']);
const C = 'shb-relay';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const stored = async k => { try { const r = await (await caches.open(C)).match('/cab/__' + k); return r ? await r.text() : ''; } catch (e) { return ''; } };
const store = async (k, v) => { try { await (await caches.open(C)).put('/cab/__' + k, new Response(v)); } catch (e) { } };
const token = () => stored('token');
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// the program's own path: /cab/app/... is its cabinet, /cab/w/... its widgets, other paths are its files and API
const target = u => {
  let p = u.pathname;
  if (p === '/cab/app' || p.startsWith('/cab/app/')) p = p.slice(8) || '/';
  else if (p.startsWith('/cab/')) p = p.slice(4);
  return p + u.search;
};

const btn = 'color:#e8f6fa;text-decoration:none;padding:6px 10px;border:1px solid #1d4352;border-radius:10px';
const OUT = `<a href="/account/" onclick="try{localStorage.removeItem('shabyt-token');caches.delete('shb-relay')}catch(e){}" style="${btn}">Шығу / Выйти</a>`;
const BAR = `<div id="shb-bar" style="display:flex;gap:6px;justify-content:flex-end;align-items:center;flex-wrap:wrap;padding:6px 12px;background:#061820;font:600 13px/1.4 system-ui,sans-serif"><a href="/account/?stay=1" style="${btn}">Тариф · Төлем / Оплата</a>${OUT}</div>`;
// demo: say so, offer to connect the program, and switch to the live cabinet as soon as it is online
const DBAR = `<div id="shb-bar" style="display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;padding:8px 12px;background:#061820;color:#e8f6fa;font:600 13px/1.4 system-ui,sans-serif"><span>👀 Демо: бұл — үлгі деректер. Донат қабылдау үшін бағдарламаны қосыңыз. · Демо: это пример. Чтобы принимать донаты, подключите программу.</span><span style="display:flex;gap:6px;flex-wrap:wrap"><a href="/account/?stay=1" style="${btn};background:#fec50c;color:#3a2a00;border-color:#fec50c">Бағдарламаны қосу / Подключить</a><a href="/account/?stay=1" style="${btn}">Тариф · Төлем / Оплата</a>${OUT}</span></div>
<script>setInterval(async()=>{try{const t=localStorage.getItem('shabyt-token');if(!t||document.hidden)return;const r=await fetch('${API}/relay-status',{headers:{Authorization:'Bearer '+t}});if(r.ok&&(await r.json()).online)location.replace('/cab/')}catch(e){}},8000)</script>`;

const page = (title, text, status) => new Response(`<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Шабыт</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#061820;color:#e8f6fa;font:16px/1.5 system-ui,sans-serif;padding:20px;text-align:center}div{max-width:460px}h1{font-size:22px}a{display:inline-block;margin:6px;padding:12px 18px;border-radius:12px;background:#fec50c;color:#3a2a00;font-weight:700;text-decoration:none}a.g{background:transparent;color:#e8f6fa;border:2px solid #1d4352}</style></head>
<body><div><h1>${title}</h1><p>${text}</p><a href="/cab/">Қайталау · Повторить</a><a class="g" href="/account/">Кабинет</a></div></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

// the same changes for both modes: widget previews stay inside /cab/, the site's bar above the cabinet
const fixHtml = (html, u, bar, widgetHead) => {
  html = html.replace(/(src|href)="\/w\//g, '$1="/cab/w/');
  if (u.pathname.startsWith('/cab/w/')) return html.replace(/<head>/i, '<head>' + widgetHead);
  return html.replace(/<body([^>]*)>/i, '<body$1>' + bar);
};
const WHEAD = '<style>#err{display:none!important}</style><script>history.replaceState(null,"",location.pathname.replace(/^\\/cab/,"")+location.search+location.hash)</script>';

async function relay(req) {
  const u = new URL(req.url), nav = req.mode === 'navigate', tok = await token();
  if (!tok) return nav ? Response.redirect('/account/', 302) : J({ error: 'auth' }, 401);
  const init = { method: req.method, headers: { Authorization: 'Bearer ' + tok } };
  if (!['GET', 'HEAD'].includes(req.method)) { init.body = await req.arrayBuffer(); const ct = req.headers.get('Content-Type'); if (ct) init.headers['Content-Type'] = ct; }
  let r;
  try { r = await fetch(API + '/relay' + target(u), init); }
  catch (e) { return nav ? page('Интернет жоқ · Нет интернета', 'Серверге қосылу мүмкін болмады. · Не удалось связаться с сервером.', 502) : J({ error: 'net' }, 502); }
  if (nav && r.status === 401) return Response.redirect('/account/', 302);
  if (nav && (r.status === 503 || r.status === 504)) { await store('mode', 'demo'); return Response.redirect('/cab/app/', 302); } // the program went away: show the demo
  const ct = r.headers.get('Content-Type') || '';
  if (/text\/html/.test(ct)) return new Response(fixHtml(await r.text(), u, BAR, WHEAD), { status: r.status, headers: { 'Content-Type': ct, 'Cache-Control': 'no-store' } });
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': ct || 'application/octet-stream', 'Cache-Control': 'no-store' } });
}

// ---- demo ----
const DEMO = '/cab/demo/';
let acct = null; // the signed-in account: login and plan
const account = async () => {
  if (acct && Date.now() - acct.t < 60e3) return acct;
  try { const r = await fetch(API + '/me', { headers: { Authorization: 'Bearer ' + await token() } }); if (r.ok) { const j = await r.json(); acct = { t: Date.now(), login: j.user.login, tier: j.user.tier || 'free', until: j.user.until || 0 }; } } catch (e) { }
  return acct || { t: 0, login: 'streamer', tier: 'free', until: 0 };
};
let base = null;
const template = async () => base || (base = await (await fetch(DEMO + 'me.json', { cache: 'no-cache' })).json());
const settings = async () => { const s = await stored('demo_settings'); if (s) try { return JSON.parse(s); } catch (e) { } return JSON.parse(JSON.stringify((await template()).settings)); };
const RANK = { free: 0, std: 1, pro: 2 };

async function me() {
  const [t, a, s] = await Promise.all([template(), account(), settings()]);
  return { ...t, user: { ...t.user, nick: a.login.toLowerCase(), plan: a.tier, plan_until: a.until || null }, tier: a.tier, settings: s, account: { login: a.login, signedIn: true, online: true, error: '' } };
}
const N = ['Асқар Б.', 'Айгерім С.', 'Нұрлан Т.', 'Дана Қ.', 'Ерлан М.', 'Мадина Ж.', 'Тимур А.', 'Әсел Н.'];
const MSG = ['Сәлем Астанадан! 👋', 'GG!', 'Ән қосшы 🎵', 'Керемет стрим', '', 'Привет из Алматы', 'Тағы ойнайық', ''];
const AMT = [5000, 2000, 1000, 700, 500, 10000, 1500, 300];
function donations(days) {
  const now = Date.now(), t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const rows = Array.from({ length: 16 }, (_, i) => ({ id: 1000 - i, donor: N[i % 8], amount: AMT[(i * 3) % 8], message: MSG[(i * 5) % 8], code: '0000', status: 'confirmed', source: 'hook', created: now - (i < 4 ? i * 47 * 6e4 + 9e5 : i * 1.7 * 864e5) }))
    .filter(r => !days || r.created >= now - days * 864e5);
  return { rows, total: rows.reduce((a, d) => a + d.amount, 0), today: rows.filter(d => d.created >= +t0).reduce((a, d) => a + d.amount, 0) };
}
async function library() {
  try { const j = await (await fetch(API + '/alerts')).json(); return j.alerts.filter(a => /^\w+$/.test(a.ext)).map(a => ({ file: `shblib-${a.id}.${a.ext}`, name: a.name, kind: a.kind === 'sound' ? 'sound' : 'gif', tier: a.tier, have: true })); } catch (e) { return []; }
}
async function putSettings(req) {
  let b = {}; try { b = await req.json(); } catch (e) { }
  const [t, a, s] = await Promise.all([template(), account(), settings()]);
  if (b.design !== undefined) {
    const need = t.designs[b.design]; if (!need) return J({ error: 'bad_design' }, 400);
    if (RANK[a.tier] < RANK[need]) return J({ error: need === 'pro' ? 'pro_only' : 'std_only' }, 403);
    s.design = b.design;
  }
  for (const [k, v] of Object.entries(b)) if (v && typeof v === 'object' && !Array.isArray(v) && s[k] && typeof s[k] === 'object') Object.assign(s[k], v);
  await store('demo_settings', JSON.stringify(s));
  return J({ ok: true, settings: s });
}
async function demoApi(req, p) {
  const M = req.method, u = new URL(req.url);
  if (M === 'GET' && p === '/api/me') return J(await me());
  if (M === 'GET' && p === '/api/donations') return J(donations(+u.searchParams.get('days') || 0));
  if (M === 'GET' && p === '/api/hook-log') return J({ rows: [] });
  if (M === 'GET' && p === '/api/media') return J({ files: [], lib: await library() });
  if (M === 'GET' && p === '/api/music') return J({ now: null, paused: false, online: false, queue: [], history: [] });
  if (M === 'GET' && p === '/api/lan') return J({ on: false, error: '', pin: '', urls: [] });
  if (M === 'PUT' && p === '/api/settings') return putSettings(req);
  if (M === 'POST' && p === '/api/test-alert') return J({ ok: true });
  if (M === 'POST' && /^\/api\/music\//.test(p)) return J({ ok: true });
  return J({ error: 'demo' }, 409); // saving files, keys, donations: only with the program connected
}
async function demo(req) {
  const u = new URL(req.url), p = u.pathname;
  if (!(await token())) return req.mode === 'navigate' ? Response.redirect('/account/', 302) : J({ error: 'auth' }, 401);
  if (p.startsWith('/api/')) return demoApi(req, p);
  if (p.startsWith('/static/')) return fetch(DEMO + 'static/' + p.slice(8).replace(/[^\w.-]/g, ''));
  if (p === '/favicon.ico') return fetch(DEMO + 'static/logo.svg');
  const lib = /^\/media\/shblib-(\d+)\.\w+$/.exec(p);
  if (lib) return fetch(`${API}/alerts/${lib[1]}/file`, { headers: { Authorization: 'Bearer ' + await token() } });
  if (p.startsWith('/media/')) return new Response('', { status: 404 });
  const w = /^\/cab\/w\/[\w-]+\/[a-z]+$/.test(p);
  if (w || p === '/cab/app' || p.startsWith('/cab/app/')) {
    const html = await (await fetch(DEMO + (w ? 'widget.html' : 'cabinet.html'), { cache: 'no-cache' })).text();
    // widgets show their built-in example (no connection) in the streamer's chosen design
    const s = w ? await settings() : null;
    const head = '<style>#err{display:none!important}</style><script>(function(){var q=new URLSearchParams(location.search);q.set("demo","1");if(!q.get("design"))q.set("design",' + JSON.stringify((s && s.design) || 'classic') + ');history.replaceState(null,"",location.pathname.replace(/^\\/cab/,"")+"?"+q+location.hash)})()</script>';
    return new Response(fixHtml(html, u, DBAR, head), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  return fetch(req);
}

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || SHELL.has(u.pathname) || u.pathname.startsWith(DEMO)) return;
  e.respondWith(stored('mode').then(m => m === 'demo' ? demo(e.request) : relay(e.request)));
});
