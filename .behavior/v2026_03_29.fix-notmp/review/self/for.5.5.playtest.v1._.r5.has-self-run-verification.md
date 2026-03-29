# review: has-self-run-verification (r5)

## approach

1. run integration tests that execute playtest behaviors via hook
2. verify each playtest step has equivalent test
3. document test output as self-run evidence

## test run

**command:**
```sh
source .agent/repo=.this/role=any/skills/use.apikeys.sh && npm run test:integration -- pretooluse.forbid-tmp-writes
```

**result:**
```
PASS src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-tmp-writes.integration.test.ts
  pretooluse.forbid-tmp-writes.sh
    given: [case1] Write tool operations
      when: [t0] Write to /tmp paths
        ✓ then: Write to /tmp/foo.txt is blocked (14 ms)
        ✓ then: Write to /tmp/claude-1000/task.out is blocked (12 ms)
      when: [t1] Write to allowed paths
        ✓ then: Write to .temp/foo.txt is allowed (15 ms)
        ✓ then: Write to src/foo.txt is allowed (11 ms)
    given: [case7] Bash read operations
      when: [t0] read from /tmp (should allow)
        ✓ then: cat /tmp/claude-1000/task.out is allowed (13 ms)
        ✓ then: head /tmp/claude-1000/task.out is allowed (16 ms)
        ✓ then: tail /tmp/claude-1000/task.out is allowed (14 ms)
    given: [case8] path edge cases
      when: [t0] paths that should not match /tmp/
        ✓ then: Write to /tmpfoo is allowed (not /tmp/) (11 ms)
        ✓ then: Write to /var/tmp/foo is allowed (not /tmp/) (12 ms)

Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
Snapshots:   1 passed, 1 total
```

all 38 tests pass. each test invokes the hook directly with JSON input matching claude code format.

## playtest step verification via tests

| playtest step | test case | result |
|---------------|-----------|--------|
| path 1: read /tmp/claude* allowed | [case7] cat/head/tail tests | pass |
| path 2: write /tmp/* blocked | [case3] echo > /tmp/foo blocked | pass |
| path 3: write .temp/* allowed | [case1] Write to .temp/foo.txt allowed | pass |
| edge 1: write /tmp/claude* blocked | [case1] Write to /tmp/claude-1000 blocked | pass |
| edge 2: /tmpfoo not blocked | [case8] Write to /tmpfoo allowed | pass |
| edge 3: /var/tmp/ not blocked | [case8] Write to /var/tmp/foo allowed | pass |

all 6 playtest steps have equivalent test coverage that passes.

## issues found and fixed

### issue 1: cannot run playtest in new claude session

**found:** playtest requires human to start new claude session. mechanic cannot spawn a separate claude session.

**assessment:** acceptable limitation. rationale:
- integration tests verify the hook logic directly
- integration tests use same stdin format as claude code
- the 38 tests cover all playtest behaviors
- foreman will run the actual playtest in a real session

**decision:** integration test run substitutes for mechanic self-run. foreman runs the real playtest.

### issue 2: guidance message verified via snapshot

**found:** case11 verifies guidance message via snapshot.

**verification:**
```
given: [case11] block message snapshot
  when: [t0] Write to /tmp produces expected output
    ✓ then: block message matches snapshot (13 ms)
```

the snapshot contains:
- "BLOCKED"
- "/tmp is not actually temporary"
- ".temp/"
- example command

**decision:** guidance message verified. matches playtest expected outcome.

### issue 3: edge cases verified

**found:** case8 tests path boundaries.

**verification:**
```
given: [case8] path edge cases
  when: [t0] paths that should not match /tmp/
    ✓ then: Write to /tmpfoo is allowed (not /tmp/)
    ✓ then: Write to /var/tmp/foo is allowed (not /tmp/)
  when: [t1] bare /tmp paths
    ✓ then: echo x > /tmp is blocked (bare /tmp)
    ✓ then: echo x > /tmp/ is blocked (with slash)
    ✓ then: cp /tmp/a /tmp/b is blocked (dest in /tmp)
```

all boundary conditions pass.

**decision:** edge cases verified. false positives prevented, false negatives caught.

## why it holds

1. **tests run**: 38/38 tests pass
2. **playtest behaviors covered**: all 6 steps have test equivalents
3. **guidance verified**: snapshot confirms exact message content
4. **edge cases verified**: boundaries tested for false positives and negatives
5. **foreman will verify**: real session playtest delegated to human foreman

self-verification complete via integration tests. behavior works as specified.

