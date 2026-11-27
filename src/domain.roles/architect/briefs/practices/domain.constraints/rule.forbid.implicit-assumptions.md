# rule.forbid.implicit-assumptions

## .what

never let correctness rest on a condition no one enforces and no one wrote down.

an **assumption** = a claim that the world keeps a condition we cannot make hold. we enforce it by assertion: detect the break and fail fast.

- a surfer's birth date is true
- stripe delivers each webhook at least once
- the clock never goes backward

## .the smell

- code correct only if an upstream, a third party, a clock, or a human behaves — with no line that says so
- "that never happens" in a review
- a third-party response used with no parse

```ts
// 👎 correct only if stripe never sends the same event twice — stated nowhere
await daoLessonReservation.set({ reservation: { ...reservation, status: 'PAID' } });
await sdkEmail.send({ to: surfer.email, template: 'receipt' });
```

## .the cure

reach for each in order:

1. **enforce it** where you can — parse at the boundary, and the shape becomes an invariant you own
2. **cap the blast radius** so a break is benign — an idempotent consumer absorbs a duplicate webhook
3. **assert it** — detect each break and fail fast; this is how an assumption is enforced. an absent webhook surfaces within a day
4. **declare it** in `inventory.of=assumption`: its evidence, strength, blast radius, required response on each break (absorbed or surfaced), and review-by date. the entry is declarative; it never names the mechanism

## .enforcement

- correctness that rests on an implicit assumption = **blocker**
- a break with no required response = **blocker**

## .see also

- `catalog.of=tactic.constraint.kind=assumption.grain=declaration.tactic=attest` · `catalog.of=tactic.constraint.kind=assumption.grain=enforcement.tactic=assert` — the members, in full: the entry, then the check at the edge
- `rule.require.assumptions-with-evidence` — the require twin, in full
- `howto.itemize-constraints._` — where the entry lives
- precedent: rely/guarantee (jones 1983); assume/guarantee (misra & chandy 1981) — see `ref.invariant.history`
