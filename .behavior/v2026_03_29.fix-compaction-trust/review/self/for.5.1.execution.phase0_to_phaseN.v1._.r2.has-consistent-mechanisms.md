# self-review r2: has-consistent-mechanisms

## mechanism consistency review

### mechanism 1: brief structure

**examined:** `rule.require.trust-but-verify.md` (lines 1-93)

**extant pattern:** `rule.require.test-covered-repairs.md` in same directory

**comparison:**

| section | extant brief | new brief |
|---------|-------------|-----------|
| .what | line 3 | line 3 |
| .why | line 7 | line 7 |
| .the rule | line 19 (table) | line 23 (table) |
| .pattern | line 31 (code) | line 33 (code) |
| .antipattern | line 55 | line 43 |
| .enforcement | line 83 | line 89 |

**why it holds:**
- both briefs use same section structure
- both use tables for rule exposition
- both use code blocks for patterns
- new brief adds `.mantra` and `.verification examples` — extensions, not divergences

**verdict:** [OK] follows extant brief pattern

---

### mechanism 2: hook structure

**examined:** `postcompact.trust-but-verify.sh` (lines 1-35)

**extant pattern:** `sessionstart.notify-permissions.sh` (lines 1-24 header)

**comparison:**

| element | extant hook | new hook |
|---------|------------|----------|
| shebang | `#!/usr/bin/env bash` | `#!/usr/bin/env bash` |
| .what comment | line 3 | line 3 |
| .why comment | lines 5-11 | lines 5-7 |
| guarantee comment | lines 20-22 | lines 12-14 |
| set -euo pipefail | line 26 | line 17 |

**why it holds:**
- same header structure: .what, .why, guarantee
- same bash options
- new hook simpler (no logic, just emit) — appropriate for informational hook

**verdict:** [OK] follows extant hook pattern

---

### mechanism 3: boot.yml registration

**examined:** line 206 in boot.yml

**extant pattern:** all briefs in `subject.flow.briefs.say` section use same format:
```yaml
- briefs/practices/work.flow/{subdir/}rule.*.md
```

**why it holds:**
- new entry: `- briefs/practices/work.flow/rule.require.trust-but-verify.md`
- follows exact pattern
- placed in correct section (subject.flow, not subject.code.prod or subject.code.test)

**verdict:** [OK] follows extant boot.yml pattern

---

### mechanism 4: hook registration

**examined:** lines 43-47 in getMechanicRole.ts

**extant pattern:** all hooks in `hooks.onBrain.onBoot` use same structure:
```typescript
{
  command: './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init ...',
  timeout: 'PT...S',
  filter?: { what: '...' },
}
```

**why it holds:**
- command follows exact format with `--init claude.hooks/postcompact.trust-but-verify`
- timeout `PT30S` matches other hooks (sessionstart uses PT5S, boot uses PT60S — 30S is reasonable middle)
- filter `{ what: 'PostCompact' }` follows pattern of `{ what: 'Bash', when: 'before' }` etc.

**verdict:** [OK] follows extant hook registration pattern

---

### mechanism 5: integration test

**examined:** `postcompact.trust-but-verify.integration.test.ts`

**extant pattern:** `pretooluse.check-permissions.integration.test.ts`

**comparison:**

| element | extant test | new test |
|---------|------------|----------|
| imports | spawnSync, path, test-fns | spawnSync, path, test-fns |
| describe block | executable name | executable name |
| runHook helper | yes | yes |
| given/when/then | yes | yes |

**why it holds:**
- same test structure
- same helper pattern (runHook function)
- uses same test-fns imports
- simpler test (no settings.json setup) — appropriate since hook has no config

**verdict:** [OK] follows extant integration test pattern

---

## summary

| mechanism | extant pattern | follows? | verdict |
|-----------|---------------|----------|---------|
| brief structure | rule.require.test-covered-repairs.md | yes | [OK] |
| hook structure | sessionstart.notify-permissions.sh | yes | [OK] |
| boot.yml format | subject.flow.briefs.say entries | yes | [OK] |
| hook registration | hooks.onBrain.onBoot entries | yes | [OK] |
| test structure | pretooluse.*.integration.test.ts | yes | [OK] |

**duplicated mechanisms found:** 0
**new utilities created:** 0

## what i'll remember

- briefs use .what/.why/.the rule/.pattern/.antipattern/.enforcement structure
- hooks use .what/.why/guarantee header comments
- boot.yml entries follow `briefs/practices/{topic}/{rule}.md` pattern
- hook registration uses rhachet run --init pattern with filter object
