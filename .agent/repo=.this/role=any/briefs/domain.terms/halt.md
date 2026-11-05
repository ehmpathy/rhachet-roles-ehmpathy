# domain term: halt

## .the term

| term | kind | shape | sense |
|---|---|---|---|
| **halt** | dobj state | `.halt` in the state (`pick-conflict` \| `carry-conflict`) | a stop that waits on a human settle, resumed by `continue`, undone by `abort` |

an interruption (a kill, a failed step) after the switch has no halt; `continue` resumes it too.

## .the etymology

a stop that expects a resume; distinct from a failure, which expects a fix.

rejected: **pause** — implies no human act is owed · **stop** — does not imply a resume.

## .the evidence

the wish's narrative (`cutover.md` § the evidence): of a pick that conflicts, the human said *"stop
there, I'll settle it"*.

## .the attributes

- `halt_snapshot` — the worktree's **snapshot** (`snapshot.md`) at the last halt. abort rescues
  only a worktree that has moved since
- `conflicts[]` — the paths the halt waits on

## .the invariants

1. a halt is a constraint (exit 2); a malfunction keeps the state so abort can undo it (exit 1)
2. the halt snapshot holds only what the cutover wrote: a tracked edit the cutover did not write is
   saved to a **rescue** (`rescue.md`) before the drive runs, so no later halt counts it as its own

## .see also

- `cutover.md` · `rescue.md` · `snapshot.md`
