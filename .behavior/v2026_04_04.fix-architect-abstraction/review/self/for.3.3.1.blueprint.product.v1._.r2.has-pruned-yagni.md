# self-review r2: has-pruned-yagni

review for extras that were not prescribed.

---

## components checked

### component 1: define.domain-operation-grains.[define].md

| question | answer |
|----------|--------|
| explicitly requested? | **yes** — wisher: "also, the architect should define the two grains of domain.operations in a separate brief" |
| minimum viable? | **yes** — defines transforms vs orchestrators, no more |
| added for future flexibility? | no |
| added "while we're here"? | no |
| optimized before needed? | no |

**verdict:** keep. explicitly requested, minimal.

---

### component 2: philosophy.transform-orchestrator-separation.[philosophy].md

| question | answer |
|----------|--------|
| explicitly requested? | **yes** — wisher: "this is a really good analogy; lets include that in the philosophy" |
| minimum viable? | **yes** — book metaphor, compiler metaphor, c-a-t example |
| added for future flexibility? | no |
| added "while we're here"? | no |
| optimized before needed? | no |

**verdict:** keep. explicitly requested, minimal.

---

### component 3: rule.require.orchestrators-as-narrative.md

| question | answer |
|----------|--------|
| explicitly requested? | **yes** — wisher: "we should include both the positive and negative sides to this rule require and forbid" |
| minimum viable? | **yes** — single require rule |
| added for future flexibility? | no |
| added "while we're here"? | no |
| optimized before needed? | no |

**verdict:** keep. explicitly requested.

---

### component 4: rule.forbid.decode-friction-in-orchestrators.md

| question | answer |
|----------|--------|
| explicitly requested? | **yes** — same as above, forbid side |
| minimum viable? | **yes** — single forbid rule |
| added for future flexibility? | no |
| added "while we're here"? | no |
| optimized before needed? | no |

**verdict:** keep. explicitly requested.

---

### component 5: rule.require.named-transforms.md (mechanic)

| question | answer |
|----------|--------|
| explicitly requested? | **yes** — wisher confirmed dual-level structure |
| minimum viable? | **yes** — mechanic-level require |
| added for future flexibility? | no |
| added "while we're here"? | no |
| optimized before needed? | no |

**verdict:** keep. explicitly requested as part of dual-level.

---

### component 6: rule.forbid.inline-decode-friction.md (mechanic)

| question | answer |
|----------|--------|
| explicitly requested? | **yes** — mechanic-level forbid, part of dual-level |
| minimum viable? | **yes** — single forbid rule |
| added for future flexibility? | no |
| added "while we're here"? | no |
| optimized before needed? | no |

**verdict:** keep. explicitly requested.

---

### component 7: update rule.prefer.wet-over-dry.md

| question | answer |
|----------|--------|
| explicitly requested? | **yes** — wisher: "we must make sure that all our briefs are coherent" |
| minimum viable? | **yes** — adds exception section, no more |
| added for future flexibility? | no |
| added "while we're here"? | no |
| optimized before needed? | no |

**verdict:** keep. explicitly requested.

---

### component 8: handoff.bhuild-readability-review-rule.md

| question | answer |
|----------|--------|
| explicitly requested? | **yes** — wisher: "lets include a todo requirement to create a handoff to add a rule to review this to the bhuild repo" |
| minimum viable? | **yes** — single handoff brief |
| added for future flexibility? | no |
| added "while we're here"? | no |
| optimized before needed? | no |

**verdict:** keep. explicitly requested.

---

### component 9: content outlines in blueprint

| question | answer |
|----------|--------|
| explicitly requested? | **no** — i added these for execution guidance |
| minimum viable? | n/a — question is whether they should exist |
| added for future flexibility? | **possibly** — help execution but not required |
| added "while we're here"? | **possibly** |
| optimized before needed? | no |

**issue found:** content outlines in blueprint were not requested. are they YAGNI?

**resolution:** keep. content outlines are standard blueprint practice — they declare what execution will adhere to. not extra, they are the blueprint's purpose. the filediff tree alone is insufficient; content outlines show the structure of each brief.

---

## issues found

### issue 1: content outlines

**what:** i questioned whether content outlines are YAGNI.

**resolution:** they are not YAGNI. blueprints declare what execution will adhere to. content outlines serve that purpose. without them, the blueprint would just be a file list with no content guidance.

**why it holds:** the stone prompt says "the purpose of the blueprint is to declare what the execution will adhere to." content outlines do exactly that.

---

## summary

| component | requested? | minimal? | verdict |
|-----------|------------|----------|---------|
| define.domain-operation-grains | yes | yes | keep |
| philosophy.transform-orchestrator-separation | yes | yes | keep |
| rule.require.orchestrators-as-narrative | yes | yes | keep |
| rule.forbid.decode-friction-in-orchestrators | yes | yes | keep |
| rule.require.named-transforms (mechanic) | yes | yes | keep |
| rule.forbid.inline-decode-friction (mechanic) | yes | yes | keep |
| update wet-over-dry | yes | yes | keep |
| bhuild handoff | yes | yes | keep |
| content outlines | questioned | yes | keep (purpose of blueprint) |

**no YAGNI found.** all components trace to wisher requests or serve blueprint's core purpose.
