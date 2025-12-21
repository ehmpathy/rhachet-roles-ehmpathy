# 🧩 .brief: `<diverge>` — thought process

## .what
`<diverge>` is a **generation motion** that produces a **set of instances** for a concept with **maximum variance** between the items. the goal is not to list “many,” but to list **few-but-far-apart** exemplars.

---

## .why
- broaden the option space without redundancy
- stress-test a concept’s **range** (edges, oddballs, subfamilies)
- set up later motions (`<converge>`, `<select>`, `<compose>`) with a **wide, non-overlapping** base

---

## inputs
- **concept**: the target (e.g., colors, chairs, marketing channels)
- **unit form**: what counts as one instance (word, phrase, object spec)
- **distance model**: how “far apart” is measured (semantic, categorical, feature-based)
- **k**: how many outputs are needed

---

## invariants
- **max-min spread**: each new item should maximize its **minimum distance** to all items already chosen
- **validity**: every item is a bona fide member of the concept
- **succinctness**: one idea per line; no explanations in the list
- **coverage over density**: prefer covering new subregions over adding near-duplicates

---

## motion (mental model)
1. **map space** → sketch the **feature axes** that matter for the concept.
2. **seed diversity** → identify **anchor families** (distinct subtrees/branches).
3. **generate candidates** → pull 2–3 plausible items per family (wide net).
4. **score distance** → define a quick **distance check**.
5. **select via max-min** → iteratively pick the candidate that **maximizes its nearest-distance** to the selected set.
6. **prune overlaps** → drop near-synonyms or adjacency collisions.
7. **edge sweep** → intentionally look for **outliers** (extremes on any axis).
8. **final balance** → small pass to ensure the set spans the map.

---

## distance (practical checks)
- **categorical gap**: belongs to a different top-level branch? (+2)
- **feature delta**: differs on ≥2 salient axes (+1 per axis)
- **name morphology**: not a near-synonym (-1)
- **use-context split**: evokes non-overlapping use (+1)
- **rarity/edge**: sits at a conceptual edge (+1)

---

## anti-patterns
- **family crowding**: many picks from the same sub-branch
- **axis myopia**: varying only one axis
- **category leak**: items that aren’t valid members
- **verbosity**: embedded definitions

---

## stopping rules
- you have **k** items **and** each item’s nearest-distance ≥ threshold
- adding a new item would **lower** the set’s min-distance
- all major **anchor families** are represented

---

## example walk-through (colors)
**seed concept**: colors
**axes**: hue family, saturation, brightness, cultural role, materiality, neutrality
**anchor families**: primary, secondary, warm neutrals, cool neutrals, near-whites, pigments, darks

**max-min selection (k=7)** →
- red
- green
- tangerine
- scarlet
- ivory
- teal
- charcoal

---

## quick operator (heuristic)
1) list 5–8 **branches** →
2) produce 2–3 candidates per branch →
3) start with the **most canonical** item →
4) repeatedly add the candidate with **largest nearest-distance** →
5) prune clashes →
6) edge-scan

---

## prompt scaffold
- “enumerate **{k}** instances of **{concept}** with **maximum variance**.
- one item per line, no explanations.
- span **distinct branches**: {name 4–7 axes}.
- apply **max-min diversity**: each item must be far from prior items.
- refuse near-synonyms; prefer branch coverage and edges.”

---

## output contract
- **format**: list of **k** lines (or json array)
- **property**: each line is **valid**, **atomic**, and **far** from its neighbors
- **purpose**: ready for downstream `<converge>` or ranking

---

## tiny checklist
- [ ] ≥4 distinct branches covered
- [ ] no near-synonyms remain
- [ ] at least one edge case included
- [ ] each item clearly distinct from its nearest neighbor

that’s the `<diverge>` thought process: **map → seed → generate → score → select → sweep → ship**.
