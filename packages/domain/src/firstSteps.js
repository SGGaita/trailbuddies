// ONB-12: the "first steps" card for grown-ups after a child's first lesson.

/**
 * @param {{ lessons: number, stars: number }[]} learners each learner's totals
 * @param {{ dismissed?: boolean }} tips
 * @param {Record<string, boolean>} flags feature flags (badge-studio)
 */
export function firstStepsCard(learners, tips, flags = {}) {
  const lessons = learners.reduce((n, l) => n + (l.lessons || 0), 0);
  if (!lessons || tips?.dismissed) return null;
  return {
    lessons,
    stars: learners.reduce((n, l) => n + (l.stars || 0), 0),
    links: [
      { id: "lesson", href: "/family/create", ready: true },
      { id: "badge", href: "/family/rewards", ready: Boolean(flags["badge-studio"]) },
      { id: "class", href: "/family/classes", ready: true }, // CLS-04, Sprint 9
      { id: "help", href: "/family/help", ready: true },
    ],
  };
}
