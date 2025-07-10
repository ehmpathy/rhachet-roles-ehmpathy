## 🧭 tactic: refine-term (resource or mechanism)

### 1. what does each term mean?
- interpret each candidate term in plain, real-world language
- ignore implementation details or data structures
- describe what the term **represents**:
  - for a **resource**: is it a thing, a quantity, a state, a constraint, or a transformation?
  - for a **mechanism**: is it a behavior, conversion, selection, or mutation?
- clarify: what would a non-technical person call this in conversation?

---

### 2. how could it be disambiguated?
- identify:
  - common **synonyms** or near-matches that mean similar things
  - terms with **collided semantics** (overloaded or unclear meanings across contexts)
- determine the term’s **functional role**:
  - [ ] resource: supply (available input or capacity)
  - [ ] resource: demand (consumed or booked commitment)
  - [ ] resource: constraint (limit, rule, or cap)
  - [ ] resource: transformation (derived or calculated state)
  - [ ] mechanism: getter (retrieves or filters data) → `getX`
  - [ ] mechanism: setter (updates or mutates) → `setX`
  - [ ] mechanism: transformer (converts formats or representations) → `castX`
  - [ ] mechanism: validator (checks or confirms conditions) → `isX`, `hasX`
- suggest disambiguation strategies:
  - add domain-specific prefix (e.g. `crew-`, `job-`, `calendar-`)
  - apply **polarity** (e.g. `available` vs `booked`, `open` vs `closed`)
  - increase specificity (e.g. `getAvailableWindows` vs `getSchedule`)
  - avoid generic suffixes like `-status`, `-data`, `-info`, `-handler`

---

### 3. rank candidate terms

| candidate term     | intuition | disambiguation | consistency | notes |
|--------------------|-----------|----------------|-------------|-------|
| `example-term-1`   | ⭐⭐        | ⭐⭐⭐           | ⭐⭐          |       |
| `example-term-2`   | ⭐⭐⭐       | ⭐⭐            | ⭐⭐⭐         |       |
| `example-term-3`   | ⭐         | ⭐⭐            | ⭐           |       |

---

### 4. define term role and family

| concept               | kind        | role/function        | suggested term     |
|-----------------------|-------------|-----------------------|---------------------|
| available resource    | resource    | supply                | `X`                 |
| booked commitment     | resource    | demand                | `Y`                 |
| max capacity or rule  | resource    | constraint            | `Z`                 |
| calculated value      | resource    | transformation        | `W`                 |
| retrieve/filter data  | mechanism   | getter                | `getX`              |
| update or mutate      | mechanism   | setter                | `setX`              |
| convert or transform  | mechanism   | transformer           | `castX`             |
| check/guard/validate  | mechanism   | validator             | `isX`, `hasX`       |

---

### 5. pick exactly one best-fit term

e.g.,

✅ **final choice: `example-term-2`**

- clearly conveys the intended function or data structure
- avoids overloaded meanings or ambiguous usage
- aligns with system-wide naming conventions and mental models

explicitly reject the others:
- `example-term-1` was too vague or collided with adjacent terms
- `example-term-3` didn’t align with other system patterns
