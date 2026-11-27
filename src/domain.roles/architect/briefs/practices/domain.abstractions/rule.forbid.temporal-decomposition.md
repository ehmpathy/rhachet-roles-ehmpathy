# rule.forbid.temporal-decomposition

## .what

never cut a system into parts by the order its steps run. a part per step (parse, transform, write) means each part knows the same format, so one format change ripples through every step.

> "It is almost always incorrect to begin the decomposition of a system into modules on the basis of a flowchart." — parnas 1972 ✅

## .the smell

```ts
// 👎 three parts, one per step; each knows the vendor's lesson-slot shape
parseLessonSlots.ts      // reads raw.slots[].start_ts
transformLessonSlots.ts  // reads raw.slots[].start_ts, raw.slots[].instructor_id
writeLessonSlots.ts      // writes the same fields, renamed
```

the tells:

- parts named for steps: `parse*`, `transform*`, `process*`, `write*`, `step1*`
- one decision (a vendor, a format, a storage engine) known by two or more parts
- shotgun edits: a small change to one decision touches many files

## .the cure

cut by decision, not by step (`rule.require.decision-decomposition`):

| move | holds because |
|---|---|
| one home per decision (`asLessonSlot` owns the vendor shape) | a change to the decision touches that home alone |
| name each part for the decision it owns | the name says what a change would reach |
| the steps become calls in one orchestrator | an order change never splits a part |

## .enforcement

- one decision likely to change, known by two or more parts cut by step = **blocker** (harm: a vendor or format change lands in one step and not the next; the mismatch ships)
- a part named for its step while it still owns one decision alone = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=_.verb=set.tactic=separate` — the full tactic, with the sources
- `rule.require.decision-decomposition` — the require twin
- `rule.require.group-by-noun-not-verb` — the same cut, for directories
- `rule.require.orchestrators-as-narrative` — where the steps go once each decision has a home
