# rule.avoid.articles-copulas

## .what

drop articles (`the`, `a`, `an`) and bare copulas (`is`, `are`, `was`, `were`) from technical
prose. write telegraphic — the register of a telegram or a maintenance placard.

`remove filter from case.`, not `Remove the filter from the case.`
`queue empty.`, not `the queue is empty.`

this is our deliberate divergence from standard ste, which mandates articles. see
`define.simplified-technical-english`.

## .scope

- code: comments, jsdoc headers
- docs: markdown, briefs, plans, readmes
- comms: commit messages, pr descriptions
- logs: error strings, debug lines

exempt: verbatim quotes, code blocks, human-chat tone.

## .why

- **fewer tokens** — articles and copulas carry no domain signal. cut them, keep the sense.
- **one register** — telegraphic prose reads uniform, so the reader scans faster.
- **aligns with house style** — the terse, lowercase voice already leans this way.

## .the test

remove the article or copula. did the sense survive? in technical prose it always does — drop it.

## .how

- **drop articles** — `the`, `a`, `an` before a noun. `set the phone` → `set phone`.
- **drop copulas** — `is`/`are`/`was`/`were` as the sole verb. `record is valid` → `record valid`.
- **keep** copulas inside a verb phrase where they carry tense or voice you need (`was retried`), and keep articles where a drop would misread.

## .examples

### 👎 bad — articles + copulas

```ts
// the guard checks whether the record is valid before the record is persisted
```

### 👍 good — telegraphic

```ts
// guard checks record valid before persist
```

### 👍 good — error string

```ts
throw new ConstraintError('customer lacks phone', {
  customerId,
  hint: 'set phone first via setCustomerPhone',
});
```

## .caveat

clarity outranks the cut. if a drop makes prose misread, keep the word. the goal = terse and
clear, never terse at the cost of sense.

## .enforcement

- an article or bare copula that a cut would not miss = **nitpick**
- prose that reads as full formal sentences where telegraphic would serve = **nitpick**

## .see also

- `define.wick-dense` — the terse persona this rule voices
- `define.simplified-technical-english` — the overlay and why we diverge from ste here
- `rule.require.brevity` — the broader cut this rule sharpens
- `lang.tones/rule.prefer.lowercase` — the terse house voice
