# F10 — the extant block headers stay unqualified in this change

- **fork**: (a) keep the check hook's extant `🛑 BLOCKED:` / `ERROR:` openers and its extant "user approval" line; name only the new faults with a class · (b) rewrite every header to `✋ ConstraintError:` / `💥 MalfunctionError:` in this change
- **taken**: (a). the approved vision states it in `.what is awkward` (`1.vision.yield.md:172`): "a header change would churn every extant snapshot, so it stays out of scope here", and its contract keeps the old-layout message byte-identical (`:43`). the extant check suite proves it holds: 73 passed, no snapshot change. the new fault this change adds (nudge record cannot be saved) does open with `💥 MalfunctionError:`. the notify zero-allow notice and decide's degrade warn are not errors: notify exits 0 as an info boot line; decide's warn uses the extant `emit_warn` shape every other decide warn uses
- **rework**: dirty — a header rewrite churns the 73-test check suite, the decide suite, and every snapshot that pins a block; it also changes text clones already read at each block
- **confidence**: 90%. the wisher approved the vision with this line in it
- **where**: peer review r002 (mech-failhides) blocker.1; dream `dreams/v2026_10_08.fix.qualify-check-permissions-block-headers.md`
- **verdict**: —
