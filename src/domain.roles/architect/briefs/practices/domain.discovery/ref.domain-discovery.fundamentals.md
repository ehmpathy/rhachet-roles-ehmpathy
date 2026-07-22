# ref.domain-discovery.fundamentals

## .what

the established, cited canon the architect grounds domain discovery in. when a move in
`howto.domain-discovery` claims a term is "discovered" or "grounded in the domain" or
"named from the motive", the claim traces to one of these fundamentals — not to taste.
read this to know *why* the moves are the moves.

these are the human-factors and analysis principles behind a fit-to-domain model. they
predate any one language or framework and translate across all of them — the architect
applies the *principle*, not the tool it was first written for.

## .the canon

### ubiquitous language (eric evans, *domain-driven design*, 2003)

> a language structured around the domain model and used by all team members to connect
> all the activities of the team with the software.

the model — and the code — must speak the **one language** the domain experts speak. a term
that lives only in the code, with no counterpart in the domain's own speech, is a defect.
this is the backbone of discovery: the words are found in the domain, not authored at the
keyboard.

backs the **listen to how folks talk** and **vet the term** moves, and `rule.require.ubiqlang`.

### the map is not the territory (alfred korzybski, *science and sanity*, 1933)

> a map is not the territory it represents, but, if correct, it has a similar structure to
> the territory, which accounts for its usefulness.

a database schema, an api response, a class name — each is a **map** of the domain, drawn by
an engineer, lossy and incidental. the real-world domain is the **territory**. discovery
grounds every term in the territory, never in a map. when the map's word and the territory's
word disagree, the territory wins.

backs the **the ground truth is the real world** section of `def.domain-discovery`.

### genchi genbutsu — "go and see" (toyota production system)

> go to the actual place, look at the actual object, to understand the actual situation.

you do not discover a domain from a diagram of it. you go to where the work happens, watch
the people who live it, and hear the words they use in the moment. discovery is fieldwork,
not deskwork.

backs the **listen to how folks talk** move and the real-world ground of `def.domain-discovery`.

### the five whys (sakichi toyoda / taiichi ohno, toyota)

> ask "why" five times, answer each in turn, and you reach the real cause of a problem —
> a cause often hidden behind more obvious symptoms.

each "why?" strips one layer of surface mechanism. the answer that no longer shifts is the
buried motive — and the motive is what you name. the same drill that finds a root cause finds
a root *concept*.

backs the **ask the five whys** move and pairs with `rule.require.solve-at-cause`.

### event-storm discovery (alberto brandolini, ~2013)

> a workshop-based method to quickly find out what occurs in the domain of a software
> program … explore the domain, walk its domain events along a timeline with the experts.

walk a concrete experience as an ordered sequence of **domain events**, with the experts in
the room. the nouns that recur are the objects; the events are the operations; the state each
event changes is an attribute. the domain reveals itself *in motion*.

backs the **demonstrate the experience as a narrative** move and the **probe the lifecycle** move.

### behavior-driven development — given/when/then (dan north, ~2006)

> a semi-formal format for behavioural specification, borrowed from user story
> specifications: given \[precondition], when \[event], then \[outcome].

once the raw narrative is told, distill it into ordered given/when/then steps. the *given*
names the precondition state, the *when* names the operation, the *then* names the end state.
this refines the operations and their state transitions into a precise, checkable form —
still in the domain's own language.

backs the **distill to a bdd timeline** half of the narrative move.

### morphological analysis (fritz zwicky, ~1940s)

> the totality of the relationships … obtained by construction of a morphological box, whose
> cells are the possible configurations of the chosen parameters.

factor a space into orthogonal axes and walk the full product. the axes are candidate
attributes; the cells are candidate objects; the forbidden cells are invariants. a systematic
walk surfaces objects and rules an ad-hoc list misses.

backs the **decompose dimensionally** move and `rule.require.dimensional-decomposition`.
detailed history in `def.dimensional-decomposition.history.morphological-analysis`.

## .how the canon maps to our moves and rules

| fundamental | discovery move / rule |
|-------------|-----------------------|
| ubiquitous language (evans) | listen to how folks talk · vet the term · `rule.require.ubiqlang` |
| map is not the territory (korzybski) | `def.domain-discovery` — the ground truth is the real world |
| genchi genbutsu / go-and-see (toyota) | listen to how folks talk · real-world ground |
| the five whys (toyoda / ohno) | ask the five whys · `rule.require.solve-at-cause` |
| event-storm discovery (brandolini) | demonstrate the experience as a narrative · probe the lifecycle |
| bdd given/when/then (north) | distill the narrative to a bdd timeline |
| morphological analysis (zwicky) | decompose dimensionally · `rule.require.dimensional-decomposition` |

## .see also

- `def.domain-discovery` — the scorable definition these fundamentals ground
- `howto.domain-discovery` — the moves these fundamentals back
- `howto.dimensional-decomposition` — the morphological-analysis move in full
- `def.dimensional-decomposition.history.morphological-analysis` — the zwicky history
- `rule.require.domain-discovery-for-term-proposals` — when discovery is required
- `rule.require.persist-domain-term-evidence` — persist the unearthed evidence
- `philosophy.domain-as-a-garden.[philosophy]` — why unearthed pieces compose over time

## .sources

- [Eric Evans, *Domain-Driven Design*](https://www.domainlanguage.com/ddd/) — ubiquitous language
- [Martin Fowler, UbiquitousLanguage](https://martinfowler.com/bliki/UbiquitousLanguage.html)
- [Alfred Korzybski, "the map is not the territory"](https://en.wikipedia.org/wiki/Map%E2%80%93territory_relation)
- [Genchi Genbutsu (Toyota)](https://en.wikipedia.org/wiki/Genchi_Genbutsu)
- [The Five Whys](https://en.wikipedia.org/wiki/Five_whys)
- [Alberto Brandolini, event-storm discovery](https://www.eventstorming.com/)
- [Dan North on behaviour-driven development](https://dannorth.net/introducing-bdd/)
- [Fritz Zwicky, morphological analysis](https://en.wikipedia.org/wiki/Fritz_Zwicky)
