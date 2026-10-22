/* ================= guided flows + boot ================= */
function as(id) { S.active = id; save(); }
function jump(spec, type, extra) {
  prepLesson(spec); let i = U.lesson.exs.findIndex(x => x.type === type);
  if (i < 0) { U.lesson.exs.splice(1, 0, exFor(type, UNITS[spec.unit] || UNITS.a3, [], 3, L().lang)); i = 1; }
  U.lesson.i = i; if (extra) extra(U.lesson);
}
function demoResult() { U.result = { spec: { kind: 'unit', unit: 'a2', n: 2 }, title: 'Wild animals · Lesson 2', stars: 3, tr: 12, goalHit: true, nb: [], effort: false }; }
function obDemo() { if (!U.f.ob || !U.f.ob.kids.length) U.f.ob = { kids: [{ name: 'Baraka', age: 4, year: 2022, band: 'Seedling', color: 'sun', interests: ['animals', 'vehicles'], start: 'begin' }] }; U.f.cons = Object.assign({ core: true }, U.f.cons, { core: true }); }
function draftDemo() { const d = draft(); if (d.cards.length < 3) { d.title = d.title || 'Our kitchen'; U.f.dtitle = d.title; d.cards.push({ id: uid('k'), label: 'Kettle', e: '☕', tag: 'home' }, { id: uid('k'), label: 'Banana', e: '\u{1F34C}', tag: 'home' }, { id: uid('k'), label: 'Bicycle', e: '\u{1F6B2}', tag: 'outside' }, { id: uid('k'), label: 'Tree', e: '\u{1F333}', tag: 'outside' }); d.assigned = ['zawadi']; } }
function askDemo() { const w = S.wishes.find(x => x.id === 'story'); const z = learner('zawadi'); if (w && w.status === 'open' && z.treasures >= w.cost) { z.treasures -= w.cost; w.status = 'asked'; w.held = w.cost; save(); } U.f.wtab = 'req'; }

FLOWS.learner = [
  { group: 'Start & the map', steps: [
    { label: 'Who’s playing?', to: 'C01', setup: () => as('zawadi') },
    { label: 'Picture password (Zawadi)', to: 'C02', k: 'fam', p: { id: 'zawadi' }, setup: () => { as('zawadi'); U.f.who = 'zawadi'; U.f.pw = []; U.f.pwFail = 0; } },
    { label: 'Meet the buddies (Amani, 3)', to: 'C03', setup: () => as('amani') },
    { label: 'World map', to: 'C04', setup: () => as('zawadi') },
    { label: 'Animals trail', to: 'C05', p: { s: 'animals' }, setup: () => as('zawadi') },
    { label: 'Show what you know', to: 'C06', p: { s: 'animals' }, setup: () => as('zawadi') }] },
  { group: 'Inside a lesson', steps: [
    { label: 'Listen & tap', to: 'C07', m: 'C07', setup: () => { as('zawadi'); jump({ kind: 'unit', unit: 'a2', n: 1 }, 'tap'); } },
    { label: 'Match pairs', to: 'C07', m: 'C08', setup: () => { as('zawadi'); jump({ kind: 'unit', unit: 'a1', n: 2 }, 'match'); } },
    { label: 'Sort into groups', to: 'C07', m: 'C09', setup: () => { as('zawadi'); jump({ kind: 'unit', unit: 'a3', n: 2 }, 'sort'); } },
    { label: 'Hint ladder (2 misses)', to: 'C07', m: 'C11', setup: () => { as('zawadi'); jump({ kind: 'unit', unit: 'a2', n: 1 }, 'tap', Ls => { Ls.misses = 2; Ls.hints = 2; Ls.st.hint = true; Ls.bubble = 'Here’s a clue!'; Ls.mood = 'think'; }); } },
    { label: 'Trace a letter', to: 'C07', m: 'C25', setup: () => { as('zawadi'); prepLesson({ kind: 'demo' }, 0); } },
    { label: 'Set the clock', to: 'C07', m: 'C26', setup: () => { as('zawadi'); prepLesson({ kind: 'demo' }, 1); } },
    { label: 'Build a word', to: 'C07', m: 'C27', setup: () => { as('zawadi'); prepLesson({ kind: 'demo' }, 2); } },
    { label: 'True or false?', to: 'C07', m: 'C28', setup: () => { as('zawadi'); prepLesson({ kind: 'demo' }, 3); } },
    { label: 'Lesson complete', to: 'C12', setup: () => { as('zawadi'); demoResult(); } },
    { label: 'Review tricky items', to: 'C10', setup: () => as('zawadi') },
    { label: 'Unit trophy', to: 'C14', p: { u: 'a2' }, setup: () => as('zawadi') }] },
  { group: 'Rewards', steps: [
    { label: 'Badge earned', to: 'C13', p: { badge: 'wild', after: 'C04' }, setup: () => as('zawadi') },
    { label: 'Badge book', to: 'C20', setup: () => as('zawadi') },
    { label: 'Buddy shop', to: 'C18', setup: () => as('zawadi') },
    { label: 'Treasure room', to: 'C19', setup: () => as('zawadi') },
    { label: 'My wishes', to: 'C21', setup: () => as('zawadi') }] },
  { group: 'Games', steps: [
    { label: 'Games corner', to: 'C17', setup: () => as('zawadi') },
    { label: 'Jigsaw', to: 'C15', setup: () => as('zawadi') },
    { label: 'Memory flip', to: 'C16', setup: () => as('zawadi') }] },
  { group: 'Family, class & limits', steps: [
    { label: 'Family & Class Island', to: 'C22', setup: () => as('zawadi') },
    { label: 'Class tablet sign-in', to: 'C02', k: 'cls', p: { cls: 1 }, setup: () => { as('zawadi'); U.f.who = null; U.f.pw = []; } },
    { label: 'Time for a break', to: 'C23', setup: () => as('zawadi') },
    { label: 'Grown-ups gate', to: 'C24', setup: () => as('zawadi') },
    { label: 'Child states', to: 'C29', setup: () => as('zawadi') }] },
  { group: 'Teens & adults', steps: [
    { label: 'Adult learner home', to: 'A01', setup: () => { U.f.fc = null; } },
    { label: 'Teen sign-in', to: 'A02' }] }
];
FLOWS.parent = [
  { group: 'Sign up & onboarding', steps: [
    { label: 'Welcome', to: 'P01' },
    { label: 'Create account', to: 'P02', setup: () => { U.f.em = U.f.em || 'grace@example.com'; } },
    { label: 'Check your email', to: 'P07' },
    { label: 'Parental consent', to: 'P03' },
    { label: 'Add learners', to: 'P04', setup: obDemo },
    { label: 'Interests & start', to: 'P05', setup: obDemo },
    { label: 'Settings & hand-over', to: 'P06', setup: obDemo }] },
  { group: 'Every day', steps: [
    { label: 'Parent home', to: 'P08' },
    { label: 'Zawadi’s progress', to: 'P09', setup: () => { U.f.pk = 'zawadi'; } },
    { label: 'Approve a wish', to: 'P16', k: 'req', setup: askDemo },
    { label: 'Award a badge', to: 'P16', k: 'award', setup: () => { U.f.wtab = 'award'; U.f.pk = 'zawadi'; } },
    { label: 'Settings & privacy', to: 'P18' }] },
  { group: 'Create', steps: [
    { label: 'Lesson Builder', to: 'P10' },
    { label: 'Add a card (photo upload)', to: 'P11', setup: () => { U.f.card = null; U.f.clabel = undefined; } },
    { label: 'Choose a game & publish', to: 'P12', setup: draftDemo },
    { label: 'Make a trail', to: 'P13' },
    { label: 'Remix a built-in unit', to: 'P22' },
    { label: 'Import by code', to: 'P23', setup: () => { U.f.code = 'SPL-W3K'; U.f.codeTried = false; } },
    { label: 'Share codes', to: 'P17' },
    { label: 'Badge Studio: design', to: 'P14' },
    { label: 'Badge Studio: rule & reward', to: 'P15', setup: () => { bd(); U.f.bd.name = U.f.bd.name || 'Kind Helper'; U.f.bdName = U.f.bd.name; } }] },
  { group: 'Family & account', steps: [
    { label: 'Family members', to: 'P19' },
    { label: 'Join a class', to: 'P20', setup: () => { U.f.pk = 'amani'; U.f.ccode = '1B-K7Q4'; } },
    { label: 'Plans', to: 'P21' },
    { label: 'Checkout (M-Pesa)', to: 'P24', setup: () => { U.f.mp = U.f.mp || '0712 345 678'; } },
    { label: 'Cancel subscription', to: 'P25' },
    { label: 'Record letter sounds', to: 'P28' },
    { label: 'Languages', to: 'P29', setup: () => { U.f.pk = 'zawadi'; } },
    { label: 'Help & support', to: 'P30' },
    { label: 'Error & offline states', to: 'P26' }] }
];
FLOWS.teacher = [
  { group: 'Set up', steps: [
    { label: 'Teacher sign-up', to: 'T00' },
    { label: 'Teacher home', to: 'T01' },
    { label: 'Roster & class code', to: 'T02' }] },
  { group: 'Teach', steps: [
    { label: 'Assign work', to: 'T03' },
    { label: 'Class progress', to: 'T04' },
    { label: 'Class badges', to: 'T05' },
    { label: 'Classroom mode', to: 'T06', setup: () => { U.f.cm = 'setup'; } }] }
];
FLOWS.staff = [
  { group: 'School admin', steps: [
    { label: 'Licence & teachers', to: 'S01' },
    { label: 'Reports & library', to: 'S02' }] },
  { group: 'Trailbuddies safety team', steps: [
    { label: 'Moderation queue', to: 'M01' }] }
];

S = load(); save();
runStep(FLOWS.learner[0].steps[0]);
