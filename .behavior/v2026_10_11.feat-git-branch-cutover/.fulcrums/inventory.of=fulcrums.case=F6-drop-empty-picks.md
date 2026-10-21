# F6: drop an empty pick

- **fork**: a pick whose change is already on main (squash-merged) — drop it and report, or halt as
  raw `git cherry-pick` does.
- **taken**: drop and report. an empty pick carries naught; a halt would ask the caller to decide a
  question with one sane answer. the report names the sha and why, so naught is hidden.
- **scope**: one rule for every pick whose change is already on main — an ancestor sha, a
  squash-merged sha, a repeated sha. the alternative — refuse an ancestor sha at preflight — splits
  one fact into two rules; plan still shows the drop ahead of time.
- **rework**: clean — a branch in the replay loop.
- **confidence**: 75%. a wisher may want a halt as the cue that they named a wrong sha.
- **where**: q7 (the mechanism: own pick loop, empty-index check); a3; case 10.
- **verdict**: approved by wisher, 2026-10-14 — drop and report. also confirmed: git.branch.uses alone gates the cutover; no git.commit.uses spend per pick
