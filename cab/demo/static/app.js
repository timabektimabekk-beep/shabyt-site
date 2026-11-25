// Шабыт: shared helpers for cabinet, admin and donation page
window.SH = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n || 0).toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₸';
  const dstr = t => { const d = new Date(t); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
  const tstr = t => { const d = new Date(t); return dstr(t).slice(0, 5) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  let lang = 'kk';
  try { const l = localStorage.getItem('shabyt-lang'); if (l === 'ru' || l === 'kk') lang = l; } catch (e) {}
  const setLang = l => { lang = l; document.documentElement.lang = l; try { localStorage.setItem('shabyt-lang', l); } catch (e) {} };
  const getLang = () => lang;
  const api = async (method, url, data) => {
    const r = await fetch(url, { method, headers: data ? { 'Content-Type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined, credentials: 'same-origin' });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) { const e = new Error(j.error || 'http_' + r.status); e.status = r.status; e.data = j; throw e; }
    return j;
  };
  const toast = m => { let e = $('toast'); if (!e) { e = document.createElement('div'); e.id = 'toast'; e.className = 'toast'; e.setAttribute('role', 'status'); document.body.appendChild(e); } e.textContent = m; e.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => e.classList.remove('on'), 2600); };
  const copy = async (txt, ok, fail) => { try { await navigator.clipboard.writeText(txt); toast(ok); } catch (e) { toast(fail); } };
  return { $, esc, fmt, dstr, tstr, api, toast, copy, setLang, getLang };
})();
