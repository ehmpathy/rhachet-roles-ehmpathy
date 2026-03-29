# self-review r8: role-standards-coverage

## deep coverage check: line-by-line for absent patterns

### rule directories complete enumeration

| directory | path | checked? |
|-----------|------|----------|
| lang.terms | `briefs/practices/lang.terms/` | yes |
| lang.tones | `briefs/practices/lang.tones/` | yes |
| code.prod/readable.comments | `briefs/practices/code.prod/readable.comments/` | yes |
| code.prod/pitofsuccess.errors | `briefs/practices/code.prod/pitofsuccess.errors/` | yes |
| code.prod/evolvable.procedures | `briefs/practices/code.prod/evolvable.procedures/` | yes |
| code.test/frames.behavior | `briefs/practices/code.test/frames.behavior/` | yes |
| work.flow | `briefs/practices/work.flow/` | yes |

---

## file 1: rule.require.trust-but-verify.md (93 lines)

### line-by-line coverage check

| line range | content | standard | present? |
|------------|---------|----------|----------|
| 1 | `# rule.require.trust-but-verify` | lowercase title | yes |
| 3-5 | `.what` section | what-why-headers | yes |
| 7-21 | `.why` section | what-why-headers | yes |
| 23-31 | `.the rule` section | brief structure | yes |
| 33-41 | `.pattern` section | brief structure | yes |
| 43-54 | `.antipattern` section | brief structure | yes |
| 56-58 | `.mantra` section | (extension) | yes |
| 60-74 | `.verification examples` | code examples | yes |
| 76-87 | `.when verification is expensive` | guidance | yes |
| 89-92 | `.enforcement` section | brief structure | yes |

**absent patterns check:**

| should have? | present? | why? |
|--------------|----------|------|
| .what | yes | line 3 |
| .why | yes | line 7 |
| .the rule | yes | line 23 |
| .pattern | yes | line 33 |
| .antipattern | yes | line 43 |
| .enforcement | yes | line 89 |
| table format | yes | lines 25-31 |
| code block examples | yes | lines 35-37, 45-47, 62-74 |

**why it holds:** all required brief sections present; structure follows extant briefs.

---

## file 2: postcompact.trust-but-verify.sh (35 lines)

### line-by-line coverage check

| line | content | standard | present? |
|------|---------|----------|----------|
| 1 | `#!/usr/bin/env bash` | shebang | yes |
| 2 | `######...` | header delimiter | yes |
| 3 | `.what` comment | what-why-headers | yes |
| 5-7 | `.why` comment | what-why-headers | yes |
| 9-10 | `usage:` | documentation | yes |
| 12-14 | `guarantee:` | safety contract | yes |
| 15 | `######...` | header delimiter | yes |
| 17 | `set -euo pipefail` | fail-fast | yes |
| 19 | `# emit reminder` | code comment | yes |
| 20-32 | heredoc output | implementation | yes |
| 34 | `exit 0` | exit code | yes |

**absent patterns check:**

| should have? | present? | why? |
|--------------|----------|------|
| shebang | yes | line 1 |
| .what comment | yes | line 3 |
| .why comment | yes | lines 5-7 |
| guarantee | yes | lines 12-14 |
| set -euo pipefail | yes | line 17 |
| exit 0 | yes | line 34 |

**why it holds:** all required hook header elements present; bash safety enabled.

---

## file 3: postcompact.trust-but-verify.integration.test.ts (95 lines)

### line-by-line coverage check

| line | content | standard | present? |
|------|---------|----------|----------|
| 1-3 | imports | test structure | yes |
| 5-8 | JSDoc header | what-why-headers | yes |
| 9 | describe block | single describe | yes |
| 10 | scriptPath | test setup | yes |
| 12-38 | runHook function | local helper | yes |
| 40 | given '[case1]' | given-when-then | yes |
| 41 | when '[t0]' | given-when-then | yes |
| 42-52 | then (assertions) | given-when-then | yes |
| 54-57 | then (exit code) | given-when-then | yes |
| 59-62 | then (no stderr) | given-when-then | yes |
| 66 | given '[case2]' | given-when-then | yes |
| 67-78 | when/then | given-when-then | yes |
| 81 | given '[case3]' | given-when-then | yes |
| 82-93 | when/then | given-when-then | yes |

**absent patterns check:**

| should have? | present? | why? |
|--------------|----------|------|
| import test-fns | yes | line 3 |
| JSDoc .what/.why | yes | lines 6-7 |
| describe block | yes | line 9 |
| given blocks | yes | lines 40, 66, 81 |
| when blocks | yes | lines 41, 67, 82 |
| then blocks | yes | multiple |
| [caseN] labels | yes | all given blocks |
| [tN] labels | yes | all when blocks |
| TypeScript types | yes | line 18 ReturnType |

**why it holds:** test follows BDD pattern completely; all labels present.

---

## file 4: getMechanicRole.ts (lines 43-47)

### line-by-line coverage check

| line | content | standard | present? |
|------|---------|----------|----------|
| 43 | `{` | object literal | yes |
| 44-45 | `command: '...'` | named property | yes |
| 46 | `timeout: 'PT30S'` | named property | yes |
| 47 | `filter: { what: 'PostCompact' }` | named property | yes |

**absent patterns check:**

| should have? | present? | why? |
|--------------|----------|------|
| named properties | yes | all three present |
| ISO 8601 timeout | yes | PT30S |
| filter object | yes | { what: 'PostCompact' } |

**why it holds:** registration uses named args, proper timeout format.

---

## file 5: boot.yml (line 206)

### line coverage check

| line | content | standard | present? |
|------|---------|----------|----------|
| 206 | `- briefs/practices/work.flow/rule.require.trust-but-verify.md` | yaml list entry | yes |

**absent patterns check:**

| should have? | present? | why? |
|--------------|----------|------|
| correct path prefix | yes | `briefs/practices/` |
| topic directory | yes | `work.flow/` |
| lowercase path | yes | all lowercase |
| correct section | yes | under subject.flow.briefs.say |

**why it holds:** entry format matches extant entries exactly.

---

## summary

| file | lines checked | absent standards | verdict |
|------|---------------|------------------|---------|
| brief | 93 | 0 | [OK] |
| hook | 35 | 0 | [OK] |
| test | 95 | 0 | [OK] |
| getMechanicRole.ts | 5 | 0 | [OK] |
| boot.yml | 1 | 0 | [OK] |

**total lines reviewed:** 229
**absent standards found:** 0

## what i'll remember

- line-by-line review ensures no gaps
- each file type has specific required elements
- briefs need: .what, .why, .the rule, .pattern, .antipattern, .enforcement
- hooks need: shebang, .what, .why, guarantee, set -euo pipefail, exit 0
- tests need: test-fns import, describe, given/when/then, labels
- registrations need: named properties, proper formats
