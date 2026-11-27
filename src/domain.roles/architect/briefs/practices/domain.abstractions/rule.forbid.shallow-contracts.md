# rule.forbid.shallow-contracts

## .what

never ship a contract whose surface is as large as what it hides. a shallow contract makes every caller learn every piece, and a knob it exports pushes a decision up to the party least able to make it.

> "It is more important for a module to have a simple interface than a simple implementation." — ousterhout 2018, p. 55 (✅ "…simple interface than a simple implementation" in the book's own text; the first words via a secondary quote)

## .the smell

```ts
// 👎 every caller must pick the retry, the key, and the cast
await setSurfer(
  { surfer, retries: 3, backoffMs: 200, idempotencyKey: genKey(surfer), castFrom: 'stripe' },
  context,
);

// 👎 a pass-through: one signature, one hop, no word of its own
export const saveSurfer = (input: { surfer: Surfer }, context: Context) =>
  context.daoSurfer.set(input, context);
```

> "A pass-through method is one that does little except invoke …" — ousterhout 2018, p. 46 ✅

the tells:

- an option or flag that nearly every caller sets to the same value
- a config a caller must read the source to set well
- two adjacent layers with one signature

## .the cure

deepen the contract (`rule.require.deep-contracts`):

| move | holds because |
|---|---|
| absorb the decision inside (`setSurfer({ findsert })` picks its own retry and key) | no caller can set it wrong |
| a default for a decision that must stay exposed | the bare call is the common, safe case |
| merge a pass-through layer into its caller | each hop left adds a word of its own |

## .enforcement

- a knob every caller must set, where the contract could set it well for all = **blocker** (harm: one caller sets it wrong and ships the defect)
- a pass-through layer, or a surface no smaller than what it hides, with no caller harmed = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=absorb` — the full tactic, with the sources
- `rule.require.deep-contracts` — the require twin
- `define.domain-operation-grains` — each grain adds words of its own
