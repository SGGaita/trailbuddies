"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { useFamily, useHydrated } from "@/lib/store";
import { api } from "@/lib/account";
import { startClassPlay, endClassPlay } from "@/lib/classPlay";
import TeachShell from "@/components/shell/TeachShell";
import Loading from "@/components/Loading";
import { useTeachClass, ClassPicker } from "./classPick";
import { card } from "./AssignWork";

const digits = (v) => v.replace(/\D/g, "").slice(0, 4);

/** T06 Classroom mode (CRM-01): shared tablets and lab computers set to a class. */
export default function Classroom() {
  const ready = useHydrated();
  const router = useRouter();
  const { id, classes, cls, error, reload } = useTeachClass();
  const mode = useFamily((s) => s.mode);
  const here = useFamily((s) => (s.mode === "class" ? s.family : null));
  const [label, setLabel] = useState("");
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!ready || (id && !cls && !error)) return <Loading />;
  if (!id || !cls)
    return (
      <TeachShell title={t("teach.classroomTitle")} active="/teach/classroom">
        <Alert severity={id ? "warning" : "info"}>
          {id ? error : <Link href="/teach">{t("teach.noClassYet")}</Link>}
        </Alert>
      </TeachShell>
    );

  const mismatch = pin.length === 4 && again.length === 4 && pin !== again;
  const start = async () => {
    setBusy(true);
    setErr("");
    try {
      await startClassPlay(cls.id, { classroom: { label: label.trim(), pin } });
      router.push("/play");
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };

  return (
    <TeachShell title={t("teach.classroomTitle")} sub={t("teach.classroomSub")} active="/teach/classroom">
      <ClassPicker id={id} classes={classes} />
      {here?.classroom && here.classId === cls.id && (
        <Alert
          severity="success"
          action={
            <Button
              color="inherit"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await endClassPlay();
                await reload();
                setBusy(false);
              }}
            >
              {t("teach.endPlay")}
            </Button>
          }
        >
          {t("teach.isClassroom", { name: cls.name })}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
          alignItems: "start",
        }}
      >
        <Box
          component="section"
          aria-label={t("teach.thisDevice")}
          sx={{ ...card, display: "flex", flexDirection: "column", gap: 1.5 }}
        >
          <Typography component="h2" variant="h6">
            {t("teach.useDevice", { name: cls.name })}
          </Typography>
          <Typography>{t("teach.useDeviceSub")}</Typography>
          <TextField
            label={t("teach.deviceName")}
            placeholder={t("teach.deviceNameEg")}
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 60))}
          />
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("teach.devicePinSub")}</Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <TextField
              label={t("teach.devicePin")}
              type="password"
              value={pin}
              onChange={(e) => setPin(digits(e.target.value))}
              slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "new-password" } }}
              sx={{ width: 220 }}
            />
            <TextField
              label={t("teach.devicePinAgain")}
              type="password"
              value={again}
              onChange={(e) => setAgain(digits(e.target.value))}
              error={mismatch}
              helperText={mismatch ? t("teach.pinMismatch") : " "}
              slotProps={{ htmlInput: { inputMode: "numeric", autoComplete: "new-password" } }}
              sx={{ width: 220 }}
            />
          </Box>
          {err && <Alert severity="warning">{err}</Alert>}
          <Button
            variant="contained"
            size="large"
            disabled={
              busy ||
              !label.trim() ||
              pin.length !== 4 ||
              pin !== again ||
              !cls.roster.length ||
              mode === "class"
            }
            onClick={start}
          >
            {t("teach.startClassroom", { name: cls.name })}
          </Button>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("teach.offlineReady")}</Typography>
        </Box>
        <Box
          component="section"
          aria-label={t("teach.devices")}
          sx={{ ...card, display: "flex", flexDirection: "column", gap: 1 }}
        >
          <Typography component="h2" variant="h6">
            {t("teach.devices")}
          </Typography>
          {(cls.devices || []).length === 0 && (
            <Typography sx={{ color: "text.secondary" }}>{t("teach.noDevices")}</Typography>
          )}
          {(cls.devices || []).map((d) => (
            <Box
              key={d.id}
              data-device={d.label}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                py: 0.75,
                borderBottom: `1px solid ${colors.line}`,
                "&:last-of-type": { borderBottom: 0 },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 800 }}>{d.label}</Typography>
                <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
                  {t("teach.lastSeen", {
                    date: new Date(d.last_seen_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }),
                  })}
                </Typography>
              </Box>
              <Button
                aria-label={t("teach.removeDevice", { name: d.label })}
                title={t("teach.removeDeviceSub")}
                onClick={async () => {
                  await api.removeDevice(cls.id, d.id);
                  await reload();
                }}
              >
                {t("teach.remove")}
              </Button>
            </Box>
          ))}
        </Box>
      </Box>
    </TeachShell>
  );
}
