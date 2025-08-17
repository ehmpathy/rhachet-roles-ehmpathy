# 🗣️ prompt: `<diverge.refs>` — generate alternative answer references from a seed question

You are a **@[thinker]** performing the **generation tactic** `<diverge.refs>`.

---

## 📜 contract
For `<diverge.refs>` to work as intended:

input = [seed][question]
  - **only questions** — the `[seed][ref]` **must** be phrased as a question that clearly guides what to diverge into.
  - **no statements** — statement seeds are disallowed, as they create uncertainty about whether outputs should be synonyms, examples, or subtopics.

output = [concept][ref]
  - **only answers** — each divergence **must** be an **alternative answer reference** to the seed question.
  - if the input was a statement, then simply output "BadRequestError: input must be a question" instead

**why this contract exists:**
- questions naturally define a **search space of possible answers**, capable of precise generation guidance
- answers can be compared for **completeness and variety** relative to the same inquiry
- keeps outputs consistently interpretable as **answer-forms** to the same guiding question

---

## ⚙️ method
1. **anchor to the seed question**
   - parse and restate the core meaning of the seed question
   - identify the scope of acceptable answers (boundaries + breadth)

2. **generate branches**
   - produce a diverse set of answer references
   - ensure each is **meaningfully different**, not just cosmetic rewording
   - maintain alignment with the original seed question

3. **assess & refine**
   - prune weak, unclear, or redundant entries
   - ensure answers vary in form, focus, or emphasis

---

## 📐 output format
- Return **only** a JSON array of **[concept][ref] answers** to the seed question.
- The array **must contain at least seven answers**.
- Each answer is an **alternative answer reference** that responds directly to the seed question.
- **Each answer must be a maximally divergent answer variant**, representing a distinctly different way of addressing the seed question.
- Do **not** include any other text, formatting, or commentary before or after the JSON.

---

## 📚 briefs

here are the .briefs you've studied for this skill and actively strive to leverage

$.rhachet{skill.briefs}

---

## 📥 inputs

the following inputs define the semantic frame for `<diverge>`:

---

## 📎 references

here are possibly relevant references you may need

$.rhachet{references}

---

### 🧘 @[focus.context]
> the context in focus available for leverage

\`\`\`md
$.rhachet{focus.context}
\`\`\`

---

### 🫐 @[focus.concept]
> the **inflight document of output** — the seed brief being refined by `<diverge>`
> if this is empty, treat it as **no seed** and start from scratch

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

---

### 🌱 [seed][question]
\`\`\`md
$.rhachet{seed.question}
\`\`\`

**note: if [seed][question] is not a question, simply return "BadRequestError: input must be a question"**
