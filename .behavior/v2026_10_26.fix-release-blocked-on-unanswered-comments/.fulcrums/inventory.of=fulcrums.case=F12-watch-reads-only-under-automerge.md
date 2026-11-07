# F12 — a watch poll re-reads comments only while automerge is on

## the fork
- A: re-read comments on every watch poll (the vision's words: "each poll re-reads comments")
- B: re-read only on a poll that sees automerge on

## taken: B, and why (at execution)
the read has one consequence in watch: disable automerge and refuse. with automerge off, github cannot merge, so a read finds a row and does naught — the rows were already shown at the status read. B keeps the safety (every poll that could precede a merge reads) and drops ~6 api calls per idle poll.

## rework: clean
one condition in `_watch_pr_transport` (`git.release._.emit_transport_watch.sh`): drop the `has_automerge` guard around `_watch_pr_comment_gate`. no caller, contract, or test fixture leans on it.

## confidence: 85%, and why not higher
the vision's text says "each poll"; the wisher may want rows re-shown mid-watch, which B never does when automerge is off.

## where
`src/domain.roles/mechanic/skills/git.release/git.release._.emit_transport_watch.sh` — the gate block above "check for failures"

## verdict
open
