# F10: `--from <base>` / `--into <branch>`; no `--to`

- **wisher, 2026-10-14**: "i expect to see only --from and --into ; never an unqualified --to"
- **settled**: `--into <branch>` names the new branch (required). the repo's direction pair is
  `--from` / `--into` (`git.release --from main --into prod`, `mvsafe`, `cpsafe`)
- **best-guessed**: what `--from` names. taken: the **base** to cut from — default `main`, fetched
  and cut as `origin/<from>`, with a `master` fallback. rejected: `--from` as the source branch,
  since the source is always the branch this worktree is on, so a flag for it could only restate
  or contradict HEAD. this matches `git.release --from main` (a base) and #504's `--from main`
- **rework**: clean — a flag definition, before any code
- **confidence**: 75%
- **where**: yield `.the contract`
- **verdict**: refined by wisher, 2026-10-21 — `--from` is the base and is **required**, no
  default: `@main` (fresh origin/main), `<branch>` (fresh origin/<branch>), or `@tree` (stacked at
  HEAD). `@tree` qualifiers (`:commit`/`:stage`/`:delta`) dropped — in one worktree the uncommitted
  changes always come along. `--cherry-pick` renamed `--pick`; an allowlist, refused with `@tree`;
  no `--prune` (a prune is a history rewrite that keeps the stale base). every commit left behind
  is listed in plan and report (inv-14)
