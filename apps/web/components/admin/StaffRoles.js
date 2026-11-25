"use client";
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { STAFF_ROLES } from "@trailbuddies/domain";
import { t } from "@trailbuddies/i18n";
import { colors } from "@trailbuddies/tokens";
import { ChoiceChip, Field, Pill, inputSx } from "@/components/builder/parts";
import { api } from "@/lib/account";
import { StaffHead, useStaff } from "./StaffShell";

const when = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "");
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** What a log entry says, in plain words. */
function logLine(x) {
  const d = x.detail || {};
  const role = (r) => t(`staff.role.${r}`);
  const text = {
    staff_add: () => t("staff.log.add", { who: x.target, role: role(d.role) }),
    staff_role: () => t("staff.log.role", { who: x.target, role: role(d.to) }),
    staff_remove: () => t("staff.log.remove", { who: x.target }),
    content_import: () => t("staff.log.import"),
    content_publish: () => t(d.self_published ? "staff.log.publishOwn" : "staff.log.publish", { v: x.target.slice(1) }),
    content_rollback: () => t("staff.log.rollback", { v: x.target.slice(1), to: d.to }),
    draft_submit: () => t("staff.log.submit", { v: x.target.slice(1) }),
    draft_approve: () => t("staff.log.approve", { v: x.target.slice(1) }),
    draft_return: () => t("staff.log.return", { v: x.target.slice(1) }),
    draft_reopened: () => t("staff.log.reopened", { v: x.target.slice(1) }),
    trail_add: () => t("staff.log.trailAdd", { name: d.name || x.target }),
    trail_change: () => t(d.archived ? "staff.log.trailArchive" : "staff.log.trailChange", { name: x.target }),
    map_order: () => t("staff.log.mapOrder"),
    unit_add: () => t("staff.log.unitAdd", { unit: x.target }),
    badge_save: () => t(d.retired ? "staff.log.badgeRetire" : "staff.log.badgeSave", { badge: x.target }),
    badges_import: () => t("staff.log.badgesImport"),
    unit_save: () => t("staff.log.save", { unit: x.target }),
    draft_discard: () => t("staff.log.discard"),
    asset_upload: () => t("staff.log.upload"),
    asset_approved: () => t("staff.log.approved"),
    asset_refused: () => t("staff.log.refused"),
  }[x.action];
  return text ? text() : x.action;
}

/**
 * E01 Staff & roles (CMS-01): admins add staff by email with a role, change or remove it; every
 * change goes in the audit log. People in TB_ADMIN_EMAILS are admins and are changed on Vercel.
 */
export default function StaffRoles() {
  const me = useStaff();
  const [data, setData] = useState(/** @type {any} */ (null));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [note, setNote] = useState(/** @type {{ tone: "success" | "error", text: string } | null} */ (null));
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    api.staff().then(
      (d) => live && setData(d),
      (e) => live && setNote({ tone: "error", text: e.message }),
    );
    return () => {
      live = false;
    };
  }, [reload]);

  const run = async (fn, ok) => {
    try {
      await fn();
      setNote({ tone: "success", text: ok });
      setReload((n) => n + 1);
    } catch (e) {
      setNote({ tone: "error", text: e.message });
    }
  };

  const add = (e) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!EMAIL.test(v)) return setNote({ tone: "error", text: t("staff.needEmail") });
    run(() => api.addStaff({ email: v, role }), t("staff.added", { email: v, role: t(`staff.role.${role}`) })).then(() => setEmail(""));
  };

  return (
    <>
      <StaffHead title={t("staff.title")} sub={data ? t("staff.sub", { n: data.staff.length }) : ""} />
      {note && (
        <Alert severity={note.tone} onClose={() => setNote(null)} sx={{ borderRadius: 4 }} role="status">
          {note.text}
        </Alert>
      )}
      <Box sx={{ display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.6fr) minmax(0, 1fr)" }, alignItems: "start" }}>
        <Card sx={{ p: 0, overflowX: "auto" }}>
          <Box
            component="table"
            sx={{
              width: "100%",
              minWidth: 560, // on a phone the table scrolls inside its card, not one letter per line
              borderCollapse: "collapse",
              fontSize: 14,
              "& th": { bgcolor: colors.sand, textAlign: "left", p: 1.25, whiteSpace: "nowrap" },
              "& td": { p: 1.25, borderTop: `1px solid ${colors.line}`, verticalAlign: "middle" },
            }}
          >
            <thead>
              <tr>
                <th>{t("staff.col.email")}</th>
                <th>{t("staff.col.role")}</th>
                <th>{t("staff.col.seen")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(data?.staff || []).map((p) => (
                <tr key={p.email} data-staff={p.email}>
                  <td>
                    <b>{p.name || p.email.split("@")[0]}</b>
                    <br />
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      {p.email}
                    </Box>
                  </td>
                  <td>
                    {p.bootstrap ? (
                      <Pill tone="sky">{t("staff.role.admin")}</Pill>
                    ) : (
                      <TextField
                        select
                        size="small"
                        value={p.role}
                        aria-label={t("staff.roleFor", { email: p.email })}
                        onChange={(e) => run(() => api.changeStaffRole(p.email, e.target.value), t("staff.changed", { email: p.email, role: t(`staff.role.${e.target.value}`) }))}
                        sx={{ ...inputSx, minWidth: 140, "& .MuiOutlinedInput-root": { minHeight: 40 } }}
                      >
                        {STAFF_ROLES.map((r) => (
                          <MenuItem key={r} value={r}>
                            {t(`staff.role.${r}`)}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </td>
                  <td style={{ color: colors.muted, whiteSpace: "nowrap" }}>
                    {p.bootstrap ? t("staff.fromSettings") : p.seen_at ? when(p.seen_at) : t("staff.notYet")}
                  </td>
                  <td>
                    {!p.bootstrap && p.email !== me?.email && (
                      <Button size="small" color="error" onClick={() => run(() => api.removeStaff(p.email), t("staff.removed", { email: p.email }))}>
                        {t("staff.remove")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Card>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
          <Card component="form" onSubmit={add} sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{t("staff.addTitle")}</Typography>
            <Field label={t("staff.col.email")} id="staff-email">
              <TextField id="staff-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@trailbuddies.africa" sx={inputSx} />
            </Field>
            <Field label={t("staff.col.role")} id="staff-role">
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }} role="group" id="staff-role">
                {["editor", "reviewer", "moderator", "admin"].map((r) => (
                  <ChoiceChip key={r} on={role === r} onClick={() => setRole(r)}>
                    {t(`staff.role.${r}`)}
                  </ChoiceChip>
                ))}
              </Box>
            </Field>
            <Button type="submit" variant="contained">
              {t("staff.add")}
            </Button>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{t("staff.addNote")}</Typography>
          </Card>
          <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 0.75 }}>
            <Typography sx={{ fontWeight: 800 }}>{t("staff.whatTitle")}</Typography>
            {STAFF_ROLES.map((r) => (
              <Typography key={r} sx={{ fontSize: 14 }}>
                <b>{t(`staff.role.${r}`)}:</b> {t(`staff.what.${r}`)}
              </Typography>
            ))}
          </Card>
          <Card sx={{ p: 2.25, display: "flex", flexDirection: "column", gap: 0.75 }} data-testid="audit-log">
            <Typography sx={{ fontWeight: 800 }}>{t("staff.logTitle")}</Typography>
            {(data?.log || []).slice(0, 12).map((x) => (
              <Box key={x.id} sx={{ display: "flex", gap: 1, justifyContent: "space-between", fontSize: 14 }}>
                <span>
                  {logLine(x)} <Box component="span" sx={{ color: "text.secondary" }}>· {x.who}</Box>
                </span>
                <Box component="span" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                  {when(x.at)}
                </Box>
              </Box>
            ))}
            {data && !data.log.length && <Typography sx={{ color: "text.secondary", fontSize: 14 }}>{t("staff.logEmpty")}</Typography>}
          </Card>
        </Box>
      </Box>
    </>
  );
}
