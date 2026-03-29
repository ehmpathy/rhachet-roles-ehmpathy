# self-review r3: has-consistent-mechanisms

## consistency check: do new mechanisms duplicate extant functionality?

### artifact 1: brief `rule.require.trust-but-verify.md`

**question:** does this brief duplicate extant briefs?

**research:**
- searched `src/domain.roles/mechanic/briefs/practices/work.flow/` for similar patterns
- found `diagnose/rule.require.test-covered-repairs.md` — teaches repair patterns
- found `diagnose/howto.bisect.[lesson].md` — teaches diagnosis via bisection

**analysis:**
- `test-covered-repairs` teaches: every fix needs a test
- `trust-but-verify` teaches: verify claims before you act
- these are distinct concerns — one is about tests, one is about verification
- no duplicate detected

**why it holds:**
- `test-covered-repairs` operates post-diagnosis (after you know the problem)
- `trust-but-verify` operates pre-diagnosis (before you act on inherited claims)
- they address different stages of the work flow

**verdict:** [OK] distinct purpose, not a duplicate

---

### artifact 2: hook `postcompact.trust-but-verify.sh`

**question:** does this hook duplicate extant hooks?

**research:**
- listed `src/domain.roles/mechanic/inits/claude.hooks/`:
  - `postooluse.check-remote-boundary-crossings.sh`
  - `pretooluse.check-permissions.sh`
  - `pretooluse.check-remote-boundaries.sh`
  - `sessionstart.notify-permissions.sh`

**analysis:**
- no extant hook listens to `PostCompact` event
- `sessionstart.notify-permissions.sh` fires on session start, not after compaction
- this is a new event type (PostCompact) with no extant handler

**why it holds:**
- PostCompact is a distinct event from SessionStart
- the reminder content (verify claims) is not emitted by any extant hook
- hook serves a unique purpose: warn about stale inherited claims

**verdict:** [OK] new event type, not a duplicate

---

### artifact 3: boot.yml registration

**question:** does this registration duplicate extant entries?

**research:**
- searched boot.yml for similar brief paths
- no extant entry for `rule.require.trust-but-verify.md`
- entry follows extant pattern: `- briefs/practices/work.flow/{name}.md`

**why it holds:**
- registration is additive (one new line)
- no extant line was duplicated
- follows the extant registration pattern

**verdict:** [OK] additive, not a duplicate

---

### artifact 4: hook registration in getMechanicRole.ts

**question:** does this registration duplicate extant hook registrations?

**research:**
- examined extant hooks in `hooks.onBrain.onBoot` array
- no extant hook uses `filter: { what: 'PostCompact' }`
- extant hooks filter on: Bash, Write, Edit, SessionStart

**why it holds:**
- filter `{ what: 'PostCompact' }` is unique — no other hook uses this filter
- registration follows extant pattern for hook entries
- timeout of PT30S is consistent with other hooks (PT5S to PT60S range)

**verdict:** [OK] unique filter, not a duplicate

---

### artifact 5: integration test

**question:** does this test duplicate extant test patterns?

**research:**
- examined `pretooluse.check-permissions.integration.test.ts` as extant pattern
- both use: spawnSync, given/when/then from test-fns, runHook function

**analysis:**
- test structure follows extant pattern (reuse, not duplicate)
- test content is unique (tests PostCompact behavior)
- no duplicate test coverage detected

**why it holds:**
- reuse of test pattern is intentional (consistency)
- test assertions are unique to the new hook behavior
- no extant test covers PostCompact hooks

**verdict:** [OK] reuses pattern, does not duplicate coverage

---

## summary

| artifact | duplicates extant? | verdict |
|----------|-------------------|---------|
| brief | no — distinct purpose from test-covered-repairs | [OK] |
| hook | no — new event type (PostCompact) | [OK] |
| boot.yml | no — additive entry | [OK] |
| getMechanicRole.ts | no — unique filter | [OK] |
| test | no — unique coverage | [OK] |

**new utilities created:** 0
**extant patterns reused:** 3 (brief structure, hook structure, test structure)
**duplicates found:** 0

## what i'll remember

- before i create new artifacts, search for extant mechanisms that serve similar purposes
- to reuse patterns (structure, format) is good — it's consistency, not duplication
- duplication means same functionality; same structure with different content is not duplication
