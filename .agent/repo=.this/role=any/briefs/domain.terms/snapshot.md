# domain term: snapshot

## .the term

| term | kind | shape | sense |
|---|---|---|---|
| **snapshot** | dobj | a git tree, built by `gen_snapshot_index` | every tracked file as the worktree holds it right now — staged adds, hidden (flagged) edits, and half-settled conflicts included |

the one read the park, the rescue, and the halt all share, so no reader is blind to an edit another
sees.

## .the etymology

a still image of a scene at one instant; here, the worktree at one instant, as a tree.

rejected: **tree** — three senses already (`--from @tree` = this worktree, the park ref
`refs/worktree/cutover/tree`, a git tree object) · **copy** — says naught of the instant.

## .the evidence

the park read the worktree through HEAD's index and missed a staged-new file; the rescue read it
through status and missed a flagged edit. two readers, two blind spots. one shared read removed
both.

## .the invariants

1. park, rescue, and halt read the worktree through this one leaf, never their own
2. a snapshot never writes the worktree or the real index; it builds in a temp index

## .see also

- `cutover.md` · `park.md` · `rescue.md` · `halt.md`
