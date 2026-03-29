# review: has-acceptance-test-citations (r4)

## approach

1. for each playtest step, cite the integration test that verifies it
2. identify any gaps between playtest and automated coverage
3. explain why gaps are acceptable or fix them

## test file

all citations reference:
```
src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-tmp-writes.integration.test.ts
```

## playtest path citations

### path 1: read from /tmp/claude* (auto-allowed)

**playtest action:**
```sh
cat /tmp/claude-$(id -u)/test/sample.txt
```

**integration test citation:**

| test case | line | assertion |
|-----------|------|-----------|
| [case7] Bash read operations | 258-261 | `cat /tmp/claude-1000/task.out is allowed` |
| [case7] Bash read operations | 264-267 | `head /tmp/claude-1000/task.out is allowed` |
| [case7] Bash read operations | 270-273 | `tail /tmp/claude-1000/task.out is allowed` |

**verification:** playtest path 1 is covered by case7 tests (lines 256-287).

---

### path 2: write to /tmp/* (blocked)

**playtest action:**
```sh
echo "should be blocked" > /tmp/playtest-scratch.txt
```

**integration test citation:**

| test case | line | assertion |
|-----------|------|-----------|
| [case3] Bash redirect writes | 148-152 | `echo x > /tmp/foo is blocked` |
| [case1] Write tool operations | 89-93 | `Write to /tmp/foo.txt is blocked` |
| [case10] guidance message | 364-378 | verifies BLOCKED, .temp/, example |

**verification:** playtest path 2 is covered by case3 (bash redirect) and case10 (guidance message).

---

### path 3: write to .temp/* (allowed)

**playtest action:**
```sh
mkdir -p .temp && echo "scratch content" > .temp/playtest.txt
```

**integration test citation:**

| test case | line | assertion |
|-----------|------|-----------|
| [case1] Write tool operations | 103-108 | `Write to .temp/foo.txt is allowed` |
| [case3] Bash redirect writes | 168-172 | `echo x > .temp/foo is allowed` |

**verification:** playtest path 3 is covered by case1 (Write tool) and case3 (Bash redirect).

---

### edge 1: write to /tmp/claude* (also blocked)

**playtest action:**
```sh
echo "should also be blocked" > /tmp/claude-$(id -u)/test/new.txt
```

**integration test citation:**

| test case | line | assertion |
|-----------|------|-----------|
| [case1] Write tool operations | 95-99 | `Write to /tmp/claude-1000/task.out is blocked` |
| [case5] Bash cp writes | 218-222 | `cp src/file /tmp/claude-1000/dest is blocked` |

**verification:** playtest edge 1 is covered. claude paths are blocked for writes.

---

### edge 2: path starts with /tmp but is not /tmp/

**playtest action:**
```sh
echo "allowed" > /tmpfoo.txt
```

**integration test citation:**

| test case | line | assertion |
|-----------|------|-----------|
| [case8] path edge cases | 294-298 | `Write to /tmpfoo is allowed (not /tmp/)` |

**verification:** playtest edge 2 is covered by case8. false positive prevention is tested.

---

### edge 3: /var/tmp/ path (not blocked)

**playtest action:**
```sh
echo "also allowed" > /var/tmp/playtest.txt
```

**integration test citation:**

| test case | line | assertion |
|-----------|------|-----------|
| [case8] path edge cases | 300-304 | `Write to /var/tmp/foo is allowed (not /tmp/)` |

**verification:** playtest edge 3 is covered by case8. /var/tmp is not /tmp.

---

## coverage matrix

| playtest step | integration test case | lines | covered? |
|---------------|----------------------|-------|----------|
| path 1: read /tmp/claude* | case7 t0 | 258-273 | yes |
| path 2: write /tmp/* blocked | case3 t0, case10 | 148-164, 364-378 | yes |
| path 3: write .temp/* allowed | case1 t1, case3 t1 | 103-115, 168-179 | yes |
| edge 1: write /tmp/claude* blocked | case1 t0, case5 t0 | 95-99, 218-222 | yes |
| edge 2: /tmpfoo not blocked | case8 t0 | 294-298 | yes |
| edge 3: /var/tmp/ not blocked | case8 t0 | 300-304 | yes |

## issues found and fixed

### issue 1: none found

verified each playtest step against integration tests:

| playtest step | playtest lines | test file lines | match? |
|---------------|----------------|-----------------|--------|
| path 1 | 19-42 | 256-287 | yes |
| path 2 | 46-66 | 148-164, 360-384 | yes |
| path 3 | 70-87 | 103-115, 168-179 | yes |
| edge 1 | 93-104 | 95-99, 218-222 | yes |
| edge 2 | 108-124 | 294-298 | yes |
| edge 3 | 128-144 | 300-304 | yes |

no gaps in citation coverage.

### issue 2: integration tests vs acceptance tests

**finding:** the guide asks for "acceptance test" citations, but this behavior uses integration tests.

**assessment:** acceptable. rationale:
- the repo uses `.integration.test.ts` as its journey test convention (see r10 for verification stone)
- integration tests verify the hook in isolation with real tool inputs
- the playtest serves as the acceptance layer (manual end-to-end verification)

**decision:** integration test citations are valid for this behavior.

### issue 3: playtest uses manual verification, tests use automation

**finding:** playtest requires human foreman execution; tests run via jest.

**assessment:** acceptable. rationale:
- playtest verifies end-to-end experience (hook registration, claude session, user flow)
- integration tests verify hook logic in isolation
- both are needed for complete coverage

**decision:** no fix needed. complementary coverage is correct.

## why it holds

1. **all paths have test citations**: 6/6 playtest steps traced to test cases
2. **specific line numbers provided**: each citation includes file and line range
3. **test case names match playtest intent**: e.g., "blocked" in test matches "blocked" in playtest
4. **no untested behaviors**: every playtest step has automated verification
5. **complementary coverage**: playtest = experience, integration tests = logic

playtest and integration tests are aligned.

