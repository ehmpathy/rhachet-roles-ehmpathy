# F26: the rebase refusal keeps its `error:` header

## the fork

`git.branch.rebase`'s `print_no_rebase_error` opens with `error: no rebase in progress`. this pr
adds a cutover pointer beneath it (a cutover is in flight, not a rebase). r011 (5.3 i003 n7) asks
the header to match the cutover verbs' `✋ ConstraintError:`.

(a) recast the rebase header to `✋ ConstraintError:` in this pr · (b) keep the rebase skill's
header; this pr adds only the pointer and its 🥥 hint

## taken: (b), and why at the time

- the header is the rebase skill's, on main, across begin / continue / abort / take. a recast
  rewrites main's extant `no rebase in progress` snaps, which r012 (5.3 i003) counted as untouched
  and read as test intent kept
- `rule.require.qualified-error-headers` does call for the qualified header, so the recast is owed;
  it belongs to a rebase-skill change that moves every rebase refusal at once, not to one pointer

## rework: clean

one function in `git.branch.rebase.operations.sh` plus a resnap of the rebase suites.

## confidence: 75%, and why it is low

the recast is small; a council may prefer it here over a split of one skill's headers across two prs.

## where

`src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.operations.sh`,
`print_no_rebase_error`; the follow-up is item 35 of
`.dream/2026_10_21.fix-cutover-position-table-and-shared-leaves.dream.md`

## verdict

open — for the council.
