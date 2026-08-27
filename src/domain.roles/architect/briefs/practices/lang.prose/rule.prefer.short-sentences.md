# rule.prefer.short-sentences

## .what

keep sentences short — ≤~20 words. a long sentence hides a compound thought; a short one holds one.

applies to long-form briefs too. a brief gains *more* from short sentences, not less. split the fused
thought. compose short sentences into a paragraph that carries the depth.

## .why

- **short sentences read in one pass** — the reader parses ≤20 words without a re-read.
- **any-language legibility** — a non-native reader (human or llm) parses short clauses cleanly.
- **long ≠ deep** — a long sentence often fuses two thoughts. split it; each half reads clearer.

## .the misread this rule corrects

long *form* does not need long *sentences*. a brief that builds a mental model wants *many* short composed sentences, not a few sprawled ones. the depth lives in the composition, not in the clause.

## .scope

all technical prose the architect writes: briefs, plans, domain docs, decision records.

exempt: verbatim quotes, code blocks.

## .how

- one sentence, one idea.
- split at `and` / `but` / `which` / the second comma.
- compose short sentences into a paragraph; let the paragraph carry the depth.

## .examples

### 👎 bad — one long sentence

> the reviewer reads the diff and because every comment now reads the same way, with the same verbs and shapes, they no longer decode the surface words and read only the sense.

### 👍 good — short sentences composed

> the reviewer reads the diff. every comment reads the same way. same verbs. same shapes. they decode no surface words. they read only the sense.

## .enforcement

length alone rarely blocks the sense, so this flags as a nitpick. the hard "one dialect, no exempt long-form" line lives in `define.simplified-technical-english`, backed by the blocker rules `require.brevity` + `forbid.rambles`.

- a sentence over ~20 words that a split would clarify = **nitpick**
- a long-form brief that treats itself as exempt from short sentences = **nitpick**

## .see also

- `rule.require.brevity` — the broader cut
- `rule.forbid.rambles` — the run-on this rule breaks
- `define.wick-dense` — the terse persona this rule voices
- `define.simplified-technical-english` — the overlay this rule serves
