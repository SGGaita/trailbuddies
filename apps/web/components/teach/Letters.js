"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { t } from "@trailbuddies/i18n";
import { studentName } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { api } from "@/lib/account";
import Loading from "@/components/Loading";
import QrCode, { joinUrl } from "./QrCode";

/**
 * CLS-03: one A4 page per child for their parents, with the class code, a QR code and a
 * plain note about what the teacher can see. Print, or "Save as PDF" from the print dialog.
 */
export default function Letters() {
  const ready = useHydrated();
  const id = useSearchParams().get("id") || "";
  const user = useFamily((s) => s.user);
  const teacher = useFamily((s) => s.teacher);
  const [cls, setCls] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (id)
      api
        .getClass(id)
        .then(setCls)
        .catch((e) => setError(e.message));
  }, [id]);
  if (!ready || (!cls && !error)) return <Loading />;
  if (!cls) return <Alert severity="warning">{error}</Alert>;
  const print = () => {
    api.teacherTips({ printed: true }).catch(() => {});
    window.print();
  };
  return (
    <Box
      sx={{ bgcolor: { xs: "background.default" }, minHeight: "100dvh", "@media print": { bgcolor: "#fff" } }}
    >
      <Box
        className="no-print"
        sx={{
          display: "flex",
          gap: 1.5,
          flexWrap: "wrap",
          alignItems: "center",
          p: 2,
          maxWidth: 820,
          mx: "auto",
          "@media print": { display: "none" },
        }}
      >
        <Typography component="h1" variant="h5" sx={{ flex: 1 }}>
          {t("teach.lettersTitle", { name: cls.name, n: cls.roster.length })}
        </Typography>
        <Button component={Link} href={`/teach/class?id=${cls.id}`}>
          {t("teach.backToClass")}
        </Button>
        <Button variant="contained" onClick={print}>
          {t("teach.print")}
        </Button>
      </Box>
      {cls.roster.map((s) => (
        <Box
          component="article"
          key={s.id}
          data-letter={studentName(s)}
          sx={{
            bgcolor: "#fff",
            maxWidth: 794, // A4 at 96 dpi
            minHeight: { sm: 1000 },
            mx: "auto",
            mb: 3,
            p: { xs: 3, sm: 6 },
            boxShadow: "0 2px 10px rgba(0,0,0,.08)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            breakAfter: "page",
            "@media print": { boxShadow: "none", mb: 0, minHeight: "auto", p: "16mm", maxWidth: "none" },
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              color: "primary.main",
            }}
          >
            Trailbuddies
          </Typography>
          <Typography component="h2" variant="h4">
            {t("teach.letterHello", { name: studentName(s) })}
          </Typography>
          <Typography>
            {t("teach.letterBody", {
              teacher: user?.name || t("teach.theTeacher"),
              cls: cls.name,
              school: teacher?.school?.name || "",
            })}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 3,
              alignItems: "center",
              flexWrap: "wrap",
              border: "2px dashed #c9c2b4",
              borderRadius: 4.5,
              p: 2.5,
            }}
          >
            <QrCode
              value={joinUrl(cls.join_code)}
              size={150}
              label={t("teach.qr", { code: cls.join_code })}
            />
            <Box>
              <Typography sx={{ fontWeight: 800 }}>{t("teach.letterSteps")}</Typography>
              <Box component="ol" sx={{ m: 0, pl: 2.5 }}>
                <li>{t("teach.letterStep1")}</li>
                <li>{t("teach.letterStep2", { code: cls.join_code })}</li>
                <li>{t("teach.letterStep3", { name: studentName(s) })}</li>
              </Box>
              <Typography
                sx={{
                  mt: 1,
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 30,
                  letterSpacing: ".12em",
                }}
              >
                {cls.join_code}
              </Typography>
            </Box>
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>{t("teach.letterSeeTitle")}</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              <li>{t("teach.letterSee1")}</li>
              <li>{t("teach.letterSee2")}</li>
              <li>{t("teach.letterSee3")}</li>
              <li>{t("teach.letterSee4")}</li>
            </Box>
          </Box>
          <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("teach.letterFoot")}</Typography>
        </Box>
      ))}
    </Box>
  );
}
