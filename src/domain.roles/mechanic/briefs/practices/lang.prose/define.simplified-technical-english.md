# define.simplified-technical-english

## .what

**simplified technical english (ste)** = our telegraphic overlay of asd-ste100, entrained onto
all technical prose. it holds prose to one word per concept, short active sentences, and
brevity — so a reader of any first language parses it in one pass, at the fewest tokens.

ste governs the `lang.prose/` cluster. the rules below decompose it; this brief anchors them.

## .why

- **signal:noise** — one word per concept, no synonym sprawl. the reader decodes the sense, not the surface words.
- **any-language legibility** — ste's original purpose (aircraft manuals for non-native readers).
- **fewer tokens** — short sentences, no filler, no articles.
- **correctness** — brevity forces grasp. you cannot compress an idea you do not understand.

## .the source

asd-ste100 = a real, cited international standard (current edition january 2025). origin =
european aerospace (aecma, 1980s), for maintenance docs that non-native english speakers read
cleanly. two parts: 53 write-rules (9 sections) + a controlled dictionary (~900 approved words).

we adopt the **write-rules**, curated. we do **not** import the 900-word dictionary.

## .our deliberate divergence — telegraphic overlay

standard ste mandates articles and complete sentences. we invert that one rule: we **drop
articles and copulas** for a telegraphic register. `remove filter from case.`, not
`Remove the filter from the case.` this keeps ste's disambiguation wins while it cuts tokens,
and it aligns with the house terse, lowercase style.

all else ste — active voice, one instruction per sentence, short sentences, one word per
concept — we keep.

## .scope

governs all technical prose, procedural and long-form:
- code comments, jsdoc headers
- plans, briefs, docs, readmes
- commit messages, pr descriptions
- error strings, log lines

a long-form brief gains *more* from brevity, not less — it draws more readers.

## .exemptions

- **verbatim quotes** — a cited quote keeps its original words. we cannot rewrite someone else.
- **code blocks** — code is not prose.
- **human-chat tone** — the `lang.tones/` seaturtle vibes govern chat. ste governs technical prose. lanes stay separate.
- **declared technical names** — domain ubiqlang terms (`findsert`, `IsoPriceWords`, `dobj`) stay legal. ste governs the grammar around them, never the terms themselves.

## .the rules it decomposes into

| rule | what |
|------|------|
| `rule.require.brevity` | say it in the fewest words; brevity proves grasp |
| `rule.forbid.rambles` | the negative peer; names the ramble smell |
| `rule.avoid.articles-copulas` | drop the/a/is — telegraphic overlay |
| `rule.prefer.one-instruction-per-sentence` | one idea per sentence |
| `rule.prefer.short-sentences` | ≤~20 words per sentence |
| `rule.avoid.passive-voice` | "X handles Y", never "Y is handled by X" |
| `rule.prefer.active-simple-tense` | simple present/past |
| `rule.forbid.chronological-accretion` | state current truth; no time-ordered log |

`define.wick-dense` names the persona that voices this overlay — the terse john-wick ideal these
rules serve. stacks on the extant `lang.terms/rule.forbid.gerunds` and `rule.require.ubiqlang`.

## .see also

- `define.wick-dense` — the terse persona this overlay voices; the aliases wicked-up / wick-up
- `lang.terms/rule.require.ubiqlang` — one word per concept, for code names (ste's twin, for terms)
- `lang.terms/rule.forbid.gerunds` — ste also bans -ing nouns
- `lang.tones/rule.prefer.lowercase` — the terse, lowercase house style ste aligns with

## .sources

- https://www.asd-ste100.org/
- https://en.wikipedia.org/wiki/Simplified_Technical_English
- https://www.asd-europe.org/standards-specifications/simplified-technical-english/
