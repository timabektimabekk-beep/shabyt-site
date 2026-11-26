// Shared code of the account and admin pages: API calls, session token, language, formatting.
const API = 'https://shabyt-api.timabektimabekk.workers.dev';
const tok = () => { try { return localStorage.getItem('shabyt-token') || ''; } catch (e) { return ''; } };
const setTok = v => { try { v ? localStorage.setItem('shabyt-token', v) : localStorage.removeItem('shabyt-token'); } catch (e) { } };
let LANG = (() => { try { return localStorage.getItem('shabyt-lang') || 'ru'; } catch (e) { return 'kk'; } })();
const t = () => T[LANG] || T.kk;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => Math.round(+n || 0).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₸';
const dstr = ms => ms ? new Date(ms).toLocaleDateString('ru-RU', { timeZone: 'Asia/Almaty' }) : '—';
const tstr = ms => ms ? new Date(ms).toLocaleString('ru-RU', { timeZone: 'Asia/Almaty', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const val = id => (document.getElementById(id) || {}).value || '';
async function api(method, path, body) {
  let r;
  try { r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json', ...(tok() ? { Authorization: 'Bearer ' + tok() } : {}) }, body: body ? JSON.stringify(body) : undefined }); }
  catch (e) { throw { code: 'net' }; }
  let j = {}; try { j = await r.json(); } catch (e) { }
  if (!r.ok) throw { status: r.status, code: j.error || 'server' };
  return j;
}
const errText = e => (t().err || {})[e && e.code] || (t().err || {}).server || 'Error';
let toastT;
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 3500); }
function onLang(fn) {
  const apply = () => {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === LANG)));
    document.querySelectorAll('[data-t]').forEach(el => { const v = t()[el.dataset.t]; if (typeof v === 'string') el.textContent = v; });
    fn();
  };
  document.querySelector('.lang').addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; LANG = b.dataset.lang; try { localStorage.setItem('shabyt-lang', LANG); } catch (er) { } apply(); });
  apply();
}
