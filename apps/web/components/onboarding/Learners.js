"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { colors, avatarColors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { ageFrom, MIN_AGE, bandForAge, isAdult, firstNameOnly } from "@trailbuddies/domain";
import { useFamily } from "@/lib/store";
import { useSetupGuard } from "@/lib/guard";
import Loading from "@/components/Loading";
import LearnerAvatar from "@/components/LearnerAvatar";
import Icon from "@/components/Icon";
import OnboardingShell from "./OnboardingShell";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const blank = (color = "coral") => ({ name: "", month: "", year: "", color });

/** Step 4: who's learning? First name or nickname, birth month and year, a colour. */
export default function Learners() {
  const ok = useSetupGuard({ allow: "/start/learners" });
  const router = useRouter();
  const learners = useFamily((s) => s.learners);
  const user = useFamily((s) => s.user);
  const addLearner = useFamily((s) => s.addLearner);
  const removeLearner = useFamily((s) => s.removeLearner);
  const unlockGate = useFamily((s) => s.unlockGate);
  const family = useFamily((s) => s.family);
  const viewer = family?.role === "viewer";
  const [form, setForm] = useState(blank());
  const [error, setError] = useState("");
  const yearRef = useRef(null);
  if (!ok) return <Loading />;

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: thisYear - MIN_AGE - 1919 }, (_, i) => thisYear - MIN_AGE - i);
  const colours = Object.keys(avatarColors);

  const limit = family?.learner_limit ?? 6;
  const full = learners.length >= limit;
  const nick = firstNameOnly(form.name);
  const add = (e) => {
    e.preventDefault();
    if (full) return;
    const name = nick.name;
    if (!name) return setError(t("start.learnerName"));
    if (!form.month || !form.year) return setError(`${t("start.birthMonth")} · ${t("start.birthYear")}`);
    const birth = { year: Number(form.year), month: Number(form.month) };
    if (ageFrom(birth) < MIN_AGE) return setError(t("start.tooYoung"));
    addLearner({ name, birth, color: form.color });
    unlockGate(); // a grown-up is here: the next onboarding steps stay open
    setError("");
    setForm(blank(colours[(learners.length + 1) % colours.length]));
  };
  const addMe = () => {
    setForm({ ...blank("night"), name: user?.name || "" });
    setTimeout(() => yearRef.current?.focus(), 0);
  };

  return (
    <OnboardingShell step={4} title={t("start.learnersTitle")} sub={t("start.learnersSub")} wide>
      {learners.length > 0 && (
        <Box
          component="ul"
          aria-label={t("start.learnersTitle")}
          sx={{
            listStyle: "none",
            m: 0,
            p: 0,
            display: "grid",
            gap: 1,
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          }}
        >
          {learners.map((l) => {
            const age = ageFrom(l.birth);
            return (
              <Box
                component="li"
                key={l.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.25,
                  border: `2px solid ${colors.line}`,
                  borderRadius: 4.5,
                }}
              >
                <LearnerAvatar learner={l} size={44} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800 }}>{l.name}</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                    {isAdult(age) ? t("learner.adult") : `Age ${age} · ${bandForAge(age)}`}
                  </Typography>
                </Box>
                <IconButton
                  aria-label={t("start.remove", { name: l.name })}
                  onClick={() => removeLearner(l.id)}
                >
                  <Icon name="x" size={20} />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}

      {error && <Alert severity="warning">{error}</Alert>}
      {viewer ? (
        <Alert severity="info">{t("start.viewerOnly")}</Alert>
      ) : full ? (
        <Alert
          severity="info"
          action={
            <Button component={Link} href="/family/settings" color="inherit">
              {t("start.seePlans")}
            </Button>
          }
        >
          {t("start.planLimit", { plan: family?.plan || "Family", limit })}
        </Alert>
      ) : (
        <>
          <Box
            component="form"
            onSubmit={add}
            noValidate
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: { xs: "1fr 1fr", sm: "2fr 1.4fr 1fr" },
              p: 2,
              bgcolor: colors.sand,
              borderRadius: 4.5,
            }}
          >
            <TextField
              label={t("start.learnerName")}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoComplete="off"
              sx={{
                gridColumn: { xs: "1 / -1", sm: "auto" },
                bgcolor: "background.paper",
                borderRadius: 3.5,
              }}
              slotProps={{ htmlInput: { maxLength: 40 } }}
              helperText={nick.trimmed ? t("start.nicknameEnough", { name: nick.name }) : " "}
            />
            <TextField
              select
              label={t("start.birthMonth")}
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
              sx={{ bgcolor: "background.paper", borderRadius: 3.5 }}
            >
              {MONTHS.map((m, i) => (
                <MenuItem key={m} value={String(i + 1)}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label={t("start.birthYear")}
              value={form.year}
              inputRef={yearRef}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              sx={{ bgcolor: "background.paper", borderRadius: 3.5 }}
            >
              {years.map((y) => (
                <MenuItem key={y} value={String(y)}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
            <Box
              role="radiogroup"
              aria-label={t("start.colour")}
              sx={{ gridColumn: "1 / -1", display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
            >
              <Typography sx={{ fontWeight: 800, mr: 1 }}>{t("start.colour")}</Typography>
              {colours.map((c) => (
                <Box
                  key={c}
                  component="button"
                  type="button"
                  role="radio"
                  aria-checked={form.color === c}
                  aria-label={c}
                  onClick={() => setForm({ ...form, color: c })}
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    bgcolor: avatarColors[c],
                    border: `3px solid ${form.color === c ? colors.ink : "#fff"}`,
                    boxShadow: form.color === c ? `0 0 0 2px ${avatarColors[c]}` : "none",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Box>
            <Button type="submit" variant="contained" sx={{ gridColumn: "1 / -1" }}>
              {t("start.addLearner")}
            </Button>
          </Box>
          <Button variant="outlined" sx={{ borderWidth: 2, alignSelf: "flex-start" }} onClick={addMe}>
            {t("start.addMe")}
          </Button>
          <Typography sx={{ color: "text.secondary", mt: -1.5, fontSize: 14 }}>
            {t("start.addMeSub")}
          </Typography>
        </>
      )}
      <Button
        variant="contained"
        size="large"
        disabled={!learners.length}
        onClick={() => router.push("/start/interests")}
      >
        {t("start.continue")}
      </Button>
    </OnboardingShell>
  );
}
