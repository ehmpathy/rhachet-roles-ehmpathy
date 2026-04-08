# self-review r4: has-preserved-test-intentions

## the question

did i preserve test intentions? for every test touched, does it still verify the same behavior?

---

## deep reflection

### what tests did this behavior touch?

i created **new tests** for a **new skill**. let me verify this claim:

```bash
git diff --stat HEAD~10 -- '**/**.test.ts' '**/**.test.tsx' '**/__snapshots__/**'
```

the only test files in the diff:
- `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts` (new)
- `src/domain.roles/mechanic/skills/git.repo.test/__snapshots__/git.repo.test.integration.test.ts.snap` (new)

### why this matters

the guide warns about forbidden patterns:
- weaken assertions to make tests pass
- remove test cases that "no longer apply"
- change expected values to match broken output
- delete tests that fail instead of fix code

these patterns apply when one edits pre-extant tests. since i created new tests, i cannot have committed these violations.

but the deeper question: **could i have violated the spirit of this review?**

---

## spirit check: did i write tests that mask defects?

### the tests i wrote

| test | assertion | could this hide a defect? |
|------|-----------|---------------------------|
| exit 0 on lint pass | `expect(result.exitCode).toBe(0)` | no — verifies success path |
| exit 2 on lint fail | `expect(result.exitCode).toBe(2)` | no — verifies constraint enforcement |
| exit 1 on npm error | `expect(result.exitCode).toBe(1)` | no — verifies malfunction path |
| stdout contains status | `expect(result.stdout).toContain('status:')` | no — verifies contract output |
| stderr is empty | `expect(result.stderr).toBe('')` | no — verifies no token waste |
| snapshot matches | `expect(sanitized).toMatchSnapshot()` | maybe — let me examine |

### snapshot examination

the snapshots capture:
1. turtle vibes header (🐢 cowabunga! or 🐢 bummer dude...)
2. shell root (🐚 git.repo.test --what lint)
3. tree branches (status, defects, log, tip)

the snapshots are sanitized to replace ISOTIME with a placeholder. this is legitimate — timestamps vary per run.

**could the snapshot hide a defect?**

the snapshot shows the exact user-visible output. if the output changed unexpectedly, the snapshot would fail. this is the opposite of hidden defects — it exposes changes.

### could i have written weaker assertions?

let me check what i could have asserted but did not:

| what | asserted? | why or why not |
|------|-----------|----------------|
| exact defect count | yes | `toContain('defects: 7')` |
| log path format | yes | `toContain('.log/role=mechanic/')` |
| tip text | yes | `toContain('npm run fix')` |
| log file extant | yes | `fs.existsSync(logPath)` |
| log file content | yes | `expect(logContent).toContain('7 problems')` |
| .gitignore findsert | yes | checks file extant and content |

i cannot identify assertions i should have made but did not.

---

## hook replacement check

the behavior replaces `pnpm run --if-present fix` with `rhx git.repo.test --what lint`.

this is a **production change**, not a test change. but let me verify: did this break any pre-extant tests?

**pre-extant hook tests**: none found. the hook registration in `getMechanicRole.ts` does not have dedicated tests.

**could this cause pre-extant tests to fail?**: the hook runs at session stop, not at test execution time. test suites do not trigger onStop hooks.

---

## conclusion

test intentions are preserved because:

1. **no pre-extant tests were modified** — all test files are new
2. **new tests verify the contract** — each blackbox criterion has coverage
3. **assertions are not weakened** — i verified each assertion is specific
4. **snapshots expose changes** — they do not hide them
5. **hook change does not affect tests** — hooks run at session stop, not test time

the spirit of the review is honored: i wrote tests that verify behavior, not tests that pass despite defects.

---

## 2026-04-07 session reverification

this is a new session after the chmod blocker was resolved. let me re-verify the file was renamed correctly and test intentions were preserved.

### file rename context

the skill file was renamed from `git.repo.test.sh` to `git.repo.test.run.sh` to escape the rsync exclude pattern `**/*.test.sh`.

**question**: did this rename affect test intentions?

**answer**: no. the test file reference was updated:
```typescript
const skillPath = path.join(__dirname, 'git.repo.test.run.sh');
```

the tests still verify the same behaviors. the only change is the path to the skill. all 32 tests still pass.

### what changed in tests

| change | reason | intention preserved? |
|--------|--------|---------------------|
| skillPath from `.sh` to `.run.sh` | file renamed to escape rsync exclude | yes — same behavior tested |
| no assertion changes | tests verify skill output, not filename | yes — no weakened assertions |

### verification

```
npm run test:integration -- git.repo.test.integration.test.ts
32 passed, 7 snapshots
```

all original test intentions are preserved. the rename was mechanical, not semantic.

