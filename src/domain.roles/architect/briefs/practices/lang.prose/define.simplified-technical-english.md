# define.simplified-technical-english

## .what

**simplified technical english (ste)** = a telegraphic overlay of asd-ste100, entrained onto all
technical prose the architect writes — briefs, plans, domain docs, decision records.

it holds prose to one word per concept, short active sentences, and brevity. a reader of any
first language then parses it in one pass, at the fewest tokens.

this brief anchors the `lang.prose/` rules that decompose it.

## .why

- **signal:noise** — one word per concept, no synonym sprawl. the reader decodes the sense, not the surface words.
- **any-language legibility** — ste's original purpose (aircraft manuals for non-native readers).
- **fewer tokens** — short sentences, no filler, no articles.
- **correctness** — brevity forces grasp. you cannot compress an idea you do not understand. simplicity proven via brevity (feynman).

## .the source

asd-ste100 = a real, cited international standard (current edition january 2025). origin =
european aerospace (aecma, 1980s), for maintenance docs that non-native english speakers read
cleanly. two parts: 53 write-rules (9 sections) + a controlled dictionary (~900 approved words).

we adopt the **write-rules**, curated. we do **not** import the 900-word dictionary — it would
fight our domain vocabulary.

## .our deliberate divergence — telegraphic overlay

standard ste mandates articles and complete sentences. we invert that one rule: we **drop
articles and copulas** for a telegraphic register. `remove filter from case.`, not
`Remove the filter from the case.` this keeps ste's disambiguation wins while it cuts tokens.

all else ste — active voice, short sentences, one word per concept — we keep.

## .scope

governs all technical prose the architect writes: briefs, plans, domain docs, decision records.

a long-form brief gains *more* from brevity, not less — it draws more readers. the depth lives in
the composition of many short sentences, not in a long clause.

## .exemptions

- **verbatim quotes** — a cited quote keeps its original words (e.g. the martin or margulis quotes in a philosophy brief).
- **code blocks** — code is not prose.
- **declared technical names** — domain ubiqlang terms (`findsert`, `IsoPriceWords`, `dobj`) stay legal. ste governs the grammar around them, never the terms themselves.

## .the rules it decomposes into

the architect entrains the four highest-value rules of the overlay:

| rule | what |
|------|------|
| `rule.require.brevity` | say it in the fewest words; brevity proves grasp |
| `rule.forbid.rambles` | the negative peer; names the ramble smell |
| `rule.prefer.short-sentences` | ≤~20 words per sentence; long-form too |
| `rule.avoid.passive-voice` | "X does Y", never "Y is done by X" |
| `rule.forbid.chronological-accretion` | state current truth; no time-ordered log |

`define.wick-dense` names the persona that voices this overlay — the terse john-wick ideal these
rules serve (aliases: wicked-up, wick-up).

the mechanic role holds the full overlay — it adds `avoid.articles-copulas`,
`require.one-instruction-per-sentence`, and `require.active-simple-tense` on top of these four.
the architect adopts that full overlay by reference; the four above are the architect-primary set.

stacks on the `ubiqlang/` cluster (one word per concept, for terms).

## .see also

- `define.wick-dense` — the terse persona this overlay voices; the aliases wicked-up / wick-up
- `ubiqlang/rule.forbid.term.addition.synonym` — ste's one-word-one-concept rule, for terms
- `ubiqlang/rule.require.ubiqlang` — the term twin of this prose overlay

## .sources

- https://www.asd-ste100.org/
- https://en.wikipedia.org/wiki/Simplified_Technical_English
