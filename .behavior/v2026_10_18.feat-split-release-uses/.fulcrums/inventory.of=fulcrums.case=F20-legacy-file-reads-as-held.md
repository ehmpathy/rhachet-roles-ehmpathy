# F20 — a legacy commit file reads as held, save `uses 0` + `push block`

## .the fork

a `.meter/git.commit.uses.jsonc` written before the split carries `{ uses, push, stage? }` and no
`held` field. the reader must decide whether that grant is held.

- **A (taken)** — held, unless `uses == 0` and `push == "block"`. that one shape is what every
  old revoke (`block`, `del`, `set --quant 0`) wrote, so it reads as revoked.
- **B** — held only where `push == "allow"`. a legacy `{ uses: 3, push: "block" }` reads as revoked.
- **C** — refuse every legacy file as damaged, and make the human re-grant.

## .taken, and why

A. the old file held two bits, and the split folds them into one. an old `push block` with uses
left meant "commit, but do not push". that sub-grant retires (F17): a commit grant now carries its
push. B would revoke a commit grant the human gave, and C would strand every tree after an upgrade.
A changes one fact: a tree that could commit but not push can now push to its own branch, which
is the act the split makes cheap.

the first write by `git.commit.set` rewrites the file as `{ uses, held: true }`, so the legacy
shape does not linger. `git.commit.uses get` names the retired fields in a hint.

## .rework

clean. the rule is one jq expression in `read_commit_local_grant`
(`git.commit.operations.sh`). B or C is a one-line change there plus the legacy table in
`git.commit.uses.integration.test.ts [case6b]`.

## .confidence — 70%, and why it is low

the commander's order did not speak to legacy files. A widens one old grant (push where push was
blocked). a human who wrote `--push block` on purpose may not expect that.

## .where

- `src/domain.roles/mechanic/skills/git.commit/git.commit.operations.sh` — `read_commit_local_grant`
- clamp: `git.commit.uses.integration.test.ts [case6b]`, `git.commit.set.integration.test.ts [case27]`,
  `git.stage.add.integration.test.ts [case3][t3]`

## .verdict

open.
