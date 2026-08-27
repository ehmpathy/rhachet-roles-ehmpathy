# rule.require.brevity

## .what

say it in the fewest words that keep the full sense. cut every word that carries no signal.

brevity = a correctness signal, not a style nicety. simplicity proven via brevity (feynman).

## .why

- **brevity proves grasp** — per feynman, true simplicity demands thoroughness. a brief statement is the *proof* you understand the idea. cannot say it briefly? you do not yet grasp it.
- **length hides complexity** — a long passage lets a half-grasped idea slip past unexamined.
- **fewer tokens** — the direct win for cost and one-pass reads.

## .scope

all technical prose the architect writes: briefs, plans, domain docs, decision records.

exempt: verbatim quotes, code blocks.

## .how

- state the point first. cut the wind-up.
- drop filler: "in order to" → "to", "it is important to note that" → gone.
- drop hedges: "should probably", "in most cases" — state the claim or its bound.
- say it once. cut restatement.

## .examples

### 👎 bad — ramble

> this section, which is quite central to the overall design, essentially describes more or less how, in most cases, the operations tend to compose together into larger flows.

### 👍 good — brief

> operations compose into larger flows.

## .enforcement

a ramble that hides a foggy idea costs every reader and buries defects. brevity forces the fog to lift.

- prose that carries surplus words a cut would not miss = **blocker**
- a hedge or restatement that dilutes a checkable claim = **blocker**

## .see also

- `rule.forbid.rambles` — the negative peer; names the smell this rule pulls away from
- `rule.prefer.short-sentences` — brevity per sentence
- `define.wick-dense` — the terse persona this rule voices
- `define.simplified-technical-english` — the overlay this rule serves
