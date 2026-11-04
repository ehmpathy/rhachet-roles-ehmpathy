# F7 — two cures name raw git commands a clone cannot run without a prompt

## .the fork
- (a) keep `git checkout HEAD -- <path>` and `git restore --staged <path>` as the cures; a clone that runs one meets a permission prompt
- (b) point the cures at the paved stand-in `git show HEAD:<path> | rhx teesafe --into <path> --idem upsert`
- (c) allowlist the two path-scoped forms in this pr

## .taken
(a). (b) is wrong for a symlink: teesafe writes a regular file, and the held paths this skill exists for include a symlink. (c) widens what a clone may discard with no prompt, a policy call for the human, outside this wish. dream: `dreams/v2026_11_02.fix.rebase-cures-name-unpaved-git.md`.

## .rework
clean: two cure lines in `print_aside_report` and begin.sh's staged refusal, plus their snapshots.

## .confidence
80%. a reader may prefer (c) now, since the main-changed cure is the one a clone most needs after a rebase.

## .where
`git.branch.rebase.operations.sh` `print_aside_report` (take main's); `git.branch.rebase.begin.sh` staged-content guard.
