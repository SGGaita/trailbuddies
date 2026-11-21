"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { createEvent } from "@trailbuddies/sync";
import {
  WISH_PRICES,
  WISH_PRICE_MAX,
  WISH_TITLE_MAX,
  canEarn,
  earnedCustom,
  grownUpQueue,
  manualAward,
  ruleSummary,
  waitingCount,
  wishProblems,
} from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";
import CustomBadgeArt from "@/components/rewards/CustomBadgeArt";
import { ChoiceChip, Pill } from "@/components/builder/parts";
import { canEdit } from "@/lib/account";
import { useFamily, useHydrated, useLearners } from "@/lib/store";

const TABS = ["requests", "lists", "award"];
const WISH_EMOJI = ["🎁", "📖", "🌳", "🍦", "🎬", "🎨", "⚽", "🧁"];
const card = { p: { xs: 1.75, sm: 2.25 }, display: "flex", flexDirection: "column", gap: 1.25 };
const row = { display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" };

/**
 * P16 Wishes & awards (BST-04, BST-05, BST-07, BDG-07): answer wishes, hand over real-world
 * rewards, keep each child's wish list, award hand-given badges and hide earned ones.
 */
export default function Rewards() {
  const ready = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const family = useFamily((s) => s.family);
  const wishes = useFamily((s) => s.wishes);
  const editable = useFamily(canEdit);
  const views = useLearners();
  const tab = TABS.includes(params.get("tab")) ? params.get("tab") : "requests";
  const [pick, setPick] = useState(/** @type {string | null} */ (null));
  const [note, setNote] = useState("");
  if (!ready) return <Loading />;
  const queue = grownUpQueue(
    wishes,
    views.map((l) => ({ id: l.id, name: l.name, state: l })),
  );
  const waiting = waitingCount(queue);
  const child = views.find((l) => l.id === pick) || views[0];
  const record = (events, message) => {
    useFamily.getState().record(events);
    setNote(message);
  };
  const go = (next) => {
    setNote("");
    router.replace(`/family/rewards?tab=${next}`, { scroll: false });
  };
  const saved = params.get("saved");
  const already = params.get("already");

  return (
    <FamilyShell title={t("rewards.title")} sub={t("rewards.sub")} family={family} active="/family/rewards">
      {saved && (
        <Alert severity="success" role="status">
          {already ? t("rewards.savedAlready", { name: saved, who: already }) : t("rewards.saved", { name: saved })}
        </Alert>
      )}
      {note && (
        <Alert severity="success" role="status" onClose={() => setNote("")}>
          {note}
        </Alert>
      )}
      <Box role="tablist" aria-label={t("rewards.title")} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        {TABS.map((k) => (
          <Button
            key={k}
            role="tab"
            aria-selected={tab === k}
            variant={tab === k ? "contained" : "outlined"}
            onClick={() => go(k)}
            sx={{ borderWidth: 2, "&:hover": { borderWidth: 2 } }}
          >
            {k === "requests" && waiting ? t("rewards.tab.requestsN", { n: waiting }) : t(`rewards.tab.${k}`)}
          </Button>
        ))}
      </Box>

      {tab === "requests" && <Requests queue={queue} editable={editable} record={record} />}
      {tab !== "requests" && views.length > 0 && (
        <Box role="group" aria-label={t("rewards.whichChild")} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {views.map((l) => (
            <ChoiceChip key={l.id} on={child?.id === l.id} onClick={() => setPick(l.id)}>
              {l.name}
            </ChoiceChip>
          ))}
        </Box>
      )}
      {tab === "lists" && child && <WishList child={child} wishes={wishes} editable={editable} onDone={setNote} />}
      {tab === "award" && child && <Award child={child} views={views} editable={editable} record={record} />}
    </FamilyShell>
  );
}

function Requests({ queue, editable, record }) {
  if (!queue.requests.length && !queue.approved.length && !queue.toDeliver.length)
    return (
      <Card sx={card}>
        <Typography sx={{ fontWeight: 800 }}>{t("rewards.none")}</Typography>
        <Typography sx={{ color: "text.secondary" }}>{t("rewards.noneSub")}</Typography>
      </Card>
    );
  const answer = (item, type, message) =>
    record([createEvent(type, item.learnerId, { wishId: item.wish.id, requestId: item.requestId })], message);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {queue.requests.map((r) => (
        <Card key={r.wish.id} sx={{ ...card, borderColor: colors.sun.deep, bgcolor: colors.sun.soft }} data-request={r.wish.title}>
          <Box sx={row}>
            <Box aria-hidden="true" sx={{ fontSize: 32 }}>
              {r.wish.emoji || "🎁"}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{t("rewards.asked", { name: r.name, title: r.wish.title })}</Typography>
              <Typography sx={{ color: "text.secondary" }}>{t("rewards.held", { n: r.held })}</Typography>
            </Box>
          </Box>
          <Box sx={row}>
            <Button
              variant="contained"
              disabled={!editable}
              onClick={() => answer(r, "wish_approved", t("rewards.approvedNote", { name: r.name }))}
            >
              {t("rewards.approve")}
            </Button>
            <Button
              variant="outlined"
              disabled={!editable}
              sx={{ borderWidth: 2 }}
              onClick={() => answer(r, "wish_declined", t("rewards.declinedNote", { name: r.name }))}
            >
              {t("rewards.notNow")}
            </Button>
          </Box>
        </Card>
      ))}
      {queue.approved.map((r) => (
        <Card key={r.wish.id} sx={card}>
          <Box sx={row}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{r.wish.title}</Typography>
              <Typography sx={{ color: "text.secondary" }}>{t("rewards.approvedFor", { name: r.name })}</Typography>
            </Box>
            <Button
              variant="contained"
              disabled={!editable}
              onClick={() => answer(r, "wish_delivered", t("rewards.deliveredNote", { name: r.name }))}
              aria-label={t("rewards.deliveredFor", { title: r.wish.title, name: r.name })}
            >
              {t("rewards.delivered")}
            </Button>
          </Box>
        </Card>
      ))}
      {queue.toDeliver.map((r) => (
        <Card key={`${r.learnerId}-${r.badgeId}`} sx={card}>
          <Box sx={row}>
            <Box aria-hidden="true" sx={{ fontSize: 32 }}>
              🏅
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{r.reward}</Typography>
              <Typography sx={{ color: "text.secondary" }}>{t("rewards.earnedWith", { name: r.name, badge: r.badge })}</Typography>
            </Box>
            <Button
              variant="contained"
              disabled={!editable}
              aria-label={t("rewards.deliveredFor", { title: r.reward, name: r.name })}
              onClick={() =>
                record(
                  [createEvent("reward_delivered", r.learnerId, { badgeId: r.badgeId })],
                  t("rewards.deliveredNote", { name: r.name }),
                )
              }
            >
              {t("rewards.delivered")}
            </Button>
          </Box>
        </Card>
      ))}
    </Box>
  );
}

function WishList({ child, wishes, editable, onDone }) {
  const [form, setForm] = useState({ title: "", price: 100, emoji: "🎁" });
  const [problem, setProblem] = useState("");
  const learners = useFamily((s) => s.learners);
  const mine = wishes.filter((w) => w.learner_id === child.id);
  const add = (e) => {
    e.preventDefault();
    const w = { learner_id: child.id, title: form.title.trim(), price: Math.round(Number(form.price)), emoji: form.emoji };
    const problems = wishProblems(w, learners.map((l) => l.id));
    if (problems.length) return setProblem(problems[0]);
    useFamily.getState().saveWish(w);
    setForm({ title: "", price: 100, emoji: "🎁" });
    setProblem("");
    onDone(t("rewards.wishAdded", { title: w.title, name: child.name }));
  };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      {mine.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("rewards.noWishes", { name: child.name })}</Typography>}
      {mine.map((w) => {
        const status = child.wishes?.[w.id]?.status || "open";
        return (
          <Card key={w.id} sx={{ ...card, flexDirection: "row", alignItems: "center" }} data-wish={w.title}>
            <Box aria-hidden="true" sx={{ fontSize: 30 }}>
              {w.emoji || "🎁"}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{w.title}</Typography>
              <Typography sx={{ color: "text.secondary" }}>
                {t("rewards.priceStatus", { n: w.price, status: t(`rewards.status.${status}`) })}
              </Typography>
            </Box>
            {(status === "open" || status === "delivered") && (
              <Button
                color="error"
                disabled={!editable}
                onClick={() => useFamily.getState().deleteWish(w.id)}
                aria-label={t("rewards.removeWish", { title: w.title })}
              >
                {t("rewards.remove")}
              </Button>
            )}
          </Card>
        );
      })}
      <Card component="form" onSubmit={add} sx={card} aria-label={t("rewards.addFor", { name: child.name })}>
        <Typography sx={{ fontWeight: 800 }}>{t("rewards.addFor", { name: child.name })}</Typography>
        <TextField
          label={t("rewards.wishTitle")}
          placeholder={t("rewards.wishHint")}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          slotProps={{ htmlInput: { maxLength: WISH_TITLE_MAX } }}
          disabled={!editable}
        />
        <Box role="group" aria-label={t("rewards.picture")} sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {WISH_EMOJI.map((e) => (
            <ChoiceChip key={e} on={form.emoji === e} onClick={() => setForm({ ...form, emoji: e })} aria-label={e}>
              {e}
            </ChoiceChip>
          ))}
        </Box>
        <Box sx={{ ...row, alignItems: "flex-start" }}>
          <Box role="group" aria-label={t("rewards.price")} sx={{ display: "flex", gap: 0.75, pt: 1, flexWrap: "wrap" }}>
            {WISH_PRICES.map((n) => (
              <ChoiceChip key={n} on={Number(form.price) === n} onClick={() => setForm({ ...form, price: n })}>
                {n}
              </ChoiceChip>
            ))}
          </Box>
          <TextField
            type="number"
            label={t("rewards.price")}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            slotProps={{ htmlInput: { min: 1, max: WISH_PRICE_MAX, inputMode: "numeric" } }}
            sx={{ width: 160 }}
            disabled={!editable}
          />
        </Box>
        {problem && <Alert severity="warning">{t(`rewards.problem.${problem}`, { max: WISH_PRICE_MAX })}</Alert>}
        <Button type="submit" variant="contained" disabled={!editable} sx={{ alignSelf: "flex-start" }}>
          {t("rewards.addWish")}
        </Button>
      </Card>
    </Box>
  );
}

function Award({ child, views, editable, record }) {
  const badges = useFamily((s) => s.customBadges);
  const lessons = useFamily((s) => s.lessons);
  const manual = badges.filter((b) => b.rule?.type === "manual" && canEarn(b, child.id));
  const names = Object.fromEntries(views.map((l) => [l.id, l.name]));
  const award = (b) => {
    const a = manualAward(b, child.id, child.badges);
    if (!a) return;
    const events = [createEvent("badge_awarded", child.id, a.badge)];
    if (a.treasures) events.push(createEvent("treasure_earned", child.id, { amount: a.treasures, reason: "badge", badgeId: b.id }));
    record(events, t("rewards.awardedNote", { name: child.name, badge: b.name }));
  };
  const earned = earnedCustom({ customAwards: child.customAwards });
  const hidden = new Set(child.hiddenBadges || []);
  const allEarned = Object.entries(child.customAwards || {}).map(([id, a]) => ({ id, ...a }));
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box component="section" aria-label={t("rewards.awardFor", { name: child.name })} sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Typography variant="h6" component="h2">
          {t("rewards.awardFor", { name: child.name })}
        </Typography>
        {manual.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("rewards.noManual")}</Typography>}
        {manual.map((b) => {
          const has = child.badges.includes(b.id);
          return (
            <Card key={b.id} sx={{ ...card, flexDirection: "row", alignItems: "center" }} data-award={b.name}>
              <CustomBadgeArt badge={b} size={56} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800 }}>{b.name}</Typography>
                <Typography sx={{ color: "text.secondary" }}>
                  {[b.treasures ? t("rewards.plusTreasures", { n: b.treasures }) : null, b.reward].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              {has ? (
                <Pill>{t("rewards.awarded")}</Pill>
              ) : (
                <Button variant="contained" disabled={!editable} onClick={() => award(b)} aria-label={t("rewards.awardTo", { badge: b.name, name: child.name })}>
                  {t("rewards.award")}
                </Button>
              )}
            </Card>
          );
        })}
      </Box>

      {allEarned.length > 0 && (
        <Box component="section" aria-label={t("rewards.earnedBy", { name: child.name })} sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography variant="h6" component="h2">
            {t("rewards.earnedBy", { name: child.name })}
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>{t("rewards.hideSub")}</Typography>
          {allEarned.map((b) => {
            const isHidden = hidden.has(b.id);
            return (
              <Card key={b.id} sx={{ ...card, flexDirection: "row", alignItems: "center", opacity: isHidden ? 0.6 : 1 }}>
                <CustomBadgeArt badge={b} size={48} />
                <Typography sx={{ flex: 1, fontWeight: 800 }}>{b.name}</Typography>
                <Button
                  variant="outlined"
                  disabled={!editable}
                  sx={{ borderWidth: 2 }}
                  onClick={() =>
                    record(
                      [createEvent("badge_hidden", child.id, { badgeId: b.id, hidden: !isHidden })],
                      t(isHidden ? "rewards.shownNote" : "rewards.hiddenNote", { badge: b.name }),
                    )
                  }
                  aria-label={t(isHidden ? "rewards.showBadge" : "rewards.hideBadge", { badge: b.name })}
                >
                  {t(isHidden ? "rewards.show" : "rewards.hide")}
                </Button>
              </Card>
            );
          })}
          {earned.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("rewards.allHidden")}</Typography>}
        </Box>
      )}

      <Box component="section" aria-label={t("rewards.yourBadges")} sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box sx={row}>
          <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
            {t("rewards.yourBadges")}
          </Typography>
          <Button component={Link} href="/family/create/badge" variant="contained" disabled={!editable}>
            {t("rewards.makeBadge")}
          </Button>
        </Box>
        {badges.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("rewards.noBadges")}</Typography>}
        {badges.map((b) => (
          <Card key={b.id} sx={{ ...card, flexDirection: "row", alignItems: "center" }} data-badge-row={b.name}>
            <CustomBadgeArt badge={b} size={56} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800 }}>{b.name}</Typography>
              <Typography sx={{ color: "text.secondary" }}>{ruleSummary(b.rule, { lessons })}</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                {t("rewards.forWho", { who: (Array.isArray(b.audience) ? b.audience : []).map((id) => names[id]).filter(Boolean).join(", ") })}
              </Typography>
            </Box>
            <Button component={Link} href={`/family/create/badge?id=${b.id}`} disabled={!editable} aria-label={t("rewards.editBadge", { badge: b.name })}>
              {t("rewards.edit")}
            </Button>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
