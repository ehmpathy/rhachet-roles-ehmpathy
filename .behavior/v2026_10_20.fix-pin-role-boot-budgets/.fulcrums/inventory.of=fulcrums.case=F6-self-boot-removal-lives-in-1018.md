# F6 — the self-boot hook removal ships in #1018, not #1002

- ruled by: the director, 2026-10-20 — "keep that removal out of your #1002 pr; once #1018 lands,
  rebase on main so your pr holds only the boot budgets. until then, keep it local"
- local-only until #1018 lands (never staged, never committed here):
  - `src/domain.roles/architect/getArchitectRole.ts`
  - `src/domain.roles/ergonomist/getErgonomistRole.ts`
  - `src/domain.roles/mechanic/getMechanicRole.ts`
  - `src/domain.roles/mechanic/getMechanicRole.test.ts`
  - `src/domain.roles/mechanic/__snapshots__/getMechanicRole.test.ts.snap`
  - `src/domain.roles/mechanic/inits/init.claude.hooks.src` (deletion)
- open at rebase, best-guessed: #1018 is not yet on github, so its file list is unread. the
  rhachet 1.50 bump (`package.json`, `pnpm-lock.yaml`) and its fallout (two settings reads, the
  `<briefs.ref>` assert, `.depcheckrc.yml`, the `repo introspect` ci step) may ride #1018 too.
  rule: after the rebase onto main, whatever main still lacks stays in #1002; whatever main holds
  drops out. the pins need rhachet ≥ 1.49, so #1002 cannot land ahead of the bump
- rework: clean — a scope boundary, no code changes
- confidence: 90% on the six files; the bump's home is unknown until #1018 is readable
- verdict: ruled (director) for the six files; awaited for the bump
