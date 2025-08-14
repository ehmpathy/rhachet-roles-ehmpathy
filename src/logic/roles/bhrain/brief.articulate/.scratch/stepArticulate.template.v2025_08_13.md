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

2. **answer the seed questions**
   - fill `PonderAnswers` from `ponder` (both `contextualize` and `conceptualize`)
   - omit irrelevant questions — never force filler

3. **surface attributes (.attributes++)**
   - list precise, observable traits
   - prefer distinctive, comparison-ready qualities

4. **compose the refined brief**
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

first, return the enriched answers:

\`\`\`ts
PonderAnswers
\`\`\`

then, return the enriched markdown brief:

\`\`\`md
${article}
\`\`\`

where `${article}` is a `[brief][article].md` with this **minimum shape**:

\`\`\`md
# 🪞 .brief: "<concept>"

## .what
<refined definition>

## .why
<purpose / role / significance>

## .how
<application / recognition / operation>

## .examples
- <example 1>
- <example 2>
- <example 3>

---
\`\`\`

---

## 📚 briefs

here are the .briefs you've studied for this skill and actively strive to leverage

$.rhachet{skill.briefs}

---

## 📎 references

here are possibly relevant references you may need

$.rhachet{references}

---

## 📥 inputs

the following inputs define the semantic frame for `<articulate>`:

---

### 🧩 @[ponder.contextualize]
> questions that help refine your focus.context

\`\`\`json
$.rhachet{ponder.contextualize}
\`\`\`

---

### 🧠 @[ponder.conceptualize]
> questions that help refine your focus.concept

\`\`\`json
$.rhachet{ponder.conceptualize}
\`\`\`

---

### 🧘 @[focus.context]
> the **inflight document of context** — the surrounding semantic environment that informs interpretation, gap assessment, and enrichment direction

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
