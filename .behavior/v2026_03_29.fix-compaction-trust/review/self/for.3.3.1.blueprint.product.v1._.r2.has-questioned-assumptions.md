# self-review r2: has-questioned-assumptions

## assumptions reviewed

### assumption.1: PostCompact hook event is available

**what we assumed:** Claude Code supports PostCompact hook type.

**evidence gathered:**
- verified via Claude Code documentation
- PostCompact is valid hook event
- fires after compaction completes
- receives `trigger` (manual|auto) and `compact_summary`
- supports command hooks

**why it holds:** documented and confirmed. no change needed.

---

### assumption.2: rhachet Role interface lacks onCompact

**what we assumed:** rhachet hooks.onBrain does not support onCompact.

**evidence gathered:**
- checked getMechanicRole.ts — only onBoot, onTool, onStop present
- no onCompact in Role interface

**why it holds:** rhachet doesn't abstract PostCompact. we register directly in settings.json.

---

### assumption.3: hook output goes to stdout

**what we assumed:** Claude Code hook stdout appears in context.

**evidence gathered:**
- sessionstart.notify-permissions.sh uses stdout
- howto.block-writes-via-hooks.md confirms stdout pattern
- verified by behavior of current hooks

**why it holds:** stdout is the correct channel for hook output visible to mechanic.

---

### assumption.4: brief location

**what we assumed:** brief should be in work.flow/diagnose/.

**evidence gathered:**
- wish says "location: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/`"
- wish does not specify subdirectory

**issue found:** we added diagnose/ subdirectory without wish instruction.

**how fixed:** updated blueprint to place brief in work.flow/ directly:
- `briefs/practices/work.flow/rule.require.trust-but-verify.md`

---

### assumption.5: boot.yml say section

**what we assumed:** brief should be in say section.

**evidence gathered:**
- wish done-when says "brief exists and is booted"
- "booted" implies visible content
- say = content visible; ref = path only

**why it holds:** for the brief to remind mechanic, content must be visible. say is correct.

---

### assumption.6: integration tests are sufficient

**what we assumed:** no unit tests needed.

**evidence gathered:**
- brief has no logic — just markdown
- hook has no logic — just cat and exit 0
- no domain behavior to unit test

**why it holds:** integration tests verify the behavior; no unit tests needed for static content.

---

## changes made

| assumption | verdict | action |
|------------|---------|--------|
| PostCompact exists | [HOLDS] | verified via docs |
| rhachet lacks onCompact | [HOLDS] | register in settings.json |
| stdout for output | [HOLDS] | confirmed |
| brief in diagnose/ | [FIXED] | moved to work.flow/ |
| say section | [HOLDS] | confirmed |
| integration tests only | [HOLDS] | no unit tests needed |

## what i'll remember

- verify external dependencies before design commits to them
- don't add structure (subdirectories) beyond what wish specifies
- simpler is better — work.flow/ directly, not work.flow/diagnose/
