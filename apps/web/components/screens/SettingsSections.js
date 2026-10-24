"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubjects, getReadyUnits } from "@trailbuddies/content";
import {
  COUNTRIES,
  countryRules,
  consentChanges,
  formatDate,
  DIFFICULTY_SETTINGS,
  SETTING_NAMES,
  deviceCheck,
} from "@trailbuddies/domain";
import { useFamily } from "@/lib/store";
import { changeCountry, listDevices, signOutDevice } from "@/lib/account";
import { syncPacks, clearUnusedPacks } from "@/lib/packs";

/** Settings sections share this frame (FamilySettings' Section). */
export const Frame = ({ title, sub, children, label }) => (
  <Box
    component="section"
    aria-label={label || title}
    sx={{ bgcolor: "background.paper", border: `2px solid ${colors.line}`, borderRadius: 4.5, p: { xs: 2, sm: 3 } }}
  >
    <Typography variant="h6" component="h2">
      {title}
    </Typography>
    {sub && <Typography sx={{ color: "text.secondary", fontSize: 14, mb: 1.5 }}>{sub}</Typography>}
    {children}
  </Box>
);

/** ONB-05: the family's country sets formats, the seasons unit and the privacy rules. */
export function CountrySection() {
  const family = useFamily((s) => s.family);
  const mode = useFamily((s) => s.mode);
  const router = useRouter();
  const [pick, setPick] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (mode !== "account" || !family) return null;
  const current = family.country || "KE";
  const value = pick || current;
  const rules = countryRules(value);
  const known = COUNTRIES.some((c) => c.code === current);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await changeCountry(value);
      setPick("");
      if (r === "consent") router.push("/start/consent");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Frame title={t("settings.country")} sub={t("settings.countrySub")}>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          select
          size="small"
          label={t("start.country")}
          value={value}
          onChange={(e) => setPick(e.target.value)}
          disabled={family.role === "viewer"}
          sx={{ minWidth: 220 }}
        >
          {COUNTRIES.map((c) => (
            <MenuItem key={c.code} value={c.code}>
              {c.name}
            </MenuItem>
          ))}
          {!known && <MenuItem value={current}>{countryRules(current).name}</MenuItem>}
          <MenuItem value="XX">{t("settings.otherCountry")}</MenuItem>
        </TextField>
        {value !== current && (
          <Button variant="contained" onClick={save} disabled={busy}>
            {t("settings.saveCountry")}
          </Button>
        )}
      </Box>
      <Typography sx={{ mt: 1.5, fontSize: 14, color: "text.secondary" }} data-testid="country-rules">
        {t("settings.countryRules", {
          date: formatDate(Date.UTC(2026, 9, 24), value),
          currency: rules.currency,
          rules: t(`region.${rules.region}`),
        })}
      </Typography>
      {value !== current && consentChanges(current, value) && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {t("settings.countryConsent")}
        </Alert>
      )}
      {error && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
    </Frame>
  );
}

/** FAM-08: devices signed in to this family, with "Sign out" for old ones. */
export function DevicesSection() {
  const family = useFamily((s) => s.family);
  const mode = useFamily((s) => s.mode);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const id = family?.id;
  useEffect(() => {
    if (mode !== "account" || !id) return;
    listDevices()
      .then(setData)
      .catch((e) => setError(e.message));
  }, [mode, id]);
  if (mode !== "account" || !id) return null;
  const manager = family.role === "owner" || family.role === "parent";
  const check = data ? deviceCheck(data.devices, (family.plan || "").toLowerCase()) : { over: 0, oldest: [] };
  const out = async (sid) => {
    try {
      await signOutDevice(sid);
      setData(await listDevices());
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Frame
      title={t("settings.devices")}
      sub={t("settings.devicesSub", { n: data?.limit ?? family.device_limit ?? 2, plan: family.plan || "" })}
    >
      {data?.over > 0 && (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          {t("settings.devicesOver", { n: data.devices.length, limit: data.limit })}
        </Alert>
      )}
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {(data?.devices || []).map((d) => (
          <Box
            component="li"
            key={d.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              flexWrap: "wrap",
              py: 1,
              borderBottom: `1px solid ${colors.line}`,
              "&:last-of-type": { borderBottom: 0 },
            }}
          >
            <Box sx={{ flex: 1, minWidth: 160 }}>
              <Typography sx={{ fontWeight: 800 }}>
                {d.name}
                {d.this_device && <Chip size="small" label={t("settings.thisDevice")} sx={{ ml: 1 }} />}
                {check.oldest.includes(d.id) && (
                  <Chip size="small" color="warning" label={t("settings.oldest")} sx={{ ml: 1 }} />
                )}
              </Typography>
              <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                {t("settings.deviceLine", { who: d.who, date: formatDate(d.last_seen_at, family.country) })}
              </Typography>
            </Box>
            {!d.this_device && manager && (
              <Button size="small" variant="outlined" sx={{ borderWidth: 2 }} onClick={() => out(d.id)}>
                {t("settings.signOutDevice")}
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
    </Frame>
  );
}

/** OFF-02: which subjects are saved for offline play, and freeing space when it's short. */
export function OfflineSection() {
  const packs = useFamily((s) => s.packs);
  const [busy, setBusy] = useState(false);
  const name = (id) => getSubjects().find((s) => s.id === id)?.name || id;
  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Frame title={t("settings.offlineTitle")} sub={t("settings.offlineSub")}>
      {!packs?.release ? (
        <Typography sx={{ fontWeight: 700 }}>{t("settings.offlineBuiltIn")}</Typography>
      ) : (
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }} data-testid="offline-ready">
          {packs.ready.map((s) => (
            <Chip key={s} label={`✓ ${name(s)}`} color="success" variant="outlined" />
          ))}
        </Box>
      )}
      {packs?.waiting && (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {t("settings.offlineWaiting")}
        </Alert>
      )}
      {packs?.noRoom?.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mt: 1.5 }}
          action={
            packs.unused?.length ? (
              <Button color="inherit" size="small" disabled={busy} onClick={() => run(clearUnusedPacks)}>
                {t("settings.freeSpace")}
              </Button>
            ) : null
          }
        >
          {t("settings.offlineNoRoom", { subjects: packs.noRoom.map(name).join(", ") })}
        </Alert>
      )}
      <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
        <Button variant="outlined" sx={{ borderWidth: 2 }} disabled={busy} onClick={() => run(() => syncPacks({ force: true }))}>
          {t("settings.downloadNow")}
        </Button>
      </Box>
    </Frame>
  );
}

/** ADP-02: lock a learner's level in one subject (or leave it on Auto). */
export function SubjectLocks({ learner, disabled }) {
  const updateLearner = useFamily((s) => s.updateLearner);
  const subjects = getSubjects().filter((s) => getReadyUnits(s.id).length);
  const levels = learner.levels || {};
  const set = (subject, v) => {
    const next = { ...levels };
    if (v === "auto") delete next[subject];
    else next[subject] = v;
    updateLearner(learner.id, { levels: next });
  };
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1, width: "100%" }}>
      {subjects.map((s) => (
        <TextField
          key={s.id}
          select
          size="small"
          label={s.name}
          value={levels[s.id] || "auto"}
          onChange={(e) => set(s.id, e.target.value)}
          disabled={disabled}
          slotProps={{ select: { "aria-label": `${s.name} level for ${learner.name}` } }}
          sx={{ minWidth: 150, flex: { xs: "1 1 140px", sm: "0 0 auto" } }}
        >
          {DIFFICULTY_SETTINGS.map((d) => (
            <MenuItem key={d} value={d}>
              {SETTING_NAMES[d]}
            </MenuItem>
          ))}
        </TextField>
      ))}
    </Box>
  );
}
