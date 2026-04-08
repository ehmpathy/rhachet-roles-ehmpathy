# self-review r6: has-contract-output-variants-snapped

## the question

does each public contract have EXHAUSTIVE snapshots? zero gaps in caller experience.

---

## issue found and fixed

### the gap

in r5, i rationalized not to snap simple error messages:

> "the simple messages are **already covered** by explicit assertions. a snapshot would add redundancy without added value."

the guide is clear: **zero leniency**. if you find yourself about to say "this variant isn't worth a snapshot" — stop. that is the variant that will break in prod. snap it.

### the fix

added 5 new snapshot tests:

| test case | variant | snapshot added |
|-----------|---------|----------------|
| [case3] | npm error (malfunction) | stderr output |
| [case4] | no package.json | turtle vibes error |
| [case7] t0 | --what omitted | turtle vibes error |
| [case7] t1 | --what invalid | turtle vibes error |
| [case8] | not in git repo | turtle vibes error |

ran tests with `RESNAP=true` to generate the snapshots.

---

## verification: all variants now snapped

### snapshot file contents

| snapshot | output |
|----------|--------|
| [case1] success | `🐢 cowabunga!\n\n🐚 git.repo.test --what lint\n   ├─ status: passed\n   └─ log: ...` |
| [case2] failure | `🐢 bummer dude...\n\n🐚 git.repo.test --what lint\n   ├─ status: failed\n   ├─ defects: 7\n   ├─ log: ...\n   ��─ 💡 tip: ...` |
| [case3] malfunction | `npm ERR! command not found\n` |
| [case4] no package.json | `🐢 bummer dude...\n\n🐚 git.repo.test --what lint\n   └─ error: no package.json found\n\nthis skill requires...` |
| [case7] t0 --what omitted | `🐢 bummer dude...\n\n🐚 git.repo.test\n   └─ error: --what is required\n\nusage: ...` |
| [case7] t1 --what invalid | `🐢 bummer dude...\n\n🐚 git.repo.test --what types\n   └─ error: only 'lint' is supported (got 'types')` |
| [case8] not in git repo | `🐢 bummer dude...\n\n🐚 git.repo.test --what lint\n   └─ error: not in a git repository` |

### checklist

- [x] positive path (success) is snapped — [case1]
- [x] negative path (failure) is snapped — [case2]
- [ ] help/usage is snapped — not applicable (skill has no --help, but --what omitted shows usage)
- [x] edge cases are snapped — all 5 error variants snapped
- [x] snapshot shows actual output, not placeholder — verified in snapshot file

---

## lesson learned

**do not rationalize absent snapshots.** the guide says "zero leniency" for a reason.

even simple error messages benefit from snapshots:
- pr reviewers see the actual user experience
- output drift surfaces as snapshot diffs
- no variant is too simple to verify

---

## conclusion

all 7 output variants are now snapped:

| variant | snapped |
|---------|---------|
| success | yes |
| failure | yes |
| malfunction | yes |
| no package.json | yes |
| --what omitted | yes |
| --what invalid | yes |
| not in git repo | yes |

the contract has exhaustive snapshot coverage. zero gaps in caller experience verification.

---

## proof: test execution

### command run

```bash
RESNAP=true THOROUGH=true npm run test:integration -- src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts
```

### result

```
PASS src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts (10.397 s)
Tests:       32 passed, 32 total
Snapshots:   5 written, 2 passed, 7 total
```

### files changed

| file | change |
|------|--------|
| `git.repo.test.integration.test.ts` | +5 `then('output matches snapshot', ...)` blocks |
| `__snapshots__/git.repo.test.integration.test.ts.snap` | +5 snapshots |

---

## deep reflection: why this matters

i initially thought "simple error messages don't need snapshots — assertions cover them."

this was wrong for three reasons:

1. **visual verification** — snapshots let pr reviewers see exact output without run
2. **drift detection** — output format changes surface as diffs, not silent breaks
3. **documentation** — the snapshot file shows all possible outputs in one place

the guide says "if you find yourself about to say 'this variant isn't worth a snapshot' — stop."

i said that. i was wrong. the fix was required.

---

## 2026-04-07 session verification

this is a fresh session after the chmod blocker was resolved. let me re-verify the snapshots are correct.

### snapshot file re-read

verified the snapshot file at:
`src/domain.roles/mechanic/skills/git.repo.test/__snapshots__/git.repo.test.integration.test.ts.snap`

the file contains 7 snapshots:

| index | key | content summary |
|-------|-----|-----------------|
| 1 | [case1] success | turtle success with status: passed |
| 2 | [case2] failure | turtle failure with defects: 7 and tip |
| 3 | [case3] malfunction | raw npm error |
| 4 | [case4] no package.json | turtle error with explanation |
| 5 | [case7] t0 --what omitted | turtle error with usage |
| 6 | [case7] t1 --what invalid | turtle error for unsupported value |
| 7 | [case8] not in git repo | turtle error for wrong context |

### test execution verification

command:
```
npm run test:integration -- git.repo.test.integration.test.ts
```

result:
```
PASS src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.integration.test.ts (11.714 s)
Test Suites: 1 passed, 1 total
Tests:       32 passed, 32 total
Snapshots:   7 passed, 7 total
```

all 7 snapshots pass. coverage is exhaustive.

### manual skill verification

command:
```
rhx git.repo.test.run --what lint
```

result:
```
🐢 cowabunga!

🐚 git.repo.test --what lint
   ├─ status: passed
   └─ log: .log/role=mechanic/skill=git.repo.test/2026-04-07T13-13-22Z.stdout.log
```

the skill works. the output matches the [case1] snapshot pattern.

