# def.domain-discovery

## .what

**domain discovery** is the work to exhume, unearth, and discover the fundamental truth
of a domain — the objects, operations, and language that *already exist* beneath the
surface — so the code speaks the domain's own words.

the operative word is **discover**, not invent. the truth is already there, buried under
surface mechanism, incidental jargon, and the shape of whatever tool touched it last. the
architect's job is to dig it out intact, not to author a convenient substitute.

> discovery unearths what IS. invention fabricates what is not.

## .the ground truth is the real world

the truth you dig for lives in the **real-world domain** — the actual practice, the people
who do the work, the objects and events as they exist before any software touched them. it
does **not** live in any software's description of that domain.

a database schema, an api response, a legacy class name, a screen's field labels — each is
a *map*, drawn by some engineer under some deadline, lossy and incidental. the real-world
domain is the *territory*. discovery grounds every term in the territory, never in a map.

> the map is not the territory. the schema is not the domain.

so when a surf instructor says "a surfer books a lesson," that sentence — from the person
who lives the domain — is ground truth. the `reservations` table that stores it is a map of
that truth, and a poor one. name the object `SurfLesson` because the instructor's world
holds a lesson, **not** `Reservation` because a table happened to store it that way.

the tell: when the code's word and the domain expert's word disagree, the domain expert is
right. the software named its own convenience, not the domain itself.

## .the objective

surface the domain's fundamental truth:

- **the true objects** — the nouns the domain holds (`Surfer`, `SurfLesson`, `WaveReport`),
  as the domain holds them, not as a table or a json blob happens to shape them
- **the true operations** — the verbs the domain performs (`genSurfLesson`,
  `setSurferSkillLevel`), named from *why* they exist, not *how* they run
- **the true language** — the one canonical word a domain expert uses for each concept,
  with no synonym sprawl and no overload

a term that names the surface (the mechanism, the storage, the api of the day) decays with
that surface. a term that names the buried truth outlives every rewrite.

## .buried beneath the surface

the truth hides under layers that must be dug through:

| the surface (what you see first) | the truth beneath (what discovery unearths) |
|----------------------------------|---------------------------------------------|
| the shape a database row imposes | the object the domain actually holds |
| the jargon of the last tool used | the word the domain expert actually says |
| *how* a step is implemented today | *why* the step exists at all |
| a synonym borrowed under deadline | the one canonical term for the concept |

the deeper you dig past the surface, the more durable the term you unearth — because you
name the motive, and motives outlast mechanisms.

## .the test — discovered, not invented

a term is unearthed truth (not authored fiction) when:

- a domain expert recognizes it with no gloss
- it names what IS, or why — never how
- it has exactly one sense in the domain
- it composes: the object nests, the operation chains

if you cannot point to where it already lived in the domain, you invented it — dig deeper.

## .the caveat

exhume what the domain holds today; do not fabricate speculative objects for a future that
may never arrive (`rule.prefer.wet-over-dry`). a truth you cannot yet find is a note on
record, not a mandate to build.

## .see also

- `ref.domain-discovery.fundamentals` — the cited canon this definition grounds in
- `howto.domain-discovery` — the moves that do the exhumation
- `howto.dimensional-decomposition` — a premier discovery tactic
- `rule.require.domain-discovery-for-term-proposals` — discovery required before a term proposal
- `rule.require.persist-domain-term-evidence` — persist the unearthed evidence long-term
- `rule.require.ubiqlang` (mechanic) — one canonical word per concept
- `philosophy.domain-as-a-garden.[philosophy]` — why unearthed pieces compose over time
