# rule.prefer.symmetric-term-pairs

## .what

complementary domain operations should share a **symmetric name shape** so the contract telegraphs the relationship. when one operation is the inverse or counterpart of another, give both the same grammatical shape (verb+preposition, or noun+state).

## .why

- a symmetric pair makes the relationship legible from the names alone — `getFrom` / `setInto` reads as two halves of one axis
- an asymmetric partner (`read` / `setInto`) hides the pair: the reader cannot pattern-match the two as counterparts
- consistent shapes let autocomplete surface the pair together and prevent name drift across sites
- pairs that align in column layouts (same length) read as a set at a glance; a length mismatch breaks the visual rhyme

## .the dimensions of symmetry

a pair is symmetric along three dimensions — hold all three:

1. **grammatical shape** — same construction (verb+preposition, noun+state, verb+shared-stem)
2. **character length** — the two terms should be the **same length**, or at minimum a **similar length**. length is a huge part of symmetry: `given` / `taken` (5/5) rhyme; `read` / `setInto` (4/7) do not
3. **stem / affix** — a shared root or matched affix (`en`code / `de`code, `en`queue / `de`queue)

### the length tiers

| length relation | verdict |
|-----------------|---------|
| **equal** length (`given`/`taken`, `getFrom`/`setInto`) | ideal — aim here |
| **similar** length (within ~1–2 chars) | required — acceptable floor |
| **asymmetric** length (e.g. 4 vs 8 chars) | forbidden — the mismatch breaks the pair |

when two candidate terms are grammatically symmetric but length-mismatched, prefer the synonym that closes the gap (`get` over `retrieve` to pair with `set`).

## .scope

applies to ubiqlang / contract / domain-operation names:

- method pairs
- arg names
- file-key conventions
- type names

## .examples

### 👍 positive — symmetric partners

| pair | shape | length |
|------|-------|--------|
| `getFrom` / `setInto` | verb + preposition | 7 / 7 — equal |
| `given` / `taken` | noun/participle, matched | 5 / 5 — equal |
| `encode` / `decode` | verb + shared stem | 6 / 6 — equal |
| `expected` / `detected` | participle, matched | 8 / 8 — equal |

### 👎 negative — asymmetric partner

```
read          <- bare verb,        4 chars
setInto       <- verb + preposition, 7 chars
```

`read` / `setInto` break symmetry on **two** dimensions: mismatched shape (bare verb vs verb+preposition) AND mismatched length (4 vs 7). prefer `getFrom` / `setInto` — matched shape, equal length.

## .enforcement

- a complementary pair with mismatched grammatical shape (`read` / `setInto`) where a symmetric pair reads clearly = **nitpick** (prefer)
- a complementary pair of **asymmetric length** (e.g. 4 vs 8 chars) where a similar-length synonym exists = **blocker** — the length mismatch breaks the pair
- **equal** length is the ideal; **similar** length (~1–2 chars) is the required floor

## .see also

- `rule.require.ubiqlang` — one canonical word per concept
- `rule.require.get-set-gen-verbs` — the verb vocabulary these pairs build on
- `rule.prefer.expected-detected` — a specific symmetric pair for desired-vs-observed compares
- `ref.reviewer.dont-bikeshed-terms` — when a natural domain word resists symmetry
- ergonomist `rule.prefer.symmetric-term-pairs` — the human-read-surface counterpart
