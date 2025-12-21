# 🧩 .brief: `focus.motion.extend`

## .what
`<extend>` is a **creative maneuver** that starts from a set of known [concept]s,
compares them to surface **descriptive dimensions**,
and then extrapolates along those axes to generate **new sibling concepts**.

It keeps the **same focal.depth shell**,
but broadens the breadth by producing adjacent variations
within the discovered semantic field.

---

## 📥 input
- a **set of known [concept]s**, typically at the same `focal.depth`
  (e.g. \`\`\`[concept:"light sedan"], [concept:"sport sedan"], [concept:"luxury sedan"]\`\`\`)

## 📤 output
- a **superset of [concept]s**, including **newly generated variants**
  inferred from observed dimensions
  (e.g. adds \`\`\`[concept:"electric sedan"], [concept:"off-road sedan"]\`\`\`)

---

## 🧭 how it works

| phase            | behavior                                                | underlying motions                              |
|------------------|---------------------------------------------------------|--------------------------------------------------|
| **compare base** | analyze input concepts to find **shared dimensions**    | `<compare>` + `focal.acuity.attributes++`        |
| **extrapolate**  | apply systematic **variation** along discovered axes    | `<vary>` + `breadth++` along each dimension      |
| **instantiate**  | resolve new concepts into usable [concept] instances    | `<instantiate>` or `<articulate>` as needed      |

---

## 🎨 example

\`\`\`ts
<extend>(
  [concept:"red apple"],
  [concept:"green apple"]
)
→
[
  [concept:"yellow apple"],
  [concept:"blue apple"],       // playful
  [concept:"ripe apple"],
  [concept:"sour apple"]
]
\`\`\`

---

## 🧠 properties

- **depth-anchored**: does not change `focal.depth`
- **breadth-expanding**: generates peer concepts by extending lateral space
- **dimension-aware**: relies on detecting describable variation axes
- **generative**: outputs are new conceptual candidates, not just retrieved

---

## 🧩 relationship to other motions

| motion          | relation                                                |
|------------------|----------------------------------------------------------|
| `<compare>`      | identifies axes used in `<extend>`                       |
| `<vary>`         | reused internally to construct variants                  |
| `<instantiate>`  | resolves inferred variants into coherent concepts        |
| `<explore>`      | may use `<extend>` as a mechanism                        |
