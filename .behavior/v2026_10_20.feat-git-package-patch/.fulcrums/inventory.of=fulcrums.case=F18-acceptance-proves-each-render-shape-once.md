# F18 — the acceptance seam proves each render shape once; the full catalog stays at integration

## .the fork

the acceptance suite runs the verb through rhachet; the integration suite runs the shell entrypoint
direct. reviewers ask for more of the catalog at the rhachet seam: `pnpm patch-commit` blocked by the
built hook, the several-versions refusal (c7b), and five defensive malfunction branches with no test.

- **A. one exemplar per render shape at the seam** — a plan, an apply, a seal, a no-op rerun, a
  constraint on both streams (with its stderr frame snapped), an unknown flag, a lost record, a
  malfunction (exit 1) through rhachet. every catalog cell stays proven at integration
- **B. mirror the whole catalog at the seam** — each new case costs a fixture with a real pnpm
  install, and the hook cases must be snapped by proxy in this tree (F16)

## .taken: A

rhachet hands the render back untouched; what the seam can break is the frame (found? exit code?
both streams?), and each shape of frame is now proven once: exit 0, exit 2, and exit 1. a second
constraint with a different message adds no new frame. `pnpm patch-commit` reaches the same hook
branch as `pnpm patch` (`[case21][t0]`), and its inventory row is pinned at integration `[t6.1]`.

the five defensive malfunction branches (`commit.sh` prior-patch aside faults, an undeletable edit
dir, `begin.sh` pnpm left no edit dir) fire only when the filesystem or pnpm misbehave mid-run; a
test would have to inject that fault, which no fixture here can do without a mock. each renders
through the same `refuse_malfunction` the `[case3]` acceptance case and integration `[case6]` prove.

## .rework

clean: each extra seam case is one `when` block in `blackbox/git.package.patch.acceptance.test.ts`.

## .confidence: 85%, and why it is not higher

two reviewers asked for more seam coverage; the bound on how much is a taste call.

## .where

`blackbox/git.package.patch.acceptance.test.ts` · `blackbox/pretooluse.check-permissions.acceptance.test.ts` `[case21]`

## .verdict

open — for the fulcrum council.
