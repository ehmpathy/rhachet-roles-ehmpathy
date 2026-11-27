### .rule = forbid-term-nothing

#### .what
the term `nothing` is forbidden. it is a vague negation: it says that aught is absent, but not what, nor how

#### .scope
- code: variable names, function names, comments
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions
- logs and error strings
- the bare word: the hook blocks it at write time

#### .why
- a reader must guess which absence was meant: zero results? an empty collection? a value not present? a part left out on purpose?
- each absence has a different fix and a different test, so the vague word hides which branch the code took
- each sense has a sharper word, and the sharper word names what is absent or empty

#### .senses conflated by "nothing"

| sense | 👍 sharper word |
| --- | --- |
| a query that matched zero records | `no results`, `none` |
| a collection with zero items | `empty` |
| a value not present | `absent` |
| a part left out on purpose | `omitted` |
| no single one of a set | `not one` |

#### .exempt
- a verbatim quote (a title, a cited sentence)
- a name an external api or library dictates. the name is not yours to change: retry the write unchanged
- the briefs and the blocklist record that name the term itself: retry unchanged

#### .enforcement
- use of `nothing` outside the exempt cases = **BLOCKER**
- the `pretooluse.forbid-terms.blocklist` hook blocks the first write of the bare word; a deliberate retry passes, for the exempt cases above
- extant uses are swept on touch (`rule.prefer.wickup-touched-prose`), never in a mass rewrite

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=nothing.example=demo` — a 👎/👍 demo
- `rule.require.ubiqlang` — one word per concept
