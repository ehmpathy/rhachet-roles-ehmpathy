# rule.prefer.prevent-over-correct

## .what

prefer to **design the error out** over a message that reports it after the fact. the best
error is the one the human can never trigger. where a mistake is possible, constrain the
surface so it cannot happen — before you reach for a good error message.

grounds the *safe* and *frictionless* qualities of both defs. from nielsen's heuristic 5,
**error prevention**, and norman's **constraints** (`ref.ergonomics.fundamentals`).

## .why

- a prevented error costs the human no time; a reported error still costs a stumble and a recovery
- a constraint holds for every human, every time; a message relies on the human to read and react
- prevention beats correction — but a clear error (`rule.require.errors-name-the-fix`)
  remains the required backstop for what cannot be prevented

## .the ladder

reach for the highest rung the case allows:

1. **make it impossible** — a type, an enum, or a shape that cannot express the wrong value
2. **make it hard** — a confirmation or explicit flag for the destructive move (`rule.require.safe-by-default`)
3. **catch it early** — validate at the boundary, before harm, with an error that names the fix
4. **report it well** — when none of the above fit, a clear error that names the fix

## .examples

### 👎 bad — a free-text field that must then be policed

```bash
# board is free text; every typo becomes a runtime error to message and recover
$ booklesson --board longbord     # typo → "invalid board" error, retry
```

### 👍 good — an enum makes the typo impossible

```bash
# board is a closed set; the wrong value cannot be expressed
$ booklesson --board <foamboard|longboard|shortboard>
# a typo is caught at parse with the valid set shown — or, in a picker, unpickable
```

## .enforcement

- an avoidable error handled only by a message, where a constraint could prevent it = **nitpick**
- a free-form input where a closed set (enum/choice) matches the real domain = **nitpick**

## .see also

- `ref.ergonomics.fundamentals` — error prevention (nielsen 5), constraints (norman)
- `rule.require.errors-name-the-fix` — the backstop for what cannot be prevented
- `rule.require.safe-by-default` — rung 2 of the ladder
- `def.frictionless` — the *no unexpected error* line this backs
