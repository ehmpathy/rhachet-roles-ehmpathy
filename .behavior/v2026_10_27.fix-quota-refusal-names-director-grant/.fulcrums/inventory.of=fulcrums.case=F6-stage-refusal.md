# F6 — the stage refusal (`git.stage.add`)

## .the fork
`git.stage.add` reads the same meter file and refuses when `stage` is absent or blocked
(`git.stage.add.sh:118`, `:129`): "ask your human to grant stage permission". `git.crew.grant` takes
`--stage allow`, so in a director tree the director holds this grant too. two paths:
- (A) wire it: both sites call `print_quota_grant_fix`; the grant line carries `--stage allow`
- (B) leave it: F2's verdict named three refusals (uses-out, push-blocked, quota-absent); stage was
  not among them

## .taken, why
B for now: not wired. F2 is a director's verdict with an explicit list; a fourth refusal widens
scope, which is the director's call, not the driver's.

## .rework
clean. two sites in one skill; `get_one_director_grant_command` gains a `grant=push|stage` arg; one
row in the director test's data table. no caller depends on the current text.

## .confidence
70% that the director wants it wired: same meter, same harm (a driver pages a human for a grant
its director holds), same cure. lower than certain because a driver can route around it
(`git.commit.set --unstaged include` stages without this skill), so the harm is smaller than C1's.

## .where
found in self review `has-consistent-mechanisms` of 5.1, via a sweep of "ask your human" across
`skills/*.sh`. inventory row C17.

## .verdict
open — awaits the director.
