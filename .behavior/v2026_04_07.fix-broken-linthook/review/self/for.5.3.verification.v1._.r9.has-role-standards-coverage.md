# self-review r9: has-role-standards-coverage

## the question

are all applicable role standards covered by tests?

---

## standards coverage analysis

### code.test categories

#### frames.behavior standards

| standard | applicable? | covered? | how? |
|----------|-------------|----------|------|
| given-when-then | yes | yes | test uses `given`, `when`, `then` from test-fns |
| bdd labels | yes | yes | all blocks have [caseN]/[tN] labels |
| useThen for shared results | no | n/a | tests don't share results across then blocks |

#### pitofsuccess.errors standards

| standard | applicable? | covered? | how? |
|----------|-------------|----------|------|
| failhide forbidden | yes | yes | no empty tests, no fake assertions |
| failfast required | yes | yes | no silent skips or credential bypasses |
| failloud required | no | n/a | test file doesn't throw errors |

#### scope.coverage standards

| standard | applicable? | covered? | how? |
|----------|-------------|----------|------|
| test-coverage-by-grain | yes | yes | integration test for shell orchestrator |
| blackbox tests | yes | yes | tests call skill as external process |

#### lessons.howto standards

| standard | applicable? | covered? | how? |
|----------|-------------|----------|------|
| snapshots for outputs | yes | yes | 2 snapshots for treestruct outputs |
| no mocks | yes | yes | tests use real temp directories, real npm |

---

### code.prod standards (verified by tests)

the tests verify these prod standards are implemented correctly:

| standard | test verification |
|----------|-------------------|
| exit-code-semantics | tests verify 0, 1, 2 exit codes in correct contexts |
| failfast | tests verify early exit on invalid args |
| failloud | tests verify error messages contain actionable hints |
| treestruct-output | snapshots verify turtle vibes format |

---

## gap analysis

### searched for absent coverage

| what I searched | found? | gap? |
|-----------------|--------|------|
| useThen pattern | not used | no — tests don't need shared results |
| useWhen pattern | not used | no — tests don't need sequential when blocks |
| data-driven caselist | not used | no — tests are behavior-focused, not data-focused |

### why these are not gaps

**useThen/useWhen**: each then block calls `runInTempGitRepo` independently. this is correct because each test needs a fresh temp directory. shared results would cause test pollution.

**data-driven caselist**: the tests verify distinct behaviors (lint pass, lint fail, npm error, etc.), not variations of the same behavior. given/when/then is the correct frame.

---

## conclusion

all applicable role standards are covered:

| category | standards applicable | standards covered | gap? |
|----------|---------------------|-------------------|------|
| frames.behavior | 2 | 2 | no |
| pitofsuccess.errors | 2 | 2 | no |
| scope.coverage | 2 | 2 | no |
| lessons.howto | 2 | 2 | no |

the test file follows all applicable standards. standards that are not used (useThen, data-driven) are correctly not applicable to this test file's needs.

