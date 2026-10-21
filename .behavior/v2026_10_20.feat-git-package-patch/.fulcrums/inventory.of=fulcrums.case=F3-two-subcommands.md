# F3 — shape: `begin` + `commit`, not one call

- **fork**: one call that takes a diff via `@stdin`, vs two calls with the crew's own edits between
- **taken**: two calls. a stdin diff makes the crew hand-write hunks, the pain #926 records; the `begin`/`commit` pair mirrors `git.branch.rebase begin`/`continue`
- **rework**: clean — a `--diff @stdin` form can be added to `commit` later
- **confidence**: 85%
- **where**: the skill's dispatch
- **verdict**: approved as best-guessed (robot:director, 2026-10-20)
