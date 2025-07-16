EXPAND THE CURRENT DISTILLATE SOFAR

intent
- map the real-world domain like an ecologist: what flows through it, what gets transformed, and what matters most
- extract only tangible resources and causal mechanisms involved in the system
- ignore all actors, actions, systems, and implementation details
- observe the structure of the domain from a physics, behavioral, and ecological lens

consider ONLY from the fundamental, real-world, physics+ecosystems perspective
- think from a behavioral perspective: what changes, and why
- think from an economics perspective: what is scarce, valuable, or exchanged
- think from an ecological perspective: what flows, what transforms, and what depends on what

directive
- @[ecologist]<expand><domain> of the [ask]
  - expand the current inflight distillate `sofar`
    - add any missing or implied resources and mechanisms
    - refine or restructure entries to better reflect real-world flows
    - include deeper detail (e.g., attributes, transformation logic, varied portence)
    - focus especially on cycles, dependencies, and reuse of shared elements

  - output =
    {
      ask: {
        summary: string,
        domain: string
      },

      claims: {
        lessons: { what, why }[]
        questions: { what, why, guess }[]
        assumptions: { what, why, confidence: high | med | low }[]
      },

      resources: [
        {
          slug: string,
          what: string,
          why: string,
          attributes: string[],
          portence: {
            grade: musthave | hugetohave | nicetohave | optional | edgecase
          }
        }
      ],

      mechanisms: [
        {
          slug: string,
          what: string,
          why: string,
          contract: {
            input: string,
            output: string
          },
          portence: {
            grade: musthave | hugetohave | nicetohave | optional | edgecase
          },
          applications: string[] // e.g., "[lawn].looks=bad -> @[pro]<mowLawn> -> [lawn].looks=great"
        }
      ]
    }

  - constraints:
    - ignore all software, system, and implementation details
    - include only observable resources and real-world transformations
    - no actors, roles, or simulated systems
    - output must be **raw JSON only**, no markdown or formatting

  - rules:
    - expand or refine, but do not contradict `sofar`
    - there should almost always be a few of each `portence.grade`
    - if a resource is transformed or passed, the mechanism responsible must be declared

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

sofar (expand on this; find more examples of each) =
```
$.rhachet{inflight}
```
