# self-review r8: role-standards-coverage

## the question

> are all relevant mechanic standards applied? are there patterns that should be present but are absent?

---

## step 1: enumerate relevant rule directories

for brief files (markdown rules), the relevant directories are:

| directory | relevance |
|-----------|-----------|
| lang.terms/ | term conventions, noun_adj order |
| lang.tones/ | lowercase, buzzword prohibition |
| code.prod/pitofsuccess.errors/ | rule file structure, enforcement |
| code.test/pitofsuccess.errors/ | rule file structure, enforcement |
| code.prod/readable.comments/ | header comments |
| code.test/frames.behavior/ | test patterns |

**note:** many directories are code-focused (evolvable.procedures, etc) and do not apply to brief files.

---

## step 2: check for absent patterns

### header comments

extant pattern from `rule.require.what-why-headers.md`:

> require jsdoc .what and .why for every named procedure
> require oneliner summaries before every code paragraph

**applicability:** this rule is for code procedures, not markdown files.

**verdict:** not applicable. briefs have their own structure (.what, .why sections) which we followed.

### enforcement section

extant pattern: every rule must have `## .enforcement` section.

| rule | .enforcement present? |
|------|----------------------|
| rule.forbid.failhide.md (test) | yes, line 32 |
| rule.require.failfast.md (test) | yes, line 27 |
| rule.require.failloud.md (test) | yes, line 20 |
| rule.require.failloud.md (prod) | yes, line 36 |

**verdict:** all rules have enforcement section.

### pattern section

extant pattern: every rule must have `## .pattern` or equivalent.

| rule | pattern section? | form |
|------|------------------|------|
| rule.forbid.failhide.md (test) | yes | `.forbidden patterns` table |
| rule.require.failfast.md (test) | yes | `.pattern` code block |
| rule.require.failloud.md (test) | yes | `.pattern` code block |
| rule.require.failloud.md (prod) | yes | `.error classes` + `.pattern` |

**verdict:** all rules have pattern examples.

### legitimate alternatives

extant pattern: forbid rules should document what to do instead.

| rule | alternatives documented? |
|------|-------------------------|
| rule.forbid.failhide.md (test) | yes, `.legitimate alternatives` table |

**verdict:** alternatives documented for the forbid rule.

---

## step 3: check each changed file for absent practices

### rule.forbid.failhide.md (test)

**present:**
- .what section ✓
- .why section ✓
- .forbidden patterns table ✓
- .legitimate alternatives table ✓
- .enforcement section ✓

**absent but should be present:**
- none detected

### rule.require.failfast.md (test)

**present:**
- .what section ✓
- .why section ✓
- .pattern code block ✓
- .enforcement section ✓

**absent but should be present:**
- none detected

### rule.require.failloud.md (test)

**present:**
- .what section ✓
- .why section ✓
- .pattern code block ✓
- .enforcement section ✓

**absent but should be present:**
- none detected

### rule.require.failloud.md (prod)

**present:**
- .what section ✓
- .why section ✓
- .error classes table ✓
- .pattern code block ✓
- .enforcement section ✓

**absent but should be present:**
- none detected

### handoff.behavior-guard-update.md

**present:**
- .what section ✓
- .current section ✓
- .proposed section ✓
- .files to update section ✓

**absent but should be present:**
- none detected

---

## step 4: check for coverage gaps

### did we forget error classes?

| error class | documented in prod? | documented in test? |
|-------------|--------------------|--------------------|
| ConstraintError | yes | yes (example) |
| BadRequestError | yes | no (not needed for test context) |
| MalfunctionError | yes | yes (example) |
| UnexpectedCodePathError | yes | no (not needed for test context) |

**verdict:** test rules focus on ConstraintError which is the primary class for "test cannot run" scenarios. MalfunctionError is mentioned implicitly via the test infra failure case. this is appropriate.

### did we forget exit codes?

| context | exit codes documented? |
|---------|----------------------|
| prod rules | yes, exit 1 vs 2 in failloud table |
| test rules | no — not applicable |

**verdict:** test rules do not need exit codes documented. tests either throw and fail, or pass. exit codes are a prod/cli concern.

### did we forget validation?

briefs are documentation, not code. runtime type validation does not apply.

**verdict:** not applicable.

### did we forget tests?

briefs are markdown files, not testable code. the blueprint explicitly stated:

> ### unit tests
> none — rules are briefs (markdown), not code.

**verdict:** appropriate. no tests needed for documentation files.

---

## step 5: deeper check — what could be absent?

### comparable extant rules

let me compare to extant rule structure:

**extant: rule.forbid.failhide.md.pt1.md (prod)**
- informal prose style
- no .what/.why/.pattern structure
- less structured than new rules

**extant: rule.require.failfast.md (prod, renamed)**
- `.tactic = flow:fail-fast` header
- `.what`, `.scope`, `.why`, `.how`
- `.enforcement` section

**new rules follow a hybrid:**
- simpler than extant failfast (no .scope, .tactic header)
- more structured than extant failhide.pt1.md
- consistent with each other

**verdict:** new rules are internally consistent. they do not need to match extant exactly — vision and blueprint specified the structure.

### what mechanic patterns might apply but are absent?

| pattern | applicable? | present? | verdict |
|---------|-------------|----------|---------|
| .what section | yes | yes | covered |
| .why section | yes | yes | covered |
| .pattern section | yes | yes | covered |
| .enforcement section | yes | yes | covered |
| .see also references | sometimes | no | not required |
| .examples section | sometimes | code blocks serve this | covered |
| .scope section | sometimes | no — scope is clear from path | acceptable |

**verdict:** all required patterns are present. optional patterns (.see also, .scope) are absent but not needed.

---

## step 6: check boot.yml coverage

### did we cover all 6 rules in say?

| rule | in boot.yml say? |
|------|-----------------|
| rule.forbid.failhide.md.pt1.md (prod) | yes, line 117 |
| rule.require.failfast.md (prod) | yes, line 118 |
| rule.require.failloud.md (prod) | yes, line 119 |
| rule.forbid.failhide.md (test) | yes, line 176 |
| rule.require.failfast.md (test) | yes, line 177 |
| rule.require.failloud.md (test) | yes, line 178 |

**verdict:** all 6 rules covered in say section.

### did we add the comment?

vision said to add "errors — the most important rules" comment.

| location | comment present? |
|----------|-----------------|
| code.prod section | yes, line 116 |
| code.test section | yes, line 175 |

**verdict:** comments added in both sections.

---

## issues found

none. all relevant mechanic standards are covered.

---

## why coverage holds

| standard category | coverage |
|-------------------|----------|
| rule structure | all 4 sections present in all rules |
| enforcement | all rules have appropriate severity levels |
| alternatives | forbid rule documents legitimate alternatives |
| boot.yml | all 6 rules in say section |
| comments | "most important rules" comment in both sections |

**key insight:** the blueprint was detailed enough that coverage gaps would have been caught at execution time. the implementation follows the blueprint completely.

---

## comparison to extant rules

### extant rule.forbid.failhide.md.pt1.md structure

```markdown
failhide: hide real errors

common pattern: try/catch

---

allow trycatch only if catch allowlists errors...
...
mega blocker
```

### new rule.forbid.failhide.md (test) structure

```markdown
# rule.forbid.failhide

## .what
tests must verify on every code path...

## .why
failhide tests create false confidence...

## .forbidden patterns
| pattern | why forbidden |
...

## .legitimate alternatives
| use case | pattern |
...

## .enforcement
- failhide pattern = blocker
```

**observation:** new rules are more structured than some extant rules. this is an improvement, not a gap.

---

## final checklist

| item | status |
|------|--------|
| .what section in all rules | ✓ |
| .why section in all rules | ✓ |
| .pattern or equivalent in all rules | ✓ |
| .enforcement in all rules | ✓ |
| alternatives in forbid rule | ✓ |
| boot.yml coverage | ✓ |
| handoff document complete | ✓ |
| no absent practices | ✓ |

**conclusion:** all relevant mechanic standards are covered. no gaps found.

---

## line-by-line coverage analysis

### rule.forbid.failhide.md (test) — what could be absent?

```
line 1-5:   header + .what       → present ✓
line 7-9:   .why                 → present ✓
line 11-20: .forbidden patterns  → present ✓ (6 patterns documented)
line 22-30: .legitimate alts     → present ✓ (5 alternatives documented)
line 32-34: .enforcement         → present ✓
```

**patterns from vision that should be present:**

| pattern from wish | documented? | where |
|-------------------|-------------|-------|
| `if (!cond) { expect(true).toBe(true) }` | yes | line 15 |
| `if (!hasResource) { return }` | yes | line 16 |
| `expect([0, 1, 2]).toContain(exitCode)` | yes | line 17 |

**verdict:** all patterns from the wish document are covered.

### rule.require.failfast.md (test) — what could be absent?

```
line 1-5:   header + .what       → present ✓
line 7-9:   .why                 → present ✓
line 11-25: .pattern             → present ✓ (shows bad vs good)
line 27-29: .enforcement         → present ✓
```

**coverage check:**

| item | present? | evidence |
|------|----------|----------|
| bad pattern example | yes | lines 14-17 show silent skip |
| good pattern example | yes | lines 19-24 show ConstraintError |
| actionable hint in example | yes | line 22 shows hint |
| enforcement level | yes | line 29: blocker |

**verdict:** all required elements present.

### rule.require.failloud.md (test) — what could be absent?

```
line 1-5:   header + .what       → present ✓
line 7-9:   .why                 → present ✓
line 11-18: .pattern             → present ✓ (shows hint and env)
line 20-23: .enforcement         → present ✓
```

**coverage check:**

| item | present? | evidence |
|------|----------|----------|
| pattern with hint | yes | line 15 |
| pattern with env | yes | line 16 |
| nitpick vs blocker distinction | yes | lines 22-23 |

**verdict:** all required elements present.

### rule.require.failloud.md (prod) — what could be absent?

```
line 1-5:   header + .what       → present ✓
line 7-11:  .why                 → present ✓ (3 bullet points)
line 13-18: .error classes       → present ✓ (table with exit codes)
line 20-34: .pattern             → present ✓ (shows both error types)
line 36-39: .enforcement         → present ✓
```

**coverage check:**

| item from vision | present? | evidence |
|------------------|----------|----------|
| ConstraintError | yes | line 17, 24 |
| BadRequestError | yes | line 17 |
| MalfunctionError | yes | line 18, 30 |
| UnexpectedCodePathError | yes | line 18 |
| exit code 2 for caller errors | yes | line 17 |
| exit code 1 for server errors | yes | line 18 |
| full context in examples | yes | lines 25-27, 31-33 |

**verdict:** all required elements from vision present.

---

## handoff coverage check

### handoff.behavior-guard-update.md — what could be absent?

**required sections for handoff:**

| section | present? | line |
|---------|----------|------|
| .what | yes | describes guard update |
| .current | yes | shows current rules glob |
| .proposed | yes | shows proposed rules glob |
| .files to update | yes | lists guard files |

**specific content check:**

| item | present? | evidence |
|------|----------|----------|
| current glob pattern | yes | `.agent/.../code.prod/.../rule.*.md` |
| proposed glob pattern | yes | `.agent/.../code.{prod,test}/.../rule.*.md` |
| brace expansion for prod+test | yes | `code.{prod,test}` |

**verdict:** handoff contains all required info for behavior guard update.

---

## what mechanic standards might we have forgotten?

### from pitofsuccess.procedures/

| rule | applicable to briefs? | covered? |
|------|----------------------|----------|
| rule.require.idempotent-procedures | no — briefs not procedures | n/a |
| rule.forbid.nonidempotent-mutations | no — briefs not procedures | n/a |
| rule.forbid.undefined-inputs | no — briefs not procedures | n/a |

### from readable.comments/

| rule | applicable to briefs? | covered? |
|------|----------------------|----------|
| rule.require.what-why-headers | no — for code procedures | n/a |

briefs use their own structure: `## .what`, `## .why`, etc.

### from code.test/frames.behavior/

| rule | applicable to briefs? | covered? |
|------|----------------------|----------|
| rule.require.given-when-then | no — for test code | n/a |
| howto.write-bdd | no — for test code | n/a |

---

## vision requirements coverage

from vision.stone, all requirements should be covered:

| requirement | covered? | evidence |
|-------------|----------|----------|
| create rule.forbid.failhide for code.test | yes | file extant |
| create rule.require.failfast for code.test | yes | file extant |
| create rule.require.failloud for code.test | yes | file extant |
| create rule.require.failloud for code.prod | yes | file extant |
| rename fail-fast to failfast | yes | git mv done |
| all 6 rules in boot.yml say section | yes | lines verified |
| handoff for behavior guard update | yes | file extant |

**verdict:** 100% coverage of vision requirements.

---

## criteria requirements coverage

from criteria.blackbox.stone:

| usecase | requirement | covered? | evidence |
|---------|-------------|----------|----------|
| mechanic writes prod code | failhide blocks | yes | extant rule.forbid.failhide.md.pt1.md |
| mechanic writes prod code | failfast blocks | yes | rule.require.failfast.md (renamed) |
| mechanic writes prod code | failloud blocks | yes | rule.require.failloud.md (new) |
| mechanic writes test code | failhide blocks | yes | code.test/rule.forbid.failhide.md |
| mechanic writes test code | failfast blocks | yes | code.test/rule.require.failfast.md |
| mechanic writes test code | failloud blocks | yes | code.test/rule.require.failloud.md |
| session boots | all 6 rules in context | yes | boot.yml verified |
| error scenario | error classes documented | yes | failloud rules |

**verdict:** 100% coverage of criteria requirements.

---

## final conclusion

all mechanic standards that apply to this work are covered:

1. **rule structure**: all 4 rules have .what, .why, .pattern, .enforcement
2. **enforcement levels**: appropriate blocker/nitpick designations
3. **pattern examples**: all patterns from vision documented
4. **boot.yml**: all 6 rules in say section
5. **handoff**: complete instructions for guard update
6. **vision requirements**: 100% covered
7. **criteria requirements**: 100% covered

no absent practices found. implementation is complete.

