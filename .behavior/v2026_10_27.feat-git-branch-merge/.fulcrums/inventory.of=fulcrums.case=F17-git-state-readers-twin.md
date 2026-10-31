# F17 — catchup's git-state readers: reuse the rebase twin's, or hold own copies

## .the fork
`git.branch.rebase.operations.sh` and `git.branch.catchup.operations.sh` each hold git-state
readers. two are byte-identical one-liners: `get_conflict_files` (`git diff --name-only
--diff-filter=U`) and `get_current_branch` (`git rev-parse --abbrev-ref HEAD`). the others differ
for cause: catchup's `is_rebase_in_flight` resolves via `--git-path`; `get_commits_behind` takes
a git-side limit (no `| head` SIGPIPE); `get_uncommitted_files` reads staged files too;
`is_branch_catchup_target` refuses a detached HEAD; rebase's `print_files_tree` double-prints its
count under `grep -c . || echo "0"`. (a) source the rebase operations from catchup; (b) lift the
shared readers to a common `skills/git.branch/` operations file now
(`rule.prefer.most-common-denominator`); (c) hold catchup's own copies, and lift once the rebase
debt is paid.

## .taken
(c). (a) couples catchup to a file whose debt the director held out of this pr (F14): a later
rebase fix would ripple into catchup unseen. (b) edits the rebase skill, a ripple outside this
tree. the duplicate is two one-line git calls; the rest are not duplicates.

## .rework
clean: a lift moves two one-liners and repoints two `source` lines. no caller contract changes.

## .risk
low. the drift risk: a fix to one twin's conflict-file or branch reader misses the other. both
wrap one git command, so a drift would show at once in either suite.

## .confidence
80%. most-common-denominator argues to lift at the second reuse; the hold rests on the
director's one-task-one-tree call.

## .where
`git.branch.catchup.operations.sh`, `git.branch.rebase.operations.sh`; the lift sits in
`.dream/v2026_10_27.fix.rebase-begin-meter-and-exit-codes.md`.

## .verdict
taken by the driver: an execution fork (seed S6).
