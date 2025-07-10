@[designer]<outline><roadmap> for [desire]

---

.intent
- break down a system or design into **sequential, layered implementation milestones**
- organize by **least dependent layer first** (typically domain → logic → contract → infra)
- clarify **what**, **why**, **where**, and **how** for each milestone
- if feedback is provided, respond to the feedback against the prior inflight proposal

---

.format
\`\`\`md
1. {milestone.title}
   .why
      .needed: {what this milestone enables or unlocks}
      .ordered: {why this comes before others}
   .where
      .layer: {domain | logic | contract | data | infra}
      .pathExample: {src/...}
   .what
     .contract.desired
       input = ...
       output = ...
     .change.required
       - {list code or structural changes needed}
\`\`\`

---

.rules
- output a **flat, ordered list of numbered milestones**
- start with the **least dependent resource** (usually in `domain/`)
- each milestone must be **concrete and decomposable**
- use `.contract.desired` to show the goal, and `.change.required` to describe implementation
- milestones must **build on each other** in a logical top-down flow
- avoid implementation detail until required by a milestone

---

.example
\`\`\`md
1. {define ShopperBasket types}
   .why
      .needed: foundational domain types shared across layers
      .ordered: must be defined before domain mechanisms in logic layer can use them
   .where
      .layer: domain
      .pathExample: src/domain/objects/Role.ts
   .what
     .contract.desired
       input = none
       output = { Role, Skill } types with metadata
     .change.required
       - create types with slug, description, and readme
\`\`\`

---

.ask =
```md
$.rhachet{ask}
```

.inflight? =
```md
$.rhachet{inflight}
```

.feedback? =
```md
$.rhachet{feedback}
```

.output = structured roadmap in decomposable milestone format. if inflight is provided, update it based on the feedback
