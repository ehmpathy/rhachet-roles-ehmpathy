# handoff: 5.1.execution.from_vision, i010 → driver

the foreman did driver acts on this stone (16:1x–16:4x). they are yours now: own each, or rework it.
answer any further blocker yourself. the foreman guides only.

## the state

- stone `blocked` on i010: 5 blockers (threshold 0), 7/7 nitpicks
- all 12 concerns conceded and both lanes absorbed (passage.jsonl tail)
- budget: r010 enroll-impl-behavior-intent 4→5, r011 enroll-impl-arch-defects 5→6
  - the director upheld both warrants: r010 blocker.2, r011 blocker.1, both urgent and behavioral
- not re-arrived. the re-arrival is the director's depth-0 pass, never this worktree's session

## the givens

`.behavior/v2026_10_11.feat-git-branch-cutover/.reviews/peer/5.1.execution.from_vision._.review.i010.8cd5f60b329e45ea4f.r01{0,1}._.given.by_peer.*.md`

## the takens (drafted by the foreman; own or rework)

same dir, `…i010…r010._.taken.by_self.enroll-impl-behavior-intent.md` and `…r011._.taken.by_self.enroll-impl-arch-defects.md`

## the diff (uncommitted, in src/domain.roles/mechanic/skills/)

| concern | repair | file | clamp |
|---|---|---|---|
| r010 b1 carry halt unwarned; DU label blames new branch | `get_carry_halt_lines` + `is_path_added_by_picks`; plan section `carry will halt (N)`; DU relabel | cutover.operations.sh, cutover.begin.sh | case70 |
| r010 b2 gpgsign fails every pick | `git -c commit.gpgsign=false` on `set_commit_from_pick` and `gen_park_commit` | cutover.operations.sh | case71 |
| r011 b1 reset of an unparked edit | re-read `TRACKED_LINES` under the claim, write `.tracked`; `is_worktree_held_by_park` guards the reset, backs out on mismatch | cutover.begin.sh, cutover.operations.sh | case72 t0, t1 |
| r011 b2 meter-lock fault leaks the claim | `del_state_if_claim_unspent` exit release, gated on `CUTOVER_CLAIMED`, registered before the worktree lock; ERR trap says "before the cut; naught changed" in phase claim | cutover.operations.sh, cutover.begin.sh | case73 |
| r011 #3 dead branch | duplicate self-held check in `set_pid_lock` deleted | git.branch.uses/git.branch.uses.operations.sh | extant suite |
| r011 #6 implicit state | `carry: ""`, `conflicts: []` declared in `as_cutover_state_json` | cutover.operations.sh | extant suite |
| deferrals | dream items 12–16 added; item 11 gets the `quota_before` shape | `.dream/2026_10_21.fix-cutover-position-table-and-shared-leaves.dream.md` | — |

clamps: case70–73 appended at the end of `git.branch.cutover.integration.test.ts`, with helpers
`genShimBin`, `getRealBin`, `runCutoverWithShim`. 3 snapshots written (case70 t0, t2; case72 t1).

## proof so far

- teeth: against the un-fixed scripts, 7 of 8 new tests went red (the 8th is the negative
  case70 t1); restored → 8/8 green
- types, format, biome: green
- depcheck: red on `.claude/plugins/marketplaces/…/hostile.test.ts`, a local untracked harness
  cache outside src/. not this diff
- full cutover + uses integration run: in flight since 21:24 UTC (box load ~24 on 4 cores).
  it covers the final code. its log lands at
  `.log/role=mechanic/skill=git.repo.test/what=integration/` (newest). it is NOT yet green

## the open guesses to check

- r011's tally holds 3 blockers over 8 findings; the given names no third. the taken answers all
  8, and blocker.3 was conceded `better`. check the mapping reads right to you
- case72 t1 leaves a residue window between `is_worktree_held_by_park` and `git reset`; the taken
  says so and points at dream item 7. own that call, or close it

## done gate for the director

1. you own each item above (or reworked it)
2. full cutover + meter integration run green on the final code
3. tell the foreman; the director re-runs the depth-0 pass

no commit before the done gate.
