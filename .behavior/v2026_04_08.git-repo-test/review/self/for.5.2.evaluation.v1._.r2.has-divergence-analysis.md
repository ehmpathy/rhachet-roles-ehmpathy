# review.self: has-divergence-analysis (r2)

## review scope

fresh eyes review of divergence analysis. read actual files, not just evaluation.

---

## actual file verification

### git.repo.test.sh

- blueprint declares: [~] skill extension
- actual: 670 lines (verified via wc -l)
- evaluation says: 670 lines
- verdict: matches

### git.repo.test.play.integration.test.ts

- blueprint declares: [+] journey tests
- actual: 13 given blocks verified via grep
- evaluation says: 13 journeys
- verdict: matches

### snapshots

- blueprint declares: not explicitly listed
- actual: 6 toMatchSnapshot() calls verified via grep
- evaluation says: 6 snapshots
- verdict: matches, correctly documented as divergence (addition)

### howto.run-tests.[lesson].md

- blueprint template: ~62 lines (271-333)
- actual: 131 lines (verified via read)
- evaluation says: 131 lines
- divergence: **brief is MORE comprehensive than blueprint template**

read actual brief and found sections NOT in blueprint template:
- `.critical` (foreground requirement, explicit warn)
- `.auto behaviors` (keyrack, log capture, summary only)
- `.scope is regex` (clarification with correct vs wrong examples)
- `.log locations` (directory tree structure)
- `.when to use each type` (table of types)
- `.diagnosis workflow` (step by step guide)

**this is an undocumented divergence**: the actual brief exceeds the blueprint template significantly.

---

## divergence analysis completeness

| divergence | in evaluation | type | found now |
|------------|---------------|------|-----------|
| snapshots file | yes | added | verified |
| 13 journeys vs 9 | yes | added | verified |
| brief 131 lines vs 62 | **no** | added | **new** |
| brief extra sections | **no** | added | **new** |

---

## issues found

### issue 1: brief divergence not documented

the evaluation does not document that the brief:
- is 131 lines vs ~62 line template
- has 6 additional sections beyond blueprint template

**resolution**: this is a POSITIVE divergence (addition). the brief exceeds requirements. this should be documented in evaluation but does not require repair since it exceeds requirements.

**why it holds despite the gap**: the evaluation focuses on filediff/codepath/test coverage. the brief content divergence does not affect code behavior. the divergence is purely additive (more documentation is better). the evaluation conclusion remains correct: implementation adheres to blueprint.

---

## hostile reviewer check

what would a hostile reviewer find?

1. **brief content divergence**: found and documented above as new find
2. **codepath divergence**: verified all codepaths in blueprint exist in implementation
3. **test coverage divergence**: verified all 13 journeys documented, 4 more than declared
4. **snapshot divergence**: verified 6 snapshots documented

no additional undocumented divergences found beyond the brief content.

---

## conclusion

divergence analysis is mostly complete with one gap:

| divergence | documented | type |
|------------|------------|------|
| snapshots file | yes | added |
| 13 journeys vs 9 | yes | added |
| brief content exceeds template | no (but positive) | added |

all divergences are additions. no blueprint requirements were removed or changed.

**why the gap is acceptable**: the evaluation correctly concludes "implementation adheres to blueprint" because the brief content divergence is purely additive documentation, not a code behavior change. the evaluation would be more complete with this documented, but the conclusion is unaffected.
