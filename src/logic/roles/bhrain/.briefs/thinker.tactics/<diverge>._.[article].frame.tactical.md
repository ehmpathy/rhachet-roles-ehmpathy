# 🧩 .brief: `diverge.refs`

## .what
**`diverge.refs`** is a **generation tactic** that creates multiple distinct `[concept][ref]` (reference) forms from a single seed question.
instead of locking into one framing, it **branches** the expression into alternative answer-forms — each still anchored to the intent of the original question.

---

## 🎯 goal
- explore **variety in expression** while retaining core meaning
- surface **different entry points** for the same underlying concept
- identify **strongest, most resonant refs** for specific audiences or purposes

---

## 📜 contract
for `<diverge.refs>` to work as intended:

input = [seed][question]
  - **only questions** — the `[seed][ref]` **must** be phrased as a question that clearly guides what to diverge into.
  - **no statements** — statement seeds are disallowed, as they create uncertainty about whether outputs should be synonyms, examples, or subtopics.

output = [concept][ref]
  - **only answers** — each divergence **must** be an **alternative answer reference** to the seed question.

**why this contract exists:**
- questions naturally define a **search space of possible answers**, capable of precise generation guidance
- answers can be compared for **completeness and variety** relative to the same inquiry
- keeps outputs consistently interpretable as **answer-forms** to the same guiding question

---

## ⚙️ method
1. **anchor to the seed question**
   - start from a single clear question (seed `[ref]`)
   - clarify the essential meaning to preserve across all divergences

2. **generate branches**
   - vary along one or more axes relevant to the goal
   - ensure each `[ref]` is **meaningfully different**, not just cosmetic rewording

3. **assess & refine**
   - check for clarity, accuracy, and audience fit
   - prune weak or redundant variations

---

## 📐 when to use
- when testing **messaging resonance**
- when creating **menus of choices** or **navigation labels**
- when brainstorming **campaign slogans, feature names, or thematic headers**

---

## 🖼 examples

### example 1

**seed `[ref]`:** "what makes historic train travel memorable?"

- "luxury journeys aboard restored locomotives"
- "guided scenic tours through mountain passes"
- "onboard dining with period-accurate menus"
- "storytelling from railway historians"
- "overnight sleeper cars with vintage charm"

---

### example 2

**seed `[ref]`:** "how can service pros schedule smarter?"

- "by giving customers a simple online booking option"
- "by auto-assigning jobs based on location and availability"
- "by syncing calendars across the whole team"
- "by sending automated reminders to reduce no-shows"
- "by grouping nearby jobs to cut travel time"

---

### example 3

**seed `[ref]`:** "what are different types of ducks?"

- "mallard"
- "wood duck"
- "northern pintail"
- "muscovy duck"
- "american black duck"
