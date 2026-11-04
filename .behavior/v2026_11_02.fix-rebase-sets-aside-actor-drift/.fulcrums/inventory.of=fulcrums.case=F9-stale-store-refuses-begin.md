# F9 — a store left from a prior run: begin refuses, or begin recovers and proceeds

## .the fork
- (a) `begin` refuses (exit 2) and names `abort`, which puts the paths back; the clone then runs `begin` again
- (b) `begin --unstaged ignore` puts the held paths back itself, then sets the tree aside again and rebases

## .taken
(a), as the approved vision's edgecase E7 states. a store left behind means a prior run died or a put-back failed. the held copies may predate edits the human made since. (b) would put those copies over the newer edits, then set the result aside under a fresh store, all in one step with no human look. the refusal costs one extra command and keeps the recovery visible.

## .rework
clean: one guard in `begin.sh` would call `set_held_paths_put_back` instead of `print_aside_held_refusal`; case6 and case20 flip.

## .confidence
85%. fewer paths favors (b); the cost of a silent overwrite of a newer edit favors (a).

## .where
`git.branch.rebase.begin.sh`, the held-store guard.
