---

## 🛠️ example — <enquestion> a devtime PonderQuestions kit for `@[plumber]<diagnose>` → runtime reuse

**intent**
Produce a **general-purpose devtime `PonderQuestions` kit** for `<diagnose>` in plumbing.
At **runtime**, any plumber plugs in case-specific facts and **reuses the same kit** to save time and keep diagnosis consistent.

---

### 📥 devtime input to `<enquestion>`
\`\`\`ts
ponder: {
  contextualize: [
    // meta-questions whose answers generate case-ready questions
    "which observable conditions would *spawn* follow-up diagnostics?",
    "which environment factors would *change* the diagnostic path?",
    "which usage/repair history would *influence* failure likelihood?"
  ],
  conceptualize: [
    "which subsystems, treated as suspects, *generate* distinct tests?",
    "which minimal discriminators best *split* root causes early?",
    "which symptom patterns should *trigger* immediate checks?"
  ]
},
focus: {
  concept: null,
  context: { goal: "design a reusable diagnosis question set for plumbing" }
}
\`\`\`

---

### 📤 devtime output from `<enquestion>` (the reusable kit)
\`\`\`ts
{
  ponder: {
    contextualize: {
      "which observable conditions would *spawn* follow-up diagnostics?":
        "visible moisture points, pooling patterns, pressure/flow anomalies",
      "which environment factors would *change* the diagnostic path?":
        "freezing temps, recent renovations, water quality/pressure changes",
      "which usage/repair history would *influence* failure likelihood?":
        "installation age, prior repairs, high-demand cycles"
    },
    conceptualize: {
      "which subsystems, treated as suspects, *generate* distinct tests?":
        "supply (hot/cold), fixture assemblies, drainage (trap/joints), venting, appliances (DW/disposal/heater)",
      "which minimal discriminators best *split* root causes early?":
        "static (pressurized, no-flow) vs dynamic (flow/drain) behavior; local vs distributed wetness",
      "which symptom patterns should *trigger* immediate checks?":
        "base gasket wet after run, trap joint first-wet on dump, hammering after valve close"
    }
  },

  produce: {
    questions: {
      contextualize: [
        "where is first-wet observed (fitting, hose, base, joint)?",
        "does moisture appear with supply pressurized but all fixtures OFF?",
        "does moisture appear only with faucet ON and no drain flow?",
        "does moisture appear only during/after a full-basin drain?",
        "have fixtures or appliances been installed/repaired recently?",
        "are there freeze events, renovations, or pressure changes on site?"
      ],
      conceptualize: [
        "if static leak: which pressurized components are in range (stop valves, lines, connectors)?",
        "if dynamic/no-drain leak: which fixture seals or bodies are suspect?",
        "if drain-only leak: which trap/compression joints or tees are first-wet?",
        "does the pattern map to supply, fixture body, drain, vent, or appliance branch?",
        "what single test will most decisively split supply vs drain?",
        "which repair path corresponds to each confirmed source?"
      ]
    }
  }
}
\`\`\`

> This **devtime kit** is authored once and becomes the standard **starting point** for any plumbing diagnosis.

---

### 🧩 runtime reuse — plugging in case specifics

**scenario**
Customer reports water pooling under a kitchen sink after use.

**runtime inputs**
- The plumber keeps the **devtime kit** unchanged.
- They add **case facts** via `focus.context` and use the kit’s `produce.questions` as the runbook.

\`\`\`ts
focus: {
  concept: null, // or last run's questions if continuing
  context: {
    goal: "identify leak source and repair steps",
    symptoms: "pooling under sink after faucet use",
    recent_changes: "faucet replaced last month",
    environment: "unheated exterior wall; freeze last week"
  }
}
\`\`\`

**runtime application**
- Ask the kit’s **contextualize** set (now grounded by the case):
  - "where is first-wet observed?" → *bottom of faucet base*
  - "static or dynamic?" → *only when faucet ON; not on pressurized idle*
  - "drain-only?" → *no, dry on full-basin dump; wet only with ON/no-drain*
  - "recent changes?" → *new faucet last month*

- Use answers to pick **conceptualize** branches:
  - Pattern maps to **fixture body/base** (not supply idle; not drain dump).
  - **Decisive test**: run 30s ON with no drain, inspect base and supply nut.
  - If base wets first → **replace/seat base gasket**; if supply nut wets → **re-crimp/replace line**.

**runtime result**
- Source isolated: **faucet base gasket**.
- **Repair path** chosen from the kit’s mapping: reseat/replace gasket; retest static/dynamic.

---

### 🔁 why this split (devtime → runtime) is valuable

- **Consistency at scale**: every technician starts with the same high-leverage questions, reducing misses.
- **Speed**: devtime questions are already optimized to **produce** decision-making questions; no ad-hoc thinking at the curb.
- **Coverage**: the kit bakes in static vs dynamic splits, first-wet logic, and subsystem mapping.
- **Composability**: outputs from one run can become `focus.concept` for a second `<enquestion>` pass (deeper probing).
- **Maintainability**: improve the kit once at devtime; all future diagnoses benefit automatically.

---
