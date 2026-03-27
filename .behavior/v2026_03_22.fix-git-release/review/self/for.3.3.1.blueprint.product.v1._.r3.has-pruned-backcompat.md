# review.self: has-pruned-backcompat (r3)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read:
- risks and mitigations section (lines 178-185)
- execution order (lines 166-174)

---

## question: did we add backwards compat not requested?

for each backwards-compat concern, i ask:
1. did the wisher explicitly say to maintain this?
2. is there evidence this compat is needed?
3. or did we assume it "to be safe"?

---

### backwards compat concern: `--to` → `--into` deprecation alias

**location**: blueprint line 182:
> "break extant users of `--to` | add deprecation alias that maps `--to` → `--into`"

**did wisher request this?**

i checked the wish (line 295):
> "replace `--to` with `--into`"

the wisher said "replace" — not "deprecate" or "add alias for". "replace" could mean:
- hard swap (break extant users)
- soft swap with alias (don't break extant users)

**is there evidence the compat is needed?**

i checked for explicit statements about extant users in the wish:
- none found

i checked for explicit statements about backwards compat:
- none found

**conclusion**: the wish does not explicitly request backwards compat for `--to`.

---

## issue found

### issue: deprecation alias not requested

the blueprint adds `--to → --into` deprecation alias without explicit wisher request.

**options**:
1. **keep alias**: assumes wisher wants smooth transition
2. **remove alias**: follows literal "replace" semantics
3. **flag as open question**: let wisher decide

**analysis**:

the wish says "replace" which is ambiguous. two interpretations:
- **literal**: `--to` no longer works (hard break)
- **practical**: `--to` still works but `--into` is preferred

**evidence for practical interpretation**:
- the skill is used by humans and CI scripts
- CI scripts may have `--to` hardcoded
- a hard break would cause immediate CI failures

**evidence for literal interpretation**:
- "replace" typically means swap out
- if wisher wanted compat, they'd say "deprecate" or "add alias"

**resolution**: flag this as open question. the blueprint should not assume.

---

## how addressed

i will flag this as an open question that needs wisher confirmation before execution.

i cannot edit the blueprint in this review phase. the review flags the issue; the wisher decides.

---

## open question for wisher

**question**: should `--to` continue to work after the change?

**context**: the wish says "replace `--to` with `--into`". the blueprint proposes a deprecation alias to avoid a break for extant users.

**options**:
1. **hard replace**: `--to` returns "unknown flag" error. scripts break immediately.
2. **soft replace with alias**: `--to` silently maps to `--into`. scripts continue to work. optional deprecation notice.
3. **soft replace with deprecation notice**: `--to` works but prints "deprecated, use --into".

**recommendation**: option 2 (silent alias) minimizes friction. but wisher should confirm.

---

## other backwards compat concerns

i checked the blueprint for other backwards compat items:

| concern | found? |
|---------|--------|
| extant tests updated for --into | yes — p1/p2 test updates (line 25-26) |
| output shape changes | no — output is new uniform shape |
| exit code changes | no — exit codes follow extant convention |

the p1/p2 test updates are necessary — they update test assertions for the new flag name. this is not backwards compat; this is test maintenance.

---

## summary

| backwards compat item | requested? | resolution |
|-----------------------|------------|------------|
| `--to → --into` alias | no | OPEN QUESTION — flag for wisher |
| test updates for --into | n/a | necessary maintenance |

**one open question flagged.** wisher should confirm whether `--to` alias is desired before execution.

