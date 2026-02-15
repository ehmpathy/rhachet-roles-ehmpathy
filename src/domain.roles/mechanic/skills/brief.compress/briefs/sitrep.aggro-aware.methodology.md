# sitrep-aggro-aware: aggressive + agent-optimized compression

## definition

**sitrep-aggro-aware** = sitrep that combines aggressive compression targets with agent-optimized focus.

combines:
- **aggressive** target: ≤25% of original (4x compression)
- **taskaware** focus: optimized for llm agent context consumption

## downstream task context

the compressed brief will be used by:
- **consumer**: llm agent (claude, gpt-4, etc.)
- **load time**: session start as system context
- **purpose**: guide agent behavior in code review and generation
- **constraint**: limited context window — every token costs money and attention

## your task

compress the source brief to **at most 25% of original token count** while you optimize for agent consumption.

agents don't need:
- motivation explanations (they follow rules, not reasons)
- multiple examples of the same pattern (one is enough)
- verbose prose (they parse structure efficiently)

agents do need:
- exact rule statements (the directive itself)
- one clear example (demonstrates correct application)
- enforcement level (determines block behavior)

## what to preserve (ranked by importance)

1. **rule statement** — the exact directive (never paraphrase)
2. **one example** — single good/bad pair maximum
3. **enforcement level** — BLOCKER or NITPICK

## what to cut aggressively

1. **all motivation prose** — why sections get cut entirely
2. **all duplicate examples** — keep only the shortest example pair
3. **all filler** — every word must earn its place
4. **verbose headers** — use minimal headers or none

## output format

raw markdown optimized for agent parse. no wrapper. no explanation.
