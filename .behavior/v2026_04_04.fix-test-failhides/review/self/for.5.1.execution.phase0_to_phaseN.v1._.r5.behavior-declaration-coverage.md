# self-review r5: behavior-declaration-coverage

## the question

> is every requirement from the vision, criteria, and blueprint addressed?

---

## step 1: enumerate vision requirements

from `.behavior/v2026_04_04.fix-test-failhides/1.vision.stone`:

| requirement | addressed? | evidence |
|-------------|------------|----------|
| create rule.forbid.failhide for code.test | yes | file extant at code.test/pitofsuccess.errors/rule.forbid.failhide.md |
| create rule.require.failfast for code.test | yes | file extant at code.test/pitofsuccess.errors/rule.require.failfast.md |
| create rule.require.failloud for code.test | yes | file extant at code.test/pitofsuccess.errors/rule.require.failloud.md |
| create rule.require.failloud for code.prod | yes | file extant at code.prod/pitofsuccess.errors/rule.require.failloud.md |
| rename fail-fast to failfast | yes | files renamed with git mv |
| all 6 rules in boot.yml say section | yes | boot.yml updated |
| handoff for behavior guard update | yes | handoff.behavior-guard-update.md created |

---

## step 2: enumerate criteria requirements

from `.behavior/v2026_04_04.fix-test-failhides/2.1.criteria.blackbox.stone`:

### usecase.1 = mechanic writes prod code

| criterion | addressed? | evidence |
|-----------|------------|----------|
| failhide blocks | yes | extant rule.forbid.failhide.md.pt1.md |
| failfast blocks | yes | rule.require.failfast.md (renamed) |
| failloud blocks | yes | rule.require.failloud.md (new) |

### usecase.2 = mechanic writes test code

| criterion | addressed? | evidence |
|-----------|------------|----------|
| failhide blocks for tests | yes | code.test/rule.forbid.failhide.md |
| failfast blocks for tests | yes | code.test/rule.require.failfast.md |
| failloud blocks for tests | yes | code.test/rule.require.failloud.md |

### usecase.4 = session boots with mechanic role

| criterion | addressed? | evidence |
|-----------|------------|----------|
| all 6 rules in context | yes | boot.yml has 3 prod + 3 test rules in say |
| rules in say, not ref | yes | verified in boot.yml subject.code.prod.briefs.say and subject.code.test.briefs.say |

### usecase.5 = error class guidance

| criterion | addressed? | evidence |
|-----------|------------|----------|
| ConstraintError/BadRequestError for caller-must-fix | yes | documented in rule.require.failloud.md |
| MalfunctionError/UnexpectedCodePathError for server-must-fix | yes | documented in rule.require.failloud.md |
| exit code 2 for caller errors | yes | documented in both failloud rules |
| exit code 1 for server errors | yes | documented in both failloud rules |

---

## step 3: enumerate blueprint requirements

from `.behavior/v2026_04_04.fix-test-failhides/3.3.1.blueprint.product.v1.i1.md`:

### filediff tree items

| item | status | evidence |
|------|--------|----------|
| [○] rule.forbid.failhide.md.pt1.md | retained | no changes to content |
| [○] rule.forbid.failhide.md.pt2.md | retained | no changes to content |
| [~] rule.require.fail-fast.md → failfast.md | done | renamed with git mv |
| [~] rule.require.fail-fast.[seed].md → failfast.[seed].md | done | renamed with git mv |
| [~] rule.require.fail-fast.[demo].shell.md → failfast.[demo].shell.md | done | renamed with git mv |
| [○] rule.require.exit-code-semantics.md | retained | no changes |
| [○] rule.prefer.helpful-error-wrap.md | retained | no changes |
| [+] rule.require.failloud.md (prod) | created | file extant |
| [+] rule.forbid.failhide.md (test) | created | file extant |
| [+] rule.require.failfast.md (test) | created | file extant |
| [+] rule.require.failloud.md (test) | created | file extant |
| [~] boot.yml | updated | has all 6 rules |
| [+] handoff.behavior-guard-update.md | created | file extant |

### boot.yml changes

| change | done? | evidence |
|--------|-------|----------|
| add failloud to code.prod say | yes | line 119 |
| rename fail-fast refs to failfast | yes | lines 118, 153, 154 |
| add 3 test rules to code.test say | yes | lines 176-178 |
| add "errors — the most important rules" comment | yes | lines 116, 175 |

---

## step 4: gap analysis

### found gaps

none. all requirements addressed.

### verification method

1. read vision requirements from context
2. read criteria requirements from context
3. read blueprint from context
4. verified each file extant via glob search
5. verified boot.yml content via prior read

---

## issues found

none. full coverage of behavior declaration.

---

## why coverage holds

| check | result |
|-------|--------|
| vision requirements met? | yes — all 7 items addressed |
| criteria usecases met? | yes — all 5 usecases covered |
| blueprint filediff met? | yes — all 13 items completed |
| boot.yml changes met? | yes — all 4 changes made |

**key insight:** the blueprint was comprehensive. each item had clear status markers ([○], [~], [+]) which made verification straightforward.

---

## actual file verification

### prod rules (glob search result)

```
src/domain.roles/mechanic/briefs/practices/code.prod/pitofsuccess.errors/
├── rule.forbid.failhide.md.pt1.md     # [○] retained
├── rule.forbid.failhide.md.pt2.md     # [○] retained
├── rule.require.failfast.md            # [~] renamed from fail-fast
├── rule.require.failfast.[seed].md     # [~] renamed from fail-fast
├── rule.require.failfast.[demo].shell.md # [~] renamed from fail-fast
├── rule.require.exit-code-semantics.md # [○] retained
├── rule.prefer.helpful-error-wrap.md   # [○] retained
└── rule.require.failloud.md            # [+] new
```

### test rules (glob search result)

```
src/domain.roles/mechanic/briefs/practices/code.test/pitofsuccess.errors/
├── rule.forbid.failhide.md             # [+] new
├── rule.require.failfast.md            # [+] new
├── rule.require.failloud.md            # [+] new
└── handoff.behavior-guard-update.md    # [+] new
```

### boot.yml verification (line by line)

**subject.code.prod.briefs.say section:**
- line 116: `# errors — the most important rules` — comment added
- line 117: `rule.forbid.failhide.md.pt1.md` — extant
- line 118: `rule.require.failfast.md` — renamed from fail-fast
- line 119: `rule.require.failloud.md` — new
- line 120: `rule.prefer.helpful-error-wrap.md` — extant
- line 121: `rule.require.exit-code-semantics.md` — extant

**subject.code.prod.briefs.ref section:**
- line 152: `rule.forbid.failhide.md.pt2.md` — extant
- line 153: `rule.require.failfast.[seed].md` — renamed from fail-fast
- line 154: `rule.require.failfast.[demo].shell.md` — renamed from fail-fast

**subject.code.test.briefs.say section:**
- line 175: `# errors — the most important rules` — comment added
- line 176: `rule.forbid.failhide.md` — new
- line 177: `rule.require.failfast.md` — new
- line 178: `rule.require.failloud.md` — new

---

## did the junior skip or forget any part?

### check: vision requirements

| requirement | junior status | my verification |
|-------------|---------------|-----------------|
| test failhide rules | completed | files extant |
| prod failloud rule | completed | file extant |
| rename fail-fast | completed | files renamed |
| boot.yml updates | completed | lines verified |
| handoff document | completed | file extant |

**verdict:** junior completed all requirements.

### check: criteria usecases

| usecase | junior status | my verification |
|---------|---------------|-----------------|
| prod failhide detection | covered | rule extant |
| test failhide detection | covered | rule extant |
| error class guidance | covered | documented in failloud rules |
| boot.yml includes all 6 | covered | lines 116-121, 175-178 |

**verdict:** junior addressed all usecases.

### check: blueprint items

13 items total:
- 5 [○] retain items — all unchanged
- 4 [~] rename/update items — all completed
- 4 [+] create items — all created

**verdict:** junior completed all blueprint items.
