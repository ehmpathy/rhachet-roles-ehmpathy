# review: has-behavior-coverage (r1)

## approach

traced every behavior promised in wish and vision to specific test lines in the verification checklist.

## wish behaviors

### behavior 1: "reads from /tmp/claude* should be auto allowed" (wish line 14)

verification:

```typescript
// pretooluse.forbid-tmp-writes.integration.test.ts lines 258-274
then('cat /tmp/claude-1000/task.out is allowed', () => {
  const result = runHookBash('cat /tmp/claude-1000/task.out');
  expect(result.exitCode).toBe(0);                              // line 260
});

then('head /tmp/claude-1000/task.out is allowed', () => {
  const result = runHookBash('head /tmp/claude-1000/task.out');
  expect(result.exitCode).toBe(0);                              // line 266
});

then('tail /tmp/claude-1000/task.out is allowed', () => {
  const result = runHookBash('tail /tmp/claude-1000/task.out');
  expect(result.exitCode).toBe(0);                              // line 272
});
```

**status**: covered. 3 tests verify cat/head/tail to /tmp/claude* exit 0.

### behavior 2: "writes into /tmp/* should be auto blocked" (wish line 16)

verification:

```typescript
// lines 89-99: Write tool blocks
then('Write to /tmp/foo.txt is blocked', () => {
  const result = runHookWrite('/tmp/foo.txt');
  expect(result.exitCode).toBe(2);
  expect(result.stderr).toContain('BLOCKED');
});

// lines 148-164: Bash redirect blocks
then('echo x > /tmp/foo is blocked', () => {
  const result = runHookBash('echo x > /tmp/foo');
  expect(result.exitCode).toBe(2);
});

// lines 186-196: Bash tee blocks
then('echo x | tee /tmp/foo is blocked', () => {
  const result = runHookBash('echo x | tee /tmp/foo');
  expect(result.exitCode).toBe(2);
});

// lines 212-222: Bash cp blocks
then('cp src/file /tmp/dest is blocked', () => {
  const result = runHookBash('cp src/file /tmp/dest');
  expect(result.exitCode).toBe(2);
});

// lines 238-242: Bash mv blocks
then('mv src/file /tmp/dest is blocked', () => {
  const result = runHookBash('mv src/file /tmp/dest');
  expect(result.exitCode).toBe(2);
});
```

**status**: covered. 21 block tests across Write, Edit, Bash (redirect, tee, cp, mv).

### behavior 3: "in favor of .temp/" (wish line 16)

verification:

```typescript
// lines 372-378: guidance message
then('stderr contains .temp/', () => {
  expect(result.stderr).toContain('.temp/');                    // line 373
});

then('stderr contains example command', () => {
  expect(result.stderr).toContain('echo');                      // line 377
});
```

**status**: covered. guidance message includes .temp/ alternative and example.

## vision behaviors

### vision line 29: "reads from /tmp/claude* flow without interruption"

verified at test lines 258-274 (case7). exit 0 = no interruption.

### vision lines 32-37: blocked message format

verified at test lines 388-393 (case11 snapshot):

```
🛑 BLOCKED: /tmp is not actually temporary

/tmp persists indefinitely and never auto-cleans.
use .temp/ instead - it's scoped to this repo and gitignored.

  echo "data" > .temp/scratch.txt
```

exact match to vision lines 34-36.

### vision line 55: "write scratch file to /tmp → blocked → nudged to .temp/"

verified at:
- test lines 148-151: `echo x > /tmp/foo` blocked
- test lines 372-373: guidance contains ".temp/"

### vision line 56: "write scratch file to .temp/ → works"

verified at:
- test lines 103-108: `Write to .temp/foo.txt` exit 0
- test lines 168-172: `echo x > .temp/foo` exit 0
- test lines 200-204: `echo x | tee .temp/foo` exit 0

### vision line 124: "write to /tmp/claude* → block tool writes"

verified at:
- test lines 95-99: `Write to /tmp/claude-1000/task.out` exit 2
- test lines 218-222: `cp src/file /tmp/claude-1000/dest` exit 2

## edge cases from vision

### vision line 122: "read non-claude /tmp paths → still prompts"

verified at test lines 276-280: `cat /tmp/other/file` exit 0 (hook allows, permission system prompts)

### vision lines 120-124: edge case table

| edge from vision | test | line |
|------------------|------|------|
| read non-claude /tmp | cat /tmp/other/file → exit 0 | 276-280 |
| write to .temp/ | Write .temp/foo.txt → exit 0 | 103-108 |
| write to /tmp/claude* | Write /tmp/claude-1000/task.out → exit 2 | 95-99 |

## verification checklist cross-reference

the checklist at `5.3.verification.v1.i1.md` shows all 38 tests mapped:

| category | count | lines in test file |
|----------|-------|-------------------|
| Write tool | 4 | 87-116 |
| Edit tool | 3 | 120-142 |
| Bash redirect | 5 | 146-180 |
| Bash tee | 3 | 184-206 |
| Bash cp | 3 | 210-232 |
| Bash mv | 2 | 236-252 |
| Bash read | 5 | 256-288 |
| path edge | 5 | 292-326 |
| error cases | 2 | 330-356 |
| guidance | 5 | 360-384 |
| snapshot | 1 | 388-395 |
| **total** | **38** | |

## why it holds

1. **every wish behavior traced to specific test lines**
   - "reads allowed" → lines 258-274 (exit 0 assertions)
   - "writes blocked" → lines 89-324 (exit 2 assertions)
   - ".temp/ alternative" → lines 372-378 (guidance assertions)

2. **vision block message format verified**
   - snapshot at line 392 matches vision lines 34-36 exactly

3. **edge cases from vision verified**
   - /tmp/claude* writes blocked (lines 95-99, 218-222)
   - .temp/ writes allowed (lines 103-108, 168-172)
   - non-claude /tmp reads allowed (lines 276-280)

4. **test file location in checklist**
   - `pretooluse.forbid-tmp-writes.integration.test.ts` contains all 38 tests
   - checklist maps each behavior to test category

no absent behavior coverage found.

