import { createEvent } from "@trailbuddies/sync";
import { builtInBadges, economy } from "@trailbuddies/content";
import { newBadges, badgePayout, capped } from "@trailbuddies/domain";
import { learnerView } from "./learner";

/** The family's daily cap: 100 by default (economy.json), or none when a grown-up turns it off. */
export const capFor = (settings) => (settings?.treasure_cap === false ? 0 : economy.dailyCap);

/**
 * Pay treasures under the daily cap (RWD-03). Returns the amount actually paid.
 * @param {any} learner learnerView
 * @param {number} amount
 * @param {any} settings family settings
 */
export const payable = (learner, amount, settings) => capped(amount, learner.earnedToday, capFor(settings));

/**
 * After a lesson or game: badges newly earned once these events count (BDG-01), with
 * their payouts. Pure; evaluated on the device so badges arrive offline.
 * @param {any} profile learner profile (store)
 * @param {any[]} allEvents the family log before this activity
 * @param {any[]} added the events this activity is about to record
 * @param {{ goal: number, now?: Date }} opts
 * @returns {{ badges: any[], events: any[] }}
 */
export function badgeEvents(profile, allEvents, added, { goal, now = new Date() }) {
  const view = learnerView(profile, [...allEvents, ...added], now, { goal });
  const earned = newBadges(builtInBadges, { ...view, now });
  const events = earned.flatMap((b) => [
    createEvent("badge_awarded", profile.id, { badgeId: b.id, tier: b.tier }, now),
    createEvent(
      "treasure_earned",
      profile.id,
      { amount: badgePayout(b, economy.badge), reason: "badge", badgeId: b.id },
      now,
    ),
  ]);
  return { badges: earned.map((b) => ({ ...b, payout: badgePayout(b, economy.badge) })), events };
}

/**
 * A finished game (GAM-01, GAM-03): the game event, treasures under the cap (plus a bonus
 * the first time this game is finished with this topic) and any new badges.
 * @param {any} view learnerView
 * @param {any} profile learner profile (store)
 * @param {any[]} allEvents
 * @param {{ game: string, unitId: string, settings: any, goal: number, now?: Date }} opts
 */
export function gameEvents(view, profile, allEvents, { game, unitId, settings, goal, now = new Date() }) {
  const first = !view.games.some((g) => g.game === game && g.unitId === unitId);
  const amount = payable(view, economy.earn.game + (first ? economy.earn.gameNewTopic : 0), settings);
  const events = [createEvent("game_finished", profile.id, { game, unitId }, now)];
  if (amount) events.push(createEvent("treasure_earned", profile.id, { amount, reason: "game", game, unitId }, now));
  const won = badgeEvents(profile, allEvents, events, { goal, now });
  return { events: [...events, ...won.events], treasures: amount, badges: won.badges };
}
