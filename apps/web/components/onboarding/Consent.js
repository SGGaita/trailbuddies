"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Checkbox from "@mui/material/Checkbox";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Link from "next/link";
import { needsSignedForm, signedFormProblems, formatDate } from "@trailbuddies/domain";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { api, refreshAccount, setupStep } from "@/lib/account";
import { useFamily } from "@/lib/store";
import { useSetupGuard } from "@/lib/guard";
import Loading from "@/components/Loading";
import OnboardingShell from "./OnboardingShell";

const List = ({ title, items, mark }) => (
  <Box sx={{ bgcolor: colors.sand, borderRadius: 4.5, p: 2 }}>
    <Typography component="h2" sx={{ fontWeight: 800, mb: 1 }}>
      {title}
    </Typography>
    <Box
      component="ul"
      sx={{ m: 0, pl: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 0.75 }}
    >
      {items.map((x) => (
        <Box component="li" key={x} sx={{ display: "flex", gap: 1 }}>
          <span aria-hidden="true">{mark}</span>
          <span>{x}</span>
        </Box>
      ))}
    </Box>
  </Box>
);

/** ONB-06b: US families sign a consent form that a person checks (COPPA). */
function SignedForm({ form, setForm, problems, country }) {
  const field = (k) => ({
    value: form[k] || "",
    onChange: (e) => setForm({ ...form, [k]: e.target.value }),
  });
  return (
    <Box
      component="fieldset"
      aria-label={t("consent.formTitle")}
      sx={{ m: 0, p: 2, border: `2px solid ${colors.line}`, borderRadius: 4.5, display: "flex", flexDirection: "column", gap: 1.5 }}
    >
      <Typography component="legend" sx={{ fontWeight: 800, px: 0.5 }}>
        {t("consent.formTitle")}
      </Typography>
      <Typography sx={{ color: "text.secondary", fontSize: 14 }}>{t("consent.formSub")}</Typography>
      <TextField label={t("consent.parentName")} autoComplete="name" {...field("parent_name")}
        error={problems.includes("name")} helperText={problems.includes("name") ? t("consent.nameHelp") : " "} />
      <RadioGroup
        row
        aria-label={t("consent.relationship")}
        value={form.relationship || ""}
        onChange={(e) => setForm({ ...form, relationship: e.target.value })}
      >
        <FormControlLabel value="parent" control={<Radio />} label={t("consent.parent")} />
        <FormControlLabel value="guardian" control={<Radio />} label={t("consent.guardian")} />
      </RadioGroup>
      <TextField
        label={t("consent.signature")}
        {...field("signature")}
        error={!!form.signature && problems.includes("signature")}
        helperText={t("consent.signatureHelp")}
        slotProps={{ htmlInput: { style: { fontFamily: "cursive", fontSize: 22 } } }}
      />
      <Typography sx={{ fontSize: 14 }}>
        {t("consent.signedOn", { date: formatDate(new Date(), country) })}
      </Typography>
    </Box>
  );
}

/** Step 3: a plain-language summary of what is kept, the choices, and the consent tick. */
export default function Consent() {
  const ok = useSetupGuard({ allow: "/start/consent" });
  const router = useRouter();
  const family = useFamily((s) => s.family);
  const [policy, setPolicy] = useState(null);
  const [scopes, setScopes] = useState({});
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ relationship: "parent" });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    api
      .policy()
      .then((p) => {
        setPolicy(p);
        setScopes(Object.fromEntries(Object.entries(p.scopes).map(([k, v]) => [k, !!v.required])));
      })
      .catch((e) => setError(e.message));
  }, []);
  if (!ok || (!policy && !error)) return <Loading />;
  const signed = needsSignedForm(family?.region);
  const problems = signed ? signedFormProblems(form) : [];
  const next = () => router.push(setupStep(useFamily.getState()) || "/start/interests");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const body = { policy_version: policy.version, scopes };
      if (signed) {
        const today = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        body.form = {
          parent_name: form.parent_name.trim(),
          signature: form.signature.trim(),
          relationship: form.relationship,
          signed_on: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
        };
      }
      const r = await api.giveConsent(family.id, body);
      // A signed form waits for review: say so here first (refreshing now would move the
      // set-up guard on to the next step before the grown-up has read it).
      if (r.status === "pending") {
        setPending(true);
        setBusy(false);
        return;
      }
      await refreshAccount();
      next();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (pending)
    return (
      <OnboardingShell step={3} title={t("consent.waitTitle")} sub={t("consent.waitSub")}>
        <Alert severity="info">{t("consent.waitNote")}</Alert>
        <Button
          variant="contained"
          size="large"
          onClick={async () => {
            await refreshAccount();
            next();
          }}
        >
          {t("start.continue")}
        </Button>
      </OnboardingShell>
    );

  return (
    <OnboardingShell step={3} title={t("start.consentTitle")} sub={t("start.consentSub")}>
      {error && <Alert severity="warning">{error}</Alert>}
      {policy && (
        <>
          <List title={t("start.weKeep")} items={policy.collect} mark="✓" />
          {policy.why && <List title={t("start.why")} items={policy.why} mark="•" />}
          {policy.kept && <List title={t("start.howLong")} items={policy.kept} mark="⏱" />}
          {policy.rights && <List title={t("start.rights")} items={policy.rights} mark="★" />}
          <List title={t("start.weNever")} items={policy.never} mark="✕" />
          <Box>
            <Typography component="h2" sx={{ fontWeight: 800, mb: 0.5 }}>
              {t("start.choices")}
            </Typography>
            {Object.entries(policy.scopes).map(([k, v]) => (
              <FormControlLabel
                key={k}
                sx={{ display: "flex", alignItems: "flex-start", m: 0, py: 0.5, gap: 1 }}
                control={
                  <Switch
                    checked={!!scopes[k]}
                    disabled={v.required}
                    onChange={(e) => setScopes({ ...scopes, [k]: e.target.checked })}
                  />
                }
                label={
                  <Box sx={{ pt: 1 }}>
                    {v.label}
                    {v.required && (
                      <Box component="span" sx={{ color: "text.secondary" }}>
                        {" "}
                        ({t("start.required")})
                      </Box>
                    )}
                  </Box>
                }
              />
            ))}
          </Box>
          <FormControlLabel
            sx={{
              alignItems: "flex-start",
              m: 0,
              gap: 1,
              p: 1.5,
              border: `2px solid ${colors.line}`,
              borderRadius: 4.5,
            }}
            control={
              <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} sx={{ p: 0.5 }} />
            }
            label={<Box sx={{ pt: 0.5, fontWeight: 700 }}>{t("start.agree")}</Box>}
          />
          {signed && <SignedForm form={form} setForm={setForm} problems={problems} country={family?.country} />}
          <Typography component={Link} href="/privacy" target="_blank" sx={{ fontWeight: 700 }}>
            {t("start.policyLink")} ({policy.version})
          </Typography>
          <Button
            variant="contained"
            size="large"
            disabled={!agreed || busy || problems.length > 0}
            onClick={submit}
          >
            {t("start.continue")}
          </Button>
        </>
      )}
    </OnboardingShell>
  );
}
