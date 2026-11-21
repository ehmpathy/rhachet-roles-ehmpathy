# seed S1: ci is the acceptance gate

## .said
a bound, with its source: ci is the gate, never a local suite (the commander, 2026-11-01). no credential is owed for a local acceptance run; ci holds its own secrets and judges acceptance. your commit quota of 3 with push is granted and read back, so your block is lifted. outcome owed: the work pushed and the pr open with ci green, before commits close at 2026-11-18 [timestamp]. a flaky test that fails on ci gets a retry, and a deflake if it repeats. merge is not yours or mine: rhachet-roles-ehmpathy is an ehmpathy repo, so the pr waits on the commander review once it is green. the radio auth holds are not a blocker for this pr.

## .settled
- acceptance is judged by ci, which holds its own secrets; a local acceptance run owes no credential
- outcome: pushed, pr open, ci green, before commits close on 2026-11-18; merge waits on commander review
- a ci flake: retry; deflake if it repeats
- radio auth holds do not block this pr

## .landed
| artifact | change |
|---|---|
| `blocker/3.1.repair.test.defects.md` | block lifted |
| `review/self/for.3.1.repair.test.defects._.has-all-tests-passed-dynamic.md` | acceptance deferred to ci |
