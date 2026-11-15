# F22 — an unread pr status fails closed on every pr watch, not only under a lease

## .the fork

- **A (taken)**: `emit_transport_watch` treats an empty `get_pr_status` as a `💥 MalfunctionError`,
  exit 1, on every pr watch: the gated feature pr, the release pr, and `--watch` alone
- **B**: fail closed only when `lease_head_sha` is set (the gated feature pr). keep the old behavior
  elsewhere: an empty status read as "done!", exit 0. revert the p3 into_prod fixture to its
  empty-body release pr

## .taken, why

- the old path is a failhide. under `set -e` the callers' `||` suspends errexit, so an unread status
  fell through to "done!" exit 0, a false success on a release the skill never saw merge. the source
  comment at the read states this
- real gh never answers an empty body for a found pr, so A changes behavior only when gh actually
  fails, and turns a false green into a loud red
- the p3 into_prod `[row-22]` fixture answered an empty body for a release pr the await found. that
  was a mock artifact the old snapshot locked; the fixture now returns a real passed pr
- a dedicated clamp for the no-lease path:
  `git.release._.emit_transport_watch.integration.test.ts` `[case5b]` (gh down, no lease head →
  exit 1, the MalfunctionError on both streams, no `done!`)

## .rework

clean: B is a one-line condition on the two empty-status checks (`[[ -n "$lease_head_sha" ]]`), a
revert of the p3 fixture hunk, and a resnap of p3 into_prod

## .confidence

80%: the wish scopes the gate to the feature pr, and A reaches past it into release-pr watches. the
reach is a failhide fix, not a new gate, and `rule.require.review-test-changes` asks for a human
sign-off on a changed locked expectation

## .where

`src/domain.roles/mechanic/skills/git.release/git.release._.emit_transport_watch.sh` (both
empty-status checks), `.test/infra/mockGh.ts` (`isReleasePrFoundByAwait`),
`__snapshots__/git.release.p3.scenes.on_feat.into_prod.integration.test.ts.snap`

## .verdict

awaits the commander
