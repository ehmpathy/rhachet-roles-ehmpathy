### .rule = forbid-term-fold

#### .what
the term `fold` is forbidden — `fold`, `folds`, and `folded`. it is overloaded and opaque: one word for eight senses, and there is always a more intuitive word

#### .scope
- code: variable names, function names, type names, comments
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions
- the bare word: the hook blocks it at write time
- `folder`, `scaffold`, and `unfold` are not banned; the hook passes them
- compound identifiers (`foldEvents`, `lesson_folded`): in scope where they are yours, but the hook passes them — `_` and a camel hump carry no word boundary — so review catches them

#### .why
- a reader must guess which sense was meant: a reduce over a list? a conclusion drawn from events? a merge of two parts? a collapse of an editor region?
- the functional-programmer sense is opaque to most readers; the plain words say the same and need no gloss
- each sense has a sharper word, and the sharper word names what is meant

#### .senses conflated by "fold"

| sense | 👍 sharper word |
| --- | --- |
| an entity from its events | `materialize`, `conclude` — the result is the conclusion |
| a pass over a list | `reduce`, `sum`, `total` |
| two parts into one | `merge`, `blend` |
| an editor region | `collapse` |
| a concern into a reply | `absorb` |
| paper | `crease` |
| a hand, a business | `concede`, `quit` |
| a pen for sheep | `pen` |

#### .exempt
- a verbatim quote (a title, a cited sentence)
- a name an external api or library dictates — an fp library's `fold`, an editor's fold command. the name is not yours to change: retry the write unchanged, and wrap it once under a name for its sense
- the briefs and the blocklist record that name the term itself: retry unchanged

#### .enforcement
- use of `fold`, `folds`, or `folded` outside the exempt cases = **BLOCKER**
- the `pretooluse.forbid-terms.blocklist` hook blocks the first write of the bare word; a deliberate retry passes, for the exempt cases above
- extant uses are swept on touch (`rule.prefer.wickup-touched-prose`), never in a mass rewrite

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=fold.example=demo` — a 👎/👍 demo
- `rule.require.ubiqlang` — one word per concept
- `rule.forbid.term=map` — a peer ban on a functional-programmer word
