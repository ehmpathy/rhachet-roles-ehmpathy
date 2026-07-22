# howto.dimensional-decomposition

## .what

to discover the **full** space of a system's variants, factor the design into **orthogonal axes**, take their **Cartesian product**, and inspect **every cell** — not just the ones already named.

this is the classical **morphological analysis** move (Fritz Zwicky's morphological box) — also called faceted or factorial decomposition. the technique is old; the discipline is to actually walk the product instead of a halt at the handful of combinations that came to mind first.

## .why

an ad-hoc list of named features hides two facts the matrix makes loud:

- **the gaps** — valid combinations not yet built (opportunities)
- **the forbidden** — combinations that are structurally impossible (constraints)

a linear list shows only what exists. the product shows what *could* exist and what *must never* — and that is where the design insight lives. you reason about a space, not a pile.

## .the method

1. **name the axes.** find the independent dimensions of variation. each axis is a small closed set of values. the axes must be **orthogonal** — a value on one does not imply a value on another. if two axes correlate, they are one axis; if a value spans two concepts, split it.
2. **take the product.** enumerate every tuple `(a, b, …)` across the axes. this is the full space, by construction.
3. **verdict each cell.** every cell is exactly one of three:

| verdict | sense | what to do |
|---------|-------|-----------|
| **filled** | built and named | confirm it maps to a real object |
| **gap** | valid but unbuilt | an opportunity — build, or defer deliberately |
| **forbidden** | structurally impossible | a constraint — record *why* it cannot exist |

4. **read the empties.** the filled cells confirm what you know; the **empty** cells carry the new information. a gap is a road not taken; a forbidden cell is a law of the domain surfaced.

## .the payoff

- **completeness of consideration** — you have accounted for every combination, so a reviewer can see none was missed
- **gaps become a backlog** — unbuilt-but-valid cells are a ranked opportunity list
- **forbiddens become invariants** — an impossible cell, with its reason, is a checkable rule (often it points straight at a safety or structural constraint)
- **names fall out of the axes** — when the axes are the ubiquitous language, the cell names derive by rote (`{method}-{target}`) instead of drift ad-hoc (pairs with `rule.require.ubiqlang`)

## .relation to domain discovery

dimensional decomposition is not only a completeness check on a *feature* space — it is a **domain discovery** tool. when you factor a space into axes and walk the product, the axes are candidate **attributes** of the domain's objects, and the verdicts reveal the domain's **structure**:

- a **filled** cell is a real object or state the domain holds
- a **gap** hints at an attribute combination the domain permits but has not named yet
- a **forbidden** cell often reveals that two axes are not fully orthogonal — one attribute does not apply to some value of another. that is a discovery: the domain has a sub-type, and the attribute belongs to only one branch of it

so the grid does double duty: it enumerates the variant space AND surfaces the **objects, attributes, and relationships** that make up the domain to begin with. before you know what a Customer or a Plan even *is*, a walk of the product sketches its shape. you get a clearer picture of the domain space — not just what to build, but what the domain IS.

this is why decomposition pairs so tightly with domain-driven design: the axes become ubiqlang, the cells become domain objects, and the forbidden cells become the invariants that bound them.

## .the caveat — consider every cell, do not build every cell

the matrix is for completeness of **consideration**, not completeness of **implementation**. a fill of every cell just because it exists is over-build — it collides with wet-over-dry (`rule.prefer.wet-over-dry`) and speculative-abstraction hazards.

the discipline is: **account** for every cell (mark it filled, gap, or forbidden) — then build only the cells the work actually needs. a deferred gap is a *decision on record*, not a *todo you owe*.

## .worked example — a seaturtle surf-school lesson matrix 🐢🏄

a chill seaturtle runs a surf school. in Zwicky's terms (see `def.dimensional-decomposition.history.morphological-analysis`), the lesson menu factors into three **parameters**, each with a small set of **values**:

    parameter: board  →  {foamboard, longboard, shortboard}      (3)
    parameter: shore  →  {beach break, reef break, point break}  (3)
    parameter: wave   →  {whitewater, open face}                 (2)

(`beach break` = sandy bottom, forgiving; `reef break` = coral/rock bottom, powerful and hazardous; `point break` = wave wraps a headland, long ride. `whitewater` = the broken foam a beginner learns on; `open face` = the unbroken green wall a carver drops into.)

the full box is 3 × 3 × 2 = **18 configurations** — already more than the menu ever listed, and that multiplicative growth is exactly the combinatorial-explosion caveat.

take the **board × shore** slice, set the wave axis aside for a moment — that is a clean **3 × 3 = 9** grid. a **cross-consistency assessment** of each cell — "can these two values coexist?" — yields its verdict:

|                | beach break (sand)        | reef break (coral)                          | point break (headland)                      |
|----------------|---------------------------|---------------------------------------------|---------------------------------------------|
| **foamboard**  | beginner lesson           | *(forbidden — a first-timer over a sharp, shallow reef; a safety line the domain must never cross)* | *(gap — a foam board can't hold the long point wall; rarely taught)* |
| **longboard**  | cruiser lesson            | reef longboard lesson                       | noserider lesson                            |
| **shortboard** | *(gap — a shortboard sinks in mushy beach foam)* | advanced reef lesson              | advanced point lesson                       |

now layer the third axis, **wave**. it doubles every surviving cell (whitewater vs open face), and that is where the real discovery surfaces: a foamboard belongs to whitewater, an open face belongs to a carver. `foamboard × open face` is forbidden in *every* shore.

what the walk revealed that the named menu did not:
- **filled** — real lessons map to real objects
- **gaps** — shortboard on a beach break, foamboard on a point break: possible, unoffered, now on record rather than forgotten
- **forbidden** cells — foamboard on a reef (safety) and foamboard on an open face (skill): cross-consistency failures that become checkable invariants
- a **hidden dimension** — the forbidden cells expose that board, shore, and wave are *not* independent; each projects onto a latent fourth parameter, `skillLevel`. the box the menu never named: a `Lesson` needs a `skillLevel` that its `Board`, `Shore`, and `Wave` must all agree on

the empty cells did the work: opportunities where they were gaps, laws of the domain where they were forbidden — and the growth from a 9-cell slice to an 18-cell box to a hidden `skillLevel` is how the domain reveals its true shape. 🌊

## .when to reach for it

- a feature space that extends one ad-hoc name at a time
- a review where "did we consider it all?" has no crisp answer
- a domain with **safety constraints** (some combinations must be impossible) — the forbidden cells become your invariant list
- name drift — when the same concept gets three labels, the axes give one

## .see also

- `rule.require.dimensional-decomposition.md` — the mandate to apply this on a variant space that extends
- `def.dimensional-decomposition.history.morphological-analysis.md` — the origin (Zwicky's morphological box) and citations
- `howto.domain-discovery.md` — the broader practice: elicit the domain's objects, operations, and ubiqlang; decomposition is one of its moves
- `philosophy.domain-as-a-garden.[philosophy]` — the domain reveals itself; the grid is one way to see it
- `rule.require.ubiqlang` — why axis-derived names beat ad-hoc names
- `rule.prefer.wet-over-dry` — the caveat: consider all, build only what is needed
