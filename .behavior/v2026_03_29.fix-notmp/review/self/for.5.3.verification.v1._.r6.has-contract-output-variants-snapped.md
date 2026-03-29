# review: has-contract-output-variants-snapped (r6)

## approach

1. identified the public contract (PreToolUse hook)
2. read hook source to enumerate ALL output variants
3. traced each variant to test coverage
4. verified snapshot coverage for caller-visible variants

## contract identification

### Q: what is the public contract?

A: `pretooluse.forbid-tmp-writes.sh` — a PreToolUse hook.

### contract interface

| input | output |
|-------|--------|
| JSON via stdin | exit code + stderr |

## output variant enumeration

examined hook source to enumerate ALL stderr outputs:

### variant 1: block message (lines 47-57, 98-108)

```bash
echo "🛑 BLOCKED: /tmp is not actually temporary"
echo ""
echo "/tmp persists indefinitely and never auto-cleans."
echo "use .temp/ instead - it's scoped to this repo and gitignored."
echo ""
echo "  echo \"data\" > .temp/scratch.txt"
```

this is the **public-facing output** — what claude and the user see when the hook blocks.

### variant 2: empty stdin error (line 29)

```bash
echo "ERROR: PreToolUse hook received no input via stdin" >&2
```

this is an **internal diagnostic** — only appears if claude code misconfigures the hook.

### variant 3: silent allow (lines 38, 61, 69, 112)

```bash
exit 0
```

no stderr output. hook allows the operation silently.

## variant analysis

| variant | stderr output | caller-visible? | needs snapshot? |
|---------|--------------|-----------------|-----------------|
| block message | 6-line guidance | yes | yes |
| empty stdin error | 1-line error | no (internal) | no |
| silent allow | none | no | no |

### Q: why doesn't empty stdin error need a snapshot?

A: it's an internal diagnostic, not a public contract output:
- only triggers when claude code passes no stdin
- indicates hook misconfiguration, not normal operation
- the user never sees this in normal workflow

the test verifies the exit code (lines 332-339):
```typescript
then('empty stdin exits 2', () => {
  const result = spawnSync('bash', [scriptPath], {
    encoding: 'utf-8',
    input: '',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  expect(result.status).toBe(2);
});
```

exit code verification is sufficient for internal errors.

## snapshot coverage verification

### snapshot file

```
__snapshots__/pretooluse.forbid-tmp-writes.integration.test.ts.snap
```

### snapshot content

```
exports[`... then: block message matches snapshot 1`] = `
"
🛑 BLOCKED: /tmp is not actually temporary

/tmp persists indefinitely and never auto-cleans.
use .temp/ instead - it's scoped to this repo and gitignored.

  echo "data" > .temp/scratch.txt

"
`;
```

### snapshot test (lines 388-395)

```typescript
given('[case11] block message snapshot', () => {
  when('[t0] Write to /tmp produces expected output', () => {
    then('block message matches snapshot', () => {
      const result = runHookWrite('/tmp/foo.txt');
      expect(result.stderr).toMatchSnapshot();
    });
  });
});
```

### Q: does snapshot capture what caller sees?

A: yes. the snapshot is the exact stderr output:
1. block indicator (`🛑 BLOCKED`)
2. explanation ("not actually temporary")
3. guidance (".temp/ instead")
4. example command (`echo "data" > .temp/scratch.txt`)

### Q: is success case covered?

A: yes. for a blocker hook, "success" = block worked. the block message IS the success output.

### Q: are error cases covered?

A: yes. case9 tests empty stdin error for exit code (line 338).

### Q: are edge cases covered?

A: yes. the hook has one public message variant (the block message), which is snapped. edge cases tested:
- case8: path edge cases (/tmpfoo, /var/tmp)
- case9: error cases (empty stdin, Read tool passthrough)
- case10: guidance message content assertions

## guidance message content tests (lines 360-383)

in addition to snapshot, case10 verifies message parts individually:

| assertion | line | verified content |
|-----------|------|-----------------|
| contains BLOCKED | 365 | `🛑 BLOCKED` present |
| contains explanation | 369 | `/tmp is not actually temporary` |
| contains alternative | 373 | `.temp/` |
| contains example | 377 | `echo` |
| stdout empty | 381 | guidance to stderr only |

## why it holds

1. **all outputs enumerated**: read hook source, found 3 variants
2. **public variant snapped**: block message (case11, line 392)
3. **internal error tested**: empty stdin verified for exit code
4. **silent allow has no output**: none to snap
5. **message content verified**: case10 asserts individual parts
6. **snapshot captures caller view**: exact stderr preserved

all caller-visible output variants are snapped.

