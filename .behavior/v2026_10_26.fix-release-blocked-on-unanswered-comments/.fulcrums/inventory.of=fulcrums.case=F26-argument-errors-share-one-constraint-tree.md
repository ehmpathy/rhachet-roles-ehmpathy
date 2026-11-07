# F26 — every `git.release` argument error shares one `✋ ConstraintError` tree

## the fork
- A: only the unknown-flag refusal (the gate's bypass guard) uses the `✋ ConstraintError` tree; `--into`, `--mode`, `--dirty`, and not-in-repo keep main's `error: …` line
- B: all five share one tree via `refuse_argument`: header, `usage:`, `see every flag:` (not-in-repo: `fix:`)

## taken: B, and why at the time
- two reviewers asked opposite things. r006 i002 (ergo-snapshot-visual-blemishes) graded the two formats side by side a blocker: one skill, two shapes for one kind of error. r012 i003 (enroll-verif-test-intent) calls the change out of scope
- the bypass guard is in scope (the wish: no bypass flag), and its refusal must carry the class header (`rule.require.qualified-error-headers`: a header with no `ConstraintError:` qualifier = blocker). once one argument error carries it, the other four read as a second format beside it
- the four are in `git.release.sh`, the file the gate already edits, ~10 lines: small, safe, clean under scouts honor. no assertion was loosened: p1's stderr `toContain` checks still pass; p1 case7 gained stdout assertions
- bite: header reverted to `error:` → p1 case7 red

## rework: clean
A restores four `echo "error: …" >&2; exit 2` lines and resnaps 7 p1/p2 entries. r006's blocker would reopen.

## confidence: 70%, why low
r012 is right that the wish does not ask for it; the call rests on rule and consistency, not on the wish.

## where
`git.release.sh` `refuse_argument` · p1 case7, p2 `case-arg-*` snaps · r006 blocker.1 (i002), r012 blocker.3 (i003)

## verdict
(awaits council)
