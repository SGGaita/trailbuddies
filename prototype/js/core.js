/* ================= core: helpers, state, speech, router, guide ================= */
const META = window.__META__ || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uid = p => (p || 'id') + Math.random().toString(36).slice(2, 8);
const KEY = 'trailbuddies-proto-v1';

/* ---------- icons (stroke) ---------- */
const P = {
  back: '<path d="M15 5l-7 7 7 7"/>', speak: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  home: '<path d="M3 11l9-7 9 7v9H3z"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12l5 5 9-10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c1-4 3.5-5.5 7-5.5s6 1.5 7 5.5"/><circle cx="17" cy="7" r="3"/><path d="M17 13.5c2.5 0 4.5 1.5 5 4.5"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  game: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10v5M4.5 12.5h5"/><circle cx="16" cy="11.5" r="1"/><circle cx="18.5" cy="14" r="1"/>',
  shop: '<path d="M4 8h16l-1.5 12h-13z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>', room: '<path d="M3 20V9l9-6 9 6v11"/><rect x="9" y="13" width="6" height="7"/>',
  badge: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14l-2 7 5.5-3 5.5 3-2-7"/>', wish: '<path d="M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16l-5.4 3.2 1.3-6-4.5-4 6-.6z"/>',
  chart: '<path d="M4 20V4M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>', share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', school: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  assign: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M9 11h6M9 15h4"/>', tablet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M11 18h2"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>', play: '<path d="M7 4l13 8-13 8z"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  trail: '<path d="M5 20c0-5 14-3 14-8S7 9 7 4"/><circle cx="7" cy="4" r="1.5"/><circle cx="5" cy="20" r="1.5"/>', heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>', thumbup: '<path d="M7 11v9H4v-9zM7 11l4-8c1.5 0 2.5 1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 6.5A2 2 0 0 1 17.3 20H7"/>',
  thumbdown: '<path d="M7 13V4H4v9zM7 13l4 8c1.5 0 2.5-1 2.5-2.5V15h5a2 2 0 0 0 2-2.3l-1.2-6.5A2 2 0 0 0 17.3 4H7"/>', sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>'
};
const I = (n, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;
const STAR = (on = true, s = 28) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.5l1.3-6.6L2.5 9.3l6.6-.8z" fill="${on ? '#ffc93c' : '#eadfc4'}" stroke="${on ? '#c98c06' : '#d8cba8'}" stroke-width="1.2"/></svg>`;
const GEM = (s = 26) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l4 6-10 12L2 9z" fill="#3fa6dc" stroke="#1d6b93" stroke-width="1.2"/><path d="M2 9h20M9 3l3 6 3-6M12 9v12" stroke="#1d6b93" stroke-width="1" fill="none"/></svg>`;

/* ---------- state ---------- */
let S, U = { app: 'learner', screen: 'C01', p: {}, f: {}, toast: null, offline: false };
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) { } return seed(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }
const L = () => S.learners.find(l => l.id === S.active) || S.learners[0];
const learner = id => S.learners.find(l => l.id === id);

/* ---------- speech ---------- */
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices(); } catch (e) { } }
try { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; } catch (e) { }
function say(text, lang) {
  if (!S || !S.settings.voice || !text) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/<[^>]+>/g, ''));
    const want = lang || 'en';
    const v = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(want === 'sw' ? 'sw' : 'en-gb')) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(want));
    if (v) u.voice = v;
    u.lang = want === 'sw' ? 'sw-KE' : 'en-GB';
    u.rate = S.settings.rate || 0.95; u.pitch = 1.1;
    speechSynthesis.speak(u);
  } catch (e) { }
}

/* ---------- router ---------- */
const R = {};          // screen registry: id -> {app, render, enter?, after?, meta?}
const ACT = {};        // actions: name -> fn(el, data)
const DEVS = { learner: [['tablet', 'Tablet'], ['phone', 'Phone'], ['web', 'Web']], parent: [['phone', 'Phone'], ['tablet', 'Tablet'], ['web', 'Web']], teacher: [['web', 'Web'], ['tablet', 'Tablet']], staff: [['web', 'Web']] };
const FRAME = { learner: { tablet: 'tablet', phone: 'phone', web: 'laptop' }, parent: { phone: 'phone', tablet: 'tabletp', web: 'laptop' }, teacher: { web: 'laptop', tablet: 'tablet' }, staff: { web: 'laptop' } };
const DKEY = 'trailbuddies-proto-devices';
U.dev = (() => { try { const d = JSON.parse(localStorage.getItem(DKEY)); if (d && d.learner) return Object.assign({ teacher: 'web', staff: 'web' }, d); } catch (e) { } return { learner: 'tablet', parent: 'phone', teacher: 'web', staff: 'web' }; })();
const D = (app) => U.dev[app || U.app] || DEVS[app || U.app][0][0];
const URLS = { learner: 'play.trailbuddies.africa', parent: 'family.trailbuddies.africa' };
function setDev(d) { U.dev[U.app] = d; try { localStorage.setItem(DKEY, JSON.stringify(U.dev)); } catch (e) { } const r = R[U.screen]; if (r && r.enter && r.reenter !== false) { try { r.enter(U.p); } catch (e) { } } render(); const s = $('#scr'); if (s) s.scrollTop = 0; }
const APPS = [
  { id: 'learner', name: 'Learner app', dev: 'Tablet · children & older learners' },
  { id: 'parent', name: 'Parent app', dev: 'Phone · grown-up zone' },
  { id: 'teacher', name: 'Teacher', dev: 'Laptop · classroom' },
  { id: 'staff', name: 'School & safety', dev: 'Laptop · admin & moderation' }
];
function go(id, p = {}) {
  const r = R[id]; if (!r) { toast('That screen is in the wireframes.'); return; }
  U.screen = id; U.p = p; U.app = r.app; U.toast = null; U.overlay = null;
  if (r.enter) r.enter(p);
  render();
  const scr = $('#scr'); if (scr) scr.scrollTop = 0;
}
function render() {
  const r = R[U.screen]; if (!r) return;
  const dev = $('#dev'); const d = D(r.app); const cls = FRAME[r.app][d];
  dev.className = 'dev ' + cls;
  const scr = $('#scr');
  scr.className = 'scr d-' + d + ' app-' + r.app + (S.settings.calm ? ' calm' : '');
  let body = r.render(U.p); if (d === 'phone' && r.app === 'learner' && typeof KHUB !== 'undefined' && KHUB.includes(U.screen) && !body.includes('class="ktabs"')) body = body.replace(/<\/div>\s*$/, kidTabs() + '</div>');
  let inner = body + (U.overlay ? `<div class="overlay">${U.overlay}</div>` : '') + (U.toast ? `<div class="toast" role="status">${esc(U.toast)}</div>` : '');
  if (d === 'web' && URLS[r.app]) inner = `<div class="a"><div class="urlbar"><i></i><i></i><i></i><span>${URLS[r.app]}${r.app === 'learner' ? (r.app && L().adult ? '/learn' : '') : ''}</span></div><div style="flex:1;position:relative;min-height:0">${inner}</div></div>`;
  scr.innerHTML = inner;
  if (r.after) r.after(U.p);
  guide(); fit();
}
let toastT;
function toast(msg, ms = 2600) { U.toast = msg; render(); clearTimeout(toastT); toastT = setTimeout(() => { U.toast = null; render(); }, ms); }
function overlay(html) { U.overlay = html; render(); }
function closeOverlay() { U.overlay = null; render(); }
ACT.go = el => go(el.dataset.to, el.dataset.p ? JSON.parse(el.dataset.p) : {});
ACT.close = () => closeOverlay();
ACT.toast = el => toast(el.dataset.msg);
ACT.say = el => say(el.dataset.text, el.dataset.lang);

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act],[data-to]');
  if (!el || el.disabled) return;
  if (!$('#dev').contains(el)) return;
  e.preventDefault();
  if (el.dataset.act) { const f = ACT[el.dataset.act]; if (f) f(el, el.dataset); else toast('Not built in the prototype yet.'); }
  else ACT.go(el);
});
document.addEventListener('input', e => {
  const el = e.target; if (!el.dataset || !el.dataset.f) return;
  U.f[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.live) { const pos = el.selectionStart; render(); const n = $(`[data-f="${el.dataset.f}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) { } } }
});
document.addEventListener('submit', e => { e.preventDefault(); const f = e.target.dataset.submit; if (f && ACT[f]) ACT[f](e.target, e.target.dataset); });
document.addEventListener('change', e => { const el = e.target; if (el.dataset && el.dataset.file && ACT[el.dataset.file]) ACT[el.dataset.file](el); });

/* ---------- device scaling ---------- */
const SIZE = { tablet: [1100, 760], phone: [410, 864], laptop: [1300, 842], tabletp: [834, 1112] };
let lastFitKey = '';
function fit() {
  const dev = $('#dev'), box = $('#fit'); const k = dev.className.split(' ')[1]; const [w, h] = SIZE[k];
  // width-driven only: never read the window height, so an auto-sizing host frame can't feed back into the layout
  const availW = box.clientWidth || Math.max(320, (document.documentElement.clientWidth || 1200) - 40);
  const capH = Math.max(560, Math.min((window.screen && screen.height) || 900, 1100) - 180);
  let s = Math.min(1, availW / w); if (availW > 600) s = Math.min(s, capH / h); s = Math.max(0.25, Math.round(s * 100) / 100);
  const key = k + s; if (key !== lastFitKey) { lastFitKey = key; dev.style.transform = `scale(${s})`; box.style.height = Math.ceil(h * s) + 'px'; }
  $('#devcap').textContent = (k === 'tablet' ? 'Tablet, landscape' : k === 'tabletp' ? 'Tablet, portrait' : k === 'phone' ? 'Phone' : 'Laptop browser') + (s < 0.999 ? ` · shown at ${Math.round(s * 100)}%` : '');
}
let lastW = 0;
window.addEventListener('resize', () => { const cw = document.documentElement.clientWidth; if (cw !== lastW) { lastW = cw; fit(); } });
window.addEventListener('load', () => { try { fit(); } catch (e) { } });

/* ---------- guide panel ---------- */
const FLOWS = {};   // app -> [{group, steps:[{label, to, p, setup}]}]
let lastFlowKey = '';
function metaId() { const r = R[U.screen]; return (r && r.meta) ? r.meta(U.p) : U.screen; }
function guide() {
  $('#apps').innerHTML = APPS.map(a => `<button type="button" data-app="${a.id}" aria-pressed="${U.app === a.id}">${esc(a.name)}<small>${esc(a.dev)}</small></button>`).join('');
  const dl = DEVS[U.app] || []; $('#devs').innerHTML = dl.length > 1 ? `<span class="eyebrow">Device</span><div class="dseg">${dl.map(([k, n]) => `<button type="button" data-dev="${k}" aria-pressed="${D() === k}">${n}</button>`).join('')}</div>` : '<span class="eyebrow">Device</span><span class="mut-g">Web on a laptop: school admin and safety staff work at a desk</span>';
  const groups = FLOWS[U.app] || []; let n = 0;
  const key = U.app + '|' + U.screen + '|' + (U.p && U.p.k || '');
  $('#flows').innerHTML = groups.map((g, gi) => `<div class="fgroup"><b>${esc(g.group)}</b><ol class="flow">${g.steps.map((s, si) => { n++; const cur = s.m ? s.m === metaId() && s.to === U.screen : s.to === U.screen && (!s.k || s.k === (U.p && U.p.k)); return `<li><button type="button" data-step="${gi}.${si}" ${cur ? 'aria-current="step"' : ''}><span class="n">${String(n).padStart(2, '0')}</span><span>${esc(s.label)}</span></button></li>`; }).join('')}</ol></div>`).join('');
  const id = metaId(); const m = META[id] || {}; const r = R[U.screen] || {};
  $('#note-id').textContent = id + (m.d ? ' · ' + m.d : '');
  $('#note-title').textContent = m.t || r.title || U.screen;
  $('#note-text').textContent = (r.note ? (typeof r.note === 'function' ? r.note(U.p) : r.note) : '');
  $('#note-refs').innerHTML = (m.s || []).map(x => `<span>${x}</span>`).join('');
  $('#c-voice').setAttribute('aria-pressed', S.settings.voice); $('#c-voice').textContent = S.settings.voice ? 'Voice on' : 'Voice off';
  $('#c-offline').setAttribute('aria-pressed', U.offline); $('#c-offline').textContent = U.offline ? 'Offline (tap to reconnect)' : 'Go offline';
  if (key !== lastFlowKey) { lastFlowKey = key; const c = $('#flows [aria-current="step"]'); if (c && window.innerWidth > 900) c.scrollIntoView({ block: 'nearest' }); }
}
function runStep(s) { if (s.setup) s.setup(); go(s.to, Object.assign({}, s.p || {}, s.k ? { k: s.k } : {})); }
$('#apps').addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (!b) return; const g = FLOWS[b.dataset.app]; if (g && g[0]) runStep(g[0].steps[0]); });
$('#devs').addEventListener('click', e => { const b = e.target.closest('[data-dev]'); if (b) setDev(b.dataset.dev); });
$('#flows').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (!b) return; const [gi, si] = b.dataset.step.split('.').map(Number); runStep(FLOWS[U.app][gi].steps[si]); });
$('#c-voice').addEventListener('click', () => { S.settings.voice = !S.settings.voice; save(); if (!S.settings.voice) try { speechSynthesis.cancel(); } catch (e) { } render(); });
$('#c-offline').addEventListener('click', () => { U.offline = !U.offline; render(); toast(U.offline ? 'Device is offline. Downloaded subjects still work.' : 'Back online. Progress synced.'); });
$('#c-restart').addEventListener('click', () => { const g = FLOWS[U.app] || []; const cur = g.find(gr => gr.steps.some(s => s.to === U.screen)) || g[0]; if (cur) runStep(cur.steps[0]); });
let resetArm = 0;
$('#c-reset').addEventListener('click', e => {
  const b = e.currentTarget;
  if (Date.now() - resetArm > 3000) { resetArm = Date.now(); b.textContent = 'Tap again to reset'; setTimeout(() => { b.textContent = 'Reset demo data'; }, 3000); return; }
  S = seed(); save(); U.f = {}; b.textContent = 'Reset demo data'; resetArm = 0; const g = FLOWS[U.app]; runStep(g[0].steps[0]); toast('Demo data reset.');
});

/* keyboard: on web, number keys answer lesson tiles and Space repeats the prompt */
document.addEventListener('keydown', e => {
  if (U.screen !== 'C07' || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) return;
  if (e.key === ' ') { e.preventDefault(); ACT.sayEx(); return; }
  const n = parseInt(e.key, 10); if (!n) return; const opts = [...document.querySelectorAll('#exarea .tile:not(.gone)')]; if (opts[n - 1]) opts[n - 1].click();
});
