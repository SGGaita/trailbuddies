"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { normaliseCode, validCode } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { api, canEdit } from "@/lib/account";
import FamilyShell from "@/components/shell/FamilyShell";
import Loading from "@/components/Loading";

const card = {
  bgcolor: "background.paper",
  border: `2px solid ${colors.line}`,
  borderRadius: 4.5,
  p: { xs: 2, sm: 2.5 },
};

/** What a teacher can see, in plain words (CLS-05). @param {"class" | "all"} scope */
const SeeList = ({ scope }) => (
  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
    <li>{t("classes.seeClass")}</li>
    <li>{scope === "all" ? t("classes.seeAll") : t("classes.seeTotals")}</li>
    <li>{t("classes.seeNever")}</li>
  </Box>
);

/**
 * P20 Join a class (CLS-04) and the family's class links (PAR-08): enter the code, choose the
 * child and their name on the class list, decide what the teacher sees, unlink at any time.
 */
export default function JoinClass() {
  const ready = useHydrated();
  const params = useSearchParams();
  const family = useFamily((s) => s.family);
  const mode = useFamily((s) => s.mode);
  const learners = useFamily((s) => s.learners);
  const editable = useFamily(canEdit);
  const [code, setCode] = useState(params.get("code") || "");
  const [preview, setPreview] = useState(null);
  const [pick, setPick] = useState({ learner: "", student: "", all: false });
  const [links, setLinks] = useState([]);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const account = mode === "account" && family?.id;
  const reload = () =>
    account &&
    api
      .links(family.id)
      .then((r) => setLinks(r.links))
      .catch(() => {});
  useEffect(() => {
    if (account)
      api
        .links(family.id)
        .then((r) => setLinks(r.links))
        .catch(() => {});
  }, [account, family?.id]);
  if (!ready) return <Loading />;

  const look = async (e) => {
    e?.preventDefault();
    setError("");
    setPreview(null);
    if (!validCode(code)) return setError(t("classes.badCode"));
    try {
      const p = await api.joinPreview(normaliseCode(code));
      setPreview(p);
      setPick({ learner: learners[0]?.id || "", student: "", all: false });
    } catch (err) {
      setError(err.status === 404 ? t("classes.badCode") : err.message);
    }
  };
  const link = async () => {
    setError("");
    try {
      const r = await api.link(family.id, {
        code: normaliseCode(code),
        student_id: pick.student,
        learner_id: pick.learner,
        scope: pick.all ? "all" : "class",
      });
      setDone(
        t("classes.linked", { name: learners.find((l) => l.id === pick.learner)?.name || "", cls: r.class }),
      );
      setPreview(null);
      setCode("");
      reload();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <FamilyShell
      title={t("classes.title")}
      sub={t("classes.sub")}
      family={family}
      active="/family/settings"
      back="/family/settings"
    >
      {!account ? (
        <Alert severity="info">{t("classes.demo")}</Alert>
      ) : (
        <>
          {done && <Alert severity="success">{done}</Alert>}
          <Box
            component="section"
            aria-label={t("classes.join")}
            sx={{ ...card, display: "flex", flexDirection: "column", gap: 1.5 }}
          >
            <Typography component="h2" variant="h6">
              {t("classes.join")}
            </Typography>
            <Box component="form" onSubmit={look} sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <TextField
                label={t("classes.code")}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                slotProps={{
                  htmlInput: {
                    maxLength: 8,
                    autoCapitalize: "characters",
                    style: { letterSpacing: ".15em", fontWeight: 800 },
                  },
                }}
                sx={{ flex: 1, minWidth: 180 }}
              />
              <Button
                type="submit"
                variant="contained"
                disabled={!editable || normaliseCode(code).length < 6}
              >
                {t("classes.find")}
              </Button>
            </Box>
            {error && (
              <Alert severity="warning" role="alert">
                {error}
              </Alert>
            )}
            {preview && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <Typography sx={{ fontWeight: 800 }}>
                  {t("classes.found", {
                    cls: preview.class.name,
                    teacher: preview.class.teacher,
                    school: preview.class.school || "",
                  })}
                </Typography>
                <TextField
                  select
                  label={t("classes.whichChild")}
                  value={pick.learner}
                  onChange={(e) => setPick({ ...pick, learner: e.target.value })}
                >
                  {learners.map((l) => (
                    <MenuItem key={l.id} value={l.id}>
                      {l.name}
                    </MenuItem>
                  ))}
                </TextField>
                {preview.students.length ? (
                  <TextField
                    select
                    label={t("classes.whichEntry")}
                    value={pick.student}
                    onChange={(e) => setPick({ ...pick, student: e.target.value })}
                  >
                    {preview.students.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Alert severity="info">{t("classes.noneLeft")}</Alert>
                )}
                <Box sx={{ p: 1.5, bgcolor: colors.sand, borderRadius: 3.5 }}>
                  <Typography sx={{ fontWeight: 800 }}>{t("classes.teacherSees")}</Typography>
                  <SeeList scope={pick.all ? "all" : "class"} />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={pick.all}
                        onChange={(e) => setPick({ ...pick, all: e.target.checked })}
                      />
                    }
                    label={t("classes.shareAll")}
                  />
                </Box>
                <Button
                  variant="contained"
                  sx={{ alignSelf: "flex-start" }}
                  disabled={!pick.learner || !pick.student}
                  onClick={link}
                >
                  {t("classes.confirm")}
                </Button>
              </Box>
            )}
          </Box>
          <Box component="section" aria-label={t("classes.yours")} sx={card}>
            <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
              {t("classes.yours")}
            </Typography>
            {links.length === 0 && (
              <Typography sx={{ color: "text.secondary" }}>{t("classes.none")}</Typography>
            )}
            {links.map((l) => {
              const name = learners.find((x) => x.id === l.learner_id)?.name || l.roster_name;
              return (
                <Box
                  key={l.student_id}
                  data-link={name}
                  sx={{
                    py: 1.5,
                    borderBottom: `1px solid ${colors.line}`,
                    "&:last-of-type": { borderBottom: 0 },
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
                >
                  <Typography sx={{ fontWeight: 800 }}>
                    {t("classes.linkLine", {
                      name,
                      cls: l.class,
                      teacher: l.teacher,
                      school: l.school || "",
                    })}
                  </Typography>
                  <SeeList scope={l.scope} />
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={l.scope === "all"}
                          disabled={!editable}
                          onChange={async (e) => {
                            await api.setLinkScope(
                              family.id,
                              l.student_id,
                              e.target.checked ? "all" : "class",
                            );
                            reload();
                          }}
                        />
                      }
                      label={t("classes.shareAllFor", { name })}
                    />
                    <Button
                      color="error"
                      disabled={!editable}
                      onClick={async () => {
                        await api.unlink(family.id, l.student_id);
                        reload();
                      }}
                      aria-label={t("classes.unlinkFor", { name, cls: l.class })}
                    >
                      {t("classes.unlink")}
                    </Button>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </FamilyShell>
  );
}
