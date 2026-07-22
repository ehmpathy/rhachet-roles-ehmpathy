# rule.require.status-feedback

## .what

a surface must keep the human informed of **system status** — every action yields a
visible, timely response, and any wait longer than a moment shows progress. never leave
the human to wonder whether the system is at work, done, or stuck.

grounds the *safe* and *expected* qualities of `def.ergonomic`. from norman's **feedback**
and nielsen's heuristic 1, **visibility of system status** (`ref.ergonomics.fundamentals`).

## .why

- silence is ambiguous: the human cannot tell "at work" from "hung" from "done"
- with no feedback, a human re-runs, double-submits, or kills a healthy process
- timely status closes the **gulf of evaluation** — "can i tell what it did?"

## .the test

"after each action, and through any wait, can the human tell what the system does?"

- yes → status is visible
- no → add the feedback

## .how

- **acknowledge every action** — a result, a confirmation, or a next-step line
- **show progress on any real wait** — a spinner, a count, a step marker; not a frozen cursor
- **report the outcome** — success and failure are each stated, not inferred from silence
- **name what changed** — after a mutation, echo what was set/created/removed

## .examples

### 👎 bad — silence through a long ride

```bash
# a surfer syncs a season of wave reports; the terminal just hangs
$ syncwavereports --season winter
# ...30 seconds of silence...
# is it at work? stuck? did it finish? the surfer hits ctrl-c to be sure
```

### 👍 good — status is visible throughout

```bash
$ syncwavereports --season winter
🐢 paddle out...
   ├─ pipeline    ✔ 42 reports
   ├─ trestles    ✔ 38 reports
   └─ mavericks   ⏳ in progress
🐢 cowabunga! 118 wave reports synced
```

## .enforcement

- an action with no visible response = **blocker**
- a wait longer than a moment with no progress indication = **blocker**
- a mutation that does not report what changed = **blocker**

## .see also

- `ref.ergonomics.fundamentals` — feedback (norman), visibility of system status (nielsen 1)
- `rule.require.treestruct-output` — the shape that status output takes
- `def.ergonomic` — the *safe* / *expected* qualities this backs
