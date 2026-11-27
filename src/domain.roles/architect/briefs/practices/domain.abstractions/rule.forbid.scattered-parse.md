# rule.forbid.scattered-parse

## .what

never pass a raw value past the boundary it entered at and check its shape deeper in. a scattered parse repeats the same null or shape check down the call stack, and the one path that skips it lets a malformed value through.

> "Get your data into the most precise representation you need as quickly as you can." — king 2019 ✅

## .the smell

```ts
// 👎 the raw body travels; each layer re-checks a piece of it
export const handler = async (event: { body: string }) => setLessonReservation({ raw: JSON.parse(event.body) }, context);

const setLessonReservation = async (input: { raw: any }, context: Context) => {
  if (!input.raw.surferUuid) throw new Error('surferUuid required');
  return chargeLesson({ raw: input.raw }, context);
};

const chargeLesson = async (input: { raw: any }, context: Context) => {
  if (typeof input.raw.price !== 'number') throw new Error('price required'); // and a third check, in the refund path?
};
```

the tells:

- an `any`, `unknown`, or raw payload type on an inner function
- the same `if (!x.field)` check in two or more layers
- a validate call whose result is thrown away (`isValidLesson(raw)` then `raw` passed on)

## .the cure

parse once, at the boundary (`rule.require.parse-at-the-boundary`):

| move | holds because |
|---|---|
| cast at the boundary into the precise construct (`asLessonReservation`) | a malformed value fails loud before it reaches the domain |
| inner functions accept only the precise type | no inner path can be handed the raw value |
| delete the inner rechecks | the type already proves what they checked |

## .enforcement

- a raw value passed past its boundary, with its checks spread across inner layers = **blocker** (harm: the inner path that lacks a check writes a malformed value)
- a redundant inner recheck of a value already cast = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=construct.verb=use.tactic=standardize` — the full tactic, with the sources
- `rule.require.parse-at-the-boundary` — the require twin
- `rule.forbid.scattered-invariant-guards` — the same scatter, for a domain invariant
- `rule.forbid.illegal-values-constructible` — the type that makes the inner checks moot
