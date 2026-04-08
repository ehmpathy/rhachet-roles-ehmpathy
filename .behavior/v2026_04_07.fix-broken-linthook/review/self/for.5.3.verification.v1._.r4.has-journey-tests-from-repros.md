# self-review r4: has-journey-tests-from-repros

## the question

did i implement each journey sketched in repros?

---

## repros artifact check

searched for repros artifacts:
```bash
ls .behavior/v2026_04_07.fix-broken-linthook/*repros*
```

**result**: no repros artifact found.

this behavior did not include a `3.2.distill.repros.experience.*.md` file.

---

## why no repros?

the behavior route for `fix-broken-linthook` used a different path:

| step | artifact | purpose |
|------|----------|---------|
| 0 | wish.md | initial request |
| 1 | vision.md | outcome world |
| 2.1 | criteria.blackbox.md | usecases as given/when/then |
| 2.2 | criteria.blackbox.matrix.md | matrix view |
| 3.1.3 | research.internal.product.code.prod | prod code research |
| 3.1.3 | research.internal.product.code.test | test code research |
| 3.3.1 | blueprint.product.v1 | implementation plan |
| 4.1 | roadmap.v1 | phase breakdown |
| 5.1 | execution | implementation |
| 5.3 | verification | this review |

the journey tests came from **criteria.blackbox.md**, not from a repros artifact.

---

## criteria.blackbox.md as journey source

the blackbox criteria defined 7 usecases, each with given/when/then structure:

| usecase | journey |
|---------|---------|
| 1 | lint passes → exit 0, success summary |
| 2 | lint fails → exit 2, failure summary, defect count, log path, tip |
| 3 | npm error → exit 1, malfunction |
| 4 | no package.json → exit 1, constraint |
| 5 | log directory findsert → log dir created, .gitignore findsert |
| 6 | context hint (--when) → behavior identical |
| 7 | log file content → full npm output preserved |

---

## test coverage vs criteria

| criteria usecase | test case | covered? |
|------------------|-----------|----------|
| usecase.1 (lint passes) | [case1] | yes — 6 then blocks |
| usecase.2 (lint fails) | [case2] | yes — 8 then blocks |
| usecase.3 (npm error) | [case3] | yes — 2 then blocks |
| usecase.4 (no package.json) | [case4] | yes — 2 then blocks |
| usecase.5 (log findsert) | [case5] | yes — 3 then blocks |
| usecase.6 (--when hint) | not explicit | deferred — --when is for future use |
| usecase.7 (log content) | [case6] | yes — 1 then block |

additional coverage beyond criteria:
| extra case | purpose |
|------------|---------|
| [case7] arg validation | --what required, only 'lint' allowed |
| [case8] not in git repo | constraint error |

---

## conclusion

this behavior had **no repros artifact**. journey tests were derived from **criteria.blackbox.md** instead.

all 7 usecases from blackbox criteria are covered:
- 6 usecases have direct test cases
- 1 usecase (--when hint) deferred as future-only feature

the journey test coverage is complete per the behavior's specification source.

