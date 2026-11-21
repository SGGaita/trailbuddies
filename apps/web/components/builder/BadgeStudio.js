"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  BADGE_COLOURS,
  BADGE_ICONS,
  BADGE_NOTE_MAX,
  BADGE_REWARD_MAX,
  BADGE_SHAPES,
  BADGE_TREASURE_MAX,
  COUNT_METRICS,
  ICON_EMOJI,
  MAX_CONDITIONS,
  badgeProblems,
  mediaProblem,
  ruleSummary,
} from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import ReportShare from "@/components/share/ReportShare";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";
import Icon from "@/components/Icon";
import CustomBadgeArt from "@/components/rewards/CustomBadgeArt";
import { canEdit } from "@/lib/account";
import { familyDb } from "@/lib/db";
import { StorageFullError, createRecorder, mediaUrl, preparePhoto, saveMedia } from "@/lib/media";
import { checkImage, scanForServer } from "@/lib/imageCheck";
import { badgeEvents } from "@/lib/rewards";
import { speak } from "@/lib/speech";
import { dbName, useFamily, useHydrated } from "@/lib/store";
import { ChoiceChip } from "./parts";
import { useMediaConsent } from "./useMediaConsent";

const DRAFT_KEY = "badge-design-draft";
const EMPTY = {
  name: "",
  shape: "circle",
  colour: "blue",
  icon: "star",
  photo: null,
  rule: { type: "manual" },
  treasures: 10,
  reward: "",
  note: "",
  voice: null,
  audience: null,
};
/** Rule types in the order a grown-up sees them; manual first (the most common). */
const RULES = ["manual", "lesson", "count", "streak", "mastery", "combo"];
const CONDITIONS = ["lesson", "count", "streak", "mastery"];
/** A new rule of a type, with sensible starting values. */
function blankRule(type, lessons) {
  switch (type) {
    case "lesson":
    case "mastery":
      return { type, lesson: lessons[0]?.id || "" };
    case "count":
      return { type: "count", metric: "stars", n: 50 };
    case "streak":
      return { type: "streak", days: 5 };
    case "combo":
      return { type: "combo", op: "and", all: [blankRule("count", lessons), blankRule("streak", lessons)] };
    default:
      return { type: "manual" };
  }
}

/**
 * P14/P15 Badge Studio (BST-01…06): design a badge, then choose how it's earned, its reward and
 * who can earn it. A new badge's design is kept on this device while it's being made.
 */
export default function BadgeStudio() {
  const ready = useHydrated();
  const id = useSearchParams().get("id");
  const family = useFamily((s) => s.family);
  const name = useFamily(dbName);
  const editable = useFamily((s) => (s.mode === "account" || s.mode === "demo") && canEdit(s));
  const existing = useFamily((s) => (id ? s.customBadges.find((b) => b.id === id) : null));
  if (!ready) return <Loading />;
  return (
    <FamilyShell
      title={existing ? t("badgeStudio.editTitle") : t("builder.tile.badge")}
      back={existing ? "/family/rewards?tab=award" : "/family/create"}
      active="/family/create"
      family={family}
    >
      {name && editable ? (
        <BadgeEditor key={`${name}-${id || "new"}`} databaseName={name} existing={existing} />
      ) : (
        <Alert severity="info">{t("builder.viewOnly")}</Alert>
      )}
    </FamilyShell>
  );
}

function DesignChoice({ field, choices, value, onChange, disabled }) {
  return (
    <Box component="fieldset" disabled={disabled} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
      <Typography component="legend" sx={{ fontWeight: 800, mb: 0.75 }}>
        {t(`badgeStudio.${field}`)}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {choices.map((choice) => (
          <Button
            key={choice}
            type="button"
            aria-pressed={value === choice}
            variant={value === choice ? "contained" : "outlined"}
            onClick={() => onChange(choice)}
          >
            {field === "icon" && <span aria-hidden="true">{ICON_EMOJI[choice]}&nbsp;</span>}
            {t(`badgeStudio.${choice}`)}
          </Button>
        ))}
      </Box>
    </Box>
  );
}

function BadgeEditor({ databaseName, existing }) {
  const router = useRouter();
  const fileInput = useRef(null);
  const photoScan = useRef(/** @type {object | null} */ (null));
  const [draft, setDraft] = useState(() => (existing ? { ...EMPTY, ...existing } : null));
  const [step, setStep] = useState(/** @type {"design" | "earn"} */ ("design"));
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(/** @type {"" | "photo" | "save" | "rec"} */ (""));
  const [deleting, setDeleting] = useState(false);
  const { ensureConsent, dialog } = useMediaConsent(() => setStatus("photoError"));
  const lessons = useFamily((s) => s.lessons);
  const learners = useFamily((s) => s.learners);

  // A new badge: pick up the design saved on this device, if there is one.
  useEffect(() => {
    if (existing) return undefined;
    let active = true;
    familyDb(databaseName)
      .meta.get(DRAFT_KEY)
      .then(
        (entry) => active && setDraft({ ...EMPTY, ...entry?.value }),
        () => active && setStatus("loadError"),
      );
    return () => {
      active = false;
    };
  }, [databaseName, existing]);

  if (!draft) {
    return status === "loadError" ? <Alert severity="warning">{t("badgeStudio.loadError")}</Alert> : <Loading />;
  }
  const audience = draft.audience ?? learners.map((l) => l.id);
  const update = (field, value) => {
    setStatus("");
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const keepDraft = async () => {
    if (existing) return true;
    try {
      await familyDb(databaseName).meta.put({ key: DRAFT_KEY, value: { ...draft, name: draft.name.trim() } });
      return true;
    } catch {
      setStatus("saveError");
      return false;
    }
  };

  async function choosePhoto() {
    if (await ensureConsent("photos")) fileInput.current?.click();
  }
  async function onPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    const problem = mediaProblem("photo", file.type, file.size);
    if (problem) return setStatus(problem === "size" ? "photoTooBig" : "photoError");
    setStatus("");
    setBusy("photo");
    try {
      // Cropped square and re-encoded on this device: the copy kept has no EXIF (SAF-02).
      const photo = await preparePhoto(file);
      // BST-08: the image check runs here too. A flagged photo can't be used on a badge.
      const check = await checkImage(photo, { faces: false });
      if (check.flagged) return setStatus("photoFlagged");
      photoScan.current = scanForServer(check);
      update("photo", photo);
    } catch {
      setStatus("photoError");
    } finally {
      setBusy("");
    }
  }

  async function saveDraft(event) {
    event.preventDefault();
    if (busy || !draft.name.trim()) return;
    if (await keepDraft()) setStatus("saved");
  }
  async function toEarn() {
    if (!draft.name.trim() || busy) return;
    if (await keepDraft()) setStep("earn");
  }

  const problems = badgeProblems(
    { ...draft, name: draft.name.trim(), photo: draft.photo ? "photo" : null, audience },
    { kind: "family", lessons, learners: learners.map((l) => l.id) },
  );

  async function save() {
    if (problems.length || busy) return setStatus(problems[0] ? `problem.${problems[0]}` : "");
    setBusy("save");
    try {
      const photo =
        draft.photo instanceof Blob ? await saveMedia("photo", draft.photo, { scan: photoScan.current }) : draft.photo;
      const s = useFamily.getState();
      const saved = s.saveBadge({
        id: existing?.id,
        name: draft.name.trim(),
        shape: draft.shape,
        colour: draft.colour,
        icon: draft.icon,
        photo: photo || null,
        note: draft.note.trim(),
        voice: draft.voice,
        rule: draft.rule,
        treasures: draft.treasures,
        reward: draft.reward.trim(),
        audience,
      });
      if (!existing) await familyDb(databaseName).meta.delete(DRAFT_KEY);
      // Children who already meet an automatic rule get the badge now, and see it next time.
      const already = [];
      if (saved.rule.type !== "manual") {
        const st = useFamily.getState();
        for (const profile of st.learners.filter((l) => saved.audience.includes(l.id))) {
          const won = badgeEvents(profile, useFamily.getState().events, [], { goal: st.settings.goal });
          if (won.events.length) {
            // Marked so the child's device celebrates it next time (it wasn't earned in play there).
            const mark = (e) => (e.type === "badge_awarded" && e.data.custom ? { ...e, data: { ...e.data, catchUp: true } } : e);
            useFamily.getState().record(won.events.map(mark));
            if (won.badges.some((b) => b.id === saved.id)) already.push(profile.name);
          }
        }
      }
      const q = new URLSearchParams({ tab: "award", saved: saved.name });
      if (already.length) q.set("already", already.join(", "));
      router.push(`/family/rewards?${q}`);
    } catch (err) {
      setStatus(err instanceof StorageFullError ? "full" : "saveError");
      setBusy("");
    }
  }

  const preview = (size) => (
    <Box component="figure" aria-label={t("badgeStudio.preview")} sx={{ m: 0, textAlign: "center" }}>
      <Box sx={{ display: "grid", placeItems: "center" }}>
        <CustomBadgeArt badge={draft} size={size} />
      </Box>
      <Typography component="figcaption" variant="h6" sx={{ mt: 1, overflowWrap: "anywhere" }}>
        {draft.name.trim() || t("badgeStudio.untitled")}
      </Typography>
    </Box>
  );

  if (step === "design")
    return (
      <Card sx={{ p: { xs: 2, sm: 3 }, width: "100%", maxWidth: 640, mx: "auto" }}>
        <Box component="form" onSubmit={saveDraft} sx={{ display: "grid", gap: 2 }}>
          {preview(144)}
          <TextField
            required
            disabled={!!busy}
            label={t("badgeStudio.name")}
            value={draft.name}
            onChange={(event) => update("name", event.target.value)}
            slotProps={{ htmlInput: { maxLength: 40 } }}
          />
          <DesignChoice field="shape" choices={BADGE_SHAPES} value={draft.shape} onChange={(v) => update("shape", v)} disabled={!!busy} />
          <DesignChoice field="colour" choices={BADGE_COLOURS} value={draft.colour} onChange={(v) => update("colour", v)} disabled={!!busy} />
          <DesignChoice
            field="icon"
            choices={BADGE_ICONS}
            value={draft.photo ? null : draft.icon}
            onChange={(icon) => {
              setStatus("");
              setDraft((current) => ({ ...current, icon, photo: null }));
            }}
            disabled={!!busy}
          />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <input ref={fileInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onPhoto} />
            <Button type="button" variant="outlined" disabled={!!busy} onClick={choosePhoto}>
              {busy === "photo" ? t("badgeStudio.preparingPhoto") : t("badgeStudio.choosePhoto")}
            </Button>
            {draft.photo && (
              <Button type="button" variant="text" disabled={!!busy} onClick={() => update("photo", null)}>
                {t("badgeStudio.removePhoto")}
              </Button>
            )}
          </Box>
          <Typography sx={{ color: "text.secondary", fontSize: 14 }}>{t("badgeStudio.photoHelp")}</Typography>
          <StatusLine status={status} />
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "flex-end" }}>
            {!existing && (
              <Button type="submit" variant="outlined" disabled={!!busy || !draft.name.trim()}>
                {t("badgeStudio.save")}
              </Button>
            )}
            <Button type="button" variant="contained" disabled={!!busy || !draft.name.trim()} onClick={toEarn}>
              {t("badgeStudio.next")}
            </Button>
          </Box>
        </Box>
        {dialog}
      </Card>
    );

  return (
    <Card sx={{ p: { xs: 2, sm: 3 }, width: "100%", maxWidth: 720, mx: "auto", display: "grid", gap: 2.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <CustomBadgeArt badge={draft} size={64} />
        <Typography variant="h6" component="h2" sx={{ flex: 1, minWidth: 0, overflowWrap: "anywhere" }}>
          {draft.name.trim()}
        </Typography>
        <Button onClick={() => setStep("design")}>{t("badgeStudio.backToDesign")}</Button>
      </Box>

      <Box component="section" aria-labelledby="earn-how" sx={{ display: "grid", gap: 1.25 }}>
        <Typography id="earn-how" variant="h6" component="h3">
          {t("badgeStudio.howEarned")}
        </Typography>
        <Box role="group" aria-labelledby="earn-how" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {RULES.map((type) => (
            <ChoiceChip key={type} on={draft.rule.type === type} onClick={() => update("rule", blankRule(type, lessons))}>
              {t(`badgeStudio.rule.${type}`)}
            </ChoiceChip>
          ))}
        </Box>
        {draft.rule.type === "combo" ? (
          <Combo rule={draft.rule} lessons={lessons} onChange={(rule) => update("rule", rule)} />
        ) : (
          <RuleFields rule={draft.rule} lessons={lessons} onChange={(rule) => update("rule", rule)} />
        )}
        <Alert severity="info" icon={false} role="status" id="rule-summary" sx={{ fontWeight: 700, borderRadius: 3.5 }}>
          {ruleSummary(draft.rule, { lessons })}
        </Alert>
      </Box>

      <Box component="section" aria-labelledby="earn-reward" sx={{ display: "grid", gap: 1.25 }}>
        <Typography id="earn-reward" variant="h6" component="h3">
          {t("badgeStudio.reward")}
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 1 }}>
          <TextField
            type="number"
            label={t("badgeStudio.treasures")}
            value={draft.treasures}
            onChange={(e) => update("treasures", e.target.value === "" ? 0 : Math.round(Number(e.target.value)))}
            error={draft.treasures > BADGE_TREASURE_MAX}
            helperText={
              draft.treasures > BADGE_TREASURE_MAX
                ? t("badgeStudio.treasureCap", { max: BADGE_TREASURE_MAX })
                : t("badgeStudio.treasureHelp", { max: BADGE_TREASURE_MAX })
            }
            slotProps={{ htmlInput: { min: 0, inputMode: "numeric" } }}
            sx={{ width: { xs: "100%", sm: 260 } }}
          />
          <Box sx={{ display: "flex", gap: 1, pt: 1 }}>
            {[0, 10, 20, 50].map((n) => (
              <ChoiceChip key={n} on={draft.treasures === n} onClick={() => update("treasures", n)}>
                {n}
              </ChoiceChip>
            ))}
          </Box>
        </Box>
        <TextField
          label={t("badgeStudio.realReward")}
          placeholder={t("badgeStudio.realRewardHint")}
          value={draft.reward}
          onChange={(e) => update("reward", e.target.value)}
          helperText={t("badgeStudio.realRewardHelp")}
          slotProps={{ htmlInput: { maxLength: BADGE_REWARD_MAX } }}
        />
        <TextField
          label={t("badgeStudio.note")}
          placeholder={t("badgeStudio.noteHint")}
          value={draft.note}
          onChange={(e) => update("note", e.target.value)}
          slotProps={{ htmlInput: { maxLength: BADGE_NOTE_MAX } }}
        />
        <VoiceMessage
          voice={draft.voice}
          note={draft.note}
          ensureConsent={ensureConsent}
          onChange={(voice) => update("voice", voice)}
          onProblem={setStatus}
          onBusy={(b) => setBusy(b ? "rec" : "")}
        />
      </Box>

      <Box component="section" aria-labelledby="earn-who" sx={{ display: "grid", gap: 1 }}>
        <Typography id="earn-who" variant="h6" component="h3">
          {t("badgeStudio.who")}
        </Typography>
        <Box role="group" aria-labelledby="earn-who" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {learners.map((l) => (
            <ChoiceChip
              key={l.id}
              on={audience.includes(l.id)}
              onClick={() =>
                update("audience", audience.includes(l.id) ? audience.filter((x) => x !== l.id) : [...audience, l.id])
              }
            >
              {l.name}
            </ChoiceChip>
          ))}
        </Box>
      </Box>

      <StatusLine status={status} />
      {existing?.source_share && <ReportShare shareId={existing.source_share} what="badge" />}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between" }}>
        {existing ? (
          <Button color="error" onClick={() => setDeleting(true)}>
            {t("badgeStudio.delete")}
          </Button>
        ) : (
          <span />
        )}
        <Button variant="contained" size="large" disabled={!!busy} onClick={save}>
          {t("badgeStudio.saveBadge")}
        </Button>
      </Box>
      {dialog}
      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        aria-labelledby="delete-badge"
        slotProps={{ paper: { sx: { borderRadius: 5.5, p: 3, maxWidth: 440, gap: 1.5 } } }}
      >
        <Typography id="delete-badge" variant="h6" component="h2">
          {t("badgeStudio.deleteTitle", { name: draft.name })}
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>{t("badgeStudio.deleteSub")}</Typography>
        <Box sx={{ display: "flex", gap: 1.25, justifyContent: "flex-end" }}>
          <Button onClick={() => setDeleting(false)}>{t("common.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              useFamily.getState().deleteBadge(existing.id);
              router.push("/family/rewards?tab=award");
            }}
          >
            {t("badgeStudio.deleteConfirm")}
          </Button>
        </Box>
      </Dialog>
    </Card>
  );
}

function StatusLine({ status }) {
  if (!status) return null;
  const ok = status === "saved";
  const key = status.startsWith("problem.") ? `badgeStudio.${status}` : `badgeStudio.${status}`;
  return (
    <Alert severity={ok ? "success" : "warning"} role={ok ? "status" : "alert"}>
      {t(key, { max: BADGE_TREASURE_MAX })}
    </Alert>
  );
}

/** One rule's details: which lesson, how many, how many days. */
function RuleFields({ rule, lessons, onChange, label }) {
  if (rule.type === "manual")
    return <Typography sx={{ color: "text.secondary" }}>{t("badgeStudio.manualHelp")}</Typography>;
  if (rule.type === "lesson" || rule.type === "mastery") {
    if (!lessons.length) return <Alert severity="info">{t("badgeStudio.noLessons")}</Alert>;
    return (
      <TextField
        select
        label={label || t("badgeStudio.whichLesson")}
        value={rule.lesson || ""}
        onChange={(e) => onChange({ ...rule, lesson: e.target.value })}
        sx={{ maxWidth: 420 }}
      >
        {lessons.map((l) => (
          <MenuItem key={l.id} value={l.id}>
            {l.title}
          </MenuItem>
        ))}
      </TextField>
    );
  }
  if (rule.type === "count")
    return (
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <TextField
          type="number"
          label={t("badgeStudio.howMany")}
          value={rule.n}
          onChange={(e) => onChange({ ...rule, n: Math.round(Number(e.target.value) || 0) })}
          slotProps={{ htmlInput: { min: 1, max: 1000, inputMode: "numeric" } }}
          sx={{ width: 140 }}
        />
        <TextField
          select
          label={label || t("badgeStudio.ofWhat")}
          value={rule.metric}
          onChange={(e) => onChange({ ...rule, metric: e.target.value })}
          sx={{ minWidth: 220 }}
        >
          {COUNT_METRICS.map((m) => (
            <MenuItem key={m} value={m}>
              {t(`badgeStudio.metric.${m}`)}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );
  if (rule.type === "streak")
    return (
      <TextField
        select
        label={label || t("badgeStudio.days")}
        value={rule.days}
        onChange={(e) => onChange({ ...rule, days: Number(e.target.value) })}
        sx={{ width: 220 }}
      >
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <MenuItem key={n} value={n}>
            {t("badgeStudio.daysN", { n })}
          </MenuItem>
        ))}
      </TextField>
    );
  return null;
}

/** BST-02: up to 3 conditions joined with "and" or "or". */
function Combo({ rule, lessons, onChange }) {
  const setPart = (i, part) => onChange({ ...rule, all: rule.all.map((r, n) => (n === i ? part : r)) });
  return (
    <Box sx={{ display: "grid", gap: 1.25 }}>
      <Box role="group" aria-label={t("badgeStudio.join")} sx={{ display: "flex", gap: 1 }}>
        {["and", "or"].map((op) => (
          <ChoiceChip key={op} on={rule.op === op} onClick={() => onChange({ ...rule, op })}>
            {t(`badgeStudio.${op}`)}
          </ChoiceChip>
        ))}
      </Box>
      {rule.all.map((part, i) => (
        <Box
          key={i}
          role="group"
          aria-label={t("badgeStudio.condition", { n: i + 1 })}
          sx={{ p: 1.5, border: `2px solid ${colors.line}`, borderRadius: 4.5, display: "grid", gap: 1 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <TextField
              select
              size="small"
              label={t("badgeStudio.condition", { n: i + 1 })}
              value={part.type}
              onChange={(e) => setPart(i, blankRule(e.target.value, lessons))}
              sx={{ minWidth: 200 }}
            >
              {CONDITIONS.map((type) => (
                <MenuItem key={type} value={type}>
                  {t(`badgeStudio.rule.${type}`)}
                </MenuItem>
              ))}
            </TextField>
            {rule.all.length > 2 && (
              <IconButton
                aria-label={t("badgeStudio.removeCondition", { n: i + 1 })}
                onClick={() => onChange({ ...rule, all: rule.all.filter((_, n) => n !== i) })}
              >
                <Icon name="x" size={20} />
              </IconButton>
            )}
          </Box>
          <RuleFields rule={part} lessons={lessons} onChange={(p) => setPart(i, p)} />
        </Box>
      ))}
      {rule.all.length < MAX_CONDITIONS && (
        <Button
          variant="outlined"
          sx={{ justifySelf: "start", borderWidth: 2 }}
          onClick={() => onChange({ ...rule, all: [...rule.all, blankRule("count", lessons)] })}
        >
          {t("badgeStudio.addCondition")}
        </Button>
      )}
    </Box>
  );
}

/** BST-01 scenario 3: a message in the grown-up's own voice, played at the celebration. */
function VoiceMessage({ voice, note, ensureConsent, onChange, onProblem, onBusy }) {
  const rec = useRef(/** @type {ReturnType<typeof createRecorder> | null} */ (null));
  const [recording, setRecording] = useState(false);
  const start = async (e) => {
    e.preventDefault();
    if (recording) return;
    if (!(await ensureConsent("voice"))) return;
    try {
      rec.current = createRecorder();
      await rec.current.start();
      setRecording(true);
      onBusy(true);
    } catch {
      rec.current = null;
      onProblem("mic");
    }
  };
  const stop = async () => {
    if (!rec.current || !recording) return;
    const r = rec.current;
    rec.current = null;
    setRecording(false);
    try {
      const clip = await r.stop();
      if (!clip) onProblem("silent");
      else onChange(await saveMedia("voice", clip));
    } catch (err) {
      onProblem(err instanceof StorageFullError ? "full" : "mic");
    } finally {
      onBusy(false);
    }
  };
  const play = async () => {
    const url = voice ? await mediaUrl(voice) : null;
    if (url) new Audio(url).play().catch(() => {});
    else if (note) speak(note);
  };
  return (
    <Box sx={{ p: 1.5, border: `2px solid ${colors.line}`, borderRadius: 4.5, display: "flex", alignItems: "center", gap: 1.5 }}>
      <IconButton
        aria-label={voice ? t("builder.reRecord") : t("badgeStudio.record")}
        aria-pressed={recording}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        sx={{
          width: 56,
          height: 56,
          flex: "none",
          border: `3px solid ${recording ? colors.coral.main : colors.leaf.deep}`,
          color: recording ? colors.coral.main : colors.leaf.deep,
          bgcolor: recording ? colors.coral.soft : "background.paper",
          touchAction: "none",
        }}
      >
        <Icon name="mic" size={26} />
      </IconButton>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800 }}>
          {recording ? t("builder.recording") : voice ? t("badgeStudio.recorded") : t("badgeStudio.record")}
        </Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{t("badgeStudio.recordSub")}</Typography>
      </Box>
      {(voice || note) && (
        <Button size="small" variant="outlined" onClick={play} sx={{ borderWidth: 2, minHeight: 40 }}>
          {t("builder.play")}
        </Button>
      )}
      {voice && (
        <IconButton aria-label={t("builder.removeVoice")} onClick={() => onChange(null)}>
          <Icon name="x" size={20} />
        </IconButton>
      )}
    </Box>
  );
}
