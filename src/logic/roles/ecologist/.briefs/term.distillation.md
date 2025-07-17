# 📘 term-selection.brief: how to distill the best term

> this brief defines a systematic method to choose the **clearest, strongest term** for a concept, pattern, or unit.
> good terms collapse synonyms, avoid confusion, and align with intuitive grasp — enabling fluent reuse across systems.

---

## 🧭 goals of a good term

- **🧼 clarity** – avoids ambiguity and misreading
- **🧲 gravity** – feels “right” and sticks in memory
- **🔁 reuse** – unlocks consistent expression across contexts
- **🧠 intuition** – fits what a first-time reader expects
- **🧯 disambiguation** – contrasts clearly from neighbors or opposites

---

## ⚠️ key naming hazards

| hazard            | example                     | fix                                                                 |
|-------------------|-----------------------------|----------------------------------------------------------------------|
| ❗ ambiguity       | `target`, `value`, `state`  | clarify the type or role (e.g. `goal`, `rank`, `setting`)            |
| 🔀 synonym clash   | `impact` vs `effect` vs `outcome` | collapse to one canonical form with clear internal grammar          |
| 🧱 intuition gap   | `vectorize` used for ranking | choose a more vivid or grounded term (e.g. `score`, `grade`, `weigh`) |
| ⚓ overload        | `tag` meaning many things   | constrain usage or rename distinctly (`label`, `marker`, `flag`)     |

---

## 🧪 test criteria for term selection

ask these when evaluating term candidates:

1. **is it vivid?**
   does it evoke the right imagery or mechanic?

2. **is it distinct?**
   does it clearly differ from adjacent terms?

3. **is it reusable?**
   can this term scale across similar use cases?

4. **does it collapse synonyms?**
   can it absorb nearby concepts under one roof?

5. **does it pass the "blank slate" test?**
   what would a first-time reader *assume* it means?

---

## 🔧 process to distill best term

1. **collect contenders**
   list all possible terms, including wild ideas

2. **tag each**
   note for each: clarity, conflicts, connotations, candidates it might replace

3. **simulate usage**
   plug into real example sentences or data flows

4. **eliminate and converge**
   remove fuzzy or redundant terms; prefer intuitive clarity over cleverness

5. **test opposite / inverse**
   name the inverse or contrast (e.g. if this is `<gain>`, what’s the `<drop>`?)

6. **declare and lock**
   publish as part of `.brief` or `ubiqlang`

---

## 📦 output format

distilled term entry should include:

```ts
{
  name: 'chance',
  role: 'a positively motivated [option]',
  replaces: ['opportunity', 'magnet', 'upside'],
  inverse: 'threat',
  test_case: '<enmotive> → <<gain>>[chance] → <choose>',
  note: '“chance” works as a synonym for “opportunity” without implying randomness'
}
```

---

## 🧭 guidance phrases

- “would this confuse someone from another domain?”
- “can this become a root word in our grammar?”
- “if we only had one word for this… which feels truest?”
