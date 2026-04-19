# self-review: has-questioned-questions

triaged open questions from vision:

## question 1: are there legitimate reasons a clone might need background test execution?

**triage:** [answered]

**answer:** no. the evidence shows:
- background + notification (correct pattern) is blocked, but that's acceptable
- background + poll (observed pattern) is always worse than foreground
- if tests are so long they warrant background, they belong in CI

---

## question 2: should we provide an escape hatch for power users?

**triage:** [answered]

**answer:** no, not for v1. the wish says "hard rule, for now."

rationale:
- escape hatches get abused
- simpler to enforce uniformly
- revisit if legitimate use cases emerge

---

## question 3: what's the maximum acceptable test runtime before foreground feels painful?

**triage:** [answered]

**answer:** not relevant. foreground is always preferable to background + poll.

even for 30-minute test suite:
- foreground: wait 30 min, get 50-token summary
- background + poll: check every 2 min = 15 reads = 15x output tokens

---

## question 4: how does Claude Code handle long-term foreground commands?

**triage:** [research]

**for research phase:** 
- what's the timeout for Bash commands?
- does Claude Code have a default timeout that kills long processes?

---

## question 5: can we detect background invocation reliably at skill level?

**triage:** [research]

**for research phase:**
- can a subprocess detect if parent was backgrounded?
- can we check process group, tty, etc?

**alternative found in r2:**
- pre-tool hook can inspect `run_in_background` parameter BEFORE execution
- this may be cleaner than skill-level detection

---

## question 6: what enforcement mechanism should we use?

**triage:** [research]

**for research phase:** 
- pre-tool hook that blocks `run_in_background: true` for `rhx git.repo.test`
- skill-level detection that exits early
- which is more reliable?

---

## summary

| question | triage | resolution |
|----------|--------|------------|
| legitimate background use cases | answered | none for v1 |
| escape hatch | answered | no, keep simple |
| max runtime concern | answered | not relevant |
| Claude Code timeout | research | investigate in research phase |
| detect background at skill | research | or use pre-tool hook |
| enforcement mechanism | research | compare hook vs skill |

## update to vision

need to update vision "open questions" section with triage markers.
