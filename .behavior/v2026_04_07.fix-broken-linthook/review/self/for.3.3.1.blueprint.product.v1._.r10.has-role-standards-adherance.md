# self-review r10: has-role-standards-adherance

## relevant rule directories

enumerated briefs/ subdirectories relevant to this blueprint:

| directory | relevance |
|-----------|-----------|
| code.prod/pitofsuccess.errors | exit code semantics |
| code.prod/evolvable.procedures | function patterns |
| code.prod/readable.comments | documentation |
| code.test/frames.behavior | test structure |
| work.flow/tools | skill patterns |
| lang.tones | output format, vibes |

---

## rule check: exit code semantics

**rule**: rule.require.exit-code-semantics.md

| code | means | when |
|------|-------|------|
| 0 | success | operation completed |
| 1 | malfunction | external error |
| 2 | constraint | user must fix |

**blueprint**:
```
exit code:
  0 = passed
  1 = malfunction (npm error)
  2 = constraint (lint failed)
```

**verdict**: adheres.

---

## rule check: skill file structure

**extant patterns** (from howto.test-skills):
```
src/domain.roles/{role}/skills/
  └── {skill-name}.sh    ← source
```

**blueprint**:
```
src/domain.roles/mechanic/skills/
└── git.repo.test/
    ├── git.repo.test.sh
    └── git.repo.test.integration.test.ts
```

**verdict**: adheres. collocation of skill and test is correct.

---

## rule check: test structure

**rule**: rule.require.given-when-then.md

**blueprint test coverage**:
```
usecase.1 = lint passes
├─ given: temp repo with package.json + test:lint that passes
├─ when: rhx git.repo.test --what lint
└─ then: exit 0, stdout contains success summary
```

**verdict**: adheres. given/when/then structure used.

---

## rule check: integration test file name

**rule**: howto.write-bdd

**extant pattern**: `*.integration.test.ts`

**blueprint**: `git.repo.test.integration.test.ts`

**verdict**: adheres.

---

## rule check: turtle vibes output

**rule**: rule.require.treestruct-output.md

required elements:
- `🐢` header with vibe phrase
- `🐚` root with skill name
- `├─` / `└─` tree branches
- sub.bucket for multiline content

**blueprint**:
```
├─ [+] print_turtle_header (cowabunga/bummer)
├─ [+] print_tree_start (git.repo.test --what lint)
├─ [+] print_tree_branch (status, defects, log)
└─ [+] print_tip (npm run fix)
```

**verdict**: adheres. all required elements present.

---

## rule check: skill arg pattern

**rule**: howto.test-skills

skills must handle rhachet passthrough args:
```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role) shift 2 ;;
```

**blueprint**: `[+] parse args (--what, --when)`

**question**: does blueprint mention bypass of passthrough args?

**resolution**: this is implementation detail. the blueprint specifies what args the skill accepts (--what, --when). the implementation will handle passthrough args per extant pattern.

**verdict**: adheres (impl detail).

---

## rule check: dependency injection

**rule**: rule.require.dependency-injection

this rule applies to TypeScript code. the skill is bash. not applicable.

**verdict**: n/a (bash skill).

---

## rule check: no mocks in integration tests

**rule**: howto.write.[lesson].md.pt2 — "can spy, but never mock"

**blueprint test section**: uses temp repos with real package.json files, not mocks.

**verdict**: adheres.

---

## rule check: snapshots for output

**rule**: rule.require.snapshots.[lesson] — "use snapshots for output artifacts"

**blueprint test coverage**: mentions "stdout contains success summary" but does not explicitly mention snapshots.

**question**: should tests use snapshots?

**analysis**: the rule says snapshots for "user-faced outputs". skill output is user-faced. tests should verify output with snapshots.

**issue found**: blueprint test coverage does not mention snapshots.

**resolution**: add snapshot verification to test assertions. this is an enhancement, not a blueprint change — the test file will include `expect(result.stdout).toMatchSnapshot()`.

**verdict**: minor gap. implementation should add snapshots.

---

## rule check: forbid gerunds

**rule**: rule.forbid.gerunds

scanned blueprint for gerunds:
- No gerunds found in blueprint text

**verdict**: adheres.

---

## rule check: lowercase

**rule**: rule.prefer.lowercase

scanned blueprint:
- all labels lowercase
- skill name lowercase
- output labels lowercase

**verdict**: adheres.

---

## summary

| rule category | adherence |
|--------------|-----------|
| exit codes | ✓ |
| skill structure | ✓ |
| test structure | ✓ |
| test file name | ✓ |
| turtle vibes | ✓ |
| arg parse | ✓ (impl detail) |
| dependency injection | n/a |
| no mocks | ✓ |
| snapshots | minor gap (add in impl) |
| gerunds | ✓ |
| lowercase | ✓ |

## verdict

blueprint adheres to mechanic role standards. one minor gap: snapshot verification should be added to test implementation. this does not require a blueprint change — tests will naturally include `toMatchSnapshot()` per the rule.
