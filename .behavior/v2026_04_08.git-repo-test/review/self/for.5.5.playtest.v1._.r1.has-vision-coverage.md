# review.self: has-vision-coverage (r1)

## review scope

first pass. verify playtest covers all behaviors in wish and vision.

---

## wish coverage matrix

| wish behavior | playtest path | covered? |
|---------------|---------------|----------|
| support --what unit | happy path 1 | ✓ |
| support --what integration | happy path 2 | ✓ |
| support --what acceptance | happy path 3 | ✓ (mentioned) |
| --scope for subsets | happy path 3 | ✓ |
| --resnap for snapshots | happy path 6 | ✓ |
| log to .log/ on success | pass criteria (all happy paths) | ✓ |
| log to .log/ on failure | pass criteria (implicit) | ✓ |
| tell clones where logs are | pass criteria, log paths shown | ✓ |
| auto unlock keyrack | happy path 2 | ✓ |
| auto run npm correctly | all happy paths | ✓ |
| auto pass scopes correctly | happy path 3 | ✓ |
| conform to skill vibes | pass criteria (turtle header) | ✓ |

---

## vision coverage matrix

| vision usecase | playtest path | covered? |
|----------------|---------------|----------|
| run unit tests | happy path 1 | ✓ |
| run all test types | happy path 5 | ✓ |
| run specific test file | happy path 3 | ✓ |
| update snapshots | happy path 6 | ✓ |
| run thorough | happy path 7 | ✓ |
| run acceptance | happy path 3 (mentioned) | ✓ |
| run lint | happy path 4 | ✓ |
| output on success | pass criteria | ✓ |
| output on failure | pass/fail criteria | ✓ |
| keyrack unlock | happy path 2 | ✓ |
| scope matches no tests | edge case E1 | ✓ |
| absent command | edge case E2 | ✓ |
| keyrack locked | edge case E3 | ✓ |
| pass raw args | edge case E4 | ✓ |

---

## skeptic walkthrough: are any behaviors absent?

### wish line: "never run in background"

**as foreman, i ask:** is the "never run in background" behavior covered in the playtest?

**check:** the playtest mentions "notes for foreman" at the bottom, which says commands are pre-approved. but does it verify foreground execution?

**analysis:** this is a behavioral constraint for the clone, not a testable output. the brief `howto.run-tests.[lesson].md` documents this. the playtest verifies the skill works correctly when invoked. the foreman who runs the playtest is inherently in foreground.

**verdict:** not an issue — the brief covers this, playtest verifies skill works.

### wish line: "genTempDir for test fixtures"

**as foreman, i ask:** does the playtest verify genTempDir usage?

**analysis:** this is a meta-requirement about how the journey tests are written, not a behavior the foreman verifies by hand. the journey tests (git.repo.test.play.integration.test.ts) use genTempDir. the playtest is for foreman verification of the skill itself.

**verdict:** not an issue — this is test implementation detail, not playtest scope.

### wish line: "thorough snapshot coverage"

**as foreman, i ask:** does the playtest verify snapshot coverage?

**analysis:** like genTempDir, this is about the journey tests. the playtest verifies skill behavior. snapshot coverage is verified by review of the test file and its snapshots, not by run of the skill by hand.

**verdict:** not an issue — this is test implementation detail, not playtest scope.

---

## skeptic walkthrough: happy path 3 review

**instruction:** run `rhx git.repo.test --what unit --scope getRole`

**as foreman, i ask:** does this adequately test --scope behavior?

**analysis:** the expected outcome says "only tests in paths that match `getRole` run" and "stats show fewer suites than full run". pass criteria says "suite count is less than full run" and "output contains the scope pattern in command echo".

**issue found:** foreman needs to know what the full suite count is to compare. currently no explicit guidance on how to verify "fewer than full".

**fix needed:** add note to compare with happy path 1 suite count.

---

## fixes applied

### fix 1: clarify scope comparison

for happy path 3, updated expected outcome and pass criteria to reference "happy path 1" explicitly:
- expected outcome: "stats show fewer suites than happy path 1 (compare: note suite count from step 1)"
- pass criteria: "suite count is less than happy path 1 suite count"

foreman now has explicit comparison target.

---

## why it holds

1. **all wish behaviors have a playtest path**: every line in wish.md maps to a happy path or edge case
2. **all vision usecases have a playtest path**: every usecase from vision maps to playtest coverage
3. **meta-requirements correctly scoped**: genTempDir, snapshots, and "never background" are test/brief concerns, not playtest concerns
4. **one nitpick found**: scope comparison could be clearer (minor, foreman can figure it out)

the playtest covers all behaviors in wish and vision.

**conclusion: has-vision-coverage = verified (first pass)**

