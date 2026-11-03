# F6 — the stage refusal (`git.stage.add`)

## .the fork
`git.stage.add` reads the same meter file and refuses when `stage` is absent or blocked
(`git.stage.add.sh:118`, `:129`): "ask your human to grant stage permission". `git.crew.grant` takes
`--stage allow`, so in a director tree the director holds this grant too. two paths:
- (A) wire it: both sites call `print_quota_grant_fix`; the grant line carries `--stage allow`
- (B) leave it: F2's verdict named three refusals (uses-out, push-blocked, quota-absent); stage was
  not among them

## .taken, why
A, on the director's verdict: wired. both sites call `print_quota_grant_fix` with
`grant_flag="--stage allow"`; `get_one_director_grant_command` takes `grant_flag` (default
`--push allow`). the no-director text stays byte for byte (stage suite: 12 pass, no resnap).

## .rework
clean. two sites in one skill; `get_one_director_grant_command` gains a `grant_flag` arg; one
row in the director test's data table. no caller depends on the current text.

## .risk
low: two sites in one skill; the `--stage allow` flag on `git.crew.grant` is read from nheuron's
decision logs, not its source (F5's caveat).

## .confidence
70% that the director wants it wired: same meter, same harm (a driver pages a human for a grant
its director holds), same cure. lower than certain because a driver can route around it
(`git.commit.set --unstaged include` stages without this skill), so the harm is smaller than C1's.

## .where
found in self review `has-consistent-mechanisms` of 5.1, via a sweep of "ask your human" across
`skills/*.sh`. inventory row C17.

## .verdict
ruled by the director, 2026-10-30: wire it in this pr. same outcome as the wish (every quota refusal
a driver meets names its director grant), so it is in scope; the grant line carries `--stage allow`.
