# domain term: rescue

## .the term

| term | kind | shape | sense |
|---|---|---|---|
| **rescue** | dobj | `refs/cutover/rescue/<tree>` | a copy of a worktree that holds an edit the cutover did not write, saved before a reset or a drive could erase or absorb it |

named by the tree it holds, kept repo-wide so `git worktree remove` cannot take it, until the human
drops it.

## .the etymology

to save from loss at the moment of danger. the reset, or a pick that folds an edit into its replay,
is the danger.

## .the evidence

each narrative is a defect that lost, or nearly lost, an edit:

| narrative | where the rescue is taken |
|---|---|
| a human saves a fix mid-halt, gives up, and runs abort; the reset would erase the fix (case78, case86) | abort, before its reset |
| a peer write lands mid back-out; the reset would erase it (case98) | the undo ladder, before its reset |
| a human settles one halt, edits an unrelated file unstaged, runs continue, halts again, and aborts; the second halt's snapshot held the edit as the cutover's own, so abort reset it unsaved (case102) | continue's drive, before a pick or the carry |

## .the attributes

- `rescue_refs[]` in the state — every rescue saved, so a rerun after a kill still reports each,
  and a second rescue never erases the first's name
- the ref name is the raw tree sha: the sha is the snapshot's identity, so a rescue is findsert

## .the invariants

1. no reset erases an edit the cutover has not saved: the rescue is written and read back first; a
   failed rescue stops the verb before the reset
2. every rescue is named in the report of the verb that saved it, with how to restore and drop it

## .see also

- `cutover.md` · `snapshot.md` · `halt.md`
