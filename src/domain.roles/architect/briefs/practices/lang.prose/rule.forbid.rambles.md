# rule.forbid.rambles

## .what

no rambles. a ramble = prose that runs long past its point: run-on, restatement, hedge, throat-clear, wind-up.

the negative peer of `rule.require.brevity`. brevity names the target; this rule names the smell.

## .why

- **rambles hide complexity via obscurity** — length buries a half-grasped idea where no reader can audit it.
- **a ramble costs every reader** — each surplus clause is a decode tax, paid on every read.
- **a ramble signals a foggy author** — if you could name the point, you would. the wander is the tell.

## .scope

all technical prose the architect writes: briefs, plans, domain docs, decision records.

exempt: verbatim quotes, code blocks.

## .how — the ramble smells

| smell | fix |
|-------|-----|
| throat-clear ("it is worth a mention that X") | "X" |
| wind-up ("in order to be able to X") | "to X" |
| restatement (states X, then states X reworded) | state X once |
| hedge-stack ("this should probably mostly work") | state the claim + its bound |
| run-on (five clauses chained by "and" / commas) | split into short sentences |

## .the test

read the passage. can you delete a clause and lose no sense? then it rambled — cut it.

## .examples

### 👎 bad — ramble

> the bounded context, as we have discussed at some length, is essentially a way to more or less draw a line around a set of concepts that, generally, belong together.

### 👍 good — no ramble

> a bounded context draws a line around concepts that belong together.

## .enforcement

in a shared brief, a ramble costs every downstream reader and reference. it blocks.

- a run-on, restatement, hedge-stack, or throat-clear = **blocker**
- a point stretched across sentences that one short sentence would hold = **blocker**

## .see also

- `rule.require.brevity` — the positive peer; the target this rule guards
- `rule.prefer.short-sentences` — splits the run-on
- `define.wick-dense` — the terse persona; wick refuses the filler this rule names
- `rule.forbid.chronological-accretion` — the doc-level peer of this sentence-level smell
- `define.simplified-technical-english` — the overlay this rule serves
