# 🎨 .brief: `composite.render`

## .what
**`<render>`** is a **composite cognitive operation** that transforms a concept into a **perceivable external form**.
It does so by combining two structured motions:

\`\`\`ts
<render> = <articulate> → <instantiate>
\`\`\`

This produces a **representation-concept**:
an object or event that expresses the original idea in a situated modality (e.g. visual, auditory, cinematic, etc).

---

## 🧬 compositional structure

| stage             | primitive         | axis                        | role                                                      |
|------------------|-------------------|-----------------------------|-----------------------------------------------------------|
| 1. `<articulate>` | `.acuity.attributes++` | resolve surface traits         | defines what the concept **should look/feel like**         |
| 2. `<instantiate>` | `.depth.outward++`     | realize concept into instance | materializes the concept in **space, time, or medium**     |

Together:

\`\`\`ts
<render>[concept:X]
= <instantiate>[<articulate>[concept:X]]
\`\`\`

---

## 🧪 expanded example chain

\`\`\`ts
<articulate>(
  [concept:"hammer"],
  [concept:"lightweight"],
  [concept:"rubber grip"]
)
→ [concept:"lightweight rubber-grip hammer"]

<instantiate>(
  [concept:"lightweight rubber-grip hammer"],
  [concept:"visual, cinematic video"]
)
→ [concept:"lightweight rubber-grip hammer" × "visual, cinematic video"]

= [concept:"lightweight rubber-grip hammer videotaped slowly rotating in mid air as if on a museum display, 5 seconds"]
\`\`\`

This instance is:
- **articulated** (traits: lightweight, rubber grip)
- **instantiated** (visualized in cinematic video format)
- the **representation** output of `<render>`

---

## 🔁 relation to other verbs

| verb           | function                                | output type                     |
|----------------|------------------------------------------|----------------------------------|
| `<articulate>` | resolve surface features                 | `[concept:descriptive blend]`    |
| `<instantiate>` | realize concept into specific instance   | `[concept:concrete object/event]` |
| `<render>`      | express concept visibly/audibly/etc      | `[concept:representation of X]`  |
| `<parse>`       | reconstruct internal concept from form   | `[concept:X]`                    |

---

## 🧭 concept pattern

\`\`\`ts
<render>(
  [concept:subject],
  [concept:modality]
) => [concept:subject + modality]
\`\`\`

Examples:

\`\`\`ts
<render>([concept:"justice"], [concept:"visually"])
→ [concept:"visual representation of justice"]

<render>([concept:"circle"], [concept:"audibly"])
→ [concept:"spoken description of circle"]
\`\`\`

---

## ✅ summary

> **`<render>` = articulate → instantiate**
> It is the cognitive operation of **making a concept visible**,
> by first resolving what it is, and then realizing how it appears.

\`\`\`ts
[concept] → [representation-concept]
\`\`\`
