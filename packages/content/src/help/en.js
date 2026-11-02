// HLP-01: help articles for grown-ups. Content as data, bundled with the app so they work
// offline. `screens` lists the grown-up screens whose "?" opens the article. Keep each one short.

export const HELP_TOPICS = [
  { id: "start", title: "Getting started" },
  { id: "lessons", title: "Lessons" },
  { id: "rewards", title: "Rewards" },
  { id: "privacy", title: "Privacy and safety" },
  { id: "billing", title: "Plans and billing" },
  { id: "offline", title: "Offline and devices" },
];

/** @type {{ id: string, topic: string, title: string, body: string[], keywords?: string[], screens?: string[] }[]} */
export const HELP_ARTICLES = [
  {
    id: "add-learner",
    topic: "start",
    title: "Add, edit or remove a learner",
    screens: ["/start/learners"],
    keywords: ["child", "profile", "kid", "birthday", "age", "remove", "delete"],
    body: [
      "Open Settings and find Learners. Tap Edit to change a nickname, colour or birth month and year. Progress is kept.",
      "To add a learner, choose Add a learner. You only need a first name or nickname and their birth month and year.",
      "Remove asks twice. The learner disappears from the children's screens straight away, and you can bring them back for 7 days. After that their profile and progress are deleted.",
    ],
  },
  {
    id: "invite-grown-up",
    topic: "start",
    title: "Invite another parent or a carer",
    screens: ["/family/settings"],
    keywords: ["invite", "partner", "grandma", "grandparent", "carer", "viewer", "second parent"],
    body: [
      "Open Settings, then Grown-ups. Type their email and choose Parent (equal access) or View progress (sees progress and badges, changes nothing).",
      "They get an email with a link that works for 7 days. If it runs out, tap Resend next to their name.",
      "The list shows who invited whom and when each invitation was accepted.",
    ],
  },
  {
    id: "parent-gate",
    topic: "start",
    title: "The grown-ups' gate and PIN",
    keywords: ["pin", "gate", "lock", "sum", "forgot"],
    body: [
      "The grown-up zone asks a quick sum so children don't wander in. Setting a PIN in Settings replaces the sum on this family's devices.",
      "Forgot the PIN? Sign out and in again with your email; you can then set a new one.",
    ],
  },
  {
    id: "picture-password",
    topic: "start",
    title: "Picture passwords for children",
    keywords: ["picture", "password", "sibling", "brother", "sister", "treasures", "lock"],
    body: [
      "A picture password keeps a younger brother or sister out of a profile. The child taps their 3 pictures in order.",
      "Turn it on in Settings, Learners. Choose the 3 pictures together with your child.",
      "After 3 wrong tries the first picture is shown as a hint. You can reset or turn it off any time in Settings.",
    ],
  },
  {
    id: "how-lessons-work",
    topic: "lessons",
    title: "How lessons and levels work",
    keywords: ["level", "difficulty", "stars", "trophy", "trail", "too hard", "too easy"],
    body: [
      "Each subject is a trail of short lessons. A trophy at the end of each part opens the next one.",
      "The level changes by itself after two great or two tricky lessons. To fix a level, open Settings, Difficulty.",
      "'Show what you know' lets a child skip the parts they already know.",
    ],
  },
  {
    id: "make-lesson",
    topic: "lessons",
    title: "Make your own lesson",
    screens: ["/family/create"],
    keywords: ["builder", "custom", "photo", "record", "own lesson"],
    body: [
      "Open Create, choose a lesson type and add 3 or more cards: a word plus a photo, a library picture or an emoji.",
      "You can record your own voice for each card. Your recording plays instead of the device voice.",
      "Choose which children get it and publish. It appears on Family Island.",
    ],
  },
  {
    id: "letter-sounds",
    topic: "lessons",
    title: "Record letter sounds",
    screens: ["/family/sounds"],
    keywords: ["phonics", "letter", "sound", "sh", "ch", "voice", "record"],
    body: [
      "Device voices often get letter sounds wrong. Record each sound once in Settings, Letter sounds: say the sound itself (sss, not 'ess').",
      "Your recordings play in every lesson that uses that sound, on all your family's devices.",
      "Tap 'Use device voice' to go back to the device voice for a sound.",
    ],
  },
  {
    id: "treasures-badges",
    topic: "rewards",
    title: "Stars, treasures and badges",
    keywords: ["treasure", "coins", "shop", "stars", "badge", "limit"],
    body: [
      "Stars show how a lesson went and never go down. Treasures are spent in the shop on outfits.",
      "There's a daily treasure limit so the shop doesn't take over. Turn it off in Settings if you like.",
      "Badges arrive after lessons and games. Each child's badge book shows what they've earned and what's next.",
    ],
  },
  {
    id: "weekly-email",
    topic: "rewards",
    title: "The weekly badge email",
    screens: ["/family/settings"],
    keywords: ["email", "digest", "weekly", "notifications", "unsubscribe"],
    body: [
      "Every Sunday evening we email parents the badges each child earned and the time they spent learning.",
      "Switch it off, or turn on an email when a badge is earned, in Settings, Emails.",
    ],
  },
  {
    id: "what-we-keep",
    topic: "privacy",
    title: "What we keep about your family",
    keywords: ["data", "privacy", "gdpr", "coppa", "consent"],
    body: [
      "Only what the app needs: a nickname, birth month and year, and what each child answers and earns. No adverts, no tracking companies, and children can't chat.",
      "Read the summary and the full policy in Settings, Privacy.",
    ],
  },
  {
    id: "download-delete",
    topic: "privacy",
    title: "Download or delete your data",
    keywords: ["export", "download", "delete", "account", "zip", "remove family"],
    body: [
      "Settings, Privacy, Download our data: we email you a link to a ZIP with everything we keep. It works for 7 days.",
      "Delete our family: we email the owner a link to confirm, and you have 7 days to change your mind.",
    ],
  },
  {
    id: "plans",
    topic: "billing",
    title: "Plans during the beta",
    keywords: ["price", "pay", "plan", "family plan", "free", "cost", "billing"],
    body: [
      "Trailbuddies is free during the closed beta. Beta families get the Family plan: 6 learners and 6 devices.",
      "Paid plans come with the public launch. We'll tell you before anything changes, and nothing is charged without your agreement.",
    ],
  },
  {
    id: "offline",
    topic: "offline",
    title: "Playing without the internet",
    keywords: ["offline", "internet", "wifi", "data", "download", "sync"],
    body: [
      "Lessons on the device work offline. Progress is saved on the device and sent when you're back online.",
      "New lessons download in the background on Wi-Fi. To download now, open Settings, Play without internet.",
      "If a subject needs the internet, the buddy says so and offers one that's ready.",
    ],
  },
  {
    id: "devices",
    topic: "offline",
    title: "Devices and signing out",
    screens: ["/family/settings"],
    keywords: ["device", "phone", "tablet", "sign out", "limit", "too many"],
    body: [
      "Settings, Devices lists every signed-in device. Sign out any you don't use.",
      "The Free plan allows 2 devices at once and the Family plan 6.",
    ],
  },
  {
    id: "updates",
    topic: "offline",
    title: "Updates",
    keywords: ["update", "new version", "what's new", "refresh"],
    body: [
      "Updates download in the background and start the next time the app opens, never in the middle of a lesson.",
      "After an update, What's new on your home screen shows what changed.",
    ],
  },
];

const norm = (s) => String(s || "").toLowerCase();

/**
 * Articles matching a search, best first: title words count most, then keywords, then text.
 * @param {string} query
 */
export function searchHelp(query, articles = HELP_ARTICLES) {
  const words = norm(query)
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (!words.length) return [];
  return articles
    .map((a) => {
      let score = 0;
      for (const w of words) {
        if (norm(a.title).includes(w)) score += 5;
        if ((a.keywords || []).some((k) => norm(k).includes(w))) score += 3;
        if (a.body.some((p) => norm(p).includes(w))) score += 1;
      }
      return { a, score };
    })
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score)
    .map((x) => x.a);
}

/** The article for a screen's "?" (HLP-01). @param {string} path */
export const helpFor = (path) => HELP_ARTICLES.find((a) => (a.screens || []).includes(path)) || null;
