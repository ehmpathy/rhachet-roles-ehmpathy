# F28 — the row kind labels stay `review` / `issue`

## the fork
- A: rename the kinds to plain words (`thread`, `pr comment`) in the gate rows
- B: keep `review` / `issue`, the vocabulary `git.pull.comment` already ships

## taken: B, and why at the time
- every row prints the `rhx git.pull.comment set` line that answers it, and that verb's contract is `--kind issue|review` (#1143, on main). a gate row that says `thread` above a command that says `review` names one concept two ways, which is the drift `rule.require.ubiqlang` forbids
- the row also prints the github link (`#discussion_r…`, `#issuecomment-…`), so a reader who does not know the api words still reaches the comment in one click
- A rewrites the `--kind` vocabulary of a shipped verb, or splits the two skills' words

## rework: dirty
a consistent rename touches `git.pull.comment`'s flags, rows, json `kind` field, and every snap of both suites.

## confidence: 75%, why not higher
r011 i003 reads `issue 6407563822` on a pr as a tracked issue: a fair cost of the api word, and the reason the council may want a repo-wide rename as its own change.

## where
`git.release/output.sh` `row_title` · `git.pull.comment` `--kind` · r011 nitpick.2 (5.3.verification i003)

## verdict
(awaits council)
