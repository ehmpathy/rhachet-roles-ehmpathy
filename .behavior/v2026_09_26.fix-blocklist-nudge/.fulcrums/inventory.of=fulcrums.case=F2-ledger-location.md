# F2 — ledger location + format

- **fork:** `.claude/…` (per actor, beside the extant nudge record) vs a repo-level cache path vs a
  global `~/.rhachet/storage/…` path that spans repos.
- **taken:** first draft chose per-actor `.claude/…local.jsonl`.
- **verdict (wisher, 2026-09-27):** `.agent/.cache/repo=ehmpathy/role=mechanic/skill=…/`. the
  `skill=` slug for a hook is filled as `check-permissions` — a best guess, clean to rename. the
  path is already gitignored (`.agent/.cache/`), so no `.gitignore` line is owed. format stays
  append-only jsonl, which the wisher confirmed is safe for concurrent appends (R2).
- **rework:** clean — one path constant.
