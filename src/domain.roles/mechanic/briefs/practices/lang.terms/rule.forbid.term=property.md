### .rule = forbid-term-property

#### .what
the term `property` is forbidden — singular and plural. it is overloaded: one word for six senses. each sense has a clearer word

#### .scope
- code: variable names, function names, type names, comments
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions
- the bare word: the hook blocks it at write time
- `proper` and `properly` are not banned; the hook passes them
- compound identifiers (`hasOwnProperty`, `toHaveProperty`, `property_id`): in scope where they are yours, but the hook passes them — `_` and a camel hump carry no word boundary — so review catches them

#### .why
- a reader must guess which sense was meant: a field? a trait? a house? a law a test checks?
- each sense has a sharper word, and the sharper word names what the thing is

#### .senses conflated by "property"

| sense | 👍 sharper word |
| --- | --- |
| a named value on an object or record | `field`, `attribute` |
| an entry in a lookup | `key` |
| what an entity has — atomicity, isolation | `trait` |
| real estate | `residence`, `parcel` |
| what someone owns | `asset` |
| what a generative test checks | `law`; the test is a `generative test` |

#### .exempt
- a verbatim quote (a title, a cited sentence — "the ACID properties")
- a name an external api or spec dictates — `Object.defineProperty`, a css property, a library named for property-based tests. the name is not yours to change: retry the write, and wrap it once under a name for its sense

#### .enforcement
- use of `property` or `properties` outside the exempt cases = **BLOCKER**
- the `pretooluse.forbid-terms.blocklist` hook blocks the first write of the bare word; a deliberate retry passes, for the exempt cases above
- extant uses are swept on touch (`rule.prefer.wickup-touched-prose`), never in a mass rewrite

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=property.example=demo` — a 👎/👍 demo
- `rule.require.ubiqlang` — one word per concept
- `rule.forbid.term=state` · `rule.forbid.term=map` · `rule.forbid.term=model` · `rule.forbid.term=store` — the same shape of ban
