"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { t } from "@trailbuddies/i18n";
import { useFamily } from "@/lib/store";
import { api } from "@/lib/account";

const KEY = "tb_teach_class";
const remembered = () => {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
};

/**
 * Which class a teacher screen shows: `?id=`, else the last one used on this device, else the
 * first. Loads it (roster, groups, devices) and reloads on demand.
 */
export function useTeachClass() {
  const teacher = useFamily((s) => s.teacher);
  const asked = useSearchParams().get("id") || "";
  const classes = teacher?.classes || [];
  const [fallback] = useState(remembered);
  const id = asked || (classes.some((c) => c.id === fallback) ? fallback : "") || classes[0]?.id || "";
  const [state, setState] = useState(
    /** @type {{ id: string, cls: any, error: string }} */ ({ id: "", cls: null, error: "" }),
  );
  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const cls = await api.getClass(id);
      setState({ id, cls, error: "" });
    } catch (e) {
      setState({ id, cls: null, error: e.message });
    }
  }, [id]);
  useEffect(() => {
    if (!id) return;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      /* private window */
    }
    api
      .getClass(id)
      .then((cls) => setState({ id, cls, error: "" }))
      .catch((e) => setState({ id, cls: null, error: e.message }));
  }, [id]);
  const current = state.id === id ? state : { id, cls: null, error: "" };
  return {
    id,
    classes,
    cls: current.cls,
    error: current.error,
    reload,
    setCls: (cls) => setState({ id, cls, error: "" }),
  };
}

/** A class switcher for teachers with more than one class. */
export function ClassPicker({ id, classes }) {
  const router = useRouter();
  const path = usePathname();
  if (classes.length < 2) return null;
  return (
    <TextField
      select
      size="small"
      label={t("teach.pickClass")}
      value={id}
      onChange={(e) => router.replace(`${path}?id=${e.target.value}`)}
      sx={{ minWidth: 200, bgcolor: "background.paper" }}
    >
      {classes.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {c.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
