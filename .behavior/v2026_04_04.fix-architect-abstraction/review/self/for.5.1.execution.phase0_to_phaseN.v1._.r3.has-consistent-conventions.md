# self-review r3: has-consistent-conventions

review for divergence from extant names and patterns.

---

## extant conventions identified

### file name patterns

| pattern | purpose | extant examples |
|---------|---------|-----------------|
| `rule.require.*.md` | mandatory rule | rule.require.solve-at-cause.md |
| `rule.forbid.*.md` | prohibition rule | rule.forbid.else-branches.md |
| `rule.prefer.*.md` | preference rule | rule.prefer.wet-over-dry.md |
| `define.*.md` | term definition | define.directives.terms=*.md |
| `philosophy.*.[philosophy].md` | philosophy brief | philosophy.domain-as-a-garden.[philosophy].md |

### section patterns

| section | purpose | usage |
|---------|---------|-------|
| `.what` | one-line summary | required |
| `.why` | rationale bullets | required |
| `.examples` | code/table examples | common |
| `.enforcement` | blocker/nitpick level | for rules |
| `.see also` | cross-references | common |
| `.note` | caveats | optional |
| `.pattern` | structured guidance | optional |

---

## new briefs vs conventions

### architect briefs

| new brief | follows pattern? | check |
|-----------|------------------|-------|
| define.domain-operation-grains.md | yes — `define.*` | yes |
| philosophy.transform-orchestrator-separation.[philosophy].md | yes — `philosophy.*.[philosophy]` | yes |
| rule.require.orchestrators-as-narrative.md | yes — `rule.require.*` | yes |
| rule.forbid.decode-friction-in-orchestrators.md | yes — `rule.forbid.*` | yes |

### mechanic briefs

| new brief | follows pattern? | check |
|-----------|------------------|-------|
| rule.require.named-transforms.md | yes — `rule.require.*` | yes |
| rule.forbid.inline-decode-friction.md | yes — `rule.forbid.*` | yes |

### section structure

all new briefs include:
- `.what` — present in all briefs
- `.why` — present in all rule briefs
- `.examples` — present where needed
- `.enforcement` — present in all rule briefs
- `.see also` — present with cross-references

no absent required sections.

---

## term consistency

### new terms introduced

| new term | consistent with extant? | notes |
|----------|------------------------|-------|
| "decode-friction" | new term, no conflict | fills gap, no extant term for this concept |
| "grains" (transform/orchestrator) | consistent | follows extant pattern of compute/imagine grains |
| "readability abstraction" | new term | distinguishes from "reuse abstraction" in wet-over-dry |

### term reuse

| extant term | used correctly? | check |
|-------------|-----------------|-------|
| "orchestrator" | yes — domain operation that composes | yes |
| "transform" | yes — domain operation that computes | yes |
| "blocker" | yes — enforcement level | yes |
| "narrative" | yes — readable flow | yes |

---

## directory structure

### architect briefs location

extant: `src/domain.roles/architect/briefs/practices/`
new briefs: same location

check: yes, consistent.

### mechanic briefs location

extant pattern: `src/domain.roles/mechanic/briefs/practices/code.prod/{category}/`

new briefs at: `src/domain.roles/mechanic/briefs/practices/code.prod/readable.narrative/`

this is a new category directory. extant categories include:
- `evolvable.architecture/`
- `evolvable.procedures/`
- `pitofsuccess.errors/`
- `readable.comments/`

`readable.narrative/` follows the same pattern: `{adjective}.{noun}/`

check: yes, consistent with extant category pattern.

---

## verdict

all new briefs:
1. follow extant file name patterns
2. include required sections
3. use consistent terms
4. live in correct directories

no convention divergence found. no action needed.
