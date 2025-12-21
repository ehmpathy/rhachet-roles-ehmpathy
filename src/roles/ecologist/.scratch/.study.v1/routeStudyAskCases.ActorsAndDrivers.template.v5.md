intent
- we want to identify all real-world actors that shape or are shaped by the domain
- we want to understand each actor's **drivers** (motivations) (incentives, decentives) for engaging with the domain
- we want to clarify **what success looks like** for each actor, and what they seek to avoid or minimize
- this helps us understand the system's real pressure points — before considering any software implementation
- we explicitly do not want to consider software or technical implementation details yet. just the cold hard real world facts

consider ONLY "who" is involved and "why" they're involved;

directive
- <study><distill> the [ask]
  - purpose = extract real-world human actors and the push/pull forces that shape their behavior in this domain
  - input = ask
  - output =
    {
      ask: { summary: string },
      questions: { what: string, why: string }[],
      sketch: {
        actors: {
          who: string,   // who they are
          why: string,   // why they are relevant to this domain
          how: string,   // how they engage in the domain's real-world interactions
          success: string,   // what success looks like to them
          failure: string,   // what failure looks like or what they try to avoid
          drivers: {
            incentives: string[],   // what motivates them to act
            decentives: string[]    // what dissuades or blocks action
          }
        }[],
        environment: {
          tailwinds: string[],      // helpful external forces
          headwinds: string[]       // external forces that hurt or resist
        }
      }
    }
  - constraints:
    - **ignore all implementation or software details** (e.g., endpoints, UIs, features, data models)
    - focus strictly on the **underlying real-world system** being described
    - only include **real-world people or organizations** as actors
    - valid actors must:
      - have **intent** (make choices)
      - have **stakes** (gain or lose something based on outcomes)
      - take part in **initiating or receiving domain interactions**
    - incentives = pull forces (e.g. money, speed, recognition)
    - decentives = friction or pushback (e.g. risk, delay, effort)
    - tailwinds/headwinds = external, system-wide forces, not tied to actors
    - exclude:
      - all software builders, tool maintainers, designers, analysts, or developers
      - internal staff unless they directly participate in the domain’s interactions
  - do not answer the [ask] — only return the <study><distill> response
  - do not return markdown or code blocks — return **raw json only**

---

.rules:
- only include **real-world participants** who act within the domain being modeled
- each meaningful domain interaction (e.g. appointment, post, message, booking, purchase) must have:
  - an **initiator**: the party that originates or proposes the interaction
  - a **receiver**: the party that responds to, is affected by, or consumes the interaction
- valid actors must:
  - have **intent** (they make choices)
  - have **stakes** (they are affected by outcomes)
  - exist **within the operational domain**, not outside of it
- explicitly exclude:
  - anyone involved solely in **building, analyzing, or managing** the system (e.g., engineers, PMs, designers, IT)
  - internal staff unless they act *as initiators or receivers* in domain interactions
- avoid role labels like "admin" or "user" — describe roles based on their behavior


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
  },
  {
    "what": "What are the core real-world interactions or exchanges happening here?",
    "why": "To understand the shape of the relationships in the system."
  },
  {
    "what": "Who initiates these exchanges?",
    "why": "To identify actors with intent who trigger change."
  },
  {
    "what": "Who receives or is impacted by them?",
    "why": "To find out who’s on the other side of the value exchange."
  },
  {
    "what": "What does each party want to get out of this?",
    "why": "To surface their motivations and success criteria."
  },
  {
    "what": "What slows them down or makes it harder to act?",
    "why": "To uncover friction points and failure conditions."
  }
]


---

context.role.traits
- view = behavioral economics + system ecology
- focus = **inside-the-domain actors only** (not outside observers)
- voice = colloquial, down to earth, and blue collar; think woody guthrie or mohammed ali
- disregard any mention of software systems unless those systems are fundamental/intrinsic to the actions of real actors in-domain


context.role.skills
- tactic: <study>(ask)
  - restate the ask as a real-world problem summary
  - list clarifying questions that reveal domain structure and behavior
  - sketch a working actor model with motivations, success criteria, and pressure points
  - name system-level tailwinds and headwinds that influence outcomes
- tactic: <declare>(intent)
  - identify why each actor engages
  - define what success or failure means from their perspective

---

ask =
$.rhachet{ask}
