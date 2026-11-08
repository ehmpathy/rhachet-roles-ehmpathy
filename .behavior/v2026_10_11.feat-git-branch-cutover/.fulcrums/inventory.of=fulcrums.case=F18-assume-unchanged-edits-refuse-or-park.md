# F18: an edit under assume-unchanged or skip-worktree — refuse, or park it

- **the defect** (i011 r010 blocker.1, urgent): git status and diff hide a path flagged
  `assume-unchanged` (`git ls-files -v` code `h`). the park never sees its edit, and the reset
  erases it under a ✓ report. inv-10 broken. a `skip-worktree` path (`S`) loses no data (git
  refuses the switch), but the malfunction names no file
- **the fork**:
  - (a) **refuse** at preflight, exit 2, before the claim or any spend: name each `h`/`S` path
    whose worktree bytes differ from its index blob; fix = `git update-index
    --no-assume-unchanged <path>` (or `--no-skip-worktree`), then rerun
  - (b) **park** them: clear the flag, park and carry the edit, set the flag again on the new branch
- **lean**: (a). the flag is the human's word to git "do not look here"; the cutover cannot know
  whether that edit should ride. (b) moves index flags across a reset and adds a partial-failure
  state (flag cleared, carry halted). a flagged path with no edit is left alone: the reset keeps it
  identical
- **rework**: clean — (a) is one preflight guard plus a refusal render; a later switch to (b)
  replaces the guard with a park step and touches no caller
- **risk**: low for (a); medium for (b)
- **confidence**: 70% — a behavior choice on the carry contract (inv-10): whether a hidden edit is
  refused or carried is the commander's word, not the driver's
- **where**: `git.branch.cutover.begin.sh` preflight; `git.branch.cutover.operations.sh`
- **status**: ruled — director
- **verdict**: (a), ruled by the director, 2026-11-02 22:2xZ (relayed by the foreman). refuse at preflight, exit 2, before the claim or any spend; name each `h`/`S` path whose worktree bytes differ from its index blob. the director rules it: clean rework, no credential, no prod write
- **built**: `get_hidden_edit_lines` + a begin preflight ahead of the claim; refusal names `assume-unchanged: <path>` / `skip-worktree: <path>` and both `update-index` fixes. clamp case77 (t0 refuse h, t1 refuse S, t2 a flag with no edit cuts over): red unfixed 4/5, green fixed
