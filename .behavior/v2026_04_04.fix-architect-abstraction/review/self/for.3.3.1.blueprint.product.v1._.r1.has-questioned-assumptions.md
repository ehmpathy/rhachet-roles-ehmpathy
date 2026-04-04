# self-review r1: has-questioned-assumptions

review of: 3.3.1.blueprint.product.v1.i1.md

---

## assumptions questioned

### assumption 1: architect briefs go in `src/domain.roles/architect/briefs/practices/`

| question | answer |
|----------|--------|
| assumed without evidence? | **no** — follows extant pattern in repo |
| what if opposite were true? | could put in different location, but would break convention |
| based on evidence or habit? | evidence — extant briefs follow this structure |
| exceptions? | none — all architect briefs follow this pattern |
| simpler approach? | no — this is the standard location |

**verdict:** holds. follows extant convention.

---

### assumption 2: mechanic briefs go in `readable.narrative/` subdirectory

| question | answer |
|----------|--------|
| assumed without evidence? | **partially** — chose `readable.narrative/` based on content |
| what if opposite were true? | could put in `evolvable.architecture/` or root `practices/` |
| based on evidence or habit? | judgment — fits with extant `readable.narrative/` briefs |
| exceptions? | could argue it belongs in `evolvable.procedures/` |
| simpler approach? | same complexity either way |

**verdict:** holds. `readable.narrative/` is apt because the rule is about narrative flow in orchestrators.

---

### assumption 3: need both require and forbid rules

| question | answer |
|----------|--------|
| assumed without evidence? | **no** — wisher explicitly requested both |
| what if opposite were true? | single rule could cover both sides |
| based on evidence or habit? | wisher direction |
| exceptions? | some rules only have one side |
| simpler approach? | single rule, but wisher asked for both |

**verdict:** holds. wisher explicitly requested "include both the positive and negative sides to this rule require and forbid".

---

### assumption 4: four architect briefs needed (define, philosophy, require, forbid)

| question | answer |
|----------|--------|
| assumed without evidence? | **partially** — could merge some |
| what if opposite were true? | could combine into 2 briefs (define+philosophy, require+forbid) |
| based on evidence or habit? | follows separation of concerns |
| exceptions? | some topics have fewer briefs |
| simpler approach? | merge define + philosophy? |

**issue found:** could we merge `define.domain-operation-grains.[define].md` and `philosophy.transform-orchestrator-separation.[philosophy].md` into one brief?

**resolution:** keep separate. the define brief is reference material (what are the grains), the philosophy brief is motivation (why separate them). different purposes, different access patterns.

---

### assumption 5: bhuild handoff goes in `.agent/repo=.this/role=any/briefs/`

| question | answer |
|----------|--------|
| assumed without evidence? | **no** — follows extant handoff pattern |
| what if opposite were true? | could put elsewhere, but handoffs go in `.agent/repo=.this/` |
| based on evidence or habit? | evidence — extant handoffs follow this |
| exceptions? | none |
| simpler approach? | no |

**verdict:** holds. follows extant handoff convention.

---

### assumption 6: wet-over-dry update is an update, not a replacement

| question | answer |
|----------|--------|
| assumed without evidence? | **no** — adds exception, preserves core rule |
| what if opposite were true? | could replace entire brief |
| based on evidence or habit? | judgment — extant rule is correct, just needs exception |
| exceptions? | none |
| simpler approach? | add exception is minimal change |

**verdict:** holds. minimal change to add coherence.

---

### assumption 7: no tests needed (briefs are documentation)

| question | answer |
|----------|--------|
| assumed without evidence? | **yes** — briefs are not code |
| what if opposite were true? | could add lint tests for brief format |
| based on evidence or habit? | convention — briefs are not tested |
| exceptions? | some briefs with code examples could have snippet tests |
| simpler approach? | no tests is simpler |

**verdict:** holds. briefs are documentation, not executable code. manual verification is sufficient.

---

## issues found

### issue 1: could merge define + philosophy briefs

**what:** considered if `define.domain-operation-grains.[define].md` and `philosophy.transform-orchestrator-separation.[philosophy].md` should be one brief.

**resolution:** keep separate. different purposes:
- define = reference (what are the grains)
- philosophy = motivation (why separate them)

readers access these differently — one for lookup, one for grasp.

---

## summary

| assumption | verdict |
|------------|---------|
| architect briefs location | holds — follows convention |
| mechanic briefs in readable.narrative | holds — apt fit |
| need both require and forbid | holds — wisher requested |
| four architect briefs | holds — different purposes |
| bhuild handoff location | holds — follows convention |
| wet-over-dry update not replace | holds — minimal change |
| no tests needed | holds — briefs are docs |

**one issue considered, resolved.** blueprint assumptions are sound.
