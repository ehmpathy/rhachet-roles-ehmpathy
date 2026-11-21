# F19 — set picks its phase by the seal flags; get keeps the exit 2; uses stays its own skill

## .the fork

the review asks for set/get/del, with get always a check. three shapes stay open under that ask:

- **how set knows open from seal** — A. `--why` or `--upstream` present → seal, else open · B. a
  positional phase (`set open` / `set seal`)
- **what get exits on a stale patch** — A. exit 2, as check did · B. exit 0, a report only
- **where the human meter lives** — A. its own skill `git.package.patch.uses` · B. a fourth dispatcher
  subcommand

## .taken: A, A, A

- the seal flags are exactly what parts the two phases; a positional phase would be a second way to
  say one claim, and a seal without `--why` is refused either way
- get absorbs check, so it keeps check's contract: a repair owed is a constraint the caller must
  fix (exit 2); `--when hook.onStop` still always exits 0
- the meter is human-only and gated by a tty; out of the dispatcher, a clone's paved verb list holds
  set, get, del, and the human's grant verb sits apart, as `git.commit.uses` does

## .rework

clean: each is a router branch, an exit line, or a file move; no caller hardens on any.

## .confidence: 85%, and why it is not higher

the reviewer named the three verbs, not these three sub-shapes.

## .where

`skills/git.package.patch/git.package.patch.set.sh` · `git.package.patch.get.sh` ·
`git.package.patch.uses.sh` · `git.package.patch.sh`

## .verdict

open — for the fulcrum council.
