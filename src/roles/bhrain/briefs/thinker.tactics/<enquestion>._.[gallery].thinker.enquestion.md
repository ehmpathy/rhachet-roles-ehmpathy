---

## 🎯 example — `<enquestion>` devtime PonderQuestions kit for `<envision>` a `[product][journey]` → runtime reuse

**intent**
Produce a **general-purpose devtime `PonderQuestions` kit** for `<envision>` a `[product][journey]`.
At **runtime**, a product strategist, designer, or founder can plug in case-specific facts about the product and its audience, reusing this kit for **every journey-mapping session** to ensure nothing critical is overlooked.

---

### 📥 devtime input to `<enquestion>`
\`\`\`ts
ponder: {
  contextualize: [
    "which key stages should *spawn* exploration of user touchpoints?",
    "which external constraints or dependencies might *alter* the journey flow?",
    "which success/failure signals at each stage would *generate* follow-up mapping?"
  ],
  conceptualize: [
    "which types of users or segments should *spawn* separate journey branches?",
    "which journey paths should be *visualized* first for greatest clarity?",
    "which cross-stage patterns should be *highlighted* to reveal bottlenecks or accelerators?"
  ]
},
focus: {
  concept: null,
  context: { goal: "design a reusable envision question set for mapping a product journey" }
}
\`\`\`

---

### 📤 devtime output from `<enquestion>` (the reusable kit)
\`\`\`ts
{
  ponder: {
    contextualize: {
      "which key stages should *spawn* exploration of user touchpoints?":
        "awareness, consideration, onboarding, active use, support, retention/loyalty, advocacy",
      "which external constraints or dependencies might *alter* the journey flow?":
        "regulatory steps, technical onboarding limits, seasonal buying cycles, external integrations",
      "which success/failure signals at each stage would *generate* follow-up mapping?":
        "conversion rates, drop-off points, repeat engagement, feature adoption patterns"
    },
    conceptualize: {
      "which types of users or segments should *spawn* separate journey branches?":
        "new vs returning, free vs paid, novice vs expert, B2B vs B2C",
      "which journey paths should be *visualized* first for greatest clarity?":
        "most common conversion flow, highest revenue flow, most problematic drop-off flow",
      "which cross-stage patterns should be *highlighted* to reveal bottlenecks or accelerators?":
        "time-to-first-value, handoff delays between teams, repeated support touchpoints"
    }
  },

  produce: {
    questions: {
      contextualize: [
        "what is the first trigger or awareness moment for the target user?",
        "what touchpoints exist at awareness, consideration, onboarding, active use, and retention?",
        "what constraints or dependencies shape each stage?",
        "what measurable outcomes indicate success or failure at each stage?",
        "where do handoffs occur and what risks exist there?"
      ],
      conceptualize: [
        "which user segments require separate mapping due to differing behaviors?",
        "which journey flow should be visualized first to clarify the main path?",
        "what alternative or edge-case flows must also be mapped?",
        "what repeating patterns across stages suggest systemic strengths or weaknesses?",
        "which single improvement could shorten time-to-first-value?",
        "what flow variations could be tested for performance impact?"
      ]
    }
  }
}
\`\`\`

---

### 🧩 runtime reuse — plugging in case specifics

**scenario**
A SaaS startup is mapping the journey for their **new AI-driven analytics platform**.

**runtime inputs**
- The **devtime kit** stays the same.
- Case-specific facts are added to `focus.context`:
\`\`\`ts
focus: {
  concept: null,
  context: {
    goal: "map product journey for AI analytics SaaS",
    target_segments: ["SMB owners", "mid-level data analysts"],
    launch_region: "North America",
    constraint: "initial onboarding must complete within 15 minutes",
    success_metric: "conversion to paid within 14 days"
  }
}
\`\`\`

**runtime application**
- **Contextualize** questions adapted to case:
  - First awareness moment? → *LinkedIn ad or industry blog review*.
  - Stage touchpoints? → *ad → landing page → signup → guided setup → dashboard insights*.
  - Constraints? → *must integrate with Google Sheets in setup*.
  - Stage success signals? → *dashboard accessed 3+ times in week 1*.

- **Conceptualize** questions to frame mapping:
  - Segment split? → *separate flows for SMB owners vs analysts*.
  - Visualize first? → *SMB owner’s full journey to paid plan*.
  - Cross-stage bottlenecks? → *handoff from setup to first insights*.

**runtime result**
- Journey map drafted with two parallel flows.
- Bottleneck identified: **delay in generating first insights**.
- Next iteration: add onboarding tweak to surface sample insights instantly.

---

### 🔁 why this split (devtime → runtime) is valuable
- **Framework stability**: devtime kit ensures every journey map starts with full stage coverage.
- **Efficiency**: runtime mapping skips reinvention, focuses on populating specifics.
- **Comparability**: journeys across products share the same backbone, making patterns visible.
- **Scalability**: improvements to the kit (e.g., adding “advocacy” stage) propagate to all future mappings.

---
