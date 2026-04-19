# self-review r3: has-questioned-questions

re-examined all open questions with fresh perspective.

## answered questions - why they hold

### 1. legitimate background use cases?

**answer:** none for v1

**why it holds:**
- the wish explicitly says "hard rule, for now"
- background + poll is the observed problem pattern
- background + notification (correct pattern) is blocked too, but acceptable loss
- if tests warrant background, they belong in CI

no counterexample found. answer holds.

### 2. escape hatch for power users?

**answer:** no, keep simple

**why it holds:**
- escape hatches get abused
- "power user" is self-declared, not verifiable
- uniform enforcement is simpler to maintain
- wish explicitly permits revisit later

no counterexample found. answer holds.

### 3. max runtime concern?

**answer:** not relevant

**why it holds:**

math is unambiguous:
- 30 min test, foreground: wait 30 min, receive 50 tokens
- 30 min test, background + poll every 2 min: 15 reads x ~200 tokens = 3000 tokens

foreground is always cheaper. runtime length doesn't change this.

no counterexample found. answer holds.

## research questions - why they require research

### 4. Claude Code timeout behavior?

**why research needed:**
- can't answer via logic - this is implementation detail of Claude Code
- affects whether very long tests are viable in foreground
- but: even with timeout, foreground is still better than poll

**what to investigate:**
- default Bash timeout in Claude Code
- whether it's configurable

### 5. detect background at skill level?

**why research needed:**
- requires inspection of Claude Code tool behavior
- need to understand: when `run_in_background: true`, what does subprocess see?
- alternative found: pre-tool hook can inspect before execution

**what to investigate:**
- pre-tool hook input schema - does it include `run_in_background`?
- if yes, hook-based enforcement is cleaner

### 6. enforcement mechanism?

**why research needed:**
- depends on answers to q4 and q5
- need to compare: hook vs skill-level

**options:**
1. pre-tool hook blocks Bash calls with `run_in_background: true` for `rhx git.repo.test`
2. skill detects background and exits with error
3. both (belt and suspenders)

## summary

all questions properly triaged:

| question | status | confidence |
|----------|--------|------------|
| legitimate use cases | [answered] | high |
| escape hatch | [answered] | high |
| max runtime | [answered] | high - math is clear |
| timeout behavior | [research] | requires external knowledge |
| detect background | [research] | requires code inspection |
| enforcement | [research] | depends on above |

vision updated with triage table. ready to proceed.
