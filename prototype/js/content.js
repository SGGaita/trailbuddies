/* ================= content: subjects, units, lesson generator, badges, shop, seed ================= */
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const nums = (a, b, e) => Array.from({ length: b - a + 1 }, (_, i) => ({ id: 'n' + (a + i), label: String(a + i), say: NUM[a + i], num: a + i, e }));
const SW = { cow: "ng'ombe", goat: 'mbuzi', sheep: 'kondoo', hen: 'kuku', pig: 'nguruwe', duck: 'bata', lion: 'simba', elephant: 'tembo', giraffe: 'twiga', zebra: 'punda milia', monkey: 'tumbili', hippo: 'kiboko' };
const A = (id, e, extra = {}) => Object.assign({ id, label: id, e }, extra);

const SUBJECTS = [
  { id: 'numbers', name: 'Numbers Mountain', short: 'Numbers', isl: 'numbers', fill: '#d6ecf8', col: '#3fa6dc', x: 70, y: 40, units: [
    { id: 'n1', title: 'Counting 1 to 5', items: nums(1, 5, '\u{1F34E}'), kinds: ['count', 'tap', 'compare', 'count', 'tap'] },
    { id: 'n2', title: 'Counting 6 to 10', items: nums(6, 10, '\u{1F31F}'), kinds: ['count', 'sequence', 'tap', 'count', 'sequence'] },
    { id: 'n3', title: 'More or less', items: nums(1, 9, '\u{1F41F}'), kinds: ['compare', 'count', 'compare', 'sequence', 'compare'] }] },
  { id: 'language', name: 'Letter Forest', short: 'Language', isl: 'language', fill: '#fbe0d8', col: '#e8664a', x: 380, y: 110, units: [
    { id: 'l1', title: 'Letter names', items: 'ABCDEF'.split('').map(c => ({ id: 'L' + c, label: c, say: 'the letter ' + c, letter: c, lower: c.toLowerCase() })), kinds: ['tap', 'case', 'tap', 'case', 'tap'] },
    { id: 'l2', title: 'Letter sounds', items: [A('sun', '☀️', { snd: 's' }), A('apple', '\u{1F34E}', { snd: 'a' }), A('tiger', '\u{1F42F}', { snd: 't' }), A('pig', '\u{1F416}', { snd: 'p' }), A('insect', '\u{1F41C}', { snd: 'i' }), A('nut', '\u{1F95C}', { snd: 'n' })], kinds: ['first', 'first', 'tapl', 'first', 'tapl'] },
    { id: 'l3', title: 'Build words', items: [A('cat', '\u{1F408}', { parts: ['c', 'a', 't'] }), A('sun', '☀️', { parts: ['s', 'u', 'n'] }), A('pig', '\u{1F416}', { parts: ['p', 'i', 'g'] }), A('hen', '\u{1F414}', { parts: ['h', 'e', 'n'] }), A('fish', '\u{1F41F}', { parts: ['f', 'i', 'sh'] }), A('bus', '\u{1F68C}', { parts: ['b', 'u', 's'] })], kinds: ['build', 'tap', 'build', 'build', 'tap'] }] },
  { id: 'animals', name: 'Animal Safari', short: 'Animals', isl: 'animals', fill: '#d9f0e1', col: '#2f9e5b', x: 70, y: 300, units: [
    { id: 'a1', title: 'Farm animals', items: [A('cow', '\u{1F404}', { snd: 'moo' }), A('goat', '\u{1F410}', { snd: 'meh' }), A('sheep', '\u{1F411}', { snd: 'baa' }), A('hen', '\u{1F414}', { snd: 'cluck cluck' }), A('pig', '\u{1F416}', { snd: 'oink' }), A('duck', '\u{1F986}', { snd: 'quack' })], kinds: ['tap', 'match', 'tap', 'odd', 'tap'] },
    { id: 'a2', title: 'Wild animals', items: [A('lion', '\u{1F981}'), A('elephant', '\u{1F418}'), A('giraffe', '\u{1F992}'), A('zebra', '\u{1F993}'), A('monkey', '\u{1F412}'), A('hippo', '\u{1F99B}')], kinds: ['tap', 'tap', 'odd', 'match', 'tap'] },
    { id: 'a3', title: 'Land, water, air', items: [A('zebra', '\u{1F993}', { tag: 'land' }), A('lion', '\u{1F981}', { tag: 'land' }), A('fish', '\u{1F41F}', { tag: 'water' }), A('octopus', '\u{1F419}', { tag: 'water' }), A('crab', '\u{1F980}', { tag: 'water' }), A('eagle', '\u{1F985}', { tag: 'air' }), A('bee', '\u{1F41D}', { tag: 'air' }), A('bat', '\u{1F987}', { tag: 'air' })], kinds: ['sort', 'tf', 'tap', 'sort', 'tf'] }] },
  { id: 'colours', name: 'Colour Garden', short: 'Colours', isl: 'colours', fill: '#f5dde8', col: '#b5487a', x: 690, y: 40, units: [
    { id: 'co1', title: 'Red, yellow, blue', items: [{ id: 'red', label: 'red', sw: '#e23b2e', obj: '\u{1F353}' }, { id: 'yellow', label: 'yellow', sw: '#f7c600', obj: '\u{1F34C}' }, { id: 'blue', label: 'blue', sw: '#2a6fd6', obj: '\u{1F433}' }], kinds: ['tap', 'colmatch', 'tap', 'tap', 'colmatch'] },
    { id: 'co2', title: 'More colours', items: [{ id: 'green', label: 'green', sw: '#2f9e5b', obj: '\u{1F438}' }, { id: 'orange', label: 'orange', sw: '#f28c28', obj: '\u{1F955}' }, { id: 'purple', label: 'purple', sw: '#8e44ad', obj: '\u{1F347}' }, { id: 'pink', label: 'pink', sw: '#f48fb1', obj: '\u{1F437}' }, { id: 'brown', label: 'brown', sw: '#8b5a2b', obj: '\u{1F43B}' }], kinds: ['tap', 'colmatch', 'tap', 'colmatch', 'tap'] },
    { id: 'co3', title: 'Mixing colours', items: [{ id: 'orange', label: 'orange', sw: '#f28c28', mixOf: ['#e23b2e', '#f7c600'], mixWords: 'red and yellow' }, { id: 'green', label: 'green', sw: '#2f9e5b', mixOf: ['#2a6fd6', '#f7c600'], mixWords: 'blue and yellow' }, { id: 'purple', label: 'purple', sw: '#8e44ad', mixOf: ['#e23b2e', '#2a6fd6'], mixWords: 'red and blue' }], kinds: ['mix', 'mix', 'tap', 'mix', 'mix'] }] },
  { id: 'shapes', name: 'Shape Town', short: 'Shapes', isl: 'shapes', fill: '#fff0c4', col: '#e0a21b', x: 380, y: 330, units: [
    { id: 's1', title: 'Circle, square, triangle', items: [{ id: 'circle', label: 'circle', shape: 'circle', fill: '#3fa6dc', sides: 0 }, { id: 'square', label: 'square', shape: 'square', fill: '#ffc93c', sides: 4 }, { id: 'triangle', label: 'triangle', shape: 'triangle', fill: '#e8664a', sides: 3 }], kinds: ['tap', 'odd', 'tap', 'tap', 'odd'] },
    { id: 's2', title: 'More shapes', items: [{ id: 'rectangle', label: 'rectangle', shape: 'rectangle', fill: '#2f9e5b', sides: 4, obj: '\u{1F6AA}' }, { id: 'oval', label: 'oval', shape: 'oval', fill: '#b5487a', sides: 0, obj: '\u{1F95A}' }, { id: 'star', label: 'star', shape: 'star', fill: '#ffc93c', sides: 10, obj: '⭐' }, { id: 'heart', label: 'heart', shape: 'heart', fill: '#e8664a', sides: 0, obj: '❤️' }, { id: 'diamond', label: 'diamond', shape: 'diamond', fill: '#3fa6dc', sides: 4, obj: '\u{1F48E}' }], kinds: ['tap', 'tap', 'shapematch', 'tap', 'shapematch'] },
    { id: 's3', title: 'Sides and corners', items: [{ id: 'triangle', label: 'triangle', shape: 'triangle', fill: '#e8664a', sides: 3 }, { id: 'square', label: 'square', shape: 'square', fill: '#ffc93c', sides: 4 }, { id: 'pentagon', label: 'pentagon', shape: 'pentagon', fill: '#2f9e5b', sides: 5 }, { id: 'hexagon', label: 'hexagon', shape: 'hexagon', fill: '#3fa6dc', sides: 6 }], kinds: ['sides', 'trace', 'sides', 'tap', 'sides'] }] }
];
const LOCKED_PLACES = [{ name: 'Time Tower', isl: 'time', fill: '#ece7da', x: 690, y: 300 }, { name: 'Space Station', isl: 'space', fill: '#e6e0ee', x: 560, y: 470 }, { name: 'Weather Valley', isl: 'weather', fill: '#e3eef5', x: 230, y: 470 }];
const UNITS = {}; SUBJECTS.forEach(s => s.units.forEach((u, i) => { u.subject = s.id; u.idx = i; UNITS[u.id] = u; }));
const lessonIds = u => [1, 2, 3].map(n => u.id + '-' + n);
const BAND_OPTS = { Seedling: 3, Sprout: 3, Explorer: 4, Voyager: 4, Trailblazer: 4 };

/* ---------- lesson generator ---------- */
function optsFor(items, target, n) { return shuffle([target, ...shuffle(items.filter(i => i.id !== target.id)).slice(0, n - 1)]); }
function exFor(kind, u, used, n, lang) {
  const items = u.items; let t = shuffle(items.filter(i => !used.includes(i.id)))[0] || pick(items); used.push(t.id);
  const nm = it => (lang === 'sw' && SW[it.id]) ? SW[it.id] : (it.say || it.label);
  switch (kind) {
    case 'tap': {
      if (t.letter) return { type: 'tap', prompt: `Tap the letter ${t.letter}`, say: `Tap the letter ${t.letter}`, target: t, options: optsFor(items, t, n) };
      if (t.num != null) return { type: 'tap', prompt: `Tap the number ${t.label}`, say: `Tap the number ${t.say}`, target: t, options: optsFor(items, t, n).map(o => ({ ...o, e: null })) };
      if (t.sw && !t.mixOf) return { type: 'tap', prompt: `Tap ${t.label}!`, say: `Tap ${t.label}!`, target: t, options: optsFor(items, t, n) };
      if (t.mixOf) return { type: 'tap', prompt: `Which one is ${t.label}?`, say: `Which one is ${t.label}?`, target: t, options: optsFor(items, t, n) };
      return { type: 'tap', prompt: lang === 'sw' && SW[t.id] ? `Gusa ${SW[t.id]}!` : `Tap the ${t.label}!`, say: lang === 'sw' && SW[t.id] ? `Gusa ${SW[t.id]}` : `Tap the ${nm(t)}!`, lang: lang === 'sw' && SW[t.id] ? 'sw' : 'en', target: t, options: optsFor(items, t, n) };
    }
    case 'tapl': return { type: 'tap', prompt: `Tap the letter that says /${t.snd}/`, say: `Which letter says ${t.snd}, like ${t.label}?`, target: { ...t, letter: t.snd }, options: optsFor(items, t, n).map(o => ({ ...o, letter: o.snd, e: null })) };
    case 'first': return { type: 'tap', prompt: `Which one starts with /${t.snd}/?`, say: `Which picture starts with ${t.snd}?`, target: t, options: optsFor(items, t, n), showLabels: true };
    case 'count': { const k = t.num || (2 + Math.floor(Math.random() * 4)); const o = optsFor(items.length >= 3 ? items : nums(1, 6), items.find(i => i.num === k) || t, n); return { type: 'count', n: k, e: t.e || '\u{1F34E}', prompt: 'How many? Tap each one, then pick the number.', say: 'How many can you count?', target: { id: 'n' + k, num: k, say: NUM[k] }, options: o.map(x => ({ id: x.id, num: x.num, say: x.say })) }; }
    case 'compare': { const a = 1 + Math.floor(Math.random() * 4), b = a + 1 + Math.floor(Math.random() * 3); const sides = shuffle([{ id: 'more', n: b }, { id: 'less', n: a }]); return { type: 'compare', ask: 'more', e: t.e || '\u{1F41F}', groups: sides, prompt: 'Which side has more?', say: 'Tap the side that has more!' }; }
    case 'sequence': { const s0 = items[0].num != null ? Math.min(items[0].num + Math.floor(Math.random() * 3), 7) : 1; const seq = [s0, s0 + 1, s0 + 2, s0 + 3].map(k => ({ id: 'n' + k, num: k, say: NUM[k] })); return { type: 'sequence', order: seq, cards: shuffle(seq), prompt: 'Put the numbers in order, smallest first.', say: 'Put the numbers in order. Start with the smallest!' }; }
    case 'match': { const ps = shuffle(items.filter(i => i.snd || i.id)).slice(0, 3); return { type: 'match', pairs: ps.map(p => ({ l: p, r: { id: p.id, text: p.snd ? '“' + p.snd + '”' : p.label, say: p.snd || p.label } })), prompt: ps[0].snd ? 'Match each animal to its sound.' : 'Match each picture to its name.', say: ps[0].snd ? 'Match each animal to its sound!' : 'Match each picture to its name!' }; }
    case 'case': { const ps = shuffle(items).slice(0, 3); return { type: 'match', pairs: ps.map(p => ({ l: p, r: { id: p.id, text: p.lower, say: p.say } })), prompt: 'Match the big letter to the small letter.', say: 'Match each big letter to its small letter!' }; }
    case 'colmatch': { const ps = shuffle(items).slice(0, 3); return { type: 'match', pairs: ps.map(p => ({ l: { id: p.id, e: p.obj }, r: { id: p.id, sw: p.sw, say: p.label } })), prompt: 'Match each thing to its colour.', say: 'Match each thing to its colour!' }; }
    case 'shapematch': { const ps = shuffle(items).slice(0, 3); return { type: 'match', pairs: ps.map(p => ({ l: { id: p.id, e: p.obj }, r: { id: p.id, shape: p.shape, fill: p.fill, say: p.label } })), prompt: 'Match each thing to its shape.', say: 'Match each thing to its shape!' }; }
    case 'odd': {
      const pool = { a1: [A('lion', '\u{1F981}'), A('whale', '\u{1F40B}')], a2: [A('cow', '\u{1F404}'), A('hen', '\u{1F414}')], s1: [{ id: 'star', label: 'star', shape: 'star', fill: '#b5487a' }] }[u.id] || [];
      const odd = pick(pool) || t; const same = shuffle(items.filter(i => i.id !== odd.id)).slice(0, 3);
      const why = { a1: `The ${odd.label} doesn’t live on a farm.`, a2: `The ${odd.label} is a farm animal, not a wild one.`, s1: 'A star has lots of points!' }[u.id] || 'That one is different.';
      return { type: 'tap', odd: true, prompt: 'Which one doesn’t belong?', say: 'Which one does not belong?', target: odd, options: shuffle([odd, ...same]), explain: why };
    }
    case 'sort': return { type: 'sort', bins: ['land', 'water', 'air'], items: shuffle(items).slice(0, 6), prompt: 'Where does each animal live? Tap an animal, then its home.', say: 'Where does each animal live? Tap an animal, then tap its home.' };
    case 'tf': { const c = pick([{ claim: 'A bat is a bird!', truth: false, explain: 'Bats fly, but they are mammals. They have fur and feed their babies milk.' }, { claim: 'An octopus has eight arms!', truth: true, explain: 'Yes! Octo means eight.' }, { claim: 'Fish can breathe air like us!', truth: false, explain: 'Fish breathe in water using gills.' }]); return { type: 'tf', ...c, prompt: 'Is the buddy right?', say: c.claim + ' Is that true?' }; }
    case 'build': { const w = t.parts ? t : items.find(i => i.parts); const tiles = shuffle([...w.parts, pick(['m', 'o', 'r', 'd'].filter(x => !w.parts.includes(x)))]); return { type: 'build', word: w, tiles, prompt: `Spell ${w.label}`, say: `Spell ${w.label}. ${w.parts.join(', ')}.` }; }
    case 'mix': { const o = optsFor(items, t, Math.min(n, items.length)); return { type: 'tap', prompt: `${t.mixWords[0].toUpperCase() + t.mixWords.slice(1)} make…`, say: `What do ${t.mixWords} make?`, target: t, options: o, mixShow: t.mixOf }; }
    case 'sides': { const o = shuffle([3, 4, 5, 6]).slice(0, n); if (!o.includes(t.sides)) o[0] = t.sides; return { type: 'tap', prompt: `How many sides does a ${t.label} have?`, say: `How many sides does a ${t.label} have?`, target: { id: 'n' + t.sides, num: t.sides, say: NUM[t.sides] }, options: shuffle(o).map(k => ({ id: 'n' + k, num: k, say: NUM[k] })), show: t }; }
    case 'trace': return { type: 'trace', glyph: pick(['a', 'c', 'o']), prompt: 'Trace the letter. Start at the green dot!', say: 'Trace the letter with your finger. Start at the green dot.' };
  }
  return exFor('tap', u, used, n, lang);
}
function genLesson(u, n, l) {
  const band = l.band, opt = Math.min(BAND_OPTS[band] + (n === 3 && band !== 'Seedling' ? 1 : 0), u.items.length >= 4 ? 4 : u.items.length);
  const used = []; const intro = { type: 'intro', items: shuffle(u.items).slice(0, 3), prompt: 'Let’s meet them first. Tap each one!', say: 'Let’s meet them first. Tap each one to hear it!' };
  const kinds = u.kinds.slice((n - 1) % 2).concat(u.kinds).slice(0, 5);
  return [intro, ...kinds.map(k => exFor(k, u, used, opt, l.lang))];
}
function genCustom(cl) {
  const cards = cl.cards; const items = cards.map(c => ({ id: c.id, label: c.label, e: c.e, img: c.img, tag: c.tag, fact: c.fact, rec: c.rec }));
  const n = Math.min(3, items.length);
  const ex = [{ type: 'intro', items: items.slice(0, Math.min(4, items.length)), prompt: 'Let’s meet them first. Tap each one!', say: 'Let’s meet them first. Tap each one to hear it!' }];
  if (cl.template === 'puzzle') { const t = items[0]; ex.push({ type: 'jigsaw', item: t, prompt: 'Finish the puzzle!', say: 'Can you finish the puzzle?' }); ex.push({ type: 'tap', prompt: 'Who is this?', say: 'Who is this?', target: t, options: optsFor(items, t, n), showLabels: true, reveal: t }); return ex; }
  if (cl.template === 'sort') { const bins = [...new Set(items.map(i => i.tag).filter(Boolean))]; if (bins.length >= 2) ex.push({ type: 'sort', bins, items: shuffle(items).slice(0, 6), prompt: 'Sort them! Tap one, then its group.', say: 'Sort them! Tap one, then tap its group.' }); }
  const used = []; for (let k = 0; k < 3; k++) { const t = shuffle(items.filter(i => !used.includes(i.id)))[0] || pick(items); used.push(t.id); ex.push({ type: 'tap', prompt: `Tap ${t.label}!`, say: `Tap ${t.label}!`, target: t, options: optsFor(items, t, n), showLabels: true }); }
  if (items.length >= 3) ex.push({ type: 'match', pairs: shuffle(items).slice(0, 3).map(p => ({ l: p, r: { id: p.id, text: p.label, say: p.label } })), prompt: 'Match each picture to its name.', say: 'Match each picture to its name!' });
  return ex;
}
function genDemo() { return [{ type: 'trace', glyph: 'a', prompt: 'Trace the letter a. Start at the green dot!', say: 'Trace the letter a. Start at the green dot.' }, { type: 'clock', h: 3, m: 30, text: 'half past three', prompt: 'Show half past three', say: 'Show half past three on the clock.' }, exFor('build', UNITS.l3, [], 3, 'en'), { type: 'tf', claim: 'A bat is a bird!', truth: false, explain: 'Bats fly, but they are mammals. They have fur and feed their babies milk.', prompt: 'Is Zip right?', say: 'A bat is a bird! Is that true?' }]; }
function genPlacement() { const a = UNITS.a1, b = UNITS.a2, c = UNITS.a3; return [exFor('tap', a, [], 3, 'en'), exFor('tap', a, [], 3, 'en'), exFor('tap', b, [], 4, 'en'), exFor('odd', b, [], 4, 'en'), exFor('tap', c, [], 4, 'en')].map(x => ({ ...x, placement: true })); }
function genReview(l) {
  const weak = Object.entries(l.mastery || {}).filter(([k, v]) => v[0] >= 1 && v[1] / v[0] < .7).map(([k]) => k);
  const all = []; SUBJECTS.forEach(s => s.units.forEach(u => u.items.forEach(it => { if (weak.includes(it.id) && !all.find(a => a.it.id === it.id)) all.push({ it, u }); })));
  const pickd = (all.length ? all : [{ it: UNITS.a2.items[5], u: UNITS.a2 }, { it: UNITS.n2.items[1], u: UNITS.n2 }]).slice(0, 4);
  return pickd.map(({ it, u }) => { const o = optsFor(u.items, it, 3); return { type: 'tap', prompt: it.letter ? `Tap the letter ${it.letter}` : it.num != null ? `Tap the number ${it.label}` : `Tap the ${it.label}!`, say: it.num != null ? `Tap the number ${it.say}` : `Tap the ${it.say || it.label}!`, target: it, options: it.num != null ? o.map(x => ({ ...x, e: null })) : o }; });
}

/* ---------- badges ---------- */
const unitDone = (l, uid) => lessonIds(UNITS[uid]).every(k => l.progress[k]);
const BADGES = [
  { id: 'first', name: 'First Steps', how: 'Finish your first lesson', cat: 'Learning', col: '#2f9e5b', test: l => Object.keys(l.progress).length >= 1 },
  { id: 'counting', name: 'Counting Champ', how: 'Finish Counting 1 to 5', cat: 'Learning', col: '#3fa6dc', test: l => unitDone(l, 'n1') },
  { id: 'animal', name: 'Animal Explorer', how: 'Finish Farm animals', cat: 'Learning', col: '#2f9e5b', test: l => unitDone(l, 'a1') },
  { id: 'wild', name: 'Wild Friend', how: 'Finish Wild animals', cat: 'Learning', col: '#e0a21b', test: l => unitDone(l, 'a2') },
  { id: 'letters', name: 'Letter Hunter', how: 'Finish Letter names', cat: 'Learning', col: '#e8664a', test: l => unitDone(l, 'l1') },
  { id: 'rainbow', name: 'Rainbow Maker', how: 'Finish Red, yellow, blue', cat: 'Learning', col: '#b5487a', test: l => unitDone(l, 'co1') },
  { id: 'shapes', name: 'Shape Spotter', how: 'Finish Circle, square, triangle', cat: 'Learning', col: '#e0a21b', test: l => unitDone(l, 's1') },
  { id: 'perfect10', name: 'Perfect Ten', how: 'Get 3 stars in 10 lessons', cat: 'Trying hard', col: '#ffc93c', test: l => Object.values(l.progress).filter(v => v === 3).length >= 10 },
  { id: 'ngu', name: 'Never Give Up', how: 'Finish a lesson after 3 hints', cat: 'Trying hard', col: '#e8664a', test: l => l.flags.ngu },
  { id: 'week', name: 'Week Warrior', how: 'Reach your daily goal on 5 days', cat: 'Every day', col: '#3fa6dc', test: l => l.week.filter(d => d >= 15).length >= 5 },
  { id: 'world', name: 'World Traveller', how: 'Try every subject', cat: 'Exploring', col: '#2f9e5b', test: l => SUBJECTS.every(s => s.units.some(u => lessonIds(u).some(k => l.progress[k]))) },
  { id: 'games', name: 'Game Master', how: 'Play the jigsaw and memory games', cat: 'Exploring', col: '#b5487a', test: l => l.games.includes('jigsaw') && l.games.includes('memory') },
  { id: 'family', name: 'Family Star', how: 'Finish a lesson your family made', cat: 'From my family', col: '#e8664a', test: l => l.flags.family },
  { id: 'class', name: 'Class Hero', how: 'Finish work from your teacher', cat: 'From my teacher', col: '#3fa6dc', test: l => l.flags.class },
  { id: 'speedy', name: 'Super Speedy', how: 'A secret badge. Keep exploring!', cat: 'Secret', col: '#1f5b3a', hidden: true, test: l => l.flags.allFirst }
];
const badgeTest = (b, l) => b.test ? b.test(l) : b.rule === 'count' ? l.stars >= b.n : b.rule === 'lesson' ? !!l.progress['c-' + b.lesson] : false;
function allBadges() { return BADGES.concat(S.customBadges.map(b => ({ ...b, custom: true }))); }
function checkBadges(l) {
  const got = []; allBadges().forEach(b => { if (l.badges.includes(b.id)) return; if (b.custom && b.who && !b.who.includes(l.id)) return; if (b.rule === 'manual') return; if (badgeTest(b, l)) { l.badges.push(b.id); got.push(b.id); l.treasures += b.reward || 15; } });
  return got;
}

/* ---------- shop ---------- */
const ROOM = { rug: { name: 'Round rug', e: '\u{1F9F6}', price: 30 }, lamp: { name: 'Lamp', e: '\u{1F4A1}', price: 40 }, plant: { name: 'Plant', e: '\u{1FAB4}', price: 35 }, cat: { name: 'Pet cat', e: '\u{1F408}', price: 120 }, poster: { name: 'Space poster', e: '\u{1F5BC}️', price: 25 }, books: { name: 'Book shelf', e: '\u{1F4DA}', price: 60 }, ball: { name: 'Football', e: '⚽', price: 20 } };

/* ---------- seed ---------- */
function seed() {
  const prog = {}; ['a1-1', 'a1-2', 'a1-3', 'n1-1', 'n1-2', 'l1-1', 'co1-1', 'a2-1', 'a2-2', 's1-1'].forEach((k, i) => prog[k] = [3, 2, 3, 3, 2, 3, 2, 3, 2, 3][i]);
  prog['a1-T'] = 3;
  return {
    v: 1, active: 'zawadi', plan: 'Free',
    family: { parent: 'Grace', email: 'grace@example.com', country: 'Kenya' },
    settings: { voice: true, rate: 0.95, goal: 2, limit: 20, bedtime: '19:30', breaks: true, calm: false, captions: true, digest: true },
    learners: [
      { id: 'zawadi', name: 'Zawadi', age: 6, born: 'Jun 2020', band: 'Sprout', color: 'coral', buddy: 'zip', outfit: { hat: 'sunhat' }, owned: ['sunhat'], room: { 0: 'plant' }, ownedRoom: ['plant'], stars: 42, treasures: 130, progress: prog, badges: ['first', 'animal'], mastery: { hippo: [4, 1], n7: [5, 2], sun: [3, 1] }, pictures: ['dog', 'moon', 'apple'], pw: true, lang: 'en', bilingual: false, today: 1, minutes: 12, week: [20, 35, 0, 28, 18, 0, 12], games: ['jigsaw'], flags: {}, interests: ['animals', 'space'], wishes: [] },
      { id: 'amani', name: 'Amani', age: 3, born: 'Mar 2023', band: 'Seedling', color: 'sky', buddy: null, outfit: {}, owned: [], room: {}, ownedRoom: [], stars: 0, treasures: 0, progress: {}, badges: [], mastery: {}, pictures: ['car', 'sun', 'fish'], pw: false, lang: 'en', bilingual: false, today: 0, minutes: 0, week: [0, 10, 0, 8, 0, 0, 0], games: [], flags: {}, interests: ['animals'], wishes: [] },
      { id: 'joseph', name: 'Joseph', age: 46, born: '1980', band: 'Explorer', adult: true, color: 'night', buddy: 'kiki', outfit: {}, owned: [], room: {}, ownedRoom: [], stars: 340, treasures: 410, progress: { 'l1-1': 3, 'l1-2': 3 }, badges: ['first'], mastery: {}, pictures: [], pw: false, lang: 'en', today: 0, minutes: 0, week: [30, 25, 0, 40, 20, 15, 0], games: [], flags: {}, wishes: [] }
    ],
    customLessons: [{ id: 'pets', title: 'Our Pets', by: 'Mum', template: 'learn', assigned: ['zawadi', 'amani'], cards: [{ id: 'simba', label: 'Simba the dog', e: '\u{1F415}', fact: 'Simba loves chasing balls.', rec: true }, { id: 'kitty', label: 'Kitty', e: '\u{1F408}', rec: false }, { id: 'goldie', label: 'Goldie the fish', e: '\u{1F420}', tag: 'water' }, { id: 'daisy', label: 'Daisy the cow', e: '\u{1F404}', rec: true, tag: 'land' }] }],
    trails: [],
    assignments: [{ id: 'as1', unit: 'a3', title: 'Land, water, air', group: 'Readers', due: 'Fri 30 Oct', by: 'Ms Priya', to: ['zawadi', 'leo', 'amina'] }],
    customBadges: [{ id: 'garden', name: 'Garden Helper', shape: 'circle', col: '#2f9e5b', icon: 'heart', rule: 'manual', reward: 30, real: 'Pick Friday’s movie', who: ['zawadi', 'amani'], by: 'Mum', msg: 'Thank you for helping in the garden!' }],
    wishes: [{ id: 'story', title: 'Bedtime story of my choice', cost: 100, by: 'Mum', status: 'open', learner: 'zawadi' }, { id: 'park', title: 'Extra park time', cost: 150, by: 'Dad', status: 'open', learner: 'zawadi' }],
    awards: [], toDeliver: [],
    members: [{ name: 'Grace', role: 'Owner', status: 'You' }, { name: 'Tom', role: 'Parent', status: 'Active' }, { name: 'Grandma Wanjiku', role: 'View progress only', status: 'Invite sent' }],
    links: { zawadi: { cls: 'Class 1B', teacher: 'Ms Priya', shareAll: false } },
    shareCodes: { 'SPL-W3K': { title: 'Week 3 spelling', by: 'a teacher', cards: ['ship', 'shop', 'fish', 'dish', 'shell'].map(w => ({ id: w, label: w, e: { ship: '\u{1F6A2}', shop: '\u{1F3EA}', fish: '\u{1F41F}', dish: '\u{1F37D}️', shell: '\u{1F41A}' }[w] })) }, 'PET-4K9': { title: 'Our Pets', by: 'you', own: true } },
    letterSounds: { s: true, a: true, t: true, m: true, d: true, g: true, o: true, c: true, k: true, e: true, u: true, r: true, h: true, b: true },
    cls: { name: 'Class 1B', code: '1B-K7Q4', students: [
      { id: 'zawadi', name: 'Zawadi M.', linked: true, group: 'Readers', pw: ['dog', 'moon', 'apple'] }, { id: 'juma', name: 'Juma K.', linked: false, group: 'Starters', pw: ['car', 'tree', 'ball'] }, { id: 'leo', name: 'Leo E.', linked: true, group: 'Readers', pw: ['star', 'fish', 'sun'] },
      { id: 'amina', name: 'Amina O.', linked: false, group: 'Readers', pw: ['moon', 'ball', 'car'] }, { id: 'baraka', name: 'Baraka N.', linked: true, group: 'Starters', pw: ['apple', 'dog', 'star'] }, { id: 'neema', name: 'Neema W.', linked: true, group: 'Starters', pw: ['tree', 'sun', 'fish'] }],
      deviceSet: false, checklist: { students: true, letters: false, tablets: false, assign: true, progress: false } },
    classBadges: [],
    school: { seats: 6, teachers: [{ name: 'Ms Priya', classes: 'Class 1B, Reading group', students: 34, status: 'Active' }, { name: 'Mr Otieno', classes: 'Class 2A', students: 28, status: 'Active' }, { name: 'Mrs Achieng', classes: '—', students: 0, status: 'Invite sent' }], dpa: false },
    mod: [
      { id: 'm1', kind: 'Image flagged by scanner', what: 'Lesson “Our trip”', code: 'TRP-2M4', age: 26, reason: 'Possible child face and a street sign', e: '\u{1F3D6}️', status: 'open' },
      { id: 'm2', kind: 'Reported 3 times', what: 'Lesson “Funny animals”', code: 'FUN-88A', age: 5, reason: 'Parents say an image is not suitable for children', e: '\u{1F648}', status: 'open' },
      { id: 'm3', kind: 'Reported: personal details', what: 'Badge set “Hillside”', code: 'HIL-7Q2', age: 2, reason: 'Badge shows a child’s full name', e: '\u{1F3C5}', status: 'open' }],
    audit: [], pendingCele: {}, deletion: null, onboard: { kids: [] }
  };
}
