# sitrep-taskaware: context-optimized compression

## definition

**sitrep-taskaware** = sitrep optimized for agent context window consumption.

the compressed output will be loaded into an llm agent's context at session start. the agent must be able to follow the rules without the verbose explanations.

## downstream task context

the compressed brief will be used by:
- **consumer**: llm agent (claude, gpt-4, etc.)
- **load time**: session start as system context
- **purpose**: guide agent behavior in code review and generation
- **constraint**: limited context window — every token costs money and attention

## compression principles for agent consumption

agents don't need:
- motivation explanations (they follow rules, not reasons)
- multiple examples of the same pattern (one is enough)
- verbose prose (they parse structure efficiently)

agents do need:
- exact rule statements (the directive itself)
- one clear example (demonstrates correct application)
- enforcement level (determines block behavior)

## your task

compress the source brief for agent consumption:
- target: 30-40% of original token count
- preserve: rules, one example pair, enforcement
- cut: motivation, duplicate examples, prose

## output format

raw markdown optimized for agent parse. no wrapper. no explanation.
