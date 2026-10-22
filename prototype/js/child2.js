/* ================= learner app (tablet), part 2: rewards, games, shop, islands, gate, older learners ================= */
const PICCACHE = {};
function picture(it) {
  if (it.img) return it.img; const key = it.id + (it.e || '') + (it.sw || '') + (it.shape || '');
  if (PICCACHE[key]) return PICCACHE[key];
  try {
    const c = document.createElement('canvas'); c.width = c.height = 360; const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 360); bg.addColorStop(0, '#d6ecf8'); bg.addColorStop(.62, '#fff1c7'); bg.addColorStop(.62, '#bfe3c9'); bg.addColorStop(1, '#8fd0a4'); g.fillStyle = bg; g.fillRect(0, 0, 360, 360);
    g.fillStyle = '#ffc93c'; g.beginPath(); g.arc(300, 60, 34, 0, 7); g.fill();
    if (it.sw) { g.fillStyle = it.sw; g.beginPath(); g.arc(180, 190, 110, 0, 7); g.fill(); }
    else if (it.num != null || it.letter) { g.fillStyle = '#1d6b93'; g.font = '800 230px "Baloo 2",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.num != null ? it.num : it.letter, 180, 200); }
    else { g.font = '220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.e || '⭐', 180, 205); }
    return (PICCACHE[key] = c.toDataURL('image/png'));
  } catch (e) { return ''; }
}
function jigsawHTML(it, st, act) {
  const n = L().band === 'Seedling' ? 2 : 3; const N = n * n;
  if (!st.order) { do { st.order = shuffle([...Array(N).keys()]); } while (st.order.every((v, i) => v === i)); }
  const src = picture(it); const ph = D('learner') === 'phone'; const sz = ph ? (n === 2 ? 160 : 106) : n === 2 ? 210 : 150; const solved = st.order.every((v, i) => v === i);
  return `<div style="flex:1;display:flex;flex-direction:${ph ? 'column' : 'row'};gap:${ph ? 14 : 30}px;align-items:center;justify-content:center"><div style="display:grid;grid-template-columns:${Array(n).fill(sz + 'px').join(' ')};gap:4px;background:var(--aline);padding:4px;border-radius:18px">
    ${st.order.map((pc, i) => `<button type="button" data-act="${act}" data-i="${i}" aria-label="Puzzle piece ${i + 1}" style="width:${sz}px;height:${sz}px;border:${st.sel === i ? '5px solid var(--sky)' : '0'};border-radius:10px;background-image:url(${src});background-size:${n * 100}% ${n * 100}%;background-position:${(pc % n) / (n - 1) * 100}% ${Math.floor(pc / n) / (n - 1) * 100}%"></button>`).join('')}</div>
    <div style="width:240px;display:flex;flex-direction:${ph ? 'row' : 'column'};gap:12px;align-items:center"><span class="mut" style="font-weight:800">The finished picture</span><img src="${src}" alt="" style="width:${ph ? 70 : 170}px;height:${ph ? 70 : 170}px;border-radius:16px;opacity:${solved ? 1 : .5}"><span class="mut" style="text-align:center">Tap two pieces to swap them. ${n}×${n} for ${L().band}.</span></div></div>`;
}
function jigTap(st, i, done) { if (st.sel == null) { st.sel = i; return render(); } const a = st.sel; st.sel = null; [st.order[a], st.order[i]] = [st.order[i], st.order[a]]; if (st.order.every((v, k) => v === k)) { render(); done(); } else render(); }
ACT.jigLesson = (el, d) => jigTap(U.lesson.st, +d.i, () => good(null, 'You finished the puzzle!'));

/* ---------- C12 lesson complete ---------- */
R.C12 = { app: 'learner', note: 'Stars come from first-try answers (3 for 90%+). Every lesson earns treasures; a perfect lesson and the daily goal earn more. After a hard lesson the buddy praises effort, not the score.',
  enter() { const r = U.result; say(r.effort ? 'You kept going, even on the tricky ones! I’m proud of you!' : `Lesson done! You got ${r.stars} star${r.stars > 1 ? 's' : ''}!`); },
  render() {
    const r = U.result; const l = L(); const sp = r.spec; const nextN = sp.kind === 'unit' && sp.n < 3 ? sp.n + 1 : null;
    const conf = Array.from({ length: 30 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${pick(['#ffc93c', '#e8664a', '#3fa6dc', '#2f9e5b', '#b5487a'])};animation-delay:${Math.random() * 1.2}s"></i>`).join('');
    const back = sp.kind === 'unit' || sp.kind === 'trophy' ? `data-to="C05" data-p='{"s":"${UNITS[sp.unit].subject}"}'` : sp.kind === 'custom' || sp.kind === 'assign' ? 'data-to="C22"' : 'data-to="C04"';
    return `<div class="a kid" style="flex-direction:row;padding:36px 56px;gap:44px"><div class="conf">${S.settings.calm ? '' : conf}</div>
      <div style="width:400px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">${buddySVG(l.buddy, { size: 250, mood: 'cheer', outfit: l.outfit })}<div class="bubble popin" style="text-align:center">${r.effort ? 'You kept going, even on the tricky ones!' : pick(['Fantastic learning!', 'You’re a star!', 'Brilliant work today!'])}</div></div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px">
        <div class="mut" style="font-weight:800;font-size:18px">${esc(r.title)}</div>
        <h1 style="font-size:58px;font-weight:800">Lesson done!</h1>
        <div style="display:flex;gap:14px">${[1, 2, 3].map(i => `<span class="popin" style="animation-delay:${i * .25}s">${STAR(i <= r.stars, 100)}</span>`).join('')}</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap"><span class="coin" style="font-size:24px;padding:8px 18px">${GEM(30)} +${r.tr} treasures</span>${r.goalHit ? '<span class="coin" style="font-size:22px;padding:8px 18px;border-color:var(--leaf);background:var(--leaf-soft)">Daily goal reached!</span>' : ''}${r.nb.length ? `<button type="button" class="coin" data-to="C13" data-p='{"badge":"${r.nb[0]}","after":"C12"}' style="font-size:22px;padding:8px 18px;border-color:var(--sun-deep);background:var(--sun-soft);cursor:pointer">New badge! See it</button>` : ''}</div>
        <div style="display:flex;gap:14px">${nextN ? `<button type="button" class="btn" data-act="startUnit" data-u="${sp.unit}" data-n="${nextN}" style="min-width:220px">Next lesson</button>` : sp.kind === 'unit' ? `<button type="button" class="btn" data-to="C14" data-p='{"u":"${sp.unit}"}' style="min-width:220px">Go for the trophy!</button>` : ''}<button type="button" class="btn ghost" ${back}>Back to the ${sp.kind === 'unit' || sp.kind === 'trophy' ? 'trail' : sp.kind === 'custom' || sp.kind === 'assign' ? 'island' : 'map'}</button></div>
        ${l.minutes >= S.settings.limit ? '<button type="button" class="sim" data-to="C23" style="align-self:flex-start">Daily limit reached: see the break screen</button>' : ''}
      </div></div>`;
  } };

/* ---------- C13 badge earned ---------- */
function badgeArt(b, size = 200, earned = true) {
  if (!b) return ''; const col = earned ? b.col : '#d8cfb6'; const shape = b.shape === 'square' ? `<rect x="10" y="10" width="180" height="180" rx="34" fill="#fff" stroke="${col}" stroke-width="16"/>` : b.shape === 'shield' ? `<path d="M100 8l84 30v60c0 52-36 84-84 94-48-10-84-42-84-94V38z" fill="#fff" stroke="${col}" stroke-width="14"/>` : `<circle cx="100" cy="100" r="88" fill="#fff" stroke="${col}" stroke-width="16"/>`;
  const inner = b.img ? `<image href="${b.img}" x="50" y="44" width="100" height="100" preserveAspectRatio="xMidYMid slice"/>` : b.hidden && !earned ? `<text x="100" y="118" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="56" fill="#b9ae90">???</text>` : `<g transform="translate(56 46) scale(3.7)" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[b.icon || 'badge'] || P.badge}</g>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true">${shape}${inner}</svg>`;
}
R.C13 = { app: 'learner', note: 'A big moment when a badge is earned, including badges a parent or teacher awards for real-world things. Treasures count up, and the badge flies into the badge book. Calm mode swaps the confetti for a soft fade.',
  enter(p) { const b = allBadges().find(x => x.id === p.badge) || BADGES[0]; say(b.msg ? `New badge! ${b.name}. ${b.msg}` : `New badge! ${b.name}!`); },
  render(p) {
    const b = allBadges().find(x => x.id === p.badge) || BADGES[0]; const l = L();
    const conf = Array.from({ length: 40 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${pick(['#ffc93c', '#e8664a', '#3fa6dc', '#2f9e5b', '#b5487a'])};animation-delay:${Math.random() * 1.5}s"></i>`).join('');
    return `<div class="a kid night" style="align-items:center;justify-content:center;gap:20px;padding:30px"><div class="conf">${S.settings.calm ? '' : conf}</div>
      <div style="font:800 20px var(--body);letter-spacing:.14em;color:var(--sun)">NEW BADGE!</div>
      <div class="popin">${badgeArt(b, 230)}</div>
      <h1 style="font-size:46px;color:#fff">${esc(b.name)}</h1>
      <div style="display:flex;align-items:center;gap:14px">${buddySVG(l.buddy, { size: 110, mood: 'cheer', outfit: l.outfit })}<div class="bubble" style="color:var(--ink);font-size:22px">${esc(b.msg || (b.custom ? `From ${b.by}! ` : '') + b.how)}</div></div>
      <div class="coin" style="color:#fff;border-color:var(--night-2)">${GEM(28)} +${b.reward || 15} treasures${b.real ? ` · and: ${esc(b.real)}` : ''}</div>
      <div style="display:flex;gap:14px"><button type="button" class="btn ghost" data-to="C20" style="background:transparent;color:#fff;border-color:#fff">See my badges</button><button type="button" class="btn sun" data-to="${p.after || 'C04'}">Keep going</button></div></div>`;
  } };

/* ---------- C14 checkpoint ---------- */
R.C14 = { app: 'learner', note: 'Each unit ends with a trophy: a short mixed review, then a puzzle. Winning it unlocks the next unit on the trail.',
  enter(p) { say('Trophy time! Show me everything you learned, then we’ll do a puzzle!'); },
  render(p) {
    const u = UNITS[p.u] || UNITS.a1; const l = L(); const won = !!l.progress[u.id + '-T']; const nxt = SUBJECTS.find(s => s.id === u.subject).units[u.idx + 1];
    return `<div class="a kid">${kidTop(l, { back: 'C05', bp: { s: u.subject }, title: 'Trophy' })}
      <div style="flex:1;display:flex;gap:44px;align-items:center;padding:30px 56px">
        <div style="width:360px;display:flex;flex-direction:column;align-items:center;gap:14px"><div style="width:250px;height:250px;border-radius:44px;background:var(--sun-soft);border:5px solid var(--sun-deep);display:grid;place-items:center;font-size:150px">\u{1F3C6}</div><h2 style="font-size:34px;text-align:center">${esc(u.title)} trophy</h2>${won ? '<span class="pill ok">Won!</span>' : ''}</div>
        <div style="flex:1;display:flex;flex-direction:column;gap:14px">
          ${talk(l, 'Show me everything you learned, then we’ll do a puzzle!', 'happy', 100)}
          ${[['1', 'Mixed review: 4 questions from this unit'], ['2', 'Trophy puzzle'], ['3', nxt ? 'Unlock: ' + nxt.title : 'Finish the subject!']].map(([n, t]) => `<div class="card" style="flex-direction:row;align-items:center;gap:16px;font-size:20px;font-weight:700"><span class="av" style="background:var(--leaf-deep)">${n}</span>${esc(t)}</div>`).join('')}
          <button type="button" class="btn sun" data-act="startTrophy" data-u="${u.id}" style="align-self:flex-start;min-width:260px;font-size:20px">${won ? 'Play again' : 'Start the trophy'}</button></div></div></div>`;
  } };
ACT.startTrophy = (el, d) => startLesson({ kind: 'trophy', unit: d.u });

/* ---------- games ---------- */
function gameTopics(l) {
  const t = []; SUBJECTS.forEach(s => s.units.forEach(u => { if (lessonIds(u).some(k => l.progress[k])) t.push({ id: u.id, name: u.title, items: u.items }); }));
  S.customLessons.filter(c => c.assigned.includes(l.id)).forEach(c => t.push({ id: 'c-' + c.id, name: c.title + ' (from ' + c.by + ')', items: c.cards }));
  if (!t.length) t.push({ id: 'a1', name: UNITS.a1.title, items: UNITS.a1.items }); return t;
}
const topicOf = l => { const t = gameTopics(l); return t.find(x => x.id === U.f.gTopic) || t[0]; };
R.C17 = { app: 'learner', note: 'Games use whatever the child has learned, including lessons their family made. Locked games show what unlocks them.',
  enter() { say('Pick a game!'); },
  render() {
    const l = L(); const tops = gameTopics(l); const cur = topicOf(l); const units = SUBJECTS.reduce((n, s) => n + s.units.filter(u => lessonIds(u).every(k => l.progress[k])).length, 0);
    const g = [['C15', 'Jigsaw', 'Swap pieces to finish a picture', true], ['C16', 'Memory flip', 'Find the matching pairs', true], [null, 'Quiz show', units >= 3 ? 'Opens at launch' : 'Finish 3 units to unlock', false], [null, 'Sorting race', 'Opens at launch', false], [null, 'Maze', 'Opens at launch', false], [null, 'Planet line-up', 'Finish “The eight planets”', false], [null, 'What to wear', 'Finish “Weather”', false], [null, 'Colour mixer', 'Finish “Mixing colours”', false]];
    return `<div class="a kid">${kidTop(l, { back: 'C04', title: 'Games corner' })}
      <div style="flex:1;display:flex;flex-direction:column;gap:16px;padding:20px 30px;min-height:0">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>Play with:</b>${tops.map(t => `<button type="button" class="chip" aria-pressed="${t.id === cur.id}" data-act="gTopic" data-id="${t.id}">${esc(t.name)}</button>`).join('')}</div>
        <div style="flex:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:1fr 1fr;gap:16px">${g.map(([to, n, d, open]) => `<button type="button" class="card" ${open ? `data-to="${to}"` : `data-act="toast" data-msg="${esc(n)}: ${esc(d)}."`} style="align-items:center;justify-content:center;text-align:center;border-width:3px;border-radius:24px;${open ? 'border-color:var(--leaf)' : 'opacity:.6;border-style:dashed'}"><span style="font-size:52px;line-height:1">${({ Jigsaw: '\u{1F9E9}', 'Memory flip': '\u{1F0CF}', 'Quiz show': '\u{1F3A4}', 'Sorting race': '\u{1F3C1}', Maze: '\u{1F300}', 'Planet line-up': '\u{1FA90}', 'What to wear': '\u{1F9E2}', 'Colour mixer': '\u{1F3A8}' })[n]}</span><b style="font-family:var(--display);font-size:24px">${n}</b><span class="mut">${esc(d)}</span>${l.games.includes(n === 'Jigsaw' ? 'jigsaw' : n === 'Memory flip' ? 'memory' : '') ? '<span class="pill ok">Played</span>' : ''}</button>`).join('')}</div></div></div>`;
  } };
ACT.gTopic = (el, d) => { U.f.gTopic = d.id; U.f.mem = null; U.f.jig = null; render(); };
R.C15 = { app: 'learner', note: 'A jigsaw from any picture: built-in art or a photo a parent added. Seedlings get 4 pieces, older children 9.',
  enter() { U.f.jig = {}; say('Tap two pieces to swap them!'); },
  render() { const l = L(); const t = topicOf(l); const it = t.items[0]; U.f.jig = U.f.jig || {};
    return `<div class="a kid">${kidTop(l, { back: 'C17', title: 'Jigsaw: ' + (it.label || '') })}<div style="flex:1;display:flex;flex-direction:column;padding:20px 30px">${jigsawHTML(it, U.f.jig, 'jigGame')}<div class="row"><span class="mut">Topic: ${esc(t.name)}</span><button type="button" class="btn ghost sm" data-act="jigNew">New puzzle</button></div></div></div>`; } };
ACT.jigGame = (el, d) => jigTap(U.f.jig, +d.i, () => { const l = L(); if (!l.games.includes('jigsaw')) l.games.push('jigsaw'); l.treasures += 5; const nb = checkBadges(l); save(); say('You did it! Plus five treasures!'); overlay(`<div class="dialog" style="align-items:center;text-align:center">${buddySVG(l.buddy, { size: 110, mood: 'cheer', outfit: l.outfit })}<h2 style="font-size:30px">Puzzle done!</h2><span class="coin">${GEM(26)} +5 treasures</span><div style="display:flex;gap:10px">${nb.length ? `<button type="button" class="btn sun" data-act="closeGo" data-to2="C13" data-s="">New badge!</button>` : ''}<button type="button" class="btn" data-act="jigNew">Play again</button><button type="button" class="btn ghost" data-act="closeGo" data-to2="C17">Games</button></div></div>`); if (nb.length) U.f.newBadge = nb[0]; });
ACT.jigNew = () => { U.overlay = null; U.f.jig = {}; const t = topicOf(L()); t.items.push(t.items.shift()); render(); };
R.C16 = { app: 'learner', note: 'Memory flip with items the child has learned. Matches are said aloud; misses flip back after a second.',
  enter() { U.f.mem = null; say('Find the matching pairs!'); },
  render() {
    const l = L(); const t = topicOf(l);
    if (!U.f.mem) { const its = shuffle(t.items).slice(0, l.band === 'Seedling' ? 3 : 4); U.f.mem = { cards: shuffle([...its, ...its].map((it, i) => ({ it, k: i }))), open: [], done: [], moves: 0 }; }
    const m = U.f.mem;
    return `<div class="a kid">${kidTop(l, { back: 'C17', title: 'Memory flip' })}<div style="flex:1;display:flex;gap:24px;padding:20px 30px;min-height:0">
      <div style="flex:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">${m.cards.map((c, i) => { const up = m.open.includes(i) || m.done.includes(c.it.id); return `<button type="button" data-act="memFlip" data-i="${i}" aria-label="${up ? esc(c.it.label) : 'Hidden card'}" style="border-radius:24px;border:3px solid ${m.done.includes(c.it.id) ? 'var(--leaf)' : up ? 'var(--sky)' : 'var(--leaf-deep)'};background:${up ? 'var(--card)' : 'repeating-linear-gradient(45deg,var(--leaf-deep) 0 14px,#24684a 14px 28px)'};display:grid;place-items:center">${up ? art(c.it, 70) : ''}</button>`; }).join('')}</div>
      <div style="width:220px;display:flex;flex-direction:column;gap:12px"><div class="card"><b>Pairs</b><span class="big tnum">${m.done.length} / ${m.cards.length / 2}</span></div><div class="card"><b>Turns</b><span class="big tnum">${m.moves}</span></div><span class="mut">Topic: ${esc(t.name)}</span><button type="button" class="btn ghost" data-act="memNew">Shuffle again</button></div></div></div>`;
  } };
ACT.memNew = () => { U.overlay = null; U.f.mem = null; render(); };
ACT.memFlip = (el, d) => {
  const m = U.f.mem; const i = +d.i; if (m.open.length >= 2 || m.open.includes(i) || m.done.includes(m.cards[i].it.id)) return;
  m.open.push(i); say(m.cards[i].it.label); render();
  if (m.open.length === 2) { m.moves++; const [a, b] = m.open; if (m.cards[a].it.id === m.cards[b].it.id) { m.done.push(m.cards[a].it.id); m.open = []; render(); if (m.done.length === m.cards.length / 2) { const l = L(); if (!l.games.includes('memory')) l.games.push('memory'); l.treasures += 5; const nb = checkBadges(l); save(); setTimeout(() => { say('All pairs found! Plus five treasures!'); overlay(`<div class="dialog" style="align-items:center;text-align:center">${buddySVG(l.buddy, { size: 110, mood: 'cheer', outfit: l.outfit })}<h2 style="font-size:30px">All pairs found in ${m.moves} turns!</h2><span class="coin">${GEM(26)} +5 treasures</span><div style="display:flex;gap:10px">${nb.length ? `<button type="button" class="btn sun" data-act="closeGo" data-to2="C13">New badge!</button>` : ''}<button type="button" class="btn" data-act="memNew">Play again</button><button type="button" class="btn ghost" data-act="closeGo" data-to2="C17">Games</button></div></div>`); if (nb.length) U.f.newBadge = nb[0]; }, 600); } } else setTimeout(() => { m.open = []; render(); }, 900); }
};
const _closeGo = ACT.closeGo; ACT.closeGo = (el, d) => { if (d.to2 === 'C13' && U.f.newBadge) { U.overlay = null; const b = U.f.newBadge; U.f.newBadge = null; return go('C13', { badge: b, after: 'C17' }); } _closeGo(el, d); };

/* ---------- C18 shop ---------- */
R.C18 = { app: 'learner', note: 'Treasures are spent here; stars are never spent, so progress never goes backwards. Try things on before buying. If a child can’t afford something, the buddy says how many more they need and offers to save up.',
  enter() { U.f.shopTab = U.f.shopTab || 'hat'; U.f.try = null; say('Welcome to the shop! What would you like?'); },
  render() {
    const l = L(); const tab = U.f.shopTab; const tryOn = U.f.try;
    const items = tab === 'room' ? Object.entries(ROOM).map(([k, v]) => ({ k, ...v, room: true })) : tab === 'mine' ? l.owned.map(k => ({ k, ...OUTFITS[k] })) : Object.entries(OUTFITS).filter(([k, v]) => v.slot === tab).map(([k, v]) => ({ k, ...v }));
    const prev = Object.assign({}, l.outfit); if (tryOn && OUTFITS[tryOn]) prev[OUTFITS[tryOn].slot] = tryOn;
    const sel = tryOn ? (OUTFITS[tryOn] || ROOM[tryOn]) : null; const owned = tryOn && (l.owned.includes(tryOn) || l.ownedRoom.includes(tryOn)); const room = tryOn && ROOM[tryOn];
    return `<div class="a kid">${kidTop(l, { back: 'C04', title: 'Buddy shop' })}<div style="flex:1;display:flex;gap:22px;padding:18px 26px;min-height:0">
      <div class="card" style="width:330px;align-items:center;justify-content:space-between;border-radius:28px;padding:18px">
        <span class="mut" style="font-weight:800">${tryOn ? 'Trying on' : 'Your buddy'}</span>
        ${room ? `<span style="font-size:150px;line-height:1.3">${room.e}</span>` : buddySVG(l.buddy, { size: 220, outfit: prev, mood: tryOn ? 'cheer' : 'happy' })}
        ${sel ? `<b style="font-family:var(--display);font-size:26px">${esc(sel.name)}</b><span style="display:flex;align-items:center;gap:6px;font-weight:800;font-size:20px">${GEM(24)} ${sel.price}</span>
          ${owned ? (room ? `<button type="button" class="btn wide" data-to="C19">Put it in my room</button>` : `<button type="button" class="btn wide" data-act="wear" data-k="${tryOn}">${l.outfit[OUTFITS[tryOn].slot] === tryOn ? 'Take it off' : 'Wear it'}</button>`) : `<button type="button" class="btn sun wide" data-act="buy" data-k="${tryOn}">Buy and ${room ? 'keep' : 'wear'}</button>`}` : '<span class="mut" style="text-align:center">Tap an item to try it on</span>'}
        <span class="mut" style="font-size:13px">Stars: ${l.stars} (always kept)</span>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;gap:14px;min-width:0">
        <div class="chips">${[['hat', 'Hats'], ['eyes', 'Glasses'], ['neck', 'Scarves & bows'], ['room', 'Room things'], ['mine', 'My wardrobe']].map(([k, n]) => `<button type="button" class="chip" aria-pressed="${tab === k}" data-act="shopTab" data-k="${k}">${n}</button>`).join('')}</div>
        <div style="flex:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:170px;gap:14px;overflow:auto;align-content:start">${items.map(it => { const own = l.owned.includes(it.k) || l.ownedRoom.includes(it.k); const need = it.price - l.treasures;
          return `<button type="button" class="card" data-act="tryOn" data-k="${it.k}" style="align-items:center;justify-content:center;border-width:3px;border-radius:22px;${tryOn === it.k ? 'border-color:var(--sky)' : ''}">${it.room ? `<span style="font-size:56px">${it.e}</span>` : `<svg viewBox="0 0 200 120" width="140" height="84" aria-hidden="true">${OUTFITS[it.k].svg({ hatY: it.slot === 'hat' ? 92 : 0, eyeY: 60, neckY: 60, headW: 104 })}</svg>`}<b>${esc(it.name)}</b>${own ? '<span class="pill ok">Owned</span>' : `<span style="display:flex;align-items:center;gap:4px;font-weight:800">${GEM(18)} ${it.price}${need > 0 ? `<span class="mut" style="font-weight:700"> · ${need} more</span>` : ''}</span>`}</button>`; }).join('') || '<span class="mut">Nothing here yet. Buy something first!</span>'}</div></div></div></div>`;
  } };
ACT.shopTab = (el, d) => { U.f.shopTab = d.k; U.f.try = null; render(); };
ACT.tryOn = (el, d) => { U.f.try = d.k; render(); const it = OUTFITS[d.k] || ROOM[d.k]; say(it.name + '! ' + it.price + ' treasures.'); };
ACT.wear = (el, d) => { const l = L(); const sl = OUTFITS[d.k].slot; l.outfit[sl] = l.outfit[sl] === d.k ? null : d.k; save(); render(); };
ACT.buy = (el, d) => {
  const l = L(); const it = OUTFITS[d.k] || ROOM[d.k];
  if (l.treasures < it.price) { const need = it.price - l.treasures; say(`You need ${need} more treasures. Shall we save up for it?`); return overlay(`<div class="dialog" style="align-items:center;text-align:center">${buddySVG(l.buddy, { size: 100, mood: 'think', outfit: l.outfit })}<h2 style="font-size:26px">You need ${need} more treasures</h2><p class="mut" style="margin:0">That’s about ${Math.ceil(need / 12)} more lessons.</p><div style="display:flex;gap:10px"><button type="button" class="btn ghost" data-act="close">OK</button><button type="button" class="btn sun" data-act="saveUp" data-k="${d.k}">Add to my wishes</button></div></div>`); }
  l.treasures -= it.price; if (OUTFITS[d.k]) { l.owned.push(d.k); l.outfit[it.slot] = d.k; } else l.ownedRoom.push(d.k); save(); say('Yay! ' + it.name + '!'); render(); toast(`Bought ${it.name}. ${it.price} treasures spent; your ${l.stars} stars stay.`);
};
ACT.saveUp = (el, d) => { const l = L(); const it = OUTFITS[d.k] || ROOM[d.k]; if (!S.wishes.find(w => w.shop === d.k && w.learner === l.id)) S.wishes.push({ id: uid('w'), title: it.name + ' for ' + BUDDIES[l.buddy].name, cost: it.price, by: 'Shop', status: 'open', learner: l.id, shop: d.k }); save(); U.overlay = null; go('C21'); };

/* ---------- C19 treasure room ---------- */
R.C19 = { app: 'learner', note: 'A room to decorate with things bought in the shop. Tap one of your things, then a spot. The layout syncs to other devices.',
  enter() { U.f.rsel = null; say('Welcome to my room! Let’s decorate it.'); },
  render() {
    const l = L(); const spots = [[150, 120], [470, 90], [650, 300], [110, 360], [470, 360], [300, 250]];
    return `<div class="a kid">${kidTop(l, { back: 'C04', title: BUDDIES[l.buddy || 'zip'].name + '’s room' })}<div style="flex:1;display:flex;gap:20px;padding:18px 24px;min-height:0">
      <div style="${D('learner') === 'phone' ? 'flex:none;width:780px;height:500px;zoom:.46;align-self:center;' : 'flex:1;'}position:relative;border-radius:28px;overflow:hidden;border:3px solid var(--aline);background:linear-gradient(#fdf3d3 0 62%,#e7d3a6 62%)">
        <div style="position:absolute;left:300px;top:150px;width:240px;height:180px;border-radius:20px;border:10px solid #fff;background:linear-gradient(#bfe3f5,#e1f2fb)"></div>
        <div style="position:absolute;left:350px;top:230px">${buddySVG(l.buddy, { size: 170, outfit: l.outfit, fixed: true })}</div>
        ${spots.map((s, i) => { const k = l.room[i]; return `<button type="button" data-act="roomSpot" data-i="${i}" aria-label="Spot ${i + 1}" style="position:absolute;left:${s[0]}px;top:${s[1]}px;width:110px;height:110px;border-radius:24px;border:3px ${k ? 'solid transparent' : 'dashed ' + (U.f.rsel ? 'var(--sky)' : 'rgba(0,0,0,.15)')};background:${k ? 'transparent' : U.f.rsel ? 'rgba(63,166,220,.12)' : 'transparent'};font-size:74px;line-height:1">${k ? ROOM[k].e : ''}</button>`; }).join('')}
      </div>
      <div style="width:250px;display:flex;flex-direction:column;gap:12px"><b style="font-family:var(--display);font-size:22px">My things</b>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${l.ownedRoom.map(k => `<button type="button" class="card" data-act="roomItem" data-k="${k}" style="align-items:center;border-width:3px;${U.f.rsel === k ? 'border-color:var(--sky)' : ''}"><span style="font-size:44px">${ROOM[k].e}</span><span style="font-size:13px;font-weight:700">${ROOM[k].name}</span></button>`).join('')}</div>
        ${l.ownedRoom.length < 3 ? '<span class="mut">Buy more room things in the shop.</span>' : ''}<button type="button" class="btn ghost" data-to="C18" data-act="shopRoom">Shop for room things</button>
        <div class="card"><b>Sticker albums</b><span class="mut">Ocean album · 7 of 12. Every pack shows exactly which stickers are inside. No random draws.</span><div class="bar"><i style="width:58%"></i></div></div></div></div></div>`;
  } };
ACT.roomItem = (el, d) => { U.f.rsel = d.k; render(); say('Now tap a spot!'); };
ACT.roomSpot = (el, d) => { const l = L(); if (!U.f.rsel) { if (l.room[d.i]) { delete l.room[d.i]; save(); return render(); } return say('Tap one of your things first!'); } Object.keys(l.room).forEach(k => { if (l.room[k] === U.f.rsel) delete l.room[k]; }); l.room[d.i] = U.f.rsel; U.f.rsel = null; save(); render(); say('Looks lovely!'); };
ACT.shopRoom = () => { U.f.shopTab = 'room'; go('C18'); };

/* ---------- C20 badge book ---------- */
R.C20 = { app: 'learner', note: 'Earned badges in colour, unearned ones as outlines with how to earn them (tap to hear). Badges from family and teachers sit beside the built-in ones. Earned badges are never taken away.',
  enter() { U.f.bcat = 'All'; say('Here are your badges!'); },
  render() {
    const l = L(); const all = allBadges().filter(b => !b.custom || !b.who || b.who.includes(l.id)).filter(b => !b.to || (S.links[l.id] && b.to.includes(l.id)));
    const cats = ['All', 'Learning', 'Trying hard', 'Every day', 'Exploring', 'From my family', 'From my teacher'];
    const catOf = b => b.custom ? (b.by === 'Ms Priya' ? 'From my teacher' : 'From my family') : b.cat;
    const list = all.filter(b => U.f.bcat === 'All' || catOf(b) === U.f.bcat);
    return `<div class="a kid">${kidTop(l, { back: 'C04', title: 'My badges' })}<div style="flex:1;display:flex;flex-direction:column;gap:14px;padding:16px 28px;min-height:0">
      <div class="row"><div class="chips">${cats.map(c => `<button type="button" class="chip" aria-pressed="${U.f.bcat === c}" data-act="bcat" data-c="${c}">${c}</button>`).join('')}</div><b class="tnum">${l.badges.length} earned</b></div>
      <div style="flex:1;overflow:auto;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;align-content:start">${list.map(b => { const e = l.badges.includes(b.id); return `<button type="button" data-act="bhow" data-id="${b.id}" style="border:0;background:none;display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--ink);text-align:center;padding:6px">${badgeArt(b, 110, e)}<b style="font-size:15px">${e || !b.hidden ? esc(b.name) : 'Secret'}</b><span class="mut" style="font-size:12px">${e ? (b.custom ? 'From ' + esc(b.by) : 'Earned') : esc(b.hidden ? 'Keep exploring!' : b.how || 'Awarded by ' + b.by)}</span></button>`; }).join('')}</div></div></div>`;
  } };
ACT.bcat = (el, d) => { U.f.bcat = d.c; render(); };
ACT.bhow = (el, d) => { const b = allBadges().concat(S.classBadges).find(x => x.id === d.id); const e = L().badges.includes(b.id); say(e ? `${b.name}! You earned it!` : b.hidden ? 'This is a secret badge. Keep exploring!' : `${b.name}. ${b.how || 'Your grown-up gives this one.'}`); };

/* ---------- C21 wishes ---------- */
R.C21 = { app: 'learner', note: 'Children save treasures towards real-world rewards their grown-ups set up, or towards a shop item. Asking holds the treasures until a grown-up approves in the parent app.',
  enter() { say('These are your wishes!'); },
  render() {
    const l = L(); const ws = S.wishes.filter(w => w.learner === l.id); const dl = S.toDeliver.filter(t => t.learner === l.id);
    return `<div class="a kid">${kidTop(l, { back: 'C04', title: 'My wishes' })}<div style="flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;padding:20px 28px;align-content:start;overflow:auto">
      ${ws.map(w => { const pct = Math.min(100, Math.round(l.treasures / w.cost * 100)); return `<div class="card" style="border-width:3px;border-radius:26px;padding:18px;gap:10px;${w.status === 'asked' ? 'border-color:var(--sun-deep)' : w.status === 'delivered' ? 'border-color:var(--leaf)' : ''}">
        <span style="height:110px;border-radius:18px;background:var(--sand);display:grid;place-items:center;font-size:64px">${w.shop ? (OUTFITS[w.shop] ? '\u{1F452}' : ROOM[w.shop].e) : w.id === 'story' ? '\u{1F4D6}' : w.id === 'park' ? '\u{1F333}' : '\u{1F381}'}</span>
        <b style="font-family:var(--display);font-size:24px">${esc(w.title)}</b><span class="mut">${w.shop ? 'Shop item' : 'From ' + esc(w.by)} · ${w.cost} treasures</span>
        ${w.status === 'open' ? `<div class="bar"><i style="width:${pct}%;background:var(--sky)"></i></div>${l.treasures >= w.cost ? `<button type="button" class="btn sun" data-act="askWish" data-id="${w.id}">${w.shop ? 'Buy it now' : 'Ask for it!'}</button>` : `<span style="font-weight:800">${w.cost - l.treasures} more to go</span>`}` : w.status === 'asked' ? '<span class="pill sun" style="align-self:flex-start">Waiting for your grown-up</span>' : w.status === 'delivered' ? '<span class="pill ok" style="align-self:flex-start">Delivered! Thank you!</span>' : '<span class="pill ok" style="align-self:flex-start">Approved! Coming soon</span>'}</div>`; }).join('')}
      ${dl.map(t => `<div class="card" style="border-width:3px;border-radius:26px;padding:18px;gap:10px;border-color:${t.done ? 'var(--leaf)' : 'var(--sun-deep)'}"><span style="height:110px;border-radius:18px;background:var(--sun-soft);display:grid;place-items:center;font-size:64px">\u{1F3C5}</span><b style="font-family:var(--display);font-size:24px">${esc(t.real)}</b><span class="mut">Earned with the ${esc(t.badge)} badge</span><span class="pill ${t.done ? 'ok' : 'sun'}" style="align-self:flex-start">${t.done ? 'Delivered!' : 'Your grown-up will bring it'}</span></div>`).join('')}
    </div></div>`;
  } };
ACT.askWish = (el, d) => { const l = L(); const w = S.wishes.find(x => x.id === d.id); if (w.shop) { U.f.try = w.shop; U.f.shopTab = OUTFITS[w.shop] ? OUTFITS[w.shop].slot : 'room'; w.status = 'delivered'; save(); return ACT.buy(el, { k: w.shop }); } l.treasures -= w.cost; w.status = 'asked'; w.held = w.cost; save(); render(); say('I asked your grown-up! Your treasures are kept safe until they say yes.'); toast('Wish sent to the parent app. Open it to approve.'); };

/* ---------- C22 family & class island ---------- */
R.C22 = { app: 'learner', note: 'Lessons made by family (in the parent app) and work assigned by the teacher (in the teacher app) appear here. Make or assign one in the other apps and it shows up straight away.',
  enter() { say('Here are lessons from your family and your teacher!'); },
  render() {
    const l = L(); const cl = S.customLessons.filter(c => c.assigned.includes(l.id)); const tr = S.trails.filter(t => t.assigned.includes(l.id)); const as = S.links[l.id] ? S.assignments.filter(a => a.to.includes(l.id)) : [];
    const lcard = (c) => { const st = l.progress['c-' + c.id]; const it = c.cards[0]; return `<button type="button" class="card" data-act="playCustom" data-id="${c.id}" style="flex-direction:row;align-items:center;gap:16px;border-width:3px;border-radius:22px;${st ? '' : 'border-color:var(--coral)'}"><span class="pic" style="width:84px;height:84px;font-size:52px">${it.img ? `<img src="${it.img}" alt="">` : it.e}</span><span style="display:flex;flex-direction:column;gap:2px;text-align:left"><b style="font-family:var(--display);font-size:24px">${esc(c.title)}</b><span class="mut">From ${esc(c.by)} · ${c.cards.length} cards · ${c.template === 'puzzle' ? 'picture puzzle' : c.template === 'sort' ? 'sorting' : 'learn the names'}</span>${st ? `<span>${STAR(true, 18).repeat(st)}</span>` : '<span class="pill" style="background:var(--coral-soft);color:#a63d26;align-self:flex-start">New</span>'}</span></button>`; };
    return `<div class="a kid">${kidTop(l, { back: 'C04', title: 'Family & Class Island' })}<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:22px;padding:20px 28px;min-height:0">
      <section class="card" style="border-radius:26px;padding:18px;gap:12px;overflow:auto"><h3 style="font-size:26px">From my family</h3>${cl.map(lcard).join('') || '<span class="mut">Nothing yet. Grown-ups can make lessons in the parent app.</span>'}
        ${tr.map(t => `<div class="card" style="border-style:dashed;border-width:3px;border-radius:22px"><b style="font-family:var(--display);font-size:22px">Trail: ${esc(t.title)}</b><div style="display:flex;align-items:center;gap:8px">${t.lessons.map((id, i) => { const c = S.customLessons.find(x => x.id === id); const done = c && l.progress['c-' + id]; return `<button type="button" data-act="playCustom" data-id="${id}" style="width:56px;height:56px;border-radius:50%;border:4px solid ${done ? 'var(--leaf)' : 'var(--coral)'};background:${done ? 'var(--leaf-soft)' : 'var(--card)'};font:800 20px var(--display)" aria-label="${esc(c ? c.title : '')}">${i + 1}</button>${i < t.lessons.length - 1 ? '<span style="width:30px;height:4px;background:var(--aline)"></span>' : ''}`; }).join('')}<span style="width:30px;height:4px;background:var(--aline)"></span><span style="font-size:40px">\u{1F3C6}</span></div></div>`).join('')}</section>
      <section class="card" style="border-radius:26px;padding:18px;gap:12px;overflow:auto"><h3 style="font-size:26px">From my teacher</h3>${S.links[l.id] ? `<span class="mut">${esc(S.links[l.id].teacher)} · ${esc(S.links[l.id].cls)}</span>${as.map(a => { const st = l.progress['as-' + a.id]; return `<button type="button" class="card" data-act="playAssign" data-id="${a.id}" style="flex-direction:row;align-items:center;gap:16px;border-width:3px;border-radius:22px;${st ? '' : 'border-color:var(--sky)'}"><span class="pic" style="width:84px;height:84px;font-size:52px">${UNITS[a.unit].items[0].e || '\u{1F4D8}'}</span><span style="display:flex;flex-direction:column;gap:2px;text-align:left"><b style="font-family:var(--display);font-size:24px">${esc(a.title)}</b><span class="mut">From ${esc(a.by)}${a.due ? ' · due ' + esc(a.due) : ''}</span>${st ? `<span class="pill ok" style="align-self:flex-start">Done · ${st} stars</span>` : '<span class="pill sky" style="align-self:flex-start">To do</span>'}</span></button>`; }).join('') || '<span class="mut">No work assigned right now.</span>'}` : '<span class="mut">Not linked to a class. A grown-up can enter a class code in the parent app.</span>'}</section>
    </div></div>`;
  } };
ACT.playCustom = (el, d) => startLesson({ kind: 'custom', id: d.id });
ACT.playAssign = (el, d) => startLesson({ kind: 'assign', id: d.id });

/* ---------- C23 break ---------- */
R.C23 = { app: 'learner', note: 'At the daily limit the current activity finishes, then the buddy says a calm goodbye. No guilt, no countdown. Grown-ups can add time behind the gate.',
  enter() { const l = L(); say(`Great learning today, ${l.name}! Let’s rest our eyes and play outside. See you tomorrow!`); },
  render() { const l = L(); return `<div class="a kid" style="background:#eef0f4;flex-direction:row;align-items:center;justify-content:center;gap:56px;padding:40px">
    <div>${buddySVG(l.buddy, { size: 300, mood: 'sleep', outfit: l.outfit })}</div>
    <div style="width:520px;display:flex;flex-direction:column;gap:18px"><h1 style="font-size:52px">Great learning today, ${esc(l.name)}!</h1><p style="font-size:22px;margin:0;color:#3f434b">That’s your ${S.settings.limit} minutes. Let’s rest our eyes and play outside. See you tomorrow!</p>
      <div class="card"><b>Stretch with ${BUDDIES[l.buddy || 'zip'].name}</b><div class="chips"><span class="chip">Reach up high</span><span class="chip">Touch your toes</span><span class="chip">Big breath</span></div></div>
      <div style="display:flex;gap:12px"><button type="button" class="btn" data-to="C01">Bye-bye!</button><button type="button" class="btn ghost" data-to="C24">Grown-ups: more time</button></div></div></div>`; } };

/* ---------- C24 gate ---------- */
R.C24 = { app: 'learner', note: 'A sum a young child can’t answer guards the grown-up zone. "Hold for 3 seconds" is the accessible option. Once any learner is 8 or older, a PIN replaces the sum.',
  enter() { const a = 3 + Math.floor(Math.random() * 6), b = 3 + Math.floor(Math.random() * 6); U.f.gate = { a, b, v: '' }; },
  render() { const g = U.f.gate; return `<div class="a kid" style="background:#dad6c8;align-items:center;justify-content:center">
    <div class="dialog ${U.f.gshake ? 'shake' : ''}" style="max-width:620px;padding:30px 36px;gap:16px"><div class="row"><h2 style="font-size:32px">Grown-ups only</h2><button type="button" class="btn sm ghost" data-to="C01">Back</button></div>
      <span class="mut" style="font-size:16px">To open the grown-up zone, answer this.</span><div style="font:800 52px var(--display);text-align:center">What is ${g.a} × ${g.b}?</div>
      <div style="height:66px;border:3px solid var(--aline);border-radius:16px;display:grid;place-items:center;font:800 40px var(--display)" class="tnum">${g.v || ' '}</div>
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button type="button" class="btn ghost" data-act="gateKey" data-n="${n}" style="font-size:26px;min-height:62px">${n}</button>`).join('')}</div>
      <div class="row"><button type="button" class="btn ghost sm" id="hold3" aria-label="Hold for 3 seconds">Hold for 3 seconds</button><span class="mut">Answer: ${g.a * g.b} (shown for the prototype)</span></div></div></div>`; },
  after() { const b = $('#hold3'); if (!b) return; let t; const start = () => { b.textContent = 'Keep holding…'; t = setTimeout(() => go('P08'), 3000); }; const stop = () => { clearTimeout(t); if (b.isConnected) b.textContent = 'Hold for 3 seconds'; }; b.onpointerdown = start; b.onpointerup = stop; b.onpointerleave = stop; } };
ACT.gateKey = (el, d) => { const g = U.f.gate; g.v += d.n; U.f.gshake = false; const want = String(g.a * g.b); if (g.v.length >= want.length) { if (g.v === want) { try { speechSynthesis.cancel(); } catch (e) { } return go('P08'); } g.v = ''; U.f.gshake = true; } render(); };

/* ---------- C06 placement, C10 review ---------- */
R.C06 = { app: 'learner', note: p => p.result != null ? 'Placement result. Units the child already knows are marked done with bronze stars, so they skip ahead.' : 'A 2-minute quiz that lets a child skip what they already know. Wrong answers aren’t corrected here; it just finds the starting point.',
  enter(p) { say(p.result != null ? 'All done! Let’s see where you start.' : 'Show me what you know about animals! It’s okay to guess.'); },
  render(p) { const l = L(); const done = p.result != null; const ok = done && p.result >= 4;
    return `<div class="a kid">${kidTop(l, { back: 'C05', bp: { s: p.s || 'animals' }, title: 'Show what you know' })}<div style="flex:1;display:flex;gap:44px;align-items:center;padding:30px 60px">
      <div style="width:360px">${buddySVG(l.buddy, { size: 260, mood: done ? 'cheer' : 'happy', outfit: l.outfit })}</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:16px">${done ? `<h1 style="font-size:46px">You got ${p.result} of 5!</h1><p style="font-size:21px;margin:0">${ok ? 'You know lots already! <b>Wild animals</b> is marked done with bronze stars, so you can skip ahead.' : 'Let’s start from the beginning together. That’s a great place to start!'}</p><button type="button" class="btn" data-to="C05" data-p='{"s":"animals"}' style="align-self:flex-start;min-width:240px">See my trail</button>`
        : `<h1 style="font-size:44px">Show what you know: Animals</h1><p style="font-size:21px;margin:0">5 quick questions. It’s fine to guess, and you can’t lose any stars.</p><div class="card" style="flex-direction:row;gap:10px;align-items:center">${I('sparkle')} Questions get harder as you go. Skip to the unit that fits you.</div><button type="button" class="btn sun" data-act="startPlacement" style="align-self:flex-start;min-width:240px">Let’s go</button>`}</div></div></div>`; } };
ACT.startPlacement = () => startLesson({ kind: 'placement' });
R.C10 = { app: 'learner', note: 'Items a child found hard come back after 1, 3, 7 and 14 days until they’re mastered. Review stones are diamond-shaped on the trail.',
  enter() { say('Remember these? Let’s practise them together!'); },
  render() { const l = L(); const ex = genReview(l); return `<div class="a kid">${kidTop(l, { back: 'C05', bp: { s: 'animals' }, title: 'Review' })}<div style="flex:1;display:flex;gap:40px;align-items:center;padding:30px 50px">
    <div style="width:380px;display:flex;flex-direction:column;gap:16px"><h1 style="font-size:46px">Remember these?</h1><p style="font-size:20px;margin:0">A quick review of things you found tricky.</p>${talk(l, 'Practice makes our brains strong!', 'happy', 90).replace('class="bubble popin"', 'class="bubble sm popin"')}<button type="button" class="btn sun" data-act="startReview" style="align-self:flex-start;min-width:220px">Let’s go</button></div>
    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:16px">${ex.map(x => `<div class="card" style="flex-direction:row;align-items:center;gap:14px;border-radius:22px"><span class="pic" style="width:80px;height:80px">${art(x.target, 50)}</span><span><b style="font-size:20px">${esc(x.target.label)}</b><br><span class="mut">Coming back today</span></span></div>`).join('')}</div></div></div>`; } };
ACT.startReview = () => startLesson({ kind: 'review' });

/* ---------- C29 states ---------- */
R.C29 = { app: 'learner', note: 'Reference board of child-facing states: a calm first visit, offline, a locked unit, and recovering from an error. Use "Go offline" in this panel to see the offline message on the real map.',
  render() { const l = L(); const box = (t, inner) => `<div class="card" style="border-radius:24px;padding:16px;gap:10px"><b style="font-size:17px">${t}</b><div style="flex:1;background:var(--sand);border-radius:18px;display:flex;align-items:center;justify-content:center;gap:16px;padding:14px;text-align:center">${inner}</div></div>`;
    return `<div class="a kid">${kidTop(l, { back: 'C04', title: 'Child states' })}<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:18px;padding:18px 26px">
      ${box('1 · First visit', `${buddySVG(l.buddy, { size: 90, outfit: l.outfit })}<span style="display:flex;flex-direction:column;gap:8px;align-items:center">${island('numbers', '#d6ecf8')}<span class="pill ok">Let’s start here!</span></span>`)}
      ${box('2 · Offline, not downloaded', `${buddySVG(l.buddy, { size: 90, mood: 'think', outfit: l.outfit })}<span style="font:800 22px var(--display);max-width:280px">This one needs the internet. Let’s play something else!</span>`)}
      ${box('3 · Locked unit', `<span class="stone lock" style="position:static;transform:none">${I('lock')}</span><span style="font:800 22px var(--display);max-width:300px">Win the Farm animals trophy to open this one!</span>`)}
      ${box('4 · Something went wrong', `<span style="display:flex;flex-direction:column;gap:10px;align-items:center"><span style="font:800 24px var(--display)">Oops! Let’s try that again.</span><span class="mut">Answers so far are kept. The error is reported without any child data.</span><button type="button" class="btn sm" data-act="toast" data-msg="Lesson restarted from the last answer.">Try again</button></span>`)}
    </div></div>`; } };

/* ---------- A01 older learners, A02 teen sign-in ---------- */
const CARDS = [['Stop sign', 'Red octagon: stop completely'], ['Give way', 'Upside-down triangle: let others go first'], ['Zebra crossing', 'Stripes: stop for people crossing'], ['Speed limit 50', 'Circle with a red ring: maximum speed']];
R.A01 = { app: 'learner', note: 'Teens and adults get a cleaner dark look, a quiet buddy, personal records instead of confetti, and their own flashcard trails. The family challenge is shared, never a ranking.',
  enter() { U.f.fc = null; },
  render(p) { const l = learner('joseph'); const fam = Math.min(30, S.learners.reduce((n, x) => n + Object.keys(x.progress).length, 0)); const fc = U.f.fc;
    return `<div class="a night" style="padding:24px 34px;gap:18px;font-size:16px">
      <div class="row"><button type="button" data-to="C01" style="display:flex;align-items:center;gap:10px;border:0;background:none;color:var(--night-fg);font:800 22px var(--display)">${avatar(l, 42)}${esc(p.teen ? 'Nia' : l.name)}</button><span style="color:var(--night-muted)">Explorer theme · dark · best streak 12 days · ${l.stars} stars</span><button type="button" class="sim dark" data-act="quietBuddy">Buddy: ${l.quiet ? 'quiet' : 'on'}</button></div>
      <h1 style="font-size:36px;color:#fff;font-weight:700">Pick up where you left off</h1>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px">${[['l2', 'Reading', 'Letter sounds · Explorer'], ['n3', 'Maths', 'More or less · typed answers at Voyager'], ['a3', 'Science', 'Land, water, air']].map(([u, s, d], i) => `<button type="button" data-act="olderLesson" data-u="${u}" style="text-align:left;background:var(--night-2);border:2px solid ${i ? '#3a3f4a' : '#8fb0ec'};border-radius:18px;padding:18px;color:var(--night-fg);display:flex;flex-direction:column;gap:6px"><span style="color:var(--night-muted);font-size:13px">${s}</span><b style="font-size:20px">${UNITS[u].title}</b><span style="color:var(--night-muted);font-size:14px">${d}</span></button>`).join('')}</div>
      <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:16px;min-height:0">
        <div style="background:var(--night-2);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:10px"><b style="font-size:18px">My flashcard trail: Driving theory signs</b>${fc ? `<div style="flex:1;border-radius:14px;background:#1c1f26;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;text-align:center"><b style="font-size:24px">${esc(CARDS[fc.i][0])}</b>${fc.flip ? `<span style="color:var(--night-muted)">${esc(CARDS[fc.i][1])}</span><div style="display:flex;gap:8px"><button type="button" class="btn sm" data-act="fcRate" data-r="knew">Knew it</button><button type="button" class="btn sm ghost" data-act="fcRate" data-r="almost">Almost</button><button type="button" class="btn sm ghost" data-act="fcRate" data-r="not">Not yet</button></div>` : `<button type="button" class="btn sm sun" data-act="fcFlip">Show answer</button>`}<span style="color:var(--night-muted);font-size:13px">Card ${fc.i + 1} of ${CARDS.length} · spaced repetition</span></div>` : `<span style="color:var(--night-muted)">40 cards · 12 due today · rate each one: knew it / almost / not yet</span><button type="button" class="btn sun" data-act="fcStart" style="align-self:flex-start">Study now</button>`}</div>
        <div style="background:var(--night-2);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:10px"><b style="font-size:18px">Family challenge</b><span style="color:var(--night-muted)">The family completes 30 lessons this week</span><div class="bar" style="background:#1c1f26"><i style="width:${fam / 30 * 100}%;background:#8fb0ec"></i></div><span class="tnum">${fam} of 30 · everyone shares the reward · no rankings</span><span style="color:var(--night-muted);font-size:14px">Personal records: fastest unit 2 days · longest streak 12 days</span></div>
      </div></div>`; } };
ACT.olderLesson = (el, d) => { S.active = 'joseph'; startLesson({ kind: 'unit', unit: d.u, n: 1 }); };
ACT.quietBuddy = () => { const l = learner('joseph'); l.quiet = !l.quiet; save(); render(); };
ACT.fcStart = () => { U.f.fc = { i: 0, flip: false }; render(); };
ACT.fcFlip = () => { U.f.fc.flip = true; render(); };
ACT.fcRate = (el, d) => { const fc = U.f.fc; fc.i++; fc.flip = false; if (fc.i >= CARDS.length) { U.f.fc = null; toast('Session done. "Not yet" cards come back tomorrow, "knew it" cards in 7 days.'); } else render(); };
R.A02 = { app: 'learner', note: 'Learners 13 and up can get their own sign-in, linked to the parent account. Only their own profile opens; the parent keeps oversight.',
  render() { return `<div class="a night" style="flex-direction:row;align-items:center;justify-content:center;gap:60px;padding:40px">
    <div style="width:420px;display:flex;flex-direction:column;gap:16px"><span style="color:var(--night-muted);letter-spacing:.1em;font-weight:800;font-size:13px">TRAILBUDDIES</span><h1 style="font-size:42px;color:#fff;font-weight:700">Sign in on your own device</h1><p style="color:#c8c9ce;margin:0;font-size:17px">For learners 13 and up whose parent turned on teen sign-in. Your parent’s account still looks after privacy settings.</p>${buddySVG('kiki', { size: 160, outfit: { eyes: 'shades' } })}</div>
    <form data-submit="teenIn" style="width:430px;background:var(--night-2);border-radius:22px;padding:28px;display:flex;flex-direction:column;gap:12px">
      <label class="lbl" for="t-em" style="color:var(--night-muted)">Your email</label><input class="inp" id="t-em" value="nia@example.com" style="background:#1c1f26;color:#fff;border-color:#3a3f4a">
      <button type="submit" class="btn sun">Send sign-in link</button><div style="text-align:center;color:var(--night-muted)">or</div>
      <label class="lbl" for="t-code" style="color:var(--night-muted)">Family code from your parent</label><input class="inp" id="t-code" value="FAM-82KD" style="background:#1c1f26;color:#fff;border-color:#3a3f4a;letter-spacing:.1em">
      <button type="submit" class="btn ghost" style="background:transparent;color:#8fb0ec;border-color:#8fb0ec">Continue with code</button>
      <span style="color:var(--night-muted);font-size:13px">Only your own profile opens. Your parent can see progress and switch teen sign-in off.</span></form></div>`; } };
ACT.teenIn = () => { go('A01', { teen: 1 }); toast('Signed in as Nia (13). The prototype shows the older-learner home.'); };
