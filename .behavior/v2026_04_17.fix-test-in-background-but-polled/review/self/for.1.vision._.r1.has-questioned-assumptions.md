# self-review: has-questioned-assumptions

## assumption 1: clones that run background always poll afterward

**evidence:** wish says "they run in background... but then they proceed to poll"

**what if opposite true?** some clones might run background + wait for notification (correct pattern)

**did wisher say this?** yes, explicitly. described the observed pattern.

**counterexamples?** a well-trained clone might use background+notification correctly. but we cannot distinguish good from bad clones at invocation time.

**verdict:** assumption acknowledged. we block the good actors too - acceptable tradeoff for v1.

---

## assumption 2: poll wastes more tokens than foreground wait

**evidence:** 
- poll reads partial output multiple times (500 + 800 + 1200 = 2500 tokens)
- foreground reads curated output once (50 tokens)
- 50x difference

**what if opposite true?** impossible. poll always reads at least as much, usually more.

**did wisher say this?** yes, explicitly. "defeats the purpose of the skill"

**counterexamples?** none found. math is clear.

**verdict:** holds. not an assumption, it's a fact.

---

## assumption 3: the skill can detect background invocation

**evidence:** none yet - this is technical implementation detail

**what if opposite true?** we'd need a different approach (e.g., brief that tells clones not to)

**did wisher say this?** no, wisher asked "is there a way to block?"

**counterexamples?** skill runs in a subprocess. may not know if parent Bash call had `run_in_background: true`

**verdict:** ISSUE FOUND. we assumed we can detect background, but haven't verified.

**fix:** research needed. options:
1. skill checks if it's in background (if detectable)
2. pre-tool hook inspects Bash invocation before execution
3. brief instructs clones (weak enforcement)

---

## assumption 4: error message is sufficient to change behavior

**evidence:** UX best practice - clear error + alternative guides users

**what if opposite true?** clone might retry same action, or try workarounds

**did wisher say this?** no, this is our UX assumption

**counterexamples?** stubborn clones might ignore error and try variations

**verdict:** weak assumption, but acceptable. if clone ignores error, human will notice pattern.

---

## assumption 5: no legitimate use case for background tests

**evidence:** wish says "if they want to run a test, they should do it in the foreground"

**what if opposite true?** 
- very long test suites (30+ min) might warrant background + notification
- but: these are rare, and poll pattern wastes even more tokens for long tests

**did wisher say this?** yes, with "for now, hard rule"

**counterexamples?** multi-hour integration tests exist in some repos. but those likely have dedicated CI, not clone-driven runs.

**verdict:** holds for this context. can revisit later.

---

## summary

| assumption | status | resolution |
|------------|--------|------------|
| clones poll after background | acknowledged | block good actors too, acceptable |
| poll wastes more tokens | holds | math is clear |
| can detect background | **ISSUE** | need to research implementation |
| error message sufficient | holds | weak but acceptable |
| no legitimate background use | holds | for now, revisit later |

### issue found: detection mechanism

we assumed we can detect background invocation but haven't verified. before we proceed to execution, we must research:

1. can a shell command detect if it's run in background?
2. can a pre-tool hook inspect `run_in_background` flag?
3. what's the enforcement mechanism?

this is research for the execution phase, not a blocker for vision. the vision is valid - we want to prevent background. HOW we detect it is implementation.
