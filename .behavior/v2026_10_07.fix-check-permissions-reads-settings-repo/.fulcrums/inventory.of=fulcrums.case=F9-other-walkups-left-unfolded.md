# F9 — the three non-permission walk-ups are left unfolded

- **fork**: (a) leave `find_claude_dir` in sedreplace, the gerunds hook, and the blocklist hook as is; catch a dream · (b) fold all four walk-ups into one shared helper in this change · (c) also move their nudge files to the config dir in this change
- **taken**: (a). those three copies keep only nudge state; none reads an allowlist, so none is the #895 defect. each handles "no `.claude` found" its own way (create in `$PWD`, create in the git root, or exit), so a fold changes behavior in two hooks and a skill, each with its own suite. that ripple is outside this diff
- **rework**: dirty, mildly — a fold touches three files and three suites outside the change, and (c) moves nudge state for every hash-actor clone
- **confidence**: 85%. the permission walk-up now matches theirs (in-shell strip, same stop at `/`), so a later fold is close to a pure move
- **where**: `review/self/for.5.1.execution.from_vision._.has-consistent-mechanisms.md`; dream `dreams/v2026_10_08.fix.fold-claude-dir-walkups-and-nudges-into-config-dir.md`
- **verdict**: —
