# F12 — `lock refresh`: new copy, or a shared body with rebase

## .the fork
the rebase `lock refresh` demands a rebase in flight (`git.branch.rebase.lock.sh:108-113`) and
lacks the `package.json`-in-conflict check catchup needs (case=6 `[case6b]`). (a) a new copy in
catchup; (b) lift the install + stage body into a shared operations file, each verb keeps its own
in-flight guard.

## .taken
(a) a new copy in catchup, with exit 2 on constraints and the manifest check.

why: the rebase body exits 1 on every constraint (`:94-151`). a shared body must either keep that
exit 1, which copies the rebase debt into catchup, or move rebase to exit 2, which changes the
rebase verb's behavior. the director keeps the rebase twin's bugs out of this tree (seed S6); so the
body cannot be shared without one of the two harms.

## .rework
clean: a later lift, once the rebase exit codes are fixed under its dream, folds the two copies
into one with no caller change.

## .risk
low. drift risk, named: two lock-refresh bodies (package manager detection, install command) can
diverge. the dream `v2026_10_27.fix.rebase-begin-meter-and-exit-codes` is where the fold lands.

## .confidence
85%.

## .where
`5.1.execution.blueprint.md` § C2; `git.branch.catchup.lock.sh`.

## .verdict
taken by the driver: an execution fork, by the director's call (seed S6).
