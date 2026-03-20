# self-review: has-preserved-test-intentions (r4)

## review scope

for every test touched:
- what did this test verify before?
- does it still verify the same behavior after?
- did you change what the test asserts, or fix why it failed?

---

## why it holds

### no extant test code was modified

examined the git diff for the test files:

**git.branch.rebase.take.integration.test.ts:**
- lines added: case12, case13, case14 (new tests)
- lines modified: zero
- lines removed: zero

the extant tests (case1 through case11) were not touched. their assertions remain identical.

---

### the snapshot change is additive, not weakened

**before:** case1 snapshot captured the output of `take --whos theirs pnpm-lock.yaml`

**after:** case1 snapshot still captures the same output, plus the new suggestion line

**key insight:** the snapshot grew — it did not shrink or change its core content.

the prior truth: "take settles the file and outputs a success message"
the current truth: "take settles the file, outputs a success message, AND shows a suggestion"

the second truth contains the first. no assertion was weakened.

---

### the test did not fail and get "fixed" by changed intent

the scenario the guide warns about:
1. test fails
2. developer changes the expected value to match broken output
3. test passes, but the bug is now enshrined

**this did not happen here:**
- no test failed in development of this feature
- the snapshot update was made via `RESNAP=true` after the feature was complete
- the feature is intentional and documented in criteria

---

### requirements changed — documented and approved

the wish explicitly requested: "recommend that the caller of `git.branch.rebase take` runs that command whenever we detect that they took a `pnpm-lock.yml`"

this means the snapshot change is a feature requirement, not a bug cover-up.

**documented in:**
- 0.wish.md — explicitly requests the suggestion
- 1.vision.md — shows the suggestion in example timeline
- 2.1.criteria.blackbox.md — usecase.2 specifies suggestion behavior

---

## conclusion

| check | result |
|-------|--------|
| extant test code modified | no — zero lines changed |
| assertions weakened | no — snapshot grew, not shrunk |
| test "fixed" by changed intent | no — feature is intentional |
| requirements documented | yes — wish, vision, criteria |

test intentions preserved. the snapshot change reflects a documented feature requirement.

