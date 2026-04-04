# self-review r5: behavior-declaration-adherance

review for adherance — does implementation match spec?

---

## vision intent: "decode-friction is NOT about categories"

### vision statement

> this is NOT about specific categories. there is no enumerable list of "forbidden patterns." complexity that requires decode can come from anywhere.

### implementation check

**rule.forbid.decode-friction-in-orchestrators.md lines 36-38:**
```markdown
## .note

this is not about specific categories (array access, regex, etc). complexity that requires decode can come from anywhere.

the examples are illustrative, not prescriptive.
```

**rule.forbid.inline-decode-friction.md** provides examples but titles them "what is decode-friction" (illustrative) and includes "what is NOT decode-friction" to show exceptions.

**verdict:** implementation correctly frames examples as illustrative, not exhaustive. adherance: correct.

---

## vision intent: "the heuristic is the test, not the categories"

### vision statement

> the test: "do i have to decode this to understand what it produces?"

### implementation check

**rule.forbid.decode-friction-in-orchestrators.md lines 14-17:**
```markdown
## .the test

"do i have to decode this to understand what it produces?"

- yes = extract to named transform
- no = leave inline
```

**rule.require.named-transforms.md lines 7-12:**
```markdown
## .the heuristic

"do i have to decode this to understand what it produces?"

- yes → extract to named transform
- no → leave inline
```

**verdict:** heuristic is the primary test, not category membership. adherance: correct.

---

## vision intent: "readability abstraction is different from reuse abstraction"

### vision statement

> readability abstraction is a *different category* than reuse abstraction
> - readability: triggers immediately on decode-cost
> - reuse: waits for 3+ usages

### implementation check

**rule.prefer.wet-over-dry.md lines 120-132:**
```markdown
#### .exception: readability abstraction

wet-over-dry applies to *reuse* abstraction — wait for 3+ usages before extract.

but *readability* abstraction triggers immediately:
- if you have to decode it to understand it, extract it now
- even single-use transforms warrant extraction if they improve readability

| type | trigger | when |
|------|---------|------|
| readability abstraction | decode-cost | immediate |
| reuse abstraction | duplication | wait for 3+ |
```

**verdict:** distinction is explicit and matches vision. adherance: correct.

---

## vision intent: "defer to extant name patterns"

### vision statement (from blueprint fix)

> defer to `rule.require.get-set-gen-verbs` for name patterns

### implementation check

**rule.require.named-transforms.md lines 29-36:**
```markdown
## .name patterns

defer to `rule.require.get-set-gen-verbs` for name conventions:

- `as*` — cast/parse (e.g., `asKeyrackKeyOrg`)
- `is*` — boolean check (e.g., `isEligibleForPremiumFeatures`)
- `get*` — retrieve/compute (e.g., `getActiveUserEmails`)
- `compute*` — deterministic calculation (e.g., `computeTotal`)
```

**question:** does this list duplicate get-set-gen-verbs or summarize it?

**examination:** the list includes `as*`, `is*`, `get*`, `compute*` — these are transform-specific patterns. the extant `rule.require.get-set-gen-verbs` focuses on `get`, `set`, `gen` for domain operations.

**resolution:** the patterns here (`as*`, `is*`, `compute*`) are complements to get-set-gen, not duplicates. the brief correctly defers to the extant rule while illustrating transform-specific examples.

**verdict:** deference is present; examples are illustrative additions. adherance: correct.

---

## vision intent: "transforms compute, orchestrators compose"

### vision statement

> | grain | role | contains |
> |-------|------|----------|
> | **transform** | compute | decode-friction logic |
> | **orchestrator** | compose | named operation calls only |

### implementation check

**define.domain-operation-grains.md lines 5-10:**
```markdown
domain.operations have two grains:

| grain | role | contains |
|-------|------|----------|
| **transform** | compute | decode-friction logic |
| **orchestrator** | compose | named operation calls only |
```

**verdict:** exact match. adherance: correct.

---

## cross-reference consistency

### architect briefs reference each other?

- define.domain-operation-grains.md → references rule.require.orchestrators-as-narrative ✓
- philosophy.transform-orchestrator-separation.md → references all three ✓
- rule.require.orchestrators-as-narrative.md → references define and philosophy ✓
- rule.forbid.decode-friction-in-orchestrators.md → references define and rule.require ✓

### mechanic briefs reference architect briefs?

- rule.require.named-transforms.md → references define.domain-operation-grains ✓
- rule.forbid.inline-decode-friction.md → references define.domain-operation-grains ✓

### wet-over-dry references new rule?

- rule.prefer.wet-over-dry.md → references rule.forbid.decode-friction-in-orchestrators ✓
- rule.prefer.wet-over-dry.md → references rule.forbid.inline-decode-friction ✓

**verdict:** cross-references form a coherent graph. adherance: correct.

---

## deviations found

none.

all implementations match their vision specifications.
no misinterpretations detected.
no spec deviations found.
