# reflection: the single-source census

## .the defect

the first abstraction inventory (P01–P16) drew every row from dijkstra's notes and his 1970s peers, through dijkstra's lens: aids to *prove* programs. so proof techniques (enumeration, induction) sat in an abstraction list, and loop termination took an always-booted brief. the wisher: *"dijstra was just one archeological source on abstraction. he's not the only source."*

## .why it was possible — four gaps, each one let the next through

| # | gap | how it showed |
|---|---|---|
| 1 | **the frame of the request became the scope of the answer** | the wish was a dijkstra chat, so a new question asked inside it was sourced from whoever was already in the room. the same anchor weighted loops by their prominence in 1972, not their relevance today |
| 2 | **a source's lens became the concept's definition** | abstraction was never defined before its members were listed. EWD 249 lists "mental aids" for proof, so proof became the frame, and two proof techniques joined because they shared a list with abstraction |
| 3 | **our own knowledge was not censused first** | this repo already practices most fundamental tactics (domain objects, grains, iso glossaries, declastruct, layers, wet-over-dry). none was checked before a 1972 paper was. (correction to the in-chat account: "our" in the pasted line is dijkstra's own word, not the wisher's; the wisher set ours-first as the scope afterward) |
| 4 | **every check graded accuracy, none graded selection** | the self-review asked whether each claim was fetched and quoted right — it was. no self-review and no peer lane asked whether those were the right sources. a verified quote proves the quote, not that its source represents the field |

the librarian already holds half the cure: `howto.curate-an-inventory` move 1 — *if any dimension is open, stop; build a catalog, not a census*. "abstraction patterns" is an open concept. a census was run over one author's list and called complete.

## .proposed rules — to lift via dispatch

checked `ehmpathy/rhachet-roles-bhrain` origin/main, 2026-10-24: the librarian holds 11 rules, none on these gaps; the researcher holds 3 (bhrowser, no websearch, classify the yield); **no skeptic role exists**. placement is the wisher's call.

### librarian — how knowledge is organized

| rule | says | closes |
|---|---|---|
| `rule.require.define-before-inventory` | define the concept in its own terms, from more than one source, before you list its members. an entry joins by the definition, never because it shares a source's list | gap 2 |
| `rule.require.ours-first` | when the subject is knowledge we already practice, census our own briefs and code first. external canon backs our entries and fills gaps; it never stands in for them | gap 3 |
| `rule.forbid.single-source-census` | an inventory of an open concept drawn from one author or era is a catalog *of that source*, named so (`catalog.of=abstraction.from=dijkstra`); it may not claim the concept | gaps 1, 2 — extends `howto.curate-an-inventory` move 1 |
| `rule.require.declare-each-source-lens` | each source carries the question it answered (EWD 249: aids for proof). a source's lens may not become the concept's definition | gap 2 |

### skeptic — question the frame and the sources, not only the claims

| rule | says | closes |
|---|---|---|
| `rule.always.ask-whose-frame` | when a question arrives inside a context (a transcript, a quoted author, a prior thread), ask: does the question's scope equal the context's scope? a new question in an old thread is still new | gap 1 |
| `rule.always.weigh-by-today` | rank a topic by its relevance to today's reader, never by its prominence in the source | the loop focus |
| `rule.forbid.verified-as-representative` | a check of accuracy is not a check of selection. ask both: is the quote real, and is this the right set of voices? name the authors, eras, and lenses; flag a set from one source | gap 4 |

### route templates — reseed to bhuild

a self-review `has-questioned-sources` on the vision stone: how many independent sources, of which eras and lenses, and was our own knowledge censused first? it guards gap 4 at the moment it bites.

## .a second defect: the example noun no one vetted

the case 1 example object was first named `LessonHold`. the wisher caught it: *"hold is such an ambiguous term. why wasnt that selfcaught?"* — a reservation hold, a payment hold, "on hold", a legal hold, and the verb in "the invariant holds", which collides in every invariant brief. the word the domain's people use is `LessonReservation`.

how it got through:

- the gerund hook blocked "booking", and the nearest non-gerund word was grabbed with no discovery run
- the booted five-whys example (`holdSurferSlot`) primed it
- discovery was run for the repo term "enforcer", but example nouns were treated as exempt
- no self-review asks whether a word in a brief reads one way only

proposed librarian rules:

- `rule.always.discover-on-blocked-term` — a hook or rule that blocks a word is a cue to find the domain's own word, never to grab a synonym
- `rule.require.vet-example-nouns` — every noun in a brief's example passes the ubiqlang test (one sense, the domain's own word), since every clone copies it. vet it; do not record it as a repo term — `domain.terms/` holds only this repo's own vocabulary

## .status

placement ruled: librarian rules → the extant bhrain librarian; skeptic rules → a new skeptic role. each lands as a reseed dream for dispatch.
