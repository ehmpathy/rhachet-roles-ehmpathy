# review: has-preserved-test-intentions (r1)

## methodology

for each test touched this iteration, verify: did the test's original intention survive the fix?

---

## tests touched this iteration

### 1. `--to` → `--into` flag rename (p1, p2 tests)

**what changed:** test invocations use `--into` instead of `--to`

**original intention:** verify skill handles destination flag correctly

**intention preserved?** yes — the assertion still checks the same behavior (destination flag works). only the flag name changed per wish mandate.

### 2. watch sequence length 4 → 5 (p3 watch tests)

**what changed:** `watchSequence` arrays grew from 4 to 5 elements

**original intention:** verify watch loop polls until terminal state

**intention preserved?** yes — the test still verifies the same behavior. the fix was in test setup (mock data), not in what we assert. the sequence needed 5 elements because `get_pr_status` is called once before the watch loop begins.

### 3. assertions check "done!" instead of "merged"/"passed" (p3 tests)

**what changed:** `expect(stdout).toContain('merged')` → `expect(stdout).toContain('done!')`

**original intention:** verify watch loop shows success message on completion

**intention preserved?** yes, but let me be precise:

the wish explicitly mandates (line from 1.vision.md):
> `{terminal}` = `✨ done!` | `⚓ N check(s) failed` | `⏰ timeout`

the original tests asserted "merged" or "passed" because that was the old skill output. the skill was refactored to emit "done!" as the terminal success indicator per the wish. so:

- **the code changed intentionally** — skill now emits "done!" per wish
- **the test changed to match** — assertions updated to the new expected output
- **the intention is preserved** — "verify success message appears on completion"

this is **not** a case of "change expected values to match broken output" because the output is not broken — it is the new specified behavior.

### 4. absent function additions (git.release.operations.sh)

**what changed:** added `show_failed_checks_in_watch` and `show_failed_tag_runs` functions to operations.sh

**tests affected?** no test changes — this was a code fix. tests already expected this output, they just weren't receivied it because the functions were absent.

---

## forbidden patterns check

| forbidden pattern | found? | evidence |
|-------------------|--------|----------|
| weaken assertions to make tests pass | no | assertions still require same content |
| remove test cases that "no longer apply" | no | no tests deleted |
| change expected values to match broken output | no | output changed per wish, not broken |
| delete tests that fail instead of fix code | no | fixed code and test setup, not deleted |

---

## the "done!" case in detail

this requires extra scrutiny because assertion text changed.

**before:**
```typescript
expect(stdout).toContain('merged');
```

**after:**
```typescript
expect(stdout).toContain('done!');
```

**why this is valid:**

1. the wish (0.wish.md) specifies the new output format
2. the vision (1.vision.md) documents `✨ done!` as the terminal success indicator
3. the skill was refactored to match this specification
4. the tests were updated to match the specification

this is "requirements changed — document why" case, not "change expected values to match broken output."

---

## summary

| test category | intention preserved? | rationale |
|---------------|---------------------|-----------|
| flag rename | yes | same behavior, new flag name |
| sequence length | yes | test setup fix, not assertion change |
| success message | yes | new specified behavior per wish |
| function additions | n/a | code fix, no test changes |

**all test intentions are preserved. no forbidden patterns detected.**

