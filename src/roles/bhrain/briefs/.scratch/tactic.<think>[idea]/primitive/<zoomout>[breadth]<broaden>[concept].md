# 🔭 .brief: `<zoomout>[breadth]<broaden>[concept]`

## .what
**`<broaden>`** increases the **semantic breadth** of focus around a concept — by including **more neighbor concepts** that live at the same abstraction depth.

It performs a **`focal.breadth++`** operation:
- adds **neighbors** from multiple semantic dimensions
- does **not increase detail** (`acuity`) or **abstraction layers** (`depth`)
- instead, it **extends lateral context**

> Imagine widening your field of view across the current concept layer.

---

## 📐 how it behaves

From a chosen **anchor concept**, `<broaden>` gathers peer concepts across various **semantic dimensions**:
- **categorical** — same type or class
- **functional** — similar roles or effects
- **relational** — co-occurring or co-referenced
- **modal** — alternative forms or scenarios
- **emotional** — parallel affective responses
- **contextual** — common settings or frames

---

## 🎯 examples: `<broaden>[concept]` with multiple dimensions

### 🍌 concept: `"banana"`

- **categorical**: [concept:"apple"], [concept:"pear"], [concept:"mango"]
- **functional**: [concept:"fruit snack"], [concept:"smoothie ingredient"]
- **relational**: [concept:"monkey"], [concept:"grocery shelf"]
- **modal**: [concept:"peeled banana"], [concept:"mashed banana"]
- **emotional**: [concept:"comfort food"], [concept:"sweet treat"]

---

### 🧰 concept: `"toolbox"`

- **categorical**: [concept:"tool chest"], [concept:"belt pouch"], [concept:"tackle box"]
- **functional**: [concept:"storage container"], [concept:"portable kit"]
- **relational**: [concept:"workshop"], [concept:"repair job"]
- **modal**: [concept:"plastic toolbox"], [concept:"modular drawer system"]
- **chronical**: [concept:"daily use tools"], [concept:"emergency tools"]

---

### 🔋 concept: `"battery"`

- **categorical**: [concept:"fuel cell"], [concept:"capacitor"], [concept:"power bank"]
- **functional**: [concept:"energy storage"], [concept:"power delivery"]
- **relational**: [concept:"charger"], [concept:"device"]
- **modal**: [concept:"dead battery"], [concept:"rechargeable battery"]
- **contextual**: [concept:"electric car"], [concept:"remote control"]

---

### 🛠️ concept: `"fixing a leak"`

- **categorical**: [concept:"repair task"], [concept:"home maintenance"]
- **functional**: [concept:"tightening bolt"], [concept:"replacing seal"]
- **relational**: [concept:"plumber"], [concept:"water damage"]
- **modal**: [concept:"quick patch"], [concept:"complete pipe replacement"]
- **chronical**: [concept:"emergency fix"], [concept:"scheduled repair"]

---

## 🧭 grammar
```txt
[anchor:concept] → <broaden> → [neighbor:concept[] by dimension]
