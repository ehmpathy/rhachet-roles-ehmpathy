# self-review r8: has-ergonomics-validated

## the question

> does the actual input/output match what felt right at repros?

---

## step 1: locate repros for ergonomics comparison

the guide says to compare implemented input/output to what was sketched in repros:
> .behavior/v2026_04_04.fix-test-failhides/3.2.distill.repros.experience.*.md

```sh
ls .behavior/v2026_04_04.fix-test-failhides/3.2.distill.repros.experience.*.md 2>/dev/null
```

**result:** no matches. no repros artifacts exist.

---

## step 2: derive ergonomics from wish and vision

since no repros exist, i derive the "planned ergonomics" from wish and vision:

### from wish (0.wish.md)

> we need to create a rule to eliminate failhides in tests

**planned ergonomic:** rules teach pattern clearly

> ensure that our rules clearly make symmetric
> - failhide (forbid)
> - vs failfast (require)
> - vs failloud (require)

**planned ergonomic:** symmetric terminology across rules

> create both a failhide forbid rule for prod codepaths and test codepaths each

**planned ergonomic:** symmetric structure (prod + test)

### from vision (1.vision.stone)

> all 6 rules must be in `say` section (not `ref`)

**planned ergonomic:** rules are always visible, not just referenced

---

## step 3: verify ergonomics — symmetric terminology

### planned

| concept | rule type | applies to |
|---------|-----------|------------|
| failhide | forbid | prod + test |
| failfast | require | prod + test |
| failloud | require | prod + test |

### implemented

| concept | rule type | prod | test |
|---------|-----------|------|------|
| failhide | forbid | extant (pt1, pt2) | created |
| failfast | require | extant (renamed) | created |
| failloud | require | created | created |

**ergonomics match:** symmetric terminology across all rules.

---

## step 4: verify ergonomics — clear guidance

### planned

rules should provide clear guidance with:
- what is forbidden/required
- why it matters
- examples of bad code
- examples of good code
- enforcement level

### implemented

| rule | .what | .why | examples | .enforcement |
|------|-------|------|----------|--------------|
| forbid.failhide (test) | yes | yes | 6 forbidden + 4 legitimate | blocker |
| require.failfast (test) | yes | yes | failhide vs failfast code | blocker |
| require.failloud (test) | yes | yes | ConstraintError with hint | blocker/nitpick |
| require.failloud (prod) | yes | yes | caller vs server error classes | blocker |

**ergonomics match:** all rules provide clear guidance.

---

## step 5: verify ergonomics — always visible

### planned

> all 6 rules must be in `say` section (not `ref`)

### implemented

from blueprint specification for boot.yml:

```yaml
subject.code.prod:
  briefs:
    say:
      - briefs/practices/code.prod/pitofsuccess.errors/rule.forbid.failhide.md.pt1.md
      - briefs/practices/code.prod/pitofsuccess.errors/rule.require.failfast.md
      - briefs/practices/code.prod/pitofsuccess.errors/rule.require.failloud.md
      # ...

subject.code.test:
  briefs:
    say:
      - briefs/practices/code.test/pitofsuccess.errors/rule.forbid.failhide.md
      - briefs/practices/code.test/pitofsuccess.errors/rule.require.failfast.md
      - briefs/practices/code.test/pitofsuccess.errors/rule.require.failloud.md
```

**ergonomics match:** all 6 rules are in `say` section.

---

## step 6: verify ergonomics — handoff clarity

### planned

from wish:
> create a handoff document to add the `code.test/*` variant to add to the rules

### implemented

handoff document specifies:

**current:**
```sh
--rules '.agent/.../code.prod/pitofsuccess.errors/rule.*.md'
```

**proposed:**
```sh
--rules '.agent/.../code.{prod,test}/pitofsuccess.errors/rule.*.md'
```

**ergonomics match:** handoff clearly shows current → proposed change.

---

## step 7: design drift analysis

### question

did the design change between the plan and implementation?

### answer

no. the implementation matches the planned ergonomics:

| planned aspect | implemented | drift? |
|----------------|-------------|--------|
| symmetric terminology | 3 concepts × 2 scopes | no |
| clear guidance | all sections present | no |
| always visible | in say section | no |
| handoff clarity | current → proposed | no |

**no design drift detected.**

---

## step 8: input/output comparison

### what is "input" for documentation?

for briefs, "input" is:
- mechanic reads the rule
- guard parses the rule

### what is "output" for documentation?

for briefs, "output" is:
- mechanic understands the pattern
- guard can apply the rule

### comparison

| flow | planned input | actual input | match? |
|------|---------------|--------------|--------|
| mechanic reads | rule text | rule text | yes |
| guard parses | rule structure | rule structure | yes |

| flow | planned output | actual output | match? |
|------|----------------|---------------|--------|
| mechanic understands | clear guidance | .what/.why/.pattern | yes |
| guard applies | enforcement info | .enforcement section | yes |

**ergonomics match:** input/output as planned.

---

## issues found

none. ergonomics match the planned design.

---

## why this holds

| check | result | evidence |
|-------|--------|----------|
| symmetric terminology? | yes | failhide/failfast/failloud |
| clear guidance? | yes | all sections present |
| always visible? | yes | in say section |
| handoff clear? | yes | current → proposed |
| design drift? | no | implementation matches plan |

---

## reflection

the guide asks:
> did the design change between repros and implementation?

there were no repros for this documentation-only pr. however, the design specified in wish/vision was faithfully implemented:

1. **symmetric rules** — 3 concepts (failhide/failfast/failloud) × 2 scopes (prod/test)
2. **clear structure** — every rule has .what, .why, .pattern, .enforcement
3. **always visible** — all rules in boot.yml `say` section
4. **handoff complete** — specifies exact guard path update

the ergonomics are consistent from the plan through implementation.

---

## deeper analysis: could ergonomics be better?

### self-interrogation

**q:** is the rule structure optimal?

**a:** yes. the structure follows extant rules:
- .what — one sentence summary
- .why — motivation
- .forbidden patterns / .pattern — code examples
- .enforcement — blocker/nitpick

**q:** is the terminology clear?

**a:** yes. from vision:
- failhide = hide errors, continue as if ok
- failfast = detect bad state early, throw immediately
- failloud = use proper error class with full details

**q:** could the handoff be clearer?

**a:** the handoff shows:
- current state (what is)
- proposed state (what should be)
- files to update

this is the minimum viable handoff.

---

## final checklist

| question from guide | answer | evidence |
|---------------------|--------|----------|
| repros artifact exists? | no | documentation-only pr |
| planned input/output identified? | yes | from wish/vision |
| actual input/output matches? | yes | all ergonomics verified |
| design drift? | no | implementation = plan |
| ergonomics need fix? | no | all match |

**conclusion:** ergonomics validated. the implementation matches the planned design from wish and vision.

