# review: has-critical-paths-frictionless (r8)

## approach

1. identified critical paths from vision (no repros artifact)
2. ran integration tests to observe actual behavior
3. examined test output for unexpected errors
4. verified each path works as expected

## test execution

### command

```sh
npm run test:integration -- pretooluse.forbid-tmp-writes --verbose
```

### actual output

```
PASS src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-tmp-writes.integration.test.ts
  pretooluse.forbid-tmp-writes.sh
    given: [case7] Bash read operations
      when: [t0] read from /tmp (should allow)
        ✓ then: cat /tmp/claude-1000/task.out is allowed (12 ms)
        ✓ then: head /tmp/claude-1000/task.out is allowed (12 ms)
        ✓ then: tail /tmp/claude-1000/task.out is allowed (12 ms)
        ✓ then: cat /tmp/other/file is allowed (read, not write) (11 ms)
        ✓ then: grep pattern /tmp/file is allowed (read, not write) (12 ms)
    given: [case1] Write tool operations
      when: [t0] Write to /tmp paths
        ✓ then: Write to /tmp/foo.txt is blocked (14 ms)
        ✓ then: Write to /tmp/claude-1000/task.out is blocked (12 ms)
      when: [t1] Write to allowed paths
        ✓ then: Write to .temp/foo.txt is allowed (12 ms)
    ...

Test Suites: 1 passed, 1 total
Tests:       38 passed, 38 total
Snapshots:   1 passed, 1 total
Time:        0.653 s
```

all 38 tests passed. no unexpected errors.

## critical path identification

no repros artifact exists for this behavior. critical paths derived from vision (1.vision.md):

| critical path | expected outcome | user impact |
|---------------|------------------|-------------|
| read from /tmp/claude* | auto-allowed | investigation flows without friction |
| write to /tmp/* | blocked with guidance | user redirected to .temp/ |
| write to .temp/* | allowed | scratch files stay in repo |

## path 1: read from /tmp/claude*

### expected: frictionless

the hook should exit 0, so reads pass without interruption.

### test verification

| test | line | exit code |
|------|------|-----------|
| cat /tmp/claude-1000/task.out | 258-260 | 0 |
| head /tmp/claude-1000/task.out | 264-266 | 0 |
| tail /tmp/claude-1000/task.out | 270-272 | 0 |

### manual trace

examined hook source (pretooluse.forbid-tmp-writes.sh):

```bash
# line 37: skip if not Write, Edit, or Bash
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi
```

and for Bash reads:

```bash
# line 111: allow command (reads from /tmp are ok)
exit 0
```

the hook only blocks WRITE patterns (>, >>, tee, cp, mv). read commands (cat, head, tail) reach line 111 and exit 0.

### verdict: frictionless

reads from /tmp/claude* pass through with no block, no prompt.

## path 2: write to /tmp/*

### expected: blocked with guidance

the hook should exit 2 and show helpful message.

### test verification

| test | line | exit code | guidance shown |
|------|------|-----------|----------------|
| Write /tmp/foo.txt | 89-93 | 2 | yes |
| echo x > /tmp/foo | 147-151 | 2 | yes |
| tee /tmp/foo | 185-189 | 2 | yes |
| cp src/file /tmp/dest | 211-215 | 2 | yes |

### manual trace

examined guidance message (lines 47-56):

```bash
echo "🛑 BLOCKED: /tmp is not actually temporary"
echo ""
echo "/tmp persists indefinitely and never auto-cleans."
echo "use .temp/ instead - it's scoped to this repo and gitignored."
echo ""
echo "  echo \"data\" > .temp/scratch.txt"
```

the message:
1. explains WHY /tmp is blocked (not temporary)
2. suggests WHAT to use instead (.temp/)
3. shows HOW to do it (example command)

### verdict: blocked with helpful guidance

writes to /tmp are blocked, but user knows exactly what to do instead.

## path 3: write to .temp/*

### expected: frictionless

the hook should exit 0, so .temp/ writes proceed.

### test verification

| test | line | exit code |
|------|------|-----------|
| Write .temp/foo.txt | 103-108 | 0 |
| echo x > .temp/foo | 168-172 | 0 |
| tee .temp/foo | 200-204 | 0 |
| cp src/file .temp/dest | 226-230 | 0 |

### manual trace

the hook only blocks paths that match `/tmp/` or `/tmp`:

```bash
# line 46
if [[ "$FILE_PATH" == /tmp || "$FILE_PATH" == /tmp/* ]]; then
```

.temp/ does not match this pattern, so the hook exits 0 at line 61.

### verdict: frictionless

writes to .temp/ pass through with no block, no prompt.

## friction analysis

| path | friction? | if friction, what? |
|------|-----------|-------------------|
| read /tmp/claude* | none | — |
| write /tmp/* | intentional | block + guidance |
| write .temp/* | none | — |

the ONLY friction is the intentional block on /tmp writes. this friction:
- has clear purpose (prevent scattered files outside repo)
- provides immediate alternative (.temp/)
- shows example command

this is a "nudge," not a wall.

## guide questions

### Q: run through it manually — is it smooth?

A: yes. ran the test suite which exercises the hook with real inputs:
- 5 read tests: all passed in 10-12ms each (fast, no hang)
- 20 block tests: all passed in 11-15ms each (fast block + message)
- 13 allow tests: all passed in 10-14ms each (fast passthrough)

no test took longer than 15ms. execution is smooth.

### Q: are there unexpected errors?

A: no. examined test output:
- no `FAIL` entries
- no `✗` markers
- no stack traces
- no timeout warnings
- jest exit code 0

all 38 tests passed. no unexpected errors.

### Q: does it feel effortless to the user?

A: yes for intended paths:
- read /tmp/claude* → exit 0, no message, no delay
- write .temp/* → exit 0, no message, no delay

for /tmp writes, the block is intentional but still "effortless to understand":
- clear indicator (`🛑 BLOCKED`)
- simple explanation (1 sentence)
- immediate alternative (`.temp/`)
- copy-paste example command

user reads message, copies example, continues work. no debugging needed.

## why it holds

1. **read paths frictionless**: hook exits 0 for all reads
2. **write block intentional**: exit 2 with guidance, not exit 1 with error
3. **.temp/ paths frictionless**: hook exits 0, no detection
4. **guidance is helpful**: explains why, suggests what, shows how
5. **tests verify all paths**: 38 tests cover all critical paths
6. **no unexpected errors**: all 38 tests passed
7. **fast execution**: all tests completed in <15ms each

critical paths work as designed. intentional friction has helpful guidance.

