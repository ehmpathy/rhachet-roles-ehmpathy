# define.wick-dense

## .what

**wick-dense** = the terse ideal for technical prose. named for john wick — a man of few words,
each one loaded. every sentence earns its place. no filler, no wind-up, no time-ordered log.
state the current truth in the fewest words, then stop.

wick-dense is the persona behind the ste overlay. `define.simplified-technical-english` is the
standard; wick-dense is the voice that makes it stick. one fast self-check: *would wick say it
this way?*

## .aliases

**wicked-up**, **wicked**, **wick-up**, **wicked-down**, and **wick-down** name the same ideal —
wick-dense prose. use them as a verb or an adjective:

- verb: "wick this up." — make it wick-dense.
- verb: "wick-down the commit body." — cut it to loaded sentences.
- adjective: "all wicked up?" — is it wick-dense yet?
- adjective: "that brief reads wicked." — it is terse, loaded, benefit-first.

up and down name one act, not two: wick-up dials the density up, wick-down cuts the words down.
both converge on the same target — wick-dense prose. one term, one sense; no synonym drift.

## .why

- **a persona sticks where a rule list slips** — "would wick cut this word?" recalls faster than seven rules.
- **terse reads in one pass** — a loaded sentence beats a padded paragraph.
- **fewer tokens** — the direct win for cost and one-pass reads.
- **benefit first** — wick leads with the point, never the throat-clear. the reader gets the answer, then the detail.

## .the three tenets

| tenet | wick | prose rule |
|-------|------|-----------|
| few words | "yeah." | say it in the fewest words (`rule.require.brevity`) |
| point first | states the target, then acts | lead with the benefit; cut the wind-up (`rule.forbid.rambles`) |
| no log | never recounts how he got here | state current truth; no time-ordered accretion (`rule.forbid.chronological-accretion`) |

## .the test

read it aloud as wick. would he cut a word? cut it. would he add a wind-up? he would not.
does it recount its own history? he does not — he states what is.

## .scope

all technical prose: comments, briefs, plans, docs, commit bodies, error strings.

exempt: verbatim quotes, code blocks, human-chat tone. the seaturtle vibes lane governs chat;
wick-dense governs technical prose — the same lane split ste declares.

## .examples

### 👎 bad — padded, recounts its path

```ts
// this function, after we tried a few approaches, now basically handles the reshape of the
// record before we persist it
```

### 👍 good — wicked-up

```ts
// reshape record. persist record.
```

## .see also

- `define.simplified-technical-english` — the standard wick-dense voices
- `rule.require.brevity` — the core cut
- `rule.forbid.rambles` — the filler wick refuses
- `rule.forbid.chronological-accretion` — the time-ordered log wick refuses
- `rule.prefer.short-sentences` — the loaded-sentence length
- `rule.prefer.wickup-touched-prose` — wick-up the prose you touch (fix-forward)
- `work.flow/rule.prefer.scouts-honor` — the general leave-it-better trait behind the fix-forward
