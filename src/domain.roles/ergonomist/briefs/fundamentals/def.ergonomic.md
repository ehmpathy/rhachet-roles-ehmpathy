# def.ergonomic

## .what

an **ergonomic** input/output contract fits the human, not the machine — its names,
defaults, shape, and errors match what a human expects, and it is **convenient** and
**safe** to use. this is the positive definition a reviewer scores captured i/o against.

four qualities, together:

- **expected** — zero surprises: names, defaults, shape, and errors behave as a human
  anticipates (principle of least astonishment)
- **intuitive** — a human infers how to use it without docs; the obvious guess is the
  right one because the control corresponds to its effect (norman's intuition)
- **unambiguous** — each name, flag, and output reads one way only; no term does double
  duty, no result invites a re-read
- **convenient** — the common case is effortless; the contract does the work, not the user
- **safe** — the easy path is the correct path; a slip does not cause quiet harm

each rubric line below is grounded in `ref.ergonomics.fundamentals` and enforced by a rule
that backs it — the rubric is the index; the rule carries the teeth and the examples.

## .the rubric

an i/o contract is ergonomic when the captured i/o shows ALL of:

- **zero surprises** — every name, default, and result behaves as a human expects; no
  result makes the user go "wait, what?" → `rule.forbid.surprises`
- **intuitive** — a human infers the next move without docs; the obvious guess works
  because the control corresponds to its effect (norman's intuition) →
  `rule.require.discoverability`, `rule.forbid.ambiguous-labels`
- **unambiguous** — each arg/flag/field/output reads exactly one way; no term is
  overloaded, no result invites a re-read → `rule.forbid.ambiguous-labels`
- **names read as a human expects** — arg/flag/field names use plain domain words, no
  jargon, no cryptic abbreviations → `rule.forbid.ambiguous-labels`
- **defaults match the common case** — the bare invocation does the expected work →
  `rule.prefer.defaults-match-common-case`
- **output is scannable** — structure and alignment are preserved; a human parses it at
  a glance → `rule.require.treestruct-output`
- **status is visible** — no silent wait; every action yields a timely response →
  `rule.require.status-feedback`
- **errors name the fix** — a bad input says what to do, not just that it failed →
  `rule.require.errors-name-the-fix`
- **convenient — the common case is effortless** — no boilerplate, no repeated flags, no
  forced ceremony the contract could have inferred or defaulted →
  `rule.prefer.defaults-match-common-case`
- **safe — the pit of success** — the easiest way to call it is the correct way; a
  mistake is caught loud (not swallowed), and destructive actions are hard to trigger by
  accident → `rule.require.safe-by-default`, `rule.prefer.prevent-over-correct`

## .see also

- `ref.ergonomics.fundamentals` — the cited canon these lines trace to
- `rule.forbid.friction-hazards` — the name, default, and error-clarity hazards
- `def.frictionless` — the path-walkthrough companion definition
