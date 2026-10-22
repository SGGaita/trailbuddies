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

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api.giveConsent(family.id, { policy_version: policy.version, scopes });
      await refreshAccount();
      router.push(setupStep(useFamily.getState()) || "/start/interests");
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <OnboardingShell step={3} title={t("start.consentTitle")} sub={t("start.consentSub")}>
      {error && <Alert severity="warning">{error}</Alert>}
      {policy && (
        <>
          <List title={t("start.weKeep")} items={policy.collect} mark="✓" />
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
          <Typography
            component="a"
            href="https://trailbuddies.africa/privacy"
            target="_blank"
            rel="noreferrer"
            sx={{ fontWeight: 700 }}
          >
            {t("start.policyLink")} ({policy.version})
          </Typography>
          <Button variant="contained" size="large" disabled={!agreed || busy} onClick={submit}>
            {t("start.continue")}
          </Button>
        </>
      )}
    </OnboardingShell>
  );
}
