# rule.forbid.scattered-invariant-guards

## .what

never enforce a domain invariant with a guard inside one caller. the next caller skips it.

a **guard** = an `if … throw` that an operation runs before it writes. it protects only the path that runs it.

## .the smell

a guard in an operation that protects a fact about another object:

```ts
// 👎 in setLessonReservation — the voucher path writes through the dao and skips it
if (getAge(surfer.birthDate) < 18 && !input.parentWaiver) throw ...
```

the tells: the same guard copied into a second operation · a comment like "make sure to also guard X" · a write path that reaches the dao around the operation that holds the guard.

## .the cure

move the enforcement to where every path must pass:

| enforcement | holds because |
|---|---|
| the domain object refuses construction (`LessonReservation` with no matched consent throws a `ConstraintError` that names the fix) | no path can build the illegal record |
| one write path (`setLessonReservation`; the dao is not called around it) | no path can skip the guard |
| a storage constraint (unique, check, foreign key) | no path can commit the illegal record |
| a type or a parse at the boundary (`IsoPrice`) | no path can express the illegal value |

then prove the break case: a test that goes red without the enforcement.

## .enforcement

- a domain invariant enforced only by a guard in one caller = **blocker**
- one invariant guarded in two or more callers = **blocker**

## .see also

- `catalog.of=tactic.constraint.kind=invariant.grain=enforcement.tactic=refuse` — the member, in full
- `rule.require.invariant-before-operation` — the require twin: invariant → break paths → enforcement per path → proof
- `define.constraint.kind=invariant` — structural vs operational enforcements
- `ref.invariant.history` — lamport: "it's better to write a global invariant"
