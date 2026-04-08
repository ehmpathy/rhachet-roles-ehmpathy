# self-review r8: has-role-standards-adherence

## the question

does the test coverage adhere to role standards from briefs?

---

## relevant standards

### code.test/frames.behavior: given-when-then

**requirement**: use jest with test-fns for given/when/then tests

**adherence check**:

test file imports:
```typescript
import { given, then, when } from 'test-fns';
```

test structure:
```typescript
describe('git.repo.test.sh', () => {
  given('[case1] lint passes', () => {
    when('[t0] `rhx git.repo.test --what lint` is run', () => {
      then('exit code is 0', () => { ... });
    });
  });
});
```

**verdict**: adherent. all tests use given/when/then pattern.

---

### code.test/frames.behavior: bdd labels

**requirement**: given blocks use [caseN], when blocks use [tN]

**adherence check**:

| given label | format correct? |
|-------------|-----------------|
| [case1] lint passes | yes |
| [case2] lint fails | yes |
| [case3] npm error (malfunction) | yes |
| [case4] no package.json | yes |
| [case5] log directory findsert | yes |
| [case6] log file content | yes |
| [case7] argument validation | yes |
| [case8] not in git repo | yes |

| when label | format correct? |
|------------|-----------------|
| [t0] in case1-6, case8 | yes |
| [t0], [t1] in case7 | yes |

**verdict**: adherent. all labels follow [caseN]/[tN] pattern.

---

### code.test/pitofsuccess.errors: rule.forbid.failhide

**requirement**: tests must verify on every code path. silent pass-through is forbidden.

**adherence check**:

| pattern searched | found? |
|------------------|--------|
| `if (!cond) { expect(true).toBe(true) }` | no |
| `if (!hasResource) { return }` | no |
| `expect.any(Object)` | no |
| empty then blocks | no |

every then block has at least one `expect()` call with specific assertions.

**verdict**: adherent. no failhide patterns found.

---

### code.test/pitofsuccess.errors: rule.require.failfast

**requirement**: tests that lack required resources must fail fast, not skip silently.

**adherence check**:

the test file has no credential requirements. it:
- creates temp directories for each test
- runs the skill via spawnSync
- asserts on the result

no external credentials or services are required.

**verdict**: adherent. no credential bypasses or silent skips.

---

### code.test/scope.coverage: rule.require.test-coverage-by-grain

**requirement**: integration tests for communicators and orchestrators

**adherence check**:

the skill `git.repo.test.sh` is a shell orchestrator that:
- validates arguments (transformer logic)
- runs npm commands (communicator)
- parses output (transformer logic)
- emits turtle vibes (transformer logic)

the test file is `.integration.test.ts`, which is correct for an orchestrator.

**verdict**: adherent. integration test for orchestrator.

---

### code.test/lessons.howto: rule.require.snapshots

**requirement**: use snapshots for output artifacts

**adherence check**:

| contract output | snapshot? |
|-----------------|-----------|
| success treestruct | yes |
| failure treestruct | yes |

snapshots are used for the complex treestruct outputs that benefit from visual PR review.

**verdict**: adherent. snapshots used for contract outputs.

---

## summary

| standard | adherent? |
|----------|-----------|
| given-when-then pattern | yes |
| bdd labels [caseN]/[tN] | yes |
| no failhide patterns | yes |
| no silent skips | yes |
| integration test grain | yes |
| snapshots for outputs | yes |

---

## conclusion

the test file adheres to all role standards from briefs:
- uses given/when/then from test-fns
- uses [caseN]/[tN] label format
- has no failhide or silent skip patterns
- is correctly classified as integration test
- uses snapshots for contract outputs

no standards violations found.

