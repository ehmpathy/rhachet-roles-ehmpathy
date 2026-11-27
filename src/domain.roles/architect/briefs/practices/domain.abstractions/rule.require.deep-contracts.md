# rule.require.deep-contracts

## .what

give each contract a small promise over a large capability. absorb each decision inside the contract; never export it as an option, a flag, or a config every caller must set well. one author pays; many callers gain.

> "The best modules are those with the greatest benefit and the least cost." — ousterhout 2018, p. 23 ✅

the benefit is the capability a contract provides; the cost is its surface, what each caller must learn.

## .how

1. list each decision the contract asks its caller to make
2. for each, ask: can the contract make it well, for every caller? yes → absorb it
3. a decision that must stay exposed gets a default: the safe, common case (`rule.prefer.defaults-match-common-case`, ergonomist)
4. check the depth: is the surface smaller than what it hides? no → merge the contract into its caller, or deepen it

```ts
// 👍 one verb hides the lookup, the cast, the idempotency key, and the retry
await setSurfer({ findsert: surfer }, context);
```

a caller cannot get wrong a decision it never makes, so the bare call is the correct call (`rule.require.pitofsuccess`, mechanic).

## .enforcement

- a decision every caller must set, where the contract could set it well for all = **blocker** (harm: a caller sets it wrong — the wrong retry, the wrong format — and the defect ships at that call site alone)
- a surface no smaller than what it hides, with no caller harmed yet = **nitpick**

## .see also

- `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=absorb` — the full tactic, with the sources
- `rule.forbid.shallow-contracts` — the forbid twin: knobs, shallow surfaces, pass-through layers
- `rule.require.safe-escape-primitives` — the counterweight: when an escape past the contract is justified
- `rule.require.safe-by-default` (ergonomist) — the pit of success this digs
