# rule.require.brevity

## .what

say it in the fewest words that keep the full sense. cut every word that carries no signal.

brevity here = a **correctness signal**, not a style nicety. simplicity proven via brevity.

## .scope

- code: comments, jsdoc headers
- docs: markdown, briefs, plans, readmes
- comms: commit messages, pr descriptions
- logs: error strings, debug lines

exempt: verbatim quotes, code blocks, human-chat tone (see `define.simplified-technical-english`).

## .why

- **brevity proves grasp** — per feynman, true simplicity demands thoroughness. so a brief statement is the *proof* you understand the idea. cannot say it briefly? you do not yet grasp it.
- **length hides complexity** — a long passage lets a half-grasped idea slip past unexamined. brevity forces the fog to lift.
- **fewer tokens** — the direct win for cost and one-pass reads.
- **max signal per token** — every surplus word dilutes the signal.

## .the test

cut each word. did the sense survive? then the word carried no signal — drop it.
cannot compress further without loss? you have reached brevity.

## .how

- state the point first. cut the wind-up.
- one idea per sentence (see `rule.prefer.one-instruction-per-sentence`).
- drop filler: "in order to" → "to", "the fact that" → gone, "it is important to note that" → gone.
- drop hedges: "should probably", "in most cases", "i think" — state the claim or its bound.
- drop restatement. say it once.

## .examples

### 👎 bad — ramble

```ts
// in order to accomplish the goal of a record check, we first need to look at
// whether or not it is actually present, and if it happens to be absent then we
// should probably go ahead and return an error to the caller
```

### 👍 good — brief

```ts
// validate record. absent record returns error.
```

## .enforcement

- prose that carries surplus words a cut would not miss = **blocker**
- a hedge or restatement that dilutes a checkable claim = **blocker**

## .see also

- `rule.forbid.rambles` — the negative peer; names the smell this rule pulls away from
- `rule.prefer.short-sentences` — brevity per sentence
- `define.wick-dense` — the terse persona this rule voices
- `define.simplified-technical-english` — the overlay this rule serves
