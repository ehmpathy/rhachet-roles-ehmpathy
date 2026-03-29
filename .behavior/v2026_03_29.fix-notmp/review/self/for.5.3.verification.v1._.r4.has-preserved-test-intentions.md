# review: has-preserved-test-intentions (r4)

## approach

examined git status and diff to verify no prior test intentions were violated.

## definitive evidence: git status

```sh
git status --short -- '*.test.ts' '*.integration.test.ts'
```

output:
```
A  src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-tmp-writes.integration.test.ts
```

the `A` prefix means **Added** — this is a new file, not a modification.

### Q: were any extant test files modified?

A: no. the git status shows only one test file change, and it is an **Add (A)**, not a **Modify (M)**.

proof: if any extant test had been modified, git would show `M` prefix for that file. no `M` entries appear.

## forbidden actions checklist

the guide forbids these actions. each is verified as not-done:

### 1. weaken assertions to make tests pass

**status**: not done.

**evidence**: no extant test file was modified. cannot weaken an assertion without a modification.

### 2. remove test cases that "no longer apply"

**status**: not done.

**evidence**: no extant test file was modified. cannot remove a test case without a modification.

### 3. change expected values to match broken output

**status**: not done.

**evidence**: no extant test file was modified. cannot change expected values without a modification.

### 4. delete tests that fail instead of fix code

**status**: not done.

**evidence**: no extant test file was deleted. the only deletion in recent history is `pretooluse.forbid-sedreplace-special-chars.integration.test.ts`, which belongs to behavior `v2026_03_26.fix-sedreplace-escapes`, not this behavior.

## new tests verification

### Q: do the 38 new tests have clear intentions?

A: yes. examined test file structure:

| case | intention | assertions |
|------|-----------|------------|
| case1 (lines 87-116) | Write tool to /tmp blocks | exit 2, stderr contains BLOCKED |
| case2 (lines 120-142) | Edit tool to /tmp blocks | exit 2, stderr contains BLOCKED |
| case3 (lines 146-180) | Bash redirect to /tmp blocks | exit 2 for >, >>, cat > |
| case4 (lines 184-206) | Bash tee to /tmp blocks | exit 2 for tee, tee -a |
| case5 (lines 210-232) | Bash cp to /tmp blocks | exit 2 |
| case6 (lines 236-252) | Bash mv to /tmp blocks | exit 2 |
| case7 (lines 256-288) | Bash read from /tmp allows | exit 0 for cat, head, tail |
| case8 (lines 292-326) | path edge cases | exit 0 for /tmpfoo, /var/tmp |
| case9 (lines 330-356) | error cases | exit 0 for passthrough |
| case10 (lines 360-384) | guidance message | stderr contains .temp/ |
| case11 (lines 388-395) | snapshot | matches expected output |

each test has:
- descriptive `given` with `[caseN]` label
- descriptive `when` with `[tN]` label
- descriptive `then` with expected outcome
- explicit assertions that match the stated intention

### Q: are the assertions consistent with the behavior?

A: yes. the behavior states:
- writes to /tmp/* should block → tests assert exit 2
- reads from /tmp/claude* should allow → tests assert exit 0
- guidance should suggest .temp/ → tests assert stderr contains ".temp/"

the assertions directly verify the stated behavior.

## why it holds

1. **git status proves no modification**: only `A` (added), no `M` (modified)
2. **forbidden actions impossible**: cannot weaken/remove/change without modify
3. **no test deletions for this behavior**: only prior behavior's test was deleted
4. **new tests have clear intentions**: each test documents what it verifies
5. **assertions match behavior**: exit codes and stderr match spec

no test intentions were violated because no extant tests were touched.

