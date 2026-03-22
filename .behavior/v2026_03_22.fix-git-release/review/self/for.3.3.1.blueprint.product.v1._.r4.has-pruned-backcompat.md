# review.self: has-pruned-backcompat (r4)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read:
- risks and mitigations section (lines 178-185)
- execution order (lines 166-174)
- the wish document lines 294-295

---

## question: did we add backwards compat not requested?

for each backwards-compat concern, i ask:
1. did the wisher explicitly say to maintain this?
2. is there evidence this compat is needed?
3. or did we assume it "to be safe"?

---

### backwards compat concern: `--to` → `--into` deprecation alias

**location in blueprint**: line 182:
> "risk: break extant users of `--to` | mitigation: add deprecation alias that maps `--to` → `--into`"

**what the wish actually says** (line 294-295):
> "also, we want to explicitly... replace `--to` with `--into`"

**analysis of the word "replace"**:

the wisher used "replace" — a word with two possible interpretations:

1. **substitution**: swap one for the other, old no longer works
2. **upgrade**: new is preferred, old still works

i searched the wish for clarification:
- no mention of "alias"
- no mention of "deprecate"
- no mention of "backwards compatible"
- no mention of "extant users"

**conclusion**: the wish is ambiguous on whether `--to` should continue to work.

---

## issue found: unprescribed backwards compat

the blueprint assumes "practical" interpretation (keep `--to` via alias) without wisher confirmation.

**why this matters**:
- if wisher wants hard replace, the alias is scope creep
- if wisher wants soft replace, the alias is necessary
- we cannot know without confirmation

---

## resolution: flag open question for wisher

### OPEN QUESTION #1: `--to` alias

**context**: the wish says "replace `--to` with `--into`". the blueprint proposes a deprecation alias.

**question**: should `--to` continue to work after this change?

**options**:
1. **hard replace**: `--to` returns "unknown flag: --to" error
   - pros: cleaner codebase, no legacy cruft
   - cons: extant scripts break, CI failures possible

2. **soft replace (silent)**: `--to` maps to `--into` silently
   - pros: no break, smooth transition
   - cons: users may not notice the change

3. **soft replace (verbose)**: `--to` maps to `--into` with deprecation notice
   - pros: no break, users learn new flag
   - cons: noisy output

**default recommendation**: option 2 (silent alias) is safest. but wisher should confirm.

**what the blueprint should say** (updated):

instead of:
```
| break extant users of `--to` | add deprecation alias that maps `--to` → `--into` |
```

the blueprint should say:
```
| break extant users of `--to` | OPEN QUESTION: add deprecation alias? (see review r4) |
```

---

## other backwards compat items checked

| item | requested? | evidence | verdict |
|------|------------|----------|---------|
| p1/p2 test updates | implicit | tests must match new flag | necessary maintenance |
| output shape changes | n/a | new uniform shape | no compat concern |
| exit codes | n/a | follows extant convention | no compat concern |
| `--apply` alias | yes | wish line 294 | explicitly requested |

---

## how to proceed

the open question is flagged. the blueprint cannot be modified in this review phase.

**next step**: before execution phase, the wisher must confirm:
- should `--to` continue to work? (yes/no)
- if yes, silent or with deprecation notice?

---

## why this holds

the review correctly identified unprescribed backwards compat. the blueprint assumed the wisher's intent rather than confirmed it.

the flag as open question ensures:
1. wisher decides, not blueprint author
2. no surprise behavior in either direction
3. explicit decision is documented

---

## summary

| backwards compat item | prescribed? | resolution |
|-----------------------|-------------|------------|
| `--to → --into` alias | **no** | **OPEN QUESTION — wisher must confirm** |
| p1/p2 test updates | implicit | necessary maintenance |
| output shape | n/a | no compat concern |
| exit codes | n/a | no compat concern |

**one open question flagged.** execution should not proceed until wisher confirms `--to` alias decision.

