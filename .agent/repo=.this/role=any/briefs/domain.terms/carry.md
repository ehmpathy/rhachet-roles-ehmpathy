# domain term: carry

## .the term

| term | kind | shape | sense |
|---|---|---|---|
| **carry** | act | the last step of a cutover (phase `carry`) | lay the parked edits down onto the new branch, unstaged |
| **empty carry** | state | `is_cutover_empty_carry` | a cutover from a base other than this tree, with no pick landed and no tracked edit: the new branch is the base itself, so no push is owed yet |

## .the etymology

take along, intact, to the new place. the work rides across; the old branch stays behind.

rejected: **sprout** (`#504`) for the empty case — it names the new branch's birth, not the move.
the empty carry is a cutover whose load happened to be naught, not a second verb.

## .the evidence

the wish's narrative, step 3 (`cutover.md` § the evidence): *"set the edits aside, then put them
back"*. the second half is the carry; the first is the **park** (`park.md`).

## .the attributes

- reads the park's `tree` and `index`
- a carry that conflicts with the base halts as `carry-conflict` (`halt.md`)

## .the invariants

1. the carry writes only tracked files the park holds; untracked files are never touched
2. the carried edits land unstaged, so the human reviews them before a commit

## .see also

- `cutover.md` · `park.md` · `halt.md`
