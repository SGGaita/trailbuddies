"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getReadyUnits } from "@trailbuddies/content";
import { DIFFICULTY_SETTINGS, describeLevel } from "@trailbuddies/domain";
import { useFamily, useHydrated, useLearners } from "@/lib/store";
import { api, signOut, signOutEverywhere, syncNow } from "@/lib/account";
import { LearnersSection, PrivacySection, BetaSection } from "./PrivacySettings";
import FamilyShell from "@/components/shell/FamilyShell";
import LearnerAvatar from "@/components/LearnerAvatar";
import Loading from "@/components/Loading";
import { FamilySettingsForm, PinSetup } from "@/components/SettingsForm";
import { CountrySection, DevicesSection, OfflineSection, SubjectLocks } from "@/components/screens/SettingsSections";

const Section = ({ title, sub, children }) => (
  <Card sx={{ p: { xs: 2, sm: 3 } }}>
    <Typography variant="h6" component="h2">
      {title}
    </Typography>
    {sub && <Typography sx={{ color: "text.secondary", mb: 1.5 }}>{sub}</Typography>}
    {children}
  </Card>
);

/** Account and sync status for this device. */
function AccountSection() {
  const router = useRouter();
  const mode = useFamily((s) => s.mode);
  const user = useFamily((s) => s.user);
  const sync = useFamily((s) => s.sync);
  const clear = useFamily((s) => s.clear);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  if (mode === "demo")
    return (
      <Section title={t("settings.account")} sub={t("settings.demo")}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            onClick={() => {
              clear();
              router.push("/start/account");
            }}
          >
            {t("start.parent")}
          </Button>
          <Button
            onClick={() => {
              clear();
              router.push("/start");
            }}
          >
            {t("settings.leaveDemo")}
          </Button>
        </Box>
      </Section>
    );
  const status =
    sync.state === "syncing"
      ? t("settings.syncing")
      : sync.state === "offline"
        ? t("settings.offline")
        : t("settings.sync");
  return (
    <Section
      title={t("settings.account")}
      sub={user ? `${t("settings.signedInAs", { email: user.email })}${user.google ? ` · ${t("settings.googleLinked")}` : ""}` : ""}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }} role="status">
        <Box
          aria-hidden="true"
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: sync.state === "offline" ? colors.warn.main : colors.leaf.main,
          }}
        />
        <Typography sx={{ fontWeight: 700 }}>{status}</Typography>
        {sync.pending > 0 && (
          <Typography sx={{ color: "text.secondary" }}>
            · {t("settings.pending", { n: sync.pending })}
          </Typography>
        )}
        <Button size="small" onClick={() => syncNow()}>
          ↻
        </Button>
      </Box>
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          variant="outlined"
          sx={{ borderWidth: 2 }}
          onClick={async () => {
            await signOut();
            router.push("/start");
          }}
        >
          {t("settings.signOut")}
        </Button>
        <Button onClick={() => setConfirm(true)}>{t("settings.signOutAll")}</Button>
      </Box>
      <Dialog open={confirm} onClose={() => setConfirm(false)}>
        <DialogTitle>{t("settings.signOutAll")}?</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("settings.signOutAllSub")}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(false)}>{t("settings.cancel")}</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                await signOutEverywhere();
                router.push("/start");
              } catch (e) {
                setConfirm(false);
                setError(e.message);
              }
            }}
          >
            {t("settings.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
      {error && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
    </Section>
  );
}

/** Plan and learner limit. */
function PlanSection() {
  const family = useFamily((s) => s.family);
  const mode = useFamily((s) => s.mode);
  if (mode !== "account") return null;
  return (
    <Section title={t("settings.plan")} sub={t("settings.planBeta")}>
      <Typography sx={{ fontWeight: 800 }}>
        {t("settings.planLine", { plan: family?.plan || "Family", limit: family?.learner_limit ?? 6 })}
      </Typography>
    </Section>
  );
}

/** Second parent (equal access) or carer (view progress only), invited by email. */
function GrownUpsSection() {
  const family = useFamily((s) => s.family);
  const mode = useFamily((s) => s.mode);
  const [data, setData] = useState(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("parent");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const id = family?.id;
  const reload = () =>
    api
      .members(id)
      .then(setData)
      .catch((e) => setError(e.message));
  useEffect(() => {
    if (mode !== "account" || !id) return;
    api
      .members(id)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [mode, id]);
  if (mode !== "account" || !id) return null;
  const manager = family.role === "owner" || family.role === "parent";
  const invite = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.invite(id, { email: email.trim(), role });
      setEmail("");
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const act = async (fn) => {
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Section title={t("settings.grownUps")} sub={t("settings.grownUpsSub")}>
      <Box
        component="ul"
        sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}
      >
        {(data?.members || []).map((m) => (
          <Box
            component="li"
            key={m.user_id}
            sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
          >
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {m.name || m.email} {m.you && <Chip size="small" label={t("settings.you")} />}
              </Typography>
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                {m.email} · {t(`settings.role.${m.role}`)}
              </Typography>
            </Box>
            {manager && m.role !== "owner" && !m.you && (
              <Button size="small" onClick={() => act(() => api.removeMember(id, m.user_id))}>
                {t("settings.removeGrownUp", { name: m.name || m.email })}
              </Button>
            )}
          </Box>
        ))}
        {(data?.invites || []).map((i) => (
          <Box
            component="li"
            key={i.id}
            sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}
          >
            <Box sx={{ flex: 1, minWidth: 180 }}>
              <Typography sx={{ fontWeight: 800 }}>{i.email}</Typography>
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                {t("settings.invited")} · {t(`settings.role.${i.role}`)}
              </Typography>
            </Box>
            {manager && (
              <Button size="small" onClick={() => act(() => api.cancelInvite(id, i.id))}>
                {t("settings.cancel")}
              </Button>
            )}
          </Box>
        ))}
      </Box>
      {error && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
      {manager && (
        <Box
          component="form"
          onSubmit={invite}
          sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}
          noValidate
        >
          <TextField
            label={t("settings.inviteEmail")}
            type="email"
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ flex: 1, minWidth: 220 }}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={role}
            onChange={(_, v) => v && setRole(v)}
            aria-label="Role"
          >
            <ToggleButton value="parent" sx={{ fontWeight: 800 }}>
              {t("settings.roleParent")}
            </ToggleButton>
            <ToggleButton value="viewer" sx={{ fontWeight: 800 }}>
              {t("settings.roleViewer")}
            </ToggleButton>
          </ToggleButtonGroup>
          <Button type="submit" variant="contained" disabled={busy || !email.trim()}>
            {t("settings.invite")}
          </Button>
        </Box>
      )}
    </Section>
  );
}

/**
 * P11 Settings: account and sync, family settings (goal, limit, bedtime, voice, sound),
 * the grown-up PIN, and each learner's difficulty (Auto or a fixed level 1–3).
 */
export default function FamilySettings() {
  const ready = useHydrated();
  const family = useFamily((s) => s.family);
  const setDifficulty = useFamily((s) => s.setDifficulty);
  const learners = useLearners();
  const viewer = family?.role === "viewer";
  if (!ready) return <Loading />;
  const subjects = getSubjects().filter((s) => getReadyUnits(s.id).length);

  return (
    <FamilyShell title={t("nav.settings")} family={family} active="/family/settings" back="/family">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 760 }}>
        <AccountSection />
        {viewer && <Alert severity="info">{t("settings.viewerNote")}</Alert>}
        {!viewer && (
          <>
            <Section title={t("start.settingsTitle")}>
              <FamilySettingsForm />
            </Section>
            <Card sx={{ p: { xs: 2, sm: 3 } }}>
              <PinSetup />
            </Card>
          </>
        )}
        <PlanSection />
        <CountrySection />
        <DevicesSection />
        <OfflineSection />
        <GrownUpsSection />
        <LearnersSection disabled={viewer} />
        <Section title={t("settings.difficulty")} sub={t("settings.difficultySub")}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {learners.map((l) => (
              <Box
                key={l.id}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 1.5,
                  pb: 2,
                  borderBottom: `1px solid ${colors.line}`,
                  "&:last-of-type": { borderBottom: 0, pb: 0 },
                }}
              >
                <LearnerAvatar learner={l} size={44} />
                <Box sx={{ flex: 1, minWidth: 140 }}>
                  <Typography sx={{ fontWeight: 800 }}>{l.name}</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                    {subjects
                      .map(
                        (s) =>
                          `${s.name}: ${t("settings.levelNow", { level: describeLevel(l.levelFor(s.id)) })}`,
                      )
                      .join(" · ")}
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={l.difficulty || "auto"}
                  onChange={(_, v) => v && setDifficulty(l.id, v)}
                  disabled={viewer}
                  aria-label={`${t("settings.difficulty")} for ${l.name}`}
                >
                  {DIFFICULTY_SETTINGS.map((d) => (
                    <ToggleButton key={d} value={d} sx={{ minWidth: 52, minHeight: 44, fontWeight: 800 }}>
                      {d === "auto" ? t("settings.auto") : d}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                <SubjectLocks learner={l} disabled={viewer} />
              </Box>
            ))}
          </Box>
          {!viewer && (
            <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
              <Button component={Link} href="/start/learners" variant="outlined" sx={{ borderWidth: 2 }}>
                {t("start.addLearner")}
              </Button>
              <Button component={Link} href="/start/interests">
                {t("start.interestsTitle")}
              </Button>
            </Box>
          )}
        </Section>
        <PrivacySection />
        <BetaSection />
      </Box>
    </FamilyShell>
  );
}
