# domain term: park

## .the term

| term | kind | shape | sense |
|---|---|---|---|
| **park** | dobj + act | `refs/worktree/cutover/{tree,index}` | a verified copy of the tracked edits, held in this worktree's own refs while the tree resets |

## .the etymology

set aside in a known place, to be taken up again. a parked car is neither gone nor in use.

rejected: **stash** — 🔴 `git stash` is one stack shared by every worktree; another session can pop
it. the park is per worktree by construction, so the word must not invite that read.

## .the evidence

the wish's narrative, step 3 (`cutover.md` § the evidence): the human said *"set the edits aside,
then put them back"*. the first half is the park; the second is the **carry** (`carry.md`).

## .the attributes

- `tree` — a **snapshot** (`snapshot.md`) of the worktree at the claim
- `index` — the stage split at the claim, so the carry lays it back as it stood
- per worktree: under `refs/worktree/`, so no peer worktree sees or moves it

## .the invariants

1. a reset runs only over a park git can name — written, then read back
2. the park is dropped only after its edits are back on disk
3. untracked files are never parked; they are never touched

## .see also

- `cutover.md` — the verb the park serves
- `carry.md` · `rescue.md` · `snapshot.md`
