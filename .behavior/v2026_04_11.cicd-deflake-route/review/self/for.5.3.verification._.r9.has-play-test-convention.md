# self-review: has-play-test-convention (round 9)

## the question

are journey test files named correctly?

## what tests exist

```
glob src/domain.roles/mechanic/skills/**/cicd.deflake*.test.ts

result:
- src/domain.roles/mechanic/skills/cicd.deflake.integration.test.ts
```

no `.play.test.ts` files for cicd.deflake.

## what `.play.` convention means

the `.play.` suffix is for journey tests that:
- trace user experience flows
- test multi-step workflows end-to-end
- come from repro scenarios

example in repo:
```
git.repo.test.play.integration.test.ts
```

## why no `.play.` tests for cicd.deflake

the cicd.deflake tests are **shell interface tests**, not journey tests:

| test case | what it tests | journey? |
|-----------|---------------|----------|
| case1 | init creates route | no — single command |
| case2 | init output format | no — snapshot verification |
| case3 | init findsert semantics | no — idempotency check |
| case4 | detect requires --into | no — error path |
| case5 | help shows usage | no — help output |
| case6 | unknown subcommand | no — error path |
| case7 | no subcommand | no — error path |
| case8 | not in git repo | no — error path |

these tests verify the **CLI contract**, not user journeys.

## when `.play.` tests would be needed

a journey test for cicd.deflake would test the full workflow:
1. init creates route
2. detect gathers evidence
3. user fills diagnosis stones
4. route progresses through all 8 stones

this workflow is:
- driven by the route system (stones + guards)
- not automatable end-to-end (requires human research)
- tested at the route level, not the skill level

## repo convention check

checked for `.play.` tests in repo:
```
glob **/*.play.*.test.ts

result:
- git.repo.test.play.integration.test.ts
```

only one `.play.` test exists. the convention is used sparingly for true journey tests.

## verdict

holds. no `.play.` tests are needed for cicd.deflake because:
1. the tests are CLI contract tests, not journey tests
2. no repros were defined (no journeys to trace)
3. the workflow is route-driven, tested via stones/guards
4. the `.integration.test.ts` suffix is correct for shell interface tests

the convention is followed — `.play.` is for journeys, `.integration.` is for interfaces.
