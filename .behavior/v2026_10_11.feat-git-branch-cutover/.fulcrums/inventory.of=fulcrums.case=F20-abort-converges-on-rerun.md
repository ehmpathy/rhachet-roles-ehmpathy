# F20: abort converges on a rerun — in this stone, or as a dream

- **the defect** (i011 r011 finding 1, reproduced): `abort` moves HEAD back to the source before it
  clears the state. its position guard accepts HEAD only on the new branch, so a rerun after an
  interrupted undo refuses "HEAD is not where this cutover left it"; the human is stuck until they
  remove `.git/cutover` by hand. `abort.sh:95` promises a rerun can finish the undo
- **the fork**:
  - (a) **in this stone, minimal**: abort records `.aborting = true` first; the position guard also
    accepts HEAD on the source once that is set; each step skips what is done (reset only while
    HEAD is on `<into>`; lay the park back only if the worktree does not hold it; delete `<into>`
    only if it exists). clamp: kill after the switch back, rerun abort → exit 0, state gone
  - (b) (a), plus recast begin and continue into converge-by-step
- **lean**: (a) here, (b) to the dream (items 7 and 11, beside F17). (a) closes the strand; (b) is
  the reshape F17 already defers
- **rework**: (a) clean — local to `abort.sh` and the position guard; (b) dirty — rewrites the
  begin and continue state machines
- **risk**: low to medium for (a)
- **confidence**: 85% — no behavior change: (a) delivers the promise `abort.sh:95` already makes.
  the director's to rule
- **where**: `git.branch.cutover.abort.sh`; `guard_head_at_cutover_position` in operations
- **status**: ruled — director, 2026-10-26 20:3x CT
- **verdict**: (a), in this stone. clean, low-to-medium risk, and it delivers the promise
  `abort.sh:95` already makes; it promises naught new. (b) stays deferred under F17: dream item 17
  (`dreams/2026_10_21.fix-cutover-position-table-and-shared-leaves.dream.md`)
- **built**: `.aborting` marked before the first write; the position guard admits HEAD on the
  source once an abort began; reset only on `<into>`, switch only off the source, restore only if
  the worktree lacks the park. clamp case75 t0 (kill at the restore) and t1 (kill at the branch
  delete): red on the unfixed abort, green fixed
