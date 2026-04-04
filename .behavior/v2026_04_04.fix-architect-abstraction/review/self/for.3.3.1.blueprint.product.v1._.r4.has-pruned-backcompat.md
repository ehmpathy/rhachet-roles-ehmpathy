# self-review r4: has-pruned-backcompat

fourth pass. what did r3 miss?

---

## pause. did r3 question the right topic?

r3 asked: "do our changes break extant behavior?"

r4 asks: "do we preserve behavior we should not preserve?"

---

## backwards compat that was not explicitly requested

### question 1: are we too careful with wet-over-dry?

| what we do | alternative |
|------------|-------------|
| add exception section | replace entire rule? |

**analysis:**
- wisher said "make sure all briefs are coherent"
- wisher did NOT say "replace wet-over-dry"
- an exception is the minimal change to achieve coherence

**verdict:** we are not overly cautious. exception is the right approach. wisher confirmed.

---

### question 2: do we need dual-level briefs (architect + mechanic)?

| what we do | alternative |
|------------|-------------|
| 4 architect + 2 mechanic briefs | single combined brief? |

**analysis:**
- wisher explicitly confirmed dual-level structure
- architect briefs define structural principle
- mechanic briefs provide implementation guidance
- this is not backwards compat — it is the requested structure

**verdict:** dual-level is requested design, not backwards compat caution.

---

### question 3: do we preserve compatibility with code we should break?

**analysis:**
- we add new briefs (no code to break)
- we update wet-over-dry with exception (additive, not a break)
- we create handoff for bhuild (future work, not backwards compat)

no backwards compat shims exist in this blueprint. all content is either:
1. new (briefs)
2. additive (exception section)
3. future handoff (bhuild)

**verdict:** no backwards compat preservation found. blueprint is clean addition.

---

### question 4: could we skip the wet-over-dry update?

| with update | without update |
|-------------|----------------|
| coherent briefs | contradictory guidance |

**analysis:**
- wisher explicitly said "we must make sure that all our briefs are coherent"
- wet-over-dry says "wait for 3+ usages"
- new rule says "extract immediately for readability"
- without update, mechanics get contradictory guidance

**verdict:** update is required for coherence, not backwards compat.

---

## issues found in r4

### none found

r4 found no unnecessary backwards compat. this blueprint:
- adds new content (briefs)
- makes one additive update (wet-over-dry exception)
- creates one future handoff (bhuild)

no backwards compat shims, no compatibility layers, no deprecation warnings.

---

## why it holds

| concern | why not an issue |
|---------|------------------|
| wet-over-dry approach | exception is minimal; wisher confirmed coherence |
| dual-level structure | wisher-requested design |
| code preservation | no code changed; briefs only |
| wet-over-dry update | required for coherence |

---

## summary

r4 asked: "do we preserve what we should break?"

answer: no. this blueprint contains:
- zero backwards compat shims
- zero compatibility layers
- zero deprecation warnings

all content is additive (new briefs, new exception) or future work (bhuild handoff).

we are not overly cautious. we are precise.
