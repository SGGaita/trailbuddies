"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { moderationQueue } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { ChoiceChip, Pill } from "@/components/builder/parts";
import { api } from "@/lib/account";

const ACTIONS = {
  share: ["approve", "suspend_share", "warn_creator", "suspend_creator"],
  report: ["keep", "suspend_share", "warn_creator", "suspend_creator"],
  upload: ["restore_image", "hide_image", "warn_creator"],
};
const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const ago = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600_000));

/** A photo under review: blurred until the reviewer chooses to see it. */
function ReviewPhoto({ id, status, reveal }) {
  return (
    <Box sx={{ position: "relative", width: 140 }}>
      <Box
        role="img"
        aria-label={t("mod.photo")}
        sx={{
          width: 140,
          height: 140,
          borderRadius: 4,
          bgcolor: colors.sand,
          backgroundImage: `url("${api.adminMediaUrl(id)}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: reveal ? "none" : "blur(14px)",
        }}
      />
      <Box sx={{ mt: 0.5 }}>
        <Pill tone={status === "ready" ? "ok" : "sand"}>{t(`mod.media.${status}`)}</Pill>
      </Box>
    </Box>
  );
}

/**
 * M01 Moderation queue (MOD-01…03), for the safety team only (TB_ADMIN_EMAILS). Shares waiting
 * for review, reported shares and photos the check flagged, oldest first; anything waiting
 * over 24 hours is marked overdue. Every action needs a reason and goes in the audit log.
 */
export default function ModerationQueue() {
  const [data, setData] = useState(/** @type {any} */ (null));
  const [denied, setDenied] = useState(/** @type {"" | "signin" | "forbidden" | "error"} */ (""));
  const [tab, setTab] = useState(/** @type {"open" | "closed" | "audit"} */ ("open"));
  const [selected, setSelected] = useState(/** @type {string | null} */ (null));
  const [reveal, setReveal] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    api.moderation().then(
      (d) => live && setData(d),
      (e) => live && setDenied(e.status === 401 ? "signin" : e.status === 403 ? "forbidden" : "error"),
    );
    return () => {
      live = false;
    };
  }, [reload]);

  const shell = (children) => (
    <Box component="main" sx={{ minHeight: "100dvh", bgcolor: colors.cream, color: colors.ink }}>
      <Box sx={{ bgcolor: colors.ink, color: "#fff", px: { xs: 2, sm: 4 }, py: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: 20, sm: 24 }, flex: 1 }}>
          {t("mod.title")}
        </Typography>
        <Typography sx={{ opacity: 0.8, display: { xs: "none", sm: "block" } }}>{t("mod.team")}</Typography>
      </Box>
      <Box sx={{ px: { xs: 2, sm: 4 }, py: 2.5, display: "flex", flexDirection: "column", gap: 2, maxWidth: 1400, mx: "auto" }}>
        {children}
      </Box>
    </Box>
  );

  if (denied)
    return shell(
      <Alert severity={denied === "error" ? "warning" : "info"} sx={{ borderRadius: 4 }}>
        {t(`mod.denied.${denied}`)}{" "}
        {denied === "signin" && <Link href="/start/account">{t("mod.signIn")}</Link>}
      </Alert>,
    );
  if (!data) return shell(<Typography>{t("mod.loading")}</Typography>);

  const queue = moderationQueue(data.items);
  const list = tab === "open" ? queue : data.closed;
  const item = list.find((i) => i.id === selected) || (tab !== "audit" ? list[0] : null);
  const overdue = queue.filter((i) => i.overdue).length;

  const act = async (action, mediaId) => {
    if (reason.trim().length < 3) return setNote(t("mod.needReason"));
    try {
      await api.moderate(item.id, { action, reason: reason.trim(), ...(mediaId ? { media_id: mediaId } : {}) });
      setNote(t(`mod.done.${action}`));
      setReason("");
      setReveal(false);
      setSelected(null);
      setReload((n) => n + 1);
    } catch (e) {
      setNote(e.message);
    }
  };

  return shell(
    <>
      <Typography sx={{ color: "text.secondary" }} role="status">
        {t("mod.summary", { n: queue.length })}
        {overdue ? ` · ${t("mod.overdueN", { n: overdue })}` : ""}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }} role="group" aria-label={t("mod.view")}>
        {["open", "closed", "audit"].map((k) => (
          <ChoiceChip
            key={k}
            on={tab === k}
            onClick={() => {
              setTab(k);
              setSelected(null);
              setReveal(false);
            }}
          >
            {t(`mod.tab.${k}`)}
          </ChoiceChip>
        ))}
      </Box>
      {note && (
        <Alert severity="info" onClose={() => setNote("")} sx={{ borderRadius: 4 }}>
          {note}
        </Alert>
      )}

      {tab === "audit" ? (
        <Card sx={{ p: 0, overflowX: "auto" }}>
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", "& td, & th": { p: 1.25, textAlign: "left", borderBottom: `1px solid ${colors.line}`, fontSize: 14 } }}>
            <thead>
              <tr>
                <th>{t("mod.col.when")}</th>
                <th>{t("mod.col.who")}</th>
                <th>{t("mod.col.what")}</th>
                <th>{t("mod.col.target")}</th>
                <th>{t("mod.col.why")}</th>
              </tr>
            </thead>
            <tbody>
              {data.audit.map((a) => (
                <tr key={a.id}>
                  <td>{when(a.at)}</td>
                  <td>{a.who}</td>
                  <td>{t(`mod.action.${a.action}`)}</td>
                  <td style={{ fontFamily: "ui-monospace, monospace" }}>{a.target}</td>
                  <td>{a.why}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Card>
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(0, 1.25fr)" }, alignItems: "start" }}>
          <Card sx={{ p: 0.75, display: "flex", flexDirection: "column", gap: 0.5 }}>
            {list.length === 0 && <Typography sx={{ p: 1.5 }}>{t("mod.empty")}</Typography>}
            {list.map((i) => {
              const on = item?.id === i.id;
              return (
                <Box
                  key={i.id}
                  component="button"
                  type="button"
                  data-item={i.id}
                  aria-pressed={on}
                  onClick={() => {
                    setSelected(i.id);
                    setReveal(false);
                  }}
                  sx={{
                    textAlign: "left",
                    border: `2px solid ${on ? colors.leaf.deep : "transparent"}`,
                    bgcolor: on ? colors.leaf.soft : "transparent",
                    borderRadius: 3.5,
                    p: 1.25,
                    display: "flex",
                    gap: 1.25,
                    alignItems: "center",
                    font: "inherit",
                    color: "text.primary",
                    cursor: "pointer",
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800 }}>{t(`mod.kind.${i.kind}`)}</Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 14 }} noWrap>
                      {(i.share?.title || i.reason_text) + ` · ${t("mod.hoursAgo", { n: ago(i.created_at) })}`}
                    </Typography>
                  </Box>
                  {i.status === "open" ? (
                    <Pill tone={i.overdue ? "sand" : "ok"}>{i.overdue ? t("mod.overdue") : t("mod.open")}</Pill>
                  ) : (
                    <Pill tone="sand">{t(`mod.outcome.${i.outcome}`)}</Pill>
                  )}
                </Box>
              );
            })}
          </Card>

          {item && (
            <Card
              data-testid="mod-detail"
              sx={{ p: { xs: 2, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 1.5, borderColor: item.overdue ? colors.coral.main : undefined }}
            >
              <Box sx={{ display: "flex", gap: 1, alignItems: "baseline", flexWrap: "wrap" }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 800, flex: 1 }}>
                  {item.share?.title || t(`mod.kind.${item.kind}`)}
                </Typography>
                {item.share && <Typography sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 800 }}>{item.share.code}</Typography>}
              </Box>
              {item.overdue && <Alert severity="warning">{t("mod.overdueSub")}</Alert>}
              <Box component="dl" sx={{ m: 0, display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.75, "& dt": { color: "text.secondary" }, "& dd": { m: 0, fontWeight: 700 } }}>
                <dt>{t("mod.reason")}</dt>
                <dd>{item.reason_text}</dd>
                {item.reports > 0 && (
                  <>
                    <dt>{t("mod.reports")}</dt>
                    <dd>
                      {t("mod.reportsN", { n: item.reports })} (
                      {Object.entries(item.report_reasons)
                        .map(([k, v]) => `${t(`report.reason.${k}`)} ${v}`)
                        .join(", ")}
                      )
                    </dd>
                  </>
                )}
                <dt>{t("mod.uploaded")}</dt>
                <dd>{when(item.uploaded_at)}</dd>
                {item.share && (
                  <>
                    <dt>{t("mod.status")}</dt>
                    <dd>{t(`share.state.${item.share.status}`)}</dd>
                    <dt>{t("mod.imports")}</dt>
                    <dd>{item.share.imports}</dd>
                    <dt>{t("mod.checklist")}</dt>
                    <dd>
                      {t("mod.checklistSays", {
                        faces: item.share.checklist.not_child?.length || 0,
                        removed: item.share.checklist.removed?.length || 0,
                      })}
                    </dd>
                  </>
                )}
                {item.scan && (
                  <>
                    <dt>{t("mod.scan")}</dt>
                    <dd>
                      {Object.entries(item.scan.scores || {})
                        .map(([k, v]) => `${k} ${Math.round(v * 100)}%`)
                        .join(", ")}
                    </dd>
                  </>
                )}
              </Box>
              {item.share?.package?.lessons?.length > 0 && (
                <Typography sx={{ color: "text.secondary" }}>
                  {item.share.package.lessons.map((l) => `${l.title}: ${l.cards.map((c) => c.label).join(", ")}`).join(" · ")}
                </Typography>
              )}
              {item.photos.length > 0 && (
                <>
                  <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                    {item.photos.map((p) => (
                      <Box key={p.id} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                        <ReviewPhoto id={p.id} status={p.status} reveal={reveal} />
                        {item.kind !== "upload" && item.status === "open" && (
                          <Button size="small" variant="outlined" onClick={() => act(p.status === "hidden" ? "restore_image" : "hide_image", p.id)}>
                            {p.status === "hidden" ? t("mod.action.restore_image") : t("mod.action.hide_image")}
                          </Button>
                        )}
                      </Box>
                    ))}
                  </Box>
                  {!reveal && (
                    <Button size="small" onClick={() => setReveal(true)} sx={{ alignSelf: "flex-start" }}>
                      {t("mod.show")}
                    </Button>
                  )}
                </>
              )}
              {item.status === "open" && (
                <>
                  <TextField
                    label={t("mod.why")}
                    helperText={t("mod.whySub")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value.slice(0, 300))}
                    multiline
                    minRows={2}
                  />
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    {ACTIONS[item.kind].map((a, n) => (
                      <Button
                        key={a}
                        variant={n === 0 ? "contained" : "outlined"}
                        color={a.startsWith("suspend") || a === "hide_image" ? "error" : "primary"}
                        onClick={() => act(a)}
                      >
                        {t(`mod.action.${a}`)}
                      </Button>
                    ))}
                  </Box>
                  <Typography sx={{ color: "text.secondary", fontSize: 14 }}>{t("mod.tellNote")}</Typography>
                </>
              )}
            </Card>
          )}
        </Box>
      )}
    </>,
  );
}
