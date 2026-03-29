# self-review: has-questioned-assumptions

## assumption 1: safety heuristics are the cause

### what do we assume here without evidence?

we assume the prompts are caused by claude code's "bash safety heuristics" that detect shell metacharacters like `{`, `}`, `(`, `)`.

### what evidence supports this?

- research brief lists these as known triggers
- websearch confirms patterns that trigger prompts
- the example command contains these characters

### what if the opposite were true?

if heuristics aren't the cause, maybe:
- the allowlist pattern doesn't match correctly
- there's a different permission check we missed
- the prompt is from a different system entirely

### verdict: partially validated

we have research evidence, but haven't tested with actual prompts. **should verify the exact prompt message** to confirm heuristics are the cause.

---

## assumption 2: hooks run before heuristic checks

### what do we assume here without evidence?

we assume PreToolUse hooks can intercept and override the safety heuristic prompts.

### what evidence supports this?

- hook docs say they run "before tool execution"
- `permissionDecision: allow` is documented

### what if the opposite were true?

if heuristics run *before* hooks, then:
- hooks can't prevent the prompt
- the entire approach fails
- we'd need to change the command format instead

### did the wisher actually say this?

**no.** the wisher asked "what are our options?" — we inferred the hook approach as a solution.

### verdict: issue found

**we assumed hook order without verification.** must test whether hooks can actually preempt heuristic prompts.

---

## assumption 3: `permissionDecision: allow` bypasses heuristics

### what do we assume here without evidence?

we assume `permissionDecision: allow` bypasses not just permission checks but also safety heuristic prompts.

### what evidence supports this?

- docs mention `permissionDecision` can "allow" tool execution
- but docs don't explicitly say it bypasses *all* prompt types

### what exceptions extant?

github issues suggest the permission system has layers:
- allowlist checks
- safety heuristic checks
- hook decisions

these may be independent systems. `permissionDecision: allow` may only affect one layer.

### verdict: issue found

**we conflated permission system with heuristic system.** they may be separate. need to verify `allow` affects heuristics specifically.

---

## assumption 4: sedreplace is the only affected skill

### what do we assume here without evidence?

we focused on sedreplace, but the wish might affect other skills too.

### what if the opposite were true?

if many skills are affected:
- the solution scope should be broader
- or we should solve at a different layer

### did the wisher actually say this?

the wisher mentioned sedreplace specifically, but said "rhx run skill" in general terms.

### verdict: needs clarification

**ask wisher**: is this sedreplace-specific, or does it affect all rhx skills with special characters in arguments?

---

## assumption 5: the prompt is about arguments, not the command itself

### what do we assume here without evidence?

we assume the prompt is triggered by *argument content* (the `{...}` pattern), not by an aspect of the sedreplace command itself.

### what evidence supports this?

- the allowlist has `Bash(npx rhachet run --skill sedreplace:*)` which should match
- if the command itself were blocked, simpler commands would fail too

### what if the opposite were true?

if it's the command, not the arguments, then:
- stdin/env var approaches won't help
- we'd need different allowlist patterns

### verdict: should verify

**test**: does a simple sedreplace without special chars run without prompts?

---

## summary of hidden assumptions

| assumption | status | action |
|------------|--------|--------|
| heuristics cause the prompt | partially validated | verify prompt message |
| hooks run before heuristics | unverified | test hook order |
| `allow` bypasses heuristics | unverified | test specifically |
| only sedreplace affected | unclear | ask wisher |
| arguments trigger it, not command | likely | test simple case |

## questions for wisher

1. is this only sedreplace, or all rhx skills with special chars?
2. what exact prompt message do you see? (to confirm cause)
3. do simple sedreplace commands (no special chars) work without prompts?

---

*several core assumptions are unverified. the vision may be built on sand.*
