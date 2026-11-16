# F26 — an alert's next move: a coconut aside, or a line of the render

## .the fork

each alert the daemon says into a clone ends with a move: `next: rhx show.gh.test.errors` after a ci failure, `fix: rhx keyrack unlock …` on a pause, `check: … keyrack get …` on a token fault. `rule.require.coconut-hints` says a next-move command renders as a `🥥 did you know?` block. the same rule's caveat says a coconut is optional guidance, and must never carry what the render needs to be correct.

- (a) move each `next:` / `fix:` / `check:` into a coconut block
- (b) keep each as the last line of the alert's own tree

## .taken, why

(b).

- an alert is a message to a clone, and its move is its point. a paused watch serves no pr until the clone runs the fix; a ci alert is half a message without the command that reads the failure. the render needs both to be correct, so the caveat bars them from an optional aside
- the coconut enforcement grades essential content in a coconut a blocker, above the nitpick for prose; (a) trades a nitpick for a blocker
- the refusals of the cli verbs (`set`, `get`, `del`, the hook) do carry coconuts: there the error is the point and the fix is guidance

the push `watch:` line is one leaf of the push tree. its `rerun:` clause names how to retry a side act that did not land, inside the push's own result render. it stays in the leaf for the same reason.

## .rework

clean: the alert text transformers in `git.pull.watch.alert.sh`, plus their snapshots.

## .confidence

82%. the rule names a recovery path as a coconut case and also bars essential coconuts; the call rests on the alert's move as its point.

## .where

`src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.alert.sh` · `src/domain.roles/mechanic/skills/git.commit/git.commit.push.sh` (`as_push_watch_status`). raised as r001 nitpick.1 (5.1 i003).
