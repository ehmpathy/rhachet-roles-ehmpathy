# def.frictionless

## .what

a path is **frictionless** when a human walks it without stumble, surprise, or
guesswork. friction is the negative; this is its positive definition — the rubric a
reviewer scores a real runthrough against.

each line below is grounded in `ref.ergonomics.fundamentals` and enforced by a rule that
backs it — the rubric is the index; the rule carries the teeth and the examples.

## .the rubric

a path is frictionless when its actual runthrough shows ALL of:

- **no surprises** — every step behaves as a human expects (principle of least
  astonishment); no result that makes the user go "wait, what?" → `rule.forbid.surprises`
- **no unexpected error, stack trace, or stall** → `rule.prefer.prevent-over-correct`
- **no undiscoverable step** — every required step is prompted or documented; the user
  never has to guess the next move → `rule.require.discoverability`,
  `rule.require.help-on-demand`
- **visible status throughout** — no silent wait; the human can always tell what the
  system does → `rule.require.status-feedback`
- **defaults match the common case** — the bare invocation does the expected work; no
  flag is forced that could be inferred → `rule.prefer.defaults-match-common-case`
- **failures are loud and legible** — an error names the fix, not just the symptom →
  `rule.require.errors-name-the-fix`

## .see also

- `ref.ergonomics.fundamentals` — the cited canon these lines trace to
- `rule.forbid.friction-hazards` — the friction hazards to avoid (the negative form)
- `def.ergonomic` — the i/o-shape companion definition
