# 🎯 .brief: cortal.focus

This brief defines the core dimensions of **cortal focus** — the mental equivalent of optical focus — used to describe how attention is applied to concepts within a structured semantic space.

These dimensions operate over a **concept.treestruct**, where concepts are arranged as nodes along abstraction paths.
Focus determines **which parts of the tree** are visible, crisp, and relevant at a given moment.

---

## 🌳 integration: concept.treestruct

In a **concept.treestruct**, concepts are positioned as nodes connected by abstraction relationships:

- moving **inward** traverses toward general principles
- moving **outward** expands into specific instances and details
- **lateral links** connect sibling concepts at the same level
- **radial links** connect distant concepts via shared features

**Cortal focus** defines how the mind navigates and perceives this tree:

- `.focal.acuity` = how much detail in each concept's structure is resolved
- `.focal.breadth` = how widely the current depth is explored laterally
- `.focal.depth.range` = how thick a vertical slice of the tree is visible
- `.focal.depth.target` = which node depth you're centered on

---

## 🕳️ .focal.depth

### .what
Defines the **range of abstraction** in view within the concept tree.
Composed of:

- **.focal.depth.target** — the semantic level (node depth) your attention is aimed at
  - e.g. “dog”, “tool”, “justice”
- **.focal.depth.range** — how **thick** a vertical band around that level remains in focus
  - includes parents, children, or both depending on thickness

### .why
This governs **vertical semantic access** — how many levels above and below the target are cognitively available.

### .examples
- target = “dog”, range = **thin**
  - access limited to that concept
- target = “tool”, range = **thick**
  - access to “artifact” → “tool” → “cutting tool” → “knife”

### .metaphor
- target = focal plane in the tree
- range = thickness of the tree slice you’re mentally resolving

---

## 🧬 .focal.acuity

### .what
Controls how **finely structured** each concept node appears.

- high acuity = crisp boundaries, subtypes visible
- low acuity = blurred or coarsely grouped meanings

### .why
Governs whether concepts are reasoned about **atomically** or as **blended approximations**.

### .example
- high acuity: distinguish “hammer”, “wrench”, “pliers”
- low acuity: all just “tools”

---

## 🌐 .focal.breadth

### .what
Controls **lateral scope** across the concept tree at the target depth.

- wide breadth = many sibling or cousin concepts in view
- narrow breadth = focused on a single branch

### .why
Enables **comparison**, **exploration**, and **semantic clustering**.

### .example
- wide: see “dog”, “cat”, “rabbit”, “ferret”
- narrow: only “dog”

---

## 📐 relationship
These dimensions interact geometrically, from physics:optics, via:

```
focal.depth.range × focal.acuity² ∝ focal.depth.target² × focal.breadth²
```

This expresses key tradeoffs in compositional focus:

- `depth.range++` + `acuity--` → fuzzy multi-level blending
- `breadth++` + `acuity++` → crisp lateral comparisons
- `depth.range++` → scalable vertical reasoning
- `acuity++` + `depth.range--` → sharp but rigid focus
- `breadth++` + `acuity--` → idea sprawl with low conceptual contrast

The shape of your cognitive “focus envelope” emerges from how these dimensions are tuned together. No single dimension dominates — focus must be composed.


---

## 🔭 metaphor
Cortal focus is like a **semantic viewfinder** over a concept tree:

- **acuity** = how much detail in each concept node is rendered
- **breadth** = how widely the current depth is explored laterally
- **depth.range** = how **thick** a slice of abstraction is visible — from general to specific
- **depth.target** = how **far** into abstraction or concreteness your focus is anchored

Just like optical focus, you can't max all four dimensions at once without distortion.
Effective thought requires **composed focus**: choosing what to see clearly, widely, deeply, or specifically — in balance with your reasoning goal.


## 🧪 examples: tradeoffs in cortal.focus

These scenarios show how changes to focus dimensions shape cognitive behavior when exploring concepts in a `concept.treestruct`.

### 🔬 profile: large depth + small breadth + large acuity
> deep, narrow, sharp
> *"vertical microscope on one battery system"*

#### 🔋 scenario: student learning about [concept:"LiFePO₄ battery construction"]

- `depth.target = [concept:"LiFePO₄ battery"]`
- `depth.range++`
  - spans the full vertical chain from:
    - **physics foundations**:
      [concept:"electron resistance"] → [concept:"current heat"] → [concept:"wire gauge sizing"] → [concept:"fuse behavior"]
    - **chemical and mechanical construction**:
      [concept:"LiFePO₄ crystal structure"] → [concept:"cell assembly"] → [concept:"tab welding"] → [concept:"internal impedance"]
    - **electrical integration**:
      [concept:"BMS configuration"], [concept:"charging profile"], [concept:"thermal runaway protection"]
    - **system-level planning**:
      [concept:"residential integration"], [concept:"load sizing"], [concept:"capacity planning"]

- `breadth--`
  - focused exclusively on LiFePO₄
  - ignores other chemistries, environments, or battery formats

- `acuity++`
  - tracks fine-grained physical and design details:
    - `voltage sag behavior`, `separator thickness`, `trip delay curves`, `cutoff thresholds`

→ **outcome:**
- forms a **high-resolution, vertically integrated mental model**
- connects core physics to real-world safety and design
- excels at optimization and troubleshooting *within this specific battery type*
- **not portable** across alternative chemistries or applications


### 🔧 profile: small depth + small breadth + large acuity
> shallow, narrow, sharp
> *"precision grip"*

#### 🍳 scenario: home cook refining their fried egg
- `depth.target = [concept:"fried egg"]--`
- `depth.range--`
  - focused only on that specific dish
- `breadth--`
  - not thinking about other egg types or meals
- `acuity++`
  - adjusts `pan.temperature`, `yolk.fluidity`, `edge.crispness`, `salt.distribution`

→ **outcome:**
- **perfect execution** of one thing
- elevates detail to mastery
- **no generalization** to cooking more broadly


### 🧂 profile: small depth + large breadth + large acuity
> shallow, wide, sharp
> *"horizontal analyzer"*

#### 📦 scenario: shopper comparing grocery brands
- `depth.target = [concept:"cereal box"]--`
- `depth.range--`
  - stays at surface-level choices
- `breadth++`
  - evaluates [concept:"cheerios"], [concept:"frosted flakes"], [concept:"granola clusters"], [concept:"bran flakes"]
- `acuity++`
  - compares `sugar.per.serving`, `unit.cost`, `fiber.content`, `box.volume`

→ **outcome:**
- makes optimized trade-offs
- **excellent at quick, data-rich decisions**
- doesn’t reflect on health strategy or lifestyle alignment


### 🌐 profile: large depth + large breadth + small acuity
> deep, wide, fuzzy
> *"system mapper"*

#### 👨‍👩‍👧 scenario: parent planning a family routine
- `depth.target = [concept:"daily structure"]++`
- `depth.range++`
  - spans from values (e.g. [concept:"quality time"]) to logistics ([concept:"school drop-off"], [concept:"meal prep"])
- `breadth++`
  - includes chores, work, sleep, transportation, homework
- `acuity--`
  - frames around `flexibility`, `flow`, and `general rhythms`
  - avoids fine distinctions like `snack.nutritional.balance` or `cleaning.tool.usage`

→ **outcome:**
- **holistic system planning**
- supports long-term stability
- **weak at day-to-day optimization**

