# inventory of fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | scope = review threads + issue comments; review bodies excluded | clean | best-guessed | 80% |
| F2 | `💬` line shown on every pr transport, also at 0 | clean | best-guessed | 80% |
| F3 | gate runs on the pr this call would merge; no look-back at merged feat prs | clean | best-guessed | 75% |
| F4 | bot-authored rows are never unanswered | clean | best-guessed | 85% |
| F5 | apply disables an extant automerge when the gate fires | clean | best-guessed | 85% |
| F6 | re-read comments each watch poll; a new unanswered row disables automerge (flipped at peer review i001) | clean | best-guessed | 85% |
| F7 | reuse `as_rows_unanswered` (latest-not-robot) over the wish's "any reply"; amend it in place | clean | best-guessed | 75% |
| F8 | "answered" = the robot's 🐢 reply; a by-hand human reply does not count | clean | best-guessed | 70% |
| F9 | an issue comment is answered only by a signed reply keyed `answer-<id>` (flipped at peer review i002) | clean | best-guessed | 70% |
| F10 | answer judged by its signature (🐢 + key claim), not the read login, so plan and apply agree | clean | best-guessed | 70% |
| F11 | watch never enables automerge, but disables an extant one when a poll finds an unanswered row | clean | best-guessed | 75% |
| F12 | a watch poll re-reads comments only while automerge is on (vision said "each poll") | clean | best-guessed | 85% |
| F13 | git.release reads comments via its own gh calls + the shared pure rule (`git.pull.comment.rows.sh`), not a `git.pull.comment get` subprocess | clean | best-guessed | 85% |
| F14 | defer the simple gh mock's `.title` route defect (release pr read as its title) to a dream; p9 sidesteps it | clean | best-guessed | 80% |
| F15 | the release thread read names its repo via gh's `{owner}`/`{repo}` fill in `-F` values, not an explicit owner | clean | best-guessed | 85% |
| F16 | the shared rows module stays in `git.pull.comment/`, sourced by git.release by peer-skill path, per the repo's extant convention | clean | best-guessed | 75% |
| F17 | a thread the pr author opened counts, same as a reviewer's; the gate reads no author | clean | best-guessed | 70% |
| F18 | `emit_comment_gate` stays one function with a conditional disable; no split this round | clean | best-guessed | 75% |
| F19 | the unanswered rule is tested through its two verbs' suites, not a separate caselist | clean | best-guessed | 70% |
| F20 | the refusal's and malfunction's cure commands stay inside the error tree, not a 🥥 block (required, per the coconut rule's own caveat) | clean | best-guessed | 75% |
| F21 | the 12 extant kernelize/eval `describe.skip` blocks (main's call, `ff1acc9`) stay; a dream deletes them once bhrain holds them | dirty | best-guessed | 70% |
| F22 | the comment refusal keeps the extant mode-chosen apply header (`cowabunga!`), not the vision mockup's `hold up dude...`; a dream fixes all apply refusals at once | dirty | best-guessed | 75% |
| F23 | the gate's one-line row (`review 801 · file:line · @who`, the thread's latest comment) and `get`'s full tree (`review comment 903 by who at time`) keep two shapes, each fit to its job | dirty | best-guessed | 70% |
| F24 | the gate's live journeys (refusal, ship, get→set→clear) stay at integration + hand-run real-api; acceptance holds `--help` and the bypass refusal, since a live pr needs a mock (forbidden), a write-scoped ci token, or a read token under the env the auth reads | dirty | best-guessed | 70% |
| F25 | `get --unanswered`'s tree reports the full read: target drops the login, `counts:` tallies all read, `unanswered: N` added, an empty list says each has an answer | clean | best-guessed | 80% |
| F26 | every `git.release` argument error shares one `✋ ConstraintError` tree (r006 asked; r012 calls it out of scope) | clean | best-guessed | 70% |
| F27 | plan and watch show `automerge unfound — held …` while a comment waits, not `(use --apply to add)` (r006 asked; r011 asks for plain `unfound`) | clean | best-guessed | 70% |
| F28 | the row kind labels stay `review` / `issue`, `git.pull.comment`'s extant `--kind` vocabulary | dirty | best-guessed | 75% |
| F29 | main's extant git.release render outside the gate (apply cheer, `heres`, check indent, dim hints, `🥥 let's watch`, help realign) stays as main ships it; a dream restyles it | dirty | best-guessed | 75% |