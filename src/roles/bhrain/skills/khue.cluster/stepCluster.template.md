# 🗣️ prompt: `<cluster>` — group related elements into cohesive clusters

You are a **@[thinker]** performing the **generation tactic** `<cluster>`.

---

## 📜 contract
For `<cluster>` to work as intended:

- **input = [concepts]**
  - the input must be a **list of concepts, ideas, or data points**.
  - these may come from scratch, a seed, or inflight context.
  - statements or singletons are invalid, as clustering requires **multiple elements**.

- **output = [clusters]**
  - the output must be a **set of clusters**, where each cluster contains:
    - a **cluster label** (short, descriptive name)
    - a **list of member concepts** (from the input)
    - a **rationale** explaining why those elements belong together

- **error guard**: if fewer than two concepts are provided, return
  `"BadRequestError: input must contain at least two concepts"`

**why this contract exists:**
- clustering is meaningful only when applied to **multiple elements**
- each cluster must be **cohesive and distinct**, avoiding overlap or redundancy
- rationales ensure clusters are **interpretable and justifiable**, not arbitrary groupings

---

## ⚙️ method
1. **identify elements**
   - parse the input list of concepts
   - ensure diversity and representativeness

2. **determine criteria**
   - infer shared attributes, functions, or purposes
   - apply criteria consistently across all elements

3. **analyze and group**
   - assign elements into cohesive clusters
   - ensure clusters are **balanced** (not too granular, not too broad)

4. **review and refine**
   - check clusters for clarity, coherence, and distinctiveness
   - adjust groupings where necessary

---

## 📐 output format
- Return **only** a JSON array of clusters.
- Each cluster must be an object with three keys:
  - `"label"`: a short descriptive name for the cluster
  - `"members"`: an array of the included input concepts
  - `"rationale"`: a short explanation of why these elements belong together

Example schema (do not include this in output, just follow the format):
\`\`\`json
[
  {
    "label": "Cluster A",
    "members": ["concept1", "concept2"],
    "rationale": "why these belong together"
  }
]
\`\`\`

- The array **must contain at least two clusters**.
- Do **not** include any text, commentary, or formatting before or after the JSON.

---

## 📚 briefs

here are the .briefs you've studied for this skill and actively strive to leverage

$.rhachet{skill.briefs}

---

## 📥 inputs

the following inputs define the semantic frame for `<cluster>`:

---

## 📎 references

here are possibly relevant references you may need

$.rhachet{references}

---

### 🧘 @[focus.context]
\`\`\`md
$.rhachet{focus.context}
\`\`\`

---

### 🫐 @[focus.concept]
> the inflight document — the seed brief being refined by `<cluster>`
> if empty, treat as **no seed** and start fresh

\`\`\`md
$.rhachet{focus.concept}
\`\`\`

---

### 🎯 @[guide.goal]

> the goal, used to help determine along which dimensions to cluster

\`\`\`md
$.rhachet{guide.goal}
\`\`\`

---

### 💬 @[guide.feedback]
\`\`\`md
$.rhachet{guide.feedback}
\`\`\`

---

### 🌱 [concepts]
\`\`\`md
$.rhachet{seed.concepts}
\`\`\`

**note: if fewer than two concepts are provided, simply return `"BadRequestError: input must contain at least two concepts"`**
