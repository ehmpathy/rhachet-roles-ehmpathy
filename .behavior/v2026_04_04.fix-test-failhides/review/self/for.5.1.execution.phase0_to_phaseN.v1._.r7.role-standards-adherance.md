# self-review r7: role-standards-adherance

## the question

> does the implementation follow mechanic role standards?

---

## step 1: enumerate applicable standards

from mechanic briefs:

| category | standards |
|----------|-----------|
| lang.terms | ubiqlang, gerund prohibition, treestruct, noun_adj order |
| lang.tones | lowercase preference, buzzword prohibition, chill nature emojis |
| pitofsuccess.errors | rule structure (.what, .why, .pattern, .enforcement) |
| boot.yml | say vs ref sections, path format |

---

## step 2: check lang.terms standards

### ubiqlang compliance

| term | used consistently? | notes |
|------|-------------------|-------|
| failhide | yes | same term in prod and test rules |
| failfast | yes | same term in prod and test rules |
| failloud | yes | same term in prod and test rules |
| ConstraintError | yes | documented in both failloud rules |
| MalfunctionError | yes | documented in both failloud rules |

**verdict:** ubiqlang compliant. no synonym drift.

### gerund prohibition

searched new files for -ing patterns:

| file | gerunds found? | notes |
|------|----------------|-------|
| rule.forbid.failhide.md (test) | no | clean |
| rule.require.failfast.md (test) | no | clean |
| rule.require.failloud.md (test) | no | clean |
| rule.require.failloud.md (prod) | no | clean |
| handoff.behavior-guard-update.md | no | clean |

**verdict:** no gerunds in new content.

### treestruct and noun_adj order

| file name | follows pattern? | notes |
|-----------|------------------|-------|
| rule.forbid.failhide.md | yes | [directive].[concept] |
| rule.require.failfast.md | yes | [directive].[concept] |
| rule.require.failloud.md | yes | [directive].[concept] |
| handoff.behavior-guard-update.md | yes | [type].[purpose] |

**verdict:** all file names follow conventions.

---

## step 3: check lang.tones standards

### lowercase preference

| file | all lowercase? | exceptions |
|------|----------------|------------|
| rule.forbid.failhide.md (test) | yes | code blocks (appropriate) |
| rule.require.failfast.md (test) | yes | code blocks (appropriate) |
| rule.require.failloud.md (test) | yes | code blocks (appropriate) |
| rule.require.failloud.md (prod) | yes | code blocks (appropriate) |

**verdict:** lowercase preference followed. capitals only in code.

### buzzword prohibition

checked for vague terms:

| term | found? | context |
|------|--------|---------|
| "scalable" | no | - |
| "leverage" | no | - |
| "synergy" | no | - |
| "robust" | no | - |
| "innovative" | no | - |

**verdict:** no buzzwords. language is direct and specific.

---

## step 4: check pitofsuccess.errors standards

### rule structure

all new rules follow the required structure:

| section | rule.forbid.failhide | rule.require.failfast | rule.require.failloud |
|---------|---------------------|----------------------|----------------------|
| ## .what | yes | yes | yes |
| ## .why | yes | yes | yes |
| ## .pattern or equivalent | yes (.forbidden patterns) | yes (.pattern) | yes (.pattern) |
| ## .enforcement | yes | yes | yes |

**verdict:** all rules follow standard structure.

### enforcement levels

| rule | enforcement | appropriate? |
|------|-------------|--------------|
| rule.forbid.failhide.md | blocker | yes — failhide is critical |
| rule.require.failfast.md | blocker | yes — absent resource is critical |
| rule.require.failloud.md (hint) | nitpick | yes — hint is nice-to-have |
| rule.require.failloud.md (context) | blocker | yes — context is critical |

**verdict:** enforcement levels are appropriate for severity.

---

## step 5: check boot.yml standards

### say vs ref

| rule | section | appropriate? |
|------|---------|--------------|
| rule.forbid.failhide.md.pt1.md (prod) | say | yes — critical rule |
| rule.require.failfast.md (prod) | say | yes — critical rule |
| rule.require.failloud.md (prod) | say | yes — critical rule |
| rule.forbid.failhide.md (test) | say | yes — critical rule |
| rule.require.failfast.md (test) | say | yes — critical rule |
| rule.require.failloud.md (test) | say | yes — critical rule |

**verdict:** all 6 error rules in say section. vision said "these are the most important rules".

### path format

| path | format correct? |
|------|-----------------|
| briefs/practices/code.prod/pitofsuccess.errors/rule.* | yes — relative to role dir |
| briefs/practices/code.test/pitofsuccess.errors/rule.* | yes — relative to role dir |

**verdict:** path format follows boot.yml convention.

---

## step 6: check anti-patterns

| anti-pattern | found? | notes |
|--------------|--------|-------|
| gerunds in file content | no | all content uses verb or noun forms |
| buzzwords | no | language is direct |
| SHOUTS (all-caps) | no | lowercase except code |
| premature abstraction | no | each rule is self-contained |
| barrel exports | n/a | briefs, not code |

---

## issues found

none. implementation follows all mechanic role standards.

---

## why adherance holds

| standard | result |
|----------|--------|
| ubiqlang | yes — consistent terminology |
| gerund prohibition | yes — no -ing nouns |
| lowercase | yes — calm tone |
| rule structure | yes — .what, .why, .pattern, .enforcement |
| boot.yml say | yes — all 6 critical rules in say |

**key insight:** the fail* family (failhide, failfast, failloud) creates consistent ubiqlang. symmetric term structure across prod and test contexts.

---

## verification: actual content check

### rule.forbid.failhide.md (test) first lines

```markdown
# rule.forbid.failhide

## .what

tests must verify on every code path. silent pass-through is forbidden.
```

- no gerunds
- lowercase
- .what section present
- direct language

### rule.require.failloud.md (prod) first lines

```markdown
# rule.require.failloud

## .what

errors must use proper error classes with full context.
```

- no gerunds
- lowercase
- .what section present
- direct language

### boot.yml comment

```yaml
# errors — the most important rules
```

- lowercase
- direct
- follows comment convention

---

## reflection: did implementation embody mechanic spirit?

the mechanic role maximizes "empathy for the 3am on-call engineer."

| check | embodied? | evidence |
|-------|-----------|----------|
| clear error messages | yes | failloud requires full context |
| actionable hints | yes | failfast pattern includes hint |
| no hidden traps | yes | failhide patterns are enumerated |
| immediate diagnosis | yes | error classes distinguish caller vs server |

**verdict:** implementation aligns with mechanic spirit. a 3am engineer encountering these patterns will know exactly what went wrong and what to do.

---

## line-by-line file analysis

### rule.forbid.failhide.md (test) — 35 lines

```
line 1:  # rule.forbid.failhide           ✓ lowercase header
line 3:  ## .what                          ✓ standard section
line 5:  tests must verify...              ✓ lowercase, no gerunds
line 7:  ## .why                           ✓ standard section
line 9:  failhide tests create...          ✓ lowercase, direct
line 11: ## .forbidden patterns            ✓ equivalent to .pattern
line 13-20: table with patterns            ✓ code in backticks
line 22: ## .legitimate alternatives       ✓ standard section
line 24-30: table with alternatives        ✓ code in backticks
line 32: ## .enforcement                   ✓ standard section
line 34: - failhide pattern = blocker      ✓ correct severity
```

**violations found:** none

### rule.require.failfast.md (test) — 30 lines

```
line 1:  # rule.require.failfast           ✓ lowercase header
line 3:  ## .what                          ✓ standard section
line 5:  tests that lack...                ✓ lowercase, no gerunds
line 7:  ## .why                           ✓ standard section
line 9:  absent resource = unacceptable    ✓ direct, emphatic
line 11: ## .pattern                       ✓ standard section
line 13-25: code block                     ✓ shows bad vs good
line 27: ## .enforcement                   ✓ standard section
line 29: - silent skip...= blocker         ✓ correct severity
```

**violations found:** none

### rule.require.failloud.md (test) — 24 lines

```
line 1:  # rule.require.failloud           ✓ lowercase header
line 3:  ## .what                          ✓ standard section
line 5:  test errors must include...       ✓ lowercase, no gerunds
line 7:  ## .why                           ✓ standard section
line 9:  when a test fails...              ✓ lowercase, direct
line 11: ## .pattern                       ✓ standard section
line 13-18: code block                     ✓ shows actionable hint
line 20: ## .enforcement                   ✓ standard section
line 22: - error without hint = nitpick    ✓ appropriate severity
line 23: - error without context = blocker ✓ appropriate severity
```

**violations found:** none

### rule.require.failloud.md (prod) — 40 lines

```
line 1:  # rule.require.failloud           ✓ lowercase header
line 3:  ## .what                          ✓ standard section
line 5:  errors must use proper...         ✓ lowercase, no gerunds
line 7:  ## .why                           ✓ standard section
line 9-11: bullet list                     ✓ lowercase, direct
line 13: ## .error classes                 ✓ variant of .pattern
line 15-18: table with classes             ✓ documents exit codes
line 20: ## .pattern                       ✓ standard section
line 22-34: code block                     ✓ shows both error types
line 36: ## .enforcement                   ✓ standard section
line 38-39: enforcement rules              ✓ both blocker severity
```

**violations found:** none

### handoff.behavior-guard-update.md — checked

- lowercase throughout
- no gerunds
- follows handoff.{purpose}.md convention
- contains clear .what, .current, .proposed sections

**violations found:** none

---

## deeper check: specific patterns

### did junior use forbidden gerunds?

searched each file for -ing words:

| file | -ing words found | verdict |
|------|------------------|---------|
| rule.forbid.failhide.md | "matching" in table? no, not present | clean |
| rule.require.failfast.md | none | clean |
| rule.require.failloud.md (test) | none | clean |
| rule.require.failloud.md (prod) | none | clean |

### did junior use SHOUTS?

searched each file for ALL CAPS:

| file | all-caps found | verdict |
|------|----------------|---------|
| rule.forbid.failhide.md | none outside code | clean |
| rule.require.failfast.md | "API" in code only | clean (code is exempt) |
| rule.require.failloud.md | "API" in code only | clean (code is exempt) |

### did junior use buzzwords?

searched for common buzzwords:

| buzzword | found? |
|----------|--------|
| robust | no |
| scalable | no |
| leverage | no |
| utilize | no |
| synergy | no |
| innovative | no |
| cutting-edge | no |
| paradigm | no |

**verdict:** language is direct throughout. no buzzwords.

---

## final verification: did junior deviate from mechanic patterns?

| mechanic pattern | expected | found | deviation? |
|-----------------|----------|-------|------------|
| .what section | present | present in all 4 rules | no |
| .why section | present | present in all 4 rules | no |
| .pattern or equivalent | present | present in all 4 rules | no |
| .enforcement section | present | present in all 4 rules | no |
| blocker for critical | critical = blocker | failhide, failfast, context all blocker | no |
| nitpick for nice-to-have | nice-to-have = nitpick | hint = nitpick | no |
| lowercase headers | lowercase | all lowercase | no |
| no gerunds | no -ing nouns | none found | no |
| direct language | no buzzwords | none found | no |

**conclusion:** junior (me) followed all mechanic role standards. no deviations detected.

