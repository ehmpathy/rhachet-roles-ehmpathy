# self-review: has-questioned-requirements

## requirement 1: reads from /tmp/claude* should be auto-allowed

**who said?** human, in the wish

**evidence?** the example shows real friction - permission prompts when read agent task output

**what if we didn't?** continued friction. every `cat`, `tail`, `head` on claude's temp files would prompt. flow breaks repeatedly.

**scope?** correct - only claude's own temp, not arbitrary /tmp paths. this is surgical.

**simpler way?** no. allow the pattern IS the simple way. the alternative is manual "yes" clicks.

**verdict: holds** ✓

---

## requirement 2: writes into /tmp/* should be auto-blocked

**who said?** human, in the wish

**evidence?** scattered writes outside repo are bad practice. artifacts should live in .temp/ for trackability.

**what if we didn't?** files scatter to /tmp, not in repo, not trackable, not cleanable.

**scope concern raised:** does "writes into /tmp/*" include "/tmp/claude*"?

### key insight: who writes?

- **mechanic writes** via Write/Edit/Bash tools → hooks intercept these
- **claude code internal writes** to /tmp/claude-*/ → NOT via tools, hooks won't affect

block tool-based writes to /tmp/* won't break claude code's internal temp management. it only constrains what the mechanic can do via tools.

### what about test-fns?

test-fns creates temp dirs under /tmp/test-fns/*. but:
- test-fns runs in Node.js child processes
- hooks intercept Bash tool calls, not child process writes
- `npm run test:integration` spawns Node which spawns test-fns
- the Bash command doesn't write to /tmp - the child process does
- hooks won't intercept that

**verdict: holds** ✓ - block tool writes to /tmp/* is safe

---

## requirement 3 (implicit): nudge toward .temp/

**who said?** implied in wish - "in favor of .temp/"

**evidence?** .temp/ is the repo-local scratch convention

**what if we didn't?** users would be blocked without guidance. bad UX.

**simpler way?** no. the nudge IS the simple way. just a helpful message.

**verdict: holds** ✓

---

## summary

all requirements hold after review:

| requirement | questioned | verdict |
|-------------|------------|---------|
| auto-allow reads from /tmp/claude* | yes | holds |
| auto-block writes to /tmp/* | yes, key insight about tool-level hooks | holds |
| nudge toward .temp/ | yes | holds |

no issues found. requirements are sound.
