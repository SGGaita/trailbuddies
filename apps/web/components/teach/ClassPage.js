"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import FormControlLabel from "@mui/material/FormControlLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { colors, avatarColors } from "@trailbuddies/tokens";
import { t } from "@trailbuddies/i18n";
import { getSubject } from "@trailbuddies/content";
import { parseRoster, studentName } from "@trailbuddies/domain";
import { useFamily, useHydrated } from "@/lib/store";
import { api, refreshAccount } from "@/lib/account";
import { startClassPlay, endClassPlay } from "@/lib/classPlay";
import TeachShell from "@/components/shell/TeachShell";
import Loading from "@/components/Loading";
import PictureIcon from "@/components/art/PictureIcon";
import QrCode, { joinUrl } from "./QrCode";

const card = {
  bgcolor: "background.paper",
  border: `2px solid ${colors.line}`,
  borderRadius: 4.5,
  p: { xs: 2, sm: 2.5 },
};
const dialog = {
  paper: { sx: { borderRadius: 5.5, p: { xs: 2, sm: 3 }, gap: 1.5, width: "100%", maxWidth: 520 } },
};

const Initial = ({ s }) => (
  <Box
    aria-hidden="true"
    sx={{
      width: 44,
      height: 44,
      borderRadius: "50%",
      flex: "none",
      bgcolor: avatarColors[s.avatar_color] || colors.sand,
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontWeight: 800,
      fontSize: 20,
    }}
  >
    {s.first_name[0]}
  </Box>
);

/** CLS-02: one name, or paste a list; children with the same name need an initial. */
function AddStudents({ cls, onAdded }) {
  const [text, setText] = useState("");
  const [initials, setInitials] = useState(/** @type {Record<number, string>} */ ({}));
  const [error, setError] = useState("");
  const parsed = parseRoster(text, cls.roster);
  const entries = parsed.entries.map((e, i) =>
    initials[i] ? { ...e, initial: initials[i].toUpperCase() } : e,
  );
  const again = parseRoster(
    entries.map((e) => `${e.first_name}${e.initial ? ` ${e.initial}` : ""}`).join("\n"),
    cls.roster,
  );
  const clash = (e) => again.clashes.includes(studentName(e).toLowerCase());
  const add = async () => {
    setError("");
    try {
      onAdded(await api.addStudents(cls.id, entries));
      setText("");
      setInitials({});
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Box
      component="section"
      aria-label={t("teach.addStudents")}
      sx={{ ...card, display: "flex", flexDirection: "column", gap: 1.25 }}
    >
      <Typography component="h2" variant="h6">
        {t("teach.addStudents")}
      </Typography>
      <TextField
        label={t("teach.names")}
        helperText={t("teach.namesHelp")}
        multiline
        minRows={3}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setInitials({});
        }}
      />
      {again.clashes.length > 0 && (
        <Alert severity="info">
          <Typography sx={{ fontWeight: 700, mb: 1 }}>{t("teach.sameName")}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {entries.map((e, i) =>
              clash(e) ? (
                <TextField
                  key={i}
                  size="small"
                  label={t("teach.initialFor", { name: e.first_name })}
                  value={initials[i] || e.initial || ""}
                  onChange={(ev) => setInitials({ ...initials, [i]: ev.target.value.slice(-1) })}
                  slotProps={{
                    htmlInput: {
                      maxLength: 1,
                      "aria-label": t("teach.initialFor", { name: `${e.first_name} ${i + 1}` }),
                    },
                  }}
                  sx={{ width: 150 }}
                />
              ) : null,
            )}
          </Box>
        </Alert>
      )}
      {error && <Alert severity="warning">{error}</Alert>}
      <Button
        variant="contained"
        sx={{ alignSelf: "flex-start" }}
        disabled={!entries.length || again.clashes.length > 0}
        onClick={add}
      >
        {entries.length > 1 ? t("teach.addMany", { n: entries.length }) : t("teach.addOne")}
      </Button>
    </Box>
  );
}

/** CLS-06: the school authorises use for children whose parents haven't signed up. */
function SchoolTerms({ school, onDone }) {
  const [form, setForm] = useState({ name: "", role: "", ok: false });
  const [error, setError] = useState("");
  const agree = async () => {
    try {
      await api.schoolConsent(school.id, { name: form.name.trim(), role: form.role.trim() });
      onDone();
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <Box
      component="section"
      aria-label={t("teach.terms")}
      sx={{
        ...card,
        borderColor: colors.sun.deep,
        bgcolor: colors.sun.soft,
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
      }}
    >
      <Typography component="h2" variant="h6">
        {t("teach.terms")}
      </Typography>
      <Typography>{t("teach.termsSub", { school: school.name })}</Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        <li>{t("teach.terms1")}</li>
        <li>{t("teach.terms2")}</li>
        <li>{t("teach.terms3")}</li>
      </Box>
      {error && <Alert severity="warning">{error}</Alert>}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label={t("teach.termsName")}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          sx={{ bgcolor: "background.paper" }}
        />
        <TextField
          size="small"
          label={t("teach.termsRole")}
          placeholder={t("teach.termsRoleEg")}
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          sx={{ bgcolor: "background.paper" }}
        />
      </Box>
      <FormControlLabel
        control={<Checkbox checked={form.ok} onChange={(e) => setForm({ ...form, ok: e.target.checked })} />}
        label={t("teach.termsAgree", { school: school.name })}
      />
      <Button
        variant="contained"
        sx={{ alignSelf: "flex-start" }}
        disabled={!form.ok || form.name.trim().length < 3 || form.role.trim().length < 2}
        onClick={agree}
      >
        {t("teach.termsButton")}
      </Button>
    </Box>
  );
}

/** CLS-05: what the teacher can see of one child. */
function Progress({ cls, student, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api
      .studentProgress(cls.id, student.id)
      .then(setData)
      .catch(() => setData({ error: true }));
  }, [cls.id, student.id]);
  const rows = (subjects) =>
    Object.entries(subjects || {}).map(([id, v]) => (
      <li key={id}>
        {getSubject(id)?.name || id}: {t("teach.lessonsStars", { lessons: v.lessons, stars: v.stars })}
      </li>
    ));
  return (
    <Dialog open onClose={onClose} aria-labelledby="progress" slotProps={dialog}>
      <Typography id="progress" variant="h5" component="h2">
        {studentName(student)}
      </Typography>
      {!data ? (
        <Typography>{t("teach.loading")}</Typography>
      ) : data.error ? (
        <Alert severity="warning">{t("teach.offline")}</Alert>
      ) : (
        <>
          <Box component="section" aria-label={t("teach.inClass")}>
            <Typography sx={{ fontWeight: 800 }}>{t("teach.inClass")}</Typography>
            <Typography>
              {t("teach.lessonsStars", { lessons: data.class.lessons, stars: data.class.stars })}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {rows(data.class.subjects)}
            </Box>
          </Box>
          <Box component="section" aria-label={t("teach.atHome")}>
            <Typography sx={{ fontWeight: 800 }}>{t("teach.atHome")}</Typography>
            {data.home ? (
              <>
                <Typography>
                  {t("teach.lessonsStars", { lessons: data.home.lessons, stars: data.home.stars })}
                </Typography>
                {data.home.subjects ? (
                  <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                    {rows(data.home.subjects)}
                  </Box>
                ) : (
                  <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
                    {t("teach.totalsOnly")}
                  </Typography>
                )}
              </>
            ) : (
              <Typography sx={{ color: "text.secondary" }}>{t("teach.notLinked")}</Typography>
            )}
          </Box>
        </>
      )}
      <Button variant="contained" onClick={onClose} sx={{ alignSelf: "flex-end" }}>
        {t("feedback.done")}
      </Button>
    </Dialog>
  );
}

/** CLS-07: a group's name and children, chosen with toggles (works with touch, mouse and keys). */
function GroupDialog({ cls, group, onSaved, onClose }) {
  const [name, setName] = useState(group?.name || "");
  const [ids, setIds] = useState(/** @type {string[]} */ (group?.student_ids || []));
  const [error, setError] = useState("");
  const save = async () => {
    setError("");
    try {
      const body = { name: name.trim(), student_ids: ids };
      const r = group ? await api.editGroup(cls.id, group.id, body) : await api.createGroup(cls.id, body);
      onSaved(r.groups);
    } catch (e) {
      setError(e.message);
    }
  };
  const remove = async () => {
    setError("");
    try {
      await api.deleteGroup(cls.id, group.id);
      onSaved((cls.groups || []).filter((g) => g.id !== group.id));
    } catch (e) {
      setError(e.message); // 409: "Remove the work assigned to this group first."
    }
  };
  return (
    <Dialog open onClose={onClose} aria-labelledby="group-title" slotProps={dialog}>
      <Typography id="group-title" variant="h5" component="h2">
        {group ? t("teach.editGroup", { name: group.name }) : t("teach.newGroup")}
      </Typography>
      <TextField
        label={t("teach.groupName")}
        placeholder={t("teach.groupNameEg")}
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 30))}
      />
      <Typography sx={{ fontWeight: 800 }} id="group-members">
        {name.trim() ? t("teach.groupMembers", { name: name.trim() }) : t("teach.groupMembersNew")}
      </Typography>
      <Box role="group" aria-labelledby="group-members" sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
        {cls.roster.map((s) => {
          const on = ids.includes(s.id);
          return (
            <Chip
              key={s.id}
              label={studentName(s)}
              aria-pressed={on}
              color={on ? "primary" : "default"}
              variant={on ? "filled" : "outlined"}
              onClick={() => setIds(on ? ids.filter((x) => x !== s.id) : [...ids, s.id])}
            />
          );
        })}
      </Box>
      {error && <Alert severity="warning">{error}</Alert>}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {group && (
          <Button color="error" onClick={remove} sx={{ mr: "auto" }}>
            {t("teach.deleteGroup")}
          </Button>
        )}
        <Button onClick={onClose}>{t("teach.cancel")}</Button>
        <Button variant="contained" disabled={!name.trim()} onClick={save}>
          {t("teach.saveGroup")}
        </Button>
      </Box>
    </Dialog>
  );
}

function Groups({ cls, onChange }) {
  const [editing, setEditing] = useState(/** @type {any} */ (null));
  const names = Object.fromEntries(cls.roster.map((s) => [s.id, studentName(s)]));
  const groups = cls.groups || [];
  return (
    <Box
      component="section"
      id="groups"
      aria-label={t("teach.groups")}
      sx={{ ...card, display: "flex", flexDirection: "column", gap: 1 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography component="h2" variant="h6" sx={{ flex: 1 }}>
          {t("teach.groups")}
        </Typography>
        <Button
          variant="outlined"
          sx={{ borderWidth: 2 }}
          disabled={!cls.roster.length}
          onClick={() => setEditing({})}
        >
          {t("teach.newGroup")}
        </Button>
      </Box>
      <Typography sx={{ color: "text.secondary", fontSize: 14 }}>{t("teach.groupsSub")}</Typography>
      {groups.length === 0 && <Typography sx={{ color: "text.secondary" }}>{t("teach.noGroups")}</Typography>}
      {groups.map((g) => (
        <Box
          key={g.id}
          data-group={g.name}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 0.75,
            borderBottom: `1px solid ${colors.line}`,
            "&:last-of-type": { borderBottom: 0 },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800 }}>
              {g.name}{" "}
              <Typography component="span" sx={{ fontWeight: 400, color: "text.secondary", fontSize: 14 }}>
                {g.student_ids.length === 1
                  ? t("teach.oneChild")
                  : t("teach.childrenN", { n: g.student_ids.length })}
              </Typography>
            </Typography>
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
              {g.student_ids
                .map((id) => names[id])
                .filter(Boolean)
                .join(", ")}
            </Typography>
          </Box>
          <Button aria-label={t("teach.editGroup", { name: g.name })} onClick={() => setEditing(g)}>
            {t("teach.edit")}
          </Button>
        </Box>
      ))}
      {editing && (
        <GroupDialog
          cls={cls}
          group={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(next) => {
            setEditing(null);
            onChange(next);
          }}
        />
      )}
    </Box>
  );
}

/** CRM-02: children who tapped 'Ask my teacher' on a class tablet, with their pictures. */
function HelpRequests({ cls, onDone }) {
  const asking = cls.roster.filter((s) => s.help);
  if (!asking.length) return null;
  return (
    <Box
      component="section"
      aria-label={t("teach.help")}
      role="status"
      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
    >
      {asking.map((s) => (
        <Alert
          key={s.id}
          severity="info"
          icon={<Initial s={s} />}
          action={
            <Button color="inherit" onClick={() => onDone(s)}>
              {t("teach.helpDone")}
            </Button>
          }
          data-help={studentName(s)}
        >
          <Typography sx={{ fontWeight: 800 }}>{t("teach.helpSub", { name: studentName(s) })}</Typography>
          <Box
            sx={{ display: "flex", gap: 1, mt: 0.5 }}
            role="img"
            aria-label={s.pictures.map((p) => t(`pictures.${p}`)).join(", ")}
          >
            {s.pictures.map((p, i) => (
              <PictureIcon key={i} id={p} size={48} />
            ))}
          </Box>
        </Alert>
      ))}
    </Box>
  );
}

/** T02 Class roster and join code (CLS-01..07), and children asking for their pictures (CRM-02). */
export default function ClassPage() {
  const ready = useHydrated();
  const router = useRouter();
  const id = useSearchParams().get("id") || "";
  const teacher = useFamily((s) => s.teacher);
  const mode = useFamily((s) => s.mode);
  const playingThis = useFamily((s) => s.mode === "class" && s.family?.classId === id);
  const [cls, setCls] = useState(null);
  const [error, setError] = useState("");
  const [showing, setShowing] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id) {
      router.replace("/teach"); // the nav's "Class" with no class chosen: pick one on Teacher home
      return;
    }
    api
      .getClass(id)
      .then(setCls)
      .catch((e) => setError(e.message));
  }, [id, router]);
  // CRM-02: 'Ask my teacher' shows up here within a few seconds while the page is open.
  useEffect(() => {
    if (!id) return undefined;
    const poll = setInterval(() => {
      if (document.visibilityState === "visible")
        api
          .getClass(id)
          .then(setCls)
          .catch(() => {});
    }, 15_000);
    return () => clearInterval(poll);
  }, [id]);
  if (!ready || (!cls && !error)) return <Loading />;
  if (!cls)
    return (
      <TeachShell title={t("teach.class")} active="/teach/class">
        <Alert severity="warning">{error}</Alert>
      </TeachShell>
    );
  const school = teacher?.school;
  const unlinked = cls.roster.filter((s) => !s.linked).length;
  const needTerms = unlinked > 0 && school && !school.consent;
  const play = async () => {
    setBusy(true);
    await startClassPlay(cls.id);
    router.push("/play");
  };
  const stop = async () => {
    setBusy(true);
    await endClassPlay();
    setBusy(false);
  };
  return (
    <TeachShell
      title={cls.name}
      sub={[cls.year_group, t(`band.${cls.band}`)].filter(Boolean).join(" · ")}
      active="/teach/class"
    >
      {playingThis && (
        <Alert
          severity="success"
          action={
            <Button color="inherit" onClick={stop} disabled={busy}>
              {t("teach.endPlay")}
            </Button>
          }
        >
          {t("teach.playing")}
        </Alert>
      )}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) 320px" },
          alignItems: "start",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <HelpRequests
            cls={cls}
            onDone={async (st) => {
              await api.editStudent(cls.id, st.id, { help: false });
              setCls(await api.getClass(cls.id));
            }}
          />
          {needTerms && (
            <SchoolTerms
              school={school}
              onDone={async () => {
                await refreshAccount();
              }}
            />
          )}
          <Box component="section" aria-label={t("teach.roster")} sx={card}>
            <Typography component="h2" variant="h6" sx={{ mb: 1 }}>
              {t("teach.roster")} ({cls.roster.length})
            </Typography>
            {cls.roster.length === 0 && (
              <Typography sx={{ color: "text.secondary" }}>{t("teach.noStudents")}</Typography>
            )}
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
              {cls.roster.map((s) => (
                <Box
                  component="li"
                  key={s.id}
                  data-student={studentName(s)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    flexWrap: "wrap",
                    py: 1,
                    borderBottom: `1px solid ${colors.line}`,
                    "&:last-of-type": { borderBottom: 0 },
                  }}
                >
                  <Initial s={s} />
                  <Box sx={{ flex: 1, minWidth: 120 }}>
                    <Typography sx={{ fontWeight: 800 }}>
                      {studentName(s)}{" "}
                      {s.linked && (
                        <Chip
                          size="small"
                          color="success"
                          label={t("teach.linked")}
                          aria-label={t("teach.linkedFull")}
                        />
                      )}
                    </Typography>
                    <Box
                      sx={{ display: "flex", gap: 0.5 }}
                      aria-label={t("teach.picturesOf", {
                        name: s.first_name,
                        list: s.pictures.map((p) => t(`pictures.${p}`)).join(", "),
                      })}
                      role="img"
                    >
                      {s.pictures.map((p, i) => (
                        <PictureIcon key={i} id={p} size={26} />
                      ))}
                    </Box>
                  </Box>
                  <Button
                    onClick={() => setShowing(s)}
                    aria-label={t("teach.progressFor", { name: studentName(s) })}
                  >
                    {t("teach.progress")}
                  </Button>
                  <Button
                    onClick={async () => {
                      await api.editStudent(cls.id, s.id, { new_pictures: true });
                      setCls(await api.getClass(cls.id));
                    }}
                    aria-label={t("teach.newPicturesFor", { name: studentName(s) })}
                  >
                    {t("teach.newPictures")}
                  </Button>
                </Box>
              ))}
            </Box>
          </Box>
          <Groups cls={cls} onChange={(groups) => setCls({ ...cls, groups })} />
          <AddStudents
            cls={cls}
            onAdded={async (r) => {
              setCls(r);
              await refreshAccount();
            }}
          />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            component="section"
            aria-label={t("teach.joinCode")}
            sx={{
              ...card,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontWeight: 800 }}>{t("teach.joinCode")}</Typography>
            <Typography
              data-testid="join-code"
              sx={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 34,
                letterSpacing: ".12em",
              }}
            >
              {cls.join_code}
            </Typography>
            <QrCode value={joinUrl(cls.join_code)} label={t("teach.qr", { code: cls.join_code })} />
            <Typography sx={{ fontSize: 14, color: "text.secondary" }}>{t("teach.codeSub")}</Typography>
            <Button size="small" onClick={async () => setCls(await api.newJoinCode(cls.id))}>
              {t("teach.newCode")}
            </Button>
          </Box>
          <Box sx={{ ...card, display: "flex", flexDirection: "column", gap: 1 }}>
            <Button
              component={Link}
              href={`/teach/letters?id=${cls.id}`}
              variant="outlined"
              sx={{ borderWidth: 2 }}
              disabled={!cls.roster.length}
            >
              {t("teach.letters")}
            </Button>
            {!playingThis && (
              <Button
                variant="contained"
                onClick={play}
                disabled={busy || !cls.roster.length || mode === "class"}
              >
                {t("teach.play")}
              </Button>
            )}
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>{t("teach.playSub")}</Typography>
          </Box>
        </Box>
      </Box>
      {showing && <Progress cls={cls} student={showing} onClose={() => setShowing(null)} />}
    </TeachShell>
  );
}
