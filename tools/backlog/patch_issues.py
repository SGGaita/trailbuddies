"""Update bodies of existing issues whose story changed. Usage: python3 patch_issues.py OWNER/REPO changed_ids.json"""
import json, sys, time
sys.argv = [sys.argv[0], sys.argv[1], sys.argv[2]]
REPO, IDS = sys.argv[1], json.load(open(sys.argv[2]))
import github_sync as g  # noqa: creates any new labels/milestones/issues first (idempotent)
from build import STORIES
issue_map = json.load(open("issue_map.json"))
by_id = {s["id"]: s for s in STORIES}
for sid in IDS:
    g.api("PATCH", f"issues/{issue_map[sid]}", {"body": g.body(by_id[sid])})
    time.sleep(0.8)
print("patched", len(IDS))
