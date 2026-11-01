# F2 — fallback render rides the extant `opened:` line

## .the fork
the wish wants one line with the cause and the auth used. options: (a) rewrite the `opened:` value to `as-human (fallback: <cause>)`; (b) add a new `fallback:` branch beside `opened:`; (c) a 🥥 note below the tree.

## .taken, why
(a). the `opened:` line already names the auth. one line carries both facts, and caseC stays byte-identical.

## .rework, why
clean. one label helper (`get_auth_who_label`) and snapshots.

## .confidence, why low
80%. the explicit `--auth as-human` label already reads `(gh cli login, fallback)`, so two kinds of "fallback" share a word. a wisher may want that label renamed. this round leaves it alone.

## .verdict
director at 1.vision approval (seed S2): "fallback" names the automatic switch only. the explicit `--auth as-human` label drops the word, so one word holds one sense. the low-confidence point above is settled against this round's choice to leave that label: the rename lands in execution.

## .where
`git.commit.operations.sh:949` `get_auth_who_label`.
