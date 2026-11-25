"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { validate } from "@trailbuddies/content-schema";
import { BADGE_METRICS, BADGE_RULES, can, newId, ruleText } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { Field, Pill, inputSx } from "@/components/builder/parts";
import { api } from "@/lib/account";
import { uploadContentPicture } from "@/lib/contentUpload";
import DraftBanner from "./DraftBanner";
import StaffDialog, { DialogSection } from "./StaffDialog";
import { StaffHead, useStaff } from "./StaffShell";

const CATEGORIES = ["learning", "mastery", "effort", "consistency", "exploration"];
const TIERS = ["bronze", "silver", "gold"];

/** A badge's picture: its uploaded art (staff see it before approval) or its emoji. */
function BadgeArt({ b, size = 44 }) {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flex: "none",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.55,
        bgcolor: colors.sun.soft,
        border: `3px solid ${colors.sun.main}`,
        backgroundImage: b.art ? `url("${api.contentAssetUrl(b.art)}")` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!b.art && (b.icon || "🏅")}
    </Box>
  );
}

const defaultRule = (type, units) =>
  type === "complete"
    ? { type, units: units.slice(0, 1).map((u) => u.id) }
    : type === "count"
      ? { type, metric: "lessons", n: 5 }
      : type === "streak"
        ? { type, days: 5 }
        : { type, items: ["item"] };

/** The rule, built from the existing rule types (CMS-08): finish units, count, streak, mastery. */
function RuleFields({ rule, onRule, units }) {
  return (
    <>
      <Field label={t("cms.bd.ruleType")} id="bd-type">
        <TextField id="bd-type" select value={rule.type} onChange={(e) => onRule(defaultRule(e.target.value, units))} sx={inputSx}>
          {BADGE_RULES.map((r) => (
            <MenuItem key={r} value={r}>
              {t(`cms.bd.ruleType.${r}`)}
            </MenuItem>
          ))}
        </TextField>
      </Field>
      {rule.type === "complete" && (
        <Field label={t("cms.bd.units")} id="bd-units">
          <TextField
            id="bd-units"
            select
            value={rule.units}
            onChange={(e) => onRule({ ...rule, units: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value })}
            helperText={t("cms.bd.unitsHint")}
            slotProps={{ select: { multiple: true, renderValue: (v) => v.map((id) => units.find((u) => u.id === id)?.title || id).join(", ") } }}
            sx={inputSx}
          >
            {units.map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.title}
              </MenuItem>
            ))}
          </TextField>
        </Field>
      )}
      {rule.type === "count" && (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 140px" } }}>
          <Field label={t("cms.bd.metric")} id="bd-metric">
            <TextField id="bd-metric" select value={rule.metric} onChange={(e) => onRule({ ...rule, metric: e.target.value })} sx={inputSx}>
              {BADGE_METRICS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m.replace(/-/g, " ")}
                </MenuItem>
              ))}
            </TextField>
          </Field>
          <Field label={t("cms.bd.n")} id="bd-n">
            <TextField id="bd-n" type="number" value={rule.n} onChange={(e) => onRule({ ...rule, n: Math.max(1, Number(e.target.value) || 1) })} sx={inputSx} />
          </Field>
        </Box>
      )}
      {rule.type === "streak" && (
        <Field label={t("cms.bd.days")} id="bd-days">
          <TextField id="bd-days" type="number" value={rule.days} onChange={(e) => onRule({ ...rule, days: Math.min(365, Math.max(1, Number(e.target.value) || 1)) })} sx={{ ...inputSx, width: 110 }} />
        </Field>
      )}
      {rule.type === "mastery" && (
        <Field label={t("cms.bd.items")} id="bd-items">
          <TextField
            id="bd-items"
            value={rule.items.join(", ")}
            onChange={(e) => onRule({ ...rule, items: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })}
            sx={inputSx}
            placeholder="cow, goat, pig"
            helperText={t("cms.bd.itemsHint")}
          />
        </Field>
      )}
    </>
  );
}

/** How the badge looks to a child: art (or emoji), name, how to earn it, tier. */
function BadgePreview({ b }) {
  return (
    <Box
      data-testid="badge-preview"
      sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 0.75, p: 2, borderRadius: 4.5, bgcolor: colors.cream, border: `2px solid ${colors.line}`, minWidth: 0 }}
    >
      <BadgeArt b={b} size={84} />
      <Typography sx={{ fontWeight: 800, fontSize: 17, overflowWrap: "anywhere" }}>{b.name || t("cms.bd.previewName")}</Typography>
      <Typography sx={{ fontSize: 13, color: "text.secondary", overflowWrap: "anywhere" }}>{b.how || t("cms.bd.previewHow")}</Typography>
      <Pill tone={b.tier === "gold" ? "sun" : b.tier === "silver" ? "sky" : undefined}>{t(`cms.bd.tierName.${b.tier || "bronze"}`)}</Pill>
    </Box>
  );
}

/** Add or edit one badge. Upgrades (silver, gold) on existing badges are kept as they are. */
function BadgeDialog({ start, units, taken, onSave, onClose }) {
  const [b, setB] = useState(() => start || { id: "", name: "", how: "", category: "learning", tier: "bronze", icon: "🏅", rule: defaultRule("complete", units) });
  const [busy, setBusy] = useState("");
  const isNew = !start;
  const badge = isNew ? { ...b, id: newId(b.name || "badge", taken) } : b;
  const { errors } = validate("badge", badge);
  const missing = !b.name.trim() ? t("cms.bd.needName") : !b.how.trim() ? t("cms.bd.needHow") : errors.length ? t("cms.bd.needRule") : "";
  return (
    <StaffDialog
      title={isNew ? t("cms.bd.addTitle") : t("cms.bd.editTitle", { name: start.name })}
      sub={t("cms.bd.dialogSub")}
      onClose={onClose}
      onSubmit={(e) => (e.preventDefault(), !missing && onSave(badge))}
      actions={
        <>
          {missing && (
            <Typography sx={{ mr: "auto", fontSize: 13, color: "text.secondary" }} role="status">
              {missing}
            </Typography>
          )}
          <Button color="inherit" onClick={onClose}>
            {t("cms.cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={!!missing}>
            {t("cms.save")}
          </Button>
        </>
      }
    >
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "200px minmax(0, 1fr)" }, alignItems: "start" }}>
        <BadgePreview b={badge} />
        <DialogSection title={t("cms.bd.look")} hint={t("cms.bd.lookHint")}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
            <Button component="label" variant="outlined">
              {t(b.art ? "cms.bd.changeArt" : "cms.bd.uploadArt")}
              <input
                hidden
                type="file"
                accept="image/*"
                data-testid="badge-file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(t("cms.pic.checking"));
                  try {
                    const art = await uploadContentPicture(file, b.name || "Badge");
                    setB({ ...b, art });
                    setBusy(t("cms.pic.waitingLong"));
                  } catch (err) {
                    setBusy(err.message);
                  }
                }}
              />
            </Button>
            {b.art && (
              <Button color="inherit" onClick={() => (setB(({ art: _a, ...rest }) => rest), setBusy(""))}>
                {t("cms.bd.removeArt")}
              </Button>
            )}
          </Box>
          {busy && (
            <Typography sx={{ fontSize: 13, color: "text.secondary" }} role="status">
              {busy}
            </Typography>
          )}
          <Field label={t("cms.bd.icon")} id="bd-icon">
            <TextField
              id="bd-icon"
              value={b.icon || ""}
              onChange={(e) => setB({ ...b, icon: e.target.value.slice(0, 4) })}
              helperText={t("cms.bd.iconHint")}
              sx={{ ...inputSx, maxWidth: 220, "& input": { fontSize: 24 } }}
            />
          </Field>
        </DialogSection>
      </Box>

      <DialogSection title={t("cms.bd.details")}>
        <Field label={t("cms.bd.name")} id="bd-name">
          <TextField id="bd-name" value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} sx={inputSx} placeholder="Weather Watcher" slotProps={{ htmlInput: { maxLength: 40 } }} />
        </Field>
        <Field label={t("cms.bd.how")} id="bd-how">
          <TextField
            id="bd-how"
            value={b.how}
            onChange={(e) => setB({ ...b, how: e.target.value })}
            sx={inputSx}
            placeholder={t("cms.bd.howPh")}
            helperText={t("cms.bd.howHint")}
            slotProps={{ htmlInput: { maxLength: 80 } }}
          />
        </Field>
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
          <Field label={t("cms.bd.category")} id="bd-cat">
            <TextField id="bd-cat" select value={b.category || "learning"} onChange={(e) => setB({ ...b, category: e.target.value })} sx={inputSx}>
              {CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {t(`cms.bd.cat.${c}`)}
                </MenuItem>
              ))}
            </TextField>
          </Field>
          <Field label={t("cms.bd.tier")} id="bd-tier">
            <TextField id="bd-tier" select value={b.tier || "bronze"} disabled={!!b.upgrades} onChange={(e) => setB({ ...b, tier: e.target.value })} sx={inputSx} helperText={b.upgrades ? t("cms.bd.tierUpgrades") : undefined}>
              {TIERS.map((x) => (
                <MenuItem key={x} value={x}>
                  {t(`cms.bd.tierName.${x}`)}
                </MenuItem>
              ))}
            </TextField>
          </Field>
        </Box>
      </DialogSection>

      <DialogSection title={t("cms.bd.rule")} hint={t("cms.bd.ruleHint")}>
        <RuleFields rule={b.rule} onRule={(rule) => setB({ ...b, rule })} units={units} />
      </DialogSection>
    </StaffDialog>
  );
}

/**
 * E06 Badge catalogue (CMS-08): the built-in badges every child can earn. Add one with a rule,
 * edit it, or retire it: nobody new can earn it and children who earned it keep it (BDG-07).
 * Badges reach devices in the content packs, so children earn them offline too.
 */
export default function BadgeCatalogue() {
  const me = useStaff();
  const edit = can(me.role, "edit");
  const [summary, setSummary] = useState(/** @type {any} */ (null));
  const [data, setData] = useState(/** @type {any} */ (null));
  const [msg, setMsg] = useState(/** @type {{ tone: "success" | "error", text: string } | null} */ (null));
  const [open, setOpen] = useState(/** @type {any} */ (null)); // badge, or "new"
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([api.content(), api.contentBadges()]).then(
      ([c, b]) => {
        if (!live) return;
        setSummary(c);
        setData(b);
      },
      (e) => live && setMsg({ tone: "error", text: e.message }),
    );
    return () => {
      live = false;
    };
  }, [reload]);

  const save = async (badge, ok) => {
    try {
      await api.saveBadge(badge);
      setMsg({ tone: "success", text: ok });
      setOpen(null);
      setReload((n) => n + 1);
    } catch (e) {
      setMsg({ tone: "error", text: [e.message, ...(e.problems || []).slice(0, 3)].join(" · ") });
    }
  };

  const list = data?.badges || [];
  const units = Object.entries(data?.units || {}).map(([id, title]) => ({ id, title }));
  const unitName = (id) => data?.units?.[id] || id;
  return (
    <>
      <StaffHead title={t("cms.bd.title")} sub={data ? t("cms.bd.sub", { n: list.length, retired: list.filter((b) => b.retired).length }) : ""}>
        {edit && summary?.has_badges && (
          <Button variant="contained" onClick={() => setOpen("new")}>
            {t("cms.bd.add")}
          </Button>
        )}
      </StaffHead>
      {msg && (
        <Alert severity={msg.tone} onClose={() => setMsg(null)} sx={{ borderRadius: 4 }} role="status">
          {msg.text}
        </Alert>
      )}
      {summary && !summary.has_badges && (
        <Alert severity="info" sx={{ borderRadius: 4 }}>
          {t("cms.bd.notYet")} <Link href="/admin/content">{t("cms.title")}</Link>
        </Alert>
      )}
      {summary?.has_badges && <DraftBanner data={summary} compact />}
      {summary?.has_badges && (
        <Box sx={{ display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.6fr) minmax(0, 1fr)" }, alignItems: "start" }}>
          <Card sx={{ p: 1.5, display: "flex", flexDirection: "column" }} data-testid="badge-list">
            {list.map((b) => {
              const waiting = b.art && data.approvals[b.art] !== "approved";
              return (
                <Box key={b.id} data-badge={b.id} sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center", py: 1.25, px: 0.5, borderTop: `1px solid ${colors.line}`, "&:first-of-type": { borderTop: 0 }, opacity: b.retired ? 0.6 : 1 }}>
                  <BadgeArt b={b} />
                  <Box sx={{ flex: "1 1 200px", minWidth: 0, fontSize: 14 }}>
                    <b>{b.name}</b> {data.edited.includes(b.id) && <Pill tone="sun">{t("cms.edited")}</Pill>} {b.retired && <Pill tone="bad">{t("cms.bd.retired")}</Pill>}{" "}
                    {waiting && <Pill tone="sky">{t("cms.pic.waitingShort")}</Pill>}
                    <br />
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      {b.how} · {ruleText(b.rule, unitName)}
                      {b.tier ? ` · ${t(`cms.bd.tierName.${b.tier}`)}` : ""}
                    </Box>
                  </Box>
                  {edit && (
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", justifyContent: "flex-end", ml: "auto" }}>
                      <Button size="small" onClick={() => setOpen(b)}>
                        {t("cms.edit")}
                      </Button>
                      <Button
                        size="small"
                        color={b.retired ? "inherit" : "error"}
                        onClick={() => {
                          const { retired: _r, ...rest } = b;
                          save(b.retired ? rest : { ...b, retired: true }, t(b.retired ? "cms.bd.restored" : "cms.bd.retiredMsg", { name: b.name }));
                        }}
                      >
                        {t(b.retired ? "cms.bd.restore" : "cms.bd.retire")}
                      </Button>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Card>
          <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography sx={{ fontWeight: 800 }}>{t("cms.bd.howTitle")}</Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("cms.bd.howBody")}</Typography>
          </Card>
        </Box>
      )}
      {open && (
        <BadgeDialog
          start={open === "new" ? null : open}
          units={units}
          taken={list.map((b) => b.id)}
          onClose={() => setOpen(null)}
          onSave={(b) => save(b, t(open === "new" ? "cms.bd.added" : "cms.bd.saved", { name: b.name }))}
        />
      )}
    </>
  );
}
