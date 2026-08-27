# rule.prefer.one-instruction-per-sentence

## .what

one sentence carries one instruction, or one claim. split compound statements. a period is
cheaper than a comma-chain.

## .scope

- code: comments, jsdoc headers
- docs: markdown, briefs, plans, readmes
- comms: commit messages, pr descriptions
- logs: error strings, debug lines

exempt: verbatim quotes, code blocks, human-chat tone.

## .why

- **one idea per sentence reads in one pass** — the reader holds one item, not five.
- **a split surfaces order** — steps as separate sentences read as a sequence.
- **a split surfaces a missed step** — a comma-chain hides gaps; discrete sentences expose them.
- **ste core rule** — one instruction per sentence is the heart of simplified technical english.

## .the test

count the verbs of action in the sentence. more than one instruction? split at the `and` or the comma.

## .how

- one imperative per sentence: `validate record. persist record. notify caller.`
- chain of `and` / `then` / commas → separate sentences.
- a condition + its action = one sentence: `absent record returns error.`
- keep sequences as ordered short sentences, not one long clause.

## .examples

### 👎 bad — many instructions, one sentence

```ts
// validate the record and then persist it and finally notify the caller, unless
// it is absent, in which case return an error
```

### 👍 good — one instruction per sentence

```ts
// validate record. absent record returns error.
// persist record. notify caller.
```

## .enforcement

- a sentence with two or more instructions chained by `and` / `then` / comma = **nitpick**
- a condition and action fused with unrelated steps in one sentence = **nitpick**

## .see also

- `rule.prefer.short-sentences` — the length cap that pairs with this split
- `rule.forbid.rambles` — the run-on this rule breaks
- `define.wick-dense` — the terse persona this rule voices
- `define.simplified-technical-english` — the overlay this rule serves
