# Backlog tools

Stories live in `stories_a.py` … `stories_d.py` (epics, personas and milestones in `meta.py`, helpers and validation in `common.py`).

```bash
python3 build.py          # validate, then write the Markdown backlog, the Excel workbook and backlog.json
python3 github_sync.py    # create/update labels, milestones and one issue per story (uses gh api)
python3 patch_issues.py   # update issues for changed stories only
```

`issue_map.json` maps story IDs to GitHub issue numbers so re-runs update rather than duplicate. Paginate with `?per_page=100&page=N`; don't use `gh --paginate` with numeric repository paths.
