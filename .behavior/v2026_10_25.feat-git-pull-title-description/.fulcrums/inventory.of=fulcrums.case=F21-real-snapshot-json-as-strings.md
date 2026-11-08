# F21 — the comment real-api snapshot keeps its json as strings until a live re-run

- fork: A. parse each `--output json` stdout before the snapshot, so it nests as an object, and
  re-snap now · B. leave `git.pull.comment.real.integration.test.ts.snap` as #1143 shipped it, and
  catch the reshape as a dream
- taken: B. the snapshot can only regenerate from a live run: it posts, edits, and deletes a comment
  on pr #1039. that run was put to the human in this round and declined. a hand-written snapshot
  that no run produced would be forged evidence, and the test change alone would leave the next hand
  run red on a stale snapshot. the edit was made, then reverted, for that reason
- why the blemish is cosmetic: jest prints a string value raw inside its template literal, so the
  inner quotes are not escaped by design; the file is valid and the masked json reads line by line.
  the only change this pull makes to that snap is one refusal line, pinned at the stub grain too
- rework: clean. one `JSON.parse` per json output (with the masked id quoted), then one hand run
- confidence: 80%. a reviewer may still prefer the reshape in this pull
- where: `git.pull.comment/git.pull.comment.real.integration.test.ts` and its snap
- dream: `.dream/2026_11_02.real-api-snapshots-nest-json.dream.md`
- verdict: open, for the pr review
