# F19 — peer concerns on `git.commit.operations.sh` code this PR did not author

## .the fork
peer round i001 graded the whole `git.commit.operations.sh` diff. the diff holds two kinds of code:
(1) the leaves this PR lifted out of `git.commit.set.sh` or added for catchup (`refuse_if_commit_blocked`
through `set_commit_meter_state`), and (2) code present on `origin/main` unchanged: the keyrack
source (line 34), `findsert_gitignored_dir`, `print_sponsor_corrupt_render`, the three corrupt-note
renders, the role-dir placement, and the comment style (caps emphasis, signal emoji, round-bound
prose). (a) fix every concern in this PR; (b) fix the lifted and added leaves, defer the pre-extant
code to a dream; (c) defer all.

## .taken
(b). the lifted and added leaves got their fixes: a validated, jq-encoded, temp-then-rename meter
write that fails loud; a uses transformer that refuses a non-integer; one meter write in auto-revoke;
a kept fetch status; a fail-closed quota status; named sponsor-read statuses; named transforms for
the identity split and the shown path; lowercase acronyms. the pre-extant code is a separate change
to `git.commit.*` behavior and shape that every `git.commit` skill rides; it rides its own pr. the
role-dir placement already has its dream (`.dream/v2026_09_27.fix.git-commit-operations-out-of-role-dir.md`);
the rest sits in `.dream/v2026_10_30.fix.git-commit-operations-preextant-hazards.md`.

## .rework
clean: each deferred item is a local edit to `git.commit.operations.sh` (and its callers' snapshots);
no catchup contract depends on the current shape of any of them. every catchup caller sources
`output.sh` before the ops file, so `print_sponsor_corrupt_render` resolves in this PR's paths.

## .risk
low. the deferred items are on main today and unchanged by this PR; the defer neither adds nor
widens a hazard.

## .confidence
85%. a reviewer may hold that a lift owns the whole file it lands in; the lift moved ten leaves, not
the file.

## .where
`src/domain.roles/mechanic/skills/git.commit/git.commit.operations.sh`; peer reports i001 r001, r002,
r004, r005, r006, r007, r009.

## .verdict
taken by the driver: an execution fork (seed S6). open to the commander at done.
