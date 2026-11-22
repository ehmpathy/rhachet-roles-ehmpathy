# seed S1: the bound is 420s for the whole call, hard

## .said

a new commander order, starred p0, moves the bound: any git.repo.test run past 7 minutes (420s) is a hard rejection, exit 2, that tells the crew to fix its test speed. that settles F3: the bound holds for the whole call, any run. F11 is yours to settle on its merits.

## .settled

- default bound = 420s, and 420s is the max for any call; `--timeout` may narrow it, never widen it (a value above 420 is refused at parse, exit 2)
- the bound holds for the whole call: in multi-mode each type runs under what the types before it left (F3 settled)
- the rejection tells the crew to fix its test speed
- F11 is the driver's call

## .landed

| where | what |
|---|---|
| `skills/git.repo.test/git.repo.test.operations.sh` | `GIT_REPO_TEST_BOUND_MAX=420`, `is_bound_above_max`, `get_bound_left` |
| `skills/git.repo.test/git.repo.test.sh` | parse refusal above the max; multi-mode whole-call share |
| `git.repo.test.bound.integration.test.ts` | [case17], [case18], [case3] rewrites |
