# rule.prefer.short-sentences

## .what

keep sentences short — ≤~20 words. a long sentence hides a compound thought; a short one holds one.

applies to all technical prose. procedural and long-form. a long-form brief gains *more* from
short sentences, not less — many short composed sentences beat few long ones.

## .scope

- code: comments, jsdoc headers
- docs: markdown, briefs, plans, readmes
- comms: commit messages, pr descriptions
- logs: error strings, debug lines

exempt: verbatim quotes, code blocks, human-chat tone.

## .why

- **short sentences read in one pass** — the reader parses ≤20 words without a re-read.
- **any-language legibility** — a non-native reader (human or llm) parses short clauses cleanly.
- **long ≠ deep** — a long sentence often fuses two thoughts. split it; each half reads clearer.
- **ste cap** — a bounded sentence length is a core ste write-rule.

## .the misread this rule corrects

long *form* does not need long *sentences*. a brief that builds a mental model wants *many* short
composed sentences, not a few sprawled ones. the depth lives in the composition, not in the clause.

## .the test

count words to the period. over ~20? find the fused thought and split at it.

## .how

- one sentence, one idea (pairs with `rule.prefer.one-instruction-per-sentence`).
- split at `and` / `but` / `which` / the second comma.
- compose short sentences into a paragraph; let the paragraph carry the depth.

## .examples

### 👎 bad — one long sentence

```
the reviewer reads the diff and because every comment now reads the same way, with
the same verbs and the same shapes, they no longer have to decode the surface words
and can instead read only the sense, which is the whole point of the overlay.
```

### 👍 good — short sentences composed

```
the reviewer reads the diff. every comment reads the same way. same verbs. same shapes.
so the reviewer decodes no surface words. they read only the sense. that is the point.
```

## .caveat

~20 words = a guide, not a hard gate. an occasional longer sentence is fine where a split would
fracture a tight thought. the mandate: default short; justify long.

## .enforcement

- a sentence over ~20 words that a split would clarify = **nitpick**
- a long-form brief that treats itself as exempt from short sentences = **nitpick** (one dialect governs all prose; the hard "no exempt long-form" line lives in `define.simplified-technical-english`, backed by the blocker rules `require.brevity` + `forbid.rambles`)

## .see also

- `rule.prefer.one-instruction-per-sentence` — the split that produces short sentences
- `rule.require.brevity` — the broader cut
- `define.wick-dense` — the terse persona this rule voices
- `define.simplified-technical-english` — the overlay this rule serves
