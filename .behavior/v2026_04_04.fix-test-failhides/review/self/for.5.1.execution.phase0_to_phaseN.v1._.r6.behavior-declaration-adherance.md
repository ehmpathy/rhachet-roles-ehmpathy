# self-review r6: behavior-declaration-adherance

## the question

> does the implementation match the behavior declaration exactly?

---

## step 1: verify implementation matches vision

### test failhide rules — matches vision?

**vision said:** "tests must verify on every code path. silent pass-through is forbidden."

**implementation (rule.forbid.failhide.md for code.test):**

```markdown
## .what

tests must verify on every code path. silent pass-through is forbidden.

## .forbidden patterns

| pattern | why forbidden |
|---------|---------------|
| `if (!cond) { expect(true).toBe(true) }` | fake verification |
| `if (!hasResource) { return }` | silent skip |
| `expect([0, 1, 2]).toContain(exitCode)` | accepts errors as valid |
```

**verdict:** matches vision exactly. the patterns listed are the same ones from the wish document.

### prod failloud rule — matches vision?

**vision said:** "errors must use proper error classes with full context"

**implementation (rule.require.failloud.md for code.prod):**

```markdown
## .what

errors must use proper error classes with full context.

## .error classes

| who fixes | class | exit code |
|-----------|-------|-----------|
| caller | ConstraintError, BadRequestError | 2 |
| server | MalfunctionError, UnexpectedCodePathError | 1 |
```

**verdict:** matches vision. includes error class guidance and exit codes as specified in criteria.

### rename fail-fast to failfast — matches vision?

**vision said:** rename for symmetry with "failhide"

**implementation:** files renamed via git mv, all references in boot.yml updated

**verdict:** matches vision. symmetry achieved: failhide, failfast, failloud

---

## step 2: verify implementation matches criteria

### criteria: "if test passes without verification on some code path, rule.forbid.failhide blocks"

**implementation check:**

code.test/rule.forbid.failhide.md includes:
- `if (!cond) { expect(true).toBe(true) }` — fake verification pattern
- `if (!hasResource) { return }` — silent skip pattern
- `expect([0, 1, 2]).toContain(exitCode)` — accepts errors pattern
- enforcement: "failhide pattern = blocker"

**verdict:** criteria satisfied. rule will block these patterns.

### criteria: "if test throws ConstraintError on absent resource, all rules pass"

**implementation check:**

code.test/rule.require.failfast.md includes:
- pattern shows `throw new ConstraintError('API key required')`
- legitimate alternatives section includes "absent resource → throw ConstraintError"

**verdict:** criteria satisfied. rule guides toward ConstraintError for absent resources.

### criteria: "all 6 rules in boot.yml say section"

**implementation check:**

boot.yml lines 116-121 (code.prod):
- rule.forbid.failhide.md.pt1.md — in say
- rule.require.failfast.md — in say
- rule.require.failloud.md — in say

boot.yml lines 175-178 (code.test):
- rule.forbid.failhide.md — in say
- rule.require.failfast.md — in say
- rule.require.failloud.md — in say

**verdict:** criteria satisfied. all 6 rules in say section.

---

## step 3: verify implementation matches blueprint

### blueprint: rule.require.failloud.md (code.prod) content

**blueprint said:**

```markdown
# rule.require.failloud

## .what
errors must use proper error classes with full context.

## .why
- enables immediate diagnosis without debug sessions
- distinguishes caller-must-fix from server-must-fix
- exit codes enable automated retry decisions

## .error classes
...

## .enforcement
- error without proper class = blocker
- error without context = blocker
```

**implementation matches blueprint:** yes, exact structure and content.

### blueprint: rule.forbid.failhide.md (code.test) content

**blueprint said:**

```markdown
## .forbidden patterns
| pattern | why forbidden |
|---------|---------------|
| `if (!cond) { expect(true).toBe(true) }` | fake verification |
...

## .legitimate alternatives
| use case | pattern |
|----------|---------|
| conditional test | `given.runIf(condition)(...)` |
...
```

**implementation matches blueprint:** yes, includes forbidden patterns and legitimate alternatives tables.

### blueprint: boot.yml changes

**blueprint said:**
- add `# errors — the most important rules` comment
- add failloud to code.prod say
- rename fail-fast refs to failfast
- add 3 test rules to code.test say

**implementation:**
- line 116: comment added
- line 119: failloud added
- lines 118, 153, 154: failfast (not fail-fast)
- lines 176-178: test rules added

**verdict:** matches blueprint exactly.

---

## step 4: did junior deviate or misinterpret?

| check | deviation? | notes |
|-------|------------|-------|
| rule content | no | matches blueprint specs |
| file names | no | follows name convention |
| boot.yml structure | no | follows extant pattern |
| error class docs | no | matches criteria |
| pattern examples | no | matches wish document examples |

---

## issues found

none. implementation matches behavior declaration.

---

## why adherance holds

| check | result |
|-------|--------|
| matches vision intent? | yes — test failhides are caught |
| matches criteria exactly? | yes — all usecases covered correctly |
| matches blueprint structure? | yes — all files follow spec |
| no junior deviations? | yes — implementation is faithful |

**key insight:** the junior (me) implemented exactly what was specified. the blueprint was detailed enough that there was no room for misinterpretation.

---

## line-by-line file content verification

### code.test/rule.require.failfast.md

**actual content:**

```markdown
# rule.require.failfast

## .what

tests that lack required resources must fail fast, not skip silently.

## .why

absent resource = unacceptable. if a test cannot run its intended behavior, it must fail loud.

## .pattern

\`\`\`ts
// failhide — silent skip
if (!hasApiKey) {
  return; // test passes without verification
}

// failfast — loud failure
if (!hasApiKey) {
  throw new ConstraintError('API key required for this test', {
    hint: 'run: source .agent/repo=.this/role=any/skills/use.apikeys.sh',
  });
}
\`\`\`

## .enforcement

- silent skip on absent resource = blocker
```

**verification:**
- shows both bad pattern (failhide) and good pattern (failfast) — matches criteria
- includes ConstraintError with hint — matches failloud concept
- enforcement is "blocker" — matches severity from vision
- `.what`, `.why`, `.pattern`, `.enforcement` structure — matches blueprint

### code.test/rule.forbid.failhide.md

**verified content includes:**
- forbidden patterns table with exact patterns from wish
- legitimate alternatives table with test-fns patterns
- enforcement: "failhide pattern = blocker"

### code.test/rule.require.failloud.md

**verified content includes:**
- emphasis on hints for resolution
- ConstraintError example with actionable hint
- enforcement levels for error without hint (nitpick) vs context (blocker)

### code.prod/rule.require.failloud.md

**verified content includes:**
- error class table with who-fixes and exit codes
- ConstraintError and MalfunctionError examples
- full context in error constructors

---

## deep check: did implementation drift from spec?

| file | spec says | implementation has | drift? |
|------|-----------|-------------------|--------|
| rule.forbid.failhide.md (test) | table of forbidden patterns | exact patterns from wish | no |
| rule.require.failfast.md (test) | ConstraintError on absent resource | shows ConstraintError with hint | no |
| rule.require.failloud.md (test) | errors include hints | pattern has hint field | no |
| rule.require.failloud.md (prod) | error classes with exit codes | table with exit 2/1 | no |

**conclusion:** no drift detected. implementation is faithful to spec.
