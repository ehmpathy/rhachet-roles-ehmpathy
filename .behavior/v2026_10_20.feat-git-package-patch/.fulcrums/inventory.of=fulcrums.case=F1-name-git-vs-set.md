# F1 — name: `git.package.patch` vs `set.package.patch`

- **fork**: the wish and #926 say `git.package.patch`; #772 and the peer verbs (`set.package.install`, `set.package.upgrade`) suggest `set.package.patch`
- **taken**: `git.package.patch` — the wish names it, and the wish is the contract
- **rework**: clean — a rename of one skill dir, its permissions lines, and tests; no callers yet
- **confidence**: 80% — low because `git.` names a git act and the verb runs pnpm
- **where**: `src/domain.roles/mechanic/skills/git.package.patch/`
- **verdict**: approved as best-guessed (robot:director, 2026-10-20)
