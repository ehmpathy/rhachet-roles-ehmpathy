# self-review r9: has-role-standards-coverage

review for coverage of mechanic role standards.

---

## rule directories enumeration

### relevant directories for this blueprint

1. **lang.terms/** — term conventions
2. **lang.tones/** — tone conventions
3. **code.prod/readable.comments/** — header format
4. **code.prod/readable.narrative/** — narrative flow (target location)
5. **code.prod/evolvable.architecture/** — architecture rules

### directories NOT relevant

- **code.test/** — this blueprint adds briefs, not code
- **code.prod/pitofsuccess.errors/** — no error handle needed for briefs
- **code.prod/pitofsuccess.typedefs/** — no types needed for briefs
- **code.prod/evolvable.procedures/** — no procedures in this blueprint

---

## coverage check: what should be present?

### 1. for brief content

briefs need:
- .what section ✓
- .why section ✓
- .enforcement section (for rules) ✓
- examples (recommended) ✓
- see also (recommended) ✓

**blueprint coverage:**
- define outline: .what, .why, .examples ✓
- rule.require outline: .what, .why, .enforcement ✓
- rule.forbid outline: .what, .the test, .practical heuristic, .note, .enforcement ✓
- philosophy codepath: metaphors, examples ✓

**verdict:** full coverage.

---

### 2. for new vocabulary

new terms need:
- definition in a define.* brief ✓
- consistent use throughout ✓
- no synonym drift ✓

**blueprint coverage:**
- `define.domain-operation-grains.md` defines transform and orchestrator ✓
- terms used consistently in rule briefs ✓

**verdict:** full coverage.

---

### 3. for rule pairs

rules often come in require/forbid pairs:
- rule.require states what to do ✓
- rule.forbid states what to avoid ✓

**blueprint coverage:**
- architect: rule.require.orchestrators-as-narrative + rule.forbid.decode-friction-in-orchestrators ✓
- mechanic: rule.require.named-transforms + rule.forbid.inline-decode-friction ✓

**verdict:** full coverage. both pairs present.

---

### 4. for wet-over-dry update

update needs:
- preserve extant rule ✓
- add as exception, not replacement ✓
- cross-reference new rules ✓

**blueprint coverage:**
- outline shows .exception section ✓
- references rule.forbid.decode-friction-in-orchestrators ✓
- table distinguishes readability vs reuse abstraction ✓

**verdict:** full coverage.

---

### 5. for handoff brief

handoff needs:
- clear request statement ✓
- target repo identified ✓
- scope of work defined ✓

**blueprint coverage:**
- handoff.bhuild-readability-review-rule.md ✓
- codepath: "request: add review rule to detect decode-friction in orchestrators" ✓

**verdict:** full coverage.

---

## omissions check

### what might be absent?

| pattern | needed? | present? |
|---------|---------|----------|
| error handle | no (briefs, not code) | n/a |
| validation | no (briefs, not code) | n/a |
| tests | no (briefs, not code) | n/a |
| types | no (briefs, not code) | n/a |
| examples in briefs | yes | yes ✓ |
| see also in briefs | yes | yes (in outlines) ✓ |

**verdict:** no omissions.

---

## issues found

### none

all relevant standards are covered:
1. brief structure (what, why, enforcement) ✓
2. vocabulary definition ✓
3. require/forbid pairs ✓
4. wet-over-dry update format ✓
5. handoff brief format ✓

no patterns are absent. the junior did not omit required elements.

---

## why it holds

the blueprint has full coverage because:

1. **brief structure is standard** — follows extant briefs in the repo
2. **vocabulary is defined** — define.* brief introduces new terms
3. **rules come in pairs** — both require and forbid perspectives covered
4. **update is additive** — wet-over-dry exception preserves core rule
5. **handoff is complete** — request is clear and actionable

this blueprint is documentation-only; no code patterns apply.

---

## summary

role standards coverage verified. no omissions found.
