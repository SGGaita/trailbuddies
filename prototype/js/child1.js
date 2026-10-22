/* ================= learner app (tablet), part 1: shell, map, trail, lesson engine ================= */
const CHEER = ['Yes! Well done!', 'Brilliant!', 'You got it!', 'Super!', 'Wow, great job!', 'That’s right!', 'Amazing!'];
let lastCheer = '';
const cheer = () => { let c; do { c = pick(CHEER); } while (c === lastCheer); lastCheer = c; return c; };
const PICS = { dog: '\u{1F415}', moon: '\u{1F319}', apple: '\u{1F34E}', star: '⭐', car: '\u{1F697}', fish: '\u{1F41F}', tree: '\u{1F333}', ball: '⚽', sun: '☀️' };
const DOWNLOADED = ['numbers', 'language', 'animals'];

function kidTop(l, opts = {}) {
  if (D('learner') === 'phone') return `<div class="ktop">${opts.back ? `<button type="button" class="iconbtn" data-to="${opts.back}" ${opts.bp ? `data-p='${JSON.stringify(opts.bp)}'` : ''} aria-label="Back">${I('back')}</button>` : `<button type="button" data-to="C01" style="border:0;background:none;padding:0" aria-label="Switch learner">${avatar(l, 40)}</button>`}<h2>${esc(opts.title || 'Hi ' + l.name + '!')}</h2>${U.offline ? `<span class="pill warn">${I('wifi', 'ico')}</span>` : ''}<span class="coin" aria-label="${l.stars} stars">${STAR(true, 20)}<span class="tnum">${l.stars}</span></span><span class="coin" aria-label="${l.treasures} treasures">${GEM(20)}<span class="tnum">${l.treasures}</span></span><button type="button" class="iconbtn" data-to="C24" aria-label="Grown-ups">${I('lock')}</button></div>`;
  const wk = l.week.map((m, i) => `<span title="day ${i + 1}" style="width:22px;height:22px;border-radius:7px;background:${i === 6 ? (l.today >= S.settings.goal ? 'var(--leaf)' : 'var(--sun-soft)') : m >= 15 ? 'var(--leaf)' : 'var(--sand)'};border:${i === 6 ? '2px dashed var(--sun-deep)' : '0'}"></span>`).join('');
  return `<div class="top">
    ${opts.back ? `<button type="button" class="iconbtn" data-to="${opts.back}" ${opts.bp ? `data-p='${JSON.stringify(opts.bp)}'` : ''} aria-label="Back">${I('back')}</button>` : `<button type="button" data-to="C01" style="display:flex;align-items:center;gap:10px;border:0;background:none;color:var(--ink);font-family:var(--display);font-weight:800;font-size:22px" aria-label="Switch learner">${avatar(l, 46)}${esc(l.name)}</button>`}
    ${opts.title ? `<h2 style="font-size:28px;font-weight:800">${esc(opts.title)}</h2>` : `<div style="display:flex;gap:5px;margin-left:10px;align-items:center">${wk}<span class="mut" style="margin-left:6px;font-weight:700">Today: ${Math.min(l.today, S.settings.goal)} of ${S.settings.goal}</span></div>`}
    <span style="flex:1"></span>
    ${U.offline ? `<span class="pill warn" style="font-size:12px">${I('wifi', 'ico')} offline</span>` : ''}
    <span class="coin" aria-label="${l.stars} stars">${STAR(true, 26)}<span class="tnum">${l.stars}</span></span>
    <span class="coin" aria-label="${l.treasures} treasures">${GEM(26)}<span class="tnum">${l.treasures}</span></span>
    <button type="button" class="btn sm ghost" data-to="C24" style="min-height:44px">Grown-ups</button>
  </div>`;
}
const KHUB = ['C04', 'C17', 'C18', 'C19', 'C20', 'C21', 'C22'];
function kidTabs() { const cur = U.screen; return `<nav class="ktabs" aria-label="Main">${[['C04', 'map', 'Map'], ['C17', 'game', 'Games'], ['C18', 'shop', 'Shop'], ['C19', 'room', 'Room'], ['C20', 'badge', 'Badges'], ['C21', 'wish', 'Wishes']].map(([to, ic, n]) => `<button type="button" data-to="${to}" ${cur === to ? 'aria-current="page"' : ''}>${I(ic)}${n}</button>`).join('')}</nav>`; }
function talk(l, text, mood = 'happy', size = 120, extra = '') {
  return `<div style="display:flex;align-items:flex-end;gap:14px">${buddySVG(l.buddy || 'zip', { mood, size, outfit: l.outfit })}<div class="bubble popin" style="margin-bottom:${size * .35}px">${esc(text)}${extra}</div></div>`;
}

/* ---------- C01 who's playing ---------- */
R.C01 = { app: 'learner', note: 'Each child taps their own picture. Zawadi has a picture password. Amani is new, so he meets the buddies first. Joseph is an adult learner with a grown-up look.',
  enter() { say('Who’s playing today? Tap your picture!'); },
  render() {
    return `<div class="a kid" style="padding:28px 40px;gap:22px;background:var(--cream)">
      <div class="row"><div style="font:800 16px var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--leaf-deep)">Trailbuddies</div><button type="button" class="btn sm ghost" data-to="C24">Grown-ups</button></div>
      <div style="display:flex;align-items:center;gap:18px">${buddySVG('zip', { size: 110 })}<div class="bubble popin">Who’s playing today? Tap your picture!</div></div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(${D('learner') === 'phone' ? 1 : S.learners.length},minmax(0,1fr));gap:${D('learner') === 'phone' ? 10 : 24}px">
        ${S.learners.map(l => `<button type="button" class="prof" data-act="pickLearner" data-id="${l.id}" ${D('learner') === 'phone' ? 'style="flex-direction:row;justify-content:flex-start;gap:14px;text-align:left"' : ''}>${avatar(l, D('learner') === 'phone' ? 64 : 150)}<span style="font-family:var(--display);font-weight:800;font-size:${D('learner') === 'phone' ? 26 : 34}px">${esc(l.name)}</span><span class="mut" style="font-size:15px">${l.adult ? 'Adult learner' : !l.buddy ? 'New! Meet the buddies' : l.pw ? 'Picture password on' : l.band}</span></button>`).join('')}
      </div>
      <div class="row mut" style="font-size:15px"><span>${D('learner') === 'web' ? 'In your browser · works on shared computers' : 'Installed app · works offline'} · <button type="button" data-to="A02" style="border:0;background:none;color:var(--leaf-deep);font-weight:800;text-decoration:underline">Teen sign-in</button></span><button type="button" data-to="C02" data-p='{"cls":1}' style="border:0;background:none;color:var(--leaf-deep);font-weight:800;text-decoration:underline">${D('learner') === 'web' ? 'Computer lab? Class sign-in' : 'Classroom tablet? Class sign-in'}</button></div>
    </div>`;
  } };
ACT.pickLearner = (el, d) => { const l = learner(d.id); S.active = l.id; save(); if (l.pw) go('C02', { id: l.id }); else if (!l.buddy) go('C03'); else if (l.adult) go('A01'); else enterMap(); };
function enterMap() { const l = L(); if (l.minutes >= S.settings.limit) return go('C23'); const pc = (S.pendingCele[l.id] || []); if (pc.length) { const b = pc.shift(); save(); return go('C13', { badge: b, after: 'C04' }); } go('C04'); }

/* ---------- C02 picture password ---------- */
R.C02 = { app: 'learner', note: p => p.cls ? 'Classroom mode: the tablet is set to Class 1B. A child taps their name, then their 3 secret pictures. Try Zawadi: dog, moon, apple.' : 'Zawadi taps her 3 secret pictures so her little brother can’t spend her treasures. Her pictures are dog, moon, apple.',
  enter(p) { U.f.pw = []; U.f.pwFail = 0; U.f.who = p.id || null; say(p.cls && !p.id ? 'Find your name!' : 'Tap your three secret pictures!'); },
  render(p) {
    const cls = p.cls; const who = U.f.who || (cls ? null : (U.f.who = S.active));
    if (cls && !who) return `<div class="a kid" style="padding:26px 40px;gap:18px">
      <div class="row"><h2 style="font-size:30px">Class 1B · who are you?</h2><button type="button" class="btn sm ghost" data-to="C01">Not a classroom tablet</button></div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;flex:1">${S.cls.students.map(s => `<button type="button" class="prof" data-act="clsWho" data-id="${s.id}" style="flex-direction:row;gap:16px">${avatar({ name: s.name, color: ['coral', 'sky', 'leaf', 'berry', 'sun'][s.name.length % 5] }, 70)}<span style="font-family:var(--display);font-weight:800;font-size:26px">${esc(s.name)}</span></button>`).join('')}</div>
      <p class="mut" style="margin:0;font-size:15px">Signs out after each lesson or 3 minutes without a tap. Works offline when the school Wi-Fi drops.</p></div>`;
    const st = cls ? S.cls.students.find(s => s.id === who) : learner(who); const name = cls ? st.name : st.name;
    const target = cls ? st.pw : st.pictures; const hint = U.f.pwFail >= 3 ? target[0] : null;
    return `<div class="a kid" style="padding:26px 40px;flex-direction:row;gap:36px">
      <div style="width:360px;display:flex;flex-direction:column;gap:18px">
        <div class="mut" style="font-weight:800;text-transform:uppercase;letter-spacing:.08em">${cls ? 'Class 1B · ' + (D('learner') === 'web' ? 'computer lab' : 'classroom tablet') : D('learner') === 'phone' ? 'Family phone' : D('learner') === 'web' ? 'Family computer' : 'Family tablet'}</div>
        <div class="card" style="align-items:center;padding:22px;border-width:3px;border-color:var(--leaf)">${avatar(cls ? { name, color: 'coral' } : st, 120)}<b style="font-family:var(--display);font-size:32px">${esc(name)}</b><button type="button" class="btn sm ghost" data-to="${cls ? 'C02' : 'C01'}" ${cls ? `data-p='{"cls":1}'` : ''}>Not me</button></div>
        ${talk(L(), 'Tap your 3 secret pictures!', 'happy', 90).replace('class="bubble popin"', 'class="bubble sm popin"')}
        <div style="display:flex;gap:12px">${[0, 1, 2].map(i => `<span style="width:86px;height:86px;border-radius:20px;border:3px ${U.f.pw[i] ? 'solid var(--leaf)' : 'dashed var(--aline)'};background:${U.f.pw[i] ? 'var(--leaf-soft)' : 'var(--card)'};display:grid;place-items:center;font-size:44px">${U.f.pw[i] ? '✓' : ''}</span>`).join('')}</div>
      </div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;${U.f.shake ? '' : ''}" class="${U.f.shake ? 'shake' : ''}">
        ${Object.entries(PICS).map(([k, e]) => `<button type="button" class="tile${hint === k ? ' hint' : ''}" data-act="pwTap" data-k="${k}" aria-label="${k}"><span class="art">${e}</span></button>`).join('')}
      </div></div>`;
  } };
ACT.clsWho = (el, d) => { U.f.who = d.id; U.f.pw = []; U.f.pwFail = 0; render(); say('Tap your three secret pictures!'); };
ACT.pwTap = (el, d) => {
  U.f.pw.push(d.k); U.f.shake = false;
  if (U.f.pw.length < 3) return render();
  const cls = U.p.cls; const st = cls ? S.cls.students.find(s => s.id === U.f.who) : learner(U.f.who); const target = cls ? st.pw : st.pictures;
  if (U.f.pw.join() === target.join()) { if (cls) { S.active = 'zawadi'; save(); if (U.f.who !== 'zawadi') { go('C04'); return toast(`Signed in as ${st.name}. The prototype shows Zawadi’s map.`); } } else S.active = st.id; save(); say('Welcome back!'); return enterMap(); }
  U.f.pwFail++; U.f.pw = []; U.f.shake = true; render(); say(U.f.pwFail >= 3 ? 'Here is a clue. Your first picture is glowing.' : 'Oops, try again!');
};

/* ---------- C03 meet the buddies ---------- */
R.C03 = { app: 'learner', note: 'Each buddy introduces itself when tapped. Picking one makes it this child’s tutor everywhere. Outfits stay with each buddy.',
  enter() { say('Meet the buddies! Tap one to say hello.'); U.f.bsel = null; },
  render() {
    return `<div class="a kid" style="padding:26px 36px;gap:18px">
      <div class="row"><h2 style="font-size:40px;font-weight:800">Meet the buddies!</h2><button type="button" class="speak" data-act="say" data-text="Meet the buddies! Tap one to say hello." aria-label="Hear it again">${I('speak')}</button></div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px">
        ${Object.entries(BUDDIES).map(([id, b]) => `<div class="card" style="align-items:center;justify-content:space-between;padding:18px;border-width:3px;border-color:${U.f.bsel === id ? 'var(--leaf)' : 'var(--aline)'};border-radius:28px">
          <button type="button" data-act="hiBuddy" data-id="${id}" style="border:0;background:none;padding:0" aria-label="Say hello to ${b.name}">${buddySVG(id, { size: 170, mood: U.f.bsel === id ? 'cheer' : 'happy' })}</button>
          <b style="font-family:var(--display);font-size:34px">${b.name}</b>
          <span class="mut" style="text-align:center;font-size:15px;min-height:40px">“${esc(b.line)}”</span>
          <button type="button" class="btn ${U.f.bsel === id ? 'sun' : ''} wide" data-act="pickBuddy" data-id="${id}">Pick me!</button></div>`).join('')}
      </div></div>`;
  } };
ACT.hiBuddy = (el, d) => { U.f.bsel = d.id; render(); say(`Hi! I'm ${BUDDIES[d.id].name}. ${BUDDIES[d.id].line}`); };
ACT.pickBuddy = (el, d) => { L().buddy = d.id; save(); say(`Yay! I'm your buddy now, ${L().name}!`); go('C04'); };

/* ---------- C04 world map ---------- */
function subjProg(l, s) { let done = 0, tot = 0; s.units.forEach(u => lessonIds(u).forEach(k => { tot++; if (l.progress[k]) done++; })); return [done, tot]; }
function nextUnit(l, s) { return s.units.find((u, i) => !lessonIds(u).every(k => l.progress[k])) || s.units[s.units.length - 1]; }
R.C04 = { app: 'learner', note: 'Every subject is a place. The buddy greets the child by name and remembers what they did last. The side bar opens games, the shop, the treasure room, badges and wishes. Family & Class Island holds lessons from grown-ups.',
  enter() { const l = L(); const first = !Object.keys(l.progress).length; const h = l.lang === 'sw' ? `Habari ${l.name}!` : `Hi ${l.name}!`; say(first ? `${h} Let's start here, at Numbers Mountain!` : `${h} Yesterday we met the farm animals. Shall we meet some wild ones?`, l.lang); },
  render() {
    const l = L(); const first = !Object.keys(l.progress).length; const isl = S.customLessons.filter(c => c.assigned.includes(l.id)).length + (S.links[l.id] ? S.assignments.filter(a => a.to.includes(l.id)).length : 0);
    const pos = [[40, 18], [345, 18], [650, 18], [40, 235], [345, 235]]; const order = ['numbers', 'language', 'colours', 'animals', 'shapes'];
    const places = order.map((id, i) => { const s = SUBJECTS.find(x => x.id === id); const [d, t] = subjProg(l, s); const nu = nextUnit(l, s); const fav = (l.interests || []).includes(id);
      const dim = first && id !== 'numbers';
      return `<button type="button" class="place" data-act="openSubj" data-id="${id}" style="left:${pos[i][0]}px;top:${pos[i][1]}px;${dim ? 'opacity:.5' : ''}">${first && id === 'numbers' ? '<span class="tag" style="background:var(--leaf);color:#fff">Start here!</span>' : fav ? '<span class="tag">Favourite</span>' : '<span style="height:20px"></span>'}${island(s.isl, s.fill)}<span>${s.name}</span><span style="font:700 13px var(--body);color:var(--amuted)">${d ? `${d} of ${t} · next: ${nu.title}` : 'Not started'}${!DOWNLOADED.includes(id) && U.offline ? ' · needs internet' : ''}</span></button>`; }).join('');
    if (D('learner') === 'phone') {
      const cards = order.map(id => { const s = SUBJECTS.find(x => x.id === id); const [d, t] = subjProg(l, s); const nu = nextUnit(l, s); const fav = (l.interests || []).includes(id); return `<button type="button" class="isl-card" data-act="openSubj" data-id="${id}" style="${first && id !== 'numbers' ? 'opacity:.5' : ''}${first && id === 'numbers' ? 'border-color:var(--leaf)' : ''}">${island(s.isl, s.fill)}<span style="flex:1;min-width:0"><b style="font-family:var(--display);font-size:20px;display:block">${s.name}</b><span class="mut">${d ? `${d} of ${t} · next: ${esc(nu.title)}` : 'Not started'}</span>${t ? `<div class="bar" style="margin-top:6px"><i style="width:${d / t * 100}%"></i></div>` : ''}</span>${first && id === 'numbers' ? '<span class="pill ok">Start</span>' : fav ? '<span class="pill sun">Fav</span>' : ''}</button>`; }).join('');
      return `<div class="a kid">${kidTop(l)}<div class="isl-list"><div style="display:flex;align-items:flex-end;gap:8px">${buddySVG(l.buddy, { size: 120, outfit: l.outfit })}<div class="bubble sm popin" style="margin-bottom:20px">${first ? `Hi ${esc(l.name)}! Let’s start with Numbers!` : `${l.lang === 'sw' ? 'Habari' : 'Hi'} ${esc(l.name)}! Shall we meet some wild animals?`}</div></div>${cards}
        <button type="button" class="isl-card" data-to="C22" style="border-color:${isl ? 'var(--coral)' : 'var(--aline)'}">${island('family', '#fde6df')}<span style="flex:1"><b style="font-family:var(--display);font-size:20px;display:block">Family & Class Island</b><span class="mut">Lessons from Mum and Ms Priya</span></span>${isl ? `<span class="pill bad">${isl} new</span>` : ''}</button>
        <div class="mut" style="font-weight:800">Coming soon</div><div class="chips">${LOCKED_PLACES.map(p => `<button type="button" class="chip" data-act="lockedPlace" data-n="${p.name}" style="border-style:dashed;color:var(--amuted)">${p.name}</button>`).join('')}</div></div>${kidTabs()}</div>`;
    }
    return `<div class="a kid">${kidTop(l)}
      <div style="flex:1;display:flex;min-height:0">
        <div class="map">${places}
          <button type="button" class="place" data-to="C22" style="left:650px;top:235px">${isl ? `<span class="tag" style="background:var(--coral);color:#fff">${isl} new</span>` : '<span style="height:20px"></span>'}${island('family', '#fde6df')}<span>Family & Class Island</span><span style="font:700 13px var(--body);color:var(--amuted)">Lessons from Mum and Ms Priya</span></button>
          <div style="position:absolute;left:18px;bottom:12px;display:flex;align-items:flex-end;gap:12px">${buddySVG(l.buddy, { size: 112, outfit: l.outfit })}<div class="bubble sm popin" style="max-width:360px;margin-bottom:40px">${first ? `Hi ${esc(l.name)}! Let’s start here!` : `${l.lang === 'sw' ? 'Habari' : 'Hi'} ${esc(l.name)}! Yesterday we met the farm animals. Shall we meet some wild ones?`}</div></div>
          <div style="position:absolute;right:16px;bottom:16px;display:flex;flex-direction:column;align-items:flex-end;gap:6px"><span class="mut" style="font-weight:800">Coming soon</span><div style="display:flex;gap:8px">${LOCKED_PLACES.map(p => `<button type="button" data-act="lockedPlace" data-n="${p.name}" style="border:2px dashed var(--aline);background:rgba(255,255,255,.6);border-radius:16px;padding:6px 12px;font-weight:800;color:var(--amuted);font-size:14px">${p.name}</button>`).join('')}</div></div>
        </div>
        <nav class="side" aria-label="More">
          <button type="button" data-to="C17">${I('game')}Games</button><button type="button" data-to="C18">${I('shop')}Shop</button><button type="button" data-to="C19">${I('room')}My room</button><button type="button" data-to="C20">${I('badge')}Badges</button><button type="button" data-to="C21">${I('wish')}Wishes</button>
        </nav></div></div>`;
  } };
ACT.openSubj = (el, d) => { if (U.offline && !DOWNLOADED.includes(d.id)) { overlay(`<div class="dialog" style="align-items:center;text-align:center;max-width:520px">${buddySVG(L().buddy, { size: 110, mood: 'think', outfit: L().outfit })}<h2 style="font-size:28px">This one needs the internet. Let’s play something else!</h2><div style="display:flex;gap:10px"><button type="button" class="btn" data-act="closeGo" data-to2="C05" data-s="animals">Animal Safari</button><button type="button" class="btn ghost" data-act="closeGo" data-to2="C17">Games</button></div></div>`); say('This one needs the internet. Let’s play something else!'); return; } go('C05', { s: d.id }); };
ACT.closeGo = (el, d) => { U.overlay = null; go(d.to2, d.s ? { s: d.s } : {}); };
ACT.lockedPlace = (el, d) => { toast(`${d.n} opens at launch.`); say(`${d.n} is coming soon!`); };

/* ---------- C05 trail ---------- */
function unitOpen(l, s, i) { return i === 0 || !!l.progress[s.units[i - 1].id + '-T'] || lessonIds(s.units[i - 1]).every(k => l.progress[k]); }
R.C05 = { app: 'learner', note: 'One winding trail per subject. Units are stages, lessons are numbered stones, and each unit ends with a trophy. The diamond is a review lesson for things the child found tricky. Locked units open after the trophy.',
  enter(p) { const s = SUBJECTS.find(x => x.id === p.s); say(`Welcome to ${s.name}! Tap the big stone to start.`); },
  render(p) {
    const l = L(); const s = SUBJECTS.find(x => x.id === p.s) || SUBJECTS[0]; const ph = D('learner') === 'phone'; const sx = v => ph ? Math.round(v * .58) : v; let y = 70; const pts = []; let html = ''; let nextFound = false; let curUnit = s.units[0];
    const weak = Object.values(l.mastery || {}).some(v => v[0] >= 1 && v[1] / v[0] < .7);
    s.units.forEach((u, ui) => {
      const open = unitOpen(l, s, ui);
      html += `<div class="banner" style="left:${sx(300)}px;top:${y}px;${ph ? 'font-size:14px;' : ''}${open ? '' : 'opacity:.55'}">Unit ${ui + 1} · ${esc(u.title)}${open ? '' : ' · locked'}</div>`; y += 80;
      if (ui === 0 && weak) { pts.push([sx(140), y]); html += `<button type="button" class="stone rev" data-to="C10" style="left:${sx(140)}px;top:${y}px" aria-label="Review lesson"><span>Review</span></button>`; y += 90; }
      lessonIds(u).forEach((k, li) => {
        const x = sx([170, 330, 470][li % 3]); pts.push([x, y]); const st = l.progress[k]; let cls = 'stone'; let lbl = `${li + 1}`;
        if (st) cls += ' done'; else if (open && !nextFound) { cls += ' next'; nextFound = true; curUnit = u; } else if (!open) cls += ' lock';
        html += `<button type="button" class="${cls}" ${cls.includes('next') ? 'id="nextstone"' : ''} data-act="${open ? 'startUnit' : 'lockedUnit'}" data-u="${u.id}" data-n="${li + 1}" style="left:${x}px;top:${y}px" aria-label="Lesson ${li + 1}${st ? ', ' + st + ' stars' : ''}">${lbl}${st ? `<small>${'★'.repeat(st)}</small>` : cls.includes('next') ? '<small>Start</small>' : ''}</button>`;
        y += 100;
      });
      const tx = sx(300); pts.push([tx, y]); const tdone = !!l.progress[u.id + '-T']; const allDone = lessonIds(u).every(k => l.progress[k]);
      html += `<button type="button" class="stone trophy${tdone ? ' done' : ''}${open && allDone && !tdone && !nextFound ? ' next' : ''}" data-act="trophy" data-u="${u.id}" style="left:${tx}px;top:${y}px" aria-label="Trophy">${tdone ? '\u{1F3C6}' : '\u{1F3C6}'}<small>${tdone ? 'won' : 'trophy'}</small></button>`;
      if (open && allDone && !tdone && !nextFound) { nextFound = true; curUnit = u; }
      y += 120;
    });
    const path = pts.map((q, i) => (i ? 'L' : 'M') + q[0] + ' ' + q[1]).join(' ');
    const [d, t] = subjProg(l, s);
    if (ph) return `<div class="a kid">${kidTop(l, { back: 'C04', title: s.name })}
      <div id="trailbox" style="flex:1;overflow-y:auto;position:relative;background:linear-gradient(${s.fill},var(--cream))"><div style="position:relative;height:${y}px;width:350px;margin:0 auto"><svg width="350" height="${y}" style="position:absolute;left:0;top:0" aria-hidden="true"><path d="${path}" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${s.col}" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round" stroke-linejoin="round"/></svg>${html}</div></div>
      <div style="flex:none;background:var(--card);border-top:2px solid var(--aline);padding:10px 14px 22px;display:flex;flex-direction:column;gap:8px"><div class="row"><b style="font-family:var(--display);font-size:17px">${esc(curUnit.title)}</b><span class="mut">${d} of ${t}</span></div><div class="bar"><i style="width:${t ? d / t * 100 : 0}%;background:${s.col}"></i></div><div style="display:flex;gap:8px"><button type="button" class="btn" data-act="scrollNext" style="flex:1">Next lesson</button><button type="button" class="btn ghost" data-to="C06" data-p='{"s":"${s.id}"}' style="flex:1;font-size:14px">Show what I know</button></div></div></div>`;
    return `<div class="a kid">${kidTop(l, { back: 'C04', title: s.name })}
      <div style="flex:1;display:flex;min-height:0">
        <div id="trailbox" style="flex:1;overflow-y:auto;position:relative;background:linear-gradient(${s.fill},var(--cream))">
          <div style="position:relative;height:${y}px;width:600px;margin:0 auto">
            <svg width="600" height="${y}" style="position:absolute;left:0;top:0" aria-hidden="true"><path d="${path}" fill="none" stroke="#fff" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${s.col}" stroke-width="6" stroke-dasharray="2 16" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${html}</div></div>
        <aside style="width:310px;flex:none;background:var(--card);border-left:2px solid var(--aline);padding:20px;display:flex;flex-direction:column;gap:12px">
          <div class="mut" style="font-weight:800">${d} of ${t} lessons</div><div class="bar"><i style="width:${t ? d / t * 100 : 0}%;background:${s.col}"></i></div>
          <h3 style="font-size:26px">${esc(curUnit.title)}</h3>
          <div style="display:flex;flex-wrap:wrap;gap:6px">${curUnit.items.slice(0, 8).map(it => `<span style="width:52px;height:52px;border-radius:14px;background:var(--sand);display:grid;place-items:center">${art(it, 30)}</span>`).join('')}</div>
          <button type="button" class="btn wide" data-act="scrollNext">Next lesson</button>
          <button type="button" class="btn ghost wide" data-to="C06" data-p='{"s":"${s.id}"}'>Show what you know</button>
          <button type="button" class="btn ghost wide" data-act="legendary" data-u="${curUnit.id}">Legendary replay</button>
          <span style="flex:1"></span>
          <div style="display:flex;align-items:flex-end;gap:8px">${buddySVG(l.buddy, { size: 80, outfit: l.outfit })}<div class="bubble sm">Tap the big stone!</div></div>
        </aside></div></div>`;
  },
  after() { const n = $('#nextstone'); const b = $('#trailbox'); if (n && b) b.scrollTop = Math.max(0, n.offsetTop - (D('learner') === 'phone' ? 200 : 260)); } };
ACT.scrollNext = () => { const n = $('#nextstone'); if (n) n.click(); else toast('All done here! Try the trophy.'); };
ACT.lockedUnit = () => { say('This one opens after the trophy! Let’s win it first.'); toast('Win the trophy before this unit to open it.'); };
ACT.legendary = (el, d) => { const l = L(); if (lessonIds(UNITS[d.u]).every(k => l.progress[k])) { startLesson({ kind: 'unit', unit: d.u, n: 3, legendary: true }); } else toast('Finish this unit first, then replay it at a harder level for bonus treasures.'); };
ACT.startUnit = (el, d) => startLesson({ kind: 'unit', unit: d.u, n: +d.n });
ACT.trophy = (el, d) => { const l = L(); if (!lessonIds(UNITS[d.u]).every(k => l.progress[k])) { say('Finish all the lessons to reach the trophy!'); return toast('Finish all 3 lessons to reach the trophy.'); } go('C14', { u: d.u }); };

/* ---------- lesson engine ---------- */
const EXMETA = { intro: 'C07', tap: 'C07', count: 'C07', compare: 'C07', match: 'C08', sequence: 'C08', sort: 'C09', trace: 'C25', clock: 'C26', build: 'C27', tf: 'C28', jigsaw: 'C15' };
function prepLesson(spec, at = 0) {
  const l = L(); let exs, title;
  if (spec.kind === 'unit') { const u = UNITS[spec.unit]; exs = genLesson(u, spec.n, spec.legendary ? { ...l, band: 'Explorer' } : l); title = `${u.title} · lesson ${spec.n}`; }
  else if (spec.kind === 'trophy') { const u = UNITS[spec.unit]; exs = genLesson(u, 3, l).slice(1, 5); exs.push({ type: 'jigsaw', item: u.items[0], prompt: 'Trophy puzzle! Finish the picture.', say: 'Trophy puzzle! Can you finish the picture?' }); title = `${u.title} · trophy`; }
  else if (spec.kind === 'custom') { const c = S.customLessons.find(x => x.id === spec.id); exs = genCustom(c); title = c.title; }
  else if (spec.kind === 'assign') { const a = S.assignments.find(x => x.id === spec.id); const u = UNITS[a.unit]; exs = genLesson(u, 1, l); title = a.title + ' · from ' + a.by; }
  else if (spec.kind === 'demo') { exs = genDemo(); title = 'More exercise types'; }
  else if (spec.kind === 'placement') { exs = genPlacement(); title = 'Show what you know'; }
  else if (spec.kind === 'review') { exs = genReview(l); title = 'Review'; }
  U.lesson = { spec, exs, i: at, title, first: 0, total: 0, hints: 0, st: {}, misses: 0, lock: false, preview: !!spec.preview };
}
function startLesson(spec, at = 0) { prepLesson(spec, at); go('C07', { k: 'L' + Date.now() }); }
R.C07 = { app: 'learner', enter() { if (!U.lesson) prepLesson({ kind: 'unit', unit: 'a2', n: 3 }); const x = U.lesson.exs[U.lesson.i]; setTimeout(() => say(x.say, x.lang), 200); }, meta: () => { const x = U.lesson && U.lesson.exs[U.lesson.i]; if (!x) return 'C07'; if (U.lesson.misses >= 2 && ['tap', 'count', 'compare'].includes(x.type)) return 'C11'; return EXMETA[x.type] || 'C07'; },
  note: () => { const x = U.lesson && U.lesson.exs[U.lesson.i]; const t = x ? x.type : ''; const m = U.lesson ? U.lesson.misses : 0;
    if (m >= 2 && ['tap', 'count', 'compare'].includes(t)) return 'Hint ladder: after a 2nd miss one wrong answer disappears and the right one glows. After a 3rd, the buddy shows the answer and the item comes back in a review lesson. There is never a buzzer.';
    return ({ intro: 'Every new thing is shown and said before the child is asked about it. Tap each card to hear it.', tap: 'Listen and tap. Try a wrong answer to see the gentle hint ladder. Prompts are spoken; tap the speaker to hear them again.', count: 'Tap each object to count it aloud, then pick the number.', compare: 'Compare two groups. The buddy counts both sides if the child is stuck.', match: 'Tap a picture, then its partner. Wrong pairs spring back.', sequence: 'Tap the cards in order to fill the slots.', sort: 'Tap an item, then its home. A wrong drop bounces back and the bin name is spoken.', trace: 'Trace with a finger or mouse. Going off the path never fails the child.', clock: 'Move the hands with the buttons, then check.', build: 'Tap letter tiles in order. Each tile plays its sound; "sh" is one tile.', tf: 'The buddy makes a claim; the child decides if it’s true, then hears why.', jigsaw: 'Swap two pieces by tapping them.' })[t] || ''; },
  render() {
    const Ls = U.lesson; const l = L(); const x = Ls.exs[Ls.i]; const total = Ls.exs.length;
    const bars = Ls.exs.map((e, i) => `<i class="${i < Ls.i ? 'on' : i === Ls.i ? 'now' : ''}"></i>`).join('');
    const mood = Ls.mood || 'happy'; const bubbleTxt = Ls.bubble || x.prompt;
    return `<div class="a kid" style="padding:18px 30px 22px;gap:14px">
      <div style="display:flex;align-items:center;gap:16px"><button type="button" class="iconbtn" data-act="leaveLesson" aria-label="Leave lesson">${I('x')}</button><div class="progress">${bars}</div><span class="mut tnum" style="font-weight:800">${Ls.i + 1} of ${total}</span>${Ls.preview ? '<span class="pill sun">Preview</span>' : ''}</div>${D('learner') === 'web' && !l.adult ? '' : ''}
      <div style="display:flex;align-items:center;gap:${D('learner') === 'phone' ? 8 : 16}px;min-height:${D('learner') === 'phone' ? 70 : 120}px">
        ${buddySVG(l.buddy || 'zip', { size: 100, mood, outfit: l.outfit })}
        <div class="bubble popin" style="flex:1;max-width:680px">${esc(bubbleTxt)}${x.mixShow ? `<div style="margin-top:8px">${art({ mix: x.mixShow }, 70)}</div>` : ''}${x.show ? `<div style="margin-top:8px">${art(x.show, 70)}</div>` : ''}</div>
        <button type="button" class="speak" data-act="sayEx" aria-label="Hear it again">${I('speak')}</button>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;min-height:0;${D('learner') === 'phone' ? 'overflow-y:auto' : ''}" id="exarea">${EXR[x.type](x, Ls.st, Ls)}</div>${D('learner') === 'web' && ['intro', 'tap', 'count', 'compare', 'tf'].includes(x.type) ? '<div class="keyhint">Keyboard: press 1, 2, 3… to choose · Space to hear it again</div>' : ''}
    </div>`;
  },
  after() { const x = U.lesson.exs[U.lesson.i]; if (EXA[x.type]) EXA[x.type](x, U.lesson.st); } };
ACT.sayEx = () => { const x = U.lesson.exs[U.lesson.i]; say(x.say, x.lang); };
ACT.leaveLesson = () => overlay(`<div class="dialog" style="align-items:center;text-align:center">${buddySVG(L().buddy, { size: 90, mood: 'think', outfit: L().outfit })}<h2 style="font-size:26px">Stop this lesson?</h2><p class="mut" style="margin:0">Answers so far are kept.</p><div style="display:flex;gap:10px"><button type="button" class="btn ghost" data-act="close">Keep playing</button><button type="button" class="btn" data-act="quitLesson">Stop</button></div></div>`);
ACT.quitLesson = () => { const sp = U.lesson.spec; U.overlay = null; if (sp.preview) return go('P12'); if (sp.kind === 'unit' || sp.kind === 'trophy') go('C05', { s: UNITS[sp.unit].subject }); else if (sp.kind === 'custom' || sp.kind === 'assign') go('C22'); else go('C04'); };
function exStart() { const Ls = U.lesson; Ls.st = {}; Ls.misses = 0; Ls.lock = false; Ls.mood = 'happy'; Ls.bubble = null; render(); const x = Ls.exs[Ls.i]; setTimeout(() => say(x.say, x.lang), 150); }
function nextEx() { const Ls = U.lesson; Ls.i++; if (Ls.i >= Ls.exs.length) return finishLesson(); exStart(); }
function mastery(it, ok) { if (!it || !it.id) return; const l = L(); const m = l.mastery[it.id] || [0, 0]; m[0]++; if (ok) m[1]++; l.mastery[it.id] = m; }
function good(it, msg) {
  const Ls = U.lesson; if (Ls.lock) return; Ls.lock = true; Ls.total++; if (Ls.misses === 0) Ls.first++; mastery(it, Ls.misses === 0);
  const c = msg || cheer(); Ls.bubble = c; Ls.mood = 'cheer'; render(); say(c); setTimeout(nextEx, 1100);
}
function bad(it, label) {
  const Ls = U.lesson; Ls.misses++; Ls.hints++; mastery(it, false); const x = Ls.exs[Ls.i];
  if (Ls.misses === 1) { Ls.bubble = 'Try again! ' + x.prompt; Ls.mood = 'think'; say('Oops, try again! ' + x.say, x.lang); }
  else if (Ls.misses === 2) { Ls.st.hint = true; Ls.bubble = 'Here’s a clue!'; Ls.mood = 'think'; say('Here’s a clue. Look at the glowing one.'); }
  else { Ls.st.reveal = true; Ls.bubble = label ? `This one is ${label}. Tap it!` : 'Let me show you. Tap the glowing one!'; Ls.mood = 'happy'; say(Ls.bubble); }
  Ls.st.shake = true; render(); Ls.st.shake = false;
}

/* exercise renderers */
const tileLabel = (it, x) => (x.showLabels || (L().band !== 'Seedling' && !it.letter && it.num == null && !it.sw && !it.shape && !x.odd)) && it.label ? `<span style="font-size:20px">${esc(L().lang === 'sw' && SW[it.id] && x.lang === 'sw' ? SW[it.id] : it.label)}</span>` : '';
const EXR = {
  intro: (x, st) => `<div style="flex:1;display:grid;grid-template-columns:repeat(${x.items.length},minmax(0,1fr));gap:22px">${x.items.map(it => `<button type="button" class="tile${(st.seen || []).includes(it.id) ? ' ok' : ''}" data-act="introTap" data-id="${it.id}"><span class="art">${art(it, 96)}</span><span style="font-size:28px">${esc(L().lang === 'sw' && SW[it.id] ? SW[it.id] + ' · ' + it.label : it.label)}</span>${it.fact ? `<span class="mut" style="font-family:var(--body);font-size:15px;padding:0 10px">${esc(it.fact)}</span>` : ''}${it.rec ? '<span class="pill sun">Mum’s voice</span>' : ''}</button>`).join('')}</div><div style="display:flex;justify-content:flex-end;margin-top:16px"><button type="button" class="btn sun" data-act="introDone" style="min-width:220px">Let’s play!</button></div>`,
  tap: (x, st) => { const o = x.options; const cols = o.length; const gone = st.gone || [];
    return `<div class="${st.shake ? 'shake' : ''}" style="flex:1;display:grid;grid-template-columns:repeat(${cols},minmax(0,1fr));gap:22px">${o.map(it => { const isT = it.id === x.target.id; let c = 'tile'; if (gone.includes(it.id)) c += ' gone'; if ((st.hint || st.reveal) && isT) c += ' hint'; if (st.reveal && !isT) c += ' dim'; if (st.ok && isT) c += ' ok';
      return `<button type="button" class="${c}" data-act="pick" data-id="${it.id}" aria-label="${esc(it.label || it.say || '')}"><span class="art">${art(it, x.options.length > 3 ? 84 : 100)}</span>${tileLabel(it, x)}</button>`; }).join('')}</div>${x.explain && st.ok ? `<p class="mut" style="font-size:18px;text-align:center">${esc(x.explain)}</p>` : ''}`; },
  count: (x, st) => { const c = st.counted || []; return `<div style="flex:1;display:flex;flex-direction:column;gap:16px"><div style="flex:1;display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-content:center;background:var(--card);border:3px solid var(--aline);border-radius:28px;padding:16px">${Array.from({ length: x.n }, (_, i) => `<button type="button" data-act="countTap" data-i="${i}" style="width:96px;height:96px;border-radius:22px;border:3px solid ${c.includes(i) ? 'var(--leaf)' : 'transparent'};background:${c.includes(i) ? 'var(--leaf-soft)' : 'transparent'};font-size:62px;position:relative" aria-label="object ${i + 1}">${x.e}${c.includes(i) ? `<span style="position:absolute;top:-8px;right:-8px;background:var(--leaf);color:#fff;border-radius:50%;width:30px;height:30px;font:800 16px var(--body);display:grid;place-items:center">${c.indexOf(i) + 1}</span>` : ''}</button>`).join('')}</div>${EXR.tap({ ...x, options: x.options }, st).replace('flex:1;', 'height:150px;')}</div>`; },
  compare: (x, st) => `<div class="${st.shake ? 'shake' : ''}" style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:26px">${x.groups.map(g => `<button type="button" class="tile${(st.hint || st.reveal) && g.id === 'more' ? ' hint' : ''}${st.ok && g.id === 'more' ? ' ok' : ''}" data-act="cmp" data-id="${g.id}"><span style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:360px;font-size:58px;line-height:1">${Array.from({ length: g.n }, () => `<span>${x.e}</span>`).join('')}</span>${st.reveal ? `<span>${g.n}</span>` : ''}</button>`).join('')}</div>`,
  sequence: (x, st) => { const pl = st.placed || []; return `<div style="flex:1;display:flex;flex-direction:column;gap:22px;justify-content:center"><div style="display:flex;gap:18px;justify-content:center">${x.order.map((o, i) => `<span style="width:150px;height:150px;border-radius:24px;border:3px ${pl[i] ? 'solid var(--leaf)' : 'dashed var(--aline)'};background:${pl[i] ? 'var(--leaf-soft)' : 'var(--card)'};display:grid;place-items:center">${pl[i] ? art(pl[i], 90) : ''}</span>`).join('')}</div><div class="${st.shake ? 'shake' : ''}" style="display:flex;gap:18px;justify-content:center">${x.cards.map(c => `<button type="button" class="tile${pl.find(p => p.id === c.id) ? ' gone' : ''}${(st.hint || st.reveal) && x.order[pl.length] && x.order[pl.length].id === c.id ? ' hint' : ''}" data-act="seq" data-id="${c.id}" style="width:150px;height:150px">${art(c, 90)}</button>`).join('')}</div></div>`; },
  match: (x, st) => { const done = st.done || []; const R2 = st.rorder || (st.rorder = shuffle(x.pairs.map(p => p.r)));
    return `<div class="${st.shake ? 'shake' : ''}" style="flex:1;display:grid;grid-template-columns:1fr 160px 1fr;gap:16px;align-items:stretch"><div style="display:flex;flex-direction:column;gap:14px">${x.pairs.map(p => `<button type="button" class="tile${done.includes(p.l.id) ? ' ok' : ''}${st.selL === p.l.id ? ' sel' : ''}" style="flex:1;flex-direction:row;gap:16px" data-act="mL" data-id="${p.l.id}">${art(p.l, 60)}${p.l.letter ? '' : tileLabel(p.l, x)}</button>`).join('')}</div>
      <div style="display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;color:var(--amuted);font-weight:800;text-align:center;font-size:15px">Tap a picture,<br>then its partner</div>
      <div style="display:flex;flex-direction:column;gap:14px">${R2.map(r => `<button type="button" class="tile${done.includes(r.id) ? ' ok' : ''}${(st.hint || st.reveal) && st.selL === r.id ? ' hint' : ''}" style="flex:1;flex-direction:row;gap:12px;font-size:30px" data-act="mR" data-id="${r.id}">${r.sw || r.shape ? art(r, 60) : `<span style="font-family:var(--display);font-size:${r.text.length > 8 ? 26 : 38}px">${esc(r.text)}</span>`}${r.say && !r.sw && !r.shape ? `<span class="mut" style="font-size:13px">${I('speak')}</span>` : ''}</button>`).join('')}</div></div>`; },
  sort: (x, st) => { const placed = st.placed || {}; const left = x.items.filter(i => !placed[i.id]);
    return `<div style="flex:1;display:flex;flex-direction:column;gap:16px"><div class="${st.shake ? 'shake' : ''}" style="display:flex;gap:12px;justify-content:center;min-height:118px">${left.map(i => `<button type="button" class="tile${st.sel === i.id ? ' sel' : ''}" data-act="sItem" data-id="${i.id}" style="width:118px;height:118px;flex:none">${art(i, 64)}</button>`).join('') || '<span class="mut" style="align-self:center">All sorted!</span>'}</div>
      <div style="flex:1;display:grid;grid-template-columns:repeat(${x.bins.length},minmax(0,1fr));gap:18px">${x.bins.map(b => `<button type="button" data-act="sBin" data-b="${b}" style="border:4px dashed ${(st.hint || st.reveal) && st.sel && x.items.find(i => i.id === st.sel).tag === b ? 'var(--sun-deep)' : 'var(--amuted)'};border-radius:28px;background:${st.sel ? 'var(--sky-soft)' : 'var(--card)'};display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:14px;gap:8px;color:var(--ink)"><span style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;font-size:40px">${x.items.filter(i => placed[i.id] === b).map(i => art(i, 40)).join('')}</span><b style="font-family:var(--display);font-size:30px">${esc(b[0].toUpperCase() + b.slice(1))}</b></button>`).join('')}</div></div>`; },
  build: (x, st) => { const b = st.built || []; const used = st.used || [];
    return `<div style="flex:1;display:flex;gap:40px;align-items:center;justify-content:center"><div style="width:250px;height:250px;border-radius:28px;background:var(--card);border:3px solid var(--aline);display:grid;place-items:center">${art(x.word, 150)}</div><div style="display:flex;flex-direction:column;gap:30px;align-items:center"><div style="display:flex;gap:14px">${x.word.parts.map((p, i) => `<span style="width:${p.length > 1 ? 150 : 110}px;height:120px;border-radius:20px;border:3px ${b[i] ? 'solid var(--sky)' : 'dashed var(--sky)'};background:${b[i] ? 'var(--card)' : 'var(--sky-soft)'};display:grid;place-items:center;font:800 64px var(--display)">${b[i] || ''}</span>`).join('')}</div>
      <div class="${st.shake ? 'shake' : ''}" style="display:flex;gap:12px">${x.tiles.map((t, i) => `<button type="button" class="tile${used.includes(i) ? ' gone' : ''}${(st.hint || st.reveal) && t === x.word.parts[b.length] && !used.includes(i) ? ' hint' : ''}" data-act="bTile" data-i="${i}" style="width:${t.length > 1 ? 120 : 96}px;height:96px;font-size:48px">${t}</button>`).join('')}</div></div></div>`; },
  tf: (x, st) => `<div style="flex:1;display:flex;flex-direction:column;gap:18px"><div style="text-align:center;font:800 44px var(--display)">“${esc(x.claim)}”</div><div class="${st.shake ? 'shake' : ''}" style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:26px">${[['true', 'True', 'thumbup'], ['false', 'Not true', 'thumbdown']].map(([v, t, ic]) => `<button type="button" class="tile${st.ok && String(x.truth) === v ? ' ok' : ''}${(st.hint || st.reveal) && String(x.truth) === v ? ' hint' : ''}" data-act="tf" data-v="${v}">${I(ic, '')}<span style="font-size:34px">${t}</span></button>`).join('')}</div>${st.ok ? `<p style="text-align:center;font-size:20px;font-weight:700;margin:0">${esc(x.explain)}</p>` : ''}</div>`.replace(/<svg class=""/g, '<svg width="90" height="90"'),
  trace: (x, st) => `<div style="flex:1;display:flex;gap:24px"><div style="flex:1;background:var(--card);border:3px solid var(--aline);border-radius:28px;position:relative;overflow:hidden"><canvas id="trace" style="width:100%;height:100%;touch-action:none;display:block" aria-label="Tracing area"></canvas></div><div style="width:260px;display:flex;flex-direction:column;gap:12px"><div class="card">Trace inside the grey letter. Lines that wander off just fade. No buzzer.</div><div class="card"><b>Also used for</b>numbers 0 to 9 and shapes</div><span style="flex:1"></span><button type="button" class="btn ghost" data-act="traceClear">Start again</button><button type="button" class="btn" id="traceDone" data-act="traceDone" ${st.ink > 450 ? '' : 'disabled'}>Done</button></div></div>`,
  clock: (x, st) => { const h = st.h ?? 12, m = st.m ?? 0; const ha = ((h % 12) + m / 60) * 30, ma = m * 6;
    return `<div style="flex:1;display:flex;gap:40px;align-items:center;justify-content:center"><div class="${st.shake ? 'shake' : ''}" style="position:relative"><svg width="380" height="380" viewBox="0 0 200 200" aria-label="Clock showing ${h}:${String(m).padStart(2, '0')}"><circle cx="100" cy="100" r="94" fill="#fff" stroke="#263322" stroke-width="6"/>${Array.from({ length: 12 }, (_, i) => { const a = (i + 1) * 30 * Math.PI / 180; return `<text x="${100 + 74 * Math.sin(a)}" y="${100 - 74 * Math.cos(a) + 7}" text-anchor="middle" font-family="Baloo 2,sans-serif" font-weight="800" font-size="20" fill="#263322">${i + 1}</text>`; }).join('')}<line x1="100" y1="100" x2="${100 + 46 * Math.sin(ha * Math.PI / 180)}" y2="${100 - 46 * Math.cos(ha * Math.PI / 180)}" stroke="#263322" stroke-width="9" stroke-linecap="round"/><line x1="100" y1="100" x2="${100 + 70 * Math.sin(ma * Math.PI / 180)}" y2="${100 - 70 * Math.cos(ma * Math.PI / 180)}" stroke="#3fa6dc" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="100" r="7" fill="#263322"/></svg>${st.hint || st.reveal ? `<span class="pill sun" style="position:absolute;top:0;right:-20px;font-size:14px">Long hand on 6, short hand between 3 and 4</span>` : ''}</div>
      <div style="display:flex;flex-direction:column;gap:14px;width:300px"><div style="font:800 48px var(--display);text-align:center" class="tnum">${h}:${String(m).padStart(2, '0')}</div><div class="card"><b>Short hand (hours)</b><div style="display:flex;gap:10px"><button type="button" class="btn ghost sm" data-act="clk" data-k="h" data-d="-1">Back</button><button type="button" class="btn ghost sm" data-act="clk" data-k="h" data-d="1">Forward</button></div></div><div class="card"><b style="color:#1d6b93">Long hand (minutes)</b><div style="display:flex;gap:10px"><button type="button" class="btn ghost sm" data-act="clk" data-k="m" data-d="-5">Back 5</button><button type="button" class="btn ghost sm" data-act="clk" data-k="m" data-d="5">Forward 5</button></div></div><button type="button" class="btn" data-act="clkCheck">Done</button></div></div>`; },
  jigsaw: (x, st) => jigsawHTML(x.item, st, 'jigLesson')
};
const EXA = {
  trace: (x, st) => {
    const cv = $('#trace'); if (!cv) return; const r = cv.getBoundingClientRect(); const sc = r.width / cv.offsetWidth || 1; cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; const c = cv.getContext('2d');
    const draw = () => { c.clearRect(0, 0, cv.width, cv.height); c.font = `800 ${cv.height * .9}px "Baloo 2", sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 34; c.strokeStyle = '#efe6cf'; c.lineJoin = 'round'; c.strokeText(x.glyph, cv.width / 2, cv.height * .52); c.fillStyle = '#f7f1e2'; c.fillText(x.glyph, cv.width / 2, cv.height * .52); c.fillStyle = '#2f9e5b'; c.beginPath(); c.arc(cv.width / 2 + cv.height * .17, cv.height * .34, 14, 0, 7); c.fill(); (st.strokes || []).forEach(s => { c.strokeStyle = '#3fa6dc'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); s.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); }); };
    st.strokes = st.strokes || []; st.ink = st.ink || 0; draw(); let cur = null;
    const pt = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) / b.width * cv.width, (e.clientY - b.top) / b.height * cv.height]; };
    cv.onpointerdown = e => { cur = [pt(e)]; st.strokes.push(cur); cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (!cur) return; const p = pt(e), q = cur[cur.length - 1]; st.ink += Math.hypot(p[0] - q[0], p[1] - q[1]); cur.push(p); draw(); const d = $('#traceDone'); if (d && st.ink > 450) d.disabled = false; };
    cv.onpointerup = () => { cur = null; };
  }
};
ACT.introTap = (el, d) => { const x = U.lesson.exs[U.lesson.i]; const it = x.items.find(i => i.id === d.id); const st = U.lesson.st; st.seen = st.seen || []; if (!st.seen.includes(it.id)) st.seen.push(it.id); render(); const sw = L().lang === 'sw' && SW[it.id]; say((sw ? SW[it.id] : (it.say || it.label)) + (it.snd ? `. It says ${it.snd}!` : '') + (it.fact ? '. ' + it.fact : ''), sw ? 'sw' : 'en'); };
ACT.introDone = () => nextEx();
ACT.pick = (el, d) => { const Ls = U.lesson; const x = Ls.exs[Ls.i]; if (Ls.lock) return; const it = x.options.find(o => o.id === d.id);
  if (d.id === x.target.id) { Ls.st.ok = true; if (x.placement) Ls.place = (Ls.place || 0) + (Ls.misses === 0 ? 1 : 0); good(x.target, x.explain ? cheer() + ' ' + x.explain : null); }
  else { if (x.placement) { Ls.total++; Ls.lock = true; mastery(x.target, false); Ls.bubble = 'Good try!'; render(); return setTimeout(nextEx, 700); } if (Ls.misses + 1 === 2) { Ls.st.gone = Ls.st.gone || []; const w = x.options.find(o => o.id !== x.target.id && o.id !== d.id && !Ls.st.gone.includes(o.id)) || it; if (x.options.length > 2) Ls.st.gone.push(w.id); } bad(x.target, x.target.label || x.target.say); } };
ACT.countTap = (el, d) => { const st = U.lesson.st; st.counted = st.counted || []; const i = +d.i; if (!st.counted.includes(i)) st.counted.push(i); render(); say(NUM[st.counted.length]); };
ACT.cmp = (el, d) => { const Ls = U.lesson; if (d.id === 'more') { Ls.st.ok = true; good(null); } else bad(null); };
ACT.seq = (el, d) => { const Ls = U.lesson; const x = Ls.exs[Ls.i]; const st = Ls.st; st.placed = st.placed || []; const want = x.order[st.placed.length]; if (d.id === want.id) { st.placed.push(want); say(want.say); if (st.placed.length === x.order.length) good(want); else render(); } else bad(want, want.say); };
ACT.mL = (el, d) => { const st = U.lesson.st; if ((st.done || []).includes(d.id)) return; st.selL = d.id; render(); const x = U.lesson.exs[U.lesson.i]; const p = x.pairs.find(p => p.l.id === d.id); say(p.l.letter ? p.l.letter : p.l.label); };
ACT.mR = (el, d) => { const Ls = U.lesson; const st = Ls.st; const x = Ls.exs[Ls.i]; const p = x.pairs.find(p => p.r.id === d.id); say(p.r.say); if (!st.selL) return; if (st.selL === d.id) { st.done = st.done || []; st.done.push(d.id); st.selL = null; if (st.done.length === x.pairs.length) good(p.l); else render(); } else bad(null); };
ACT.sItem = (el, d) => { U.lesson.st.sel = d.id; render(); const it = U.lesson.exs[U.lesson.i].items.find(i => i.id === d.id); say(it.label); };
ACT.sBin = (el, d) => { const Ls = U.lesson; const st = Ls.st; const x = Ls.exs[Ls.i]; if (!st.sel) return say('Tap an animal first!'); const it = x.items.find(i => i.id === st.sel); if (it.tag === d.b) { st.placed = st.placed || {}; st.placed[it.id] = d.b; st.sel = null; say(`Yes! The ${it.label} lives on ${d.b === 'land' ? 'the land' : d.b === 'water' ? 'the water' : 'the air'}.`.replace('on the water', 'in the water').replace('on the air', 'in the air')); if (Object.keys(st.placed).length === x.items.length) good(it); else render(); } else { bad(it, d.b); say(`Hmm, does the ${it.label} live there? Try again!`); } };
ACT.bTile = (el, d) => { const Ls = U.lesson; const st = Ls.st; const x = Ls.exs[Ls.i]; st.built = st.built || []; st.used = st.used || []; const t = x.tiles[+d.i]; const want = x.word.parts[st.built.length]; if (t === want) { st.built.push(t); st.used.push(+d.i); say(t === 'sh' ? 'shh' : t); if (st.built.length === x.word.parts.length) { setTimeout(() => say(x.word.label), 500); good(x.word); } else render(); } else bad(x.word, want); };
ACT.tf = (el, d) => { const Ls = U.lesson; const x = Ls.exs[Ls.i]; if (d.v === String(x.truth)) { Ls.st.ok = true; Ls.lock = true; Ls.total++; if (Ls.misses === 0) Ls.first++; Ls.bubble = cheer(); Ls.mood = 'cheer'; render(); say(Ls.bubble + ' ' + x.explain); setTimeout(nextEx, 3200); } else bad(null); };
ACT.traceClear = () => { U.lesson.st.strokes = []; U.lesson.st.ink = 0; render(); };
ACT.traceDone = () => good(null, 'Beautiful tracing!');
ACT.clk = (el, d) => { const st = U.lesson.st; st.h = st.h ?? 12; st.m = st.m ?? 0; if (d.k === 'h') { st.h = ((st.h - 1 + +d.d + 12) % 12) + 1; } else { st.m = (st.m + +d.d + 60) % 60; } render(); };
ACT.clkCheck = () => { const Ls = U.lesson; const x = Ls.exs[Ls.i]; const st = Ls.st; if ((st.h ?? 12) === x.h && (st.m ?? 0) === x.m) good(null, 'Yes! Half past three!'); else bad(null, 'half past three'); };

function finishLesson() {
  const Ls = U.lesson; const l = L(); const sp = Ls.spec;
  const pct = Ls.total ? Ls.first / Ls.total : 1; const stars = pct >= .9 ? 3 : pct >= .6 ? 2 : 1;
  if (sp.preview) { toast('Preview finished. Nothing was recorded.'); return go('P12'); }
  if (sp.kind === 'placement') { const ok = (Ls.place || 0) >= 4; if (ok) lessonIds(UNITS.a2).forEach(k => { if (!l.progress[k]) l.progress[k] = 1; }); save(); return go('C06', { result: Ls.place || 0 }); }
  let key = null; if (sp.kind === 'unit') key = sp.unit + '-' + sp.n; if (sp.kind === 'trophy') key = sp.unit + '-T'; if (sp.kind === 'custom') key = 'c-' + sp.id; if (sp.kind === 'assign') key = 'as-' + sp.id;
  const before = key ? l.progress[key] || 0 : 0; if (key) l.progress[key] = Math.max(before, stars);
  let tr = 10 + (stars === 3 ? 5 : 0) + (sp.legendary ? 15 : 0); l.stars += stars; l.minutes += 3; l.today++; l.week[6] += 3;
  let goalHit = false; if (l.today === S.settings.goal) { tr += 10; goalHit = true; }
  if (Ls.hints >= 3) l.flags.ngu = true; if (sp.kind === 'custom') l.flags.family = true; if (sp.kind === 'assign') l.flags.class = true; if (Ls.total && Ls.first === Ls.total) l.flags.allFirst = true;
  l.treasures += tr; const nb = checkBadges(l); save();
  U.result = { stars, tr, goalHit, nb, effort: Ls.hints >= 3, title: Ls.title, spec: sp };
  go('C12');
}
