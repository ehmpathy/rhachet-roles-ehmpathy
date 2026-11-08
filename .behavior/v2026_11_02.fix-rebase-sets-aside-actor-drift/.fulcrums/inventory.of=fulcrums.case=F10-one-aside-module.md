# F10 — the set-aside store: one module, or three (store, move, render)

## .the fork
- (a) one module, `git.branch.rebase.aside.operations.sh`, holds the store's lifecycle, its moves, and its renders
- (b) three modules: `aside.store`, `aside.move`, `aside.render`

## .taken
(a). every function in it serves one domain object, the set-aside store, and its three callers (begin, continue, abort) source it whole. a split adds two source edges and a load order to keep, and no caller would source one part alone. the generic utilities that are not about the store (`read_named_args`, `as_shell_words`) moved to `git.branch.rebase.operations.sh`, where `lock` and `take` can reach them. wet over dry: split once a second consumer needs one grain alone.

## .rework
clean: cut along the seams the reviewer named; each caller's `source` line becomes three.

## .confidence
80%. the file is ~560 lines; a reader may prefer three short files.

## .where
`src/domain.roles/mechanic/skills/git.branch.rebase/git.branch.rebase.aside.operations.sh`.
