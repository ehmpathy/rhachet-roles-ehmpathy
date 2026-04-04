# self-review r8: role-standards-coverage

deep articulation of why all expected patterns are present.

---

## rule directories checked

all 29 mechanic brief directories reviewed for relevance:

| directory | applicable? | reason |
|-----------|-------------|--------|
| lang.terms | yes | briefs introduce terms |
| lang.tones | yes | briefs use lowercase |
| code.prod/readable.narrative | yes | 2 new briefs here |
| code.prod/evolvable.architecture | yes | wet-over-dry updated |
| code.prod/consistent.* | no | no packages or contracts in pr |
| code.prod/evolvable.domain.* | no | briefs are markdown, not ts |
| code.prod/evolvable.procedures | no | briefs are markdown, not ts |
| code.prod/evolvable.repo.structure | no | file locations verified separately |
| code.prod/pitofsuccess.* | no | no error code, procedures, or typedefs |
| code.prod/readable.comments | no | applies to code comments, not brief files |
| code.prod/readable.persistence | no | no persistence layer |
| code.test/* | no | no test files in pr |
| work.flow/* | no | no workflow automation |

confirmed: all relevant directories checked.

---

## brief structure coverage

### `.what` section present in all briefs

**why this matters:** `.what` tells readers the brief's purpose in one glance.

| file | `.what` present? | content |
|------|-----------------|---------|
| define.domain-operation-grains.md | yes (line 3) | "domain.operations have two grains" |
| philosophy.transform-orchestrator-separation.[philosophy].md | yes (line 3) | "orchestrators compose, transforms compute" |
| rule.require.orchestrators-as-narrative.md | yes (line 3) | "orchestrators must read as narrative" |
| rule.forbid.decode-friction-in-orchestrators.md | yes (line 3) | "orchestrators must not contain logic that requires mental simulation" |
| rule.require.named-transforms.md | yes (line 3) | "extract decode-friction logic into named transforms" |
| rule.forbid.inline-decode-friction.md | yes (line 3) | "forbid decode-friction inline in orchestrators" |

**why this holds:** each brief opens with a clear `.what` section that states its purpose. readers know immediately what the brief is about.

---

### `.enforcement` section present in all rule briefs

**why this matters:** without explicit enforcement level, reviewers don't know if violations are blockers or nitpicks.

| file | has `.enforcement`? | content |
|------|--------------------| --------|
| rule.require.orchestrators-as-narrative.md | yes (line 45) | `orchestrator with decode-friction = blocker` |
| rule.forbid.decode-friction-in-orchestrators.md | yes (line 36) | `decode-friction in orchestrator = blocker` |
| rule.require.named-transforms.md | yes (line 42) | `decode-friction inline in orchestrator = blocker` |
| rule.forbid.inline-decode-friction.md | yes (line 41) | `decode-friction inline in orchestrator = blocker` |

**why this holds:** all four rule briefs explicitly state `= blocker`. reviewers know these are hard requirements, not suggestions.

---

### `.see also` section present for cross-references

**why this matters:** briefs form a graph of concepts. readers need links to related briefs.

| file | has `.see also`? | references count |
|------|-----------------|------------------|
| define.domain-operation-grains.md | yes | 3 refs |
| philosophy.transform-orchestrator-separation.[philosophy].md | yes | 3 refs |
| rule.require.orchestrators-as-narrative.md | yes | 3 refs |
| rule.forbid.decode-friction-in-orchestrators.md | yes | 4 refs |
| rule.require.named-transforms.md | yes | 3 refs |
| rule.forbid.inline-decode-friction.md | yes | 3 refs |

**why this holds:** every brief ends with `.see also` that links to related briefs. the graph is connected:
- architect briefs link to each other
- mechanic briefs link to architect definitions
- all briefs link to related rules

---

## content completeness coverage

### examples present in all rule briefs

**why this matters:** rules without examples are abstract. examples show the rule in action.

**rule.require.orchestrators-as-narrative.md:**
- good example (lines 18-27): shows orchestrator with named operations
- bad example (lines 31-43): shows same code with inline decode-friction
- **why this holds:** contrastive examples make the rule concrete. readers see both "do this" and "not this".

**rule.forbid.decode-friction-in-orchestrators.md:**
- examples table (lines 20-28): 5 categories with before/after
- **why this holds:** table format shows multiple patterns at once. readers can scan for their specific case.

**rule.require.named-transforms.md:**
- examples table (lines 20-27): 4 before/after pairs
- **why this holds:** matches the pattern from the forbid counterpart. consistent format.

**rule.forbid.inline-decode-friction.md:**
- "what is decode-friction" (lines 14-23): 6 patterns listed
- "what is NOT decode-friction" (lines 25-32): 4 patterns listed
- **why this holds:** dual sections clarify the boundary. readers know what to avoid AND what's acceptable.

---

### require/forbid counterparts present

**why this matters:** require rules state "do this". forbid rules state "don't do that". both perspectives help.

| require rule | paired forbid rule |
|--------------|--------------------|
| rule.require.orchestrators-as-narrative | rule.forbid.decode-friction-in-orchestrators |
| rule.require.named-transforms | rule.forbid.inline-decode-friction |

**why this holds:** each require rule has a forbid counterpart. the structure is symmetric:
- architect level: 1 require + 1 forbid
- mechanic level: 1 require + 1 forbid

---

### mechanic briefs defer to architect definitions

**why this matters:** mechanic briefs implement architect principles. they shouldn't redefine structural concepts.

**rule.require.named-transforms.md** defers:
- line 50: references `define.domain-operation-grains` for grain definitions
- line 31: defers to `rule.require.get-set-gen-verbs` for name conventions

**rule.forbid.inline-decode-friction.md** defers:
- line 49: references `define.domain-operation-grains` for grain definitions

**why this holds:** mechanic briefs link to architect briefs rather than duplicate definitions. single source of truth preserved.

---

### wet-over-dry reconciliation complete

**why this matters:** the new rule (readability abstraction triggers immediately) could contradict wet-over-dry (wait for 3+). explicit reconciliation prevents confusion.

**rule.prefer.wet-over-dry.md** update (lines 120-137):
- line 122: "wet-over-dry applies to *reuse* abstraction"
- line 124: "but *readability* abstraction triggers immediately"
- lines 129-132: comparison table with type/trigger/when columns

**why this holds:** the exception is explicitly carved out. readers understand:
- reuse abstraction → wait for 3+
- readability abstraction → extract immediately

no contradiction remains.

---

### boot.yml updates present

**why this matters:** briefs not in boot.yml won't be loaded at session start.

**architect/boot.yml** (verified in behavior-declaration-coverage review):
- lines 6, 13-15: all 4 new briefs in say section

**mechanic/boot.yml** (verified in behavior-declaration-coverage review):
- lines 137-138: both new briefs in say section

**why this holds:** new briefs are registered. agents will see them.

---

## gaps found

none.

all expected coverage patterns present:
- `.what` sections: all 6 briefs have them
- `.enforcement` sections: all 4 rule briefs have them with blocker level
- `.see also` sections: all 6 briefs have them
- examples: all 4 rule briefs have concrete examples
- require/forbid pairs: both architect and mechanic levels complete
- deference: mechanic briefs link to architect definitions
- reconciliation: wet-over-dry exception explicit
- boot.yml: both roles updated

---

## summary

coverage review complete.

all expected patterns are present and articulated.

no absent patterns detected.

all gaps would have been fixed if found — none were found because the implementation is complete.
