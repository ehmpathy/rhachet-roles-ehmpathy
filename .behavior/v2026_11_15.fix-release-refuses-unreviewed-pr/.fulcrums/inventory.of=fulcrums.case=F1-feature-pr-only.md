# F1 — gate the feature pr only, not the release-please pr

## .the fork
- (a) gate only the feature pr (transport 1), the one that carries new code
- (b) gate every pr git.release merges, the release-please pr too

## .taken
(a). the release pr carries only a version bump and changelog, generated from commits that already
passed a reviewed feature pr. every release pr in this repo merges with zero reviews today
(e.g. #1279: `[]`), while feature prs carry a human APPROVED (#1022). (b) would demand a second
human review on every release and stall `--into prod --apply` after the human approved the code.

## .rework
clean: one more call of the same gate before `enable_automerge` on the release pr.

## .confidence
80%. the wish says "a pull request", which (b) reads literally. `--from main --into prod --apply`
under (a) merges a release pr with no gate; that is safe only while every path onto main is gated.

## .where
`git.release.sh` transport 1 vs transport 2.

## .verdict
awaits the commander.
