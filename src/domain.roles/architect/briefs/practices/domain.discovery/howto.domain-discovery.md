# howto.domain-discovery

## .what

domain discovery is how we surface a domain's true **objects**, **operations**, and the **ubiquitous language** that names them — before and while you model them in code. you find *what exists in the domain* and *what to call it*, so the code speaks the domain's own words.

## .why

- code that speaks ubiqlang is legible to domain experts and robots alike
- names found from the domain resist drift — no synonym sprawl, no overload
- objects and operations discovered early compose later (the garden)
- a term you did not discover is a term you will invent badly under deadline

## .the two things you discover

| kind | what | shaped as |
|------|------|-----------|
| domain-objects (dobjs) | the nouns the domain holds — `Surfer`, `SurfLesson`, `WaveReport` | `[...noun][state]?` |
| domain-operations (dops) | the verbs the domain performs — `genSurfLesson`, `setSurferSkillLevel` | `[verb][...noun]` |

## .how — the moves

discovery is a loop of **expand → collect**, run until the space converges (exhaust). several moves feed it:

1. **listen to the domain expert.** capture the exact word a practitioner uses. their noun is your dobj; their verb is your dop. do not translate — adopt.
2. **name from the motive.** name a term from *why* it exists, not from its mechanism. a motive-first name outlives any one implementation.
3. **decompose dimensionally.** factor a space into orthogonal axes and walk the product (`howto.dimensional-decomposition`). the axes are candidate attributes; the cells are candidate objects; the forbidden cells are invariants. this move surfaces objects and attributes you would otherwise miss.
4. **narrate a scenario as a timeline.** walk one concrete end-to-end scenario as an ordered sequence of events — "a customer requests a quote, the provider responds, the customer accepts, an invoice is drafted…". the nouns that recur are dobjs; the events are dops; the state each event changes is an attribute. a timeline exposes the domain in motion, where a static list hides it.
5. **probe the lifecycle.** for each object, ask what states it moves through and what event drives each move. the transitions are dops; the states are attributes.
6. **hunt the relationships.** for each object, ask what it references, what references it, and what makes it unique (natural key). refs and keys are domain facts, not implementation detail.
7. **vet the term.** once you have a candidate, check it against the ubiqlang rules: no synonym of an extant term, no ambiguous overload. one word per concept.

## .premier tactics

two moves pull the most weight — reach for them first:

- **dimensional decomposition** — walk the product of orthogonal axes to surface objects, attributes, and forbidden invariants (`howto.dimensional-decomposition`). the cells are candidate objects; the forbidden cells reveal hidden attributes and sub-types.
- **scenario timeline narration** — narrate a concrete scenario as an ordered timeline. recurring nouns are dobjs, events are dops, state changes are attributes. it surfaces the domain *in motion* and catches operations a static object-list misses.

## .the test — discovered, not invented

a term is discovered (not invented) when:

- a domain expert recognizes it with no gloss
- it names what IS, or why — never how
- it has exactly one sense in the domain
- it composes: the object nests, the operation chains

## .the caveat

discover what the domain holds today; do not invent speculative objects for a future that may never arrive (`rule.prefer.wet-over-dry`). a discovered gap is a note on record, not a mandate to build.

## .see also

- `howto.dimensional-decomposition.md` — one discovery move: walk the product to surface objects, attributes, and invariants
- `rule.require.domain-discovery-for-term-proposals` — when discovery is required before a term proposal
- `rule.require.persist-domain-term-evidence` — persist this discovery's evidence long-term
- `rule.require.ubiqlang` — one canonical word per concept
- `ubiqlang/rule.forbid.term.addition.ambiguous` / `.synonym` — vet a candidate term
- `rule.require.get-set-gen-verbs` (mechanic) — how a discovered dop is named
- `rule.require.treestruct` (mechanic) — how a discovered dobj/dop is shaped
- `philosophy.domain-as-a-garden.[philosophy]` — why discovered pieces compose over time
