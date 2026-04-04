# self-review r3: has-consistent-mechanisms

## the question

> did we add mechanisms that duplicate extant functionality?

---

## step 1: enumerate what was created

| artifact | type | description |
|----------|------|-------------|
| rule.require.failloud.md (code.prod) | brief | new rule about error classes |
| rule.forbid.failhide.md (code.test) | brief | new rule for test failhides |
| rule.require.failfast.md (code.test) | brief | new rule for test failfast |
| rule.require.failloud.md (code.test) | brief | new rule for test failloud |
| handoff.behavior-guard-update.md | brief | handoff document |

---

## step 2: check for mechanism duplication

### are these briefs duplicating code?

**question:** are we creating briefs that duplicate extant code utilities?

**answer:** no. briefs are markdown documents that describe rules. they are not code mechanisms. there is no code utility that "implements" failhide detection — that is done by brain review with rules as input.

**verdict:** no duplication.

**why it holds:**
- briefs are documentation, not implementation
- no code utility extant that we're duplicating with markdown
- the rules are inputs to review skill, not code mechanisms

### are these briefs duplicating other briefs?

**question:** do any of these new briefs duplicate extant briefs?

**answer:** the code.test rules are intentionally symmetric with code.prod rules, but not duplicates.

| code.prod | code.test | relationship |
|-----------|-----------|--------------|
| rule.forbid.failhide.md.pt1.md | rule.forbid.failhide.md | symmetric (different scope) |
| rule.require.failfast.md | rule.require.failfast.md | symmetric (different patterns) |
| rule.require.failloud.md | rule.require.failloud.md | symmetric (different examples) |

**verdict:** intentional symmetry, not duplication.

**why it holds:**
- prod rules focus on try/catch patterns in production code
- test rules focus on expect patterns in test code
- each rule has scope-specific patterns and examples
- this is the explicit goal from vision: symmetric rules for both scopes

### does handoff duplicate extant documentation?

**question:** does the handoff brief duplicate extant docs?

**answer:** no. it documents a specific change to behavior guard globs. no other document covers this.

**verdict:** no duplication.

---

## step 3: check for utility duplication

| potential duplication | found? | verdict |
|----------------------|--------|---------|
| error class utilities | no | rules reference extant classes (ConstraintError, etc) |
| validation utilities | no | rules are inputs to review, not validators |
| pattern matchers | no | brain does pattern matching, not code |

---

## issues found

none. no mechanisms duplicate extant functionality.

---

## why consistency holds

| check | result |
|-------|--------|
| new code duplicates extant? | no — only briefs created |
| new briefs duplicate briefs? | no — symmetric by design |
| handoff duplicates docs? | no — unique content |
| reused extant patterns? | yes — followed extant rule structure |

**key insight:** we created briefs (documentation), not code mechanisms. the question of mechanism duplication does not apply to markdown rule files. we did follow extant rule file structure for consistency.

---

## what we reused (not duplicated)

### extant rule file structure

we followed the extant pattern for rule files:

```markdown
# rule.{directive}.{name}

## .what
## .why
## .pattern (or .error classes)
## .enforcement
```

this is consistent with extant rules like:
- rule.forbid.failhide.md.pt1.md
- rule.require.failfast.md (renamed from fail-fast)

### extant error classes

we referenced extant error classes in examples:
- ConstraintError
- BadRequestError
- MalfunctionError
- UnexpectedCodePathError

no new error classes created — we use what the codebase already has.

---

## deeper reflection: did i truly search?

### did i search for related codepaths?

**searched:**
- `src/domain.roles/mechanic/briefs/practices/code.prod/pitofsuccess.errors/` — found extant failhide and failfast rules
- `src/domain.roles/mechanic/briefs/practices/code.test/` — found no extant pitofsuccess.errors directory
- `boot.yml` — found how rules are loaded and structured

**what i found:**
- extant prod rules follow consistent structure
- no test-specific error rules extant before this work
- no code utilities for failhide detection (brain does this via review skill)

### could we have reused more?

**considered:**
- could we reuse the prod rule content directly? no — test patterns are different (expect vs try/catch)
- could we reference prod rules from test? no — each scope needs its own actionable examples
- could we merge into single rule with both scopes? no — violates single responsibility

**conclusion:** the symmetric-but-separate approach is correct. each rule is actionable for its scope.

### what mechanisms are truly new?

| artifact | genuinely new? | why |
|----------|---------------|-----|
| rule.require.failloud.md (prod) | yes | concept not previously documented |
| rule.forbid.failhide.md (test) | yes | test-specific patterns not previously documented |
| rule.require.failfast.md (test) | yes | test-specific guidance not previously documented |
| rule.require.failloud.md (test) | yes | test-specific examples not previously documented |

all new artifacts fill gaps. none duplicate extant content.
