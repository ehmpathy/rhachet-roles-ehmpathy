# self-review r3: has-consistent-conventions

## convention check: do new artifacts follow extant name patterns?

### artifact 1: brief filename

**file:** `rule.require.trust-but-verify.md`

**extant pattern in work.flow/:**
- `diagnose/rule.require.test-covered-repairs.md`
- `diagnose/howto.bisect.[lesson].md`
- `refactor/rule.prefer.sedreplace-for-renames.md`
- `release/rule.require.commit-scopes.md`

**analysis:**
- prefix: `rule.require.` — matches extant pattern for rules
- terms: `trust-but-verify` — uses kebab-case as extant
- location: `work.flow/` root — placement at root level, not in subdirectory

**why it holds:**
- `rule.require.{name}.md` is the extant pattern for required rules
- `rule.prefer.{name}.md` is for preferences — this is a requirement, not preference
- kebab-case matches all extant brief names

**verdict:** [OK] follows extant brief name convention

---

### artifact 2: hook filename

**file:** `postcompact.trust-but-verify.sh`

**extant pattern in claude.hooks/:**
- `postooluse.check-remote-boundary-crossings.sh`
- `pretooluse.check-permissions.sh`
- `pretooluse.check-remote-boundaries.sh`
- `sessionstart.notify-permissions.sh`

**analysis:**
- prefix: `postcompact.` — follows `{event}.{purpose}` pattern
- suffix: `.sh` — matches extant executables
- terms: `trust-but-verify` — uses kebab-case as extant

**why it holds:**
- `{event}.{purpose}.sh` is the extant pattern (e.g., `sessionstart.notify-permissions`)
- `postcompact` is the correct event name for PostCompact hooks
- purpose `trust-but-verify` matches the brief it supports

**verdict:** [OK] follows extant hook name convention

---

### artifact 3: test filename

**file:** `postcompact.trust-but-verify.integration.test.ts`

**extant pattern:**
- `pretooluse.check-permissions.integration.test.ts`

**analysis:**
- pattern: `{hookname}.integration.test.ts`
- matches exactly

**why it holds:**
- hook name as base: `postcompact.trust-but-verify`
- suffix: `.integration.test.ts` for integration tests
- follows the extant pattern precisely

**verdict:** [OK] follows extant test name convention

---

### artifact 4: brief sections

**sections in new brief:**
- `.what`, `.why`, `.the rule`, `.pattern`, `.antipattern`, `.mantra`, `.verification examples`, `.enforcement`

**extant pattern from `rule.require.test-covered-repairs.md`:**
- `.what`, `.why`, `.the rule`, `.pattern`, `.antipattern`, `.benefits`, `.enforcement`

**analysis:**
- core sections match: `.what`, `.why`, `.the rule`, `.pattern`, `.antipattern`, `.enforcement`
- new sections: `.mantra`, `.verification examples`
- these are extensions, not divergences

**why it holds:**
- `.mantra` adds a memorable phrase — not found in extant briefs but does not conflict
- `.verification examples` provides actionable guidance — appropriate for this brief's purpose
- both are additive, not replacement of extant sections

**verdict:** [OK] extends extant sections, does not diverge

---

### artifact 5: hook header comments

**new hook header:**
```bash
# .what = remind mechanic to verify claims after compaction
# .why  = compaction summaries may contain stale conclusions.
# guarantee:
#   - informational only: emits reminder to stdout
#   - allows continuation: always exits 0
```

**extant pattern from `sessionstart.notify-permissions.sh`:**
```bash
# .what = ...
# .why  = ...
# guarantee:
#   - ...
```

**analysis:**
- `.what`, `.why`, `guarantee` — matches extant pattern
- bullet format under guarantee — matches extant pattern

**why it holds:**
- same structure as extant hooks
- same comment style (lowercase, concise)

**verdict:** [OK] follows extant hook header convention

---

## summary

| artifact | convention | follows? | verdict |
|----------|------------|----------|---------|
| brief filename | `rule.require.{name}.md` | yes | [OK] |
| hook filename | `{event}.{purpose}.sh` | yes | [OK] |
| test filename | `{hook}.integration.test.ts` | yes | [OK] |
| brief sections | `.what/.why/.the rule/...` | yes + extensions | [OK] |
| hook header | `.what/.why/guarantee` | yes | [OK] |

**divergences found:** 0
**extensions made:** 2 (`.mantra`, `.verification examples` in brief)

## what i'll remember

- brief names follow `rule.require.{kebab-case}.md` pattern
- hook names follow `{event}.{purpose}.sh` pattern
- hook headers use `.what`, `.why`, `guarantee` structure
- extensions (new sections) are acceptable; divergences (different patterns) are not
