"use client";
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { can, reviewActions, ruleText } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { Field, Pill, inputSx } from "@/components/builder/parts";
import { api } from "@/lib/account";
import { STATUS_TONE } from "./DraftBanner";
import StaffDialog from "./StaffDialog";
import { StaffHead, useStaff } from "./StaffShell";

const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

/** One side of a unit: what a reviewer needs to judge it. */
function UnitSide({ u, other }) {
  if (!u) return <Typography sx={{ color: "text.secondary" }}>{t("cms.rv.nothing")}</Typography>;
  const was = new Map((other?.items || []).map((i) => [i.id, i]));
  const mark = (i) => {
    const o = was.get(i.id);
    return !other ? false : !o || ["label", "say", "fact", "emoji", "image"].some((k) => (o[k] || "") !== (i[k] || ""));
  };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, fontSize: 14 }}>
      <b>{u.title}</b>
      <span style={{ color: colors.muted }}>
        {t(`band.${u.band}`)} · {t(`cms.status.${u.status}`)}
      </span>
      {u.summary && <span>{u.summary}</span>}
      <Box component="ul" sx={{ m: 0, pl: 2.25 }}>
        {u.items.map((i) => (
          <Box component="li" key={i.id} sx={mark(i) ? { bgcolor: colors.sun.soft, borderRadius: 1.5 } : null}>
            {i.emoji} <b>{i.label}</b>
            {i.fact ? ` · ${i.fact}` : ""}
          </Box>
        ))}
      </Box>
      <span style={{ color: colors.muted }}>
        {u.lessons.map((l) => `${l.title} (${l.exercises.length})`).join(" · ")}
      </span>
    </Box>
  );
}

function MapSide({ cat }) {
  if (!cat) return null;
  return (
    <Box component="ol" sx={{ m: 0, pl: 2.5, fontSize: 14 }}>
      {cat.subjects.map((s) => (
        <li key={s.id} style={s.archived ? { opacity: 0.55 } : null}>
          <b>{s.name}</b> {s.archived && <Pill tone="bad">{t("cms.map.archived")}</Pill>}
          <br />
          <span style={{ color: colors.muted }}>{s.units.map((e) => e.title).join(" · ")}</span>
        </li>
      ))}
    </Box>
  );
}

function BadgeSide({ list, other }) {
  if (!list) return null;
  const was = new Map((other || []).map((b) => [b.id, JSON.stringify(b)]));
  const changed = list.filter((b) => was.get(b.id) !== JSON.stringify(b));
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.25, fontSize: 14 }}>
      {(other ? changed : list.filter((b) => !was.has(b.id))).map((b) => (
        <li key={b.id}>
          {b.icon} <b>{b.name}</b> {b.retired && <Pill tone="bad">{t("cms.bd.retired")}</Pill>}
          <br />
          <span style={{ color: colors.muted }}>
            {b.how} · {ruleText(b.rule)}
          </span>
        </li>
      ))}
    </Box>
  );
}

/** CMS-06: each changed document, published on the left and the draft on the right. */
function SideBySide({ doc }) {
  const title = doc.kind === "unit" ? doc.after.title : doc.kind === "catalogue" ? t("cms.rv.map") : doc.kind === "badges" ? t("cms.rv.badges") : null;
  if (!title) return null; // asset lists show through the unit's pictures
  const sides =
    doc.kind === "unit"
      ? [<UnitSide key="b" u={doc.before} />, <UnitSide key="a" u={doc.after} other={doc.before} />]
      : doc.kind === "catalogue"
        ? [<MapSide key="b" cat={doc.before} />, <MapSide key="a" cat={doc.after} />]
        : [<BadgeSide key="b" list={(doc.before || []).filter((b) => doc.after.some((x) => x.id === b.id && JSON.stringify(x) !== JSON.stringify(b)))} />, <BadgeSide key="a" list={doc.after} other={doc.before} />];
  return (
    <Box sx={{ border: `2px solid ${colors.line}`, borderRadius: 4.5, p: 1.5, display: "flex", flexDirection: "column", gap: 1 }} data-doc={`${doc.kind}:${doc.key}`}>
      <Typography sx={{ fontWeight: 800 }}>
        {title}{" "}
        <Box component="span" sx={{ color: "text.secondary", fontWeight: 400, fontSize: 13 }}>
          · {t("cms.rv.by", { who: doc.by })}
        </Box>
      </Typography>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "text.secondary", mb: 0.5 }}>{t("cms.rv.before")}</Typography>
          {sides[0]}
        </Box>
        <Box sx={{ borderLeft: { sm: `2px solid ${colors.line}` }, pl: { sm: 1.5 } }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: colors.leaf.deep, mb: 0.5 }}>{t("cms.rv.after")}</Typography>
          {sides[1]}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * E05 Review & publish (CMS-06, CMS-07). An editor submits the draft; a reviewer or admin who
 * didn't work on it approves it or sends it back with a comment; an admin publishes it. Any
 * earlier version can be published again (roll back), as a new version.
 */
export default function ReviewPublish() {
  const me = useStaff();
  const [data, setData] = useState(/** @type {any} */ (null));
  const [detail, setDetail] = useState(/** @type {any} */ (null));
  const [versions, setVersions] = useState(/** @type {any[]} */ ([]));
  const [text, setText] = useState("");
  const [msg, setMsg] = useState(/** @type {{ tone: "success" | "error" | "info", text: string, problems?: string[] } | null} */ (null));
  const [busy, setBusy] = useState(false);
  const [rollTo, setRollTo] = useState(/** @type {any} */ (null));
  const [rollNote, setRollNote] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    Promise.all([api.content(), api.contentVersions()]).then(
      async ([c, v]) => {
        const d = c.draft ? await api.contentReview().catch(() => null) : null;
        if (!live) return;
        setData(c);
        setVersions(v.versions);
        setDetail(d);
      },
      (e) => live && setMsg({ tone: "error", text: e.message }),
    );
    return () => {
      live = false;
    };
  }, [reload]);

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
      setText("");
      setReload((n) => n + 1);
    } catch (e) {
      setMsg({ tone: "error", text: e.message, problems: e.problems });
    }
    setBusy(false);
  };

  const draft = data?.draft;
  const acts = reviewActions(draft, me);
  const needText = (min = 3) => {
    if (text.trim().length < min) {
      setMsg({ tone: "error", text: t("cms.needNote") });
      return false;
    }
    return true;
  };

  return (
    <>
      <StaffHead title={t("cms.rv.title")} sub={data?.live ? t("cms.rv.sub", { v: data.live.version }) : ""} />
      {msg && (
        <Alert severity={msg.tone} onClose={() => setMsg(null)} sx={{ borderRadius: 4 }} role="status">
          {msg.text}
          {msg.problems?.length > 0 && (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {msg.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </Box>
          )}
        </Alert>
      )}
      <Box sx={{ display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.6fr) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.5 }} data-testid="review-draft">
          {!data ? (
            <Typography>{t("staff.loading")}</Typography>
          ) : !draft ? (
            <>
              <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{t("cms.rv.noDraft")}</Typography>
              <Typography sx={{ color: "text.secondary" }}>{t("cms.rv.noDraftBody", { v: (data.live?.version || 0) + 1 })}</Typography>
            </>
          ) : (
            <>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Typography sx={{ fontWeight: 800, fontSize: 20, flex: 1 }}>{t("cms.versionN", { v: draft.version })}</Typography>
                <Pill tone={draft.status === "draft" && draft.review_note ? "bad" : STATUS_TONE[draft.status]}>
                  {t(draft.status === "draft" && draft.review_note ? "cms.state.returned" : `cms.state.${draft.status}`)}
                </Pill>
              </Box>
              <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                {t("cms.rv.who", { who: draft.authors.join(", ") })}
                {draft.submitted_by && ` · ${t("cms.rv.submitted", { who: draft.submitted_by })}`}
                {draft.approved_by && ` · ${t("cms.rv.approved", { who: draft.approved_by })}`}
              </Typography>
              {draft.note && <Typography>“{draft.note}”</Typography>}
              {draft.review_note && draft.status === "draft" && (
                <Alert severity="warning" sx={{ borderRadius: 4 }}>
                  {t("cms.reviewerSaid", { comment: draft.review_note })}
                </Alert>
              )}
              {(detail?.docs || []).map((d) => (
                <SideBySide key={`${d.kind}:${d.key}`} doc={d} />
              ))}

              {(acts.submit || acts.approve || acts.sendBack || acts.publish) && (
                <TextField
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  multiline
                  minRows={2}
                  placeholder={t(acts.submit ? "cms.rv.submitPh" : acts.publish ? "cms.rv.publishPh" : "cms.rv.commentPh")}
                  slotProps={{ htmlInput: { "aria-label": t(acts.submit ? "cms.rv.whatChanged" : acts.publish ? "cms.note" : "cms.rv.comment"), maxLength: 300 } }}
                  sx={inputSx}
                />
              )}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                {acts.why === "own" && <Typography sx={{ color: "text.secondary", fontSize: 14, flex: 1 }}>{t("cms.rv.own")}</Typography>}
                {draft.status === "submitted" && !can(me.role, "review") && <Typography sx={{ color: "text.secondary", fontSize: 14, flex: 1 }}>{t("cms.rv.waiting")}</Typography>}
                {draft.status === "approved" && !acts.publish && <Typography sx={{ color: "text.secondary", fontSize: 14, flex: 1 }}>{t("cms.rv.adminPublishes")}</Typography>}
                {can(me.role, "edit") && (
                  <Button color="error" disabled={busy} onClick={() => run(() => api.discardDraft(), t("cms.discarded"))}>
                    {t("cms.discard")}
                  </Button>
                )}
                {acts.sendBack && (
                  <Button variant="outlined" disabled={busy} onClick={() => needText() && run(() => api.reviewContent(false, text.trim()), t("cms.rv.sentBack"))}>
                    {t("cms.rv.sendBack")}
                  </Button>
                )}
                {acts.approve && (
                  <Button variant="contained" disabled={busy} onClick={() => run(() => api.reviewContent(true, text.trim() || undefined), t("cms.rv.approvedMsg"))}>
                    {t("cms.rv.approve")}
                  </Button>
                )}
                {acts.submit && (
                  <Button variant="contained" disabled={busy || !draft.changes.length} onClick={() => needText() && run(() => api.submitContent(text.trim()), t("cms.rv.submittedMsg"))}>
                    {t("cms.rv.submit")}
                  </Button>
                )}
                {acts.publish && (
                  <Button
                    variant="contained"
                    disabled={busy}
                    onClick={() => run(() => api.publishContent(text.trim() || draft.note), t("cms.published", { v: draft.version }))}
                  >
                    {t("cms.publish")}
                  </Button>
                )}
              </Box>
            </>
          )}
        </Card>

        <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 0.5 }} data-testid="versions">
          <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{t("cms.rv.history")}</Typography>
          {versions
            .filter((v) => v.status === "published")
            .map((v) => (
              <Box key={v.version} data-version={v.version} sx={{ display: "flex", gap: 1, alignItems: "center", py: 1, borderTop: `1px solid ${colors.line}` }}>
                <Box sx={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                  <b>v{v.version}</b> · {v.note || ""}
                  <br />
                  <Box component="span" sx={{ color: "text.secondary", fontSize: 13 }}>
                    {when(v.published_at)} · {v.rolled_back_from ? t("cms.rv.rolledBack", { v: v.rolled_back_from, who: v.published_by }) : t("cms.rv.line", { who: v.authors.join(", ") || v.created_by, approved: v.approved_by || "—", published: v.published_by })}
                  </Box>
                </Box>
                {v.live ? (
                  <Pill tone="ok">{t("cms.live")}</Pill>
                ) : (
                  can(me.role, "publish") && (
                    <Button size="small" variant="outlined" disabled={!!draft} title={draft ? t("cms.rv.draftFirst") : undefined} onClick={() => (setRollTo(v), setRollNote(""))}>
                      {t("cms.rv.rollBack")}
                    </Button>
                  )
                )}
              </Box>
            ))}
          {draft && can(me.role, "publish") && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{t("cms.rv.draftFirst")}</Typography>}
        </Card>
      </Box>

      {rollTo && (
        <StaffDialog
          size="xs"
          title={t("cms.rv.rollTitle", { v: rollTo.version })}
          onClose={() => setRollTo(null)}
          onSubmit={(e) => {
            e.preventDefault();
            if (rollNote.trim().length < 3) return;
            const v = rollTo.version;
            setRollTo(null);
            run(() => api.rollbackContent(v, rollNote.trim()), t("cms.rv.rolled", { v }));
          }}
          actions={
            <>
              <Button color="inherit" onClick={() => setRollTo(null)}>
                {t("cms.cancel")}
              </Button>
              <Button type="submit" variant="contained" disabled={busy || rollNote.trim().length < 3}>
                {t("cms.rv.rollGo", { v: rollTo.version })}
              </Button>
            </>
          }
        >
          <Box sx={{ p: 1.5, borderRadius: 4.5, bgcolor: colors.cream, border: `2px solid ${colors.line}`, fontSize: 14 }}>
            <b>v{rollTo.version}</b> · {rollTo.note || ""}
            <br />
            <Box component="span" sx={{ color: "text.secondary" }}>
              {when(rollTo.published_at)} · {t("cms.rv.publishedBy", { who: rollTo.published_by })}
            </Box>
          </Box>
          <Typography sx={{ color: "text.secondary" }}>{t("cms.rv.rollBody", { v: rollTo.version })}</Typography>
          <Field label={t("cms.rv.why")} id="roll-why">
            <TextField
              id="roll-why"
              autoFocus
              value={rollNote}
              onChange={(e) => setRollNote(e.target.value)}
              placeholder={t("cms.rv.rollPh")}
              helperText={t("cms.rv.rollHint")}
              slotProps={{ htmlInput: { maxLength: 300 } }}
              sx={inputSx}
            />
          </Field>
        </StaffDialog>
      )}
    </>
  );
}
