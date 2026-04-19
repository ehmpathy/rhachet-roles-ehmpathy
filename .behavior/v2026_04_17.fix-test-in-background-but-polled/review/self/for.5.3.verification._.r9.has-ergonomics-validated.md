# self-review r9: has-ergonomics-validated (deeper reflection)

## the ergonomics question

ergonomics = "does it feel natural to the user?"

for this feature, the "user" is a clone (AI agent). let me think about what "natural" means for a clone.

## what a clone expects

when a clone's action is blocked, it expects:

1. **clear status** - did it fail or succeed?
2. **clear reason** - why was it blocked?
3. **clear path forward** - what should i do instead?

## analysis of the block message

```
🛑 BLOCKED: git.repo.test must run in foreground
```

**status:** `🛑 BLOCKED` is unambiguous. clone knows the action was rejected.

```
background + poll wastes tokens (2500+ vs 50 from curated output).
the skill is designed to minimize token consumption - foreground is required.
```

**reason:** explains the WHY. not just "you can't" but "here's why it's bad for you."

```
fix: remove run_in_background from your Bash tool call

instead of:
  Bash(command: 'rhx git.repo.test ...', run_in_background: true)

use:
  Bash(command: 'rhx git.repo.test ...')
```

**path forward:** concrete before/after example. clone can copy-paste the correct syntax.

## ergonomics vs vision

| vision said | implementation does | better? |
|-------------|---------------------|---------|
| "error: git.repo.test must run in foreground" | "BLOCKED: git.repo.test must run in foreground" | equivalent |
| "use Bash without run_in_background" | "fix: remove run_in_background" + example | better |

## why "better"

the implementation is more ergonomic because:

1. **`fix:` prefix** - clone knows this line is actionable
2. **before/after example** - no ambiguity about correct syntax
3. **quantified cost** - "2500+ vs 50" makes the tradeoff concrete

## does it feel natural?

for a clone, this message:
- stops the bad pattern ✓
- explains why it's bad ✓
- shows the correct pattern ✓
- provides exact syntax ✓

this is how good error messages should work. no confusion, immediate recovery.

## why it holds

the implemented ergonomics exceed what was planned. the message is clear, actionable, and educational.

## gaps found

none.
