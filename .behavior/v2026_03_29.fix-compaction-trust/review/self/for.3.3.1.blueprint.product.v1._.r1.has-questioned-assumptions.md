# self-review r1: has-questioned-assumptions

## assumptions review

### assumption.1: PostCompact hook event is available

**what do we assume?**
- Claude Code supports `PostCompact` hook type
- hooks can register for this event and receive it

**evidence:**
- vision.md states "PostCompact hook (available in Claude Code v2.1.79+)"
- research.internal.product.code.prod._.v1.i1.md notes: "PostCompact not in rhachet Role interface"

**what if opposite were true?**
- if PostCompact doesn't exist: hook cannot fire on compaction
- we'd need alternative: SessionStart with compaction detection via stdin

**investigation result:**
- verified via Claude Code documentation
- PostCompact is a valid hook event type
- fires after compaction completes, receives `trigger` (manual|auto) and `compact_summary`
- supports command and HTTP hooks

**verdict:** [HOLDS] — PostCompact is verified as valid Claude Code hook event

---

### assumption.2: rhachet Role interface lacks onCompact

**what do we assume?**
- rhachet `hooks.onBrain` does not support `onCompact` type
- we need direct settings.json registration

**evidence:**
- research.internal.product.code.prod._.v1.i1.md states: "no `onCompact` type in rhachet Role interface"
- getMechanicRole.ts shows only `onBoot`, `onTool`, `onStop`

**what if opposite were true?**
- if rhachet supported onCompact: we'd register via getMechanicRole.ts
- simpler, consistent with other hooks

**verification:**
- checked getMechanicRole.ts — no onCompact support
- assumption holds

**verdict:** [HOLDS] — rhachet lacks onCompact, need settings.json registration

---

### assumption.3: hook output goes to stdout

**what do we assume?**
- Claude Code hook stdout appears in context
- the mechanic will see the reminder

**evidence:**
- sessionstart.notify-permissions.sh uses stdout for output
- brief howto.block-writes-via-hooks.md confirms "output to stdout"

**what if opposite were true?**
- if stdout not visible: reminder would be silent
- would need stderr or different mechanism

**verification:**
- checked sessionstart.notify-permissions.sh — uses stdout
- checked howto.block-writes-via-hooks.md — confirms stdout pattern

**verdict:** [HOLDS] — stdout is correct for hook output

---

### assumption.4: brief location in diagnose/ subdirectory

**what do we assume?**
- `work.flow/diagnose/` is correct location for trust-but-verify brief

**evidence:**
- research says: "place in diagnose/ — trust-but-verify is about root cause verification before action"
- wish says: "location: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/`"
- wish doesn't specify subdirectory

**what if different location?**
- could be top-level in work.flow/
- could be new verify/ subdirectory

**analysis:**
- diagnose/ contains: bisect, logservation, test-covered-repairs
- trust-but-verify is about verification before diagnosis
- could argue it's pre-diagnosis, not diagnosis itself

**simpler approach:**
- place directly in work.flow/ (no subdirectory assumption)
- OR keep diagnose/ since verification is part of diagnosis workflow

**verdict:** [SIMPLIFY] — place in work.flow/ directly, not diagnose/. wish didn't specify subdirectory.

---

### assumption.5: boot.yml say section is correct

**what do we assume?**
- brief should be in `say` section so content is visible at boot

**evidence:**
- wish done-when: "brief exists and is booted with mechanic role"
- "booted" implies visible, not just referenced
- brief is short enough for say section

**what if ref section?**
- if ref: mechanic would have to explicitly read it
- defeats purpose of reminder

**verification:**
- say = content visible in context
- ref = only referenced, must be read
- for a rule brief, say is appropriate

**verdict:** [HOLDS] — say section is correct

---

### assumption.6: integration tests are sufficient

**what do we assume?**
- brief integration test: verify brief appears in boot output
- hook integration test: verify hook emits output and exits 0

**what if unit tests needed?**
- brief has no logic — no unit tests needed
- hook has no logic — just cat and exit 0

**simpler approach:**
- integration tests are sufficient
- no domain logic to unit test

**verdict:** [HOLDS] — integration tests are sufficient for this scope

---

## changes made

### issue.1: brief location assumption

**what was wrong:**
blueprint specified `work.flow/diagnose/` but wish only said `work.flow/`.

**how fixed:**
update blueprint to place brief in `work.flow/` directly:
- `briefs/practices/work.flow/rule.require.trust-but-verify.md`

this is simpler and aligns with wish.

---

### issue.2: PostCompact verified

**what was assumed:**
PostCompact is a real Claude Code hook event.

**verification result:**
confirmed via Claude Code documentation:
- PostCompact is valid hook event
- fires after compaction completes
- receives `trigger` (manual|auto) and `compact_summary`
- supports command hooks

no changes needed — assumption holds.

---

## what i'll remember

- assumptions without evidence should be flagged
- simpler is better — don't add subdirectory unless wish specifies
- verify external dependencies (Claude Code hook types) before design commits to them
