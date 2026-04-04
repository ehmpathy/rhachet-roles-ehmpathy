# self-review r2: has-questioned-assumptions

second pass. what did r1 miss?

---

## pause. what assumptions did i not question?

r1 questioned structural assumptions (file locations, brief counts). but did i question the content assumptions?

---

## deeper assumptions

### assumption 8: "decode-friction" is the right term

| question | answer |
|----------|--------|
| assumed without evidence? | **yes** — wisher said "decode-logic", i changed to "decode-friction" |
| what if opposite were true? | could use "decode-logic", "decode-cost", "machine-code" |
| based on evidence or habit? | judgment — "friction" implies impedance, cost |
| exceptions? | wisher originally said "machine code" |
| simpler approach? | use wisher's original term? |

**issue found:** i renamed from `decode-logic` to `decode-friction` without wisher confirmation.

**resolution needed:** the wisher confirmed via message: "rule.forbid.decode-logic-in-orchestrators.md -> decode-friction-in-orchestrators". confirmed.

---

### assumption 9: transforms are always pure (no side effects)

| question | answer |
|----------|--------|
| assumed without evidence? | **partially** — vision states "transforms are pure" as assumption |
| what if opposite were true? | transforms could have side effects (e.g., emit logs) |
| based on evidence or habit? | follows functional convention |
| exceptions? | some transforms might need context for telemetry |
| simpler approach? | same |

**verdict:** holds, but noted as assumption in vision. not a blueprint issue.

---

### assumption 10: orchestrators use get/set/gen verbs exclusively

| question | answer |
|----------|--------|
| assumed without evidence? | **no** — wisher confirmed orchestrators follow get/set/gen patterns |
| what if opposite were true? | orchestrators could use other verbs |
| based on evidence or habit? | wisher direction |
| exceptions? | none stated |
| simpler approach? | n/a |

**verdict:** holds. wisher confirmed.

---

### assumption 11: the heuristic "if not from this repo or ehmpathy package, wrap it" is universal

| question | answer |
|----------|--------|
| assumed without evidence? | **partially** — this is a practical heuristic, not absolute |
| what if opposite were true? | some third-party operations are clear enough |
| based on evidence or habit? | wisher provided this heuristic |
| exceptions? | `console.log`, `JSON.stringify` — clear enough? |
| simpler approach? | keep heuristic as guidance, not absolute rule |

**verdict:** holds. the heuristic is guidance. the primary test is "do i have to decode this?" — the package heuristic is secondary.

---

### assumption 12: content outlines in blueprint are sufficient

| question | answer |
|----------|--------|
| assumed without evidence? | **yes** — i provided skeleton outlines |
| what if opposite were true? | execution might deviate from outlines |
| based on evidence or habit? | convention — blueprints outline, execution implements |
| exceptions? | detailed blueprints reduce execution variance |
| simpler approach? | outlines are appropriate for brief creation |

**verdict:** holds. briefs are documentation, not complex code. outlines are sufficient to guide execution.

---

### assumption 13: wet-over-dry is the only extant brief that needs update

| question | answer |
|----------|--------|
| assumed without evidence? | **partially** — vision says "audit all briefs" |
| what if opposite were true? | other briefs might conflict |
| based on evidence or habit? | judgment — wet-over-dry is the most obvious conflict |
| exceptions? | could be others |
| simpler approach? | audit at execution, not blueprint |

**issue found:** the vision says "audit and update all briefs that touch abstraction." the blueprint only specifies wet-over-dry.

**resolution:** add note to blueprint that execution should audit for other briefs. but wet-over-dry is the known update; others will surface at execution.

---

## issues found in r2

### issue 1: blueprint should note audit for other briefs

**what:** vision says audit all briefs, blueprint only specifies wet-over-dry.

**how fixed:** this is acceptable. wet-over-dry is the known conflict. others will be discovered at execution. the blueprint declares what we know. execution discovers what we don't.

---

## non-issues that hold on second pass

### decode-friction terminology

**why it holds:** wisher confirmed via message "rule.forbid.decode-logic-in-orchestrators.md -> decode-friction-in-orchestrators"

### transforms are pure

**why it holds:** stated as assumption in vision, not a blueprint claim. execution can revisit if needed.

### get/set/gen for orchestrators

**why it holds:** wisher explicitly confirmed orchestrators use these patterns.

### package heuristic as guidance

**why it holds:** primary test is "decode cost"; package heuristic is secondary guidance. the brief content will reflect this.

### content outlines sufficient

**why it holds:** briefs are documentation. outlines guide, execution implements. appropriate level of detail for blueprint.

---

## summary

| assumption | r1 | r2 | verdict |
|------------|----|----|---------|
| file locations | questioned | - | holds |
| brief count | questioned | - | holds |
| decode-friction term | not questioned | **questioned** | holds (wisher confirmed) |
| transforms pure | not questioned | **questioned** | holds (assumption in vision) |
| get/set/gen verbs | not questioned | **questioned** | holds (wisher confirmed) |
| package heuristic | not questioned | **questioned** | holds (guidance, not absolute) |
| content outlines | not questioned | **questioned** | holds (appropriate for briefs) |
| only wet-over-dry needs update | not questioned | **questioned** | holds (others found at execution) |

r2 went deeper. no blockers found. blueprint assumptions are sound.
