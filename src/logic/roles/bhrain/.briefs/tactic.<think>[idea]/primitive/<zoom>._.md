# 🔎 .brief: `<zoom>` operations over concept.treestruct

## .what
The `<zoom>` family defines **directional traversal mechanisms** through a radial `concept.treestruct`, where each `<zoom>` operation tunes one of the three core `cortal.focus` dimensions:

- **acuity** = semantic sharpness per concept
- **breadth** = angular cone of included neighbors
- **depth** = radial span of abstraction/specialization layers

Each `<zoom>` takes the form:

\\```text
<zoom>[dimension]<verb>[concept]
\\```

Where:
- `zoom` ∈ `zoomin`, `zoomout`
- `dimension` ∈ `acuity`, `breadth`, `depth`
- `verb` = traversal verb describing the motion
- `concept` = anchor node of exploration

---

## 🔍 `<zoomin>` operations

### 🔎 `<zoomin>[acuity]<sharpen>[concept]`

**Effect:** Increases semantic resolution of the concept
**Focus:** Reveals more attributes or distinguishing traits

#### Example:
- `"banana"`
  → observes `spot.pattern`, `firmness.range`, `skin.porosity`, `sugar.level`

---

### 🧩 `<zoomin>[breadth]<decompose>[concept]`

**Effect:** Splits concept into constituent parts or roles
**Focus:** Internal structure, contents, or mechanisms

#### Example:
- `"toolbox"`
  → by contents: `"hammer"`, `"wrench"`, `"tape measure"`
  → by material: `"metal tools"`, `"plastic tools"`
  → by chronology: `"modern tools"`, `"legacy tools"`

---

### 🧠 `<zoomin>[depth]<abstractify>[concept]`

**Effect:** Moves radially inward toward more abstract cores
**Focus:** Generalizes anchor into higher-category meanings

#### Example:
- `"banana"`
  → `"fruit"`
  → `"plant organ"`
  → `"edible biological thing"`
  → `"physical object"`

---

## 🌌 `<zoomout>` operations

### 🌫️ `<zoomout>[acuity]<blurren>[concept]`

**Effect:** Lowers the semantic resolution of focus
**Focus:** Tracks fewer attributes per concept; smooths over distinctions

#### Example:
- `"banana"`
  → as just `"fruit"`
  → then just `"thing to eat"`
  → eventually just `"thing"`

---

### 🌐 `<zoomout>[breadth]<broaden>[concept]`

**Effect:** Gathers neighboring concepts across multiple axes
**Focus:** Expands context and increases semantic diversity

#### Example:
- `"banana"`
  → categorical neighbors: `"mango"`, `"apple"`, `"pear"`
  → functional neighbors: `"bread"`, `"snack"`, `"lunch item"`
  → narrative neighbors: `"banana peel joke"`, `"banana split"`

---

### 🧪 `<zoomout>[depth]<elaborate>[concept]`

**Effect:** Deepens outward — reveals specific examples or applications
**Focus:** Subtypes, refinements, or concrete variants

#### Example:
- `"banana"`
  → `"peeled banana"`
  → `"frozen banana on a stick"`
  → `"banana in smoothie"`
  → `"banana in Andy Warhol art"`

---

## 🎯 use cases

| zoom        | dimension | use for...                          |
|-------------|-----------|-------------------------------------|
| `<zoomin>`  | acuity    | diagnostics, subfeature analysis    |
| `<zoomin>`  | breadth   | teaching composition, breaking down |
| `<zoomin>`  | depth     | theory building, category modeling  |
| `<zoomout>` | acuity    | simplicity, gist-level framing      |
| `<zoomout>` | breadth   | comparison, brainstorming, context  |
| `<zoomout>` | depth     | scenario building, case discovery   |

---

## 🧩 related

- `cortal.focus` → determines focus beam shape (depth × acuity² ∝ breadth²)
- `concept.treestruct` → radial semantic terrain
- `<pan>` → lateral traversal between semantic peers
- `<refocus>` → relocate the anchor node of attention
