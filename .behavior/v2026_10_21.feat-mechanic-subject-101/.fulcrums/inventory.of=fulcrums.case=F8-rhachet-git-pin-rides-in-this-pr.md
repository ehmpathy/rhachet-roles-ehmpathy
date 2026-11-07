# F8 — the rhachet git pin rides in this pr

## the fork

the l3 review lanes enroll a peer clone, which rhachet 1.50.0 refuses at depth 1. rhachet#636
(on main, not yet on npm) lifts it. the efficiency director ordered:
`rhx set.package.upgrade --package rhachet --to github:ehmpathy/rhachet#main`, then re-arrive 5.1,
and "note in the PR body that the git pin retires when v1.50.1 releases."

the pin changes `package.json` and `pnpm-lock.yaml`. two 5.1 l3 lanes (i005: enroll-impl-behavior-intent
blocker 3, enroll-impl-arch-defects blocker 1) say it is out of scope and breaks
`rule.require.pinned-versions`; they ask for it to leave this pr.

options:
- A. keep the pin here, with a retire line; swap to `v1.50.1` before merge, once it releases.
- B. revert `package.json` + lockfile before the commit; run the l3 lanes on the pin only in the
  worktree. the pr ships on `1.50.0`.
- C. hold the pr until `v1.50.1` is on npm, then upgrade to that exact version.

## taken, and why

A, as ordered, with the retire line in the pr body. the lockfile pins commit `1d747fd`, so ci is
reproducible. B and C are both clean and both the director's to choose: either removes the
pin from the merged diff. the boot suites read identical numbers on `1.50.0` and on main
(slice 2,497; full role 27,913), so the pin changes no figure this pr reports.

## rework

clean — B is `rhx set.package.upgrade --package rhachet --to 1.50.0`; C is the same skill with
`--to 1.50.1`. no code depends on #636.

## confidence, and why it is low

70%. the reviewers are right that a branch ref should not merge; A is safe only if the swap to a
release happens before merge, which is a step a human must not forget.

## where

`package.json` (`rhachet`), `pnpm-lock.yaml`.

## verdict

ruled A by the efficiency director, 2026-10-21: keep the `github:ehmpathy/rhachet#main` pin; it
swaps to `v1.50.1` before merge, the moment rhachet-ktlo releases it (target 04:00Z), via
`rhx set.package.upgrade --package rhachet --to 1.50.1`. a known pre-merge step, not a defect in
the diff.
