# ❓ .brief: `<enquestion>`

## 🧭 .what
**`<enquestion>`** is a **structural traversal mechanism** that **leverages the `<ponder>` framework**
to generate the **questions needed to advance toward a goal**.

It consumes:
- **`ponder`** — curated or pre-authored questions organized into `<contextualize>` and `<conceptualize>` subgoals (per the `<ponder>` contract)
- **`focus`** — the current state of questioning (`focus.concept`) and the situational frame (`focus.context`)

It produces:
1. An **enriched `ponder`** with context-aware insights for each seed question.
2. A **`produce.questions`** set — the refined, ready-to-ask questions that bridge context to goal.

Because `<enquestion>` itself **uses `<ponder>`** internally:
- It can be **chained with downstream `<ponder>` calls** — producing questions that feed into subsequent pondering stages.
- It can **loop with itself** — where the output `produce.questions` becomes the new `focus.concept`, allowing iterative deepening of inquiry.

---

## 🔗 relationship to `focus.sufficiency`
In `focus.sufficiency`, most failures come from:
1. **Context gap** → missing something in `focus.context`
2. **Concept gap** → missing something in `focus.concept`

`<enquestion>` helps overcome both failure modes by:
- Using `<ponder>`’s `<contextualize>` to fill gaps in `focus.context`.
- Using `<ponder>`’s `<conceptualize>` to shift or refine the `focus.concept` anchor.

---

## 🧠 input / output contract

### 📥 input
\`\`\`ts
type PonderQuestions = {
  contextualize: string[],
  conceptualize: string[]
}

type EnquestionInput = {
  ponder: PonderQuestions,
  focus: {
    concept: Maybe<PonderQuestions>, // enquestion upserts ponder questions
    context: {
      goal: string,            // required
      ...other context facts   // optional, domain-specific
    }
  }
}
\`\`\`

- `ponder` = question seeds from `<ponder>`, structured by subgoal.
- `focus.concept` = the *current state* of questioning.
- `focus.context` = the situation, **must** include `.goal`.

---

### 📤 output
\`\`\`ts
type PonderAnswers = {
  contextualize: Record<string, string>,
  conceptualize: Record<string, string>
}

type EnquestionOutput = {
  ponder: PonderAnswers,
  produce: {
    questions: PonderQuestions
  }
}
\`\`\`

- Output `ponder` enriches the seeds with contextual rationale.
- Output `produce.questions` contains the **final, ready-to-use** question set.
- These `produce.questions` can be used as **input to downstream `<ponder>` calls** or to the **next `<enquestion>` iteration**.

---

## 🌿 exploration of the question treestruct fabric
Questions inhabit a **semantic treestruct** — a branching space defined by:
- **Axes** (categorical, temporal, causal, etc.)
- **Depth** (abstraction vs. instantiation)
- **Breadth** (variation in attribute or structure)
- **Acuity** (articulation or decomposition)

`<enquestion>` explores this fabric to:
- Identify **possible branches** from `<ponder>`’s seeds.
- Expand or condense branches based on goal utility.
- Map **follow-up pathways** so inquiry flows logically.

---

## 📦 system pattern
\`\`\`ts
<enquestion>.with({ contextualize, conceptualize })({
  ponder,
  focus
})
→ { ponder: {...}, produce: { questions: {...} } }
\`\`\`

---

## 💡 runtime / devtime reflection
- **Runtime**: dynamically adapt questions as focus/context changes.
- **Devtime**: tune `<ponder>` question seeds for domain-specific flows.

---

## 📎 notes
- `<enquestion>` is an **instance** of `<ponder>`; it arranges and adapts its questions into a goal-driven sequence.
- **Downstream use**: The resulting `produce.questions` can directly seed new `<ponder>` calls for further semantic refinement.
- **Looping**: Since it uses `<ponder>`, `<enquestion>` can call itself iteratively, deepening or broadening inquiry as needed.
- Treats inquiry as **navigating the question treestruct fabric**, not generating in isolation.
