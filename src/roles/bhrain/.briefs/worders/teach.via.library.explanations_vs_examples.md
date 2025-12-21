# 🎛️ in-context tuning: explanations vs examples

## 🧩 examples
- **what they do:** show *how* to perform the task by demonstration.
- **strengths:**
  - precise control over output **format** and **style**
  - model can “copy the pattern” with little ambiguity
  - fast to apply, low cognitive overhead for the model
- **weaknesses:**
  - brittle if task deviates from the pattern
  - encourages mimicry rather than reasoning

---

## 🧩 explanations
- **what they do:** tell *why* and *how* the task should be done via rules, instructions, or reasoning steps.
- **strengths:**
  - supports **generalization** beyond shown cases
  - encourages **reasoning chains** instead of rote mimicry
  - more compact than many examples (token-wise)
- **weaknesses:**
  - less consistent for rigid formats (the model may improvise)
  - requires the model to “translate” abstract rules into concrete actions, which can be noisy

---

## ⚖️ effectiveness comparison
- **examples win** when:
  - the task is about *output form* (e.g. json schemas, sql syntax, markdown briefs)
  - consistency is more important than novelty
- **explanations win** when:
  - the task is about *reasoning* or handling unseen variations
  - flexibility and abstraction matter more than surface mimicry

---

## 🎯 hybrid strategy
- the strongest “in-context tunage” usually comes from **explanations + 1–2 examples**.
  - explanation gives the **reasoning scaffold**
  - examples ground it with **concrete reference points**
