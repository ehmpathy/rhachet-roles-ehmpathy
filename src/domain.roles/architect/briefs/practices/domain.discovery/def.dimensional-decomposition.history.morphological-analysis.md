# def.dimensional-decomposition.history.morphological-analysis

## .what

"dimensional decomposition", as this role uses it, is an application of **morphological analysis** — also called the **Zwicky box** or **morphological box** — a structured method to explore every possible configuration of a multi-dimensional problem.

## .origin

Fritz Zwicky (1898–1974), a Swiss-American astrophysicist at Caltech, developed morphological analysis across the 1940s–60s as a general-purpose method for problem-solution and invention. he applied it to astrophysics and to jet and rocket propulsion systems.

sources:
- [Wikipedia: Fritz Zwicky](https://en.wikipedia.org/wiki/Fritz_Zwicky)
- [Wikipedia: Morphological analysis (problem-solving)](https://en.wikipedia.org/wiki/Morphological_analysis_(problem-solving))
- Zwicky, F. (1969). *Discovery, Invention, Research Through the Morphological Approach*. Toronto: Macmillan.

## .the core idea

break a problem into its **independent parameters** (dimensions), list the possible **values** each parameter can take, then examine **every combination** of those values. the "box" is the multi-dimensional matrix formed by all parameters and their options.

## .the method — Zwicky's steps

1. **define the problem** precisely
2. **identify the parameters** — the key independent characteristics that describe any solution
3. **list the possible values** for each parameter
4. **form the matrix** — each parameter is an axis; its values fill that axis
5. **generate configurations** — one value per parameter; every such combination is a candidate
6. **evaluate and filter** — discard impossible or contradictory combinations (**cross-consistency assessment**), then assess the survivors

## .worked example — Zwicky's "vehicle"

| parameter | possible values |
|-----------|-----------------|
| medium | land, water, air |
| power source | electric, combustion, human, solar |
| support | wheels, tracks, hull, wings |
| passengers | 1, 2–4, 5+ |

one value per row yields a concept — air / solar / wings / 1 → a solar-powered single-seat aircraft. with 3×4×4×3 = 144 configurations, you surface options no ad-hoc brainstorm would reach.

## .why it is useful

- **completeness** — forces consideration of the entire solution space, not just the obvious ideas
- **less bias** — counters the tendency to jump to familiar answers
- **novelty** — unexpected combinations often point to genuinely new inventions

## .the combinatorial-explosion caveat

the count of combinations grows multiplicatively and rises to a huge total fast. the **cross-consistency assessment** step — which discards pairs of values that cannot coexist — is essential to prune the box to a workable set.

this is the direct ancestor of our **forbidden** verdict: a cell recorded as impossible, with its reason, is exactly a cross-consistency judgment.

## .later development

Tom Ritchey and the Swedish Morphological Society formalized computer-aided **general morphological analysis (GMA)** and the **cross-consistency assessment (CCA)** for non-quantified problems — systems design, product development, futures and scenario analysis, and policy analysis.

sources:
- Ritchey, T. (1998). *General Morphological Analysis*. Swedish Morphological Society — https://www.swemorph.com/ma.html
- [Wikipedia: Morphological analysis (problem-solving)](https://en.wikipedia.org/wiki/Morphological_analysis_(problem-solving))

## .how it maps to our practice

| morphological analysis | our dimensional decomposition |
|------------------------|-------------------------------|
| parameter | axis |
| value | axis value |
| Zwicky box | the product matrix |
| configuration | a cell |
| cross-consistency assessment | the **forbidden** verdict — record *why* a cell cannot exist |
| survivor configuration | a **filled** or **gap** cell |

## .see also

- `howto.dimensional-decomposition.md` — how to apply it
- `rule.require.dimensional-decomposition.md` — when it is required
