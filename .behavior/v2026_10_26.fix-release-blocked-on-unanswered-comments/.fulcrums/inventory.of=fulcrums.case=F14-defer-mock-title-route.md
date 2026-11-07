# F14 — defer the simple gh mock's `.title` route defect

## the fork
- **a.** fix `writeSimpleGhMock` now: route `pr list` by the jq tail, resnap every suite that sets `pr list title`
- **b.** defer it to a dream; p9 [case12] omits the `pr list title` key so its release pr reads as number 99

## taken: b, and why at the time
the defect is test-infra only (the shipped code reads `.number` correctly) and predates this change. the fix reroutes a third query (`title=\(.title)`, `git.release.operations.sh:189`) and moves snapshots across p1/p3 suites this wish never opened — safe, but not clean. the comment gate's own coverage is already true without it.

## rework: clean
the dream holds the shape of the fix; no part of this change builds on the defect.

## confidence: 80%, and why it is low
a reviewer may judge the ripple small enough to pull in under scouts honor. the count of moved snapshots was not measured.

## where
`.test/infra/mockGh.ts:1360`; dream `dreams/v2026_10_30.fix.mock-gh-pr-list-title-routes-number-lookup.md`

## verdict
open
