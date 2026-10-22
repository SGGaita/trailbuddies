"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Alert from "@mui/material/Alert";
import { t } from "@trailbuddies/i18n";
import { api, refreshAccount, setupStep } from "@/lib/account";
import { useFamily } from "@/lib/store";
import { useSetupGuard } from "@/lib/guard";
import Loading from "@/components/Loading";
import OnboardingShell from "./OnboardingShell";

// Countries we expect first; the rest of the world follows alphabetically.
const FIRST = ["KE", "TZ", "UG", "RW", "NG", "GH", "ZA", "ET", "GB", "US"];
const OTHERS =
  "AE AR AT AU BD BE BI BR BW CA CD CH CL CM CN CO CY CZ DE DK EG ES FI FR GR HK IE IL IN IT JM JP KR LK LS MA MG ML MU MW MX MY MZ NA NL NO NP NZ PH PK PL PT QA RO SA SD SE SG SN SO SS SZ TH TR TT TW UA VN ZM ZW".split(
    " ",
  );

/** Step 2 (cont.): the grown-up's name and country, which creates the family. */
export default function About() {
  const ok = useSetupGuard({ allow: "/start/about" });
  const router = useRouter();
  const user = useFamily((s) => s.user);
  const [name, setName] = useState(user?.name || "");
  const [country, setCountry] = useState("KE");
  const [familyName, setFamilyName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const countries = useMemo(() => {
    let names;
    try {
      names = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      names = { of: (c) => c };
    }
    const label = (c) => ({ code: c, label: names.of(c) || c });
    return [...FIRST.map(label), ...OTHERS.map(label).sort((a, b) => a.label.localeCompare(b.label))];
  }, []);
  if (!ok) return <Loading />;

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError(t("start.yourName"));
    setBusy(true);
    setError("");
    try {
      await api.updateMe(name.trim());
      await api.createFamily({ name: familyName.trim() || `${name.trim()}'s family`, country });
      await refreshAccount();
      router.push(setupStep(useFamily.getState()) || "/start/interests");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <OnboardingShell step={2} title={t("start.aboutTitle")} sub={t("start.aboutSub")}>
      {error && <Alert severity="warning">{error}</Alert>}
      <Box
        component="form"
        onSubmit={submit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        noValidate
      >
        <TextField
          label={t("start.yourName")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="given-name"
          required
          autoFocus
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
        <TextField
          select
          label={t("start.country")}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          {countries.map((c) => (
            <MenuItem key={c.code} value={c.code}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t("start.familyName")}
          value={familyName}
          placeholder={name.trim() ? `${name.trim()}'s family` : ""}
          onChange={(e) => setFamilyName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {t("start.continue")}
        </Button>
      </Box>
    </OnboardingShell>
  );
}
