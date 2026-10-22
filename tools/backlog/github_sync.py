"""Create labels, milestones and one issue per story in a GitHub repo via the REST API (gh api).
Idempotent: skips labels/milestones/issues that already exist (issues matched by '[ID]' title prefix).
Usage: python3 github_sync.py OWNER/REPO
"""
import json, subprocess, sys, time
import meta
from build import STORIES, EPIC_NAME

REPO = sys.argv[1]

def api(method, path, data=None, paginate=False):
    cmd = ["gh", "api", "-X", method, f"repos/{REPO}/{path}", "-H", "Accept: application/vnd.github+json"]
    if paginate: cmd.append("--paginate")
    if data is not None: cmd += ["--input", "-"]
    r = subprocess.run(cmd, input=json.dumps(data) if data is not None else None, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{method} {path}: {r.stderr.strip()} {r.stdout[:300]}")
    out = r.stdout.strip()
    if paginate and out.startswith("[") and "][" in out:
        out = "[" + out[1:-1].replace("][", ",") + "]"
    return json.loads(out) if out else None

EPIC_COLOURS = ["1f77b4", "ff7f0e", "2ca02c", "d62728", "9467bd", "8c564b", "e377c2", "7f7f7f", "bcbd22", "17becf"]
labels = {}
for i, (e, name) in enumerate(meta.EPICS):
    labels[f"epic:{e}"] = (EPIC_COLOURS[i % len(EPIC_COLOURS)], name)
for p, c in (("Must", "b60205"), ("Should", "fbca04"), ("Could", "c2e0c6")):
    labels[f"priority:{p}"] = (c, f"MoSCoW {p}")
for sz, pts in meta.SIZE_POINTS.items():
    labels[f"size:{sz}"] = ("bfd4f2", f"{pts} point(s)")
for n in range(0, 25):
    labels[f"sprint:S{n}"] = ("ededed", f"Sprint {n}")
labels["user-story"] = ("0e8a16", "User story from the Trailbuddies backlog")

existing = {l["name"] for l in api("GET", "labels?per_page=100") + api("GET", "labels?per_page=100&page=2")}
for name, (colour, desc) in labels.items():
    if name not in existing:
        api("POST", "labels", {"name": name, "color": colour, "description": desc[:100]})
print("labels ok")

ms_existing = {m["title"]: m["number"] for m in api("GET", "milestones?state=all&per_page=100")}
ms_num = {}
for m in meta.MILESTONES:
    if m["title"] in ms_existing:
        ms_num[m["id"]] = ms_existing[m["title"]]
    else:
        ms_num[m["id"]] = api("POST", "milestones", {"title": m["title"], "due_on": m["due"] + "T17:00:00Z",
                                                     "description": f"Sprints {m['sprints']}"})["number"]
print("milestones ok", ms_num)

have = {}
_all, _p = [], 1
while True:
    _batch = api("GET", f"issues?state=all&per_page=100&page={_p}")
    _all += _batch
    if len(_batch) < 100: break
    _p += 1
for i in _all:
    if i["title"].startswith("["):
        have[i["title"].split("]")[0][1:]] = i["number"]

def body(s):
    lines = [f"**{s['story']}**", "", "### Acceptance criteria"]
    for n, a in enumerate(s["ac"], 1):
        lines += [f"**Scenario {n}**", "```gherkin", f"Given {a['given']}", f"When {a['when']}", f"Then {a['then']}", "```"]
    lines += ["", "### Details", f"- Epic: {s['epic']} ({EPIC_NAME[s['epic']]})", f"- Persona: {s['role']}",
              f"- Priority: {s['priority']} · Size: {s['size']} ({meta.SIZE_POINTS[s['size']]} pt)",
              f"- Milestone: {s['milestone']}" + (f" · Sprint: {s['sprint']}" if s["sprint"] else "")]
    if s["screens"]:
        lines.append("- Wireframes: " + ", ".join(f"{sc} {meta.SCREENS[sc][0]}" for sc in s["screens"]))
    lines += ["", "_Generated from the Trailbuddies backlog; IDs match `Trailbuddies-backlog.xlsx` and `Trailbuddies-user-stories.md`._"]
    return "\n".join(lines)

order = sorted(STORIES, key=lambda s: ([m["id"] for m in meta.MILESTONES].index(s["milestone"]), int(s["sprint"][1:]) if s["sprint"] else 99, s["id"]))
mapping = {}
for s in order:
    if s["id"] in have:
        mapping[s["id"]] = have[s["id"]]; continue
    lab = ["user-story", f"epic:{s['epic']}", f"priority:{s['priority']}", f"size:{s['size']}"] + ([f"sprint:{s['sprint']}"] if s["sprint"] else [])
    r = api("POST", "issues", {"title": f"[{s['id']}] {s['title']}", "body": body(s), "labels": lab, "milestone": ms_num[s["milestone"]]})
    mapping[s["id"]] = r["number"]
    time.sleep(1.2)  # stay well under secondary rate limits
json.dump(mapping, open("issue_map.json", "w"), indent=1)
print("issues:", len(mapping))
