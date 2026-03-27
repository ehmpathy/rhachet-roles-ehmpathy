# self-review: has-questioned-requirements

## for: 1.vision

---

## requirement: consistent stdout across 3 transports

**who said this was needed?**
the human, in the wish document. this is the third attempt to get this right.

**what evidence supports this?**
the wish states "right now, there is not a consistent stdout for each of those on the various states they can be in" — this is observable in the current snapshots which show different output shapes for feature-branch vs release-branch vs release-tag transports.

**what if we didn't do this?**
mechanics would need to learn 3 different output patterns. mental overhead compounds. harder to scan and compare states across transports.

**is the scope right?**
yes. the scope is bounded to stdout consistency — not a change to the base gh operations or release flow logic.

**simpler way?**
no. the current inconsistency is the simpler (lazier) path. consistency requires deliberate design.

---

## requirement: reusable domain operations (emit_transport_status, emit_transport_watch)

**who said this was needed?**
the human, in the wish. motivated by "the current git.release skill seems to not have created reusable domain operations."

**what evidence supports this?**
the wish provides pseudocode that shows how decomposed operations would simplify the flow and enable composable test coverage.

**what if we didn't do this?**
the test matrix would require 5×7×7×7 = 1715 full end-to-end tests instead of composable unit tests of each operation. unmaintainable.

**is the scope right?**
yes. two operations (status + watch) cover the domain.

**simpler way?**
no. decomposition for recomposition is the core mechanism here.

---

## requirement: exhaustive test coverage via composition

**who said this was needed?**
the human, in the wish. "we literally want the exhaustive coverage of each scenario but we want to do that via composition."

**what evidence supports this?**
this is the third attempt. prior attempts found defects. exhaustive coverage prevents regression.

**what if we didn't do this?**
defects would continue to surface in production use.

**is the scope right?**
yes. composable tests make exhaustive coverage tractable.

**simpler way?**
the composition strategy IS the simpler way compared to brute-force 1715 tests.

---

## requirement: replace --to with --into

**who said this was needed?**
the human, explicitly in the wish: "replace `--to` with `--into`"

**what evidence supports this?**
`--into` emphasizes destination and avoids confusion with `--to` as a range.

**what if we didn't do this?**
semantic ambiguity in CLI. minor UX friction.

**is the scope right?**
yes. single flag rename.

**simpler way?**
could keep `--to` — but user explicitly requested the change.

---

## requirement: add --apply alias for --mode apply

**who said this was needed?**
the human, explicitly in the wish: "add alias `--apply` for `--mode = apply`"

**what evidence supports this?**
`--apply` is shorter, more ergonomic for common operation.

**what if we didn't do this?**
users type `--mode apply` every time. minor friction.

**is the scope right?**
yes. additive alias, no contract break.

**simpler way?**
this IS the simpler way — an alias.

---

## requirement: --watch must show at least 3 poll cycles in tests

**who said this was needed?**
the human, in the wish: "this includes the mandate that --watch for inflight branches MUST actually show 3 mock 'polls'"

**what evidence supports this?**
proves the watch loop actually works through multiple states, not just a single check.

**what if we didn't do this?**
tests could pass with a broken watch loop that only checks once.

**is the scope right?**
yes. 3 cycles is minimal proof of loop behavior.

**simpler way?**
no. fewer cycles would not prove loop correctness.

---

## conclusion

all requirements are justified. no requirements should be removed or reduced. the scope is appropriate for the stated goals.

