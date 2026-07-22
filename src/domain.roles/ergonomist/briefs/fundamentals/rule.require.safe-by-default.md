# rule.require.safe-by-default

## .what

the easy path must be the correct path — a **pit of success**. the bare, obvious way to
use a surface does the safe act; a destructive or irreversible action takes a deliberate
extra step, and a slip is caught loud, never swallowed.

grounds the *safe* pillar of `def.ergonomic`. from the **pit of success** and norman's
**constraints** — the design makes the wrong action hard (`ref.ergonomics.fundamentals`).

## .why

- humans follow the path of least resistance; if the easy path is unsafe, harm is a
  matter of time, not chance
- a guardrail beats a caution: prevention that needs no vigilance survives a tired human
- the safest systems make the wrong move awkward, not merely discouraged

## .the test

"if a hurried human does the most obvious move, is the result safe?"

- yes → safe by default
- no → make the safe path the easy one, and the unsafe path deliberate

## .how

- **default to the safe outcome** — dry-run/plan first, apply on an explicit flag
- **gate the destructive move** — a delete/overwrite needs confirmation or an explicit target
- **fail loud, never swallow** — a slip surfaces at once; it is never quietly absorbed
- **constrain the wrong action** — shape the contract so the harmful call is hard to write

## .examples

### 👎 bad — the easy path is the destructive one

```bash
# the bare command wipes the surfer's saved sessions with no confirmation
$ clearsessions --surfer kai
🐢 done   # ...all 200 logged sessions gone. no undo, no prompt.
```

### 👍 good — safe by default, destructive on purpose

```bash
# bare invocation previews; no data is destroyed
$ clearsessions --surfer kai
🐢 heres the wave — this WOULD clear 200 sessions (plan mode)
   run with --mode apply to actually clear

# the destructive act is a deliberate, explicit step
$ clearsessions --surfer kai --mode apply
🐢 cleared 200 sessions for kai
```

## .enforcement

- a destructive/irreversible action as the bare-invocation default = **blocker**
- an unsafe outcome reachable without a deliberate, explicit step = **blocker**
- a slip or partial failure swallowed silently instead of surfaced = **blocker**

## .see also

- `ref.ergonomics.fundamentals` — pit of success, constraints (norman)
- `rule.require.pitofsuccess` (mechanic) — the code-level pit-of-success rule
- `rule.require.status-feedback` — the loud report this relies on
- `def.ergonomic` — the *safe* pillar this backs
