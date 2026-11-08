# guide: 5.1.execution.from_vision, i011 → driver

the judge refused: residual 5/0 blockers, 5/7 nitpicks (4 disputed blockers excluded).
the driver absorbs each of the 5 residual blockers, one concern at a time:
- either concede it with `--severity`, then fix it with a clamp that bites
- or dispute it with a fulcrum `--why`

then the driver writes both takens and absorbs both lanes. no commit, no re-arrival from this worktree.

## the givens

`.reviews/peer/5.1.execution.from_vision._.review.i011.a484843962a1518e82.r01{0,1}._.given.by_peer.*.md`

## the 5 residual blockers

| lane | ordinal (by the tally) | concern | the reviewer's grade | foreman read |
|---|---|---|---|---|
| r010 | blocker.1 | an `assume-unchanged` edit is erased by the reset with a ✓ (inv-10) | urgent | a real data loss with a repro. urgent holds: a human's edit is lost silently |
| r010 | blocker.2 | `--no-track` leaves a stale `branch.<into>.remote/merge`, so "no upstream" is false (inv-7) | better | a plain push under `push.default=upstream` aims at main. weigh urgent vs better yourself; name the harm or grade it better |
| r011 | blocker.1? | `abort` cannot rerun after an interrupted undo; the human is stranded | — | reproduced by the reviewer |
| r011 | blocker.2? | `abort` resets edits no park holds (a halt can last days) | — | the twin of i010 r011 b1, which `begin` now guards. a data loss |
| r011 | blocker.3? | `begin.sh` has two rollback mechanisms (hand `del_state` + the exit release) | — | maintenance. possibly better |

- r011 tallies 3 blockers and 1 nitpick over 4 findings. the mapping is most likely #1–#3 = blockers and #4 (sources all of the rebase operations for `get_conflict_files`) = nitpick. confirm or answer all four, as the i010 taken did
- the r010 nitpicks (3–6) are within the allowance (5/7). answer each in the taken anyway

## budget: both lanes are spent

- r010 `enroll-impl-behavior-intent` is at 5/5. r011 `enroll-impl-arch-defects` is at 6/6
- a spent lane does not re-run on re-arrival, so its blockers stand until:
  - a budget add lets it confirm the fix, or
  - a dispute excludes the concern from the tally
- a budget add needs a live **urgent** concession on that lane, with a nameable harm (`route.guard.budget`; director's rule)
- r011 is on its last round: an exhausted lane still owes its `.taken`
- candidate warrants (your grade, not the foreman's): r010 blocker.1 (assume-unchanged data loss), r011 #2 (abort resets an unparked edit)
- if a lane has no urgent concession, it gets no budget. then each blocker on it is fixed and answered, or disputed with a fulcrum

## open design questions: do not best-guess them

the director's bound: a blueprint question goes to the commander, never best-guessed. if a fix forks
on design, write the fork and send it to the foreman; the foreman routes it via the director. likely forks:

1. assume-unchanged / skip-worktree edits: **refuse** (exit 2, name each file) or **park** them too?
2. `abort` over an edit no park holds: **refuse** and name the files, or save a **rescue ref** and proceed?
3. `abort` convergence: how far to recast it into idempotent steps (accept HEAD on the source in every
   phase; guard each step by what is already done) inside this stone, vs a dream?

a fix with no fork (e.g. unset `branch.<into>.remote/.merge` after the cut and verify `<into>@{u}` is absent) needs no question.

## done gate for the director

1. each of the 5 residual blockers is absorbed per concern (conceded + fixed + clamped, or disputed + fulcrum)
2. both takens are written; both lanes are absorbed
3. any budget add rests on a named urgent concession
4. the cutover + meter suites are green on the final code (with a log path)
5. any open design question has gone to the commander
6. then tell the foreman; the director reruns the depth-0 pass
