# self-review r8: has-behavior-declaration-adherance

## behavior declaration adherance review

this review checks the inverse of r7: does the blueprint match what the vision and criteria prescribe? did we deviate or misinterpret?

### blueprint element 1: brief location

**blueprint says:** `src/domain.roles/mechanic/briefs/practices/work.flow/`

**vision says:** "location: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/`"

**adherance check:** slight discrepancy in path prefix

**analysis:**
- vision uses `.agent/repo=ehmpathy/...` which is the runtime symlink location
- blueprint uses `src/domain.roles/...` which is the source location
- `src/domain.roles/` builds to `dist/domain.roles/` which symlinks to `.agent/repo=.../`
- these are the same location, just at different stages of the build pipeline

**verdict:** [OK] no deviation — vision uses runtime path, blueprint uses source path

**why it holds:**
- per `repo.structure.md` brief: "edit in `src/`" and "runtime links to `dist/`"
- the source path is where we create files; runtime path is where they appear
- blueprint correctly uses source path for file creation

---

### blueprint element 2: brief name

**blueprint says:** `rule.require.trust-but-verify.md`

**vision says:** "rule.require.trust-but-verify"

**adherance check:** exact match

**verdict:** [OK] no deviation

---

### blueprint element 3: brief content sections

**blueprint contract specifies:**
```
## .what
## .why
## .the rule
## .pattern
## .antipattern
## .mantra
## .enforcement
```

**vision says:**
- "pattern: claim → verify → act"
- "antipattern: claim → act"
- "mantra: trust but verify — don't even trust yourself"

**criteria says:**
- lists claim types
- lists verification methods
- provides pattern and antipattern

**adherance check:** all prescribed elements present

**verdict:** [OK] no deviation

**why it holds:**
- `.pattern` matches vision's "claim → verify → act"
- `.antipattern` matches vision's "claim → act (orphan processes story)"
- `.mantra` matches vision's "trust but verify — don't even trust yourself"
- `.the rule` table satisfies criteria's claim types + verification methods

---

### blueprint element 4: hook location

**blueprint says:** `src/domain.roles/mechanic/inits/claude.hooks/postcompact.trust-but-verify.sh`

**vision says:** "location: `.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/`"

**adherance check:** same path prefix analysis as brief location

**verdict:** [OK] no deviation — source vs runtime path

---

### blueprint element 5: hook event type

**blueprint says:** PostCompact event

**vision says:** "on resume from compaction, emit"

**criteria says:** "when(compaction occurs)"

**adherance check:** PostCompact is correct event for "on resume from compaction"

**verdict:** [OK] no deviation

**why it holds:**
- PostCompact fires after compaction completes, before Claude responds
- this matches vision's "on resume from compaction"
- verified in research stone that PostCompact exists (Claude Code v2.1.79+)

---

### blueprint element 6: hook output content

**blueprint contract specifies:**
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

**vision says to emit:**
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

**adherance check:** minor differences in phrasing, same substance

| vision element | blueprint element | match |
|----------------|-------------------|-------|
| "resumed from compacted session" | "compaction occurred" | simplified ✓ |
| list of 4 claim types | list of 4 claim types | exact ✓ |
| "verify them" | "verify before you act" | same ✓ |
| "see: rule.require..." | "see: rule.require..." | exact ✓ |

**verdict:** [OK] adherance with intentional simplification

**potential deviation identified:**
- vision suggests 15-line output with redundant mantra ("remember: trust no one blindly...")
- blueprint specifies 10-line output without redundant mantra

**analysis of deviation:**
1. **was information lost?** no — the mantra appears in the brief's `.mantra` section
2. **does it violate criteria?** no — criteria says "concise, not verbose"
3. **does it break user experience?** no — hook points to brief, where mantra lives
4. **is this a misinterpretation?** no — this is a deliberate optimization

**why simplification is correct:**
- vision's hook output duplicates what the brief contains
- criteria explicitly requires "concise, not verbose"
- hook's role is to remind and point to brief, not to repeat brief content
- redundancy in hook + brief wastes tokens and attention

**decision:** keep simplified output — it better satisfies criteria and avoids duplication

---

### blueprint element 7: hook exit code

**blueprint says:** exit 0

**vision says:** (no explicit exit code mentioned)

**criteria says:** "allow continuation"

**adherance check:** exit 0 allows continuation

**verdict:** [OK] adherance — exit 0 is standard for "allow"

---

## summary

| blueprint element | vision/criteria | adherance |
|-------------------|-----------------|-----------|
| brief location | src/ vs .agent/ | [OK] source vs runtime |
| brief name | exact match | [OK] |
| brief sections | all prescribed | [OK] |
| hook location | src/ vs .agent/ | [OK] source vs runtime |
| hook event | PostCompact | [OK] |
| hook output | concise version | [OK] simplified |
| hook exit | exit 0 | [OK] |

## conclusion

blueprint adheres to vision and criteria.

**deviations found:** 1

**deviation analysis:**
| deviation | type | impact | action |
|-----------|------|--------|--------|
| hook output simplified | intentional | positive | keep — satisfies "concise" criterion |

**no misinterpretation found:**
- brief location uses source path (correct for file creation)
- hook event uses PostCompact (correct for "on resume from compaction")
- all prescribed content sections present
- exit 0 for continuation (correct)

**intentional simplification found:**
- hook output reduced from 15 lines to 10 lines
- removed redundant mantra (already in brief)
- this is an improvement, not a deviation — criteria prefers concise

## what i'll remember

- source path (`src/domain.roles/`) vs runtime path (`.agent/repo=/...`) is not deviation
- simplification that better satisfies criteria is adherance, not deviation
- check both directions: coverage (spec → blueprint) and adherance (blueprint → spec)

