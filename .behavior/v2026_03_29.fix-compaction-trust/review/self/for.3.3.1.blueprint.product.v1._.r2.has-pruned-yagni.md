# self-review r2: has-pruned-yagni

## components reviewed

### component.1: brief (rule.require.trust-but-verify.md)

**was this explicitly requested?**
yes. wish line 21: "1. brief: rule.require.trust-but-verify"

**is this minimum viable?**
yes. brief is the primary deliverable. cannot be simpler.

**why it holds:** wish explicitly requests this. done-when says "brief exists and is booted."

---

### component.2: hook (postcompact.trust-but-verify.sh)

**was this explicitly requested?**
yes, marked optional. wish line 48: "2. sessionstart hook (optional)"

**is this minimum viable?**
yes. hook just emits text and exits 0. no logic.

**did we add "for future flexibility"?**
no. hook does exactly what wish describes.

**why it holds:** wish requests it as optional. we include it because it provides value at critical moment.

---

### component.3: boot.yml registration

**was this explicitly requested?**
implicitly. wish done-when: "brief exists and is booted with mechanic role"

**is this minimum viable?**
yes. one line addition to boot.yml say section.

**why it holds:** without registration, brief wouldn't boot. this is infrastructure, not feature.

---

### component.4: settings.json hook registration

**was this explicitly requested?**
implicitly required for hook to fire.

**is this minimum viable?**
yes. rhachet lacks onCompact, so direct settings.json registration is needed.

**why it holds:** infrastructure for hook to work. not optional if we want the hook.

---

### component.5: brief content sections

**planned sections:**
- .what
- .why
- .the rule (table)
- .pattern
- .antipattern (orphan processes story)
- .enforcement
- .mantra

**was each requested?**

| section | requested in wish? |
|---------|-------------------|
| .what | implicit — standard brief structure |
| .why | implicit — standard brief structure |
| .the rule | yes — "claim types + verification methods" |
| .pattern | yes — "claim → verify → act" |
| .antipattern | yes — "the orphan processes story" |
| .enforcement | implicit — standard for rule briefs |
| .mantra | yes — "trust but verify — don't even trust yourself" |

**any extras?**
no. all sections trace to wish or standard brief structure.

**why it holds:** each section serves the wish or follows established pattern.

---

### component.6: integration tests

**was this explicitly requested?**
not in wish. tests are implementation detail.

**is this minimum viable?**
yes. reduced from 4 hook tests to 2 essential tests:
- brief appears in boot output
- hook emits output and exits 0

**did we add "while we're here"?**
no. tests prove behavior works.

**why it holds:** tests are standard practice, not YAGNI. 2 tests is minimal.

---

## YAGNI check summary

| component | requested? | minimal? | verdict |
|-----------|------------|----------|---------|
| brief | yes | yes | [KEEP] |
| hook | yes (optional) | yes | [KEEP] |
| boot.yml registration | implicit | yes | [KEEP] |
| settings.json hook | implicit | yes | [KEEP] |
| brief sections | yes | yes | [KEEP] |
| integration tests | no (but standard) | yes | [KEEP] |

## what was pruned

no new items to prune. previous review (has-questioned-deletables) already simplified:
- reduced hook tests from 4 to 2
- no extra abstractions
- no "future flexibility" patterns

## what i'll remember

- trace every component to wish or criteria
- standard practices (tests, registration) are infrastructure, not YAGNI
- "optional" in wish means: include if feasible, not "don't include"
