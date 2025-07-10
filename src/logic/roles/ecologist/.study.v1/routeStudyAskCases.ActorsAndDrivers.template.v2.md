directive
- <study><distill> the [ask]
  - purpose = extract real-world human actors and the push/pull forces that shape their behavior in this domain
  - input = ask
  - output =
  ```json
    {
      ask: { summary: string },
      questions: { what: string, why: string }[],
      sketch: {
        actors: {
          who: string,   // who they are
          why: string,   // why they are relevant to this domain
          how: string,   // how they participate in domain interactions
          drivers: {
            incentives: string[],   // what motivates them to act
            decentives: string[]    // what discourages or deters them from acting
          }
        }[],
        environment: {
          tailwinds: string[],      // helpful external forces
          headwinds: string[]       // external pressures or obstacles
        }
      }
    }
  ```
  - include only the json itself, no ```'s


- constraints:
  - only include **real-world people or organizations** who operate within the domain being modeled
  - valid actors must:
    - have **intent** (make choices)
    - have **stakes** (gain or lose from outcomes)
    - take part in **initiating or receiving domain interactions**
  - each domain interaction (e.g. appointment, post, message, booking, purchase) must involve:
    - an **initiator**: the one who proposes or starts the interaction
    - a **receiver**: the one who responds to, views, or is impacted by it
  - exclude:
    - developers, engineers, project managers, designers, analysts, or system-builders
    - internal staff **unless** they directly initiate or receive interactions in the domain
  - exclude non-human agents (e.g., bots, APIs, systems) — only people/orgs count as actors
- do not answer the [ask] — only return the <study><distill> response
- do not return markdown or code blocks — return **raw json only**


---

.rules:
- define actors through **observed domain behavior**, not their job titles
- every actor must:
  - take part in a real-world exchange of value or information
  - be discoverable by tracing domain events (e.g. “who books?”, “who delivers?”, “who sees?”)
- avoid modeling toolmakers, platform owners, or analysts unless they act inside the domain itself
- prefer function-based roles (initiator, receiver, coordinator) over titles (admin, moderator, user)


---


example questions to kickstart your thoughts

[
  {
    "what": "What are the core interactions or exchanges in this domain?",
    "why": "To understand what kinds of relationships define the system."
  },
  {
    "what": "Who typically initiates those interactions?",
    "why": "To identify actors with intent who trigger events in the system."
  },
  {
    "what": "Who receives, responds to, or is impacted by those interactions?",
    "why": "To uncover the counterparties involved in domain outcomes."
  },
  {
    "what": "What information, tools, or permissions does each party need to participate?",
    "why": "To surface behavioral drivers and system constraints."
  },
  {
    "what": "What motivates each party to act, and what deters them?",
    "why": "To model the forces that shape adoption and usage."
  }
]


---

context.role.traits
- view = behavioral economics + system ecology
- focus = **inside-the-domain actors only**
- the software builders that will use this domain model should NOT be considered; only the raw real world domain, devoid of the modelers


context.role.skills
- tactic: <study>(ask)
  - summarize the ask to clarify scope
  - pose clarifying questions that highlight gaps in the actor/driver map
  - sketch a speculative actor model grounded in observed behavior
  - list incentives, decentives, and environmental forces
