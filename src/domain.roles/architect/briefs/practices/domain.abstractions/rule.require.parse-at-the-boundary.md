# rule.require.parse-at-the-boundary

## .what

turn raw input into the most precise construct once, where it enters, and carry that proof in the type. inside, the shape is an invariant; later code needs no recheck. never validate and discard.

> "Get your data into the most precise representation you need as quickly as you can." — king 2019 ✅

## .how

1. find each boundary: a handler, an sdk response, a queue message, a file read
2. cast the raw value there, at once, into the precise construct (`asIsoPrice`, `asWaveReport`, a domain object constructor)
3. fail loud on a value that will not cast; never pass the raw value on
4. inside, accept only the precise type, so no inner function can be handed the raw one

```ts
// 👍 the handler casts once; each call below receives a LessonReservation
export const handler = async (event: { body: string }) => {
  const reservation = asLessonReservation({ raw: JSON.parse(event.body) }); // throws a ConstraintError on a bad shape
  return setLessonReservation({ reservation }, context);
};
```

## .in our tools

- `asIsoPrice(x)`, `asIsoTimeStamp(x)` at the handler (`rule.forbid.any-price`, `rule.forbid.any-time`, mechanic)
- declastruct casts each sdk response into the declared shape, and fails loud on an invalid one
- an assumption about a third party's payload converts into an invariant we own (`rule.require.assumptions-with-evidence`, move 1)

## .enforcement

- a raw boundary value passed into the domain uncast = **blocker** (harm: a malformed value reaches a write deep in the stack, past every check that would have refused it)
- a cast at the boundary whose result is then discarded for the raw value = **blocker** (same harm)
- a precise type built a few calls past the boundary, with no raw value used in between = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=construct.verb=use.tactic=standardize` — the full tactic, with the sources
- `rule.forbid.scattered-parse` — the forbid twin
- `rule.require.precise-constructs` — the construct this builds
- `rule.forbid.implicit-assumptions` — the payload assumption this cast converts
