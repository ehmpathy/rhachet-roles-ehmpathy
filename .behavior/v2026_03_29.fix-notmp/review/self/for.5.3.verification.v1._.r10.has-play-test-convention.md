# review: has-play-test-convention (r10)

## approach

1. searched for `.play.` test files in repo
2. counted test files by suffix to establish repo convention
3. verified fallback convention is correctly used
4. examined test content for journey-style structure

## search for play test files

### command

```sh
git ls-files '*.play.*' | wc -l
```

### result

```
0
```

zero `.play.` files extant. the `.play.` convention is not used in this repo.

## repo test convention

### test file counts by suffix

```sh
git ls-files '*.test.ts' | wc -l          # 102 total
git ls-files '*.integration.test.ts' | wc -l  # 86 integration
git ls-files '*.acceptance.test.ts' | wc -l   # 4 acceptance
git ls-files '*.play.*' | wc -l               # 0 play
```

| suffix | count | percentage |
|--------|-------|------------|
| `.test.ts` (total) | 102 | 100% |
| `.integration.test.ts` | 86 | 84% |
| `.acceptance.test.ts` | 4 | 4% |
| `.play.*.ts` | 0 | 0% |

### conclusion

this repo uses `.integration.test.ts` as the journey test convention. no `.play.` files extant anywhere.

## test files for this behavior

```
src/domain.roles/mechanic/inits/claude.hooks/
├── pretooluse.forbid-tmp-writes.integration.test.ts     ← new (this behavior)
├── pretooluse.forbid-suspicious-shell-syntax.integration.test.ts
└── pretooluse.check-permissions.integration.test.ts
```

### pattern observed

all hook tests use `.integration.test.ts` suffix. the new test follows the extant pattern.

## Q: is `.play.` convention required?

A: no. the guide states:

> if not supported, is the fallback convention used?

this repo uses `.integration.test.ts` as the standard convention for journey-style tests. the fallback is in use.

## Q: does the test file follow the fallback convention?

A: yes.

| aspect | expected | actual | valid? |
|--------|----------|--------|--------|
| suffix | `.integration.test.ts` | `.integration.test.ts` | yes |
| location | collocated with source | `claude.hooks/` dir | yes |
| runner | jest integration | `npm run test:integration` | yes |

## Q: does the test content match journey test intent?

A: yes. the test file uses BDD structure from test-fns:

### test structure (lines 1-10)

```typescript
import { given, then, when } from 'test-fns';

describe('pretooluse.forbid-tmp-writes.sh', () => {
```

### journey test example (lines 87-99)

```typescript
given('[case1] Write tool operations', () => {
  when('[t0] Write to /tmp paths', () => {
    then('Write to /tmp/foo.txt is blocked', () => {
      const result = runHookWrite('/tmp/foo.txt');
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('BLOCKED');
    });
  });
});
```

### journey test cases

| case | given | when | then |
|------|-------|------|------|
| case1 | Write tool | Write to /tmp | blocked (exit 2) |
| case2 | Edit tool | Edit to /tmp | blocked (exit 2) |
| case3 | Bash redirect | `echo x > /tmp/` | blocked (exit 2) |
| case4 | Bash tee | `tee /tmp/` | blocked (exit 2) |
| case5 | Bash cp | `cp x /tmp/` | blocked (exit 2) |
| case6 | Bash mv | `mv x /tmp/` | blocked (exit 2) |
| case7 | Bash read | `cat /tmp/claude*` | allowed (exit 0) |
| case8 | path edge | `/tmpfoo`, `/var/tmp/` | allowed (not /tmp/) |
| case9 | error | empty stdin | exit 2 |
| case10 | guidance | block message | contains explanation |
| case11 | snapshot | block output | matches snapshot |

each test case represents a complete user action → outcome, not isolated unit behavior.

## why it holds

1. **`.play.` not used in repo**: `git ls-files '*.play.*'` returns 0 files
2. **fallback convention used**: 86 of 102 tests (84%) use `.integration.test.ts`
3. **test name follows pattern**: `pretooluse.forbid-tmp-writes.integration.test.ts`
4. **test location correct**: collocated with source in `claude.hooks/`
5. **test content is journey-style**: uses given/when/then from test-fns
6. **11 journey cases**: each tests complete user action → outcome
7. **runner is correct**: runs via `npm run test:integration`

play test convention check passes via fallback path. the repo standard (`.integration.test.ts`) is used consistently.

