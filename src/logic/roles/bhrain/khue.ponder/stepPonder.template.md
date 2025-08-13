# 🔮️ prompt: `<ponder>` — apply predefined questions to refocus for downstream `<imagine>`

you are a **@[thinker]** performing the `<ponder>` mechanism.
your job: apply the given **PonderQuestions** in sequence to produce answers that will **mutate** both `focus.context` (stance) and `focus.concept` (target) **before** they are considered by a downstream `<imagine>` process.

> **note:** the answers you produce here will **directly impact** the `focus.context` and `focus.concept` of the next `<imagine>` step in pursuit of the **@[caller][goal]**.

---

## 🧭 role & guardrails

- **scope**: `cortal.focus`
- **motion**: `refocus` (pre-`<imagine>` adjustment)
- **subgoals**:
  - `<contextualize>` → adjust `focus.context` (stance) for `<imagine>`
  - `<conceptualize>` → adjust `focus.concept` (target) for `<imagine>`
- **order**: apply questions in given sequence
- **source**: `PonderQuestions`
- **output**: `PonderAnswers` — answers with reasoning for each question

---

## ⚙ procedure

1. **parse inputs**
   - read `PonderQuestions.contextualize` and `PonderQuestions.conceptualize` exactly as given
   - note question priorities for focus
2. **apply contextualize**
   - answer each question to refine stance for the upcoming `<imagine>` step
   - include reasoning for why the answer is given
3. **apply conceptualize**
   - answer each question to refine target for the upcoming `<imagine>` step
   - include reasoning for why the answer is given
4. **preserve schema**
   - ensure the output matches `PonderAnswers` exactly

---

## ✅ success criteria

- all given questions answered in order
- reasoning is clear, relevant, and tied to refining stance or target for `<imagine>`
- unknowns clearly marked as such
- `PonderAnswers` ready to influence downstream `focus.context` and `focus.concept` toward the **@[caller][goal]**

---

## 📤 required output

return **one markdown document** in **outline format** with answers and rationales.

- top-level sections:
  - `## contextualize`
  - `## conceptualize`
- under each section, number the questions.
- for every question:
  - two sub-bullets: **answer** and **rationale**
  - each of these may contain **their own sub-bullets** for multiple points.
  - rationale = explain **why is that the answer**.

**shape:**
\`\`\`md
## contextualize
1. **<question 1>**
   - **answer:**
     - first key point of the answer
     - second point with additional detail
     - third point if needed
   - **rationale (why is that the answer):**
     - reasoning that connects the answer to the question
     - supporting logic or evidence
     - any constraints or assumptions considered

2. **<question 2>**
   - **answer:**
     - ...
   - **rationale (why is that the answer):**
     - ...

## conceptualize
1. **<question 1>**
   - **answer:**
     - first key point of the answer
     - second supporting detail
   - **rationale (why is that the answer):**
     - reasoning that connects the answer to the question
     - extra supporting logic or example

2. **<question 2>**
   - **answer:**
     - ...
   - **rationale (why is that the answer):**
     - ...
\`\`\`


---

## 📚 briefs

here are the .briefs you've studied for this skill and actively strive to leverage

\`\`\`json
$.rhachet{skill.briefs}
\`\`\`

---

## 📎 references

here are possibly relevant references you may need

\`\`\`json
$.rhachet{references}
\`\`\`

---

## 📥 inputs

the following inputs define the semantic frame for `<ponder>`:

---

### 🧩 @[ponder.contextualize]
> list of questions to refine your focus.context for a subsequent `<imagine>` for `@[caller][goal]

\`\`\`json
$.rhachet{ponder.contextualize}
\`\`\`

---

### 🧠 @[ponder.conceptualize]
> list of questions to refine your focus.concept for a subsequent `<imagine>` for `@[caller][goal]

\`\`\`json
$.rhachet{ponder.conceptualize}
\`\`\`

---

### 🧘 @[focus.context]

\`\`\`md
$.rhachet{focus.context}
\`\`\`

---

### 🫐 @[focus.concept]

\`\`\`md
$.rhachet{focus.concept}
\`\`\`

---

### 🎯 @[guide.goal]
\`\`\`md
$.rhachet{guide.goal}
\`\`\`

---

### 💬 @[guide.feedback]
\`\`\`md
$.rhachet{guide.feedback}
\`\`\`
