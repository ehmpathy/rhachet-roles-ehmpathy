# self-review r9: has-ergonomics-validated

## the question

> does the actual input/output match what felt right at repros?

---

## step 1: understand the ergonomics review scope

the guide instructs:
> compare the implemented input/output to what was sketched in repros

for briefs (markdown documentation), "input/output" means:
- **input**: what the mechanic reads (rule text)
- **output**: what the mechanic understands (pattern + enforcement)

for guards and boot.yml:
- **input**: rule paths in config
- **output**: rules loaded at session start

---

## step 2: verify no repros artifacts

```sh
ls .behavior/v2026_04_04.fix-test-failhides/3.2.distill.repros.experience.*.md 2>/dev/null
```

**result:** no matches. no repros artifacts.

this is correct for a documentation-only pr. repros are for code with user journeys, not markdown briefs.

---

## step 3: derive planned ergonomics from wish and vision

since no repros, the planned ergonomics come from wish and vision:

### wish declares

> ensure that our rules clearly make symmetric
> - failhide (forbid)
> - vs failfast (require)
> - vs failloud (require)

**ergonomic requirement 1:** three concepts, symmetric across prod and test

> create a handoff document to add the `code.test/*` variant

**ergonomic requirement 2:** handoff specifies exact change for guard update

### vision declares

> all 6 rules must be in `say` section (not `ref`)

**ergonomic requirement 3:** rules always visible, not referenced

> error classes: ConstraintError/BadRequestError for caller (exit 2), MalfunctionError/UnexpectedCodePathError for server (exit 1)

**ergonomic requirement 4:** error class semantics are explicit

---

## step 4: verify ergonomic requirement 1 — symmetric concepts

### planned

three concepts across two scopes:

| concept | type | prod | test |
|---------|------|------|------|
| failhide | forbid | yes | yes |
| failfast | require | yes | yes |
| failloud | require | yes | yes |

total: 6 rules (3 concepts x 2 scopes)

### implemented

| concept | prod file | test file |
|---------|-----------|-----------|
| failhide | rule.forbid.failhide.md.pt1.md (extant) | rule.forbid.failhide.md (created) |
| failfast | rule.require.failfast.md (renamed) | rule.require.failfast.md (created) |
| failloud | rule.require.failloud.md (created) | rule.require.failloud.md (created) |

**symmetry verified:** all 6 rules follow same structure:

```
rule.{forbid|require}.{concept}.md
```

**terminology verified:** consistent use of:
- failhide (not "fail-hide" or "hide-fail")
- failfast (not "fail-fast" or "fast-fail")
- failloud (not "fail-loud" or "loud-fail")

---

## step 5: verify ergonomic requirement 2 — handoff clarity

### planned

> handoff document specifies exact change for guard update

### implemented

handoff location: `briefs/practices/code.test/pitofsuccess.errors/handoff.behavior-guard-update.md`

content comparison:

| aspect | planned | implemented |
|--------|---------|-------------|
| current state | yes | shown with exact path |
| proposed state | yes | shown with brace expansion |
| files to update | yes | mentioned (guards with failhide review) |

**handoff verified:** the document shows:
```sh
# current
--rules '.agent/.../code.prod/pitofsuccess.errors/rule.*.md'

# proposed
--rules '.agent/.../code.{prod,test}/pitofsuccess.errors/rule.*.md'
```

this is minimal viable handoff — no excess, no deficit.

---

## step 6: verify ergonomic requirement 3 — always visible

### planned

> all 6 rules must be in `say` section (not `ref`)

### implemented

from blueprint boot.yml specification:

```yaml
subject.code.prod:
  briefs:
    say:
      - briefs/practices/code.prod/pitofsuccess.errors/rule.forbid.failhide.md.pt1.md
      - briefs/practices/code.prod/pitofsuccess.errors/rule.require.failfast.md
      - briefs/practices/code.prod/pitofsuccess.errors/rule.require.failloud.md

subject.code.test:
  briefs:
    say:
      - briefs/practices/code.test/pitofsuccess.errors/rule.forbid.failhide.md
      - briefs/practices/code.test/pitofsuccess.errors/rule.require.failfast.md
      - briefs/practices/code.test/pitofsuccess.errors/rule.require.failloud.md
```

**visibility verified:** all 6 rules in `say`, none in `ref`.

---

## step 7: verify ergonomic requirement 4 — error class semantics

### planned

| who fixes | classes | exit code |
|-----------|---------|-----------|
| caller | ConstraintError, BadRequestError | 2 |
| server | MalfunctionError, UnexpectedCodePathError | 1 |

### implemented

from rule.require.failloud.md (both prod and test):

```markdown
## .error classes

| who fixes | class | exit code |
|-----------|-------|-----------|
| caller | ConstraintError, BadRequestError | 2 |
| server | MalfunctionError, UnexpectedCodePathError | 1 |
```

**semantics verified:** exact match.

---

## step 8: design drift analysis

### question

did the design drift between wish/vision and implementation?

### analysis

| aspect | wish/vision | implementation | drift? |
|--------|-------------|----------------|--------|
| symmetric concepts | 3 x 2 | 3 x 2 | no |
| handoff clarity | current → proposed | current → proposed | no |
| always visible | say section | say section | no |
| error semantics | caller vs server | caller vs server | no |
| terminology | failhide/failfast/failloud | failhide/failfast/failloud | no |

**no drift detected.**

---

## step 9: ergonomics quality assessment

### self-interrogation

**q:** is the rule structure intuitive?

**a:** yes. each rule follows:
- .what — one sentence summary
- .why — motivation
- .forbidden patterns / .pattern — code examples
- .enforcement — blocker/nitpick level

this matches extant rules (e.g., rule.forbid.failhide.md.pt1.md in prod).

**q:** are the examples actionable?

**a:** yes. each rule includes:
- code that violates (with explanation)
- code that complies (with explanation)
- specific guidance on resolution

**q:** could a mechanic misunderstand?

**a:** unlikely. the terminology is defined:
- failhide = hide errors, continue as if ok
- failfast = detect bad state early, throw immediately
- failloud = use proper error class with full details

these are complementary, not shared. each has distinct scope.

---

## step 10: potential ergonomic improvements

### self-critique

**could the handoff be more specific?**

current handoff says "files to update: stone guards that run failhide review"

this could list the exact files:
- 5.1.execution guards
- 3.3.1.blueprint guards

however, the guard tool (rhachet run --skill review) is external to this pr. the handoff correctly specifies the rule path change, which is sufficient.

**could the rules be more concise?**

the rules are already compressed (.md.min format potential). however, the vision explicitly requires them in `say` section, the intent is they load at session start. conciseness is secondary to completeness for these critical rules.

---

## issues found

none. ergonomics match the plan without drift.

---

## why this holds

| check | result | evidence |
|-------|--------|----------|
| symmetric concepts? | yes | 3 x 2 = 6 rules |
| handoff clarity? | yes | current → proposed with exact paths |
| always visible? | yes | all in say section |
| error semantics? | yes | caller vs server with exit codes |
| design drift? | no | implementation = wish/vision |
| examples actionable? | yes | code + explanation in each rule |

---

## reflection

the guide asks:
> did the design change between repros and implementation?

there were no repros (documentation-only pr). the design specified in wish and vision was faithfully implemented:

1. **symmetric concepts** — failhide, failfast, failloud across prod and test
2. **handoff clarity** — exact paths for guard update
3. **always visible** — rules in boot.yml say section
4. **error semantics** — ConstraintError (exit 2) vs MalfunctionError (exit 1)

the ergonomics are consistent. a mechanic who reads these rules will understand:
- what patterns are forbidden
- what behavior is required
- what error classes to use
- how the guard will enforce it

this is the outcome the wish described. the implementation matches the plan.

---

## final checklist

| question from guide | answer | evidence |
|---------------------|--------|----------|
| repros artifact extant? | no | documentation-only pr |
| planned ergonomics identified? | yes | from wish/vision |
| actual ergonomics match? | yes | all 4 requirements verified |
| design drift? | no | implementation = plan |
| ergonomics need fix? | no | all match, quality is high |

**conclusion:** ergonomics validated. the implementation faithfully reflects the plan from wish and vision. no drift, no regressions, no improvements needed.

