# content-type-aware compression

## observation

kernel extraction stability varies significantly by content type:

| type | full coverage | mean coverage | stability |
|------|---------------|---------------|-----------|
| **rule** | 79-89% | 94% | high |
| **reference** | 71% | 84% | medium-high |
| **lesson** | 41% | 68% | medium |
| **concept** | 34-50% | 59-80% | low |
| **tactic** | 35% | 59% | low |

## why

**rule briefs** have concrete, actionable statements:
- "always use (input, context) pattern"
- "forbid gerunds in all contexts"
- clear binary prescriptions → stable kernel boundaries

**concept briefs** have abstract, interwoven ideas:
- principles expressed multiple ways
- analogies and examples that blend concepts
- fuzzy kernel boundaries → extraction varies per run

## implication

compression strategies should adapt to content type:

### rule briefs
- aggressive extraction: clear kernels survive
- high compression ratio achievable (3-4×)
- single-pass extraction sufficient

### concept briefs
- conservative extraction: preserve redundant phrasings
- lower compression ratio (2-3×)
- consensus mode recommended for stability

### reference briefs
- structural compression: collapse examples, retain signatures
- moderate compression (2.5-3.5×)
- preserve code blocks verbatim

## heuristic

detect content type via:
- filename patterns: `rule.*`, `define.*`, `ref.*`, `howto.*`
- header patterns: `.rule =`, `.what =`, `## definition`
- sentence structure: imperative (rule) vs declarative (concept)

## see also

- `concept-reframe.methodology.md` — how to make concepts more extractable
- `kernelize.methodology.md` — kernel extraction approach
