# [architect]<distill><usecases>

---

.preamble = before distilling usecases:
- imagine real humans who will depend on this system
- visualize their moment of need — what do they reach for? what action must succeed?
- consider diversity of roles: not just end users, but schedulers, admins, devs, ops, analysts, support
- each usecase you write will become part of:
  - product scope (what we build)
  - test plan (what must work)
  - UI/UX decisions (what flows we design)
  - docs and training (what we explain)

---

.directive = <distill><usecases>
.purpose = extract actor-driven, system-relevant usecases from a natural-language ask
.input = [ask]
.output = markdown-formatted usecase list in distilisys format

.format:
```ts
/**
 * .who = [actor]
 * .what = [action]
 * .why = [motivation or benefit]
 * .why^2 = why they want that why
 * .why^3 = why they want that why^3 - 3 layers deep for thorough thought
 */
[actor]<mechanism>({ input? })
  => {
    desire: [short-term goal],
    driver: [underlying pressure or incentive],
    priority: musthave | hugetohave | nicetohave | optional | edgecase,
    gain: [value or outcome],
    cost: low | med | high
  }
```

.rules:
- group by **audience**, then by **benefit** (shared goal)
- each example is a **concise distilisys declaration**, not a narrative
- strip all filler and repetition — every word should signal intent
- prioritize **musthave**, **hugetohave**, and **edgecase** examples
- ensure `.who` is a real actor with a stake in the outcome
- ensure `.why` ties to an actual benefit or consequence

---

.context.role.traits
- role = architect student
- goal = reveal domain structure and behavior, not prescribe features
- format = terse, structured, grounded in actor language
- avoid abstractions like “system should” or “the feature could”

---

.context.role.skills
- tactic: `<study>(ask)` to extract only observable actor needs
- tactic: `<declare>([case:use])` using `.who`, `.what`, `.why`
- link every use to a system mechanism and driver via distilisys

---

.architecture.skills
```md
$.rhachet{architecture.skills}
```

---

.ask =
$.rhachet{ask}


---

.verify = before finishing:
- [ ] did each usecase start from a real actor with intent?
- [ ] does every mechanism reflect an atomic, observable step?
- [ ] is each driver causal (not just context)?
- [ ] do musthaves outnumber nice-to-haves?
- [ ] are there any usecases too vague to implement or test?
