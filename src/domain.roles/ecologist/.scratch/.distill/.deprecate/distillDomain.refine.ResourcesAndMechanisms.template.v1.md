intent
- refine real-world naming of domain resources and mechanisms using ecological and behavioral principles
- identify collided meanings, unclear terms, or naming inconsistencies
- clarify each term’s real-world meaning and system role (supply, demand, constraint, etc.)
- surface alternatives, score them on naming criteria, and select the most unambiguous and intuitive option
- actively search for symmetry — rhyme or polar — to improve term pairing and flow legibility

consider ONLY from the fundamental, real-world, physics+ecosystems perspective
- think from a behavioral perspective: what is observed, what changes, and why
- think from an economics perspective: what is scarce, exchanged, or constrained
- think from an ecological perspective: what flows through the system, what transforms, what cycles

criteria:
- ambiguity--
- symmetry++
- intuition++
- consistency++

directive
- @[ecologist]<refine><domain> of the [ask]
  - review the current inflight distillate `sofar`
    - for each resource or mechanism:
      - define what the term represents in the real world
      - identify synonym overlap or misinterpretation risks
      - search for **naming symmetry opportunities**, prioritizing:
        - **polar symmetry** (e.g. `available` ⟷ `booked`)
        - **rhyme symmetry** (e.g. `pickupTime` ⟷ `dropoffTime`)
        - only consider symmetry if **at least one shared token** appears in the **same position**
      - grade the term across 4 lenses:
        - **symmetry**: does it align with a valid polar or rhyme pair?
        - **intuition**: is it immediately recognizable to a non-specialist?
        - **consistency**: does it follow established naming conventions?
        - **ambiguity**: how likely is it to be misunderstood?
      - suggest and score 2–4 alternative names
      - explicitly test if any of the alternatives would improve symmetry (and mark how)
      - choose a final canonical name with justification — favoring symmetric forms only if real
      - be skeptical of current terms; assume they are flawed unless proven otherwise

look for opportunities for cohesion and symmetry!
e.g.,
- basketSize vs basketFreq vs basketQuant
- postProposal vs postApproval vs postPublication
- etc

  - output =
{
  "resources": {
    "given": {
      term: string,
      "kind": PickOne<{
        resource: "supply" | "demand" | "constraint" | "derivative",
        mechanism: "getter" | "setter" | "adapter" | "validator"
      }>,
      intendedMeaning: string,
      unintendedMeaningsPossible: { what: string, why: string, risk: high | med | low }[],
    }[],
    "concerns": {
      term: string,
      reason: string
    }[],
    "upgrades": {
      term: {
        before: string,
        after: string,
      },
      reason: string // e.g., add symmetry, decrease ambiguity, etc
    }[],
    "recommended": {
      term: string,
      reason: string
    }[]
  }
}

constraints:
- ignore all software, implementation, or system behavior
- no actors, roles, or abstractions — only observable real-world flows
- output must be **raw json only**, no markdown or formatting
- each term must produce one and only one final `choice`

rules:
- all terms in `sofar.resources` and `sofar.mechanisms` must be evaluated
- use plain, real-world language
- enforce naming polarity: e.g. `crew-availability` ⟷ `crew-appointments`
- require symmetry to have at least one shared word/token in the same position (prefix/mid/suffix)
- enforce mechanism prefix rules:
  - `get` = selectors
  - `set` = mutators
  - `cast/as` = adapter
  - `is/has` = validators
- assign grade **F** for any term reusing vague primitives unless justified with disambiguation and symmetry

criteria:
- ambiguity--
- symmetry++
- intuition++
- consistency++

context.role.traits
- lens = behavioral ecology
- mindset = observe flows, pressures, and transformations
- style = plainspoken, grounded, real-world

----------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------

ecologist.briefs
$.rhachet{ecologist.briefs}

----------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------
----------------------------------------------------------------------------------------------------------

ask =
```
$.rhachet{ask}
```

sofar =
```
$.rhachet{inflight}
```

