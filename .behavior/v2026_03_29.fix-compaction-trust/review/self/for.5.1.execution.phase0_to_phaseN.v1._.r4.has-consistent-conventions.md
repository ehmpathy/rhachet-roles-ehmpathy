# self-review r4: has-consistent-conventions

## deep convention analysis: line-by-line comparison

### brief conventions: rule.require.trust-but-verify.md vs rule.require.test-covered-repairs.md

**examined:** new brief (93 lines) vs extant brief (85 lines)

| convention | extant (test-covered-repairs) | new (trust-but-verify) | match? |
|------------|-------------------------------|------------------------|--------|
| title format | `# rule.require.{name}` (line 1) | `# rule.require.{name}` (line 1) | yes |
| .what header | `## .what` (line 3) | `## .what` (line 3) | yes |
| .what content | one sentence (line 5) | one sentence (line 5) | yes |
| .why header | `## .why` (line 7) | `## .why` (line 7) | yes |
| .why structure | bullet points (lines 9-19) | bullet points (lines 9-21) | yes |
| .the rule | table format (lines 21-28) | table format (lines 23-31) | yes |
| .pattern | code block (lines 30-45) | code block (lines 33-41) | yes |
| .antipattern | code block (lines 55-70) | code block (lines 43-54) | yes |
| .enforcement | bullet points (lines 81-84) | bullet points (lines 89-92) | yes |

**extensions in new brief (not divergences):**
- `.mantra` section (lines 56-58) — memorable phrase, not found in extant
- `.verification examples` section (lines 60-74) — actionable code examples
- `.when verification is expensive` section (lines 76-87) — guidance for edge cases

**why it holds:**
- all core sections appear in identical order
- section names follow exact pattern (`.what`, `.why`, `.the rule`, etc.)
- table format in `.the rule` uses same column structure
- code blocks use same markdown fence syntax
- bullet points follow same indentation

**verdict:** [OK] core conventions match; extensions are additive

---

### hook conventions: postcompact.trust-but-verify.sh vs sessionstart.notify-permissions.sh

**examined:** new hook (35 lines) vs extant hook (107 lines)

| convention | extant (sessionstart) | new (postcompact) | match? |
|------------|----------------------|-------------------|--------|
| shebang | `#!/usr/bin/env bash` (line 1) | `#!/usr/bin/env bash` (line 1) | yes |
| header open | `######################################################################` (line 2) | `######################################################################` (line 2) | yes |
| .what comment | `# .what = ...` (line 3) | `# .what = ...` (line 3) | yes |
| .why comment | `# .why  = ...` (lines 5-11) | `# .why  = ...` (lines 5-7) | yes |
| guarantee section | `# guarantee:` (lines 20-23) | `# guarantee:` (lines 12-14) | yes |
| guarantee format | `#   ✔ {description}` | `#   ✔ {description}` | yes |
| header close | `######################################################################` (line 24) | `######################################################################` (line 15) | yes |
| set options | `set -euo pipefail` (line 26) | `set -euo pipefail` (line 17) | yes |
| exit code | `exit 0` (line 106) | `exit 0` (line 34) | yes |

**differences (acceptable):**
- extant hook has `.how` section (lines 13-15) — not needed for simple hooks
- extant hook has complex logic (find functions, jq parse) — new hook is pure output
- new hook is simpler because it's informational only

**why it holds:**
- header structure identical: shebang → comment block → set options
- guarantee format uses same `✔` symbol and indent
- both exit 0 as last line
- simpler hooks omit `.how` section (appropriate when no config)

**verdict:** [OK] header conventions match; simpler structure appropriate for purpose

---

### test conventions: postcompact.trust-but-verify.integration.test.ts vs pretooluse.check-permissions.integration.test.ts

**examined:** new test structure vs extant test structure

| convention | extant pattern | new pattern | match? |
|------------|---------------|-------------|--------|
| imports | `spawnSync`, `path`, `test-fns` | same | yes |
| describe block | hook executable name | hook executable name | yes |
| runHook function | defined per test file | defined per test file | yes |
| given/when/then | from test-fns | from test-fns | yes |
| case labels | `[caseN]` format | `[caseN]` format | yes |

**why it holds:**
- both tests use identical import structure
- both define local `runHook` function for the specific hook
- both use given/when/then from test-fns
- both test exit code, stdout, stderr

**verdict:** [OK] test conventions match

---

### registration conventions: boot.yml and getMechanicRole.ts

**boot.yml entry (line 206):**
```yaml
- briefs/practices/work.flow/rule.require.trust-but-verify.md
```

**extant entries nearby (lines 207-208):**
```yaml
- briefs/practices/work.flow/diagnose/rule.require.test-covered-repairs.md
- briefs/practices/work.flow/diagnose/howto.bisect.[lesson].md
```

**convention check:**
- format: `- briefs/practices/{topic}/{name}.md`
- placement: in `subject.flow.briefs.say` section
- new entry at root of work.flow/ (appropriate for cross-domain rule)

**getMechanicRole.ts entry (lines 43-47):**
```typescript
{
  command: '...postcompact.trust-but-verify',
  timeout: 'PT30S',
  filter: { what: 'PostCompact' },
},
```

**extant entries structure:**
- command: `./node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init ...`
- timeout: PT5S to PT60S range
- filter: `{ what: '...' }` or `{ what: '...', when: 'before' }`

**why it holds:**
- command format matches extant pattern
- timeout (PT30S) is within extant range
- filter uses same object structure

**verdict:** [OK] registration conventions match

---

## summary

| artifact | conventions checked | issues found | verdict |
|----------|---------------------|--------------|---------|
| brief | 12 section conventions | 0 | [OK] |
| hook | 9 header conventions | 0 | [OK] |
| test | 5 structure conventions | 0 | [OK] |
| boot.yml | 3 entry conventions | 0 | [OK] |
| getMechanicRole.ts | 3 registration conventions | 0 | [OK] |

**divergences found:** 0
**issues fixed:** 0 (none required)

## what i'll remember

- brief section order: `.what` → `.why` → `.the rule` → `.pattern` → `.antipattern` → `.enforcement`
- hook header order: shebang → comment block (`.what`, `.why`, `guarantee`) → `set -euo pipefail`
- simpler hooks may omit `.how` section if no configuration
- guarantee format uses `✔` symbol with two-space indent
- test files define local `runHook` function per hook
