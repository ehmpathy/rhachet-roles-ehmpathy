# 🗣️ .brief: `<articulate>`

## 🧭 .what
`<articulate>` is a **focus.motion.acuity** primitive on the `.attributes` subaxis. it moves **inward** (`.attributes++`) to enrich the **same** anchor concept by surfacing explicit traits. the anchor does not change; only the **resolution** of its description increases.

it consumes:
- `ponder` — a set of seed questions (`PonderQuestions`) to help drive articulation
- `focus.concept` — the **seed** concept to refine, as `Artifact<typeof Brief>`
- `focus.context` — the **situational frame**, as `Artifact<typeof Brief>`; may guide which traits are surfaced

it produces:
- `ponder` — the answered question set (`PonderAnswers`)
- `produce` — an enriched `Artifact<typeof Brief>` that **always** includes `.what`, `.why`, `.how`, and `.examples`

---

## 🎯 purpose
- transform a minimal or vague seed into a **clear, operational brief**
- answer guiding questions to surface **surface-level attributes**
- unlock **variation potential** by increasing `focal.acuity`

---

## 🔗 relation to `focus.motion.acuity`
- **subaxis** → `.attributes`
- **motion** → `++` (enrich)
- **direction** → inward (sharpen)
- **effect** → reveals finer surface traits without changing the anchor

---

## 🧠 input / output contract

### 📥 input
\`\`\`ts
type ArticulateInput = {
  ponder: PonderQuestions;           // question seeds
  focus: {
    concept: Artifact<typeof Brief>; // seed brief to refine
    context: Artifact<typeof Brief>; // situational frame
  };
};
\`\`\`

### 📤 output
\`\`\`ts
type ArticulateOutput = {
  ponder: PonderAnswers;               // enriched answers to the seed questions
  produce: Artifact<typeof Brief>;     // refined brief
};
\`\`\`

---

## 🧳 article shape for `produce`
The produced brief **must** include:

\`\`\`md
# 🪞 .brief: "<concept>"

## .what
<refined definition of the concept with higher acuity>

## .why
<explanation of the concept’s purpose, role, or significance>

## .how
<description of how the concept operates, is applied, or can be recognized>

## .examples
- <example 1>
- <example 2>
- <example 3>

---
\`\`\`

It **may** also include any other sections that improve articulation, such as:
- **🎯 traits** — explicit attributes and qualities
- **📎 context notes** — relevant situational or domain constraints
- **🪞 metaphor** — analogy to make the concept more intuitive

---

## 🌿 treestruct interaction
- **anchor** stays fixed: `focus.concept` is not swapped
- **acuity** increases: more traits are cognitively present
- surfaced traits can be used immediately for `<cluster>`, `<compare>`, or `<generalize>`

---

## 📦 system pattern
\`\`\`ts
<articulate>({
  ponder,
  focus: { concept, context }
})
→ { ponder, produce }
\`\`\`

---

## 📎 notes
- `<articulate>` is for **attributes** only — use `<decompose>` for internal parts (`.substructs++`).
- It is often run **after `<gather>`** and **before `<cluster>`**.
- Higher acuity increases cognitive load; apply when precision directly benefits the reasoning goal.
