# self-review r2: has-questioned-assumptions

## new evidence: "auto-background" behavior

the wisher shared a clone transcript. key observations:

1. clone was asked "why'd you run that in background?"
2. clone answered "that was a mistake" and tried to run foreground
3. output still showed background mode active
4. clone said "the harness is auto-backgrounded it"
5. clone then admitted they don't know why - "I didn't explicitly request background mode"

### what this reveals

**possible causes:**
- clone DID pass `run_in_background: true` (consciously or via habit)
- some harness behavior automatically backgrounds certain commands
- clone is confused about their own actions (hallucination)

**which is most likely?**

the output "active in background" in Claude Code only appears when `run_in_background: true` is passed to the Bash tool. there's no "auto-background" feature in the harness.

so: the clone likely passed the flag, then rationalized it as "auto-background" when questioned.

### revised assumption analysis

**assumption: clones consciously choose background mode**

original belief: clones explicitly decide to run in background

new evidence: some clones may not realize they request background

**what this means:**
- the problem might be "unconscious background use" not "deliberate background + poll"
- block at invocation time is still valid - whether conscious or not, background leads to poll
- error message must be extra clear to help confused clones understand

**verdict:** assumption revised but solution still holds. block background regardless of intent.

---

## assumption: there's no "auto-background" feature

**evidence needed:** check if any hook or config could auto-background commands

**investigation:** 
- the pre-approved permissions list includes `rhx git.repo.test`
- permissions don't control background - they control allow/deny
- Claude Code's Bash tool requires explicit `run_in_background: true`

**verdict:** holds. no auto-background exists. clone was confused about their own tool call.

---

## assumption: we need to block at the skill level

**alternative:** block at pre-tool hook level

**tradeoffs:**
- skill-level: skill can exit early with clear message
- hook-level: blocks before execution, but needs to parse Bash command

**new consideration from user evidence:**
- if clones don't realize they use background, hook feedback is better
- hook fires BEFORE execution, shows warn immediately
- clone sees "you tried background, that's not allowed" before wasted tokens

**verdict:** REVISED. pre-tool hook might be better than skill-level detection.

---

## summary of round 2

| assumption | r1 status | r2 status | change |
|------------|-----------|-----------|--------|
| clones consciously choose background | holds | revised | may be unconscious |
| auto-background exists | not examined | does not exist | confirmed |
| block at skill level | holds | questioned | hook may be better |

### key insight from wisher's evidence

the clone transcript shows confusion about their own behavior. this suggests:

1. clones may use `run_in_background` without clear intent
2. error feedback must be immediate and explicit
3. pre-tool hook enforcement may be cleaner than skill-level

this shapes execution approach but doesn't change vision: prevent background test execution.
