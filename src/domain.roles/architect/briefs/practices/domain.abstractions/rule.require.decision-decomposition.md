# rule.require.decision-decomposition

## .what

give each decision likely to change one home. a vendor, a storage engine, a format, a price policy: each sits behind one part, so a change to it touches that part alone. cut parts by the decision each owns, never by the order steps run.

> "There are a number of design decisions which are questionable and 'likely to change' under many circumstances." — parnas 1972 ✅

## .how

1. list the decisions most likely to change in the feature
2. give each one a home: one part that knows it, and a contract that hides it
3. name the part for the decision it owns (`sdkStripe`, `daoSurfer`, `asIsoPrice`), never for a step (`parse`, `transform`, `write`)
4. check the cut: pick one decision and change it on paper. one part moves → the cut holds. several move → re-cut

```ts
// 👍 the wave-report vendor is one decision, with one home
export const getWaveReport = async (input: { spot: SurfSpot }, context: { sdkSurfline: SdkSurfline }) =>
  asWaveReport({ raw: await context.sdkSurfline.getForecast({ spotId: input.spot.exid }) });
// a vendor swap rewrites sdkSurfline and asWaveReport; no caller of getWaveReport moves
```

## .in our tools

- declastruct hides the vendor shape behind `asDeclared*`
- the dao hides the storage: the domain reads a `Surfer`, never the record
- the `access` layer hides each sdk behind a communicator
- `asIsoPrice` owns the money format

## .enforcement

- a decision likely to change with no single home, so one change must edit several parts = **blocker** (harm: a vendor or format change ships half-applied, and the parts it missed break in production)
- a part named for a step rather than the decision it owns, where the cut still holds = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=_.verb=set.tactic=separate` — the full tactic, with the sources (parnas 1972: information hides behind a module)
- `rule.forbid.temporal-decomposition` — the forbid twin: the cut by step order
- `rule.require.aggregate-roots` — the other half: gather what changes for the same reason
- `rule.require.group-by-noun-not-verb` — this cut at the grain of a directory
- `rule.require.single-responsibility` (mechanic) — this cut at the grain of one procedure
