"use client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { gateQuestion, gatePasses, checkPin, GATE_MAX_TRIES, GATE_LOCK_MS } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { useSetupGuard } from "@/lib/guard";
import Loading from "@/components/Loading";
import Buddy from "@/components/art/Buddy";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

/**
 * The parent gate in front of the grown-up zone: a sum children can't do yet, or the
 * family PIN when one is set. Stays open for 10 minutes; going back to the children locks it.
 */
export default function GrownUpGate({ children, setup = true }) {
  const ready = useHydrated();
  const guarded = useSetupGuard();
  const open = useFamily((s) => s.gateUntil > Date.now());
  if (!ready || (setup && !guarded)) return <Loading />;
  if (open) return children;
  return <Gate />;
}

function Gate() {
  const router = useRouter();
  const pin = useFamily((s) => s.family?.pin);
  const mode = useFamily((s) => s.mode);
  const unlockGate = useFamily((s) => s.unlockGate);
  const setPin = useFamily((s) => s.setPin);
  const [q, setQ] = useState(() => gateQuestion());
  const [input, setInput] = useState("");
  const [tries, setTries] = useState(0);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const press = (k) => {
    if (locked) return;
    setError("");
    if (k === "clear") return setInput("");
    if (k === "back") return setInput((v) => v.slice(0, -1));
    setInput((v) => (v.length < 4 ? v + k : v));
  };
  const submit = async (e) => {
    e?.preventDefault();
    if (locked || !input) return;
    const ok = pin ? await checkPin(input, pin) : gatePasses(q, input);
    if (ok) return unlockGate();
    const n = tries + 1;
    setTries(n);
    setInput("");
    if (!pin) setQ(gateQuestion());
    if (n >= GATE_MAX_TRIES) {
      setLocked(true);
      timer.current = setTimeout(() => {
        setLocked(false);
        setError("");
      }, GATE_LOCK_MS);
      setTries(0);
      setError(t("gate.locked"));
    } else setError(t("gate.wrong"));
  };
  // Keyboard: digits, Backspace and Enter work as well as the keypad.
  const onKey = useEffectEvent((e) => {
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("back");
    else if (e.key === "Enter") submit(e);
  });
  useEffect(() => {
    const h = (e) => onKey(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const forgot = () => {
    if (mode === "demo") return setPin(null);
    sessionStorage.setItem("tb_reset_pin", "1");
    router.push("/start/account");
  };

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: "background.default" }}
    >
      <Box
        component="form"
        onSubmit={submit}
        sx={{
          width: "100%",
          maxWidth: 420,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.75,
          p: { xs: 2, sm: 3.5 },
          bgcolor: "background.paper",
          border: `2px solid ${colors.line}`,
          borderRadius: 5.5,
          textAlign: "center",
        }}
      >
        <Buddy id="juma" mood="think" size={80} />
        <Typography variant="h5" component="h1">
          {t("gate.title")}
        </Typography>
        <Typography sx={{ color: "text.secondary" }}>{pin ? t("gate.pinSub") : t("gate.sub")}</Typography>
        {!pin && (
          <Typography
            sx={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28 }}
            data-gate-question={q.text}
          >
            {q.text}
          </Typography>
        )}
        <Box
          role="textbox"
          aria-label={pin ? t("settings.pin") : t("gate.answer")}
          aria-readonly="true"
          sx={{
            width: "100%",
            minHeight: 56,
            display: "grid",
            placeItems: "center",
            border: `2px solid ${error ? colors.bad.main : colors.line}`,
            borderRadius: 3.5,
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: pin ? ".4em" : ".05em",
          }}
        >
          {pin ? "•".repeat(input.length) : input}
        </Box>
        <Typography role="status" sx={{ minHeight: 24, color: colors.bad.main, fontWeight: 700 }}>
          {error}
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, width: "100%" }}>
          {KEYS.map((k) => (
            <Button
              key={k}
              type="button"
              variant="outlined"
              disabled={locked}
              onClick={() => press(k)}
              aria-label={k === "back" ? "Delete" : k === "clear" ? t("gate.clear") : k}
              sx={{ borderWidth: 2, minHeight: 56, fontSize: 22, fontWeight: 800 }}
            >
              {k === "back" ? "⌫" : k === "clear" ? "C" : k}
            </Button>
          ))}
        </Box>
        <Button type="submit" variant="contained" size="large" fullWidth disabled={locked || !input}>
          {t("gate.open")}
        </Button>
        {pin && (
          <Button type="button" onClick={forgot} sx={{ fontSize: 14 }}>
            {t("gate.forgot")}
          </Button>
        )}
        <Button component={Link} href="/play" type="button">
          {t("gate.back")}
        </Button>
      </Box>
    </Box>
  );
}
