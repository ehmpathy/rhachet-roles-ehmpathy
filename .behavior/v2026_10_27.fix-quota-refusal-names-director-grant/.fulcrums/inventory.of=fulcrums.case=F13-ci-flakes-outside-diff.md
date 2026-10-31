# F13: the two ci flakes outside this diff, at verification

## .the fork
verification demands every flaky test be fixed. two flake in ci on #1206, both outside the diff:
`git.repo.get` (`ENOTEMPTY` in the temp-dir cleanup, seen on `[case1]` and `[case7]`) and
`guardBorder.onWebfetch.injectionEnd [case11][t2]` (a brain verdict, seen on two brain versions).
a third surfaced in the local full integration run: `pretooluse.check-permissions [case58]` (9826ms
against a 9500ms bound under load; 5s alone), whose fix moves a permission gate's deadlines.

| option | what it does | cost |
|---|---|---|
| A, fix here | change each test or the code under it | without a local repro, the "fix" is a guess with no clamp that bites: a retry on `rmSync` quiets the race and leaves its cause (rule.forbid.workarounds) |
| B, dream, with the diagnosis so far | the next owner starts from the evidence | each flake costs a ci retry until fixed |

## .taken, why
B. the cleanup race needs its writer named first. what is known: the skill's case1 path
(`repos --refresh off`) spawns no background process and runs no fetch, gc or maintenance; the
assertions pass before cleanup throws, so the skill exited and some process still wrote into the temp
home. a fix without that writer named would be a workaround. the webfetch flake is a brain verdict, a
cause inside the brain, not this repo.

## .rework
clean: test-only changes in two files, whenever the writer is found.

## .confidence
70%: the verification rule reads "fix it anyway"; the counter is that a guessed fix with no clamp
is worse than a recorded diagnosis.

## .where
`.dream/2026_10_30.deflake.ci-flakes-seen-on-1206.md`; `5.3.verification.yield.md`.

## .verdict
none yet; best-guess B.
