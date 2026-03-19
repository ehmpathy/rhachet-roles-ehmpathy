# rule.forbid.surprises

## .what

things should work without surprises. behavior should match expectations.

## .why

surprises break flow:
- user stops to investigate unexpected behavior
- trust erodes when tools behave unpredictably
- debugging time spent on "wait, why did that happen?"

predictability enables:
- confident usage without second-guessing
- faster iteration (no pause to verify)
- composability (predictable pieces combine predictably)

## .principle of least astonishment

> "if a necessary feature has a high astonishment factor, it may be necessary to redesign the feature."
>
> — principle of least astonishment

when behavior surprises, the interface failed — not the user.

## .signs of surprise

| symptom | indicates |
|---------|-----------|
| "wait, what?" | unexpected behavior |
| double-checking output | lack of trust |
| re-running to verify | uncertainty |
| reading source to understand | opaque behavior |
| defensive wrapper code | compensating for unreliability |

## .how to eliminate surprises

### match mental models

behavior should align with what users expect, not what's technically convenient.

### fail loudly or succeed completely

- if operation fails, make it obvious
- if operation succeeds, ensure it fully succeeded
- never silently half-succeed

### be consistent

- same input → same output
- similar operations → similar behavior
- naming reflects behavior accurately

### document deviations

when behavior must deviate from expectations:
- make it explicit in the interface
- explain why in documentation
- provide escape hatches

## .examples

### good — no surprises

```bash
# teesafe writes to file and echoes to stdout (like tee)
echo "content" | teesafe output.txt
# output: content
# file: contains "content"
```

### bad — surprising behavior

```bash
# hypothetical teesafe that silently fails on large files
echo "large content..." | teesafe output.txt
# output: (empty)
# file: empty or partial
# user: "wait, what?"
```

### good — explicit failure

```bash
# teesafe fails loudly when destination outside repo
echo "content" | teesafe /tmp/outside.txt
# stderr: error: destination must be within the git repository
# exit code: 2
```

## .enforcement

- surprising behavior without documentation = blocker
- silent failures = blocker
- inconsistent behavior across similar operations = blocker
