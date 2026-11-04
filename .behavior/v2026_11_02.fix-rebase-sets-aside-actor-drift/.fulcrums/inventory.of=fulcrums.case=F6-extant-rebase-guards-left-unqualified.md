# F6 — the extant rebase guards: qualify them, or leave them

## .the fork
- (a) leave the extant guards (no quota, no push permission, no uses left, base branch, rebase in progress, no rebase in progress) as they are: `└─ error: ...`, exit 1. qualify only the guards this pr adds
- (b) qualify every guard in the rebase subcommands this pr touches: `✋ ConstraintError:` + exit 2 for caller-must-fix, `💥 MalfunctionError:` + exit 1 for system-must-fix

## .taken
(b), for begin, continue, and abort. take and lock keep (a); dream: `.dream/v2026_11_02.fix.rebase-guards-unqualified-errors.md`.

the 5.3 peer review (ergo-snapshot-visual-blemishes, blocker 2) graded the bare `error:` labels a blocker in the renders this pr ships. begin, continue, and abort are the subcommands that carry the set-aside, so one render dialect now covers every path a clone walks with `--unstaged ignore`. the cost: four extant guards change exit 1 → 2 (no quota, no push permission, no uses left, rebase in progress, no rebase in progress), and the fetch failure keeps exit 1 under a 💥 header. the dispatcher tests that pinned `status 1` now pin 2.

## .rework
clean: a revert is the guard blocks, their snapshots, and three dispatcher asserts. no set-aside code reads the guard shape.

## .confidence
70%. this reverses (a), which the approved vision's open questions had put out of scope. a caller that branched on exit 1 for these guards now sees 2. the commander should confirm the scope extension at pr review.

## .verdict
ruled (b), by the wisher at 5.3 round i005 (seed S3). the scope widens past the vision's bound; the extant guards exit 2.

## .where
`git.branch.rebase.begin.sh`, `git.branch.rebase.continue.sh`, `git.branch.rebase.abort.sh` (guard blocks); `git.branch.rebase.integration.test.ts` cases 5–7.
