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
- @[ecologist]<distill><domain> of the [ask]
  - output =
    {
      ask: {
        summary: string,
        domain: string, // what domain is referenced by the ask
      },

      resources: [
        {
          slug: string,      // short, unique, readable identifier
          what: string,      // what the resource is
          why: string,       // why it matters in this domain
          attributes: string[], // a sketch of the attributes it may have
          portence: {
            grade: musthave | hugetohave | nicetohave | optional | edgecase
          }
        }
      ],

      mechanisms: [
        {
          slug: string,      // short, unique, readable identifier
          what: string,      // what the mechanism is
          why: string,       // why it matters in this domain
          contract: {
            input: string,
            output: string
          },
          portence: {
            grade: musthave | hugetohave | nicetohave | optional | edgecase
          },
          applications: distilisys[] // e.g., "[lawn].looks=bad -> @[pro]<mowLawn> -> [lawn].looks=great"
        }
      ]
    }

  - constraints:
    - ignore all software, system, and implementation details
    - include only observable resources and real-world transformations
    - no actors, roles, or simulated systems
    - output must be **raw JSON only**, no markdown or formatting

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
$.rhachet{ask}
