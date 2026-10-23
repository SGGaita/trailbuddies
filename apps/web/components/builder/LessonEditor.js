"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { CARD_LIMITS, LIMITS, TEMPLATES, groupsOf, templateProblem } from "@trailbuddies/domain";
import { ulid } from "@trailbuddies/sync";
import { useFamily, useHydrated } from "@/lib/store";
import { api, canEdit, refreshAccount } from "@/lib/account";
import FamilyShell from "@/components/shell/FamilyShell";
import Buddy from "@/components/art/Buddy";
import Icon from "@/components/Icon";
import Loading from "@/components/Loading";
import CardPanel from "./CardPanel";
import { CardPic, UploadBanner } from "./parts";

const blank = () => ({
  id: null,
  title: "",
  template: "learn",
  cards: [],
  assigned: [],
  question: "",
  puzzleCard: undefined,
});

/** P10–P12 Lesson Builder: cards, then how it's played and who gets it. ?id= edits a lesson. */
export default function LessonEditor() {
  const ready = useHydrated();
  const params = useSearchParams();
  if (!ready) return <Loading />;
  const id = params.get("id");
  return <Editor key={id || "new"} id={id} />;
}

function Editor({ id }) {
  const s = useFamily();
  const router = useRouter();
  const existing = id ? s.lessons.find((l) => l.id === id) : null;
  const [draft, setDraft] = useState(() =>
    existing ? { ...blank(), ...structuredClone(existing), question: existing.question || "" } : blank(),
  );
  const [step, setStep] = useState(/** @type {"cards" | "play"} */ ("cards"));
  const [editing, setEditing] = useState(/** @type {null | { index: number, card: any }} */ (null));
  const [ask, setAsk] = useState(
    /** @type {null | { scope: "photos" | "voice", resolve: (ok: boolean) => void }} */ (null),
  );
  const [published, setPublished] = useState(/** @type {any} */ (null));
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const editable = canEdit(s);
  const kids = s.learners;
  const nameOf = (lid) => kids.find((l) => l.id === lid)?.name;
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const groups = groupsOf(draft.cards);

  if (id && !existing && !published)
    return (
      <FamilyShell title={t("builder.title")} back="/family/create" family={s.family} active="/family/create">
        <Alert severity="info">{t("builder.none")}</Alert>
      </FamilyShell>
    );

  /** Photos and recordings need the family's optional consent (account families only). */
  const ensureConsent = (scope) => {
    if (s.mode !== "account" || s.family?.consent?.scopes?.[scope]) return Promise.resolve(true);
    return new Promise((resolve) => setAsk({ scope, resolve }));
  };
  const answerConsent = async (ok) => {
    const a = ask;
    setAsk(null);
    if (!ok) return a.resolve(false);
    try {
      const c = s.family.consent;
      await api.giveConsent(s.family.id, {
        policy_version: c.policy_version,
        scopes: { ...c.scopes, [a.scope]: true },
      });
      await refreshAccount();
      a.resolve(true);
    } catch {
      setError(t("builder.photoFail"));
      a.resolve(false);
    }
  };

  const saveCard = (card) => {
    const cards = [...draft.cards];
    if (editing.index >= 0) cards[editing.index] = card;
    else cards.push(card);
    set({ cards });
    setEditing(null);
  };
  const save = (assigned = draft.assigned) => {
    const saved = useFamily.getState().saveLesson({
      ...draft,
      id: draft.id || ulid(),
      assigned,
      question: draft.question || undefined,
    });
    set({ id: saved.id, version: saved.version });
    return saved;
  };
  const publish = () => {
    const saved = save();
    setPublished(saved);
  };
  const preview = () => {
    const saved = save();
    const who = saved.assigned[0] || kids.find((k) => k.buddy)?.id || kids[0]?.id;
    router.push(`/family/create/preview?id=${saved.id}&learner=${who}`);
  };

  const needed = CARD_LIMITS.min - draft.cards.length;
  const problem = templateProblem(draft.cards, draft.template);
  const photoCards = draft.cards.filter((c) => c.photo);
  const title = draft.title.trim() || (existing ? existing.title : t("builder.make"));

  if (!editable)
    return (
      <FamilyShell title={title} back="/family/create" family={s.family} active="/family/create">
        <Alert severity="info">{t("builder.viewOnly")}</Alert>
      </FamilyShell>
    );

  if (editing)
    return (
      <FamilyShell
        title={editing.index >= 0 ? t("builder.editCard") : t("builder.addCard")}
        back="/family/create"
        family={s.family}
        active="/family/create"
      >
        <CardPanel
          card={editing.card}
          groups={groups}
          ensureConsent={ensureConsent}
          onSave={saveCard}
          onCancel={() => setEditing(null)}
        />
        <ConsentDialog ask={ask} onAnswer={answerConsent} />
      </FamilyShell>
    );

  return (
    <FamilyShell title={title} back="/family/create" family={s.family} active="/family/create">
      <UploadBanner />
      {error && <Alert severity="warning">{error}</Alert>}
      {step === "cards" ? (
        <>
          <TextField
            label={t("builder.name")}
            placeholder={t("builder.namePh")}
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            slotProps={{ htmlInput: { maxLength: LIMITS.title } }}
            sx={{ maxWidth: 560 }}
          />
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", maxWidth: 760 }}
          >
            <Typography variant="h6" component="h2">
              {t("builder.cards", { n: draft.cards.length })}
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>{t("builder.cardsRange")}</Typography>
          </Box>
          <Box
            component="ul"
            aria-label={t("builder.cards", { n: draft.cards.length })}
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
              maxWidth: 760,
            }}
          >
            {draft.cards.map((c, i) => (
              <li key={c.id}>
                <Card sx={{ p: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}>
                  <CardPic card={c} size={56} />
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setEditing({ index: i, card: c })}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: "left",
                      border: 0,
                      bgcolor: "transparent",
                      p: 0,
                      cursor: "pointer",
                      color: "text.primary",
                      font: "inherit",
                    }}
                  >
                    <Typography sx={{ fontWeight: 800 }} noWrap>
                      {c.label}
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 14 }} noWrap>
                      {c.voice ? t("builder.yourVoice") : t("builder.deviceVoice")}
                      {c.group ? ` · ${c.group}` : ""}
                    </Typography>
                  </Box>
                  <IconButton
                    aria-label={t("builder.removeCard", { label: c.label })}
                    onClick={() => set({ cards: draft.cards.filter((x) => x.id !== c.id) })}
                  >
                    <Icon name="x" size={20} />
                  </IconButton>
                </Card>
              </li>
            ))}
          </Box>
          {draft.cards.length < CARD_LIMITS.max && (
            <Button
              variant="outlined"
              onClick={() => setEditing({ index: -1, card: { id: ulid() } })}
              startIcon={<Icon name="plus" size={20} />}
              sx={{ alignSelf: "flex-start", borderWidth: 2 }}
            >
              {t("builder.addCard")}
            </Button>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mt: 1 }}>
            <Button variant="contained" disabled={needed > 0} onClick={() => setStep("play")}>
              {t("builder.toPlay")}
            </Button>
            {needed > 0 && (
              <Typography sx={{ color: "text.secondary" }}>
                {needed === 1 ? t("builder.needOne") : t("builder.needMore", { n: needed })}
              </Typography>
            )}
            {existing && (
              <Button color="error" onClick={() => setDeleting(true)} sx={{ ml: { sm: "auto" } }}>
                {t("builder.delete")}
              </Button>
            )}
          </Box>
        </>
      ) : (
        <>
          <Typography variant="h6" component="h2">
            {t("builder.how")}
          </Typography>
          <Box
            role="radiogroup"
            aria-label={t("builder.how")}
            sx={{
              display: "grid",
              gap: 1.25,
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
            }}
          >
            {TEMPLATES.map((tp) => {
              const p = templateProblem(draft.cards, tp);
              const on = draft.template === tp;
              return (
                <Box
                  key={tp}
                  component="button"
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ template: tp })}
                  sx={{
                    textAlign: "left",
                    p: 2,
                    borderRadius: 4.5,
                    border: `3px solid ${on ? colors.leaf.main : colors.line}`,
                    bgcolor: on ? colors.leaf.soft : "background.paper",
                    color: "text.primary",
                    font: "inherit",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  <Typography sx={{ fontWeight: 800, fontSize: 17 }}>{t(`builder.tpl.${tp}`)}</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                    {t(`builder.tpl.${tp}Sub`)}
                  </Typography>
                  {p && (
                    <Typography sx={{ color: colors.coral.deep, fontWeight: 800, fontSize: 14 }}>
                      {t(`builder.need.${p.need}`, { n: p.n })}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
          {draft.template === "puzzle" && photoCards.length > 0 && (
            <Card sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 760 }}>
              <TextField
                label={t("builder.question")}
                placeholder={t("builder.questionPh")}
                value={draft.question}
                onChange={(e) => set({ question: e.target.value })}
                slotProps={{ htmlInput: { maxLength: LIMITS.question } }}
              />
              <Typography sx={{ fontWeight: 800 }}>{t("builder.puzzleCard")}</Typography>
              <Box
                role="radiogroup"
                aria-label={t("builder.puzzleCard")}
                sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
              >
                {photoCards.map((c) => {
                  const on = (draft.puzzleCard || photoCards[0].id) === c.id;
                  return (
                    <Box
                      key={c.id}
                      component="button"
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={c.label}
                      onClick={() => set({ puzzleCard: c.id })}
                      sx={{
                        p: 0.5,
                        borderRadius: 4,
                        border: `3px solid ${on ? colors.leaf.main : "transparent"}`,
                        bgcolor: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <CardPic card={c} size={64} />
                    </Box>
                  );
                })}
              </Box>
            </Card>
          )}
          <Typography variant="h6" component="h2">
            {t("builder.who")}
          </Typography>
          <Box role="group" aria-label={t("builder.who")} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {kids.map((k) => {
              const on = draft.assigned.includes(k.id);
              return (
                <Chip
                  key={k.id}
                  label={k.name}
                  onClick={() =>
                    set({
                      assigned: on ? draft.assigned.filter((x) => x !== k.id) : [...draft.assigned, k.id],
                    })
                  }
                  color={on ? "primary" : "default"}
                  variant={on ? "filled" : "outlined"}
                  aria-pressed={on}
                  sx={{ fontWeight: 800, fontSize: 16, height: 40, px: 1 }}
                />
              );
            })}
          </Box>
          <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "center", mt: 1 }}>
            <Button variant="outlined" onClick={() => setStep("cards")} sx={{ borderWidth: 2 }}>
              {t("builder.cards", { n: draft.cards.length })}
            </Button>
            <Button
              variant="outlined"
              disabled={!!problem}
              onClick={preview}
              startIcon={<Icon name="play" size={20} />}
              sx={{ borderWidth: 2 }}
            >
              {t("builder.preview")}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              disabled={!!problem || !draft.assigned.length}
              onClick={publish}
            >
              {draft.assigned.length
                ? t("builder.publish", { names: draft.assigned.map(nameOf).filter(Boolean).join(" & ") })
                : t("builder.publishNone")}
            </Button>
          </Box>
        </>
      )}

      <Dialog
        open={!!published}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 5.5,
              p: 3,
              maxWidth: 440,
              textAlign: "center",
              alignItems: "center",
              gap: 1.5,
            },
          },
        }}
      >
        <Buddy id="zip" mood="cheer" size={90} />
        <Typography variant="h5" component="h2">
          {t("builder.live", { title: published?.title || "" })}
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>
          {t("builder.liveSub", {
            names: (published?.assigned || []).map(nameOf).filter(Boolean).join(" and "),
          })}
        </Typography>
        <Button component={Link} href="/family/create" variant="contained" autoFocus>
          {t("builder.done")}
        </Button>
      </Dialog>

      <Dialog
        open={deleting}
        onClose={() => setDeleting(false)}
        slotProps={{ paper: { sx: { borderRadius: 5.5, p: 3, maxWidth: 420, gap: 1.5 } } }}
      >
        <Typography>{t("builder.deleteSure", { title: existing?.title || "" })}</Typography>
        <Box sx={{ display: "flex", gap: 1.25, justifyContent: "flex-end" }}>
          <Button onClick={() => setDeleting(false)}>{t("builder.cancel")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              useFamily.getState().deleteLesson(existing.id);
              router.push("/family/create");
            }}
          >
            {t("builder.delete")}
          </Button>
        </Box>
      </Dialog>
    </FamilyShell>
  );
}

function ConsentDialog({ ask, onAnswer }) {
  return (
    <Dialog
      open={!!ask}
      onClose={() => onAnswer(false)}
      slotProps={{ paper: { sx: { borderRadius: 5.5, p: 3, maxWidth: 460, gap: 1.5 } } }}
    >
      <Typography variant="h6" component="h2">
        {ask?.scope === "voice" ? t("builder.allowVoice") : t("builder.allowPhotos")}
      </Typography>
      <Typography sx={{ color: "text.secondary" }}>{t("builder.allowSub")}</Typography>
      <Box sx={{ display: "flex", gap: 1.25, justifyContent: "flex-end" }}>
        <Button onClick={() => onAnswer(false)}>{t("builder.notNow")}</Button>
        <Button variant="contained" onClick={() => onAnswer(true)} autoFocus>
          {t("builder.allow")}
        </Button>
      </Box>
    </Dialog>
  );
}
