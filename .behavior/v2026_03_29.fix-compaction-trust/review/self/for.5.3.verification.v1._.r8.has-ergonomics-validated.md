# self-review r8: has-ergonomics-validated

## question

does the actual input/output match what felt right at design time?

## analysis

### no repros artifact

this behavior is preventive, not reactive — no repros artifact exists. the ergonomics were designed in the blueprint and vision documents.

### planned vs actual: brief

| aspect | planned (blueprint) | actual |
|--------|---------------------|--------|
| location | `src/domain.roles/mechanic/briefs/practices/work.flow/` | ✓ matches |
| sections | .what, .why, .the rule, .pattern, .antipattern, .mantra, .enforcement | ✓ all present |
| mantra | "trust but verify — don't even trust yourself" | ✓ exact match |
| claim types | diagnoses, objectives, state claims, conclusions | ✓ all listed |
| verification methods | `rhx show.gh.test.errors`, read file, `gh pr view` | ✓ all documented |

### planned vs actual: hook output

| aspect | planned (wish) | actual |
|--------|----------------|--------|
| alert emoji | ⚠️ | ✓ matches |
| claim types listed | diagnoses, objectives, state claims, conclusions | ✓ all present |
| call to action | "verify before you act" | ✓ matches |
| brief reference | "see: rule.require.trust-but-verify" | ✓ present |
| conciseness | wish says "concise" | ✓ 12 lines total |

### verification of actual output

the hook emits:

```
⚠️ compaction occurred

inherited claims may be stale:
- diagnoses ("X is the problem")
- objectives ("we need to do Y")
- state claims ("file contains Z")
- conclusions ("the fix is W")

verify before you act.

see: rule.require.trust-but-verify
```

this matches the wish's example output exactly.

## why it holds

the implementation matches the design exactly. the brief contains all planned sections with the exact mantra. the hook output matches the wish's example output word-for-word. no ergonomic drift occurred between design and implementation.

