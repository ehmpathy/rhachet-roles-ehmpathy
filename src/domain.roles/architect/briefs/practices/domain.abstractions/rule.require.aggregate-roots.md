# rule.require.aggregate-roots

## .what

wrap what must change together under one root. outside references go to the root only. the root enforces the invariant that spans the cluster, and one transaction changes one root.

> "Any references from outside the aggregate should only go to the aggregate root." — fowler, after evans 2003 ✅

## .how

1. find the invariant that spans objects: a lesson reservation and the consent its surfer requires; an invoice and its lines
2. name the root that owns it (`LessonReservation`, `Invoice`)
3. give the root one write path (`setLessonReservation`); no caller writes an inner part directly
4. one transaction changes one root (`catalog.of=pattern.transaction.bound=storage.trait=atomicity.pattern=operation-per-transaction`)

```ts
// 👍 the root owns the consent rule; the voucher path goes through it too
await setLessonReservation({ reservation: { surfer, lesson, consent } }, context);

// 👎 an inner part written around the root — the consent rule never runs
await context.daoLessonConsent.set({ consent: { surferUuid, lessonUuid } });
```

## .enforcement

- an invariant that spans objects with no root to own it, or an inner part written around its root = **blocker** (harm: a write path that skips the root ships a record that breaks the invariant)
- an outside reference that points at an inner part for a read only = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=_.verb=set.tactic=gather` — the full tactic, with the sources
- `rule.forbid.scattered-invariant-guards` — the forbid twin: the invariant guarded in each caller rather than kept by its root
- `rule.require.decision-decomposition` — the other half: separate what changes for different reasons
- `rule.require.single-responsibility` (mechanic) — one reason to change per unit
