# self-review: has-questioned-assumptions

## hidden assumptions in the vision

### 1. `--filter` is the right name

**evidence:** none. i chose it because it sounds familiar.

**what if opposite?** could be confusing because:
- "filter" is generic - filter what? files? names? output?
- `--scope` already filters (by path)
- two filter concepts with different names

**alternatives considered:**
- `--name`: explicit - "filter by test name"
- `--match`: jest terminology adjacent
- `--test`: ambiguous with `--what`
- `--describe`: too jest-specific

**verdict:** assumption worth question with wisher. `--name` may be clearer than `--filter`.

**action:** added to "questions to validate" in vision.

### 2. users want to filter by test name

**evidence:** the wish shows someone used `-- --testNamePattern`

**what if opposite?** what if this was a one-time debug need, not a recurring use case?

**counterpoint:** the wish says "failfast guide away" - implies this happens enough to warrant a fix, not a one-off.

**verdict:** assumption holds. wisher wouldn't ask for failfast on a one-time issue.

### 3. exit code 2 (constraint) is appropriate

**evidence:** none stated. i assumed it based on other skill patterns.

**what if opposite?** maybe this should be exit 1 (malfunction) since it's arguably a user error?

**skill precedent:** the skill uses exit 2 for "constraint" violations (invalid args, no tests found). blocked raw args fits this pattern.

**verdict:** assumption holds per extant precedent.

### 4. block is better than deprecation warn

**evidence:** wish says "failfast" which implies immediate block.

**what if opposite?** deprecation warn would be gentler migration path:
- v1: warn but allow
- v2: block

**counterpoint:** internal tool with small user base. immediate block is simpler and clearer.

**verdict:** assumption holds. "failfast" intent is clear. but noted in vision as a wisher question.

### 5. the guidance message is helpful

**evidence:** none. i designed the message without user test.

**what if not?** users might:
- not understand what `--filter` does
- not know why their command was blocked
- be frustrated by the interruption

**action:** the guidance shows the corrected command. should be sufficient. but open to wisher feedback.

**verdict:** assumption reasonable but not validated.

### 6. jest is the test runner

**evidence:** the skill explicitly uses jest (`npx jest`, `--testPathPatterns`, etc.)

**what if opposite?** if someone uses vitest, mocha, etc., `--testNamePattern` wouldn't apply.

**verdict:** assumption holds. skill is jest-specific by design.

## summary

| assumption | verdict |
|------------|---------|
| `--filter` is right name | question wisher - `--name` may be clearer |
| users want test name filter | holds - wisher wouldn't ask for failfast on one-off |
| exit 2 for constraint | holds - matches skill precedent |
| block over deprecate | holds - "failfast" intent clear |
| guidance message helpful | reasonable but not validated |
| jest is test runner | holds - skill is jest-specific |

## revision made

updated vision "questions to validate" to include name choice: `--filter` vs `--name`.
