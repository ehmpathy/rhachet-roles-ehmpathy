# F21 — the extant kernelize skips are left to their migration, not fixed in this route

## the fork
- A: remove each `describe.skip` in librarian and `.evals` and make the suites pass here (the 5.3 stone: "unrelated is not an excuse")
- B: leave them; catch a dream to delete them once rhachet-roles-bhrain is confirmed to hold them

## taken: B, and why at the time
- the skips are a team decision already merged on main (`ff1acc9`, `19df13c`): the suites are brain-graded, they flake on model output, and their owner is now rhachet-roles-bhrain
- under A, un-skipped suites would re-flake every release, the exact harm those commits fixed. the true cure is deletion, after a cross-repo check
- none of the twelve touches git.release or git.pull.comment. every suite this route touches runs, with 0 skips

## rework: dirty
deletion spans two roles this route never opened, and rests on what another repo holds.

## confidence: 70%, why low
the 5.3 stone reads zero tolerance literally: "it's unrelated to my changes is not an excuse". a strict reader may hold that B fails the stone. the call defers to a team decision i did not make and cannot verify alone (what bhrain holds).

## where
`.dream/v2026_10_30.fix.delete-kernelize-suites-moved-to-bhrain.md` · 5.3.verification.yield.md § tests executed

## verdict
(awaits council)
