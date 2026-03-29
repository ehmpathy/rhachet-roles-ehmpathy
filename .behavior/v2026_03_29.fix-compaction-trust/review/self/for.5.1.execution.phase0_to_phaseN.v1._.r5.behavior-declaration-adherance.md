# self-review r5: behavior-declaration-adherance

## adherance check: does each file match the spec?

### file 1: rule.require.trust-but-verify.md (93 lines)

**vision adherance:**

| vision requirement | implementation check | adherance |
|-------------------|---------------------|-----------|
| mechanic pauses to verify | brief line 5: "verify inherited claims before you act on them" | [OK] correct text |
| verification pattern | brief line 36: `claim → verify → act` matches vision exactly | [OK] exact match |
| orphan processes story | brief lines 49-54: tells complete story with details | [OK] all details present |
| mantra quote | brief line 58: "trust but verify — don't even trust yourself" | [OK] exact quote |

**criteria adherance:**

| criteria requirement | implementation check | adherance |
|---------------------|---------------------|-----------|
| claim types listed | brief lines 27-31: all four types in table | [OK] all present |
| verification methods | brief lines 27-31: methods for each claim type | [OK] all present |
| pattern documented | brief lines 33-41: pattern with numbered steps | [OK] exceeds spec (adds steps) |
| antipattern documented | brief lines 43-54: code block + story | [OK] exceeds spec (adds story) |

**blueprint adherance:**

| blueprint spec | implementation | adherance |
|---------------|----------------|-----------|
| sections: .what, .why, .the rule, .pattern, .antipattern, .mantra, .enforcement | all present (lines 3, 7, 23, 33, 43, 56, 89) | [OK] all sections |
| location: briefs/practices/work.flow/ | file at this path | [OK] correct path |

**line-by-line check for deviations:**

- line 5: "verify inherited claims before you act on them" — matches vision
- line 13: "your own memory is a summary too" — extends to mid-session (vision allows)
- line 16: "20+ commits, 3+ hours, wrong root cause" — matches wish incident
- line 58: mantra in blockquote — format adds emphasis (acceptable)
- line 87: "ask the human" — matches criteria escape hatch

**verdict:** [OK] brief adheres to spec; extensions are additive, not deviations

---

### file 2: postcompact.trust-but-verify.sh (35 lines)

**vision adherance:**

| vision requirement | implementation check | adherance |
|-------------------|---------------------|-----------|
| emit reminder after compaction | hook fires on PostCompact event | [OK] correct trigger |
| list claim types | lines 24-27: four claim types listed | [OK] all types |
| point to brief | line 31: "see: rule.require.trust-but-verify" | [OK] reference present |
| exit 0 | line 34: `exit 0` | [OK] allows continuation |

**criteria adherance:**

| criteria requirement | implementation check | adherance |
|---------------------|---------------------|-----------|
| reminder visible before response | PostCompact fires after compaction, before Claude responds | [OK] correct time |
| concise reminder | 11 lines of output (not verbose) | [OK] concise |
| claim types match brief | hook lines 24-27 match brief lines 27-31 | [OK] aligned |

**blueprint adherance:**

| blueprint spec | implementation | adherance |
|---------------|----------------|-----------|
| header: .what, .why, guarantee | lines 3, 5-7, 12-14 | [OK] all present |
| emit to stdout | cat heredoc to stdout | [OK] correct stream |
| exit 0 | line 34 | [OK] correct exit |

**line-by-line check for deviations:**

- line 3: ".what = remind mechanic to verify claims after compaction" — matches vision
- line 6: "orphan processes incident" — references the motivator story
- line 13: "informational only" — matches criteria "non-block"
- line 14: "allows continuation: always exits 0" — matches criteria
- line 21: "compaction occurred" — clear trigger signal
- line 29: "verify before you act" — mirrors brief mantra

**verdict:** [OK] hook adheres to spec; no deviations found

---

### file 3: postcompact.trust-but-verify.integration.test.ts (95 lines)

**criteria adherance (via test assertions):**

| criteria | test assertion | adherance |
|----------|---------------|-----------|
| reminder contains "compaction occurred" | line 44: `toContain('compaction occurred')` | [OK] |
| reminder lists diagnoses | line 46: `toContain('diagnoses')` | [OK] |
| reminder lists objectives | line 47: `toContain('objectives')` | [OK] |
| reminder lists state claims | line 48: `toContain('state claims')` | [OK] |
| reminder lists conclusions | line 49: `toContain('conclusions')` | [OK] |
| reminder says verify before act | line 50: `toContain('verify before you act')` | [OK] |
| reminder points to brief | line 51: `toContain('rule.require.trust-but-verify')` | [OK] |
| exit 0 | line 56: `toBe(0)` | [OK] |
| no stderr | line 61: `toBe('')` | [OK] |

**test coverage check:**

| test case | what it verifies | adherance |
|-----------|-----------------|-----------|
| case1 | basic output and exit code | [OK] covers usecase2 |
| case2 | auto-trigger behavior | [OK] covers criteria edge case |
| case3 | manual-trigger behavior | [OK] covers criteria edge case |

**verdict:** [OK] tests adhere to spec; assertions mirror criteria

---

### file 4: boot.yml (line 206)

**blueprint adherance:**

| blueprint spec | implementation | adherance |
|---------------|----------------|-----------|
| add brief to say section | line 206 in subject.flow.briefs.say | [OK] correct section |
| format: `- briefs/practices/...` | matches extant entries | [OK] correct format |

**verdict:** [OK] registration adheres to spec

---

### file 5: getMechanicRole.ts (lines 43-47)

**blueprint adherance:**

| blueprint spec | implementation | adherance |
|---------------|----------------|-----------|
| command format | `./node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/postcompact.trust-but-verify` | [OK] |
| timeout | `PT30S` | [OK] within range |
| filter | `{ what: 'PostCompact' }` | [OK] correct event |

**line-by-line check:**

- line 43: opens hook object
- line 44-45: command string matches blueprint
- line 46: timeout PT30S (blueprint said "reasonable", this is within PT5S-PT60S range)
- line 47: filter matches blueprint exactly

**verdict:** [OK] registration adheres to spec

---

## summary

| file | adherance | deviations | fixes |
|------|-----------|------------|-------|
| brief | [OK] | 0 | 0 |
| hook | [OK] | 0 | 0 |
| test | [OK] | 0 | 0 |
| boot.yml | [OK] | 0 | 0 |
| getMechanicRole.ts | [OK] | 0 | 0 |

**deviations found:** 0
**issues fixed:** 0 (none required)

## what i'll remember

- adherance review checks that implementation matches spec *correctly*, not just that it covers it
- hook claim types (lines 24-27) should align with brief claim types (lines 27-31)
- test assertions should mirror criteria requirements
- timeout values in "reasonable" range = PT5S to PT60S based on extant hooks
