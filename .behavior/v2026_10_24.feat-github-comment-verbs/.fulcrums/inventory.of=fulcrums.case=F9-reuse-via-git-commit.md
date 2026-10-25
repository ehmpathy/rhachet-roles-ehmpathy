# F9 · reuse the auth vocab and output leaves through `../git.commit/*`

## .the fork
- **A (taken)** — `git.pull.comment.operations.sh` sources `../git.commit/git.commit.operations.sh` and `../git.commit/output.sh`, as `git.release` and `git.repo.get` already do
- **B** — lift `emit_both`, `print_*`, `is_arg_in_enum`, the `--auth` vocab, and `keyrack.operations.sh` into a neutral shared module; repoint git.commit, git.release, git.repo.get, and git.pull.comment at it

## .taken, and why (at the time)
peer review r5 (arch-smell-scopeleaks) named A a cross-domain reach-in. it is one — and it is this repo's extant shape: `git.release/git.release.operations.sh:620` and `git.release/output.sh:21` source `../git.commit/*`, `git.repo.get/git.repo.get.sh:45` sources `../git.commit/output.sh`. B is the right end state, but it moves files three other skills source, so it ripples beyond this pr's wish (the verb family) into git.commit, git.release, and git.repo.get and their suites.

## .rework
**clean.** git.pull.comment touches the shared leaves through two `source` lines; B repoints those two lines. no caller of the verbs sees the change.

## .confidence — 80%
low part: whether the director wants the lift in this pr. the wish bounds scope to the verb family, and scouts-honor's CLEAN test fails for B (it ripples). dream caught: `.dream/v2026_10_24.lift.shared-skill-leaves.md`.

## .where
`src/domain.roles/mechanic/skills/git.pull.comment/git.pull.comment.operations.sh` (the two `source` lines)

## .verdict
open — the wisher's call at review.
