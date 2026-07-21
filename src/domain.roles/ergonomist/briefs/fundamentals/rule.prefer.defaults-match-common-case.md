# rule.prefer.defaults-match-common-case

## .what

the bare invocation should do the common-case work. a value the surface could infer or
sensibly default must not be a required input. reserve the human's effort for the choices
that actually vary.

grounds the *convenient* quality of `def.ergonomic` and the *defaults match the common
case* line of `def.frictionless`. from nielsen's **flexibility and efficiency** and
**minimalist design**, and the cognitive-load laws (`ref.ergonomics.fundamentals`).

## .why

- every required input is a decision the human must make; each decision costs time (hick's law)
- a default that matches the common case lets the novice succeed with the bare command
- forced ceremony the surface could infer is friction with no payoff

## .the test

"for the common case, does the bare invocation just work?"

- yes → defaults match
- no → default the inferable inputs; keep flags for what truly varies

## .how

- **default the common case** — the most frequent value is the default, not a required flag
- **infer what you can** — derive from context (cwd, prior state, a single obvious option)
  rather than demand it
- **keep flags for real variation** — expose a choice only where the human genuinely chooses
- **accelerators, not gates** — power flags speed the expert without a cost to the novice

## .examples

### 👎 bad — every ride needs the same three flags

```bash
# the common case (today's report, this spot, metric units) is all forced
$ wavereport --spot pipeline --date today --units metric
```

### 👍 good — the common case is the default

```bash
# bare invocation does the common work; flags override only when it varies
$ wavereport                      # today, nearest spot, your saved units
$ wavereport --spot trestles      # override just the spot
```

## .enforcement

- a required input the surface could infer or sensibly default = **nitpick**
- a forced flag whose value is the same in nearly every common case = **nitpick**

## .see also

- `ref.ergonomics.fundamentals` — flexibility & efficiency (nielsen 7), minimalism (nielsen 8), hick's law
- `rule.forbid.undefined-inputs` (mechanic) — the internal-contract counterpart (be explicit *inside*)
- `def.ergonomic` — the *convenient* quality this backs
- `def.frictionless` — the *defaults match the common case* line this backs
