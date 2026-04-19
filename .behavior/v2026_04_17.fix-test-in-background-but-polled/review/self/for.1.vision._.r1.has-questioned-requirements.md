# self-review: has-questioned-requirements

## requirement 1: block all background test execution

**who said this?** the wish author, today.

**evidence:** observed pattern of clones that run background + poll, which wastes tokens.

**what if we didn't?** clones continue the wasteful pattern, consume 50x more tokens than designed.

**is scope right?** 
- could argue it's too broad: we block all background, but the real problem is poll
- but: we cannot detect "will this clone poll afterward?" at invocation time
- block the precondition (background) to prevent the symptom (poll)

**simpler way?** 
- alternative: let background run, but return no output file to poll
- problem: clones might still try, waste tokens on failed reads
- current approach: fail fast with clear message

**verdict:** holds. blunt but effective. prevents the token-waste pattern entirely.

---

## requirement 2: foreground execution is acceptable

**who said this?** implicit assumption in the wish.

**evidence:** most test suites complete in seconds to low minutes.

**what if wrong?** 
- long tests (10+ min) would block the conversation
- but: poll loops for 10 min would consume far more tokens than a wait

**is scope right?** yes. even slow tests benefit from curated output vs raw log poll.

**simpler way?** this is already the simple path.

**verdict:** holds. foreground wait is always cheaper than background + poll.

---

## requirement 3: error message guides correct behavior

**who said this?** vision author (me).

**evidence:** good UX practice - when you block an action, explain the alternative.

**what if wrong?** clone retries the same action, gets blocked repeatedly.

**is scope right?** minimal - just one clear sentence.

**verdict:** holds. essential for the pattern to work.

---

## requirement 4: no escape hatch for "power users"

**who said this?** implied by "hard rule" in wish.

**evidence:** wish says "for now, hard rule. in the future, maybe we revisit."

**what if we didn't?** escape hatch could be abused, which defeats the purpose.

**is scope right?** correct for v1. can add escape hatch later if legitimate use cases emerge.

**simpler way?** no escape hatch is simpler than conditional escape.

**verdict:** holds. keep it simple for now.

---

## summary

all requirements questioned. all hold:

| requirement | status | reason |
|-------------|--------|--------|
| block background | holds | prevents precondition of wasteful pattern |
| foreground acceptable | holds | always cheaper than poll loop |
| clear error message | holds | essential for UX |
| no escape hatch | holds | simpler, revisit later if needed |

no issues found. the vision is sound.
