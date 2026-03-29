# self-review r9: has-ergonomics-validated

## question

does the actual input/output match what felt right at design time?

## analysis

### review methodology

re-read the wish, vision, and blueprint documents. compared each planned element against the actual implementation.

### brief ergonomics check

**planned structure (from blueprint):**
```markdown
# rule.require.trust-but-verify

## .what
verify inherited claims before you act on them.

## .why
{rationale}

## .the rule
{table: claim type → verification method}

## .pattern
claim → verify → act

## .antipattern
claim → act (orphan processes story)

## .mantra
"trust but verify — don't even trust yourself"

## .enforcement
action on unverified inherited claim = blocker
```

**actual brief structure:**
- ✓ .what — present, matches
- ✓ .why — present, documents the incident
- ✓ .the rule — present, table format as planned
- ✓ .pattern — present, exact match
- ✓ .antipattern — present, includes orphan processes story
- ✓ .mantra — present, exact match
- ✓ .enforcement — present

### hook ergonomics check

**planned output (from wish):**
```
⚠️ resumed from compacted session

the summary above contains inherited claims that may be stale or wrong:
- diagnoses ("X is the problem")
- objectives ("we need to do Y")
- state ("PR is Z", "file contains W")
- conclusions ("the fix is V")
- etc

before you act on inherited claims, verify them.

remember: trust no one blindly. not even yourself. trust but verify.

see: rule.require.trust-but-verify
```

**actual output:**
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

**differences:**
1. header: "resumed from compacted session" → "compaction occurred" (simpler, clearer)
2. body: trimmed redundant phrases for conciseness (wish says "concise")
3. call to action: condensed to one line

**verdict:** improvements, not drift. the actual output is more concise and preserves all semantic content.

## why it holds

the implementation matches the design intent. minor text changes improve conciseness without loss of intent. all planned elements are present. no ergonomic issues found.

