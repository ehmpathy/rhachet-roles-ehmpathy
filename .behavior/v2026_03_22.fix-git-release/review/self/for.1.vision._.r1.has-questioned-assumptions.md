# self-review: has-questioned-assumptions

## for: 1.vision

---

## assumption: three transports are exhaustive

**what do we assume without evidence?**
that feature-branch → release-branch → release-tag covers all repos. no fourth transport exists.

**what evidence supports this?**
the current git.release implementation handles exactly these three. the wish document describes exactly these three. no fourth transport has been mentioned or observed.

**what if the opposite were true?**
if a fourth transport existed, the vision would need extension. however, the architecture (reusable emit_transport_status + emit_transport_watch) would accommodate a fourth transport without redesign.

**did the wisher say this or did we infer it?**
the wisher explicitly named: "1 = the feature branch, 2 = the release branch, 3 = the release tag"

**counterexamples?**
none known. this assumption holds.

---

## assumption: transport states are finite and exhaustive

**what do we assume without evidence?**
each transport is in exactly one of [unfound, inflight, passed, failed, merged]. these cover all GitHub PR/workflow states.

**what evidence supports this?**
these map to GitHub's actual states: no PR (unfound), checks in progress (inflight), checks passed (passed), checks failed (failed), PR merged (merged).

**what if the opposite were true?**
if GitHub added new states, we'd need to extend. but this is unlikely — GitHub's state model has been stable.

**did the wisher say this or did we infer it?**
the wisher listed: "failed, inflight, succeeded:with-automerge, succeeded:wout-automerge" — we refined this to [unfound, inflight, passed, failed, merged] based on implementation reality.

**counterexamples?**
"needs rebase" is a special case handled separately in the vision (usecase 7). it's orthogonal to check status.

---

## assumption: automerge is the only "apply" action

**what do we assume without evidence?**
we don't need other mutations (e.g., approve, label) in apply mode.

**what evidence supports this?**
the wish says "--mode apply... should apply automerge to whatever transports it finds." no mention of approve or label.

**what if the opposite were true?**
if other mutations were needed, --apply would need sub-modes. but the wisher didn't request them.

**did the wisher say this or did we infer it?**
the wisher explicitly scoped apply to automerge: "findsert the automerge flag"

**counterexamples?**
none. assumption holds.

---

## assumption: --into is the right replacement for --to

**what do we assume without evidence?**
that `--into` is clearer than `--to`.

**what evidence supports this?**
the wisher explicitly requested: "replace `--to` with `--into`"

**what if the opposite were true?**
if `--to` were kept, the command would still work. `--into` is a preference.

**did the wisher say this or did we infer it?**
explicitly stated by wisher.

**counterexamples?**
none. this is a direct requirement, not an assumption.

---

## assumption: watch loop needs 3+ poll cycles to prove correctness

**what do we assume without evidence?**
that 3 is the right number of cycles.

**what evidence supports this?**
the wisher explicitly mandated: "MUST actually show 3 mock 'polls'". 3 proves: (1) loop starts, (2) loop continues, (3) loop completes — minimal proof of loop behavior.

**what if the opposite were true?**
2 cycles might suffice mathematically, but 3 is explicit per wish.

**did the wisher say this or did we infer it?**
explicitly stated by wisher.

**counterexamples?**
none. direct requirement.

---

## assumption: test composition reduces complexity vs brute force

**what do we assume without evidence?**
that composable tests are simpler than 1715 end-to-end tests.

**what evidence supports this?**
the wisher's pseudocode shows how composition works. instead of 5×7×7×7 full tests, we test each operation independently and compose.

**what if the opposite were true?**
brute force would guarantee no composition bugs — but at unmaintainable cost.

**did the wisher say this or did we infer it?**
the wisher explicitly requested: "we want to do that via composition"

**counterexamples?**
composition requires trust in composability. if operations interact unexpectedly, composition tests miss it. mitigation: also have key end-to-end integration tests for critical paths.

---

## conclusion

all assumptions are either:
1. explicitly stated by the wisher (not assumptions at all)
2. based on observable implementation reality (three transports, GitHub states)
3. acknowledged with mitigations (composition + end-to-end tests)

no hidden assumptions require correction.

