# rule.prefer.active-simple-tense

## .what

use simple present or simple past. no compound or perfect tenses. `guard rejects invalid input.`,
not `invalid input will have been rejected by the guard.`

## .scope

- code: comments, jsdoc headers
- docs: markdown, briefs, plans, readmes
- comms: commit messages, pr descriptions
- logs: error strings, debug lines

exempt: verbatim quotes, code blocks, human-chat tone.

## .why

- **simple tense reads plain** — "generates" beats a stacked auxiliary form.
- **fewer tokens** — a compound tense stacks auxiliary words that carry no signal.
- **any-language legibility** — simple present/past maps cleanest across languages.
- **ste rule** — a small set of simple tenses is a core ste write-rule.

## .the tenses we keep

| use | tense | example |
|-----|-------|---------|
| what the code does | simple present | `orchestrator generates invoice.` |
| what happened | simple past | `webhook retried. code charged twice.` |
| an instruction | imperative | `set phone first.` |

## .the tenses we drop

- future (`will generate`, "about to generate") → simple present
- perfect (`has generated`, `had generated`, `will have generated`) → simple present/past
- continuous (be-verb + an -ing participle, e.g. `is generating`, `was retrying`) → simple present/past

a bare copula (`is valid`, `was ready`) carries no -ing participle, so this row leaves it alone.
`rule.avoid.articles-copulas` governs the bare copula, as a nitpick — no double-grade here.

## .examples

### 👎 bad — compound + future-perfect

```ts
// once the customer has been charged, the invoice will have been generated
```

### 👍 good — simple present

```ts
// after it charges customer, orchestrator generates invoice
```

## .enforcement

- a future, perfect, or continuous tense where simple present/past serves = **nitpick**
- an auxiliary stack (`will have been`) in technical prose = **nitpick**

## .see also

- `rule.avoid.passive-voice` — the voice pair for active prose
- `rule.require.brevity` — compound tenses add the words this rule cuts
- `define.wick-dense` — the terse persona this rule voices
- `define.simplified-technical-english` — the overlay this rule serves
