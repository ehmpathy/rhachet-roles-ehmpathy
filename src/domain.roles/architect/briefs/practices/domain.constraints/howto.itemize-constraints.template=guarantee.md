# howto.itemize-constraints.template=guarantee

the template for one guarantee entry. root: `howto.itemize-constraints._.md`.

file: `inventory.of=guarantee.case=g$nnn-$slug.md` — the slug says the promise in a few words.

a guarantee is a promise at a **release boundary** — a contract whose two sides release apart. consumers cite it as an assumption in their own invariant chains, so it changes only with a major version. contracts inside one release get no entry: both sides change together.

declarative only. the entry says what is promised, never what proves it. the rules require a blackbox acceptance test that proves it and cites the id (`rule.require.acceptance.blackbox`, mechanic); the entry names no test.

## .template

```md
# g001 — a reservation's id is stable

## .surface

`getLessonReservation` — the public sdk export and its http endpoint

## .promise

once a reservation is returned, its `id` never changes, and `getLessonReservation({ id })` returns it until it is deleted.

## .since

v2.0.0

## .relies on

- `i001-reserved-boards-within-stock`
- `a002-stripe-delivers-at-least-once`

## .exclusions

observable today, promised never — do not build on these:

- the order of reservations in a list response
- the format of `id` (an opaque string; its length and alphabet may change)
- the text of error messages; only error classes are promised
```

## .the fields

| field | holds | rule |
|---|---|---|
| surface | the public name of the contract: a package export, an endpoint, a cli command, an emitted event | a name consumers already use; never an internal path |
| promise | what holds for the consumer, in the consumer's words | declarative; falsifiable from outside, by a blackbox test |
| since | the version that first made the promise | a break of the promise = a new major version |
| relies on | the invariant and assumption ids the promise rests on | the internal chain under the promise |
| exclusions | behavior a consumer can observe that we do not promise | consumers build on all they can see; name what they must not build on |

## .the test of the entry

a consumer reads only this entry and the surface's public docs. can they write a blackbox test that proves the promise? if not, the promise is not yet falsifiable — sharpen it.
