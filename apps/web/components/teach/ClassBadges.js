"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  BADGE_COLOURS,
  BADGE_ICONS,
  BADGE_SHAPES,
  BADGE_TREASURE_MAX,
  COUNT_METRICS,
  ICON_EMOJI,
  badgeProblems,
  ruleSummary,
  wallNames,
} from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { ulid } from "@trailbuddies/sync";
import { colors } from "@trailbuddies/tokens";
import TeachShell from "@/components/shell/TeachShell";
import Loading from "@/components/Loading";
import CustomBadgeArt from "@/components/rewards/CustomBadgeArt";
import { ChoiceChip } from "@/components/builder/parts";
import { api } from "@/lib/account";
import ImportByCode from "@/components/share/ImportByCode";
import ShareDialog from "@/components/share/ShareDialog";
import { ShareList } from "@/components/share/ShareCodes";

const RULES = ["manual", "assignment", "count", "streak"];
const blank = () => ({
  name: "",
  shape: "circle",
  colour: "blue",
  icon: "star",
  rule: { type: "manual" },
  treasures: 10,
  audience: "class",
});
const ruleFor = (type) =>
  ({
    manual: { type: "manual" },
    assignment: { type: "assignment" },
    count: { type: "count", metric: "stars", n: 20 },
    streak: { type: "streak", days: 3 },
  })[type];

/**
 * T05 Class badges (BST-01…06 for teachers): make a badge for the class, decide how it's earned
 * in class (by the teacher, everything assigned this week, a number of stars, daily-goal days),
 * then award it to children, a group or the whole class. Awards are saved in the class's history
 * and the children see the celebration on the class device.
 */
export default function ClassBadges() {
  const id = useSearchParams().get("id");
  return <ClassBadgesFor key={id} id={id} />;
}

function ClassBadgesFor({ id }) {
  const [cls, setCls] = useState(/** @type {any} */ (null));
  const [badges, setBadges] = useState(/** @type {any[]} */ ([]));
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(blank);
  const [picked, setPicked] = useState(/** @type {string | null} */ (null));
  const [to, setTo] = useState(/** @type {string[]} */ ([]));
  const [result, setResult] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!id) return undefined;
    let live = true;
    Promise.all([api.getClass(id), api.classBadges(id)]).then(
      ([c, b]) => {
        if (!live) return;
        setCls(c);
        setBadges(b.badges);
      },
      () => live && setError(t("classBadges.loadError")),
    );
    return () => {
      live = false;
    };
  }, [id, reload]);

  if (error) return <TeachShell title={t("classBadges.title")} active="/teach/badges"><Alert severity="warning">{error}</Alert></TeachShell>;
  if (!cls) return <Loading />;
  const roster = cls.roster || [];
  const names = wallNames(roster);
  const groups = cls.groups || [];
  const problems = badgeProblems(
    { ...draft, name: draft.name.trim() },
    { kind: "class", learners: roster.map((s) => s.id) },
  );
  const badge = badges.find((b) => b.id === picked);

  const save = async (e) => {
    e.preventDefault();
    if (problems.length) return setResult(t(`classBadges.problem.${problems[0]}`, { max: BADGE_TREASURE_MAX }));
    try {
      const { name, shape, colour, icon, rule, treasures, audience } = draft;
      const saved = await api.putClassBadge(cls.id, draft.id || ulid(), {
        name: name.trim(),
        shape,
        colour,
        icon,
        rule,
        treasures,
        audience,
        updated_at: new Date().toISOString(),
      });
      setDraft(blank());
      setPicked(saved.id);
      setTo([]);
      setResult(t("classBadges.saved", { name: saved.name }));
      setReload((n) => n + 1);
    } catch (err) {
      setResult(err.message);
    }
  };
  const award = async () => {
    if (!badge || !to.length) return;
    try {
      const r = await api.awardClassBadge(cls.id, badge.id, to);
      const already = r.skipped.filter((x) => x.reason === "already earned").map((x) => names.get(x.id));
      const waiting = r.skipped.filter((x) => x.reason === "school_consent").map((x) => names.get(x.id));
      setResult(
        [
          r.awarded.length ? t("classBadges.awarded", { n: r.awarded.length, badge: badge.name }) : "",
          already.length ? t("classBadges.already", { who: already.join(", ") }) : "",
          waiting.length ? t("classBadges.waiting", { who: waiting.join(", ") }) : "",
        ]
          .filter(Boolean)
          .join(" "),
      );
      setTo([]);
    } catch (err) {
      setResult(err.message);
    }
  };
  const canGet = (b, sid) => b.audience === "class" || b.audience.includes(sid);

  return (
    <TeachShell title={t("classBadges.title")} sub={cls.name} active="/teach/badges">
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button component={Link} href="/teach/badges">
          {t("classBadges.back")}
        </Button>
        <Button component={Link} href={`/teach/badge-wall?id=${encodeURIComponent(cls.id)}`} variant="outlined">
          {t("teach.badgeWall")}
        </Button>
      </Box>
      {result && (
        <Alert severity="info" role="status" onClose={() => setResult("")}>
          {result}
        </Alert>
      )}
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1.2fr)" }, alignItems: "start" }}>
        <Card component="form" onSubmit={save} aria-label={t("classBadges.make")} sx={{ p: { xs: 2, sm: 2.5 }, display: "grid", gap: 1.5 }}>
          <Typography variant="h6" component="h2">
            {draft.id ? t("classBadges.edit") : t("classBadges.make")}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CustomBadgeArt badge={draft} size={112} />
            <TextField
              label={t("badgeStudio.name")}
              placeholder={t("classBadges.nameHint")}
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              slotProps={{ htmlInput: { maxLength: 40 } }}
              sx={{ flex: 1 }}
            />
          </Box>
          <Chips label={t("badgeStudio.colour")} items={BADGE_COLOURS} value={draft.colour} onPick={(colour) => setDraft({ ...draft, colour })} text={(c) => t(`badgeStudio.${c}`)} />
          <Chips label={t("badgeStudio.icon")} items={BADGE_ICONS} value={draft.icon} onPick={(icon) => setDraft({ ...draft, icon })} text={(i) => `${ICON_EMOJI[i]} ${t(`badgeStudio.${i}`)}`} />
          <Chips label={t("badgeStudio.shape")} items={BADGE_SHAPES} value={draft.shape} onPick={(shape) => setDraft({ ...draft, shape })} text={(s) => t(`badgeStudio.${s}`)} />
          <Chips
            label={t("badgeStudio.howEarned")}
            items={RULES}
            value={draft.rule.type}
            onPick={(type) => setDraft({ ...draft, rule: ruleFor(type) })}
            text={(r) => t(`classBadges.rule.${r}`)}
          />
          {draft.rule.type === "count" && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <TextField
                type="number"
                label={t("badgeStudio.howMany")}
                value={draft.rule.n}
                onChange={(e) => setDraft({ ...draft, rule: { ...draft.rule, n: Math.round(Number(e.target.value) || 0) } })}
                sx={{ width: 140 }}
              />
              <TextField
                select
                label={t("badgeStudio.ofWhat")}
                value={draft.rule.metric}
                onChange={(e) => setDraft({ ...draft, rule: { ...draft.rule, metric: e.target.value } })}
                sx={{ minWidth: 220 }}
              >
                {COUNT_METRICS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {t(`badgeStudio.metric.${m}`)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
          {draft.rule.type === "streak" && (
            <TextField
              select
              label={t("badgeStudio.days")}
              value={draft.rule.days}
              onChange={(e) => setDraft({ ...draft, rule: { ...draft.rule, days: Number(e.target.value) } })}
              sx={{ width: 220 }}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <MenuItem key={n} value={n}>
                  {t("badgeStudio.daysN", { n })}
                </MenuItem>
              ))}
            </TextField>
          )}
          <Alert severity="info" icon={false} role="status" sx={{ fontWeight: 700 }}>
            {ruleSummary(draft.rule, { by: t("classBadges.you") })}
          </Alert>
          <TextField
            type="number"
            label={t("badgeStudio.treasures")}
            value={draft.treasures}
            onChange={(e) => setDraft({ ...draft, treasures: Math.round(Number(e.target.value) || 0) })}
            error={draft.treasures > BADGE_TREASURE_MAX}
            helperText={
              draft.treasures > BADGE_TREASURE_MAX
                ? t("badgeStudio.treasureCap", { max: BADGE_TREASURE_MAX })
                : t("badgeStudio.treasureHelp", { max: BADGE_TREASURE_MAX })
            }
            sx={{ maxWidth: 260 }}
          />
          <Box role="group" aria-label={t("badgeStudio.who")} sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <ChoiceChip on={draft.audience === "class"} onClick={() => setDraft({ ...draft, audience: "class" })}>
              {t("classBadges.wholeClass")}
            </ChoiceChip>
            {roster.map((s) => {
              const on = Array.isArray(draft.audience) && draft.audience.includes(s.id);
              const list = Array.isArray(draft.audience) ? draft.audience : [];
              return (
                <ChoiceChip
                  key={s.id}
                  on={on}
                  onClick={() => setDraft({ ...draft, audience: on ? list.filter((x) => x !== s.id) : [...list, s.id] })}
                >
                  {names.get(s.id)}
                </ChoiceChip>
              );
            })}
          </Box>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            {draft.id && (
              <Button onClick={() => setDraft(blank())}>{t("common.cancel")}</Button>
            )}
            <Button type="submit" variant="contained">
              {t("badgeStudio.saveBadge")}
            </Button>
          </Box>
        </Card>

        <Box sx={{ display: "grid", gap: 1.5 }}>
          <Card component="section" aria-label={t("classBadges.list")} sx={{ p: { xs: 2, sm: 2.5 }, display: "grid", gap: 1.25 }}>
            <Typography variant="h6" component="h2">
              {t("classBadges.list")}
            </Typography>
            {badges.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("classBadges.none")}</Typography>}
            {badges.map((b) => (
              <Box
                key={b.id}
                data-class-badge={b.name}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: 4.5,
                  border: `2px solid ${picked === b.id ? colors.leaf.main : colors.line}`,
                  flexWrap: "wrap",
                }}
              >
                <CustomBadgeArt badge={b} size={52} />
                <Box sx={{ flex: 1, minWidth: 160 }}>
                  <Typography sx={{ fontWeight: 800 }}>{b.name}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                    {ruleSummary(b.rule, { by: t("classBadges.you") })}
                    {b.treasures ? ` · ${t("rewards.plusTreasures", { n: b.treasures })}` : ""}
                  </Typography>
                </Box>
                <Button
                  variant={picked === b.id ? "contained" : "outlined"}
                  onClick={() => {
                    setPicked(b.id);
                    setTo([]);
                  }}
                  aria-label={t("classBadges.awardThis", { badge: b.name })}
                >
                  {t("rewards.award")}
                </Button>
                <Button onClick={() => setDraft({ ...blank(), ...b })} aria-label={t("rewards.editBadge", { badge: b.name })}>
                  {t("rewards.edit")}
                </Button>
              </Box>
            ))}
          </Card>
          {badge && (
            <Card component="section" aria-label={t("classBadges.awardThis", { badge: badge.name })} sx={{ p: { xs: 2, sm: 2.5 }, display: "grid", gap: 1.25 }}>
              <Typography variant="h6" component="h2">
                {t("classBadges.awardThis", { badge: badge.name })}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button variant="outlined" onClick={() => setTo(roster.filter((s) => canGet(badge, s.id)).map((s) => s.id))}>
                  {t("classBadges.wholeClass")}
                </Button>
                {groups.map((g) => (
                  <Button key={g.id} variant="outlined" onClick={() => setTo((g.student_ids || []).filter((sid) => canGet(badge, sid)))}>
                    {g.name}
                  </Button>
                ))}
              </Box>
              <Box role="group" aria-label={t("classBadges.awardTo")} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {roster
                  .filter((s) => canGet(badge, s.id))
                  .map((s) => (
                    <ChoiceChip
                      key={s.id}
                      on={to.includes(s.id)}
                      onClick={() => setTo(to.includes(s.id) ? to.filter((x) => x !== s.id) : [...to, s.id])}
                    >
                      {names.get(s.id)}
                    </ChoiceChip>
                  ))}
              </Box>
              <Button variant="contained" disabled={!to.length} onClick={award} sx={{ justifySelf: "start", bgcolor: colors.sun.main, color: colors.ink, "&:hover": { bgcolor: colors.sun.deep } }}>
                {t("classBadges.awardN", { n: to.length })}
              </Button>
            </Card>
          )}
        </Box>
      </Box>
      <ClassSharing cls={cls} badges={badges} onImported={() => setReload((n) => n + 1)} />
    </TeachShell>
  );
}

function Chips({ label, items, value, onPick, text }) {
  return (
    <Box component="fieldset" sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Typography component="legend" sx={{ fontWeight: 800, mb: 0.75 }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {items.map((it) => (
          <ChoiceChip key={it} on={value === it} onClick={() => onPick(it)}>
            {text(it)}
          </ChoiceChip>
        ))}
      </Box>
    </Box>
  );
}

/** SHR-01 and SHR-02 for teachers: share this class's badges with colleagues, or import a set. */
function ClassSharing({ cls, badges, onImported }) {
  const [shares, setShares] = useState(/** @type {any[]} */ ([]));
  const [open, setOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const [done, setDone] = useState("");
  useEffect(() => {
    let live = true;
    api.shares({ classId: cls.id }).then(
      (r) => live && setShares(r.shares),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [cls.id, reload]);
  return (
    <Card sx={{ p: { xs: 2, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 1.5 }} aria-label={t("classBadges.sharing")}>
      <Typography variant="h6" component="h2">
        {t("classBadges.sharing")}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>{t("classBadges.sharingSub")}</Typography>
      <Button variant="outlined" disabled={!badges.length} onClick={() => setOpen(true)} sx={{ alignSelf: "flex-start" }}>
        {t("classBadges.share")}
      </Button>
      <ShareList
        shares={shares}
        canStop
        onStop={async (s) => {
          await api.revokeShare({ classId: cls.id }, s.id);
          setReload((n) => n + 1);
        }}
      />
      <Typography sx={{ fontWeight: 800 }}>{t("classBadges.importTitle")}</Typography>
      <ImportByCode
        target={{ classId: cls.id }}
        onImported={(r) => {
          setDone(t("classBadges.imported", { n: r.badges.length }));
          onImported();
        }}
      />
      {done && <Alert severity="success">{done}</Alert>}
      <ShareDialog
        open={open}
        onClose={() => setOpen(false)}
        onShared={() => setReload((n) => n + 1)}
        owner={{ classId: cls.id }}
        badges={badges}
      />
    </Card>
  );
}
