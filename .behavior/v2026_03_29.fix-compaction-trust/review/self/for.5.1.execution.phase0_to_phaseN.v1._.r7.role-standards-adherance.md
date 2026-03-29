# self-review r7: role-standards-adherance

## deep standards check: line-by-line against mechanic briefs

### rule directories checked

1. `lang.terms/` — rule.forbid.gerunds, rule.require.ubiqlang, rule.require.treestruct, rule.require.order.noun_adj
2. `lang.tones/` — rule.prefer.lowercase, rule.forbid.shouts, rule.forbid.buzzwords
3. `code.prod/readable.comments/` — rule.require.what-why-headers
4. `code.prod/pitofsuccess.errors/` — rule.require.fail-fast, rule.require.exit-code-semantics
5. `code.test/frames.behavior/` — rule.require.given-when-then, howto.write-bdd

---

## file 1: rule.require.trust-but-verify.md

### rule.forbid.gerunds (line-by-line scan)

| line | text | gerund? | verdict |
|------|------|---------|---------|
| 5 | "verify inherited claims before you act on them" | no | [OK] |
| 9 | "claims drift from reality" | no | [OK] |
| 10 | "compaction summaries preserve stale conclusions" | no | [OK] |
| 11 | "prior sessions may have misdiagnosed" | no | [OK] |
| 12 | "world state changes between sessions" | no | [OK] |
| 13 | "your own memory is a summary too" | no | [OK] |
| 21 | "verification upfront prevents the retry spiral" | no | [OK] |
| 58 | "trust but verify — don't even trust yourself" | no | [OK] |

**why it holds:** all verbs are infinitives, past tense, or imperative — no gerunds found.

### rule.require.ubiqlang

| term | used consistently? | verdict |
|------|-------------------|---------|
| "claim" | yes — used throughout, not "assertion" or "statement" | [OK] |
| "verify" | yes — used throughout, not "check" or "validate" | [OK] |
| "compaction" | yes — domain term for context compression | [OK] |
| "mechanic" | yes — used in line 19, not "agent" or "assistant" | [OK] |

**why it holds:** domain vocabulary is consistent, no synonym drift.

### rule.prefer.lowercase

| element | case | verdict |
|---------|------|---------|
| title (line 1) | lowercase | [OK] |
| section headers | lowercase (`.what`, `.why`, etc.) | [OK] |
| body text | lowercase sentences | [OK] |
| code blocks | lowercase commands | [OK] |

**why it holds:** no sentence-initial capitalization, no unnecessary caps.

### rule.forbid.buzzwords

scanned for: "scalable", "robust", "leverage", "synergy", "optimize", "best-in-class"

**found:** none

**why it holds:** brief uses concrete terms, no promotional language.

---

## file 2: postcompact.trust-but-verify.sh

### rule.require.what-why-headers

| element | line | content | verdict |
|---------|------|---------|---------|
| .what | 3 | `# .what = remind mechanic to verify claims after compaction` | [OK] |
| .why | 5-7 | three-line explanation | [OK] |
| guarantee | 12-14 | two guarantees listed | [OK] |

**why it holds:** follows extant hook header pattern exactly.

### rule.require.fail-fast

| element | line | verdict |
|---------|------|---------|
| `set -euo pipefail` | 17 | [OK] |

**why it holds:** bash strict mode enabled immediately after header.

### rule.require.exit-code-semantics

| code | purpose per rule | actual behavior | verdict |
|------|-----------------|-----------------|---------|
| 0 | success | hook exits 0, allows continuation | [OK] |

**why it holds:** informational hook — always succeeds, always allows continuation.

---

## file 3: postcompact.trust-but-verify.integration.test.ts

### rule.require.given-when-then

| line | block | label format | verdict |
|------|-------|--------------|---------|
| 40 | given | `[case1] PostCompact event fires` | [OK] |
| 41 | when | `[t0] hook executes` | [OK] |
| 42 | then | descriptive assertion | [OK] |
| 66 | given | `[case2] auto-triggered compaction` | [OK] |
| 67 | when | `[t0] trigger is auto` | [OK] |
| 81 | given | `[case3] manual-triggered compaction` | [OK] |
| 82 | when | `[t0] trigger is manual` | [OK] |

**why it holds:** all blocks use correct format with case/test labels.

### howto.write-bdd

| requirement | implementation | verdict |
|-------------|----------------|---------|
| wrap in single describe | line 9: `describe('postcompact.trust-but-verify.sh'` | [OK] |
| import from test-fns | line 3: `import { given, then, when } from 'test-fns'` | [OK] |
| case labels [caseN] | all given blocks | [OK] |
| test labels [tN] | all when blocks (reset per given) | [OK] |

**why it holds:** test structure matches BDD lesson exactly.

### rule.require.what-why-headers (for test file)

| element | line | content | verdict |
|---------|------|---------|---------|
| .what | 6 | `* .what = integration tests for postcompact.trust-but-verify.sh hook` | [OK] |
| .why | 7 | `* .why = verify the hook emits the reminder and exits 0` | [OK] |

**why it holds:** test file has JSDoc header with .what and .why.

---

## file 4: getMechanicRole.ts (lines 43-47)

### rule.require.named-args

hook registration uses named properties:
```typescript
{
  command: '...',
  timeout: 'PT30S',
  filter: { what: 'PostCompact' },
}
```

**why it holds:** all properties are named, not positional.

---

## file 5: boot.yml (line 206)

### rule.require.treestruct

path: `briefs/practices/work.flow/rule.require.trust-but-verify.md`

| element | pattern | verdict |
|---------|---------|---------|
| prefix | `briefs/practices/` | [OK] matches extant |
| topic | `work.flow/` | [OK] matches extant |
| name | `rule.require.trust-but-verify` | [OK] follows `[directive].[level].[name]` |

**why it holds:** path structure matches extant entries exactly.

---

## summary

| rule | files checked | violations | verdict |
|------|---------------|------------|---------|
| rule.forbid.gerunds | 3 | 0 | [OK] |
| rule.require.ubiqlang | 1 | 0 | [OK] |
| rule.prefer.lowercase | 2 | 0 | [OK] |
| rule.forbid.buzzwords | 1 | 0 | [OK] |
| rule.require.what-why-headers | 3 | 0 | [OK] |
| rule.require.fail-fast | 1 | 0 | [OK] |
| rule.require.exit-code-semantics | 1 | 0 | [OK] |
| rule.require.given-when-then | 1 | 0 | [OK] |
| howto.write-bdd | 1 | 0 | [OK] |
| rule.require.named-args | 1 | 0 | [OK] |
| rule.require.treestruct | 1 | 0 | [OK] |

**total violations:** 0

## what i'll remember

- line-by-line scan for gerunds: check each verb form
- ubiqlang check: verify no synonym drift (e.g., "verify" not "check")
- test files need .what/.why JSDoc headers too
- exit code 0 is correct for informational hooks
- BDD requires [caseN] labels on given, [tN] labels on when (reset per given)
