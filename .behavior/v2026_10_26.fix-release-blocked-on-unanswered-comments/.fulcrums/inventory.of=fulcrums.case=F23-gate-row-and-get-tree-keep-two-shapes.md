# F23 — the gate's one-line row and `get`'s full tree keep two shapes

## the fork
- A: align the two: one noun (`review` or `review comment`), one separator, one author form, across `git.release` and `git.pull.comment get`
- B: keep two shapes, each fit to its job: the gate row is a one-line summary inside a status tree; the `get` tree is the full read

## taken: B, and why at the time
- the gate row (`review 801 · src/reef/getTide.ts:42 · @commander · "first words…"`) is the blueprint's chosen shape for the wish's "names each thread (file, line, the reviewer's first words)". it must fit one line beside the ci tally
- the `get` tree (`review comment 903 by surfer-kai at <time>  thread=open`, then url, bytes, sha256, text) is main's extant read contract, snapped across its integration suite. its job is the whole comment, with time and thread state
- the two never print in one output. the gate row links to `get` by command (`read: rhx git.pull.comment get --pr N --unanswered`), not by look
- A rewrites one of two contracts: main's `get` tree (every pc snapshot), or the approved gate row
- the row quotes the thread's latest comment, the one that leaves it unanswered: a re-ask (803) is quoted, so the driver answers what was asked last. for a by-hand reply (804, F8) that quote is the reply itself; the line under the row says why it does not count, and the link opens the whole thread. to quote the ask instead would add the thread root's words to the row (r011 i003 nitpick.1)
- the row runs ~105 columns: file, line, author, and the first words share one line by design, so a terminal under that width wraps it; rows print oldest first (`sort_by(.created_at, .id)`, `git.pull.comment.rows.sh:149`), the same order `get` prints, though the row shows no time, so case14's 805 above 801 reads unsorted (r011 i003 nitpick.5)

## rework: dirty
either half resnaps a contract a peer already approved.

## confidence: 70%, why low
a reader who meets both outputs in one session sees two words for one concept (`review` vs `review comment`). the ergonomist rule `rule.forbid.ambiguous-labels` leans toward one term per concept.

## where
`git.release/output.sh:149` `row_title` (the row) · `git.pull.comment.get.sh:159` (the tree) · r006 nitpick.2 (5.3.verification i001) · r011 nitpick.1, nitpick.5 (i003)

## verdict
(awaits council)
