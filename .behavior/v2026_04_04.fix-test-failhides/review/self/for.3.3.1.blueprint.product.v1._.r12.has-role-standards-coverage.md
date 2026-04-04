# self-review r12: has-role-standards-coverage

## the question

> are all relevant mechanic standards applied to this blueprint?

check for patterns that should be present but are absent.

---

## step 1: identify what standards apply

the blueprint creates markdown rule files and updates boot.yml.

| artifact type | applicable standards | why this applies |
|---------------|---------------------|------------------|
| rule files (markdown) | `.what`/`.why` headers, enforcement section, examples | rule files are briefs; briefs need header structure |
| boot.yml changes | yaml structure, path format | boot.yml is configuration; paths must point to correct files |
| handoff documents | `.what`/`.current`/`.proposed` sections | handoffs are contracts; need before/after states |
| code examples in rules | early returns, no else, proper error classes | examples are code; code must follow code standards |

**note:** this is not a code blueprint, so code-specific standards (tests, types, daos) do not apply directly. but code examples within rules must follow code standards.

**completeness check:** ✓ all artifact types enumerated

**why it's complete:**
- the blueprint creates 4 new rule files → rule file standards apply
- the blueprint modifies boot.yml → yaml standards apply
- the blueprint creates handoff document → handoff standards apply
- the blueprint contains code examples → code standards apply to those examples
- no other artifact types are created

---

## step 2: check each artifact type

### rule files: required sections

**standard:** rule files should have `.what`, `.why`, `.pattern`, `.enforcement` sections (from extant rules like `rule.require.exit-code-semantics.md`).

**blueprint coverage:**

| file spec | .what | .why | .pattern | .enforcement |
|-----------|-------|------|----------|--------------|
| rule.require.failloud.md (prod) | ✓ | ✓ | ✓ | ✓ |
| rule.forbid.failhide.md (test) | ✓ | ✓ | ✓ (as .forbidden patterns) | ✓ |
| rule.require.failfast.md (test) | ✓ | ✓ | ✓ | ✓ |
| rule.require.failloud.md (test) | ✓ | ✓ | ✓ | ✓ |

**check:** ✓ all 4 rule specs have required sections

**why it holds:**
- each spec follows the `# header` format with subsections
- `.enforcement` section defines severity (blocker vs nitpick)
- `.pattern` section shows concrete code examples

**lesson:** rule files that lack `.enforcement` are incomplete — they tell you what to do but not what happens if you don't. the blueprint correctly specifies enforcement for each rule.

### rule files: legitimate alternatives

**standard:** forbid rules should pair forbidden patterns with legitimate alternatives (pit of success).

**blueprint coverage:**

| forbid rule | forbidden patterns | legitimate alternatives |
|-------------|-------------------|------------------------|
| rule.forbid.failhide.md (test) | ✓ 6 patterns listed | ✓ 5 alternatives listed |

**check:** ✓ forbid rule has legitimate alternatives section

**why it holds:**
- a forbid rule without alternatives leaves developers stuck
- the blueprint shows 5 legitimate alternatives for each forbidden pattern
- alternatives include `given.runIf()`, `then.skipIf()`, `it.skip()`, `ConstraintError`, snapshot with assertions

**lesson:** "don't do X" is incomplete guidance. "don't do X, do Y instead" is complete. the blueprint follows this pattern.

### code examples: proper error classes

**standard:** code examples should demonstrate proper error classes (failloud).

**blueprint coverage:**

```ts
throw new ConstraintError('API key required for this test', {
  hint: 'run: source .agent/repo=.this/role=any/skills/use.apikeys.sh',
});
```

**check:** ✓ code examples use ConstraintError with context

**why it holds:**
- examples are not just `throw new Error('...')`
- they use specific error class (ConstraintError)
- they include context (hint field)
- this demonstrates the failloud concept within the rule itself

**lesson:** rules should exemplify what they require. a failloud rule that shows generic `Error` would be inconsistent.

### code examples: early returns

**standard:** code examples should use early returns, not else branches.

**blueprint code examples:**

```ts
// 👎 failhide — silent skip
if (!hasApiKey) {
  return;
}

// 👍 failfast — loud failure
if (!hasApiKey) {
  throw new ConstraintError('...');
}
```

**check:** ✓ examples use early return/throw pattern

**why it holds:**
- no else branches in any code example
- guard clause pattern (check condition, act if met)
- matches rule.forbid.else-branches standard

**lesson:** code examples in rules should follow the same standards as production code. the blueprint does not exempt examples from code standards.

### boot.yml: path format

**standard:** boot.yml paths should use relative format from boot.yml location.

**blueprint boot.yml:**

```yaml
say:
  - briefs/practices/code.prod/pitofsuccess.errors/rule.forbid.failhide.md.pt1.md
  - briefs/practices/code.test/pitofsuccess.errors/rule.forbid.failhide.md
```

**check:** ✓ paths use correct relative format

**why it holds:**
- paths start with `briefs/` (relative to boot.yml in role root)
- no absolute paths or `@/` aliases
- matches extant boot.yml entries

**lesson:** boot.yml paths must be relative to the role directory where boot.yml lives. the blueprint follows this convention.

### handoff documents: required sections

**standard:** handoff documents should have `.what`, `.current`, `.proposed`, `.files to update` sections.

**blueprint handoff:**

```markdown
# handoff: behavior guard rule update

## .what
behavior guards on 5.1.execution and 3.3.1.blueprint need to include code.test failhide rules.

## .current
...

## .proposed
...

## .files to update
- stone guards that run failhide review
```

**check:** ✓ handoff has all required sections

**why it holds:**
- `.what` explains the purpose
- `.current` shows before state
- `.proposed` shows after state
- `.files to update` lists affected files

**lesson:** handoffs are contracts between blueprints and future work. incomplete handoffs get lost or misunderstood. the blueprint handoff is complete.

---

## step 3: check for patterns absent

### error handle in examples?

**question:** do code examples show error handle?

**answer:** yes — the failfast example shows `throw new ConstraintError()`. this is the correct error handle for test code (fail loud, not swallow).

### validation patterns?

**question:** do rules specify input validation?

**answer:** not applicable — these are behavioral rules, not data validation rules. the rules specify patterns to detect (failhide patterns), not input shapes to validate.

### tests for rules?

**question:** should the blueprint include tests for the rules?

**answer:** addressed in blueprint "test coverage" section:

```
### unit tests
none — rules are briefs (markdown), not code.

### integration tests
none — rules are briefs (markdown), not code.

### acceptance tests
| test | verification |
| boot.yml loads all 6 rules | session start shows rules in context |
| behavior guard catches prod failhide | guard blocks on failhide pattern in prod |
| behavior guard catches test failhide | guard blocks on failhide pattern in test |
```

**check:** ✓ test coverage section explains why no code tests and defines acceptance tests

**why it holds:**
- markdown rules don't have unit tests
- acceptance tests verify rules work via guard behavior
- blueprint is explicit about this

**lesson:** "no tests" requires justification. the blueprint justifies it: rules are markdown, not code. acceptance tests verify guards.

---

## issues found

none. all applicable mechanic standards are covered.

---

## why coverage is complete

| standard category | coverage |
|-------------------|----------|
| rule file sections | all 4 specs have .what/.why/.pattern/.enforcement |
| legitimate alternatives | forbid rule has alternatives section |
| code example quality | uses proper error classes, early returns |
| boot.yml paths | relative format, matches extant |
| handoff completeness | all required sections present |
| test justification | explicit section explains no code tests |

**key insight:** the blueprint is thorough because it was reviewed against extant rules before authorship. coverage is complete because the author used extant rules as templates.

---

## what could have gone wrong (avoided mistakes)

### could have: omitted .enforcement section

**bad alternative:** rules say what to do but not severity

**why it would be wrong:** reviewers need to know if violation is blocker vs nitpick

**what the blueprint does instead:** each rule has `.enforcement` section with severity

### could have: forbid without alternatives

**bad alternative:** rule.forbid.failhide.md lists patterns but no alternatives

**why it would be wrong:** leaves developers stuck; pit of despair instead of pit of success

**what the blueprint does instead:** includes "legitimate alternatives" table

### could have: generic Error in examples

**bad alternative:** `throw new Error('API key required')`

**why it would be wrong:** contradicts failloud concept within the failloud rule

**what the blueprint does instead:** uses `new ConstraintError()` with full context

---

## summary

- 6 coverage areas examined (rule sections, alternatives, code examples, boot.yml, handoffs, tests)
- 0 gaps found
- 3 potential mistakes identified and avoided
- all applicable mechanic standards are covered

