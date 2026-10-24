"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
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
import { CardPic, ChoiceChip, Field, Pill, UploadBanner, inputSx } from "./parts";

/** Prototype P10 tiles. Not built yet, so they show as "Soon" and do nothing. */
const TILES = [
  { icon: "sparkle", key: "builder.tile.remix" },
  { icon: "share", key: "builder.tile.import" },
  { icon: "trail", key: "builder.tile.trail" },
  { icon: "badge", key: "builder.tile.badge" },
];
const label = { fontWeight: 800, fontSize: 15 };

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
  const title = existing ? existing.title : t("builder.title");
  const playTitle = draft.title.trim() || t("builder.untitled");
  const others = [...s.lessons].reverse().filter((l) => l.id !== draft.id && !l.deleted);

  if (!editable)
    return (
      <FamilyShell title={title} back="/family/create" family={s.family} active="/family/create">
        <Alert severity="info">{t("builder.viewOnly")}</Alert>
      </FamilyShell>
    );

  if (editing)
    return (
      <CardPanel
        title={editing.index >= 0 ? t("builder.editCard") : t("builder.addCard")}
        family={s.family}
        card={editing.card}
        groups={groups}
        ensureConsent={ensureConsent}
        onSave={saveCard}
        onCancel={() => setEditing(null)}
      >
        <ConsentDialog ask={ask} onAnswer={answerConsent} />
      </CardPanel>
    );

  const names = draft.assigned.map(nameOf).filter(Boolean);
  const cardsStep = step === "cards";
  return (
    <FamilyShell
      title={cardsStep ? title : playTitle}
      {...(cardsStep ? { back: "/family/create" } : { onBack: () => setStep("cards") })}
      family={s.family}
      active="/family/create"
      foot={
        cardsStep ? (
          <Button key="next" variant="contained" disabled={needed > 0} onClick={() => setStep("play")}>
            {t("builder.toPlay")}
          </Button>
        ) : (
          <Button
            key="publish"
            variant="contained"
            color="secondary"
            disabled={!!problem || !draft.assigned.length}
            onClick={publish}
          >
            {names.length ? t("builder.publish", { names: names.join(" & ") }) : t("builder.publishNone")}
          </Button>
        )
      }
      footNote={
        cardsStep && needed > 0
          ? needed === 1
            ? t("builder.needOne")
            : t("builder.needMore", { n: needed })
          : null
      }
    >
      <UploadBanner />
      {error && <Alert severity="warning">{error}</Alert>}
      {cardsStep ? (
        <>
          <Field label={t("builder.name")} id="lesson-name">
            <TextField
              id="lesson-name"
              placeholder={t("builder.namePh")}
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              slotProps={{ htmlInput: { maxLength: LIMITS.title } }}
              sx={inputSx}
            />
          </Field>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.25 }}>
            <Typography component="h2" sx={label}>
              {t("builder.cards", { n: draft.cards.length })}
            </Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 13 }}>{t("builder.cardsRange")}</Typography>
          </Box>
          {draft.cards.length > 0 && (
            <Box
              component="ul"
              aria-label={t("builder.cards", { n: draft.cards.length })}
              sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1.25 }}
            >
              {draft.cards.map((c, i) => (
                <li key={c.id}>
                  <Card sx={{ p: 1.75, display: "flex", alignItems: "center", gap: 1.5 }}>
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
                      <Typography sx={{ color: "text.secondary", fontSize: 13 }} noWrap>
                        {c.voice ? t("builder.yourVoice") : t("builder.deviceVoice")}
                        {c.group ? ` · ${c.group}` : ""}
                        {c.fact ? ` · ${c.fact}` : ""}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={t("builder.removeCard", { label: c.label })}
                      onClick={() => set({ cards: draft.cards.filter((x) => x.id !== c.id) })}
                      sx={{
                        width: 40,
                        height: 40,
                        border: `1.5px solid ${colors.line}`,
                        color: "text.primary",
                      }}
                    >
                      <Icon name="x" size={18} />
                    </IconButton>
                  </Card>
                </li>
              ))}
            </Box>
          )}
          {draft.cards.length < CARD_LIMITS.max && (
            <Button
              variant="outlined"
              onClick={() => setEditing({ index: -1, card: { id: ulid() } })}
              startIcon={<Icon name="plus" size={20} />}
              sx={{ borderWidth: 2, minHeight: 52, fontSize: 17 }}
            >
              {t("builder.addCard")}
            </Button>
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
            {TILES.map((tile) => (
              <Card
                key={tile.key}
                aria-disabled="true"
                sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 0.75, minHeight: 70 }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Icon name={tile.icon} size={20} />
                  <Pill tone="soon">{t("builder.soon")}</Pill>
                </Box>
                <Typography sx={{ fontWeight: 800, textAlign: "center" }}>{t(tile.key)}</Typography>
              </Card>
            ))}
          </Box>
          {others.length > 0 && (
            <>
              <Typography component="h2" sx={label}>
                {t("builder.mine")}
              </Typography>
              <Card component="ul" sx={{ listStyle: "none", m: 0, px: 1.75, py: 0.25, gap: 0 }}>
                {others.map((l, i) => {
                  const who = l.assigned.map(nameOf).filter(Boolean);
                  return (
                    <li key={l.id}>
                      <Box
                        component={Link}
                        href={`/family/create/lesson?id=${l.id}`}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1.25,
                          py: 1.25,
                          borderTop: i ? `1px solid ${colors.line}` : 0,
                          textDecoration: "none",
                          color: "text.primary",
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800 }} noWrap>
                            {l.title}
                          </Typography>
                          <Typography sx={{ color: "text.secondary", fontSize: 13 }} noWrap>
                            {t("builder.cardsN", { n: l.cards.length })} ·{" "}
                            {who.length
                              ? t("builder.forWho", { names: who.join(", ") })
                              : t("builder.forNobody")}
                          </Typography>
                        </Box>
                        <Box sx={{ transform: "scaleX(-1)", display: "flex", flex: "none" }}>
                          <Icon name="back" size={20} />
                        </Box>
                      </Box>
                    </li>
                  );
                })}
              </Card>
            </>
          )}
          {existing && (
            <Button color="error" onClick={() => setDeleting(true)} sx={{ alignSelf: "flex-start" }}>
              {t("builder.delete")}
            </Button>
          )}
        </>
      ) : (
        <>
          <Typography component="h2" sx={label}>
            {t("builder.how")}
          </Typography>
          <Card role="radiogroup" aria-label={t("builder.how")} sx={{ px: 1.75, py: 0.25, gap: 0 }}>
            {TEMPLATES.map((tp, i) => {
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.25,
                    width: "100%",
                    py: 1.25,
                    px: 0,
                    border: 0,
                    borderTop: i ? `1px solid ${colors.line}` : 0,
                    bgcolor: "transparent",
                    textAlign: "left",
                    color: "text.primary",
                    font: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800 }}>{t(`builder.tpl.${tp}`)}</Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                      {t(`builder.tpl.${tp}Sub`)}
                    </Typography>
                    {p && (
                      <Typography sx={{ color: colors.coral.deep, fontWeight: 800, fontSize: 13 }}>
                        {t(`builder.need.${p.need}`, { n: p.n })}
                      </Typography>
                    )}
                  </Box>
                  {on && <Pill>{t("builder.chosen")}</Pill>}
                </Box>
              );
            })}
          </Card>
          {draft.template === "puzzle" && photoCards.length > 0 && (
            <Card sx={{ p: 1.75, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Field label={t("builder.question")} id="puzzle-question">
                <TextField
                  id="puzzle-question"
                  placeholder={t("builder.questionPh")}
                  value={draft.question}
                  onChange={(e) => set({ question: e.target.value })}
                  slotProps={{ htmlInput: { maxLength: LIMITS.question } }}
                  sx={inputSx}
                />
              </Field>
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
          <Typography component="h2" sx={label}>
            {t("builder.who")}
          </Typography>
          <Box role="group" aria-label={t("builder.who")} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {kids.map((k) => {
              const on = draft.assigned.includes(k.id);
              return (
                <ChoiceChip
                  key={k.id}
                  on={on}
                  onClick={() =>
                    set({
                      assigned: on ? draft.assigned.filter((x) => x !== k.id) : [...draft.assigned, k.id],
                    })
                  }
                >
                  {k.name}
                </ChoiceChip>
              );
            })}
          </Box>
          <Card sx={{ p: 1.75, display: "flex", flexDirection: "row", alignItems: "center", gap: 1.25 }}>
            <Icon name="share" size={20} />
            <Typography sx={{ color: "text.secondary", fontSize: 13, flex: 1 }}>
              {t("builder.shareSoon")}
            </Typography>
          </Card>
          <Button
            variant="outlined"
            disabled={!!problem}
            onClick={preview}
            startIcon={<Icon name="play" size={20} />}
            sx={{ borderWidth: 2, minHeight: 52, fontSize: 17 }}
          >
            {t("builder.preview")}
          </Button>
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
