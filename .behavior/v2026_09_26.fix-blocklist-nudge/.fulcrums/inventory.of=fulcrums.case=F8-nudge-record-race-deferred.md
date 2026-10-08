# F8 — the nudge-record read-modify-write race stays deferred

- **fork:** fix the race on `.claude/permission.nudges.local.json` in this route, vs leave it to its
  extant dream.
- **taken:** defer. the race predates this route: the read → merge → replace of the record ships on
  `main` today, unchanged in shape. this route only corrected the comment that called it atomic.
  the dream `.dream/v2026_09_12.fix.nudge-record-read-modify-write-race.md` already holds it.
- **why the fix is dirty here:**
  - `flock` is util-linux; macOS lacks it, and the hook runs on both
  - a portable fix changes the record's shape (one file per command, or append-only rows), and the
    suite seeds the extant record shape in several cases
  - ⇒ a store migration inside a render change; it fails CLEAN
- **harm if deferred:** two clones blocked in the same instant can drop one record entry. the
  dropped command is then blocked once more on retry, instead of handed to the human. a
  fail-closed miss, never a fail-open one.
- **the same store holds the wall-clock window.** a monotonic stamp (vs `date +%s`) also needs a
  record-shape change, so a forward clock step past the window — one extra block, fail-closed —
  rides this same deferral. the backward step is clamped in code today.
- **rework:** dirty — a store migration.
- **confidence:** 80%.
- **where:** `pretooluse.check-permissions.sh`, the first-attempt record write.
- **verdict:** overruled by the wisher (2026-09-27) — fix it in this route. taken: a portable
  `mkdir` lock serializes the read → merge → replace, with the record's shape unchanged (no store
  migration). the wall-clock window stays as is.
