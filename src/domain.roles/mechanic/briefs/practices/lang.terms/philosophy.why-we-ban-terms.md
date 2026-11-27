# philosophy.why-we-ban-terms

## .what

we ban a word when it pulls every writer toward it and names several concepts at once. the ban removes the word, never the concepts: each concept gets its own sharper name.

## .concept space has gravity

the thinker role pictures concept space as a galaxy (`cog021.metaphor.galactic_spacetravel`, `cog151.concept.treestruct.gravity`, bhrain/thinker). every concept exerts gravity. thought "snaps to the nearest core", and imprecise navigation lands wherever the strongest pull is: "avoid vague inputs that leave gravity to decide the landing."

the more abstract a concept, the nearer the center and the stronger its pull. at the very center sits `"concept"` itself — "the black hole at the center of all abstraction."

## .a heavy word is a black hole

some words sit so near that center that they pull in whatever drifts close. `hold` takes whatever is paused, kept, or awaited. `state` takes whatever is true right now. `map` takes whatever relates one thing to another. a writer reaches for the word before the thought is sharp, and the fit feels like precision. it is the opposite: the word fits because its pull is wide enough to swallow a thought not yet decided.

past the horizon, distinctions do not come back. a paused campaign, an open refund, and a draft invoice fall into `hold` and come out as one word. no reader can tell from the word which of the three it meant.

## .one word swallows several concepts

once the word lands, it stays. it becomes a function name, a type, a column, a status, an api field. each new reader picks one sense, and no two readers need pick the same one. the code compiles; the confusion shows up later, in a review that argues past itself or a defect that two people each thought was the other's case.

a peer repo measured this (`rule.forbid.term=hold.example=one-word-three-concepts`): one codebase used `hold` for three concepts. two of the three already had precise names in its own domain. the third needed a new one. the word did not add meaning. it hid which meaning was meant.

## .brains fall in too

in the thinker's lesson, a brain is a spaceship: a fast engine, directionless without coordinates. its engine follows gravity — it reaches for the likeliest word, and the likeliest word is the heaviest. so a clone under no deadline still writes `hold`, because `hold` is what the text it learned from wrote.

and the pull compounds: a name with `hold` in it is a coordinate every later clone reads. each one lands in the same orbit and writes the word again — "strong but wrong orbits", in the thinker's words. the ban guards the clone and the human alike.

## .a ban bends the field

the thinker brief names the lever: "systems can intentionally bias gravity (e.g., prompts, education, interfaces)." a term ban is that lever, set where it counts.

advice cannot do it. the pull is strongest exactly when attention is weakest, so a brief that says "prefer a sharper word" is read when the writer is calm and forgotten when the writer is rushed.

a hook acts at the one moment that matters: the write. it fills in the well, so the thought has to land on a precise star. it asks the question the word let the writer skip — *which concept do you mean?* — and offers one sharper word per sense. the answer is domain discovery in miniature (`rule.require.ubiqlang`, and the architect's `def.domain-discovery`). often the precise word already exists in the domain, and the ban simply sends the writer to it.

## .the asymmetry

| choice | cost |
|---|---|
| ban the word | a retry for each legitimate use: a verbatim quote, a name an external api dictates |
| permit the word | an ambiguity that every reader pays, in every name it spreads into, for as long as the code lives |

the first cost is paid once, by the writer, at the moment of choice. the second compounds. a ban is a constraint that shrinks the space of readings, and fewer readings is the whole point (`philosophy.constraints-shrink-the-space`, architect).

## .the test for a new ban

ban a word when both are true:

1. **it is heavy** — writers reach for it by default, for more than one kind of thing
2. **each sense has a sharper word** — in the domain, or in plain language

a word that names one concept is never banned, however vague it feels. a word with no sharper alternative is a gap in the vocabulary, and the fix is to discover the term, not to ban the only one available.

## .see also

- `rule.require.ubiqlang` — one word per concept, one concept per word
- `rule.forbid.gerunds` — the same reflex, for words that hide who acts
- `rule.forbid.term=*` — each ban, with its senses and sharper words
- `rule.require.term-bans-in-blocklist` (repo=.this) — what each ban owes
- `cog151.concept.treestruct.gravity` (bhrain/thinker) — concept gravity; `concept` as the black hole at the center
- `cog021.metaphor.galactic_spacetravel.kind=lesson` (bhrain/thinker) — the brain as a spaceship; precise coordinates over gravity's pick
