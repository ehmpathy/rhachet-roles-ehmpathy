# self-review r7: role-standards-coverage

## coverage check: are all relevant standards applied?

### rule directories enumerated

| directory | standards to check | applies to this PR? |
|-----------|-------------------|---------------------|
| `lang.terms/` | gerunds, ubiqlang, treestruct | yes — all files |
| `lang.tones/` | lowercase, shouts, buzzwords, seaturtle | yes — comments |
| `code.prod/readable.comments/` | what-why-headers | yes — all code |
| `code.prod/pitofsuccess.errors/` | fail-fast, exit-codes | yes — hook |
| `code.test/frames.behavior/` | given-when-then, bdd | yes — test |
| `code.test/scope.unit/` | no remote boundaries | no — this is integration test |
| `work.flow/` | various workflow rules | yes — brief location |

---

## file 1: rule.require.trust-but-verify.md

### standards that should be present

| standard | required? | present? | where? |
|----------|-----------|----------|--------|
| .what section | yes | yes | lines 3-5 |
| .why section | yes | yes | lines 7-21 |
| .the rule section | yes | yes | lines 23-31 |
| .pattern section | yes | yes | lines 33-41 |
| .antipattern section | yes | yes | lines 43-54 |
| .enforcement section | yes | yes | lines 89-92 |
| lowercase headers | yes | yes | all headers |
| no gerunds | yes | yes | scanned all 93 lines |

**why it holds:** brief has all required sections; follows extant brief pattern.

---

## file 2: postcompact.trust-but-verify.sh

### standards that should be present

| standard | required? | present? | where? |
|----------|-----------|----------|--------|
| .what header comment | yes | yes | line 3 |
| .why header comment | yes | yes | lines 5-7 |
| guarantee comment | yes | yes | lines 12-14 |
| set -euo pipefail | yes | yes | line 17 |
| exit 0 for success | yes | yes | line 34 |
| no gerunds | yes | yes | scanned all 35 lines |

**why it holds:** hook has all required header sections and bash safety options.

---

## file 3: postcompact.trust-but-verify.integration.test.ts

### standards that should be present

| standard | required? | present? | where? |
|----------|-----------|----------|--------|
| import from test-fns | yes | yes | line 3 |
| single describe block | yes | yes | line 9 |
| given/when/then structure | yes | yes | lines 40-94 |
| [caseN] labels | yes | yes | lines 40, 66, 81 |
| [tN] labels | yes | yes | lines 41, 67, 82 |
| .what/.why JSDoc | yes | yes | lines 6-7 |
| no mocks (integration test) | yes | yes | uses real spawnSync |

**why it holds:** test follows BDD structure and integration test patterns.

---

## file 4: getMechanicRole.ts (lines 43-47)

### standards that should be present

| standard | required? | present? | where? |
|----------|-----------|----------|--------|
| named args | yes | yes | command, timeout, filter |
| timeout format | yes | yes | PT30S (ISO 8601) |
| filter structure | yes | yes | { what: 'PostCompact' } |

**why it holds:** hook registration follows extant pattern exactly.

---

## file 5: boot.yml (line 206)

### standards that should be present

| standard | required? | present? | where? |
|----------|-----------|----------|--------|
| correct section | yes | yes | subject.flow.briefs.say |
| path format | yes | yes | briefs/practices/work.flow/... |
| lowercase path | yes | yes | all lowercase |

**why it holds:** brief registration follows extant entries.

---

## absent patterns check

| pattern | file type | check | verdict |
|---------|-----------|-------|---------|
| error handler | hook | hook is informational-only, always succeeds | [N/A] |
| validation | hook | no input validation needed (no config) | [N/A] |
| types | test | TypeScript types present | [OK] |
| snapshot test | test | not required for simple output | [N/A] |

**why it holds:** no required patterns are absent; N/A items are correctly omitted.

---

## summary

| file | standards checked | absent | verdict |
|------|-------------------|--------|---------|
| brief | 8 | 0 | [OK] |
| hook | 6 | 0 | [OK] |
| test | 7 | 0 | [OK] |
| getMechanicRole.ts | 3 | 0 | [OK] |
| boot.yml | 3 | 0 | [OK] |

**absent standards found:** 0

## what i'll remember

- coverage review asks "what is absent?" not "what is wrong?"
- hook with no config does not need input validation
- informational hooks do not need error handlers (they always succeed)
- integration tests use real resources (spawnSync), not mocks
- snapshot tests are optional for simple, static output
