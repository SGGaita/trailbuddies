"use client";
import { useEffect } from "react";
import { useFamily } from "@/lib/store";
import BadgeCelebration from "./BadgeCelebration";

/** Awards from a grown-up (BST-05) and badges caught up when a badge was made: not from play here. */
const fromAGrownUp = (e) => e.type === "badge_awarded" && e.data?.custom && (e.data.manual || e.data.catchUp);

/**
 * BST-05: a badge a grown-up awarded from their phone (or a teacher in class) is celebrated the
 * next time the child opens the app on this device. Each award is celebrated once per device,
 * counting from when this device first loaded the family (store.celebrateFrom).
 * @param {{ learner: any }} props learnerView
 */
export default function AwardCelebrations({ learner }) {
  const seen = useFamily((s) => s.celebrated[learner.id]);
  const from = useFamily((s) => s.celebrateFrom);
  const events = useFamily((s) => s.events);
  const voice = useFamily((s) => s.settings.voice);
  const hidden = new Set(learner.hiddenBadges || []);
  const pending = events.filter(
    (e) => e.learnerId === learner.id && fromAGrownUp(e) && Date.parse(e.at) >= from && !(seen || []).includes(e.id),
  );
  // A badge a grown-up has since hidden isn't celebrated; it just counts as seen.
  const quiet = pending.filter((e) => hidden.has(e.data.badgeId)).map((e) => e.id);
  useEffect(() => {
    if (quiet.length) useFamily.getState().markCelebrated(learner.id, quiet);
  }, [learner.id, quiet]);
  const badges = pending
    .filter((e) => !hidden.has(e.data.badgeId))
    .map((e) => ({
      id: e.data.badgeId,
      name: e.data.custom.name || e.data.name,
      custom: e.data.custom,
      payout:
        events.find((x) => x.learnerId === learner.id && x.type === "treasure_earned" && x.data?.badgeId === e.data.badgeId)
          ?.data.amount || 0,
    }));
  if (!badges.length) return null;
  const done = () => useFamily.getState().markCelebrated(learner.id, pending.map((e) => e.id));
  return <BadgeCelebration badges={badges} learner={learner} voice={voice} onDone={done} />;
}
