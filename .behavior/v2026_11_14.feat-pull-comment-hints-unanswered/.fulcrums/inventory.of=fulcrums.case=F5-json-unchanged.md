# F5 — json output stays unchanged

## .the fork
under `--output json` stdout holds one json object. options: (a) json unchanged, hint in the tree only; (b) add an `unanswered` field to the set's json.

## .taken, why
(a). the hint is optional guidance (a 🥥), and a json caller already has `get --unanswered --output json` for the list. (b) would put a read failure inside a write's contract.

## .rework, why
clean: an additive field later breaks no caller.

## .confidence, why low
75%. a composed clone might prefer one call.

## .where
`git.pull.comment.set.sh` emit
