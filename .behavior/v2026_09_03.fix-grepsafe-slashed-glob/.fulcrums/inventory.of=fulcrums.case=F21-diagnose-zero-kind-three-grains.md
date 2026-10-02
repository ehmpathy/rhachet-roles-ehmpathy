# F21 — `diagnose_zero_kind` holds three grains in one function

- **rework**: clean
- **status**: open, best-guessed
- **confidence**: 68%
- **raised**: by `r011` (enroll-impl-arch-defects), graded `[nitpick][better]`
- **where**: `grepsafe.sh` — `diagnose_zero_kind`

## .the fork

`diagnose_zero_kind` does three jobs in one body:

1. **probe** — runs `rg --files` against the derived root; records `PROBE_STATUS`
2. **classify** — walks a rank-ordered cascade of five zero-kinds and elects one
3. **publish** — appends to `DIAGNOSTICS` / `DIAGNOSTICS_REL` where the probe failed

`rule.require.single-responsibility` and `define.domain-operation-grains` favor a split:

```
probe_search_root       → sets PROBE_STATUS, PROBE_STDERR
classify_zero_kind      → reads PROBE_STATUS, sets ZERO_KIND
append_zero_diagnostics → reads PROBE_STDERR, appends DIAGNOSTICS/DIAGNOSTICS_REL
```

## .taken, and why

**leave it whole.**

- the reviewer names no shipped harm: *"a readability cost, not a correctness one — the function is
  correct today and its `.sets` surface is declared."*
- `PROBE_STATUS >= 2` is read twice, interleaved with the rank order. F17 (`[case39][t0]`), F18
  (`[case14][t4]`), and acceptance 7 all rest on that order. a split must re-establish the condition
  at two points across two functions, and a slip silently re-elects a zero-kind — the false report
  this route kills.
- the header declares all three outputs, so a reader learns the grains before the body.

an earlier objection — the split needs positional args — died on inspection: `expand_root_or_reason`
already publishes via globals, so a zero-arg split fits the file's idiom.

## .confidence — 68%

F13 was deferred five rounds on arguments that read as sound, then landed with zero snapshot drift.
"the interleave is risky" is that shape of argument, and the risk is an estimate, not a measurement.

unlike F13, this removes no hazard — one writer per value, no second producer. the gain is legibility;
the cost is an order-critical condition split across a new boundary.

## .verdict

⬜ unruled.
