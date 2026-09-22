# F13 — l1 review lanes exclude tests/snapshots to fit the context window

## the fork

the 9 l1 review lanes have context-overflowed (75-84% of a 1M-token window) since i034. two
regression fix attempts (`--focus pull` alone, then paired with `--brain 'anthropic/claude/code'`)
each crashed every lane a different way and were reverted this round (i042). the debug logs
(`.log/bhrain/review/*/tokens.expected.md`) show `--rules`+`--refs`+targets sum to only ~374k
tokens at overflow time, while the actual prompt hits 82-84% (~825k) — the gap is the
`--conversation` history, which `enumRouteGuardReviewPeerConversationFiles` (in
`rhachet-roles-bhrain`) expands to every prior round's given+report+taken with no depth-limit flag
exposed on `rhx review`'s cli. that growth is not fixable from this route.

the one lever left inside this route's bound: shrink the TARGET file set (`--paths-with`/
`--paths-wout`), since it is the only side of the prompt a guard edit controls.

## the call taken

added `--paths-wout '**/__snapshots__/**'` to all 9 l1 lanes (generated fixture content, near-zero
value for a rules review, no lane's rubric depends on byte-level snapshot content).

added a test-file exclusion to 5 of the 9 — `mech-decode-friction` (this also repairs a prior bug:
the guard used `--paths-without`, a name the cli parser does not recognize, so the exclusion had
silently never applied), `arch-opport-decomposition`, `arch-smell-scopeleaks`,
`arch-hazards-maintenance`, `arch-hazards-behavior`. each of these rubrics targets
production/architecture concerns (decomposition, scope leaks, maintenance/behavior hazards) that
do not turn on test-file content, and the l3 `enroll-impl-*` lanes already read test files
directly (tool-use, not a full dump) so coverage-check is not lost, only moved to a lane built to
do it cheaply.

🔴 **the first attempt at the test-file exclusion silently failed.** a combined brace pattern
(`--paths-wout '**/{__snapshots__/**,*.test.ts}'`) matched no file — `isPathMatchedByGlob`, the
function that applies `--paths-wout`, is not a real glob matcher (only exact/suffix/`*`+`?`
modes; a brace becomes a literal regex character no path contains). caught as
`dreams/v2026_09_15.fix.paths-wout-glob-matcher-has-no-brace-support.md`. the fix that clears
these lanes: two separate brace-free patterns, `--paths '!**/*.test.ts' --paths-wout
'**/__snapshots__/**'` (the `!`-prefixed half of `--paths` and `--paths-wout` both feed the same
matcher, so each pattern must stay brace-free on its own).

kept full test-file visibility (snapshot-only exclusion) on `repo-rules` (its rubric includes
`rule.require.jest-tests-for-skills`, a test-file-shape rule), `mech-failhides` (its rule glob is
explicitly `code.{prod,test}/pitofsuccess.errors`, which names test code in scope), and
`behavior-intent-coverage`/`ergo-friction-hazards` (both explicitly grade test/acceptance
coverage). these 4 lanes stay context-overflowed even after the fix — the snapshot cut alone
(~37k tokens) is not enough to clear the 75% threshold on its own.

## why it is a fulcrum, not a settled call

this trades a small, real loss of visibility (the 6 narrowed lanes cannot flag a test-file-only
violation of their own rubric, however unlikely) for a reviewer that runs at all. the split
between the 6 narrowed and 3 kept lanes is a judgment call about which rubrics "need" test content,
made under time pressure to unblock a stuck stone — not a design decision about the feature.

## rework

**clean.** revert is a single glob removal per lane, no ripple into code or other artifacts.

## confidence: 70%

lower than most rows here because the 6-vs-3 split is my own read of each rubric's `--rules`/
`--refs` globs, not a rule the guard states explicitly. a council reviewer with fresh eyes may
split them differently, or may prefer the deeper structural fix (a `--conversation` depth flag
added to the shared `rhachet-roles-bhrain` package) over a target-scope workaround entirely.

## where

`5.1.execution.from_vision.guard`, all 9 `peer.reviews` l1 lanes.

## verdict

_(unruled — flagged for the council, drive continues)_
