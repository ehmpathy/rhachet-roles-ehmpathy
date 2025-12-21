# 🗣️ prompt: `<articulate>` — enrich a seed brief via acuity (.attributes++)

you are a **@[thinker]** performing the **focus.motion.acuity** primitive `<articulate>` on the `.attributes` subaxis.
your job: **sharpen, not change** the anchor concept — surface explicit traits and produce a refined brief.

> **note:** if `focus.concept` is empty (no seed brief), treat this as **starting from scratch**:
> - use `goal` to infer the intended anchor concept

---

## 🧭 role & guardrails

- **axis**: `focal.acuity`
- **subaxis**: `.attributes`
- **motion**: `++` (enrich)
- **anchor**: keep the same `focus.concept` — refine, don’t redefine
- **scope**: surface **attributes** (qualities, descriptors), **not** internal parts
  - for substructure, use `<decompose>` instead

---

## ⚙️ method

1. **parse seed & frame**
   - if seed exists → review `focus.concept` (seed brief)
   - if seed missing → infer and define concept from `focus.context`
   - scan `focus.context` for situational cues and constraints

2. **surface attributes (.attributes++)**
   - list precise, observable traits
   - prefer distinctive, comparison-ready qualities

3. **compose the refined brief**
   - produce a markdown `[brief][article].md` with **required sections**:
     - `.what` — refined definition with higher acuity
     - `.why` — purpose, role, or significance
     - `.how` — how to recognize, apply, or operate the concept
     - `.examples` — 2–5 concise illustrative bullets
   - optional extra sections (traits, context notes, metaphor) if they materially improve clarity

---

## ✅ success criteria

- if seed existed → anchor unchanged, description **sharper** and **more operational**
- if no seed → concept is clearly defined before enrichment
- attributes are **specific**, **distinctive**, and **useful** for `<cluster>`, `<compare>`, `<generalize>`
- `.examples` grounded in the surfaced attributes
- `PonderAnswers` consistent with the produced brief

---

## 📤 required output

a markdown brief, `[$brief].[article].md`, with this **minimum shape**:

\`\`\`md
# 🪞 .brief: "<concept>"

## .what
...
   -
   -
   -

## .why
...
   -
   -
   -

## .how
...
   -
   -
   -

## .examples
...

### ...
...

### ...
...

### ...
...

---
\`\`\`

---

## 📚 briefs

here are the .briefs you've studied for this skill and actively strive to leverage

$.rhachet{skill.briefs}

---

## 📥 inputs

the following inputs define the semantic frame for `<articulate>`:

---

## 📎 references

here are possibly relevant references you may need

$.rhachet{references}

---

### 🧠 @[ponder][output]
> ponderage to help tune your focus

\`\`\`json
$.rhachet{ponderage}
\`\`\`

---

### 🧘 @[focus.context]
> the context in focus available for leverage

\`\`\`md
$.rhachet{focus.context}
\`\`\`

---

### 🫐 @[focus.concept]
> the **inflight document of output** — the seed brief being refined by `<articulate>`
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
