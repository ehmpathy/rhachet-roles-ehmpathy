# self-review r7: has-consistent-mechanisms

## the question

> do we duplicate extant functionality or deviate from extant patterns?

new mechanisms should be consistent with extant patterns unless the ask was to refactor.

---

## step 1: search for extant mechanisms

searched for related codepaths in `src/domain.roles/mechanic/briefs/practices/`:

```
code.prod/pitofsuccess.errors/
├── rule.forbid.failhide.md.pt1.md     (prose style)
├── rule.forbid.failhide.md.pt2.md     (prose style)
├── rule.require.fail-fast.md          (.tactic format)
├── rule.require.fail-fast.[seed].md   (.tactic format)
├── rule.require.fail-fast.[demo].shell.md  (.tactic format)
├── rule.require.exit-code-semantics.md (# header + ## .what format)
└── rule.prefer.helpful-error-wrap.md   (# header + ## .what format)
```

**observation:** extant rules use multiple formats. the `rule.require.exit-code-semantics.md` uses the same format the blueprint proposes.

---

## step 2: examine each new mechanism

### new directory: code.test/pitofsuccess.errors/

**extant pattern:** `code.prod/pitofsuccess.errors/` exists

**is this consistent?** yes — mirrors extant directory structure

| aspect | extant (code.prod) | proposed (code.test) |
|--------|-------------------|---------------------|
| location | `briefs/practices/code.prod/pitofsuccess.errors/` | `briefs/practices/code.test/pitofsuccess.errors/` |
| purpose | error rules for prod code | error rules for test code |
| name | `pitofsuccess.errors` | `pitofsuccess.errors` |

**verdict:** consistent — follows extant directory structure

### new rule format: # header with ## .what sections

**extant patterns:**

| file | format |
|------|--------|
| rule.forbid.failhide.md.pt1.md | prose, no headers |
| rule.require.fail-fast.md | `.tactic = ...` with `.what`, `.scope`, `.why`, `.how` |
| rule.require.exit-code-semantics.md | `# header` with `## .what`, `## .why`, `## .pattern`, `## .enforcement` |

**blueprint format:** `# header` with `## .what`, `## .why`, `## .pattern`, `## .enforcement`

**is this consistent?** yes — matches `rule.require.exit-code-semantics.md` format

**verdict:** consistent — follows extant pattern

### new file names: rule.{forbid|require}.{name}.md

**extant pattern:**
- `rule.forbid.failhide.md.pt1.md`
- `rule.require.fail-fast.md`
- `rule.require.exit-code-semantics.md`
- `rule.prefer.helpful-error-wrap.md`

**blueprint names:**
- `rule.forbid.failhide.md` (test)
- `rule.require.failfast.md` (test)
- `rule.require.failloud.md` (test + prod)

**is this consistent?** yes — follows `rule.{verb}.{name}.md` pattern

**verdict:** consistent — follows extant convention

### boot.yml integration

**extant pattern:**
```yaml
subject.code.prod:
  briefs:
    say:
      - briefs/practices/code.prod/pitofsuccess.errors/rule.forbid.failhide.md.pt1.md
```

**blueprint pattern:**
```yaml
subject.code.test:
  briefs:
    say:
      - briefs/practices/code.test/pitofsuccess.errors/rule.forbid.failhide.md
```

**is this consistent?** yes — follows extant boot.yml structure

**verdict:** consistent — follows extant integration pattern

### behavior guard glob pattern

**extant pattern:**
```sh
--rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.*.md'
```

**proposed pattern:**
```sh
--rules '.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.{prod,test}/pitofsuccess.errors/rule.*.md'
```

**is this consistent?** yes — extends extant glob with standard brace expansion

**verdict:** consistent — follows extant pattern with additive extension

---

## step 3: check for duplicated functionality

| proposed | could reuse extant? | verdict |
|----------|---------------------|---------|
| rule.forbid.failhide.md (test) | no — test patterns distinct from prod | new is appropriate |
| rule.require.failfast.md (test) | no — test context differs (ConstraintError on absent resource) | new is appropriate |
| rule.require.failloud.md (test) | no — test errors need hints, prod errors need error classes | new is appropriate |
| rule.require.failloud.md (prod) | no — prod didn't have this concept yet | new is appropriate |

**no duplication found.** each new rule addresses a distinct need.

---

## issues found

none. all new mechanisms are consistent with extant patterns.

---

## why each non-issue holds

### directory structure: code.test mirrors code.prod

**why it holds:**
- extant pattern: `code.prod/pitofsuccess.errors/` exists
- proposed: `code.test/pitofsuccess.errors/` mirrors this structure
- symmetry: test rules live in a parallel location to prod rules

**lesson:** when the codebase has `code.prod/X/`, test rules for the same domain should go in `code.test/X/`. this makes navigation intuitive — if you know where the prod rule is, you know where the test rule is.

### file names: rule.{verb}.{name}.md

**why it holds:**
- extant pattern: `rule.forbid.X.md`, `rule.require.Y.md`, `rule.prefer.Z.md`
- proposed: `rule.forbid.failhide.md`, `rule.require.failfast.md`, `rule.require.failloud.md`
- the verb (forbid/require/prefer) is the first discriminator after `rule.`

**lesson:** follow the extant convention exactly. don't introduce new verbs unless the extant set lacks one. here, forbid/require/prefer cover all cases.

### rule format: matches rule.require.exit-code-semantics.md

**why it holds:**
- extant rules use 3 different formats (prose, .tactic, # header)
- the blueprint chose `# header` format with `## .what`, `## .why`, `## .pattern`, `## .enforcement`
- this matches `rule.require.exit-code-semantics.md` exactly

**lesson:** when extant patterns vary, pick one and be explicit about which you follow. the choice here: `rule.require.exit-code-semantics.md` format. this format has clear sections and is easier to parse than prose or .tactic formats.

**note:** the format inconsistency in extant rules is a pre-extant state, not a license to add more variation. converge on one format when possible.

### boot.yml integration: subject.code.{scope}.briefs.say

**why it holds:**
- extant pattern: `subject.code.prod.briefs.say` contains rule paths
- proposed: `subject.code.test.briefs.say` contains test rule paths
- the scope (prod/test) is the differentiator

**lesson:** boot.yml structure has a clear pattern: `subject.code.{scope}.briefs.{say|ref}`. new rules slot into this structure without modification.

### guard glob: extends with brace expansion

**why it holds:**
- extant glob: `code.prod/pitofsuccess.errors/rule.*.md`
- proposed glob: `code.{prod,test}/pitofsuccess.errors/rule.*.md`
- standard brace expansion makes the change minimal

**lesson:** when a glob needs to include additional paths, prefer brace expansion over multiple globs. `{prod,test}` is cleaner than two separate `--rules` flags.

---

## why no duplication holds

### test failhide rule distinct from prod failhide rule

**why it holds:**
- prod failhide patterns: try/catch swallow, error ignore
- test failhide patterns: `expect(true).toBe(true)`, silent return, `expect.any(Object)`
- these are fundamentally different patterns that happen to share a name

**lesson:** failhide is a concept, not a pattern. the patterns that manifest failhide differ by context (prod vs test). separate rules are appropriate because the patterns differ.

### test failfast rule distinct from prod failfast rule

**why it holds:**
- prod failfast: early return/throw on bad state, guard clauses
- test failfast: throw ConstraintError on absent resource
- the action is similar (fail fast) but the trigger differs

**lesson:** even when the concept is the same, context-specific rules may be needed. tests fail fast for different reasons than prod code.

### failloud is a new concept

**why it holds:**
- extant rules: failhide (forbid), fail-fast (require)
- failloud completes the triad: failhide/failfast/failloud
- no extant rule covers "use proper error class with full context"

**lesson:** failloud fills a gap in the extant rules. this is not duplication — it's completion of a conceptual set.

---

## summary

- 5 mechanisms examined
- 0 consistency issues found
- 0 duplications found
- all new mechanisms follow extant patterns
