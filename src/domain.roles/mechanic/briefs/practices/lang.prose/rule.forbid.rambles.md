# rule.forbid.rambles

## .what

no rambles. a ramble = prose that runs long past its point: the run-on, the restatement, the
hedge, the throat-clear, the wind-up before the substance.

the negative peer of `rule.require.brevity`. brevity names the target; this rule names the smell.

## .scope

- code: comments, jsdoc headers
- docs: markdown, briefs, plans, readmes
- comms: commit messages, pr descriptions
- logs: error strings, debug lines

exempt: verbatim quotes, code blocks, human-chat tone (see `define.simplified-technical-english`).

## .why

- **rambles hide complexity via obscurity** — length buries a half-grasped idea where no reader can audit it.
- **a ramble costs every reader** — each surplus clause is a decode tax, paid on every read.
- **a ramble signals a foggy author** — if you could name the point, you would. the wander is the tell.

## .the ramble smells

| smell | example | fix |
|-------|---------|-----|
| throat-clear | "it is worth a mention that X" | "X" |
| wind-up | "in order to be able to X" | "to X" |
| restatement | states X, then states X again reworded | state X once |
| hedge-stack | "this should probably mostly work" | state the claim + its bound |
| run-on | five clauses chained by "and" / commas | split into short sentences |
| filler noun | "in the midst of a check" | "a check" |

## .the test

read the passage. can you delete a clause and lose no sense? then it rambled — cut it.
does one point stretch across three sentences that one would hold? collapse it.

## .examples

### 👎 bad — ramble

```
this function, which is quite important to the overall flow, essentially takes
care of more or less a guarantee that, in most cases, the customer record ends
up valid.
```

### 👍 good — no ramble

```
validate the customer record.
```

## .enforcement

- a run-on, restatement, hedge-stack, or throat-clear = **blocker**
- a point stretched across sentences that one short sentence would hold = **blocker**

## .see also

- `rule.require.brevity` — the positive peer; the target this rule guards
- `rule.prefer.one-instruction-per-sentence` — splits the run-on
- `define.wick-dense` — the terse persona; wick refuses the filler this rule names
- `rule.forbid.chronological-accretion` — the doc-level peer of this sentence-level smell
- `lang.tones/rule.forbid.buzzwords` — a neighbor smell (large-gravity words)
