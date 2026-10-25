// SAF-10: the plain-language privacy summary, the full privacy policy and the terms of use.
// FIRST DRAFTS, NOT LEGAL ADVICE. `reviewed` stays false (and the app shows a banner) until a
// lawyer has checked them for every launch country. Bump `version` and `date` on every change;
// a new version asks families to agree again (TB_POLICY_VERSION on the API must match).

export const LEGAL = {
  version: "2026-10",
  date: "2026-10-25",
  reviewed: false,
  owner: "Trailbuddies, Nairobi, Kenya [legal entity name and registration number to be added]",
  contact: "privacy@trailbuddies.africa",

  summary: [
    {
      h: "What we keep",
      p: [
        "For grown-ups: your name, your email address and which family you belong to.",
        "For each child: a first name or nickname, birth month and year, the buddy and colours they chose, and what they answer and earn in lessons.",
        "Photos and voice recordings only if a grown-up adds them to a lesson and turned that on.",
      ],
    },
    {
      h: "What we never do",
      p: [
        "No adverts, and no tracking or analytics companies.",
        "We never ask for a child's surname, school, address, photo or exact birthday.",
        "Children can't chat, type messages or share anything with other people.",
        "We never sell or rent anyone's data.",
      ],
    },
    {
      h: "How long we keep it",
      p: [
        "Progress is kept while your family uses Trailbuddies.",
        "A removed learner, or a family you delete, can be brought back for 7 days; then it is deleted.",
        "Photos and recordings are deleted 30 days after the lesson that used them is deleted.",
        "If nobody opens your family for 24 months, we email you twice and then delete it.",
        "Backups expire within 35 days of a deletion.",
      ],
    },
    {
      h: "Your choices",
      p: [
        "Download everything we keep about your family (Settings, Privacy).",
        "Correct a child's name, picture or birth date, or remove them.",
        "Delete your whole family. We email you a link to confirm, and you have 7 days to change your mind.",
        "Ask us anything: privacy@trailbuddies.africa.",
      ],
    },
  ],

  privacy: [
    {
      h: "1. Who we are",
      p: [
        "Trailbuddies is a learning app for children aged 3 to 12 and the grown-ups who look after them. This policy explains what personal data we collect, why, how long we keep it and the rights you have.",
        "The data controller is Trailbuddies, Nairobi, Kenya [legal entity name and registration number to be added]. Contact: privacy@trailbuddies.africa.",
      ],
    },
    {
      h: "2. Children come first",
      p: [
        "Children never have accounts. A parent or legal guardian creates a family and adds each child as a learner profile. Before any child's progress is saved to our servers, a parent or guardian agrees to this policy.",
        "In the United States, a parent or guardian also signs a consent form, which a person at Trailbuddies checks before anything about the child is saved to our servers (Children's Online Privacy Protection Act). Until then, everything stays on your device.",
        "We collect only what a learning app needs. We do not ask for a child's surname, school, address, photo, voice or exact date of birth, and children cannot type free text anywhere in the app.",
      ],
    },
    {
      h: "3. What we collect and why",
      p: [
        "Grown-ups: name and email address, to sign you in and send the emails you ask for (sign-in links, invitations, your data download). If you sign in with Google we keep only the Google account id and email address.",
        "Learner profiles: a first name or nickname, birth month and year, avatar colour, buddy, outfit, interests and level settings. Birth month and year set the age band, which changes how lessons look and sound.",
        "Learning progress: each answer, star, treasure and badge, with the time it happened. This chooses what each child practises next and shows grown-ups how they are doing.",
        "Family settings: daily goal, screen-time limit, bedtime lock, sound and voice settings, and the grown-up PIN, which is stored only as a salted hash made on your device.",
        "Custom lessons, and the photos and voice recordings a grown-up adds to them, only if the family turned photos or recordings on. We remove location data from photos before storing them.",
        'Devices: the browser and type of device (for example "Chrome on Android") and when it was last used, so you can see and sign out your family\'s devices.',
        "Feedback you send us from the grown-up zone. We replace children's names in it before storing it.",
        "Error reports, only to fix problems. They are scrubbed before they leave your device: no names, email addresses or links to photos or recordings.",
      ],
    },
    {
      h: "4. Our legal basis",
      p: [
        "For children's data: the consent of a parent or guardian, which you can withdraw at any time.",
        "For grown-ups' account data: providing the service you signed up for.",
        "For security and error reports: our legitimate interest in keeping Trailbuddies safe and working, limited to what is necessary.",
      ],
    },
    {
      h: "5. Who we share it with",
      p: [
        "We never sell or rent personal data, show adverts, or use advertising or analytics companies.",
        "We use a small number of service providers who process data only on our instructions: Vercel (hosting the app and API, Frankfurt, Germany), Supabase (the database, Frankfurt, Germany), Cloudflare R2 (photos, recordings and downloads, encrypted at rest), our email provider (to deliver emails) and, if enabled, Sentry (scrubbed error reports).",
        "Grown-ups in your family see your family's data according to their role. A carer or viewer sees progress but cannot change anything.",
        "We may disclose data if the law requires it, and we will tell you unless we are not allowed to.",
      ],
    },
    {
      h: "6. Where your data is kept",
      p: [
        "Our servers are in the European Union (Frankfurt). Where data moves between countries, we rely on the safeguards the law requires, such as the European Commission's standard contractual clauses, and we choose providers with strong security.",
        "Some data is also kept on your own devices so the app works offline. Signing out removes it from that device.",
      ],
    },
    {
      h: "7. How long we keep it",
      p: [
        "Progress and profiles: while your family uses Trailbuddies.",
        "A removed learner: deleted 7 days after removal (you can undo it until then).",
        "A deleted family: everything is deleted 7 days after you confirm, including grown-up accounts that belong to no other family.",
        "Photos and recordings: deleted 30 days after the lesson that used them is deleted.",
        "Inactive families: if nobody opens the family for 24 months, we email the parents at 23 months and a week before, then delete the family.",
        "Your data download: deleted after 7 days. Error reports: 30 days. Old versions of edited profiles: 30 days. Sign-in links: one day after they expire.",
        "Backups are kept for up to 35 days, so deleted data disappears from them within 35 days.",
      ],
    },
    {
      h: "8. Your rights",
      p: [
        "You can see and download everything we keep about your family (Settings, Privacy, Download our data). We email you a link to a ZIP file that works for 7 days.",
        "You can correct a learner's name, picture or birth date, remove a learner, or delete your whole family in Settings.",
        "You can withdraw consent. We then stop saving your children's progress to our servers.",
        "Depending on where you live you may also have the right to object, to restrict processing and to complain to a data protection authority: in Kenya the Office of the Data Protection Commissioner, in the UK the Information Commissioner's Office, in South Africa the Information Regulator, in Nigeria the Nigeria Data Protection Commission, in Uganda the Personal Data Protection Office, in Tanzania the Personal Data Protection Commission, and in the US the Federal Trade Commission.",
        "To use any of these rights, email privacy@trailbuddies.africa. We answer within 30 days.",
      ],
    },
    {
      h: "9. Security",
      p: [
        "Connections are encrypted (HTTPS). Photos and recordings are private and opened only through links that expire after 15 minutes. The grown-up zone is behind a parent gate and an optional PIN. Only the people who run Trailbuddies can reach the production systems.",
        "If a data breach puts your rights at risk, we tell you and the regulator as the law requires.",
      ],
    },
    {
      h: "10. Changes to this policy",
      p: [
        "When we change this policy we update the version and date at the top, explain what changed, and ask a parent or guardian to agree again before more data is saved.",
      ],
    },
  ],

  terms: [
    {
      h: "1. About these terms",
      p: [
        "These terms are an agreement between you, the grown-up who creates or joins a family, and Trailbuddies. By using Trailbuddies you accept them. If you don't accept them, please don't use the app.",
      ],
    },
    {
      h: "2. Who can use Trailbuddies",
      p: [
        "Accounts are for adults (18 or over, or the age of majority where you live). Children use Trailbuddies only through a learner profile that a parent or guardian created and supervises.",
        "You must be the parent or legal guardian of any child you add, or have their permission as a carer or teacher.",
      ],
    },
    {
      h: "3. Your account",
      p: [
        "Keep your email account secure: sign-in links are sent there. Tell us straight away if you think someone else has access.",
        "You are responsible for who you invite into your family and the role you give them.",
      ],
    },
    {
      h: "4. Plans and the beta",
      p: [
        "During the closed beta, Trailbuddies is free and some features may change, be removed or not work as expected. We will tell families before any paid plan starts, and nothing will be charged without your clear agreement.",
        "The Free plan allows 1 learner profile and 2 devices at once; the Family plan allows 6 learner profiles and 6 devices.",
      ],
    },
    {
      h: "5. What you add",
      p: [
        "You keep the rights in the photos, recordings and lessons you add. You give us permission to store and show them to the people in your family, only to run Trailbuddies.",
        "Only add photos and recordings you have the right to use. Don't add photos of other people's children without their parents' permission, or anything harmful, hateful or illegal.",
      ],
    },
    {
      h: "6. Our content",
      p: [
        "The lessons, buddies, art, sounds and software belong to Trailbuddies or our licensors. You may use them for your family's or class's learning, but not copy, sell or redistribute them.",
      ],
    },
    {
      h: "7. Acceptable use",
      p: [
        "Don't try to break, overload or get around the app's security, access other families' data, or use Trailbuddies to collect information about children.",
      ],
    },
    {
      h: "8. Availability and changes",
      p: [
        "We work hard to keep Trailbuddies available and your data safe, but we can't promise it will always be available or free of errors. We may change features; we will give notice of important changes.",
      ],
    },
    {
      h: "9. Ending",
      p: [
        "You can delete your family at any time in Settings. We may suspend an account that breaks these terms, and will tell you why unless the law prevents it.",
      ],
    },
    {
      h: "10. Liability",
      p: [
        "Trailbuddies supports children's learning but is not a replacement for a teacher, a doctor or a parent's judgement. To the extent the law allows, we are not liable for indirect losses. Nothing in these terms limits rights you have under consumer law where you live.",
      ],
    },
    {
      h: "11. The law",
      p: [
        "These terms are governed by the laws of Kenya [to be confirmed by our lawyer for each launch country], without taking away the protection of the consumer laws of the country where you live.",
        "Questions: hello@trailbuddies.africa.",
      ],
    },
  ],
};
