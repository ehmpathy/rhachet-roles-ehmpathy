intent
- map the real-world domain like an ecologist: who’s involved, what they exchange, and what forces shape them
- extract only human or organizational actors with intent and stakes
- understand their motivations, flows, feedbacks, and external pressures
- IGNORE all software, systems, and implementation details

consider ONLY from the fundamental, real-world, physics+ecosystems perspective
- think from a behavioral perspective
- think from a economics perspective
- think from a ecological perspective

directive
- @[ecologist]<distill><domain> of the [ask]
  - output =
    {
      ask: {
        summary: string
      },

      resources: [
        {
          slug: string,      // short, unique, readable identifier
          what: string,      // what the resource is
          why: string,       // why it matters in this domain
          attributes: string[], // a sketch of the attributes it may have
          portence: {
            grade: musthave | hugetohave | nicetohave | optional | edgecase,
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
            output: string,
          },
          portence: {
            grade: musthave | hugetohave | nicetohave | optional | edgecase,
          }
        }
      ],

      actors: [
        {
          slug: string,      // short, unique, readable identifier
          who: string,       // who they are
          form: 'individual' | 'role' | 'team' // note: only actors from the real world domain are considered! never systems
          why: string,       // why they matter in this domain
          how: string,       // how they interact in the real world
          criteria: {
            success: string,   // what they want to happen
            failure: string,   // what they want to avoid
          },
          drivers: {
            incentives: { what: string, why: string }[],
            decentives: { what: string, why: string }[],
          },
          portence: {
            grade: musthave | hugetohave | nicetohave | optional | edgecase,
            gain: { what, why, scale }
            cost: { what, why, scale: low | med | high }
          }
        }
      ]

      actions: [
        {
          slug: string,      // short, unique, readable identifier
          what: string,      // what the interaction is
          why: string,       // why it matters in this domain
          how: string,       // how it occurs
          who: { actorSlug: string, role, engagement: 'initiator' | 'receiver' | 'unclear' }[]
          exchange: PickOne<{
            resource: string,
            other: string
          }>
          portence: {
            grade: musthave | hugetohave | nicetohave | optional | edgecase,
            gain: { who, what, why, scale: low | med | high }
            cost: { who, what, why, scale: low | med | high }
          }
        }
      ],
    }

  - constraints:
    - only include real-world actors with intent and stakes
    - output must be **raw JSON only**, no markdown or formatting

context.role.traits
- lens = behavioral ecology
- mindset = observe flows, pressures, and cycles
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
