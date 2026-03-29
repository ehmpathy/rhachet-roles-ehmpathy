# self-review r2: has-pruned-backcompat

## backwards compatibility review

### examined files

1. `src/domain.roles/mechanic/briefs/practices/work.flow/rule.require.trust-but-verify.md` (93 lines)
2. `src/domain.roles/mechanic/inits/claude.hooks/postcompact.trust-but-verify.sh` (35 lines)
3. `src/domain.roles/mechanic/boot.yml` (line 206 added)
4. `src/domain.roles/mechanic/getMechanicRole.ts` (lines 43-47 added)

---

### component 1: brief

**file:** `rule.require.trust-but-verify.md`

**backwards compat check:**
- new file at `work.flow/rule.require.trust-but-verify.md`
- no extant file at this path
- no rename of extant file
- no deprecation shim needed

**why it holds:**
- `ls src/domain.roles/mechanic/briefs/practices/work.flow/` shows only `diagnose/`, `refactor/`, `release/`, `tools/` — no extant brief at root level with similar name
- this is a new addition, not a replacement

**verdict:** [OK] no backcompat concern — purely additive

---

### component 2: hook

**file:** `postcompact.trust-but-verify.sh`

**backwards compat check:**
- new file at `claude.hooks/postcompact.trust-but-verify.sh`
- no extant PostCompact hooks
- checked: `ls src/domain.roles/mechanic/inits/claude.hooks/` shows `postool*.sh`, `pretooluse*.sh`, `sessionstart*.sh` — no `postcompact*.sh`

**why it holds:**
- PostCompact is a new event type (Claude Code v2.1.79+)
- no extant mechanic hooks listen to PostCompact
- this hook does not modify or shadow extant hooks

**verdict:** [OK] no backcompat concern — new event type

---

### component 3: boot.yml

**change:** added line 206: `- briefs/practices/work.flow/rule.require.trust-but-verify.md`

**backwards compat check:**
- inserted into `subject.flow.briefs.say` section
- no lines removed
- no reorder of extant briefs

**examined diff:**
```diff
+      - briefs/practices/work.flow/rule.require.trust-but-verify.md
       - briefs/practices/work.flow/diagnose/rule.require.test-covered-repairs.md
```

**why it holds:**
- prepend to list does not remove or reorder extant entries
- boot order is not significant for say briefs (all are loaded)
- no extant consumer depends on brief order

**verdict:** [OK] additive insertion

---

### component 4: getMechanicRole.ts

**change:** added hook registration at lines 43-47

**examined diff:**
```typescript
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/postcompact.trust-but-verify',
          timeout: 'PT30S',
          filter: { what: 'PostCompact' },
        },
```

**backwards compat check:**
- appended to `hooks.onBrain.onBoot` array
- no extant hooks removed
- no extant hooks reordered
- filter `{ what: 'PostCompact' }` is unique — no other hook uses this filter

**why it holds:**
- array append does not affect extant entries
- PostCompact filter does not overlap with extant SessionStart hooks
- timeout is reasonable (30s) and does not block session

**verdict:** [OK] additive append with unique filter

---

## summary

| artifact | change type | backcompat concern | verdict |
|----------|-------------|-------------------|---------|
| brief | new file | none | [OK] |
| hook | new file | none | [OK] |
| boot.yml | line insert | none | [OK] |
| getMechanicRole.ts | array append | none | [OK] |

**backwards compat shims added:** 0
**assumed-to-be-safe patterns:** 0

## what i'll remember

- PostCompact is a new event — no extant hooks to conflict with
- array appends and line inserts are safe additive changes
- verify no extant files share the name before you conclude "new file"
