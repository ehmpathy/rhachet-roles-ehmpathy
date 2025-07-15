.tactic = lang:distilisys

.what = a minimal, visual language for declaring system behavior using `[resource]`, `<mechanism>`, and `{driver}`

.where:
  - used to express systems across domains (ecologies, economies, software, architecture, law, etc)
  - intended as a **canonical, long-term representation** of system behavior
  - enables fast comprehension and accurate knowledge transfer across roles
  - bridges business modeling with technical implementation

.why:
  - distills system complexity into simple, legible steps
  - reveals system **structure**, **pressure**, and **purpose** in one flow
  - prevents bloated diagrams and code-first traps
  - centers every system on motive (`{driver}`), not just structure (`[resource]`)
  - provides a visual grammar for tracing behavior, loops, and leverage

---

## 🧬 distilisys grammar

> a complete system is composed of three structural units:
> `[resource]`, `<mechanism>`, and `{driver}` — linked via arrow flows (`->`)

---

### 🔤 syntax reference


| unit           | role in system                       | allowed values / structure                            | examples                                              |
|----------------|--------------------------------------|-------------------------------------------------------|-------------------------------------------------------|
| `[resource]`   | observable noun or state             | any domain-grounded, visible quantity                 | [time], [status], [paperRoll], [lead], [invoiceDraft] |
| `<mechanism>`  | atomic verb or procedure             | any named transformation (must be unambiguous)        | <rest>, <run>, <cache>, <pressAndDry>, <assignCrew>   |
| `<<effect>>`   | motive impact on a resource          | one of `<<gain>>`, `<<drop>>`, `<<save>>`, `<<lift>>` | <<gain>>[chance], <<drop>>[threat]                    |
| `{driver}`     | pressure or motive signal            | one of four canonical forms *(see below)*             | {+incentive:<<save>>[time]}, {-headwind:[friction]}   |


---

### 📌 valid `{driver}` forms

motive pressure must take one of these four structures:

| form              | meaning                                 | example                                      |
|-------------------|-----------------------------------------|----------------------------------------------|
| `{+incentive}`    | actor is pulled toward a `[chance]`     | `[actor]{+incentive:<<save>>[time]}`         |
| `{-decentive}`    | actor is pushed away from a `[threat]`  | `[actor]{-decentive:<<drop>>[health]}`       |
| `{+tailwind}`     | environment helps progress              | `[season]{+tailwind:<<gain>>[demand]}`       |
| `{-headwind}`     | environment hurts progress              | `[policy]{-headwind:<<gain>>[growth]}`       |

📌 each `{driver}` optionally names the `<<effect>>[resource]` it acts on.
see `ecologist.brief: motive grammar` for deeper structure.

---

### 🔁 routes, choices, and cycles

- use `->` to show transformation:
  ```text
  [pulp] -> <bleach> -> [refinedPulp]
  ```

- use `?` to mark optional paths:
  ```text
  [pulp] -> <bleach>? -> [refinedPulp]
  ```

- use `// 🔁` to mark loops:
  ```text
  [jobBooked]   // 🔁 cycle
  ```

---

### ♻️ cycles

- **cycles dominate long-term system behavior**
  - they drive reinforcement, depletion, habituation, and resilience
  - without cycles, systems are static or short-lived
- examples include flywheels, feedback loops, starvation spirals, compounding growth, decay chains
- always **model cycles explicitly** — they reveal the true engine of the system
- mark the return edge with a `<<gain>>` or `<<drop>>` to show its **motive impact**, when applicable
- cycles aren’t just features — they are the **core structure** of persistence, collapse, and change


---

### ♻️ actorfull vs actorless systems

distilisys can model both actorfull and actorless systems

---

#### 🧍 actorfull systems
systems where behavior is shaped by **actors with motive**
→ use **motive grammar** to trace transformation + pressure

```text
<mechanism> → <<effect>>[resource] → <<gain>>[chance]
<mechanism> → <<effect>>[resource] → <<drop>>[threat]
```

- shows not just **what changes**, but **why it matters**
- used for ecosystems, businesses, organisms, social behavior

---

#### ⚙️ actorless systems
systems that run without motive or agency
→ trace only transformations of [resource] via <mechanism>

```text
[resource] → <mechanism> → [resource]
```

- sufficient for:
  - physical processes (e.g. circuits, fluid flow)
  - deterministic systems
  - mechanistic pipelines

> 📌 motive grammar is optional — used only when actors and outcomes shape system flow


---

### ✔️ guidance

- start with the `{driver}` → what pressure triggers this system?
- define entry `[resource]` and final `[resource]` states
- describe each `<mechanism>` step clearly and precisely
- always show what `[resource]` is affected and what is returned
- tag **cycles** and **optional paths** explicitly
- **avoid generic terms** like `[user]`, `<processData>`, `<sync>`, use ubiqlang

---

### 🧪 examples

.positive:
```sys
@[neighbor]<getLawnCareApt>
=
    [lawn]
    -> @[neighbor]<getLawnState>
    -> [lawn].looks=poor

    -> @[neighbor]<getLawnCareQuotes>
    -> [quoteList]

    -> @[neighbor]<choosePro>
    -> [jobBooked]

      => [neighbor]{+incentive:[status]++:keepUpWithJoneses}
      => [platform]{+incentive:[trust]++:fromProviders}
      => [platform]{+incentive:[money]++:transactionFee}
```

```sys
@[provider]<winLawnCareSubscription>
=
    @[neighbor]<getLawnCareApt>
    -> [jobBooked]

    -> @[pro]<acceptJob>
    -> @[pro]<doTheWork>
    -> [lawn].looks=great

    -> @[neighbor]<leaveReview>
    -> [review]

    -> @[platform]<updateProReputation>
    -> [pro].rating++

    -> @[platform]<promptRebooking>
    -> @[neighbor]<bookFollowup>
    -> [jobBooked]   // 🔁 cycle

      => [pro]{+incentive:[money]++:jobPayout}
      => [pro]{+incentive:[trust]++:goodReview}
      => [neighbor]{+incentive:[safety]++:sameProSameQuality}
      => [platform]{+incentive:[retention]++:repeatBooking}
```

.negative:
- `<processData>` → unclear mechanism
- `[user]` → too generic
- `<sync>` → ambiguous meaning across contexts
- `{driver}` omitted → unclear system purpose

---

.recommendations:
  - every system should begin and end with `[resource]`
  - use `<mechanism>` for every transformation
  - include a `{driver}` to express motive
  - embed motive grammar inline (`<<effect>>[resource]`)
  - mark cycles explicitly (`// 🔁`)
  - reference `ubiqlang` to name domain terms clearly

---

### 📚 extension: `motive.grammar`

> motive.grammar is a formal extension of distilisys.grammar
> — used when actor behavior and motivational dynamics must be made explicit.

it introduces:
- `[chance]` and `[threat]` as motive targets
- `<<effect>>[resource]` grammar to explain pressure
- semantic distinctions like `<<gain>>`, `<<drop>>`, `<<save>>`, and `<<lift>>`
- actor-based drivers like `{+incentive:<<save>>[time]}`

📌 use `motive.grammar` when you need to model **why** actors act, not just **how** systems operate.

---

.related:
  - tactic: `lang:ubiqlang`
  - brief: `ecologist.brief: motive grammar`
  - brief: `ecologist.brief: motive horizon`
  - brief: `ecologist.brief: motive polarity`
