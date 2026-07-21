# rule.require.errors-name-the-fix

## .what

an error must name the **fix**, not just the **symptom**. it states what went wrong, why,
and the concrete next move the human can take to recover. an error that only reports
failure has done half its job.

grounds the *failures are loud and legible* line of `def.frictionless` and the *errors
name the fix* line of `def.ergonomic`. from nielsen's heuristic 9, **help users
recognize, diagnose, and recover from errors** (`ref.ergonomics.fundamentals`).

## .why

- a bare symptom leaves the human to guess the cause and the cure — the detour is the friction
- the moment of error is exactly when the human most needs the path forward
- an error that names the fix turns a dead end into a recoverable step (nielsen: user
  control and freedom)

## .the anatomy of a helpful error

1. **what** — what went wrong, in the human's words
2. **why** — the context that caused it (the value at fault, the absent piece)
3. **fix** — the concrete next move: the flag to add, the command to run, the value to change

## .examples

### 👎 bad — symptom only

```bash
$ booklesson --surfer kai --spot pipeline
Error: invalid spot
# invalid how? which spots are valid? what does the surfer do now?
```

### 👍 good — the error names the fix

```bash
$ booklesson --surfer kai --spot pipeline
🐢 bummer dude — "pipeline" is closed for the season

  why: winter swell shut pipeline until march
  fix: pick an open spot —
    booklesson --surfer kai --spot trestles
  see open spots:
    booklesson spots --list --open
```

### 👍 good — the fix is a copy-paste command

```
🐢 bummer dude — no credentials for the wave-report api

  fix: unlock them, then retry —
    rhx keyrack unlock --owner ehmpath --env prep
```

## .enforcement

- an error that states a symptom with no fix = **blocker**
- an error that rejects a value without a note of the valid ones (or how to list them) = **blocker**
- a stack trace shown to a human as the only error output = **blocker**

## .see also

- `ref.ergonomics.fundamentals` — help recover from errors (nielsen 9)
- `rule.require.discoverability` — the same "name the options" move, before the error
- `rule.require.failloud` (mechanic) — the code-level "errors carry context + hint" rule
- `def.frictionless` — the *failures are loud and legible* line this backs
