# rule.avoid.asymmetric-term-pairs

## .what

avoid a pair of complementary terms whose halves differ in shape, length, or stem. one half of a pair that does not rhyme with the other hides the pair: the reader cannot see the two as counterparts.

## .why

- **the pair goes unseen** — `read` beside `setInto` reads as two unrelated words, so a reader who finds one never looks for the other
- **autocomplete splits it** — halves with no shared shape land far apart in a suggestion list
- **it drifts** — once one half breaks the shape, the next counterpart added breaks it a new way

## .the smell — three ways a pair breaks

| break | 👎 example | why it breaks |
|---|---|---|
| shape | `read` / `setInto` | bare verb vs verb + preposition |
| length | `get` / `retrieve` (3 / 8) | the eye reads a pair by its width; a gap past ~2 chars breaks the rhyme |
| stem | `encode` / `unpack` | no shared root or matched affix ties them |

## .the cure

swap one half for the synonym that closes each gap, until all three dimensions match:

| 👎 | 👍 | now |
|---|---|---|
| `read` / `setInto` | `getFrom` / `setInto` | verb + preposition, 7 / 7 |
| `get` / `retrieve` | `get` / `set` | 3 / 3 |
| `encode` / `unpack` | `encode` / `decode` | shared stem, 6 / 6 |
| `agree` / `disagree` | `converge` / `contrast` | shared prefix, 8 / 8 |

where a natural domain word resists every symmetric synonym, keep the domain word (`ref.reviewer.dont-bikeshed-terms`).

## .enforcement

- a complementary pair with a shape, length, or stem mismatch where a symmetric pair reads clearly = **nitpick**
- a length gap past the ~2-char floor is graded **blocker** by the prefer twin (`rule.prefer.symmetric-term-pairs`)

## .see also

- `rule.prefer.symmetric-term-pairs` — the prefer twin: the three dimensions and the length tiers in full
- `rule.require.ubiqlang` — one canonical word per concept
- `rule.prefer.converge-contrast` · `rule.prefer.root-leaf` (mechanic) — pairs chosen by this test
