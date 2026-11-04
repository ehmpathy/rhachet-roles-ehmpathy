# F8 — a rebase that fails to start: one exit code, or split by cause

## .the fork
- (a) every start failure is `💥 MalfunctionError`, exit 1, as the vision line reads
- (b) a local file in main's way is `✋ ConstraintError`, exit 2; every other start failure stays `💥`, exit 1

## .taken
(b). a file in the way is the caller's to clear: exit-code semantics put that at exit 2, and the cure (move the file, rerun) is the caller's move. every other cause (a hook that refuses, an unreadable remote) stays a malfunction. both put the held paths back at once and delete the store, as the vision says. the cause is read from git's prose, pinned to `LC_ALL=C` at the pull so the match holds on any host locale.

## .rework
clean: one `grep` and three variables in the start-failure branch of `begin.sh`; case7 (exit 2) and case18 (exit 1) clamp each side.

## .confidence
85%. the vision line names exit 1 for the whole class; this narrows it for one cause a peer reviewer flagged as a constraint. a reversal is a one-line revert plus case7's expected status.

## .where
`git.branch.rebase.begin.sh`, the branch after `git pull --rebase` fails with no rebase in progress.
